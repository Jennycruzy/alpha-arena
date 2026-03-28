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
    this.cashBalance = initialBalance;
    this.currentBalance = initialBalance; // Total portfolio value
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

    // ── 📈 PERP STATE (Long/Short) ───────────────────────────────────────────
    this.positions = {};      // tokenSymbol -> { side: "LONG"|"SHORT", entryPrice, sizeUsdc, liquidationPrice }
  }

  async fetchMarketData() { throw new Error("fetchMarketData must be implemented"); }
  getSystemPrompt() { throw new Error("getSystemPrompt must be implemented"); }
  buildUserPrompt(_data) { throw new Error("buildUserPrompt must be implemented"); }

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
    this.cashBalance = capitalUsdc;
    this.currentBalance = capitalUsdc;
    this.isPrivate = isPrivate;
    this.running = true;
    this.trades = [];
    this.holdings = {};
    this._roiHistory = [0];
    this._reasoningLog = [];
    this.xp = 0;
    this.level = 1;
    this.wisdom = [];
    this._pendingPostMortem = null;
    this.positions = {};
    logger.info(`[${this.name}] Started with $${capitalUsdc} USDC (${isPrivate ? "🔒 PRIVATE" : "👁 PUBLIC"}) | Lv.${this.level}`);
    await this._loop();
  }

  async stop() {
    this.running = false;
    if (this.loopTimer) clearTimeout(this.loopTimer);

    // 🧬 Ensure final trade gets its post-mortem (XP/Wisdom)
    if (this._pendingPostMortem) {
      const marketData = await this.fetchMarketData().catch(() => ({ prices: {} }));
      await this._runPostMortem(this._pendingPostMortem, marketData);
      this._pendingPostMortem = null;
    }

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

    if (this._pendingPostMortem) {
      await this._runPostMortem(this._pendingPostMortem, marketData);
      this._pendingPostMortem = null;
    }

    const decision = await reason(
      this._buildEvolvedSystemPrompt(),
      this.buildUserPrompt(marketData),
      this.agentId,
      this.isPrivate
    );

    const confVal = (decision.confidence !== undefined) ? decision.confidence : 1.0;
    const confStr = confVal.toFixed(2);
    logger.info(`[${this.name}] Decision: ${decision.action} ${decision.token} (conf: ${confStr}) via ${decision.provider} | Lv.${this.level}`);

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
      level: this.level,
      xp: this.xp,
      xpToNextLevel: this._xpToNextLevel(),
      wisdomCount: this.wisdom.length,
    };

    this._reasoningLog.unshift(reasoningEntry);
    if (this._reasoningLog.length > 30) this._reasoningLog.pop();
    if (this.onReasoning) this.onReasoning(reasoningEntry);

    const drawdown = this.initialBalance > 0
      ? ((this.initialBalance - this.currentBalance) / this.initialBalance) * 100
      : 0;
    if (drawdown >= config.competition.stopLossPercent) {
      logger.warn(`[${this.name}] Stop loss hit (-${drawdown.toFixed(1)}%)`);
      return;
    }

    const balanceBefore = this.currentBalance;
    const effectiveConfidence = (decision.confidence !== undefined && decision.confidence !== null) ? decision.confidence : 1.0;

    if (decision.action !== "HOLD" && effectiveConfidence > 0.4) {
      if (decision.action === "BUY" || decision.action === "SELL") {
        const tradeResult = await this._executeTrade(decision, marketData);
        if (tradeResult && tradeResult.success) {
          const tradeAmountUsdc = (tradeResult.outAmount || 0);
          const spentUsdc = decision.action === "BUY" ? (Number(decision.size) || 0) : 0;

          if (decision.action === "BUY") {
            this.cashBalance -= spentUsdc;
            // Track holdings for total value calculation
            const tokenSym = decision.token.toUpperCase();
            this.holdings[tokenSym] = (this.holdings[tokenSym] || 0) + tradeResult.outAmount;
          } else if (decision.action === "SELL") {
            const tokenSym = decision.token.toUpperCase();
            this.cashBalance += tradeAmountUsdc;
            this.holdings[tokenSym] = 0; // Simplified: sell all
          }

          const trade = {
            timestamp: Date.now(),
            ...decision,
            ...tradeResult,
            reason: this.isPrivate ? null : decision.reason,
            level: this.level,
          };
          this.trades.push(trade);
          if (this.onTrade) this.onTrade(trade);
          this._pendingPostMortem = { trade, balanceBefore };
        }
      } else if (decision.action === "LONG" || decision.action === "SHORT") {
        const tradeResult = await this._executePerpTrade(decision, marketData);
        if (tradeResult && tradeResult.success) {
          const trade = {
            timestamp: Date.now(),
            ...decision,
            ...tradeResult,
            reason: this.isPrivate ? null : decision.reason,
            level: this.level,
          };
          this.trades.push(trade);
          if (this.onTrade) this.onTrade(trade);
          this._pendingPostMortem = { trade, balanceBefore };
        }
      }
    }

    await this._updateBalance();

    const roi = this.initialBalance > 0
      ? ((this.currentBalance - this.initialBalance) / this.initialBalance) * 100
      : 0;
    this._roiHistory.push(parseFloat(roi.toFixed(2)));
    if (this._roiHistory.length > 30) this._roiHistory.shift();
  }

  async _runPostMortem({ trade, balanceBefore }, _marketData) {
    const balanceAfter = this.currentBalance;
    const pnl = balanceAfter - balanceBefore;
    const pnlPct = balanceBefore > 0 ? ((pnl / balanceBefore) * 100).toFixed(2) : "0.00";
    const outcome = pnl >= 0 ? "PROFIT" : "LOSS";

    try {
      let lesson;
      if (config.demoMode) {
        lesson = pnl >= 0
          ? `${trade.action} ${trade.token} worked — momentum confirmed.`
          : `${trade.action} ${trade.token} failed — overextended entry.`;
      } else {
        const postMortemPrompt = `You just executed a ${trade.action} on ${trade.token}. Outcome: ${outcome} | PnL: ${pnl >= 0 ? "+" : ""}${pnlPct}% | Confidence was: ${(trade.confidence * 100).toFixed(0)}% Original reasoning: "${trade.reason || "N/A"}" In ONE concise sentence, what lesson did you learn?`;
        const postResult = await reason("You are an AI trading agent analyzing your performance.", postMortemPrompt, this.agentId, false);
        lesson = postResult.reason || postResult.action || `${outcome} on ${trade.token} — adjust strategy.`;
      }

      this.wisdom.unshift(lesson);
      if (this.wisdom.length > MAX_WISDOM_ENTRIES) this.wisdom.pop();
      logger.info(`[${this.name}] 🧠 Wisdom gained: "${lesson}"`);

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
        logger.info(`[${this.name}] 🎉 LEVEL UP! ${prevLevel} → ${this.level}`);
        this._reasoningLog.unshift({
          agentId: this.agentId,
          agentName: this.name,
          timestamp: Date.now(),
          status: "level_up",
          action: "EVOLVE",
          reason: `🎉 Level Up! Now Lv.${this.level}. Wisdom: "${lesson}"`,
          level: this.level,
          xp: this.xp,
          isPrivate: false,
        });
      }
    } catch (err) {
      logger.warn(`[${this.name}] Post-mortem failed: ${err.message}`);
    }
  }

  _calculateXP(pnl, confidence = 0.5) {
    if (pnl > 0) return Math.round(10 + (confidence * 20) + (pnl * 5));
    return Math.round(3 + (confidence * 5));
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

  async _executeTrade(decision, _marketData) {
    const token = this._selectToken(decision);
    if (!token) return null;

    const fromToken = decision.action === "BUY" ? config.tokens.USDC : token.address;
    const toToken = decision.action === "BUY" ? token.address : config.tokens.USDC;

    const levelMultiplier = 1 + (this.level - 1) * 0.05;
    const confidence = (decision.confidence !== undefined && decision.confidence !== null) ? decision.confidence : 0.5;
    const tradePercent = Math.min(confidence * 0.3 * levelMultiplier, 0.35);
    const tradeAmount = Math.floor(this.cashBalance * tradePercent * 1e6);

    if (tradeAmount < 1000) {
      logger.info(`[${this.name}] Trade too small (${tradeAmount}), skipping`);
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

  async _executePerpTrade(decision, marketData) {
    const symbol = (decision.token && decision.token.toUpperCase) ? decision.token.toUpperCase() : "WETH";
    const currentPrice = marketData.prices[symbol] || 3200;

    // Close existing position if any
    if (this.positions[symbol]) {
      const pos = this.positions[symbol];
      const pnl = pos.side === "LONG" ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
      const pnlUsdc = (pnl / pos.entryPrice) * pos.sizeUsdc;
      this.cashBalance += pnlUsdc;
      delete this.positions[symbol];
      logger.info(`[${this.name}] Closed ${pos.side} ${symbol} at ${currentPrice} (PnL: $${pnlUsdc.toFixed(2)})`);
    }

    // Open new position
    const levelMultiplier = 1 + (this.level - 1) * 0.1;
    const confidence = (decision.confidence !== undefined && decision.confidence !== null) ? decision.confidence : 0.5;
    const sizeUsdc = this.cashBalance * Math.min(confidence * 0.5 * levelMultiplier, 0.8);

    if (sizeUsdc < 0.01) {
      logger.info(`[${this.name}] Perp position too small ($${sizeUsdc.toFixed(2)}), skipping`);
      return { success: false };
    }

    this.positions[symbol] = {
      side: decision.action,
      entryPrice: currentPrice,
      sizeUsdc: sizeUsdc,
      liquidationPrice: decision.action === "LONG" ? currentPrice * 0.85 : currentPrice * 1.15
    };

    // Deduct margin from cash? In many perp models, you just need it as collateral.
    // For simplicity, we'll keep it in cashBalance for now as it's not "spent" like in Spot.

    logger.info(`[${this.name}] Opened ${decision.action} ${symbol} at ${currentPrice} | Size: $${sizeUsdc.toFixed(2)}`);

    return {
      success: true,
      entryPrice: currentPrice,
      sizeUsdc,
      txHash: `0xperp-${Date.now().toString(16)}`
    };
  }

  _selectToken(decision) {
    const target = (decision.token && decision.token.toUpperCase) ? decision.token.toUpperCase() : "WETH";
    const address = config.tokens[target];
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return { address: config.tokens.WETH, symbol: "WETH" };
    }
    return { address, symbol: target };
  }

  async _updateBalance() {
    const marketData = await this.fetchMarketData();
    let totalValue = this.cashBalance;

    // 1. Add Spot Holdings Value
    for (const [symbol, amount] of Object.entries(this.holdings)) {
      if (amount > 0) {
        const price = marketData.prices[symbol] || 0;
        totalValue += amount * price;
      }
    }

    // 2. Add Unrealized PnL from Perp positions
    for (const [symbol, pos] of Object.entries(this.positions)) {
      const currentPrice = marketData.prices[symbol] || pos.entryPrice;
      const pnl = pos.side === "LONG" ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
      const pnlUsdc = (pnl / pos.entryPrice) * pos.sizeUsdc;
      totalValue += pnlUsdc;

      // Liquidation check
      if ((pos.side === "LONG" && currentPrice <= pos.liquidationPrice) ||
        (pos.side === "SHORT" && currentPrice >= pos.liquidationPrice)) {
        logger.warn(`[${this.name}] 💀 LIQUIDATED ${pos.side} ${symbol} at ${currentPrice}`);
        this.cashBalance -= pos.sizeUsdc; // Lose the margin
        delete this.positions[symbol];
      }
    }

    if (config.demoMode) {
      if (this.trades.length > 0) {
        const levelEdge = (this.level - 1) * 0.002;
        const riskBias = (this.riskMultiplier || 1.0) * 0.01;
        const drift = (Math.random() - 0.45 + levelEdge) * riskBias;
        totalValue *= (1 + drift);
      }
    }

    this.currentBalance = totalValue;
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
      level: this.level,
      xp: this.xp,
      xpToNextLevel: this._xpToNextLevel(),
      wisdomCount: this.wisdom.length,
      latestWisdom: this.wisdom[0] || null,
    };
  }

  getReasoningLog() {
    return this._reasoningLog;
  }
}
