import React from "react";
import { motion } from "framer-motion";
import { useArena } from "../../context/ArenaContext";

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const AGENT_STYLES = {
  "whale-follower": { icon: "🐋", gradient: "from-blue-500/20 to-blue-600/5", barColor: "bg-blue-500", textColor: "text-blue-400" },
  "momentum-trader": { icon: "🚀", gradient: "from-orange-500/20 to-orange-600/5", barColor: "bg-orange-500", textColor: "text-orange-400" },
  "risk-guard": { icon: "🛡️", gradient: "from-green-500/20 to-green-600/5", barColor: "bg-green-500", textColor: "text-green-400" },
};

export default function LiveArena() {
  const { leaderboard, remainingMs, selectedAgent } = useArena();

  const progress = Math.max(0, 1 - remainingMs / (10 * 60 * 1000));

  return (
    <div className="min-h-screen grid-bg flex flex-col px-4 py-8 relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-arena-surface">
        <motion.div
          className="h-full bg-gradient-to-r from-arena-accent to-arena-purple"
          style={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8 mt-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">
              ⚔️ Arena <span className="text-arena-accent">LIVE</span>
            </h1>
            <p className="text-arena-muted text-sm font-mono mt-1">Agents are trading autonomously with real funds</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-4xl font-bold text-white tracking-wider">{formatTime(remainingMs)}</div>
            <div className="text-arena-muted text-xs font-mono uppercase tracking-wider">Remaining</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-4">
          {leaderboard.map((agent, index) => {
            const style = AGENT_STYLES[agent.agentId] || AGENT_STYLES["whale-follower"];
            const isYours = agent.agentId === selectedAgent;
            const roiPositive = agent.roi >= 0;

            return (
              <motion.div
                key={agent.agentId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card p-5 bg-gradient-to-r ${style.gradient} transition-all duration-500
                           ${isYours ? "ring-1 ring-arena-accent/40 glow-cyan" : ""}
                           ${index === 0 ? "glow-gold" : ""}`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {/* Rank + Agent */}
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-display font-bold ${index === 0 ? "text-arena-gold text-glow-gold" : "text-arena-muted"}`}>
                      #{index + 1}
                    </div>
                    <span className="text-3xl">{style.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-display text-lg font-bold ${style.textColor}`}>{agent.name}</h3>
                        {isYours && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-arena-accent/20 text-arena-accent border border-arena-accent/30">
                            YOUR PICK
                          </span>
                        )}
                      </div>
                      <div className="text-arena-muted text-xs font-mono">
                        {agent.userCount} user{agent.userCount > 1 ? "s" : ""} · {agent.tradeCount} trades
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-white font-mono text-lg font-semibold">
                        ${agent.currentBalance?.toFixed(2) || "0.00"}
                      </div>
                      <div className="text-arena-muted text-[10px] font-mono uppercase">Balance</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-mono text-2xl font-bold ${roiPositive ? "text-arena-green" : "text-arena-red"}`}>
                        {roiPositive ? "+" : ""}{agent.roi?.toFixed(2) || "0.00"}%
                      </div>
                      <div className="text-arena-muted text-[10px] font-mono uppercase">ROI</div>
                    </div>
                  </div>
                </div>

                {/* ROI bar */}
                <div className="mt-4 h-1.5 bg-arena-bg/50 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${roiPositive ? "bg-arena-green" : "bg-arena-red"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(agent.roi || 0) * 2 + 5)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {leaderboard.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-arena-muted font-mono">Waiting for first trade cycle...</p>
            <p className="text-arena-muted/50 text-xs font-mono mt-2">Agents execute trades every 25 seconds</p>
          </div>
        )}

        {/* Info bar */}
        <div className="mt-8 flex justify-center gap-6 text-xs text-arena-muted/50 font-mono">
          <span>🔗 X Layer Mainnet</span>
          <span>📊 Updates every 5s</span>
          <span>🔒 Max 2% slippage</span>
          <span>🛑 -15% stop loss</span>
        </div>
      </div>
    </div>
  );
}
