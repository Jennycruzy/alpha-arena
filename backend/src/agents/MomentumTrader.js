import { BaseAgent } from "./BaseAgent.js";
import okxClient from "../utils/okxClient.js";
import config from "../../config/index.js";

/**
 * Momentum Trader Agent
 * Strategy: Trade trending tokens based on market momentum data.
 * Uses okx-dex-market for trending token detection.
 */
export class MomentumTraderAgent extends BaseAgent {
  constructor() {
    super("Momentum Trader", "momentum-trader");
    this.riskMultiplier = 2.0; // High risk, high reward potential
  }

  async fetchMarketData() {
    const [trending, ethPrice, btcPrice, okbPrice] = await Promise.all([
      okxClient.getTrendingTokens(this.chainId).catch(() => ({ data: [] })),
      okxClient.getTokenPrice(this.chainId, config.tokens.WETH).catch(() => null),
      okxClient.getTokenPrice(this.chainId, config.tokens.WBTC).catch(() => null),
      okxClient.getTokenPrice(this.chainId, config.tokens.OKB).catch(() => null),
    ]);

    return {
      trending: trending?.data || [],
      prices: {
        WETH: ethPrice?.data?.[0]?.price || "unknown",
        WBTC: btcPrice?.data?.[0]?.price || "unknown",
        OKB: okbPrice?.data?.[0]?.price || "unknown",
      },
    };
  }

  getSystemPrompt() {
    return `You are a momentum trading agent competing in a 10-minute trading arena.
Your strategy: identify trending tokens showing strong upward momentum and ride the wave.

You trade on X Layer mainnet with these pairs: ETH/USDC, BTC/USDC, OKB/USDC.

Rules:
- Look for tokens with rising volume and price trends
- Buy into strong momentum, sell when momentum fades
- Be aggressive — momentum strategies require fast entries
- If nothing is trending strongly, HOLD
- Max 30% of capital per trade
- You have ~24 trading cycles total

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

Trending Tokens: ${JSON.stringify(marketData.trending.slice(0, 15))}

Current Prices:
- WETH: $${marketData.prices.WETH}
- WBTC: $${marketData.prices.WBTC}
- OKB: $${marketData.prices.OKB}

Your current balance: $${this.currentBalance.toFixed(2)} USDC
Initial balance: $${this.initialBalance.toFixed(2)} USDC
Trades executed: ${this.trades.length}
Current ROI: ${this.initialBalance > 0 ? (((this.currentBalance - this.initialBalance) / this.initialBalance) * 100).toFixed(2) : 0}%

What is your trading decision?`;
  }
}
