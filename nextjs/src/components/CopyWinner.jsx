"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useArena } from "@/context/ArenaContext";
import { api } from "@/utils/api";

const AGENT_META_MAP = {
    "whale-follower": { name: "Whale Follower", icon: "🐋", color: "#3B82F6" },
    "momentum-trader": { name: "Momentum Trader", icon: "🚀", color: "#F97316" },
    "risk-guard": { name: "Risk Guard", icon: "🛡️", color: "#22C55E" },
};

/**
 * CopyWinner — post-arena popup to clone winning agent strategy.
 * Appears on Results screen when winner is determined.
 */
export default function CopyWinner({ winner, isPrivate = false }) {
    const { address } = useAccount();
    const { setCopyTradeSession, config } = useArena();
    const [capital, setCapital] = useState(config?.entryFeeUsd ?? 0.5);
    const [isLoading, setIsLoading] = useState(false);
    const [started, setStarted] = useState(false);
    const [error, setError] = useState(null);
    const [show, setShow] = useState(true);

    const meta = AGENT_META_MAP[winner?.agentId] || { name: winner?.name || "Unknown", icon: "🤖", color: "#00F0FF" };
    const minCapital = config?.entryFeeUsd ?? 0.5;

    const handleCopy = async () => {
        if (!address || !winner?.agentId) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.startCopyTrade(address, winner.agentId, capital, isPrivate);
            setCopyTradeSession(result);
            setStarted(true);
        } catch (err) {
            setError(err.message || "Failed to start copy trade");
        } finally {
            setIsLoading(false);
        }
    };

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card overflow-hidden"
                style={{
                    border: `1px solid ${meta.color}44`,
                    boxShadow: `0 0 40px ${meta.color}18`,
                }}
            >
                {/* Top bar */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />

                <div style={{ padding: "20px 24px" }}>
                    {started ? (
                        // ──── Success state ────
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📋</div>
                            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: "#00E676", fontSize: "1.1rem", marginBottom: 4 }}>
                                Copy Trading Active!
                            </div>
                            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#5A6178", marginBottom: 12 }}>
                                {meta.icon} {meta.name} is now trading ${capital} on your behalf
                            </p>
                            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                                <div style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)" }}>
                                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#00E676" }}>
                                        AUTO-TRADING · {isPrivate ? "🔒 PRIVATE" : "👁 PUBLIC"}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        // ──── Setup state ────
                        <>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <span style={{ fontSize: "2rem" }}>{meta.icon}</span>
                                <div>
                                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: "#E8EAF0", fontSize: "1rem" }}>
                                        Copy Winning Agent
                                    </div>
                                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: meta.color }}>
                                        {meta.name} · ROI: {winner?.roi >= 0 ? "+" : ""}{winner?.roi?.toFixed(2)}%
                                    </div>
                                </div>
                                <button onClick={() => setShow(false)} style={{ marginLeft: "auto", color: "#5A6178", fontSize: "1.1rem", background: "none", border: "none", cursor: "pointer" }}>
                                    ✕
                                </button>
                            </div>

                            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "0.825rem", color: "#5A6178", marginBottom: 16, lineHeight: 1.5 }}>
                                Clone this winning strategy and let it trade autonomously with your capital.
                                Uses the same AI logic outside the competition arena.
                            </p>

                            {/* Capital input */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#5A6178", display: "block", marginBottom: 6 }}>
                                    ALLOCATE CAPITAL (USDC)
                                </label>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input
                                        type="number"
                                        value={capital}
                                        min={minCapital}
                                        step={0.5}
                                        onChange={(e) => setCapital(Math.max(minCapital, parseFloat(e.target.value) || minCapital))}
                                        style={{
                                            flex: 1, padding: "9px 12px",
                                            background: "rgba(13,15,20,0.8)", border: "1px solid rgba(26,30,42,0.8)",
                                            borderRadius: 8, color: "#E8EAF0",
                                            fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem",
                                            outline: "none",
                                        }}
                                    />
                                    {["1", "5", "10"].map((v) => (
                                        <button key={v} onClick={() => setCapital(parseFloat(v))}
                                            style={{
                                                padding: "6px 10px", borderRadius: 6, cursor: "pointer",
                                                background: capital === parseFloat(v) ? "rgba(0,240,255,0.1)" : "rgba(26,30,42,0.5)",
                                                border: `1px solid ${capital === parseFloat(v) ? "rgba(0,240,255,0.3)" : "rgba(26,30,42,0.5)"}`,
                                                color: capital === parseFloat(v) ? "#00F0FF" : "#5A6178",
                                                fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem",
                                            }}>
                                            ${v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mode indicator */}
                            <div style={{
                                marginBottom: 16, padding: "8px 12px", borderRadius: 8,
                                background: isPrivate ? "rgba(168,85,247,0.06)" : "rgba(0,240,255,0.04)",
                                border: `1px solid ${isPrivate ? "rgba(168,85,247,0.2)" : "rgba(0,240,255,0.15)"}`,
                                display: "flex", alignItems: "center", gap: 8,
                            }}>
                                <span style={{ fontSize: "0.9rem" }}>{isPrivate ? "🔒" : "👁️"}</span>
                                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: isPrivate ? "#A855F7" : "#00F0FF" }}>
                                    {isPrivate ? "PRIVATE — strategy hidden via Venice AI" : "TRANSPARENT — reasoning visible to all"}
                                </div>
                            </div>

                            {error && (
                                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#FF3B5C", marginBottom: 12 }}>{error}</p>
                            )}

                            <button
                                onClick={handleCopy}
                                disabled={isLoading || !address}
                                className="w-full"
                                style={{
                                    width: "100%", padding: "12px", borderRadius: 10,
                                    background: isLoading ? "rgba(0,240,255,0.1)" : `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
                                    border: "none", cursor: isLoading ? "default" : "pointer",
                                    color: "#07080A", fontFamily: "Space Grotesk, sans-serif",
                                    fontWeight: 700, fontSize: "0.95rem",
                                    opacity: !address ? 0.5 : 1,
                                    transition: "all 0.2s",
                                }}
                            >
                                {isLoading ? "Starting..." : `📋 Copy ${meta.name}`}
                            </button>
                            {!address && (
                                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#5A6178", textAlign: "center", marginTop: 6 }}>
                                    Connect wallet to copy trade
                                </p>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
