"use client";

import { motion } from "framer-motion";
import { useArena } from "@/context/ArenaContext";

const AGENT_MAP = {
    "whale-follower": { name: "Whale Follower", icon: "🐋", color: "#3B82F6" },
    "momentum-trader": { name: "Momentum Trader", icon: "🚀", color: "#F97316" },
    "risk-guard": { name: "Risk Guard", icon: "🛡️", color: "#22C55E" },
};

export default function WaitingRoom() {
    const { selectedAgent, agentSelections, arenaId, demoMode } = useArena();
    const allAgentIds = ["whale-follower", "momentum-trader", "risk-guard"];
    const filled = allAgentIds.filter((id) => (agentSelections[id] || 0) > 0).length;

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center justify-center px-4 relative">
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.05) 0%, transparent 60%)" }} />

            {demoMode && <div className="demo-banner absolute top-6 right-6">⚡ DEMO MODE</div>}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center z-10 max-w-lg">

                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                    className="mx-auto mb-8" style={{
                        width: 64, height: 64, borderRadius: "50%",
                        border: "2px solid rgba(0,240,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: "50%", background: "rgba(0,240,255,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                        <div className="animate-pulse" style={{ width: 12, height: 12, borderRadius: "50%", background: "#00F0FF" }} />
                    </div>
                </motion.div>

                <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "2rem", color: "#E8EAF0", marginBottom: 8 }}>
                    Waiting for Fighters
                </h2>
                <p style={{ color: "#5A6178" }}>Arena starts when all 3 agents have at least 1 user</p>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", color: "#00F0FF", marginTop: 6, marginBottom: 32 }}>
                    {filled}/3 agents filled
                </p>

                {/* Progress bar */}
                <div style={{ height: 4, background: "rgba(26,30,42,0.8)", borderRadius: 2, marginBottom: 28, overflow: "hidden" }}>
                    <motion.div style={{ height: "100%", background: "linear-gradient(90deg, #00F0FF, #A855F7)", borderRadius: 2 }}
                        animate={{ width: `${(filled / 3) * 100}%` }} transition={{ duration: 0.4 }} />
                </div>

                {/* Agent slots */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                    {allAgentIds.map((id) => {
                        const meta = AGENT_MAP[id];
                        const count = agentSelections[id] || 0;
                        const isFilled = count > 0;
                        const isYours = id === selectedAgent;
                        return (
                            <motion.div key={id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                className="glass-card"
                                style={{
                                    padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                                    borderColor: isFilled ? "rgba(0,230,118,0.3)" : "rgba(26,30,42,0.5)",
                                    opacity: isFilled ? 1 : 0.5
                                }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span style={{ fontSize: "1.5rem" }}>{meta.icon}</span>
                                    <div>
                                        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: meta.color }}>
                                            {meta.name}
                                        </div>
                                        {isYours && <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#00F0FF" }}>YOUR PICK</div>}
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: "50%", background: isFilled ? "#00E676" : "#5A6178",
                                        animation: isFilled ? "none" : "pulse 2s infinite"
                                    }} />
                                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", color: isFilled ? "#00E676" : "#5A6178" }}>
                                        {isFilled ? `${count} user${count > 1 ? "s" : ""}` : "Waiting..."}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {arenaId && (
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "rgba(90,97,120,0.5)" }}>
                        Arena: {arenaId.slice(0, 8)}...{arenaId.slice(-4)}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
