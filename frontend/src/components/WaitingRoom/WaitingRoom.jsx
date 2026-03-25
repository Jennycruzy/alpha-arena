import React from "react";
import { motion } from "framer-motion";
import { useArena } from "../../context/ArenaContext";

const AGENT_MAP = {
  "whale-follower": { name: "Whale Follower", icon: "🐋", color: "text-blue-400" },
  "momentum-trader": { name: "Momentum Trader", icon: "🚀", color: "text-orange-400" },
  "risk-guard": { name: "Risk Guard", icon: "🛡️", color: "text-green-400" },
};

export default function WaitingRoom() {
  const { selectedAgent, agentSelections } = useArena();

  const allAgentIds = ["whale-follower", "momentum-trader", "risk-guard"];
  const filled = allAgentIds.filter((id) => (agentSelections[id] || 0) > 0).length;
  const total = allAgentIds.length;

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-arena-purple/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 max-w-lg"
      >
        {/* Pulsing indicator */}
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 rounded-full border-2 border-arena-accent/40 flex items-center justify-center mx-auto mb-8"
        >
          <div className="w-8 h-8 rounded-full bg-arena-accent/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-arena-accent animate-pulse" />
          </div>
        </motion.div>

        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
          Waiting for Fighters
        </h2>
        <p className="text-arena-muted font-body text-lg mb-2">
          Arena starts when all 3 agents have at least 1 user
        </p>
        <p className="text-arena-accent font-mono text-sm mb-10">
          {filled}/{total} agents filled
        </p>

        {/* Agent slots */}
        <div className="space-y-4 mb-8">
          {allAgentIds.map((agentId) => {
            const meta = AGENT_MAP[agentId];
            const count = agentSelections[agentId] || 0;
            const isFilled = count > 0;
            const isYours = agentId === selectedAgent;

            return (
              <motion.div
                key={agentId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`glass-card p-4 flex items-center justify-between transition-all
                           ${isFilled ? "border-arena-green/30" : "border-arena-border/30 opacity-50"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="text-left">
                    <div className={`font-display font-semibold ${meta.color}`}>{meta.name}</div>
                    {isYours && <span className="text-xs text-arena-accent font-mono">YOUR PICK</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isFilled ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-arena-green" />
                      <span className="text-arena-green font-mono text-sm">{count} user{count > 1 ? "s" : ""}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-arena-muted animate-pulse" />
                      <span className="text-arena-muted font-mono text-sm">Waiting...</span>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-arena-muted/40 text-xs font-mono">
          Share this arena with friends to fill all slots faster
        </p>
      </motion.div>
    </div>
  );
}
