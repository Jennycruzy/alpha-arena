import config from "../../config/index.js";
import { executeSwap, getTokenBalance } from "../blockchain/chain.js";
import { reason } from "../reasoning/index.js";
import logger from "../utils/logger.js";

// ── XP thresholds per level──────────────────────────────────────────────────
const XP_THRESHOLDS = [0, 50, 150, 350, 700]; // Lv 0→1, 1→2, 2→3, 3→4, 4→MAX
const MAX_LEVEL = XP_THRESHOLDS.length - 1;
const MAX_WISDOM_ENTRIES = 8; // Rolling window of lessons

export class BaseAgent {
  constructor(name, agentId, initialBalance = 0) {
    this.name = name;
    this.agentId = agentId;
    this.chainId = config.chain.id;
    this.initialBalance = initialBalance;
    this.currentBalance = initialBalance;
    this.trades = [];
    this.running = false;
    this.loopTimer = null;
    this.holdings = {};

    // ── Callbacks set by ArenaManager ────────────────────────────────────────
    this.onTrade = null;      // (tradeData)     → broadcast trade_executed
    this.onReasoning = null;  // (reasoningData) → broadcast agent_reasoning
    this.onEvolution = null;  // (evolutionData) → broadcast agent_evolution

    this._roiHistory = [];     // sparkline data
    this._reasoningLog = [];  // last N reasoning entries (kept in memory)

    // ── Privacy mode ─────────────────────────────────────────────────────────
    this.isPrivate = false;

    // ── 🧬 EVOLUTION STATE ────────────────────────────────────────────────────
    this.xp = 0;              // total experience points
    this.level = 1;           // current level (starts at 1)
    this.wisdom = [];         // array of learned lesson strings
    this._pendingPostMortem = null; // last trade entry awaiting post-mortem
  }

  async fetchMarketData() { throw new Error("fetchMarketData must be implemented"); }
  getSystemPrompt() { throw new Error("getSystemPrompt must be implemented"); }
  buildUserPrompt(_data) { throw new Error("buildUserPrompt must be implemented"); }

  /**
   * Build an enhanced system prompt that injects accumulated wisdom.
   * Called internally; subclasses should NOT override this.
   */
  _buildEvolvedSystemPrompt() {
    const base = this.getSystemPrompt();
    if (this.wisdom.length === 0) return base;
    const wisdomBlock = this.wisdom
      .map((w, i) => `  ${i + 1}. ${w}`)
      .join("\n");
    return `${base}\n\n## Your Learned Wisdom (from previous trades this session):\n${wisdomBlock}\n\nApply these lessons to your current decision.`;
  }

  async start(capitalUsdc, isPrivate = false) {
    this.initialBalance = capitalUsdc;
    this.currentBalance = capitalUsdc;
    this.isPrivate = isPrivate;
    this.running = true;
    this.trades = [];
    this.holdings = {};
    this._roiHistory = [0];
    this._reasoningLog = [];
    // Reset evolution state for a fresh arena
    this.xp = 0;
    this.level = 1;
    this.wisdom = [];
    this._pendingPostMortem = null;
    logger.info(`[${this.name}] Started with $${capitalUsdc} USDC (${isPrivate ? "🔒 PRIVATE" : "👁 PUBLIC"}) | Lv.${this.level}`);
    await this._loop();
  }

  stop() {
    this.running = false;
    if (this.loopTimer) clearTimeout(this.loopTimer);
    logger.info(`[${this.name}] Stopped. Final: $${this.currentBalance.toFixed(4)} | Lv.${this.level} | XP:${this.xp}`);
  }

  async _loop() {
    if (!this.running) return;
    try {
      await this._executeCycle();
    } catch (err) {
      logger.error(`[${this.name}] Cycle error: ${err.message}`);
    }
    if (this.running) {
      this.loopTimer = setTimeout(
        () => this._loop(),
        config.competition.agentLoopIntervalSeconds * 1000
      );
    }
  }

  async _executeCycle() {
    logger.info(`[${this.name}] ── Cycle [Lv.${this.level} | XP:${this.xp}] (${this.isPrivate ? "PRIVATE" : "PUBLIC"}) ──`);

    const marketData = await this.fetchMarketData();

    // ── Broadcast PRE-reasoning signal (shows "thinking..." in UI) ─────────
    const cycleTs = Date.now();
    if (this.onReasoning) {
      this.onReasoning({
        agentId: this.agentId,
        agentName: this.name,
        timestamp: cycleTs,
        status: "thinking",
        isPrivate: this.isPrivate,
        level: this.level,
        xp: this.xp,
      });
    }

    // ── 🧬 PHASE 1: Self-Post-Mortem (run BEFORE main reasoning) ───────────
    // If we had a pending trade from last cycle, analyze it now that we have
    // new market data reflecting how the trade played out.
    if (this._pendingPostMortem) {
      await this._runPostMortem(this._pendingPostMortem, marketData);
      this._pendingPostMortem = null;
    }

    // ── Call reasoning adapter with evolved system prompt ──────────────────
    const decision = await reason(
      this._buildEvolvedSystemPrompt(), // 🧬 Wisdom-injected prompt
      this.buildUserPrompt(marketData),
      this.agentId,
      this.isPrivate
    );

    logger.info(`[${this.name}] Decision: ${decision.action} ${decision.token} (conf: ${decision.confidence?.toFixed(2)}) via ${decision.provider} | Lv.${this.level}`);

    // ── Build and store reasoning entry ────────────────────────────────────
    const reasoningEntry = {
      agentId: this.agentId,
      agentName: this.name,
      timestamp: Date.now(),
      status: "decided",
      action: decision.action,
      token: decision.token,
      confidence: decision.confidence,
      size: decision.size,
      provider: decision.provider,
      isPrivate: this.isPrivate,
      reason: this.isPrivate ? null : (decision.reason || null),
      // 🧬 Evolution context
      level: this.level,
      xp: this.xp,
      xpToNextLevel: this._xpToNextLevel(),
      wisdomCount: this.wisdom.length,
    };

    this._reasoningLog.unshift(reasoningEntry);
    if (this._reasoningLog.length > 30) this._reasoningLog.pop();

    if (this.onReasoning) this.onReasoning(reasoningEntry);

    // ── Stop loss check ────────────────────────────────────────────────────
    const drawdown = this.initialBalance > 0
      ? ((this.initialBalance - this.currentBalance) / this.initialBalance) * 100
      : 0;
    if (drawdown >= config.competition.stopLossPercent) {
      logger.warn(`[${this.name}] Stop loss hit (-${drawdown.toFixed(1)}%)`);
      return;
    }

    // ── Execute trade ──────────────────────────────────────────────────────
    const balanceBefore = this.currentBalance;
    if (decision.action !== "HOLD" && (decision.confidence ?? 1) > 0.4) {
      const tradeResult = await this._executeTrade(decision, marketData);
      if (tradeResult?.success) {
        const trade = {
          timestamp: Date.now(),
          ...decision,
          ...tradeResult,
          reason: this.isPrivate ? null : decision.reason,
          // 🧬 Tag trade with agent level at time of execution
          level: this.level,
        };
        this.trades.push(trade);
        if (this.onTrade) this.onTrade(trade);
        // Stash for post-mortem next cycle
        this._pendingPostMortem = { trade, balanceBefore };
      }
    }

    await this._updateBalance();

    const roi = this.initialBalance > 0
      ? ((this.currentBalance - this.initialBalance) / this.initialBalance) * 100
      : 0;
    this._roiHistory.push(parseFloat(roi.toFixed(2)));
    if (this._roiHistory.length > 30) this._roiHistory.shift();
  }

  // ── 🧬 FEATURE 1: Self-Post-Mortem ─────────────────────────────────────────
  /**
   * After a trade settles, ask the reasoning engine to extract a lesson.
   * In DEMO_MODE this uses a lightweight heuristic to avoid extra API calls.
   */
  async _runPostMortem({ trade, balanceBefore }, _marketData) {
    const balanceAfter = this.currentBalance;
    const pnl = balanceAfter - balanceBefore;
    const pnlPct = balanceBefore > 0 ? ((pnl / balanceBefore) * 100).toFixed(2) : "0.00";
    const outcome = pnl >= 0 ? "PROFIT" : "LOSS";

    try {
      let lesson;
      if (config.demoMode) {
        // Lightweight demo lessons — no extra API call
        lesson = pnl >= 0
          ? `${trade.action} ${trade.token} worked — momentum confirmed, similar setups: hold longer.`
          : `${trade.action} ${trade.token} failed — overextended entry. Next time: tighter stop at ${(trade.confidence * 100).toFixed(0)}% conf.`;
      } else {
        const postMortemPrompt = `You just executed a ${trade.action} on ${trade.token}.
Outcome: ${outcome} | PnL: ${pnl >= 0 ? "+" : ""}${pnlPct}% | Confidence was: ${(trade.confidence * 100).toFixed(0)}%
Original reasoning: "${trade.reason || "N/A"}"

In ONE concise sentence (max 20 words), what single specific lesson should you apply to future trades based on this outcome?`;

        const postResult = await reason(
          "You are an AI trading agent performing a post-trade self-analysis.",
          postMortemPrompt,
          this.agentId,
          false // always use public cheap model for post-mortem
        );
        lesson = postResult.reason || postResult.action || `${outcome} on ${trade.token} — adjust strategy.`;
      }

      // ── 🧬 FEATURE 2: Wisdom Injection — store lesson ─────────────────────
      this.wisdom.unshift(lesson);
      if (this.wisdom.length > MAX_WISDOM_ENTRIES) this.wisdom.pop();
      logger.info(`[${this.name}] 🧠 Wisdom gained: "${lesson}"`);

      // ── 🧬 FEATURE 3: XP & Leveling ──────────────────────────────────────
      const xpGained = this._calculateXP(pnl, trade.confidence);
      this.xp += xpGained;
      const prevLevel = this.level;
      this._checkLevelUp();

      if (this.onEvolution) {
        this.onEvolution({
          agentId: this.agentId,
          agentName: this.name,
          timestamp: Date.now(),
          type: this.level > prevLevel ? "level_up" : "wisdom_gained",
          lesson,
          xpGained,
          xpTotal: this.xp,
          level: this.level,
          prevLevel,
          xpToNextLevel: this._xpToNextLevel(),
          isPrivate: this.isPrivate,
        });
      }

      if (this.level > prevLevel) {
        logger.info(`[${this.name}] 🎉 LEVEL UP! ${prevLevel} → ${this.level} (XP: ${this.xp})`);
        // Inject a level-up marker into reasoning log
        this._reasoningLog.unshift({
          agentId: this.agentId,
          agentName: this.name,
          timestamp: Date.now(),
          status: "level_up",
          action: "EVOLVE",
          reason: `🎉 Level Up! Now Lv.${this.level}. Wisdom: "${lesson}"`,
          level: this.level,
          xp: this.xp,
          isPrivate: false, // level-ups are always public
        });
      }
    } catch (err) {
      logger.warn(`[${this.name}] Post-mortem failed: ${err.message}`);
    }
  }

  /** Calculate XP earned. Profitable trades earn more; high-confidence correct calls earn most. */
  _calculateXP(pnl, confidence = 0.5) {
    if (pnl > 0) {
      // Profitable: base 10 + confidence bonus + size bonus
      return Math.round(10 + (confidence * 20) + (pnl * 5));
    } else {
      // Loss: small xp for the lesson (learning is still growth)
      return Math.round(3 + (confidence * 5));
    }
  }

  _checkLevelUp() {
    for (let lv = MAX_LEVEL; lv >= 1; lv--) {
      if (this.xp >= XP_THRESHOLDS[lv] && this.level < lv) {
        this.level = lv;
        break;
      }
    }
  }

  _xpToNextLevel() {
    if (this.level >= MAX_LEVEL) return 0;
    return Math.max(0, XP_THRESHOLDS[this.level + 1] - this.xp);
  }

  // ── Trade Execution ─────────────────────────────────────────────────────────
  async _executeTrade(decision, _marketData) {
    const token = this._selectToken(decision);
    if (!token) return null;

    const fromToken = decision.action === "BUY" ? config.tokens.USDC : token.address;
    const toToken = decision.action === "BUY" ? token.address : config.tokens.USDC;

    // 🧬 Higher level agents trade slightly larger sizes (confidence grows)
    const levelMultiplier = 1 + (this.level - 1) * 0.05; // +5% per level
    const tradePercent = Math.min((decision.confidence ?? 0.5) * 0.3 * levelMultiplier, 0.35);
    const tradeAmount = Math.floor(this.currentBalance * tradePercent * 1e6);

    if (tradeAmount < Math.floor(config.competition.entryFeeUsd * 1e6 * 0.1)) {
      logger.info(`[${this.name}] Trade amount too small, skipping`);
      return null;
    }

    return executeSwap({
      fromToken,
      toToken,
      amount: String(tradeAmount),
      slippagePercent: config.competition.maxSlippagePercent,
      agentId: this.agentId,
    });
  }

  _selectToken(decision) {
    const target = decision.token?.toUpperCase() || "WETH";
    const address = config.tokens[target];
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return { address: config.tokens.WETH, symbol: "WETH" };
    }
    return { address, symbol: target };
  }

  async _updateBalance() {
    if (config.demoMode) {
      if (this.trades.length > 0) {
        const levelEdge = (this.level - 1) * 0.002;
        const riskBias = (this.riskMultiplier || 1.0) * 0.035;
        const delta = this.currentBalance * ((Math.random() - 0.40 + levelEdge) * riskBias);
        this.currentBalance = Math.max(0, this.currentBalance + delta);
      }
      return;
    }
    // Fix: Do not query the shared Operator Wallet for currentBalance, 
    // since all agents share the same wallet which causes a massive pooled ROI error.
    // Instead, currentBalance is mathematically derived from the executed trades.
    try {
      // In a real multi-wallet architecture, we would check the agent's dedicated wallet:
      // const usdcBal = await getTokenBalance(config.tokens.USDC, this.dedicatedWallet.address);
      // For now, since they share config.arenaWallet.address, we rely on the internal _executeTrade updating this.currentBalance.
    } catch (err) {
      logger.warn(`[${this.name}] Balance update failed: ${err.message}`);
    }
  }

  getStatus() {
    const roi = this.initialBalance > 0
      ? ((this.currentBalance - this.initialBalance) / this.initialBalance) * 100
      : 0;
    return {
      agentId: this.agentId,
      name: this.name,
      initialBalance: this.initialBalance,
      currentBalance: parseFloat(this.currentBalance.toFixed(4)),
      roi: parseFloat(roi.toFixed(2)),
      tradeCount: this.trades.length,
      running: this.running,
      isPrivate: this.isPrivate,
      lastTrade: this.trades[this.trades.length - 1] || null,
      roiHistory: this._roiHistory,
      winProbability: null,
      // 🧬 Evolution status
      level: this.level,
      xp: this.xp,
      xpToNextLevel: this._xpToNextLevel(),
      wisdomCount: this.wisdom.length,
      latestWisdom: this.wisdom[0] || null,
    };
  }

  /** Get recent reasoning logs (for reconnect/spectator requests) */
  getReasoningLog() {
    return this._reasoningLog;
  }
}
