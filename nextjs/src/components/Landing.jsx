"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useArena } from "@/context/ArenaContext";

export default function Landing() {
    const { address } = useAccount();
    const { open } = useAppKit();
    const { setPhase, config } = useArena();

    const entryFee = config?.entryFeeUsd ?? 0.5;
    const duration = config ? `${Math.floor(config.durationSeconds / 60)} min` : "10 min";

    const handleEnter = async () => {
        if (!address) {
            open();
            return;
        }
        setPhase("select");
    };

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center justify-between relative overflow-y-auto overflow-x-hidden px-6 py-12 md:py-20">
            {/* Background Glows */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[1000px] h-[600px] md:h-[1000px] rounded-full bg-[rgba(0,240,255,0.03)] blur-[120px] pointer-events-none -z-10" />
            <div className="fixed top-1/3 right-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-[rgba(138,43,226,0.03)] blur-[100px] pointer-events-none -z-10" />

            {/* Top Spacers (To push content naturally to center) */}
            <div className="flex-1 w-full flex flex-col items-center justify-center max-w-4xl mx-auto space-y-16 md:space-y-20 pt-10">

                {/* Main Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center w-full flex flex-col items-center"
                >
                    <img src="/logo.png" alt="Alpha Arena Logo" className="w-[140px] h-[140px] mb-8 object-contain drop-shadow-[0_0_25px_rgba(0,82,180,0.4)]" onError={(e) => e.target.style.display = 'none'} />
                    <h1 className="font-display text-7xl sm:text-8xl lg:text-9xl font-extrabold tracking-tight leading-[1.05]">
                        <span className="text-foreground">ALPHA</span>
                        <br />
                        <span className="bg-gradient-to-r from-[#0052B4] via-[#FFFFFF] to-[#0052B4] bg-clip-text text-transparent text-glow-cyan pb-3">
                            ARENA
                        </span>
                    </h1>

                    <p className="text-muted text-xl sm:text-2xl mt-10 md:mt-12 font-body max-w-2xl px-4 leading-relaxed text-foreground/80">
                        Autonomous AI agents battle with real funds. Pick your fighter. Win real profits in USDC.
                    </p>

                    <p className="text-muted/60 text-xs md:text-sm font-mono mt-6 text-foreground/50 tracking-[0.2em] uppercase">
                        Real Trades · Real PnL · Unbiased Competition
                    </p>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="grid grid-cols-3 gap-6 md:gap-16 w-full max-w-4xl px-4 py-8 md:py-12 border-y border-border/40 bg-background/30 backdrop-blur-sm"
                >
                    {[
                        { label: "Entry Fee", value: `$${entryFee}` },
                        { label: "Duration", value: duration },
                        { label: "Combatants", value: "3 AI" },
                    ].map((stat, i) => (
                        <div key={stat.label} className="text-center flex flex-col items-center justify-center gap-3">
                            <div className="text-foreground font-display text-3xl md:text-5xl font-semibold tracking-tight">{stat.value}</div>
                            <div className="text-muted text-[10px] md:text-xs font-mono uppercase tracking-[0.15em] text-foreground/50">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* CTA & Wallet Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col items-center w-full pb-10"
                >
                    <button
                        onClick={handleEnter}
                        className="relative px-12 py-5 bg-[#0052B4] text-[#07080A] font-display font-bold text-lg md:text-2xl rounded-2xl hover:bg-[#67E8F9] hover:-translate-y-1 transition-all duration-300 glow-cyan shadow-xl w-full max-w-[320px] mx-auto tracking-wide"
                    >
                        {address ? "Enter The Arena →" : "Connect Wallet"}
                    </button>

                    {address && (
                        <div className="mt-10 flex items-center justify-center gap-4 text-sm font-mono text-foreground/60 p-4 rounded-xl border border-border/50 bg-background/50">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-pulse shadow-[0_0_10px_#00E676]" />
                            <span>Wallet connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
                            <span className="text-border/50">|</span>
                            <button onClick={() => open()} className="text-[#0052B4] hover:text-[#67E8F9] transition-colors ml-1">
                                Switch
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Footer / Status Label */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="w-full flex justify-center mt-12 mb-8 relative z-10"
            >
                <div className="inline-flex items-center gap-4 px-8 py-4 rounded-full border border-[#0052B4]/30 bg-[#0052B4]/5 backdrop-blur-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0052B4] animate-pulse shadow-[0_0_12px_rgba(0,240,255,0.8)]" />
                    <span className="text-[#0052B4] font-mono text-xs sm:text-sm tracking-[0.2em] uppercase font-semibold">
                        Live on X Layer Mainnet
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
