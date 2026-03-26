"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useArena } from "@/context/ArenaContext";
import CopyWinner from "./CopyWinner";

const AGENT_META = {
    "whale-follower": { name: "Whale Follower", icon: "WF", color: "#0052B4" },
    "momentum-trader": { name: "Momentum Trader", icon: "MT", color: "#F97316" },
    "risk-guard": { name: "Risk Guard", icon: "RG", color: "#22C55E" },
};

function Confetti() {
    const [particles] = useState(() => [...Array(52)].map((_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 0.8,
        color: ["#0052B4", "#FFD700", "#FF3B5C", "#00E676", "#A855F7", "#F97316"][i % 6],
        size: 4 + Math.random() * 6, duration: 1.2 + Math.random() * 1.5,
    })));
    return (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }}>
            {particles.map((p) => (
                <motion.div key={p.id}
                    initial={{ x: `${p.x}vw`, y: "-10vh", opacity: 1, rotate: 0 }}
                    animate={{ y: "110vh", opacity: [1, 1, 0], rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
                    transition={{ delay: p.delay, duration: p.duration, ease: "easeIn" }}
                    style={{ position: "absolute", width: p.size, height: p.size, borderRadius: 2, background: p.color }} />
            ))}
        </div>
    );
}

export default function Results() {
    const { results, selectedAgent, resetArena, config, isPrivateArena } = useArena();
    const { address } = useAccount();
    const [showConfetti, setShowConfetti] = useState(false);
    const explorerUrl = config?.explorerUrl || "https://www.okx.com/explorer/xlayer";

    const winner = results?.winner;
    const standings = results?.standings || [];
    const payouts = results?.payouts || [];
    const myPayout = payouts.find((p) => p.userId?.toLowerCase() === address?.toLowerCase());
    const isWinner = myPayout?.isWinner;

    useEffect(() => {
        if (isWinner) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3500); }
    }, [isWinner]);

    if (!results) return (
        <div className="min-h-screen flex items-center justify-center" style={{ color: "#5A6178", fontFamily: "JetBrains Mono, monospace" }}>
            Loading results...
        </div>
    );

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center px-4 py-14 relative">
            <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.05) 0%, transparent 60%)" }} />

            <div className="z-10 w-full" style={{ maxWidth: 720 }}>

                {/* Winner Banner */}
                <motion.div className="glass-card text-center mb-6 p-8 winner-pop glow-gold"
                    style={{ border: "1px solid rgba(255,215,0,0.3)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: 8 }}>🏆</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#FFD700", letterSpacing: "0.15em", marginBottom: 8 }}>
                        COMPETITION ENDED
                    </div>
                    <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "2.2rem", color: "#FFD700" }}
                        className="text-glow-gold">
                        {AGENT_META[winner?.agentId]?.icon} {winner?.name} Wins!
                    </h2>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", color: winner?.roi >= 0 ? "#00E676" : "#FF3B5C", fontSize: "1.2rem", fontWeight: 700 }}>
                        {winner?.roi >= 0 ? "+" : ""}{winner?.roi?.toFixed(2)}% ROI
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#5A6178", marginTop: 4 }}>
                        Final: ${winner?.finalBalance?.toFixed(4)} USDC
                        {winner?.isPrivate && " · 🔒 Private Arena"}
                    </div>
                </motion.div>

                {/* 2-column: results + copy winner */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16, alignItems: "start" }}>

                    {/* My result */}
                    {myPayout && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="glass-card p-6"
                            style={{ border: `1px solid ${myPayout.profit >= 0 ? "rgba(0,230,118,0.3)" : "rgba(255,59,92,0.3)"}` }}>
                            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#5A6178", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Your Result
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{
                                        fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "1.4rem",
                                        color: myPayout.profit >= 0 ? "#00E676" : "#FF3B5C"
                                    }}>
                                        ${myPayout.payout.toFixed(4)}
                                    </div>
                                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#5A6178" }}>
                                        Entry: ${myPayout.entryFee.toFixed(2)} · {myPayout.profit >= 0 ? "+" : ""}{myPayout.profit.toFixed(4)}
                                    </div>
                                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(90,97,120,0.6)", marginTop: 4 }}>
                                        {AGENT_META[myPayout.agentId]?.icon} {myPayout.agentName}
                                    </div>
                                </div>
                                <div style={{ fontSize: "2.5rem" }}>{myPayout.isWinner ? "🏆" : "💀"}</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Copy Winner */}
                    {winner && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                            <CopyWinner winner={winner} isPrivate={isPrivateArena} />
                        </motion.div>
                    )}
                </div>

                {/* Final Standings */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                    className="glass-card p-5 mb-5">
                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 12 }}>
                        Final Standings
                    </div>
                    {standings.map((agent, i) => {
                        const meta = AGENT_META[agent.agentId];
                        return (
                            <div key={agent.agentId} style={{
                                display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
                                borderBottom: i < standings.length - 1 ? "1px solid rgba(26,30,42,0.5)" : "none"
                            }}>
                                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: "1.1rem", color: i === 0 ? "#FFD700" : i === 1 ? "#E2E8F0" : "#CD7F32", width: 36 }}>{i === 0 ? "1ST" : i === 1 ? "2ND" : "3RD"}</span>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: meta?.color, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.8rem" }}>{meta?.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: meta?.color || "#0052B4", fontSize: "0.9rem" }}>{meta?.name || agent.name}</div>
                                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#5A6178" }}>
                                        {agent.tradeCount} trades · ${agent.currentBalance?.toFixed(4)}
                                    </div>
                                </div>
                                <div style={{
                                    fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "0.9rem",
                                    color: agent.roi >= 0 ? "#00E676" : "#FF3B5C"
                                }}>
                                    {agent.roi >= 0 ? "+" : ""}{agent.roi?.toFixed(2)}%
                                </div>
                            </div>
                        );
                    })}
                </motion.div>

                {/* Payout Distribution */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                    className="glass-card p-5 mb-6">
                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 12 }}>
                        On-Chain Payout Distribution
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#5A6178" }}>Total Pool</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#E8EAF0" }}>${results.totalPool?.toFixed(2)} USDC</span>
                    </div>
                    {payouts.map((p) => (
                        <div key={p.userId} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(26,30,42,0.3)" }}>
                            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#5A6178", display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: AGENT_META[p.agentId]?.color }}>
                                    {AGENT_META[p.agentId]?.icon}
                                </div>
                                {p.userId?.slice(0, 6)}...{p.userId?.slice(-4)}
                            </span>
                            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: p.profit >= 0 ? "#00E676" : "#FF3B5C", fontWeight: 600 }}>
                                ${p.payout.toFixed(4)}
                            </span>
                        </div>
                    ))}
                    <div style={{ marginTop: 10, fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(90,97,120,0.5)" }}>
                        Distributed via ArenaVault.distributePayout() · gas: OKB
                    </div>
                    {!config?.demoMode && (
                        <a href={`${explorerUrl}/address/${config?.vaultAddress}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: "block", marginTop: 5, fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#0052B4" }}>
                            View ArenaVault ↗
                        </a>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-center">
                    <button onClick={resetArena}
                        style={{
                            padding: "12px 36px", borderRadius: 12, background: "#0052B4", color: "#FFFFFF",
                            fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "0.95rem", border: "none", cursor: "pointer"
                        }}
                        className="glow-accent">
                        Enter New Arena →
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
