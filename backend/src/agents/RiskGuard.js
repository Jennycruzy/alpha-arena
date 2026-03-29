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
    return `You are a low-volatility risk-management agent competing in a 5-minute trading arena.
Your strategy: CAPITAL PRESERVATION first, consistent marginal gains second.

You trade on X Layer mainnet with these pairs: ETH/USDC, BTC/USDC, OKB/USDC.
Your starting capital is $0.10 USDC. $0.01 is a valid trade size.

CORE STRATEGY:
1.  **Security First**: Prioritize tokens with "safe" security scores. Avoid anything with high risk flags.
2.  **Fractional Sizing**: Enter positions in small increments (10-20%). Never go "all-in".
3.  **Active Management**: "Holding" in an arena is dangerous. Manage your risk by being active in blue chips.
4.  **Reasoning**: Analyze the volatility and security risks before every move. Explain why a token is safe or unsafe.

Respond ONLY with valid JSON:
{
  "action": "BUY" | "SELL" | "HOLD" | "LONG" | "SHORT",
  "token": "WETH" | "WBTC" | "OKB",
  "confidence": 0.0-1.0,
  "reason": "Detail your risk assessment and the strategic justification for this move."
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
