import { v4 as uuidv4 } from "uuid";
import config from "../../config/index.js";
import { createAgent, AGENT_IDS, AGENT_META } from "../agents/index.js";
import { arenaVault, ArenaVaultContract } from "../contracts/ArenaVault.js";
import { approveToken } from "../blockchain/chain.js";
import logger from "../utils/logger.js";
import persistence from "../utils/persistence.js";

class ArenaManager {
  constructor() {
    this.arenas = new Map();
    this.currentArenaId = null;
    this.wsClients = new Set();

    // Copy-winner sessions: userId -> { agentId, session }
    this.copyTradeSessions = new Map();
    this.currentArenaId = null;

    this._loadStates();
    if (!this.currentArenaId) {
      this._ensureWaitingArena();
    }

    // Start background recovery sync
    setTimeout(() => this._syncWithBlockchain(), 5000);
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
    this._saveStates();
    return id;
  }

  getWaitingArena() {
    let arena = this.arenas.get(this.currentArenaId);
    // If current arena is missing, finished, or not in "waiting" status, ensure we have a fresh one
    if (!arena || arena.status !== "waiting") {
      logger.info(`[ArenaManager] Current arena ${this.currentArenaId || "N/A"} is ${arena ? arena.status : "missing"}. Ensuring waiting arena...`);
      const newId = this._ensureWaitingArena();
      arena = this.arenas.get(newId);
    }
    return arena;
  }

  getArena(arenaId) {
    return this.arenas.get(arenaId) || null;
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

  joinArena(userId, allocations, entryFee, { isPrivate = true } = {}) {
    // Solo Director Mode: Every join creates a new private arena
    const arenaId = this._ensureWaitingArena();
    const arena = this.arenas.get(arenaId);
    arena.isPrivate = isPrivate;

    // allocations: { [agentId]: weight } e.g. { "whale-follower": 0.5, "momentum-trader": 0.5 }
    // We store the weights in the user object
    const user = { userId, allocations, entryFee, joinedAt: Date.now() };
    arena.users.push(user);

    // Map agents to this user
    for (const agentId of Object.keys(allocations)) {
      if (!arena.agentUsers[agentId]) arena.agentUsers[agentId] = [];
      arena.agentUsers[agentId].push(userId);
    }

    logger.info(`Solo Director ${userId.slice(0, 8)} started arena ${arenaId.slice(0, 8)} (${arena.isPrivate ? "🔒 PRIVATE" : "👁 PUBLIC"})`);

    this.broadcast("user_joined", {
      arenaId: arena.id,
      userId,
      allocations,
      totalEntryFee: entryFee,
      isPrivate: arena.isPrivate,
    });

    // Start immediately in solo mode
    this._startArena(arena);

    this._saveStates();
    return { arenaId: arena.id, joined: true, readyToStart: true, isPrivate: arena.isPrivate };
  }

  _isReadyToStart(arena) {
    // REAL MODE: Requires all 3 agent types to have at least one real user.
    return (
      (arena.agentUsers[AGENT_IDS.WHALE] || []).length > 0 &&
      (arena.agentUsers[AGENT_IDS.MOMENTUM] || []).length > 0 &&
      (arena.agentUsers[AGENT_IDS.RISK_GUARD] || []).length > 0
    );
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

    const duration = config.competition.durationSeconds;
    arena.endTime = arena.startTime + duration * 1000;

    logger.info(`🔥 Arena ${arena.id.slice(0, 8)} STARTING (${arena.isPrivate ? "PRIVATE" : "PUBLIC"}) | Duration: ${duration}s`);

    // Calculate capital for each agent based on user allocations
    const agentCapitals = {};
    for (const user of arena.users) {
      for (const [agentId, weight] of Object.entries(user.allocations || {})) {
        agentCapitals[agentId] = (agentCapitals[agentId] || 0) + (user.entryFee * weight);
      }
    }

    // Route funds on-chain (use first user's wallet as recipient proxy for all agents in solo mode)
    const agentWallets = Object.keys(agentCapitals).map(() => config.arenaWallet.address);
    const amounts = Object.keys(agentCapitals).map((id) => agentCapitals[id]);

    if (amounts.some(a => a > 0)) {
      arenaVault.routeFunds(arena.id, agentWallets, amounts).catch((err) =>
        logger.warn(`routeFunds failed (non-blocking): ${err.message}`)
      );
    }

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
      duration * 1000
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
    if (totalPool === 0 || arena.users.length === 0) {
      logger.info(`⏩ Arena ${arena.id.slice(0, 8)} has no users/funds, skipping on-chain payout.`);
      this._saveStates();
      return;
    }

    const winnerProfit = winner.currentBalance - winner.initialBalance;

    for (const user of arena.users) {
      const isWinner = user.agentId === winner.agentId;
      const agent = arena.agents[user.agentId];
      const agentStatus = agent ? agent.getStatus() : null;
      const agentCapital = arena.users
        .filter((u) => u.agentId === user.agentId)
        .reduce((s, u) => s + u.entryFee, 0);

      let payout;
      if (isWinner && winnerProfit > 0) {
        const userShare = user.entryFee / agentCapital;
        payout = user.entryFee + winnerProfit * userShare;
      } else if (isWinner) {
        const currentBal = agentStatus ? agentStatus.currentBalance : 0;
        payout = currentBal * (user.entryFee / agentCapital);
      } else {
        const currentBal = agentStatus ? agentStatus.currentBalance : 0;
        payout = Math.max(0, currentBal * (user.entryFee / agentCapital));
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
      let retryCount = 0;
      const maxRetries = 5;

      while (retryCount < maxRetries) {
        try {
          if (!config.demoMode && totalReturn > 0) {
            logger.info(`[Payout Attempt ${retryCount + 1}] Returning ${totalReturn.toFixed(4)} USDC to vault...`);
            // 1. Approve vault to take USDC back from operator wallet
            const rawReturn = BigInt(Math.floor(totalReturn * 1e6));
            await approveToken(config.tokens.USDC, config.arenaVaultAddress, rawReturn);

            // Wait for nonce to settle
            await new Promise(r => setTimeout(r, 4000));

            // 2. Return funds
            await arenaVault.returnFunds(totalReturn);
            logger.info("Funds returned to vault successfully.");

            // Wait for nonce to settle before next tx
            await new Promise(r => setTimeout(r, 6000));
          }

          // 3. Distribute to recipients
          logger.info(`[Payout Attempt ${retryCount + 1}] Distributing payout to ${recipients.length} recipients...`);
          const r = await arenaVault.distributePayout(arena.id, recipients, amounts);
          if (r.success) {
            logger.info(`ArenaVault payout tx confirmed: ${r.txHash}`);
            break; // Success! Exit loop.
          } else {
            throw new Error(r.error || "Unknown payout error");
          }
        } catch (err) {
          retryCount++;
          logger.error(`Payout attempt ${retryCount} failed: ${err.message}`);
          if (retryCount >= maxRetries) {
            logger.error("MAX PAYOUT RETRIES REACHED. Manual rescue required.");
          } else {
            const delay = 10000 * retryCount;
            logger.info(`Retrying payout in ${delay / 1000} seconds...`);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
    })();

    return arena.results;
  }

  /**
   * Manual Rescue: Force a payout for a specific arena that failed in-memory.
   */
  async rescuePayout(arenaId, recipients, amounts, { skipReturn = false, forceRoute = true } = {}) {
    logger.info(`🆘 Master Rescue triggered for arena ${arenaId} (skipReturn: ${skipReturn}, forceRoute: ${forceRoute})`);
    const totalReturn = amounts.reduce((s, a) => s + a, 0);
    const arenaBytes32 = ArenaVaultContract.arenaIdToBytes32(arenaId);

    // 1. Force Route (unlocks the arena mapping in contract)
    if (forceRoute) {
      logger.info(`Rescue Step 1/3: Forcing route for ${arenaId}...`);
      const agentWallets = [config.arenaWallet.address, config.arenaWallet.address, config.arenaWallet.address];
      const routeAmounts = [0.1, 0.1, 0.1]; // Standard test amounts
      const r1 = await arenaVault.routeFunds(arenaId, agentWallets, routeAmounts);
      if (!r1.success) throw new Error(`Route failed: ${r1.error}`);
      await new Promise(r => setTimeout(r, 8000)); // Nonce safety
    }

    // 2. Return Funds to Vault
    if (!skipReturn && totalReturn > 0) {
      logger.info(`Rescue Step 2/3: Returning ${totalReturn} USDC to vault...`);
      const rawReturn = BigInt(Math.floor(totalReturn * 1e6));
      await approveToken(config.tokens.USDC, config.arenaVaultAddress, rawReturn);
      await new Promise(r => setTimeout(r, 6000));
      const r2 = await arenaVault.returnFunds(totalReturn);
      if (!r2.success) throw new Error(`Return failed: ${r2.error}`);
      await new Promise(r => setTimeout(r, 8000));
    }

    // 3. Final Payout
    logger.info(`Rescue Step 3/3: Distributing payout for ${arenaId}...`);
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const r = await arenaVault.distributePayout(arenaId, recipients, amounts);
        if (r.success) {
          logger.info(`✅ RESCUE SUCCESS: ${r.txHash}`);
          return { success: true, txHash: r.txHash };
        }
        throw new Error(r.error);
      } catch (err) {
        retryCount++;
        logger.warn(`Payout retry ${retryCount} failed: ${err.message}`);
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }

  async _refundArena(arena) {
    arena.status = "refunded";
    const recipients = arena.users.map(u => u.userId);
    const amounts = arena.users.map(u => u.entryFee);

    if (recipients.length === 0) {
      logger.info(`⏩ Arena ${arena.id.slice(0, 8)} is empty, nothing to refund.`);
      this._saveStates();
      return;
    }

    logger.info(`Initiating bulk refund (routing) for arena ${arena.id.slice(0, 8)} (${recipients.length} users)`);
    try {
      // For refunds, funds are in the vault. Since distributePayout requires fundsRouted=true,
      // we use routeFunds to move USDC directly from vault to users.
      const r = await arenaVault.routeFunds(arena.id, recipients, amounts);
      if (r.success) {
        logger.info(`Refund successful: ${r.txHash}`);
      } else {
        logger.error(`Refund failed: ${r.error}`);
      }
    } catch (err) {
      logger.error(`Refund lifecycle error: ${err.message}`);
    }

    this.broadcast("arena_refunded", {
      arenaId: arena.id,
      message: "Arena cancelled and funds refunded.",
    });

    // Create a fresh arena for the next attempt
    this._ensureWaitingArena();
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
      const meta = AGENT_META[agentId];
      this.broadcast("copy_trade_executed", {
        sessionId,
        userId,
        agentId,
        agentName: meta ? meta.name : "Unknown",
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
    const sessionMeta = AGENT_META[agentId];
    logger.info(`📋 Copy session started: ${userId.slice(0, 8)} → ${sessionMeta ? sessionMeta.name : "Unknown"}`);

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
      agentName: (AGENT_META[session.agentId] && AGENT_META[session.agentId].name) || "Unknown",
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

  // ── Persistence & Recovery ────────────────────────────────────────────────

  _saveStates() {
    const data = Array.from(this.arenas.values())
      .filter(a => a.status === "waiting")
      .map(a => ({
        id: a.id,
        status: a.status,
        isPrivate: a.isPrivate,
        users: a.users,
        agentUsers: a.agentUsers,
        agentSelections: this._getAgentSelections(a)
      }));
    persistence.save("arenas.json", { currentArenaId: this.currentArenaId, arenas: data });
  }

  _loadStates() {
    const saved = persistence.load("arenas.json");
    if (!saved || !saved.arenas) return;

    this.currentArenaId = saved.currentArenaId;
    let foundCurrent = false;
    for (const a of saved.arenas) {
      this.arenas.set(a.id, {
        ...a,
        agents: {},
        reasoningLog: [],
        tradeLog: [],
        startTime: null,
        endTime: null,
        timer: null,
        leaderboardTimer: null,
        results: null
      });
      logger.info(`💾 Persisted arena ${a.id.slice(0, 8)} LOADED (${a.users.length} users)`);
    }
  }

  /**
   * Disaster Recovery: Sync with blockchain on startup to find any users who paid but aren't in memory.
   */
  async _syncWithBlockchain() {
    if (config.demoMode) return;
    logger.info("📡 Starting blockchain state recovery sync...");

    try {
      const recentDeposits = await arenaVault.getRecentDeposits(60000); // Check last ~11 hours
      if (!recentDeposits || recentDeposits.length === 0) return;

      const arena = this.getWaitingArena();
      if (!arena) return;

      // Map of all user IDs already tracked in any arena (waiting or active)
      const trackedUsers = new Set();
      for (const a of this.arenas.values()) {
        for (const u of a.users) trackedUsers.add(u.userId.toLowerCase());
      }

      let recoveredCount = 0;
      for (const deposit of recentDeposits) {
        const userId = deposit.user.toLowerCase();
        if (!trackedUsers.has(userId)) {
          // Found a 'homeless' deposit!
          // We'll assign them to the Momentum Trader by default if we don't know, 
          // or just pick one. For a refund/recovery, the key is the 'Linked' state.
          const user = {
            userId,
            agentId: AGENT_IDS.MOMENTUM,
            entryFee: deposit.amount,
            joinedAt: Date.now()
          };

          arena.users.push(user);
          if (!arena.agentUsers[user.agentId]) arena.agentUsers[user.agentId] = [];
          arena.agentUsers[user.agentId].push(userId);

          trackedUsers.add(userId);
          recoveredCount++;
          logger.info(`✨ RECOVERED: User ${userId.slice(0, 8)} found on-chain (${deposit.amount} USDC)`);
        }
      }

      if (recoveredCount > 0) {
        this._saveStates();
        // Check if we can start now
        const ready = this._isReadyToStart(arena);
        if (ready) this._startArena(arena);
      }

      logger.info(`Recovery sync complete. Recovered ${recoveredCount} users.`);
    } catch (err) {
      logger.warn(`Sync failed: ${err.message}`);
    }
  }

  forceEndArena(arenaId) {
    const arena = this.arenas.get(arenaId);
    if (!arena || arena.status !== "active") return false;

    logger.info(`⚡ Force ending arena ${arenaId.slice(0, 8)}...`);
    if (arena.timer) clearTimeout(arena.timer);
    this._endArena(arena);
    return true;
  }

  async settleAll() {
    logger.info("🧨 Global Settlement Initiated: Clearing all arenas...");
    const arenas = Array.from(this.arenas.values());
    for (const arena of arenas) {
      if (arena.status === "waiting") {
        await this._refundArena(arena);
      } else if (arena.status === "active") {
        if (arena.timer) clearTimeout(arena.timer);
        await this._endArena(arena);
      }
    }
    this._saveStates();
    return { success: true, count: arenas.length };
  }

  forceRefundArena(arenaId) {
    const arena = this.arenas.get(arenaId);
    if (!arena || arena.status !== "waiting") return false;

    logger.info(`⚡ Force refunding arena ${arenaId.slice(0, 8)}...`);
    this._refundArena(arena);
    return true;
  }
}

export const arenaManager = new ArenaManager();
export default arenaManager;
