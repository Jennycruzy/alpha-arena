import { Router } from "express";
import { arenaManager } from "../arena/ArenaManager.js";
import { require402, verifyPayment } from "../payments/x402Middleware.js";
import { AGENT_META } from "../agents/index.js";
import config from "../../config/index.js";

const router = Router();

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

router.get("/arena/current", (_req, res) => {
  const arena = arenaManager.getWaitingArena();
  if (!arena) return res.status(404).json({ error: "No active arena" });
  res.json({
    arenaId: arena.id,
    status: arena.status,
    isPrivate: arena.isPrivate,
    userCount: arena.users.length,
    agentSelections: arenaManager._getAgentSelections(arena),
    users: arena.users.map((u) => ({
      userId: u.userId.slice(0, 6) + "..." + u.userId.slice(-4),
      agentId: u.agentId,
      agentName: AGENT_META[u.agentId]?.name,
    })),
  });
});

router.get("/arena/user/:userId", (req, res) => {
  const arena = arenaManager.getArenaForUser(req.params.userId);
  if (!arena) return res.status(404).json({ error: "User not in any arena" });
  const view = arenaManager.getSpectatorView(arena.id);
  view.myAgentId = arena.users.find(
    (u) => u.userId.toLowerCase() === req.params.userId.toLowerCase()
  )?.agentId;
  res.json(view);
});

router.get("/arena/:arenaId", (req, res) => {
  const view = arenaManager.getSpectatorView(req.params.arenaId);
  if (!view) return res.status(404).json({ error: "Arena not found" });
  res.json(view);
});

// ─── Spectator (public, no wallet) ───────────────────────────────────────────
router.get("/spectate/:arenaId", (req, res) => {
  const view = arenaManager.getSpectatorView(req.params.arenaId);
  if (!view) return res.status(404).json({ error: "Arena not found" });
  res.json(view);
});

router.get("/spectate/:arenaId/reasoning", (req, res) => {
  const arena = arenaManager.getArena(req.params.arenaId);
  if (!arena) return res.status(404).json({ error: "Arena not found" });
  if (arena.isPrivate) return res.json({ log: [], isPrivate: true });
  res.json({ log: (arena.reasoningLog || []).slice(0, 30), isPrivate: false });
});

// ─── Join Arena (x402 protected) ─────────────────────────────────────────────
router.post("/arena/join", require402, async (req, res) => {
  const { userId, agentId, isPrivate = false } = req.body;
  if (!userId || !agentId) {
    return res.status(400).json({ error: "userId and agentId required" });
  }

  let paymentAmount = config.competition.entryFeeUsd;
  if (!config.demoMode && req.paymentTxHash) {
    try {
      const result = await verifyPayment(req.paymentTxHash, req.body.arenaId, userId);
      paymentAmount = result.amount;
    } catch (err) {
      return res.status(402).json({ error: `Payment verification failed: ${err.message}` });
    }
  }

  try {
    const result = arenaManager.joinArena(userId, agentId, paymentAmount, { isPrivate });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Copy Winner ──────────────────────────────────────────────────────────────
router.post("/copy-trade/start", async (req, res) => {
  const { userId, agentId, capitalUsdc, isPrivate = false } = req.body;
  if (!userId || !agentId || !capitalUsdc) {
    return res.status(400).json({ error: "userId, agentId, and capitalUsdc required" });
  }
  if (capitalUsdc < config.competition.entryFeeUsd) {
    return res.status(400).json({ error: `Minimum capital: $${config.competition.entryFeeUsd} USDC` });
  }

  try {
    const sessionId = arenaManager.startCopyTradeSession(userId, agentId, capitalUsdc, isPrivate);
    res.json({ sessionId, agentId, agentName: AGENT_META[agentId]?.name, capitalUsdc, started: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/copy-trade/stop", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  arenaManager.stopCopyTradeSession(userId);
  res.json({ stopped: true });
});

router.get("/copy-trade/status/:userId", (req, res) => {
  const status = arenaManager.getCopyTradeStatus(req.params.userId);
  if (!status) return res.status(404).json({ error: "No active copy trade session" });
  res.json(status);
});

router.post("/arena/rescue", async (req, res) => {
  const { arenaId, recipients, amounts, secret } = req.body;
  // Simple secret protection for manual rescue
  if (secret !== "alpha-rescue-2024") return res.status(403).json({ error: "Forbidden" });
  if (!arenaId || !recipients || !amounts) return res.status(400).json({ error: "Missing params" });

  try {
    const r = await arenaManager.rescuePayout(arenaId, recipients, amounts);
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
