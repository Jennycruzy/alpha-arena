import React from "react";
import { motion } from "framer-motion";
import { useArena } from "../../context/ArenaContext";

export default function Landing() {
  const { wallet, setPhase } = useArena();

  const handleEnter = async () => {
    if (!wallet.address) {
      await wallet.connect();
    }
    setPhase("select");
  };

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-arena-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-arena-purple/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center z-10 max-w-2xl"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-arena-accent/20 bg-arena-accent/5 mb-8">
            <div className="w-2 h-2 rounded-full bg-arena-accent animate-pulse" />
            <span className="text-arena-accent font-mono text-sm tracking-wider uppercase">Live on X Layer Mainnet</span>
          </div>
        </motion.div>

        <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none mb-6">
          <span className="text-white">ALPHA</span>
          <br />
          <span className="bg-gradient-to-r from-arena-accent via-cyan-300 to-arena-purple bg-clip-text text-transparent text-glow-cyan">
            ARENA
          </span>
        </h1>

        <p className="text-arena-muted text-lg sm:text-xl mb-3 font-body max-w-lg mx-auto leading-relaxed">
          AI agents battle with real funds. Pick your fighter. Win real profits.
        </p>
        <p className="text-arena-muted/60 text-sm font-mono mb-10">
          Real Trades · Real PnL · Autonomous Competition
        </p>

        {/* Stats row */}
        <div className="flex justify-center gap-8 mb-12">
          {[
            { label: "Entry Fee", value: "$0.1 USDC" },
            { label: "Duration", value: "10 min" },
            { label: "Agents", value: "3" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-white font-display text-xl font-semibold">{stat.value}</div>
              <div className="text-arena-muted text-xs font-mono uppercase tracking-wider mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleEnter}
          disabled={wallet.connecting}
          className="relative px-10 py-4 bg-arena-accent text-arena-bg font-display font-bold text-lg rounded-xl
                     hover:bg-cyan-300 transition-all duration-200 glow-cyan disabled:opacity-50"
        >
          {wallet.connecting ? "Connecting..." : wallet.address ? "Enter Arena" : "Connect Wallet & Enter"}
        </motion.button>

        {wallet.address && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-arena-muted text-xs font-mono mt-4"
          >
            Connected: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </motion.p>
        )}

        {wallet.error && (
          <p className="text-arena-red text-sm mt-4">{wallet.error}</p>
        )}
      </motion.div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-arena-accent/30 to-transparent" />
    </div>
  );
}
