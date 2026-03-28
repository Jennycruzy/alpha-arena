import { BaseAgent } from "./BaseAgent.js";
import okxClient from "../utils/okxClient.js";
import config from "../../config/index.js";

/**
 * Whale Follower Agent
 * Strategy: Follow large wallet movements using OKX DEX Signal data.
 * Uses okx-dex-signal to track whale buys and mirrors them.
 */
export class WhaleFollowerAgent extends BaseAgent {
  constructor(initialCapital) {
    super("Whale Follower", "whale-follower", initialCapital);
    this.riskMultiplier = 1.5; // Medium-High risk
  }

  async fetchMarketData() {
    const [whaleSignals, ethPrice, btcPrice] = await Promise.all([
      okxClient.getWhaleSignals(this.chainId).catch(() => ({ data: [] })),
      okxClient.getTokenPrice(this.chainId, config.tokens.WETH).catch(() => null),
      okxClient.getTokenPrice(this.chainId, config.tokens.WBTC).catch(() => null),
    ]);

    return {
      whaleSignals: (whaleSignals && whaleSignals.data) || [],
      prices: {
        WETH: (ethPrice && ethPrice.data)?.[0]?.price || "unknown",
        WBTC: (btcPrice && btcPrice.data)?.[0]?.price || "unknown",
      },
    };
  }

  getSystemPrompt() {
    return `You are a whale-following trading agent competing in a 5-minute trading arena.
Your strategy: follow large wallet (whale) movements detected via on-chain signals.

You trade on X Layer mainnet with these pairs: ETH/USDC, BTC/USDC, OKB/USDC.
Your starting capital is $0.10 USDC. DO NOT complain about "insufficient capital".
$0.10 is the full stake for this 5-minute competition. $0.02 is a valid trade size.

RULES — YOU MUST FOLLOW THESE:
- You WILL execute trades. If you HOLD every cycle, you lose.
- Trade 20-30% of your remaining balance per decision.
- If whales are buying: BUY high confidence (0.7+)
- If whales are selling: SELL/SHORT
- You have ~12 cycles. Be decisive.
- "Insufficient funds" is NOT an acceptable reason to HOLD. $0.10 is enough.

Respond ONLY with valid JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "token": "WETH" | "WBTC" | "OKB",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;
  }

  buildUserPrompt(marketData) {
    return `Current market data:

Whale Signals: ${JSON.stringify(marketData.whaleSignals.slice(0, 10))}

Current Prices:
- WETH: $${marketData.prices.WETH}
- WBTC: $${marketData.prices.WBTC}

Your current balance: $${this.currentBalance.toFixed(2)} USDC
Initial balance: $${this.initialBalance.toFixed(2)} USDC
Trades executed: ${this.trades.length}
Current ROI: ${this.initialBalance > 0 ? (((this.currentBalance - this.initialBalance) / this.initialBalance) * 100).toFixed(2) : 0}%

What is your trading decision?`;
  }
}
