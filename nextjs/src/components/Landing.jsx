"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useArena } from "@/context/ArenaContext";
import Image from "next/image";

export default function Landing() {
    const { address } = useAccount();
    const { open } = useAppKit();
    const { setPhase, demoMode, config } = useArena();

    const entryFee = config?.entryFeeUsd ?? 0.5;
    const duration = config ? `${Math.floor(config.durationSeconds / 60)} min` : "10 min";

    const handleEnter = async () => {
        if (!address) {
            open(); // Open WalletConnect modal
            return;
        }
        setPhase("select");
    };

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden px-4">
            {/* Glow orbs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,82,180,0.1) 0%, transparent 70%)" }} />
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)" }} />

            {demoMode && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute top-6 right-6 demo-banner">
                    ⚡ DEMO MODE
                </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center z-10 max-w-2xl flex flex-col items-center">

                {/* Logo & Status */}
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }} className="mb-4 flex flex-col items-center">

                    {/* Brand Logo */}
                    <div className="mb-6 relative w-48 h-48 sm:w-64 sm:h-64">
                        <Image
                            src="/logo.png"
                            alt="Alpha Arena Logo"
                            fill
                            priority
                            className="object-contain drop-shadow-[0_0_30px_rgba(0,82,180,0.3)]"
                        />
                    </div>

                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-8"
                        style={{ border: "1px solid rgba(0,82,180,0.3)", background: "rgba(0,82,180,0.08)" }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#0052B4" }} />
                        <span className="text-xs tracking-widest uppercase" style={{ color: "#E8EAF0", fontFamily: "JetBrains Mono, monospace" }}>
                            Live on X Layer Mainnet
                        </span>
                    </div>
                </motion.div>

                <p className="text-lg sm:text-xl mb-2" style={{ color: "#E8EAF0", fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}>
                    AI agents battle with real funds. Pick your fighter. Win real profits.
                </p>
                <p className="text-sm mb-10" style={{ color: "rgba(100,116,139,0.8)", fontFamily: "JetBrains Mono, monospace" }}>
                    Real Trades · Real PnL · Autonomous Competition · Gas: OKB
                </p>

                {/* Stats */}
                <div className="flex justify-center gap-10 mb-12">
                    {[
                        { label: "Entry Fee", value: `$${entryFee} USDC` },
                        { label: "Competition", value: duration },
                        { label: "Agents", value: "3" },
                    ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                            className="text-center">
                            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: "#0052B4", fontSize: "1.25rem" }}>
                                {s.value}
                            </div>
                            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>
                                {s.label}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* CTA */}
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleEnter}
                    className="px-12 py-4 rounded-xl font-bold text-lg transition-all glow-accent"
                    style={{
                        background: address ? "#0052B4" : "linear-gradient(135deg, #0052B4, #7C3AED)",
                        color: "#FFFFFF", fontFamily: "Space Grotesk, sans-serif",
                    }}>
                    {address ? "Enter Arena →" : "Connect Wallet & Enter"}
                </motion.button>

                {address && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mt-6 flex items-center justify-center gap-3 p-3 rounded-lg bg-surface/50 border border-slate-800">
                        <div className="w-2 h-2 rounded-full" style={{ background: "#00E676" }} />
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#64748B" }}>
                            {address.slice(0, 6)}...{address.slice(-4)} · X Layer Connected
                        </span>
                        <button onClick={() => open()} style={{ color: "#0052B4", fontSize: "0.75rem", fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
                            [CHANGE]
                        </button>
                    </motion.div>
                )}
            </motion.div>

            <div className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(0,82,180,0.3), transparent)" }} />
        </div>
    );
}
