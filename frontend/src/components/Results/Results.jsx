import React from "react";
import { motion } from "framer-motion";
import { useArena } from "../../context/ArenaContext";

export default function Results() {
  const { results, wallet, resetArena } = useArena();

  if (!results) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <p className="text-arena-muted font-mono">Loading results...</p>
      </div>
    );
  }

  const { winner, standings, payouts, totalPool } = results;
  const myPayout = payouts.find(
    (p) => p.userId.toLowerCase() === wallet.address?.toLowerCase()
  );

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center px-4 py-16 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-arena-gold/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 max-w-3xl w-full"
      >
        {/* Trophy */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="text-7xl mb-6"
        >
          🏆
        </motion.div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-2">Arena Complete</h1>
        <p className="text-arena-muted text-lg font-body mb-8">The competition has ended. Here are the results.</p>

        {/* Winner card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card glow-gold p-8 mb-8 border-arena-gold/30"
        >
          <div className="text-xs font-mono text-arena-gold uppercase tracking-widest mb-3">Winner</div>
          <div className="text-5xl mb-3">
            {winner.agentId === "whale-follower" ? "🐋" : winner.agentId === "momentum-trader" ? "🚀" : "🛡️"}
          </div>
          <h2 className="font-display text-3xl font-bold text-arena-gold text-glow-gold mb-2">{winner.name}</h2>
          <div className="flex justify-center gap-8 mt-4">
            <div>
              <div className={`font-mono text-2xl font-bold ${winner.roi >= 0 ? "text-arena-green" : "text-arena-red"}`}>
                {winner.roi >= 0 ? "+" : ""}{winner.roi.toFixed(2)}%
              </div>
              <div className="text-arena-muted text-xs font-mono">ROI</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-white">${winner.finalBalance.toFixed(2)}</div>
              <div className="text-arena-muted text-xs font-mono">Final Balance</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-arena-accent">${totalPool.toFixed(2)}</div>
              <div className="text-arena-muted text-xs font-mono">Total Pool</div>
            </div>
          </div>
        </motion.div>

        {/* Your result */}
        {myPayout && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className={`glass-card p-6 mb-8 ${myPayout.isWinner ? "border-arena-green/30 glow-green" : "border-arena-border"}`}
          >
            <div className="text-xs font-mono text-arena-muted uppercase tracking-widest mb-2">Your Result</div>
            <div className="flex justify-center gap-8">
              <div>
                <div className="text-white font-mono text-lg">Agent: {myPayout.agentName}</div>
              </div>
              <div>
                <div className="font-mono text-lg text-white">${myPayout.entryFee.toFixed(2)}</div>
                <div className="text-arena-muted text-xs">Entry</div>
              </div>
              <div>
                <div className={`font-mono text-lg font-bold ${myPayout.profit >= 0 ? "text-arena-green" : "text-arena-red"}`}>
                  ${myPayout.payout.toFixed(2)}
                </div>
                <div className="text-arena-muted text-xs">Payout</div>
              </div>
              <div>
                <div className={`font-mono text-lg font-bold ${myPayout.profit >= 0 ? "text-arena-green" : "text-arena-red"}`}>
                  {myPayout.profit >= 0 ? "+" : ""}${myPayout.profit.toFixed(2)}
                </div>
                <div className="text-arena-muted text-xs">Profit/Loss</div>
              </div>
            </div>
            {myPayout.isWinner && (
              <div className="mt-4 text-arena-green font-mono text-sm">✅ You backed the winning agent!</div>
            )}
          </motion.div>
        )}

        {/* All standings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="glass-card p-6 mb-8"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4">Final Standings</h3>
          <div className="space-y-3">
            {standings.map((agent, i) => (
              <div
                key={agent.agentId}
                className="flex items-center justify-between p-3 rounded-lg bg-arena-bg/50"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-display font-bold text-lg ${i === 0 ? "text-arena-gold" : "text-arena-muted"}`}>
                    #{i + 1}
                  </span>
                  <span className="text-xl">
                    {agent.agentId === "whale-follower" ? "🐋" : agent.agentId === "momentum-trader" ? "🚀" : "🛡️"}
                  </span>
                  <span className="text-white font-display font-medium">{agent.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-mono text-sm text-arena-muted">{agent.tradeCount} trades</span>
                  <span className={`font-mono font-bold ${agent.roi >= 0 ? "text-arena-green" : "text-arena-red"}`}>
                    {agent.roi >= 0 ? "+" : ""}{agent.roi.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payouts table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="glass-card p-6 mb-10"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4">Payouts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-arena-muted font-mono text-xs border-b border-arena-border">
                  <th className="text-left py-2">User</th>
                  <th className="text-left py-2">Agent</th>
                  <th className="text-right py-2">Entry</th>
                  <th className="text-right py-2">Payout</th>
                  <th className="text-right py-2">P/L</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr key={i} className="border-b border-arena-border/30">
                    <td className="py-2 font-mono text-arena-muted">{p.userId.slice(0, 8)}...</td>
                    <td className="py-2 text-white">{p.agentName}</td>
                    <td className="py-2 text-right font-mono">${p.entryFee.toFixed(2)}</td>
                    <td className="py-2 text-right font-mono text-white">${p.payout.toFixed(2)}</td>
                    <td className={`py-2 text-right font-mono font-bold ${p.profit >= 0 ? "text-arena-green" : "text-arena-red"}`}>
                      {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={resetArena}
          className="px-8 py-3 bg-arena-accent text-arena-bg font-display font-bold rounded-xl hover:bg-cyan-300 transition-all glow-cyan"
        >
          Enter New Arena
        </motion.button>
      </motion.div>
    </div>
  );
}
