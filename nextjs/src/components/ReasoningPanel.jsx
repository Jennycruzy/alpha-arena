"use client";

import { motion, AnimatePresence } from "framer-motion";

const AGENT_COLORS = {
    "whale-follower": { color: "#0066FF", icon: "WF" },
    "momentum-trader": { color: "#FF4500", icon: "MT" },
    "risk-guard": { color: "#00E676", icon: "RG" },
};

function ReasoningEntry({ entry, index }) {
    const meta = AGENT_COLORS[entry.agentId] || { color: "#0066FF", icon: "WF" };
    const conf = entry.confidence ?? 0;
    const ts = new Date(entry.timestamp || Date.now()).toLocaleTimeString("en", { hour12: false });

    // 🧬 Render Evolution Events (Level Up / Wisdom)
    if (entry.type === "level_up" || entry.type === "wisdom_gained") {
        const isLevelUp = entry.type === "level_up";
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`mb-8 p-8 border-2 ${isLevelUp ? "border-primary bg-primary/5 shadow-[0_0_30px_rgba(0,102,255,0.1)]" : "border-white/10 bg-white/5"}`}
            >
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isLevelUp ? "bg-primary animate-ping" : "bg-white/40"}`} />
                        <span className={`font-display font-black text-xs tracking-[0.2em] uppercase ${isLevelUp ? "text-primary" : "text-white"}`}>
                            {isLevelUp ? `AGENT_LEVEL_${entry.level}_UP` : "STRATEGY_WISDOM_GAINED"}
                        </span>
                    </div>
                    <span className="font-mono text-[9px] text-muted opacity-50">{ts}</span>
                </div>

                <div className="relative mb-6">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/30" />
                    <p className="font-mono text-xs leading-relaxed text-white uppercase tracking-wider pl-6 italic">
                        "{entry.lesson || entry.latestWisdom}"
                    </p>
                </div>

                <div className="flex justify-between items-center bg-black/60 p-4 border border-white/5">
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-xs text-success font-bold tracking-widest">+ {entry.xpGained || 50} EXPERIENCE</span>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="font-mono text-xs text-primary">LVL {entry.level || "?"}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted uppercase tracking-tighter">AGENT: {entry.agentName || entry.agentId}</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8 p-6 bg-surface border border-border transition-all hover:bg-white/5 group"
        >
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 border border-border bg-black flex items-center justify-center font-mono font-bold text-[10px] group-hover:border-primary/50 transition-colors" style={{ color: meta.color }}>
                        {meta.icon}
                    </div>
                    <span className="font-display font-bold text-xs tracking-widest uppercase" style={{ color: meta.color }}>
                        {entry.agentName || entry.agentId}
                    </span>
                    {entry.isPrivate && (
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-primary/10 border border-primary/20">
                            <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                            <span className="font-mono text-[8px] text-primary tracking-widest">ENCRYPTED</span>
                        </div>
                    )}
                </div>
                <span className="font-mono text-[9px] text-muted opacity-40">{ts}</span>
            </div>

            {entry.reason ? (
                <p className="font-mono text-[10px] text-muted leading-relaxed mb-6 pl-5 border-l border-white/5 group-hover:text-white/80 transition-colors">
                    {entry.reason}
                </p>
            ) : entry.isPrivate ? (
                <div className="mb-6 pl-5 border-l border-primary/20">
                    <div className="font-mono text-[9px] text-primary/40 uppercase tracking-[0.3em] italic mb-2">
                        [REASONING_PAYLOAD_ENCRYPTED]
                    </div>
                    <div className="w-32 h-0.5 bg-primary/10 relative overflow-hidden">
                        <motion.div
                            className="absolute top-0 bottom-0 left-0 bg-primary/40"
                            initial={{ x: -128 }} animate={{ x: 128 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            style={{ width: "40%" }}
                        />
                    </div>
                </div>
            ) : null}

            <div className="flex items-center gap-8 bg-black/40 p-4 border border-white/5">
                {entry.action && (
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-[8px] text-muted uppercase tracking-widest">Execution</span>
                        <span className="font-mono font-bold text-[10px] tracking-widest uppercase text-white">{entry.action}</span>
                    </div>
                )}
                {entry.token && (
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-[8px] text-muted uppercase tracking-widest">Ticker</span>
                        <span className="font-mono text-[10px] text-white tracking-widest font-black">{entry.token}</span>
                    </div>
                )}
                {conf > 0 && (
                    <div className="flex flex-col gap-1 flex-1 max-w-[140px] ml-auto">
                        <div className="flex justify-between items-center text-[8px] font-mono tracking-widest mb-1">
                            <span className="text-muted/60 uppercase">Strategy_Confidence</span>
                            <span className="text-primary font-black">{(conf * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 border border-white/10 overflow-hidden">
                            <motion.div className="h-full bg-primary shadow-[0_0_5px_rgba(0,102,255,0.5)]" initial={{ width: 0 }} animate={{ width: `${conf * 100}%` }} transition={{ duration: 1 }} />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function ReasoningPanel({ log = [], isPrivate = false, className = "" }) {
    return (
        <div className={`h-full flex flex-col ${className}`}>
            {log.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center border border-white/5 bg-black/20 p-10">
                    {isPrivate ? (
                        <div className="text-center flex flex-col items-center">
                            <div className="w-12 h-12 border border-primary/20 bg-primary/5 flex items-center justify-center mb-6">
                                <span className="text-primary text-2xl animate-pulse">🔒</span>
                            </div>
                            <div className="font-display font-black text-sm text-primary uppercase tracking-[0.2em] mb-2">STRATEGY_SHIELD_ACTIVE</div>
                            <p className="font-mono text-xs text-muted/40 uppercase tracking-[0.3em] font-bold">Strategy isolated via Venice Protocol</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-8 opacity-40">
                            <div className="w-16 h-[1px] bg-primary relative overflow-hidden">
                                <motion.div className="absolute top-0 bottom-0 left-0 bg-white"
                                    initial={{ x: -64 }} animate={{ x: 64 }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: "40%" }} />
                            </div>
                            <p className="font-mono text-[9px] uppercase tracking-[0.5em] text-primary animate-pulse">Synchronizing_Streams...</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto w-full custom-scrollbar pr-4">
                    <AnimatePresence initial={false}>
                        {log.map((entry, i) => (
                            <ReasoningEntry key={`${entry.agentId}-${entry.timestamp}-${i}`} entry={entry} index={i} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
