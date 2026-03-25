import { WhaleFollowerAgent } from "./WhaleFollower.js";
import { MomentumTraderAgent } from "./MomentumTrader.js";
import { RiskGuardAgent } from "./RiskGuard.js";

export const AGENT_IDS = {
  WHALE: "whale-follower",
  MOMENTUM: "momentum-trader",
  RISK_GUARD: "risk-guard",
};

export const AGENT_META = {
  [AGENT_IDS.WHALE]: {
    id: AGENT_IDS.WHALE,
    name: "Whale Follower",
    description: "Follows large wallet movements detected via on-chain signals",
    strategy: "Copy whale trades in real-time using OKX DEX Signal data",
    risk: "Medium-High",
    icon: "🐋",
  },
  [AGENT_IDS.MOMENTUM]: {
    id: AGENT_IDS.MOMENTUM,
    name: "Momentum Trader",
    description: "Rides trending tokens showing strong upward momentum",
    strategy: "Aggressive trend-following using OKX DEX Market data",
    risk: "High",
    icon: "🚀",
  },
  [AGENT_IDS.RISK_GUARD]: {
    id: AGENT_IDS.RISK_GUARD,
    name: "Risk Guard",
    description: "Conservative strategy focused on capital preservation",
    strategy: "Security-first approach with small positions and fast exits",
    risk: "Low",
    icon: "🛡️",
  },
};

export function createAgent(agentId) {
  switch (agentId) {
    case AGENT_IDS.WHALE:
      return new WhaleFollowerAgent();
    case AGENT_IDS.MOMENTUM:
      return new MomentumTraderAgent();
    case AGENT_IDS.RISK_GUARD:
      return new RiskGuardAgent();
    default:
      throw new Error(`Unknown agent: ${agentId}`);
  }
}
