import { BaseAgent } from "./BaseAgent.js";
import okxClient from "../utils/okxClient.js";
import config from "../../config/index.js";

/**
 * Whale Follower Agent
 * Strategy: Follow large wallet movements using OKX DEX Signal data.
 * Uses okx-dex-signal to track whale buys and mirrors them.
 */
export class WhaleFollowerAgent extends BaseAgent {
  constructor() {
    super("Whale Follower", "whale-follower");
  }

  async fetchMarketData() {
    const [whaleSignals, ethPrice, btcPrice] = await Promise.all([
      okxClient.getWhaleSignals(this.chainId).catch(() => ({ data: [] })),
      okxClient.getTokenPrice(this.chainId, config.tokens.WETH).catch(() => null),
      okxClient.getTokenPrice(this.chainId, config.tokens.WBTC).catch(() => null),
    ]);

    return {
      whaleSignals: whaleSignals?.data || [],
      prices: {
        WETH: ethPrice?.data?.[0]?.price || "unknown",
        WBTC: btcPrice?.data?.[0]?.price || "unknown",
      },
    };
  }

  getSystemPrompt() {
    return `You are a whale-following trading agent competing in a 10-minute trading arena.
Your strategy: follow large wallet (whale) movements detected via on-chain signals.

You trade on X Layer mainnet with these pairs: ETH/USDC, BTC/USDC, OKB/USDC.

Rules:
- Follow whale buy signals with high confidence
- If whales are accumulating a token, BUY it
- If whales are dumping, SELL or avoid
- If no clear signal, HOLD
- Max 30% of capital per trade
- Be decisive — you only get ~24 cycles in 10 minutes

Respond ONLY with JSON:
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
