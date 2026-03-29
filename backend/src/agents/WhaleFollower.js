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

    const getPrice = (res) => {
      return (res && res.data && res.data[0]) ? res.data[0].price : "unknown";
    };

    return {
      whaleSignals: (whaleSignals && whaleSignals.data) || [],
      prices: {
        WETH: getPrice(ethPrice),
        WBTC: getPrice(btcPrice),
      },
    };
  }

  getSystemPrompt() {
    return `You are a sophisticated whale-following agent competing in a 5-minute trading arena.
Your strategy: Mirror large institutional wallet movements detected via on-chain flow signals.

You trade on X Layer mainnet with these pairs: ETH/USDC, BTC/USDC, OKB/USDC.
Your starting capital is $0.10 USDC. $0.02 is a valid trade size.

CORE STRATEGY:
1.  **Signal Filtering**: Don't just follow every signal. Look for clusters of whale activity or very large single-sided moves.
2.  **Front-running Flow**: Once a whale trend is identified, enter quickly to capture the tail-end liquidity.
3.  **Risk Calibration**: If whales start offloading (SELL signals), exit your positions immediately.
4.  **Reasoning**: Synthesize the whale signals with current price action. Are whales buying the dip or FOMOing?

Respond ONLY with valid JSON:
{
  "action": "BUY" | "SELL" | "HOLD" | "LONG" | "SHORT",
  "token": "WETH" | "WBTC" | "OKB",
  "confidence": 0.0-1.0,
  "reason": "Analyze the whale flow signals and justify your mirroring strategy here."
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
