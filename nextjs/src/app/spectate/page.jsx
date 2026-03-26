"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/utils/api";
import ReasoningPanel from "@/components/ReasoningPanel";
import TradeLog from "@/components/TradeLog";

const AGENT_COLORS = {
    "whale-follower": { name: "Whale Follower", icon: "🐋", color: "#3B82F6" },
    "momentum-trader": { name: "Momentum Trader", icon: "🚀", color: "#F97316" },
    "risk-guard": { name: "Risk Guard", icon: "🛡️", color: "#22C55E" },
};

function WinProbBar({ prob, color }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, height: 5, background: "rgba(26,30,42,0.8)", borderRadius: 3, overflow: "hidden" }}>
                <motion.div animate={{ width: `${prob || 0}%` }} transition={{ duration: 0.7, ease: "easeOut" }}
                    style={{ height: "100%", background: color, borderRadius: 3 }} />
            </div>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color, width: 30, textAlign: "right" }}>
                {(prob || 0).toFixed(0)}%
            </span>
        </div>
    );
}

function LeaderboardCard({ agent, rank }) {
    const meta = AGENT_COLORS[agent.agentId] || { name: agent.name, icon: "🤖", color: "#0052B4" };
    const roi = agent.roi ?? 0;
    const isPos = roi >= 0;
    const history = agent.roiHistory || [];
    const max = Math.max(...history.map(Math.abs), 1);

    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden">
            <div style={{ height: 3, background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />
            <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.4rem" }}>{meta.icon}</span>
                        <div>
                            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: meta.color }}>{meta.name}</div>
                            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#5A6178" }}>
                                {agent.userCount || 0} users · {agent.tradeCount || 0} trades
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{
                            fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "1.1rem",
                            color: isPos ? "#00E676" : "#FF3B5C"
                        }}>
                            {isPos ? "+" : ""}{roi.toFixed(2)}%
                        </div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#5A6178" }}>
                            ${(agent.currentBalance || 0).toFixed(3)}
                        </div>
                    </div>
                </div>
                {/* ROI Sparkline */}
                {history.length > 0 && (
                    <div className="sparkline" style={{ marginBottom: 8 }}>
                        {history.slice(-20).map((v, i) => (
                            <div key={i} className="spark-bar" style={{
                                height: `${Math.max(2, Math.abs(v) / max * 100)}%`,
                                background: v >= 0 ? "#00E676" : "#FF3B5C",
                                opacity: 0.5 + i * 0.025
                            }} />
                        ))}
                    </div>
                )}
                {/* Win probability */}
                <div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "#5A6178", marginBottom: 3 }}>Win Prob</div>
                    <WinProbBar prob={agent.winProbability} color={meta.color} />
                </div>
            </div>
        </motion.div>
    );
}

function CountdownTimer({ remainingMs, totalMs = 600000 }) {
    const secs = Math.max(0, Math.floor(remainingMs / 1000));
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    const pct = Math.min(1, 1 - remainingMs / totalMs);
    const isLow = secs < 60;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
                fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "2.2rem",
                color: isLow ? "#FF3B5C" : "#0052B4", textShadow: `0 0 16px ${isLow ? "rgba(255,59,92,0.5)" : "rgba(0,240,255,0.4)"}`
            }}>
                {m}:{s}
            </div>
            <div style={{ width: 90, height: 3, background: "rgba(26,30,42,0.8)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div animate={{ scaleX: pct }} style={{ height: "100%", background: isLow ? "#FF3B5C" : "#0052B4", borderRadius: 2, originX: 0 }} />
            </div>
        </div>
    );
}

export default function SpectatePage() {
    const ws = useWebSocket();

    const [arenas, setArenas] = useState([]);
    const [selected, setSelected] = useState(null); // arenaId
    const [view, setView] = useState(null);
    const [reasoningLog, setReasoningLog] = useState([]);
    const [tradeLog, setTradeLog] = useState([]);
    const [remainingMs, setRemainingMs] = useState(0);

    // Load arena list
    const loadArenas = useCallback(async () => {
        try {
            const data = await api.getPublicArenas();
            setArenas(data.arenas || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadArenas(); const i = setInterval(loadArenas, 8000); return () => clearInterval(i); }, [loadArenas]);

    // Load selected arena view
    const loadView = useCallback(async (arenaId) => {
        if (!arenaId) return;
        try {
            const data = await api.spectate(arenaId);
            setView(data);
            setRemainingMs(data.remainingMs || 0);
            if (!data.isPrivate) {
                const reasoning = await api.spectateReasoning(arenaId);
                setReasoningLog(reasoning.log || []);
            } else {
                setReasoningLog([]);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (!selected) return;
        loadView(selected);
        const i = setInterval(() => loadView(selected), 5000);
        return () => clearInterval(i);
    }, [selected, loadView]);

    // Countdown
    useEffect(() => {
        if (!view || view.status !== "active" || remainingMs <= 0) return;
        const i = setInterval(() => setRemainingMs((p) => Math.max(0, p - 1000)), 1000);
        return () => clearInterval(i);
    }, [view, remainingMs]);

    // WebSocket for real-time when watching an arena
    useEffect(() => {
        const unsubs = [
            ws.on("leaderboard_update", (data) => {
                if (data.arenaId === selected) {
                    setView((v) => v ? { ...v, leaderboard: data.leaderboard } : v);
                    setRemainingMs(data.remainingMs ?? 0);
                }
            }),
            ws.on("trade_executed", (data) => {
                if (data.arenaId === selected) {
                    setTradeLog((p) => [data, ...p].slice(0, 40));
                }
            }),
            ws.on("agent_reasoning", (data) => {
                if (data.arenaId === selected && data.status === "decided") {
                    setReasoningLog((p) => [data, ...p].slice(0, 50));
                }
            }),
            ws.on("arena_ended", (data) => {
                if (data.arenaId === selected) loadView(selected);
            }),
        ];
        return () => unsubs.forEach((fn) => fn?.());
    }, [ws, selected, loadView]);

    const handleSelectArena = (arenaId) => {
        setSelected(arenaId);
        setTradeLog([]);
        setReasoningLog([]);
        setView(null);
    };

    return (
        <div className="min-h-screen grid-bg px-4 py-10 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(0,240,255,0.04) 0%, transparent 70%)" }} />
            <div className="noise-overlay" />

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "2.5rem", color: "#E8EAF0" }}>
                    👁 Spectate Mode
                </h1>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", color: "#5A6178", marginTop: 6 }}>
                    Watch live AI trading battles in real-time · No wallet required
                </p>
                {ws.connected ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E676" }} />
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#00E676" }}>Connected</span>
                    </div>
                ) : (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF3B5C" }} />
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#FF3B5C" }}>Reconnecting...</span>
                    </div>
                )}
            </div>

            {/* Arena picker */}
            <div style={{ maxWidth: 900, margin: "0 auto 24px auto" }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 10 }}>Live Arenas</div>
                {arenas.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", color: "#5A6178" }}>No active arenas — start one from the main app</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {arenas.map((a) => (
                            <button key={a.id} onClick={() => handleSelectArena(a.id)}
                                style={{
                                    padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                                    background: selected === a.id ? "rgba(0,240,255,0.1)" : "rgba(13,15,20,0.7)",
                                    border: `1px solid ${selected === a.id ? "rgba(0,240,255,0.4)" : "rgba(26,30,42,0.6)"}`,
                                    color: selected === a.id ? "#0052B4" : "#E8EAF0",
                                    fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem",
                                    display: "flex", alignItems: "center", gap: 8,
                                }}>
                                <div style={{
                                    width: 6, height: 6, borderRadius: "50%",
                                    background: a.status === "active" ? "#FF3B5C" : a.status === "waiting" ? "#FACC15" : "#5A6178",
                                    animation: a.status === "active" ? "pulse 1.5s infinite" : "none",
                                }} />
                                {a.id.slice(0, 8)} · {a.userCount || 0} users
                                {a.isPrivate && <span style={{ color: "#A855F7" }}>🔒</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Arena view */}
            {view && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    style={{ maxWidth: 900, margin: "0 auto" }}>

                    {/* Status header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {view.status === "active" && (
                                <>
                                    <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF3B5C" }} />
                                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#FF3B5C" }}>LIVE</span>
                                </>
                            )}
                            {view.status === "waiting" && (
                                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#FACC15" }}>⏳ FILLING</span>
                            )}
                            {view.status === "completed" && (
                                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#00E676" }}>✓ COMPLETED</span>
                            )}
                            {view.isPrivate && (
                                <span style={{
                                    fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#A855F7",
                                    background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)",
                                    padding: "2px 8px", borderRadius: 4
                                }}>🔒 PRIVATE ARENA</span>
                            )}
                        </div>
                        {view.status === "active" && <CountdownTimer remainingMs={remainingMs} />}
                    </div>

                    {/* Leaderboard */}
                    {view.leaderboard?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                            {view.leaderboard.map((agent, i) => (
                                <LeaderboardCard key={agent.agentId} agent={agent} rank={i} />
                            ))}
                        </div>
                    )}

                    {/* Arena waiting state */}
                    {view.status === "waiting" && (
                        <div className="glass-card p-8 text-center mb-5">
                            <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 6 }}>
                                Waiting for fighters...
                            </p>
                            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#5A6178" }}>
                                {view.userCount}/{3} slots filled ·{" "}
                                {Object.values(view.agentSelections || {}).filter(Boolean).length}/3 agents selected
                            </p>
                        </div>
                    )}

                    {/* Completed results */}
                    {view.status === "completed" && view.results && (
                        <div className="glass-card p-6 mb-5 glow-gold" style={{ border: "1px solid rgba(255,215,0,0.3)", textAlign: "center" }}>
                            <div style={{ fontSize: "2.5rem", marginBottom: 6 }}>🏆</div>
                            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: "#FFD700", fontSize: "1.5rem" }}>
                                {AGENT_COLORS[view.results.winner?.agentId]?.icon} {view.results.winner?.name} Won!
                            </div>
                            <div style={{ fontFamily: "JetBrains Mono, monospace", color: "#00E676", fontSize: "1.1rem", fontWeight: 700 }}>
                                +{view.results.winner?.roi?.toFixed(2)}% ROI
                            </div>
                        </div>
                    )}

                    {/* 2-col: trade feed + reasoning */}
                    {view.status === "active" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            <div>
                                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 8, fontSize: "0.85rem" }}>
                                    Trade Feed
                                </div>
                                <TradeLog trades={tradeLog} />
                            </div>
                            <div>
                                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 8, fontSize: "0.85rem" }}>
                                    {view.isPrivate ? "🔒 Private Strategy" : "Agent Reasoning"}
                                </div>
                                <ReasoningPanel log={reasoningLog} isPrivate={view.isPrivate} />
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
