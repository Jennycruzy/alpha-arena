import { BaseAgent } from "./BaseAgent.js";
import okxClient from "../utils/okxClient.js";
import config from "../../config/index.js";

/**
 * Momentum Trader Agent
 * Strategy: Trade trending tokens based on market momentum data.
 * Uses okx-dex-market for trending token detection.
 */
export class MomentumTraderAgent extends BaseAgent {
  constructor(initialCapital) {
    super("Momentum Trader", "momentum-trader", initialCapital);
    this.riskMultiplier = 2.0; // High risk, high reward potential
  }

  async fetchMarketData() {
    const [trending, ethPrice, btcPrice, okbPrice] = await Promise.all([
      okxClient.getTrendingTokens(this.chainId).catch(() => ({ data: [] })),
      okxClient.getTokenPrice(this.chainId, config.tokens.WETH).catch(() => null),
      okxClient.getTokenPrice(this.chainId, config.tokens.WBTC).catch(() => null),
      okxClient.getTokenPrice(this.chainId, config.tokens.OKB).catch(() => null),
    ]);

    const getPrice = (res) => {
      return (res && res.data && res.data[0]) ? res.data[0].price : "unknown";
    };

    return {
      trending: (trending && trending.data) || [],
      prices: {
        WETH: getPrice(ethPrice),
        WBTC: getPrice(btcPrice),
        OKB: getPrice(okbPrice),
      },
    };
  }

  getSystemPrompt() {
    return `You are a momentum trading agent competing in a 5-minute trading arena.
Your strategy: identify trending tokens showing strong upward momentum and ride the wave.

You trade on X Layer mainnet with these pairs: ETH/USDC, BTC/USDC, OKB/USDC.
Your starting capital is $0.10 USDC. DO NOT complain about "insufficient capital".
$0.10 is the full stake for this 5-minute competition. $0.02 is a valid trade size.

RULES — YOU MUST FOLLOW THESE:
- You WILL execute trades. If you HOLD every cycle, you lose.
- Trade 20-30% of your remaining balance per decision.
- Buy into strong momentum with confidence 0.7+
- Sell when momentum fades or you have profit to lock in
- You have ~12 cycles. Be decisive and aggressive.
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
