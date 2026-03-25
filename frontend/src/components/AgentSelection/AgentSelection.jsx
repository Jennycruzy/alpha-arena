import React, { useState } from "react";
import { motion } from "framer-motion";
import { useArena } from "../../context/ArenaContext";
import { api } from "../../utils/api";

const AGENTS = [
  {
    id: "whale-follower",
    name: "Whale Follower",
    icon: "🐋",
    risk: "Medium-High",
    riskColor: "text-yellow-400",
    description: "Follows large wallet movements detected via on-chain signals",
    strategy: "Mirrors whale buys using OKX DEX Signal data in real-time",
    accent: "from-blue-500 to-cyan-400",
    border: "border-blue-500/30",
    glow: "hover:shadow-blue-500/20",
    bg: "bg-blue-500/5",
  },
  {
    id: "momentum-trader",
    name: "Momentum Trader",
    icon: "🚀",
    risk: "High",
    riskColor: "text-arena-red",
    description: "Rides trending tokens showing strong upward momentum",
    strategy: "Aggressive trend-following via OKX DEX Market trending data",
    accent: "from-orange-500 to-red-400",
    border: "border-orange-500/30",
    glow: "hover:shadow-orange-500/20",
    bg: "bg-orange-500/5",
  },
  {
    id: "risk-guard",
    name: "Risk Guard",
    icon: "🛡️",
    risk: "Low",
    riskColor: "text-arena-green",
    description: "Conservative strategy focused on capital preservation",
    strategy: "Security-first approach — small positions, fast exits, blue chips only",
    accent: "from-green-500 to-emerald-400",
    border: "border-green-500/30",
    glow: "hover:shadow-green-500/20",
    bg: "bg-green-500/5",
  },
];

export default function AgentSelection() {
  const { wallet, setPhase, setSelectedAgent, setArenaId, agentSelections } = useArena();
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const handleSelect = async (agentId) => {
    setJoining(true);
    setError(null);
    try {
      // In dev mode, skip real payment
      const result = await api.joinArena(wallet.address, agentId, null);
      setSelectedAgent(agentId);
      setArenaId(result.arenaId);

      if (result.readyToStart) {
        setPhase("live");
      } else {
        setPhase("waiting");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center px-4 py-16 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-arena-accent/3 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 z-10"
      >
        <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-3">Choose Your Agent</h2>
        <p className="text-arena-muted font-body text-lg">Pick the AI trading strategy that matches your conviction</p>
        <p className="text-arena-muted/50 font-mono text-sm mt-2">
          Entry fee: $10 USDC · All 3 agents must be selected to start
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full z-10">
        {AGENTS.map((agent, i) => {
          const userCount = agentSelections[agent.id] || 0;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
              className={`glass-card p-6 cursor-pointer transition-all duration-300 ${agent.border}
                         ${hoveredAgent === agent.id ? `shadow-2xl ${agent.glow} scale-[1.02]` : ""}
                         ${agent.bg}`}
              onClick={() => !joining && handleSelect(agent.id)}
            >
              <div className="text-5xl mb-4">{agent.icon}</div>
              <h3 className="font-display text-xl font-bold text-white mb-1">{agent.name}</h3>
              <div className={`text-xs font-mono ${agent.riskColor} mb-3`}>Risk: {agent.risk}</div>
              <p className="text-arena-muted text-sm mb-3 leading-relaxed">{agent.description}</p>
              <div className="text-xs text-arena-muted/60 font-mono border-t border-arena-border/50 pt-3 mt-3">
                {agent.strategy}
              </div>
              {userCount > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-arena-accent/10 border border-arena-accent/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-arena-accent" />
                  <span className="text-arena-accent text-xs font-mono">{userCount} joined</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {joining && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-arena-accent font-mono text-sm">
          Joining arena...
        </motion.div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-arena-red text-sm">
          {error}
        </motion.div>
      )}
    </div>
  );
}
