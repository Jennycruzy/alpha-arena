"use client";

import { motion, AnimatePresence } from "framer-motion";

const AGENT_COLORS = {
    "whale-follower": { color: "#0052B4", icon: "WF" },
    "momentum-trader": { color: "#FFB000", icon: "MT" },
    "risk-guard": { color: "#00E676", icon: "RG" },
};

function ReasoningEntry({ entry, index }) {
    const meta = AGENT_COLORS[entry.agentId] || { color: "#0066FF", icon: "🤖" };
    const actionColors = { BUY: "#00E676", SELL: "#FF3B5C", HOLD: "#5A6178", EVOLVE: "#FACC15" };
    const conf = entry.confidence ?? 0;
    const ts = new Date(entry.timestamp).toLocaleTimeString("en", { hour12: false });

    // 🧬 Render Evolution Events
    if (entry.type === "level_up" || entry.type === "wisdom_gained") {
        const isLevelUp = entry.type === "level_up";
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    border: `1px solid ${isLevelUp ? "#FACC15" : meta.color}55`,
                    margin: "0 0 10px 0",
                    padding: "10px 14px",
                    background: `linear-gradient(90deg, ${isLevelUp ? "rgba(250,204,21,0.1)" : `${meta.color}15`}, transparent)`,
                    borderRadius: 8,
                    boxShadow: isLevelUp ? "0 0 15px rgba(250,204,21,0.15)" : "none"
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1rem" }}>{isLevelUp ? "🎉" : "🧠"}</span>
                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: isLevelUp ? "#FACC15" : meta.color, fontSize: "0.85rem", textTransform: "uppercase" }}>
                            {isLevelUp ? `LEVEL UP! Now Lv.${entry.level}` : "Wisdom Gained"}
                        </span>
                    </div>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#5A6178" }}>{ts}</span>
                </div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "0.8rem", color: "#E8EAF0", fontStyle: "italic", marginBottom: 8 }}>
                    "{entry.lesson}"
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "0.6rem", color: "#00E676" }}>+{entry.xpGained} XP</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#64748B" }}>AGENT: {entry.agentName || entry.agentId}</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -16, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{
                borderLeft: `3px solid ${meta.color}`,
                margin: "0 0 8px 0",
                padding: "10px 14px",
                background: `linear-gradient(90deg, ${meta.color}0a, transparent)`,
                borderRadius: "0 8px 8px 0",
            }}
        >
            {/* Agent + timestamp row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.85rem" }}>{meta.icon}</span>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: meta.color, fontSize: "0.8rem" }}>
                        {entry.agentName || entry.agentId}
                    </span>
                    {entry.isPrivate && (
                        <span style={{
                            fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "#A855F7",
                            background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)",
                            padding: "1px 5px", borderRadius: 3, letterSpacing: "0.05em"
                        }}>🔒 PRIVATE</span>
                    )}
                </div>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#5A6178" }}>{ts}</span>
            </div>

            {/* Reason (only if public mode) */}
            {entry.reason ? (
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "0.78rem", color: "#C4C8D8", lineHeight: 1.45, marginBottom: 8 }}>
                    {entry.reason}
                </p>
            ) : entry.isPrivate ? (
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "rgba(168,85,247,0.5)", marginBottom: 8, fontStyle: "italic" }}>
                    [Reasoning hidden — private strategy via Venice]
                </p>
            ) : null}

            {/* Decision row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {entry.action && (
                    <span style={{
                        fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "0.7rem",
                        color: actionColors[entry.action] || "#0066FF",
                        background: `${actionColors[entry.action] || "#0066FF"}18`,
                        padding: "2px 8px", borderRadius: 4, border: `1px solid ${actionColors[entry.action] || "#0066FF"}33`
                    }}>{entry.action}</span>
                )}
                {entry.token && (
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#E8EAF0" }}>{entry.token}</span>
                )}
                {/* Confidence bar */}
                {conf > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#5A6178" }}>conf</span>
                        <div style={{ width: 48, height: 3, background: "rgba(26,30,42,0.8)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{
                                height: "100%", borderRadius: 2,
                                width: `${conf * 100}%`,
                                background: conf > 0.7 ? "#00E676" : conf > 0.4 ? "#FACC15" : "#FF3B5C",
                                transition: "width 0.3s",
                            }} />
                        </div>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#E8EAF0" }}>{(conf * 100).toFixed(0)}%</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function ReasoningPanel({ log = [], isPrivate = false, className = "" }) {
    return (
        <div className={`glass-card overflow-hidden flex flex-col ${className}`}
            style={{ height: 380 }}>

            {/* Header */}
            <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(26,30,42,0.6)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: isPrivate ? "#A855F7" : "#0066FF" }} />
                    <span style={{
                        fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem",
                        color: isPrivate ? "#A855F7" : "#0066FF",
                        textTransform: "uppercase", letterSpacing: "0.08em"
                    }}>
                        {isPrivate ? "🔒 Private Strategy" : "Agent Reasoning"}
                    </span>
                </div>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#5A6178" }}>
                    {log.length} entries
                </span>
            </div>

            {/* Log */}
            <div style={{ overflowY: "auto", flex: 1, padding: "10px 14px" }}>
                {log.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                        {isPrivate ? (
                            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid rgba(21,34,56,0.4)", borderRadius: 12, background: "rgba(10,13,20,0.4)" }}>
                                <div style={{ padding: 20, textAlign: "center" }}>
                                    <div className="text-2xl font-mono text-[#0052B4]/50 mb-4 font-bold tracking-widest">ENCRYPTED</div>
                                    <div style={{ color: "#E8EAF0", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: "1.1rem", marginBottom: 8 }}>
                                        Private Arena Mode
                                    </div>
                                    <div style={{ color: "#5A6178", fontSize: "0.8rem", maxWidth: 220 }}>
                                        Agent reasoning logs are encrypted and hidden from spectators.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#0066FF" }} />
                                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#5A6178" }}>
                                    Waiting for agent reasoning...
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {log.map((entry, i) => (
                            <ReasoningEntry key={`${entry.agentId}-${entry.timestamp}-${i}`} entry={entry} index={i} />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
