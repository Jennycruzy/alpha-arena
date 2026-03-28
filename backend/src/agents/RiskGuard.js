import { BaseAgent } from "./BaseAgent.js";
import okxClient from "../utils/okxClient.js";
import config from "../../config/index.js";

/**
 * Risk Guard Agent
 * Strategy: Conservative, low-volatility approach with heavy security screening.
 * Uses okx-security for token safety and avoids risky plays.
 */
export class RiskGuardAgent extends BaseAgent {
  constructor(initialCapital) {
    super("Risk Guard", "risk-guard", initialCapital);
    this.riskMultiplier = 0.8; // Low risk, capital preservation
  }

  async fetchMarketData() {
    // Gather prices + security data for all tradeable tokens
    const [ethPrice, btcPrice, okbPrice, ethSecurity, btcSecurity] = await Promise.all([
      okxClient.getTokenPrice(this.chainId, config.tokens.WETH).catch(() => null),
      okxClient.getTokenPrice(this.chainId, config.tokens.WBTC).catch(() => null),
      okxClient.getTokenPrice(this.chainId, config.tokens.OKB).catch(() => null),
      okxClient.securityScan(this.chainId, config.tokens.WETH).catch(() => null),
      okxClient.securityScan(this.chainId, config.tokens.WBTC).catch(() => null),
    ]);

    const getPrice = (res) => {
      return (res && res.data && res.data[0]) ? res.data[0].price : "unknown";
    };

    return {
      prices: {
        WETH: getPrice(ethPrice),
        WBTC: getPrice(btcPrice),
        OKB: getPrice(okbPrice),
      },
      security: {
        WETH: (ethSecurity && ethSecurity.data && ethSecurity.data[0]) || {},
        WBTC: (btcSecurity && btcSecurity.data && btcSecurity.data[0]) || {},
      },
    };
  }

  getSystemPrompt() {
    return `You are a risk-guard trading agent competing in a 5-minute trading arena.
Your strategy: CAPITAL PRESERVATION first, modest gains second.

You trade on X Layer mainnet with these pairs: ETH/USDC, BTC/USDC, OKB/USDC.
Your starting capital is $0.10 USDC. DO NOT complain about "insufficient capital".
$0.10 is the full stake for this 5-minute competition. $0.01 is a valid trade size.

RULES — YOU MUST FOLLOW THESE:
- You WILL place trades. If you HOLD every cycle, you lose by default.
- Trade 10-20% per decision in safe blue chips (WETH, WBTC).
- Every trade matters. Even a small gain is better than zero activity.
- "Insufficient funds" is NOT an acceptable reason to HOLD. $0.10 is enough.
- You have ~12 cycles. Steady, careful, but ACTIVE.

Respond ONLY with valid JSON:
{
  "action": "BUY" | "SELL" | "HOLD" | "LONG" | "SHORT",
  "token": "WETH" | "WBTC" | "OKB",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;
  }

  buildUserPrompt(marketData) {
    return `Current market data:

Prices:
- WETH: $${marketData.prices.WETH}
- WBTC: $${marketData.prices.WBTC}
- OKB: $${marketData.prices.OKB}

Security Assessments:
- WETH: ${JSON.stringify(marketData.security.WETH)}
- WBTC: ${JSON.stringify(marketData.security.WBTC)}

Your current balance: $${this.currentBalance.toFixed(2)} USDC
Initial balance: $${this.initialBalance.toFixed(2)} USDC
Trades executed: ${this.trades.length}
Current ROI: ${this.initialBalance > 0 ? (((this.currentBalance - this.initialBalance) / this.initialBalance) * 100).toFixed(2) : 0}%

What is your trading decision? Remember: preservation is key.`;
  }
}
