import { v4 as uuidv4 } from "uuid";
import config from "../../config/index.js";
import { createAgent, AGENT_IDS, AGENT_META } from "../agents/index.js";
import { arenaVault } from "../contracts/ArenaVault.js";
import { approveToken } from "../blockchain/chain.js";
import logger from "../utils/logger.js";

class ArenaManager {
  constructor() {
    this.arenas = new Map();
    this.currentArenaId = null;
    this.wsClients = new Set();

    // Copy-winner sessions: userId -> { agentId, session }
    this.copyTradeSessions = new Map();

    this._ensureWaitingArena();
  }

  addWsClient(ws) {
    this.wsClients.add(ws);
    ws.on("close", () => this.wsClients.delete(ws));
  }

  broadcast(event, data) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    for (const ws of this.wsClients) {
      if (ws.readyState === 1) ws.send(message);
    }
  }

  // ── Arena Creation ──────────────────────────────────────────────────────────

  _ensureWaitingArena() {
    const id = uuidv4();
    this.arenas.set(id, {
      id,
      status: "waiting",
      isPrivate: false, // set during creation
      users: [],
      agents: {},
      agentUsers: {},
      startTime: null,
      endTime: null,
      timer: null,
      leaderboardTimer: null,
      results: null,
      reasoningLog: [], // recent reasoning entries from all agents
    });
    this.currentArenaId = id;
    logger.info(`Arena ${id.slice(0, 8)} created (waiting)`);
    return id;
  }

  getWaitingArena() {
    return this.arenas.get(this.currentArenaId);
  }

  getArena(arenaId) {
    return this.arenas.get(arenaId);
  }

  getArenaForUser(userId) {
    for (const [, arena] of this.arenas) {
      if (arena.users.find((u) => u.userId.toLowerCase() === userId.toLowerCase())) {
        return arena;
      }
    }
    return null;
  }

  // ── Spectator Support ───────────────────────────────────────────────────────

  /** Public arena listing for spectator page */
  getPublicArenas() {
    return [...this.arenas.values()].map((arena) => ({
      id: arena.id,
      status: arena.status,
      isPrivate: arena.isPrivate,
      userCount: arena.users.length,
      startTime: arena.startTime,
      endTime: arena.endTime,
      agentSelections: this._getAgentSelections(arena),
    }));
  }

  getSpectatorView(arenaId) {
    const arena = this.arenas.get(arenaId);
    if (!arena) return null;

    const leaderboard = arena.status === "active"
      ? Object.entries(arena.agents)
        .map(([agentId, agent]) => ({
          ...agent.getStatus(),
          ...AGENT_META[agentId],
          userCount: (arena.agentUsers[agentId] || []).length,
          pooledCapital: arena.users
            .filter((u) => u.agentId === agentId)
            .reduce((s, u) => s + u.entryFee, 0),
        }))
        .sort((a, b) => b.roi - a.roi)
      : [];

    // Win probability (simple rank-based heuristic)
    const total = leaderboard.reduce((s, a) => s + Math.max(0, a.roi + 100), 0) || 1;
    leaderboard.forEach((a) => {
      a.winProbability = parseFloat(((Math.max(0, a.roi + 100) / total) * 100).toFixed(1));
    });

    return {
      id: arena.id,
      status: arena.status,
      isPrivate: arena.isPrivate,
      userCount: arena.users.length,
      startTime: arena.startTime,
      endTime: arena.endTime,
      remainingMs: arena.endTime ? Math.max(0, arena.endTime - Date.now()) : 0,
      leaderboard,
      reasoningLog: arena.isPrivate ? [] : (arena.reasoningLog || []).slice(0, 30),
      results: arena.results,
      agentSelections: this._getAgentSelections(arena),
    };
  }

  // ── Join ────────────────────────────────────────────────────────────────────

  joinArena(userId, agentId, entryFee, { isPrivate = false } = {}) {
    let arena = this.getWaitingArena();
    if (!arena || arena.status !== "waiting") throw new Error("No arena available");
    if (!AGENT_META[agentId]) throw new Error(`Invalid agent: ${agentId}`);
    if (arena.users.find((u) => u.userId.toLowerCase() === userId.toLowerCase())) {
      throw new Error("User already in this arena");
    }

    // Set privacy mode on first join
    if (arena.users.length === 0) {
      arena.isPrivate = isPrivate;
    }

    const user = { userId, agentId, entryFee, joinedAt: Date.now() };
    arena.users.push(user);

    if (!arena.agentUsers[agentId]) arena.agentUsers[agentId] = [];
    arena.agentUsers[agentId].push(userId);

    logger.info(`User ${userId.slice(0, 8)} joined → ${AGENT_META[agentId].name} (${arena.isPrivate ? "🔒 PRIVATE" : "👁 PUBLIC"})`);

    this.broadcast("user_joined", {
      arenaId: arena.id,
      userId,
      agentId,
      agentName: AGENT_META[agentId].name,
      totalUsers: arena.users.length,
      isPrivate: arena.isPrivate,
      agentSelections: this._getAgentSelections(arena),
    });

    const ready = this._isReadyToStart(arena);
    if (ready) this._startArena(arena);

    return { arenaId: arena.id, joined: true, readyToStart: ready, isPrivate: arena.isPrivate };
  }

  _isReadyToStart(arena) {
    // Start automatically if at least one real user has joined.
    // House agents will fill the remaining slots.
    return arena.users.length > 0;
  }

  _getAgentSelections(arena) {
    return {
      [AGENT_IDS.WHALE]: (arena.agentUsers[AGENT_IDS.WHALE] || []).length,
      [AGENT_IDS.MOMENTUM]: (arena.agentUsers[AGENT_IDS.MOMENTUM] || []).length,
      [AGENT_IDS.RISK_GUARD]: (arena.agentUsers[AGENT_IDS.RISK_GUARD] || []).length,
    };
  }

  // ── Start ───────────────────────────────────────────────────────────────────

  async _startArena(arena) {
    arena.status = "active";
    arena.startTime = Date.now();
    arena.endTime = arena.startTime + config.competition.durationSeconds * 1000;

    logger.info(`🔥 Arena ${arena.id.slice(0, 8)} STARTING (${arena.isPrivate ? "PRIVATE" : "PUBLIC"})`);

    const agentCapitals = {};
    for (const user of arena.users) {
      agentCapitals[user.agentId] = (agentCapitals[user.agentId] || 0) + user.entryFee;
    }

    // Route funds on-chain
    const agentWallets = Object.keys(arena.agentUsers).map(() => config.arenaWallet.address);
    const amounts = Object.keys(arena.agentUsers).map((id) => agentCapitals[id] || 0);
    arenaVault.routeFunds(arena.id, agentWallets, amounts).catch((err) =>
      logger.warn(`routeFunds failed (non-blocking): ${err.message}`)
    );

    // Create agents + attach callbacks
    for (const agentId of Object.values(AGENT_IDS)) {
      const hasUserJoined = (arena.agentUsers[agentId] || []).length > 0;
      const startingCapital = hasUserJoined ? agentCapitals[agentId] : 0.1;
      const agent = createAgent(agentId, startingCapital);

      // Trade broadcast callback
      agent.onTrade = (tradeData) => {
        this.broadcast("trade_executed", {
          arenaId: arena.id,
          agentId,
          agentName: AGENT_META[agentId].name,
          isPrivate: arena.isPrivate,
          // Strip reason in private mode
          ...tradeData,
          reason: arena.isPrivate ? null : tradeData.reason,
        });
      };

      // Reasoning broadcast callback
      agent.onReasoning = (reasoningData) => {
        arena.reasoningLog.unshift(reasoningData);
        if (arena.reasoningLog.length > 50) arena.reasoningLog.pop();

        // Only broadcast if public mode (or status=thinking which is always safe)
        if (!arena.isPrivate || reasoningData.status === "thinking") {
          this.broadcast("agent_reasoning", {
            arenaId: arena.id,
            ...reasoningData,
          });
        }
      };

      // 🧬 Evolution broadcast callback
      agent.onEvolution = (evolutionData) => {
        this.broadcast("agent_evolution", {
          arenaId: arena.id,
          ...evolutionData,
        });
      };

      arena.agents[agentId] = agent;
      agent.start(agentCapitals[agentId] || 0, arena.isPrivate);
    }

    this.broadcast("arena_started", {
      arenaId: arena.id,
      startTime: arena.startTime,
      endTime: arena.endTime,
      isPrivate: arena.isPrivate,
      durationSeconds: config.competition.durationSeconds,
      agents: Object.keys(arena.agents).map((id) => ({
        ...AGENT_META[id],
        userCount: arena.agentUsers[id].length,
        capital: agentCapitals[id],
      })),
    });

    // Leaderboard updates
    arena.leaderboardTimer = setInterval(
      () => this._broadcastLeaderboard(arena),
      config.competition.leaderboardUpdateSeconds * 1000
    );

    arena.timer = setTimeout(
      () => this._endArena(arena),
      config.competition.durationSeconds * 1000
    );

    this._ensureWaitingArena();
  }

  // ── Leaderboard ─────────────────────────────────────────────────────────────

  _broadcastLeaderboard(arena) {
    if (arena.status !== "active") return;

    const leaderboard = Object.entries(arena.agents)
      .map(([agentId, agent]) => ({
        ...agent.getStatus(),
        ...AGENT_META[agentId],
        userCount: arena.agentUsers[agentId].length,
        pooledCapital: arena.users
          .filter((u) => u.agentId === agentId)
          .reduce((s, u) => s + u.entryFee, 0),
      }))
      .sort((a, b) => b.roi - a.roi);

    // Compute win probability (rank-weighted ROI)
    const total = leaderboard.reduce((s, a) => s + Math.max(0, a.roi + 100), 0) || 1;
    leaderboard.forEach((a) => {
      a.winProbability = parseFloat(((Math.max(0, a.roi + 100) / total) * 100).toFixed(1));
    });

    const elapsed = Date.now() - arena.startTime;
    const remaining = Math.max(0, config.competition.durationSeconds * 1000 - elapsed);

    this.broadcast("leaderboard_update", {
      arenaId: arena.id,
      leaderboard,
      remainingMs: remaining,
      elapsed,
      isPrivate: arena.isPrivate,
    });
  }

  // ── End ─────────────────────────────────────────────────────────────────────

  async _endArena(arena) {
    logger.info(`🏁 Arena ${arena.id.slice(0, 8)} ENDING`);
    for (const agent of Object.values(arena.agents)) agent.stop();
    clearInterval(arena.leaderboardTimer);
    arena.status = "completed";

    const standings = Object.entries(arena.agents)
      .map(([agentId, agent]) => ({ agentId, ...agent.getStatus() }))
      .sort((a, b) => {
        // Tie-breaker: ROI first, then Trade Count, then Name
        if (Math.abs(b.roi - a.roi) > 0.001) return b.roi - a.roi;
        if (b.tradeCount !== a.tradeCount) return b.tradeCount - a.tradeCount;
        return a.agentId.localeCompare(b.agentId);
      });

    const winner = standings[0];
    const payouts = [];
    const totalPool = arena.users.reduce((s, u) => s + u.entryFee, 0);
    const winnerProfit = winner.currentBalance - winner.initialBalance;

    for (const user of arena.users) {
      const isWinner = user.agentId === winner.agentId;
      const agentStatus = arena.agents[user.agentId]?.getStatus();
      const agentCapital = arena.users
        .filter((u) => u.agentId === user.agentId)
        .reduce((s, u) => s + u.entryFee, 0);

      let payout;
      if (isWinner && winnerProfit > 0) {
        const userShare = user.entryFee / agentCapital;
        payout = user.entryFee + winnerProfit * userShare;
      } else if (isWinner) {
        payout = (agentStatus?.currentBalance || 0) * (user.entryFee / agentCapital);
      } else {
        payout = Math.max(0, (agentStatus?.currentBalance || 0) * (user.entryFee / agentCapital));
      }

      payouts.push({
        userId: user.userId,
        agentId: user.agentId,
        agentName: AGENT_META[user.agentId].name,
        entryFee: user.entryFee,
        payout: parseFloat(payout.toFixed(4)),
        profit: parseFloat((payout - user.entryFee).toFixed(4)),
        isWinner,
      });
    }

    arena.results = {
      winner: {
        agentId: winner.agentId,
        name: AGENT_META[winner.agentId].name,
        roi: winner.roi,
        finalBalance: winner.currentBalance,
        isPrivate: arena.isPrivate,
      },
      standings,
      payouts,
      totalPool,
      competitionDuration: config.competition.durationSeconds,
      isPrivate: arena.isPrivate,
    };

    logger.info(`🏆 Winner: ${arena.results.winner.name} (ROI: ${arena.results.winner.roi}%)`);

    this.broadcast("arena_ended", { arenaId: arena.id, results: arena.results });

    // On-chain payout flow
    const recipients = payouts.map((p) => p.userId);
    const amounts = payouts.map((p) => p.payout);
    const totalReturn = amounts.reduce((s, a) => s + a, 0);

    (async () => {
      try {
        if (!config.demoMode && totalReturn > 0) {
          logger.info(`Returning ${totalReturn.toFixed(4)} USDC to vault for distribution...`);
          // 1. Approve vault to take USDC back from operator wallet
          const rawReturn = BigInt(Math.floor(totalReturn * 1e6));
          await approveToken(config.tokens.USDC, config.arenaVaultAddress, rawReturn);

          // Wait for nonce to settle
          await new Promise(r => setTimeout(r, 3000));

          // 2. Return funds
          await arenaVault.returnFunds(totalReturn);
          logger.info("Funds returned to vault successfully.");

          // Wait for nonce to settle before next tx
          await new Promise(r => setTimeout(r, 5000));
        }

        // 3. Distribute to recipients
        logger.info(`Distributing payout to ${recipients.length} recipients: ${recipients.map(r => r.slice(0, 8)).join(', ')}...`);
        const r = await arenaVault.distributePayout(arena.id, recipients, amounts);
        if (r.success) {
          logger.info(`ArenaVault payout tx: ${r.txHash}`);
        } else {
          logger.error(`ArenaVault payout failed: ${r.error}`);
        }
      } catch (err) {
        logger.error(`On-chain payout lifecycle failed: ${err.message}`);
      }
    })();

    return arena.results;
  }

  // ── Copy Winner Session ─────────────────────────────────────────────────────

  /**
   * Start a persistent copy-trade session using the winning agent strategy.
   * The agent runs autonomously outside the arena, trading the user's allocated funds.
   */
  startCopyTradeSession(userId, agentId, capitalUsdc, isPrivate = false) {
    if (this.copyTradeSessions.has(userId)) {
      this.stopCopyTradeSession(userId);
    }

    const agent = createAgent(agentId);
    const sessionId = uuidv4();

    agent.onTrade = (trade) => {
      this.broadcast("copy_trade_executed", {
        sessionId,
        userId,
        agentId,
        agentName: AGENT_META[agentId]?.name,
        ...trade,
        reason: isPrivate ? null : trade.reason,
      });
    };

    agent.onReasoning = (r) => {
      if (!isPrivate) {
        this.broadcast("copy_trade_reasoning", { sessionId, userId, ...r });
      }
    };

    agent.start(capitalUsdc, isPrivate);

    this.copyTradeSessions.set(userId, { sessionId, agentId, agent, capitalUsdc, startedAt: Date.now() });
    logger.info(`📋 Copy session started: ${userId.slice(0, 8)} → ${AGENT_META[agentId]?.name}`);

    return sessionId;
  }

  stopCopyTradeSession(userId) {
    const session = this.copyTradeSessions.get(userId);
    if (session) {
      session.agent.stop();
      this.copyTradeSessions.delete(userId);
      logger.info(`📋 Copy session stopped: ${userId.slice(0, 8)}`);
    }
  }

  getCopyTradeStatus(userId) {
    const session = this.copyTradeSessions.get(userId);
    if (!session) return null;
    return {
      sessionId: session.sessionId,
      agentId: session.agentId,
      agentName: AGENT_META[session.agentId]?.name,
      capitalUsdc: session.capitalUsdc,
      startedAt: session.startedAt,
      ...session.agent.getStatus(),
    };
  }

  getAllArenas() {
    return [...this.arenas.values()].map((arena) => ({
      id: arena.id,
      status: arena.status,
      isPrivate: arena.isPrivate,
      userCount: arena.users.length,
      agentSelections: this._getAgentSelections(arena),
      startTime: arena.startTime,
      endTime: arena.endTime,
      results: arena.results,
    }));
  }
}

export const arenaManager = new ArenaManager();
export default arenaManager;
