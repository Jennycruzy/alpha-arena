import { Router } from "express";
import { arenaManager } from "../arena/ArenaManager.js";
import { require402, verifyPayment } from "../payments/x402Middleware.js";
import { AGENT_META } from "../agents/index.js";
import config from "../../config/index.js";
import logger from "../utils/logger.js";

const router = Router();

// Error handler wrapper for async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─── Health & Status ─────────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

router.get("/status", (_req, res) => {
  res.json({
    demoMode: config.demoMode,
    vaultAddress: config.arenaVaultAddress,
    chainId: config.chain.id,
    explorerUrl: config.chain.explorerUrl,
    veniceEnabled: !!process.env.VENICE_API_KEY,
    version: "2.0.0",
  });
});

// ─── Public Config ─────────────────────────────────────────────────────────────
router.get("/config", (_req, res) => {
  res.json({
    entryFeeUsd: config.competition.entryFeeUsd,
    durationSeconds: config.competition.durationSeconds,
    chainId: config.chain.id,
    arenaWalletAddress: config.arenaWallet.address,
    vaultAddress: config.arenaVaultAddress,
    usdcAddress: config.tokens.USDC,
    agents: Object.values(AGENT_META),
    demoMode: config.demoMode,
    veniceEnabled: !!process.env.VENICE_API_KEY,
  });
});

// ─── Agents ───────────────────────────────────────────────────────────────────
router.get("/agents", (_req, res) => {
  res.json({ agents: Object.values(AGENT_META) });
});

// ─── Arena Listing ────────────────────────────────────────────────────────────
router.get("/arenas", (_req, res) => {
  res.json({ arenas: arenaManager.getAllArenas() });
});

router.get("/arenas/public", (_req, res) => {
  res.json({ arenas: arenaManager.getPublicArenas() });
});

router.get("/arena/current", asyncHandler(async (_req, res) => {
  const arena = arenaManager.getWaitingArena();
  if (!arena) return res.status(404).json({ error: "No active arena" });
  res.json({
    arenaId: arena.id,
    status: arena.status,
    isPrivate: arena.isPrivate,
    userCount: arena.users.length,
    agentSelections: arenaManager._getAgentSelections(arena),
    users: arena.users.map((u) => {
      const meta = AGENT_META[u.agentId];
      return {
        userId: u.userId.slice(0, 6) + "..." + u.userId.slice(-4),
        agentId: u.agentId,
        agentName: meta ? meta.name : "Unknown",
      };
    }),
  });
}));

router.get("/arena/user/:userId", asyncHandler(async (req, res) => {
  const arena = arenaManager.getArenaForUser(req.params.userId);
  if (!arena) return res.status(404).json({ error: "User not in any arena" });
  const view = arenaManager.getSpectatorView(arena.id, req.params.userId);
  const user = arena.users.find(
    (u) => u.userId.toLowerCase() === req.params.userId.toLowerCase()
  );
  view.myAgentId = user ? user.agentId : null;
  res.json(view);
}));

router.get("/arena/:arenaId", asyncHandler(async (req, res) => {
  const view = arenaManager.getSpectatorView(req.params.arenaId);
  if (!view) return res.status(404).json({ error: "Arena not found" });
  res.json(view);
}));

// ─── Spectator (public, no wallet) ───────────────────────────────────────────
router.get("/spectate/:arenaId", asyncHandler(async (req, res) => {
  const view = arenaManager.getSpectatorView(req.params.arenaId);
  if (!view) return res.status(404).json({ error: "Arena not found" });
  res.json(view);
}));

router.get("/spectate/:arenaId/reasoning", asyncHandler(async (req, res) => {
  const arena = arenaManager.getArena(req.params.arenaId);
  if (!arena) return res.status(404).json({ error: "Arena not found" });
  if (arena.isPrivate) return res.json({ log: [], isPrivate: true });
  res.json({ log: (arena.reasoningLog || []).slice(0, 30), isPrivate: false });
}));

// ─── Join Arena (x402 protected) ─────────────────────────────────────────────
router.post("/arena/join", require402, asyncHandler(async (req, res) => {
  const { userId, allocations, isPrivate = true, arenaId } = req.body;
  if (!userId || !allocations) {
    return res.status(400).json({ error: "userId and allocations required" });
  }

  // Verify payment if not in demo mode
  let finalEntryFee = config.competition.entryFeeUsd;
  if (!config.demoMode && req.paymentTxHash) {
    try {
      const v = await verifyPayment(req.paymentTxHash, arenaId, userId);
      finalEntryFee = v.amount;
    } catch (err) {
      return res.status(402).json({ error: `Payment verification failed: ${err.message}` });
    }
  }

  try {
    const result = arenaManager.joinArena(userId, allocations, finalEntryFee, { isPrivate });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}));

// ─── Copy Winner ──────────────────────────────────────────────────────────────
router.post("/copy-trade/start", asyncHandler(async (req, res) => {
  const { userId, agentId, capitalUsdc, isPrivate = false } = req.body;
  if (!userId || !agentId || !capitalUsdc) {
    return res.status(400).json({ error: "userId, agentId, and capitalUsdc required" });
  }
  if (capitalUsdc < config.competition.entryFeeUsd) {
    return res.status(400).json({ error: `Minimum capital: $${config.competition.entryFeeUsd} USDC` });
  }

  try {
    const sessionId = arenaManager.startCopyTradeSession(userId, agentId, capitalUsdc, isPrivate);
    const meta = AGENT_META[agentId];
    const agentName = meta ? meta.name : "Unknown";
    res.json({ sessionId, agentId, agentName, capitalUsdc, started: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}));

router.post("/copy-trade/stop", asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  arenaManager.stopCopyTradeSession(userId);
  res.json({ stopped: true });
}));

router.get("/copy-trade/status/:userId", asyncHandler(async (req, res) => {
  const status = arenaManager.getCopyTradeStatus(req.params.userId);
  if (!status) return res.status(404).json({ error: "No active copy trade session" });
  res.json(status);
}));

router.post("/arena/rescue", asyncHandler(async (req, res) => {
  const { arenaId, recipients, amounts, secret, skipReturn = false, forceRoute = false } = req.body;
  // Simple secret protection for manual rescue
  if (secret !== "alpha-rescue-2024") return res.status(403).json({ error: "Forbidden" });
  if (!arenaId || !recipients || !amounts) return res.status(400).json({ error: "Missing params" });

  try {
    const r = await arenaManager.rescuePayout(arenaId, recipients, amounts, { skipReturn, forceRoute });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}));

// ─── Admin: Force-link a verified depositor into the waiting arena ───────────
// Use this when a deposit was verified on-chain but server lost state.
router.post("/arena/force-link", asyncHandler(async (req, res) => {
  const { userId, agentId, entryFee, secret } = req.body;
  if (secret !== "alpha-rescue-2024") return res.status(403).json({ error: "Forbidden" });
  if (!userId || !agentId || !entryFee) return res.status(400).json({ error: "Missing params" });

  try {
    // Check if user is already linked
    const existing = arenaManager.getArenaForUser(userId);
    if (existing) return res.json({ success: true, message: "User already linked", arenaId: existing.id });

    const result = arenaManager.joinArena(userId, agentId, entryFee, { isPrivate: false });
    logger.info(`[FORCE-LINK] User ${userId.slice(0, 8)} force-linked to arena ${result.arenaId.slice(0, 8)} (agent: ${agentId}, fee: ${entryFee})`);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}));

router.post("/arena/force-end", asyncHandler(async (req, res) => {
  const { arenaId, secret } = req.body;
  // Use same rescue secret for now
  if (secret !== "alpha-rescue-2024") return res.status(403).json({ error: "Forbidden" });

  const success = arenaManager.forceEndArena(arenaId);
  res.json({ success });
}));

router.post("/arena/settle-all", asyncHandler(async (req, res) => {
  const { secret } = req.body;
  if (secret !== "alpha-rescue-2024") return res.status(403).json({ error: "Forbidden" });

  const result = await arenaManager.settleAll();
  res.json(result);
}));

router.post("/arena/force-start", asyncHandler(async (req, res) => {
  const { arenaId, secret } = req.body;
  if (secret !== "alpha-rescue-2024") return res.status(403).json({ error: "Forbidden" });

  const success = arenaManager.forceStartArena(arenaId);
  res.json({ success });
}));

router.post("/arena/force-refund", asyncHandler(async (req, res) => {
  const { arenaId, secret } = req.body;
  if (secret !== "alpha-rescue-2024") return res.status(403).json({ error: "Forbidden" });

  const success = arenaManager.forceRefundArena(arenaId);
  res.json({ success });
}));

export default router;
