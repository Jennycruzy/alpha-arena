"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/utils/api";
import ReasoningPanel from "@/components/ReasoningPanel";
import TradeLog from "@/components/TradeLog";
import Link from "next/link";

const AGENT_COLORS = {
    "whale-follower": { name: "Whale Follower", icon: "WF", color: "#0066FF" },
    "momentum-trader": { name: "Momentum Trader", icon: "MT", color: "#FF4500" },
    "risk-guard": { name: "Risk Guard", icon: "RG", color: "#00E676" },
};

function WinProbBar({ prob, color }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-[#0A0B0E] border border-border/50 overflow-hidden">
                <motion.div animate={{ width: `${prob || 0}%` }} transition={{ duration: 0.7, ease: "easeOut" }}
                    className="h-full" style={{ background: color }} />
            </div>
            <span className="font-mono text-[9px] w-8 text-right tracking-widest" style={{ color }}>
                {(prob || 0).toFixed(0)}%
            </span>
        </div>
    );
}

function LeaderboardCard({ agent, rank }) {
    const meta = AGENT_COLORS[agent.agentId] || { name: agent.name, icon: "AI", color: "#0066FF" };
    const roi = agent.roi ?? 0;
    const isPos = roi >= 0;
    const history = agent.roiHistory || [];
    const max = Math.max(...history.map(Math.abs), 1);

    return (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A0B0E]/80 backdrop-blur-md border border-border/50 p-4 transition-colors hover:border-border/80">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center font-mono font-bold text-[10px] border border-border/50 bg-[#0A0B0E]" style={{ color: meta.color }}>
                        {meta.icon}
                    </div>
                    <div>
                        <div className="font-display font-bold text-xs uppercase tracking-wider text-white">{meta.name}</div>
                        <div className="font-mono text-[9px] text-muted tracking-widest mt-1">
                            {agent.userCount || 0} USR · {agent.tradeCount || 0} TX
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-primary font-bold">LVL {agent.level || 1}</span>
                                <span className="text-white/20">|</span>
                                <span>{agent.xp || 0} XP</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`font-mono font-bold text-sm tracking-widest ${isPos ? "text-[#00E676]" : "text-[#FF3B5C]"}`}>
                        {isPos ? "+" : ""}{roi.toFixed(2)}%
                    </div>
                    <div className="font-mono text-[9px] text-muted tracking-widest mt-1">
                        POOL: ${(agent.pooledCapital || 0).toFixed(1)}
                    </div>
                </div>
            </div>

            {/* ROI Sparkline */}
            {history.length > 0 && (
                <div className="flex items-end h-4 gap-[1px] mb-3">
                    {history.slice(-30).map((v, i) => (
                        <div key={i} className="flex-1" style={{
                            height: `${Math.max(10, Math.abs(v) / max * 100)}%`,
                            background: v >= 0 ? "#00E676" : "#FF3B5C",
                            opacity: 0.3 + i * 0.02
                        }} />
                    ))}
                </div>
            )}

            {/* Win probability */}
            <div>
                <div className="font-mono text-[8px] text-muted uppercase tracking-widest mb-1">Win Probability Model</div>
                <WinProbBar prob={agent.winProbability} color={meta.color} />
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
        <div className="flex flex-col items-end gap-1 border border-border/50 bg-[#0A0B0E] px-4 py-2">
            <div className={`font-mono font-bold text-xl tracking-widest ${isLow ? "text-[#FF3B5C]" : "text-white"}`}>
                {m}:{s}
            </div>
            <div className="w-20 h-0.5 bg-border/50">
                <motion.div animate={{ scaleX: pct }} className={`h-full ${isLow ? "bg-[#FF3B5C]" : "bg-[#0066FF]"} origin-left`} />
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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none opacity-[0.02] bg-[#0066FF] blur-[80px]" />
            <div className="noise-overlay" />

            {/* Header */}
            <div className="max-w-4xl mx-auto mb-10 flex flex-col items-center">
                <Link href="/" className="self-start mb-6 flex items-center gap-2 group">
                    <div className="w-8 h-8 flex items-center justify-center border border-border/50 group-hover:bg-white group-hover:text-black transition-all">
                        <span className="text-sm">←</span>
                    </div>
                    <span className="terminal-text text-muted group-hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Back to Arena</span>
                </Link>
                <div className="text-center w-full pb-6 border-b border-border/50">
                    <h1 className="font-display font-black text-3xl md:text-5xl text-white uppercase tracking-tight">
                        GLOBAL TELEMETRY
                    </h1>
                    <p className="font-mono text-[10px] text-muted mt-3 uppercase tracking-[0.2em]">
                        Live Unbiased Spectate Stream · Read Only Access
                    </p>
                    <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 bg-[#0A0B0E] border border-border/50">
                        <div className={`w-1.5 h-1.5 ${ws.connected ? "bg-[#00E676] animate-pulse" : "bg-[#FF3B5C]"}`} />
                        <span className={`font-mono text-[9px] uppercase tracking-widest ${ws.connected ? "text-[#00E676]" : "text-[#FF3B5C]"}`}>
                            {ws.connected ? "System Online" : "Reconnection Pending..."}
                        </span>
                    </div>
                </div>
            </div>

            {/* Arena picker */}
            <div className="max-w-4xl mx-auto mb-10">
                <div className="font-mono text-[10px] text-white uppercase tracking-widest mb-4">Available Streams</div>
                {arenas.length === 0 ? (
                    <div className="p-8 text-center border border-border/50 bg-[#0A0B0E]/80 backdrop-blur-md">
                        <p className="font-mono text-[10px] text-muted tracking-widest uppercase">No Active Combat Zones Detected</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {arenas.map((a) => (
                            <button key={a.id} onClick={() => handleSelectArena(a.id)}
                                className={`px-4 py-2 border font-mono text-[10px] uppercase tracking-widest flex items-center gap-3 transition-colors duration-200
                                    ${selected === a.id ? "bg-[#0066FF]/10 border-[#0066FF]/50 text-[#0066FF]" : "bg-[#0A0B0E]/80 border-border/50 text-muted hover:border-border hover:text-white"}
                                `}>
                                <div className={`w-1.5 h-1.5 ${a.status === "active" ? "bg-[#FF3B5C] animate-pulse" : a.status === "waiting" ? "bg-[#FFB000]" : "bg-muted"}`} />
                                UID:{a.id.slice(0, 6)} <span className="opacity-50">|</span> {a.userCount || 0} CON
                                {a.isPrivate && <span className="text-[#0066FF]">🔒</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Arena view */}
            {view && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="max-w-6xl mx-auto">

                    {/* Status header */}
                    <div className="flex justify-between items-end mb-6 pb-4 border-b border-border/30">
                        <div className="flex items-center gap-4">
                            {view.status === "active" && (
                                <div className="flex items-center gap-2 bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 px-3 py-1">
                                    <div className="w-1.5 h-1.5 bg-[#FF3B5C] animate-pulse" />
                                    <span className="font-mono text-[10px] text-[#FF3B5C] tracking-widest uppercase">Live</span>
                                </div>
                            )}
                            {view.status === "waiting" && (
                                <span className="font-mono text-[10px] text-[#FFB000] border border-[#FFB000]/30 px-3 py-1 bg-[#FFB000]/10 tracking-widest uppercase">Awaiting Genesis</span>
                            )}
                            {view.status === "completed" && (
                                <span className="font-mono text-[10px] text-[#00E676] border border-[#00E676]/30 px-3 py-1 bg-[#00E676]/10 tracking-widest uppercase">Cycle Complete</span>
                            )}
                            {view.isPrivate && (
                                <span className="font-mono text-[10px] text-[#0066FF] px-3 py-1 bg-[#0066FF]/10 border border-[#0066FF]/30 tracking-widest uppercase">
                                    Encrypted Payload
                                </span>
                            )}
                        </div>
                        {view.status === "active" && <CountdownTimer remainingMs={remainingMs} />}
                    </div>

                    {/* Leaderboard */}
                    {view.leaderboard?.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            {view.leaderboard.map((agent, i) => (
                                <LeaderboardCard key={agent.agentId} agent={agent} rank={i} />
                            ))}
                        </div>
                    )}

                    {/* Arena waiting state */}
                    {view.status === "waiting" && (
                        <div className="p-8 text-center mb-8 border border-border/50 bg-[#0A0B0E]/80 backdrop-blur-md">
                            <p className="font-display font-medium text-white uppercase tracking-widest mb-2">
                                Synchronization Pending
                            </p>
                            <p className="font-mono text-[10px] text-muted tracking-widest uppercase">
                                {view.userCount}/3 Agents Joined ·{" "}
                                {Object.values(view.agentSelections || {}).filter(Boolean).length}/3 Protocols Finalized
                            </p>
                        </div>
                    )}

                    {/* Completed results */}
                    {view.status === "completed" && view.results && (
                        <div className="p-8 mb-8 border border-[#FFB000]/30 bg-[#FFB000]/5 text-center">
                            <div className="text-3xl mb-4">🏆</div>
                            <div className="font-display font-bold text-white text-2xl uppercase tracking-widest mb-1">
                                {AGENT_COLORS[view.results.winner?.agentId]?.icon} {view.results.winner?.name}
                            </div>
                            <div className="font-mono text-xl tracking-widest font-bold text-[#00E676]">
                                +{view.results.winner?.roi?.toFixed(2)}% ROI
                            </div>
                        </div>
                    )}

                    {/* 2-col: trade feed + reasoning */}
                    {view.status === "active" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pb-24 h-[600px]">
                            <div className="bg-[#0A0B0E]/80 border border-border/50 p-6 flex flex-col h-full">
                                <div className="font-mono text-[10px] text-white uppercase tracking-widest mb-6 border-b border-border/50 pb-4">
                                    Global Trade Ledger
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <TradeLog trades={tradeLog} />
                                </div>
                            </div>
                            <div className="bg-[#0A0B0E]/80 border border-border/50 p-6 flex flex-col h-full">
                                <div className="font-mono text-[10px] text-white uppercase tracking-widest mb-6 border-b border-border/50 pb-4">
                                    {view.isPrivate ? "Encrypted State Log" : "Strategy Reasoning Stream"}
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <ReasoningPanel log={reasoningLog} isPrivate={view.isPrivate} />
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
