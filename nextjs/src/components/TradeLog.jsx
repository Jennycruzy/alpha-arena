"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useArena } from "@/context/ArenaContext";

const AGENT_COLORS = {
    "whale-follower": { color: "#0052B4", bg: "rgba(59,130,246,0.1)", icon: "WF" },
    "momentum-trader": { color: "#F97316", bg: "rgba(249,115,22,0.1)", icon: "MT" },
    "risk-guard": { color: "#22C55E", bg: "rgba(34,197,94,0.1)", icon: "RG" },
};

function truncateTx(hash) {
    if (!hash || hash.startsWith("0xdemo")) return "demo";
    return hash.slice(0, 8) + "..." + hash.slice(-4);
}

function actionBadge(action) {
    const map = { BUY: { bg: "rgba(0,230,118,0.12)", color: "#00E676" }, SELL: { bg: "rgba(255,59,92,0.12)", color: "#FF3B5C" }, HOLD: { bg: "rgba(90,97,120,0.12)", color: "#5A6178" } };
    const s = map[action?.toUpperCase()] || map.HOLD;
    return (
        <span style={{ ...s, padding: "2px 8px", borderRadius: 4, fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {action}
        </span>
    );
}

export default function TradeLog({ trades = [], explorerUrl }) {
    if (!trades.length) {
        return (
            <div className="glass-card p-4" style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#0052B4", margin: "0 auto 8px" }} />
                    <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#5A6178" }}>Waiting for first trade...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden" style={{ height: 260, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(26,30,42,0.6)", display: "flex", alignItems: "center", gap: 8 }}>
                <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#0052B4" }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#0052B4", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Live Trade Feed
                </span>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
                <AnimatePresence initial={false}>
                    {trades.map((t, i) => {
                        const meta = AGENT_COLORS[t.agentId] || { color: "#0052B4", bg: "rgba(0,240,255,0.05)", icon: "AI" };
                        const txLink = t.txHash && !t.txHash.startsWith("0xdemo")
                            ? `${explorerUrl || "https://www.okx.com/explorer/xlayer"}/tx/${t.txHash}` : null;
                        return (
                            <motion.div key={`${t.txHash}-${i}`}
                                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                                style={{
                                    display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                                    borderBottom: "1px solid rgba(26,30,42,0.3)", background: i === 0 ? meta.bg : "transparent",
                                    transition: "background 0.5s"
                                }}>
                                <span style={{ fontSize: "1rem" }}>{meta.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.75rem", color: meta.color, fontWeight: 600 }}>
                                            {t.agentName || t.agentId}
                                        </span>
                                        {actionBadge(t.action || "—")}
                                        {t.token && <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#5A6178" }}>{t.token}</span>}
                                    </div>
                                    {t.reason && (
                                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(90,97,120,0.6)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {t.reason}
                                        </div>
                                    )}
                                </div>
                                {txLink ? (
                                    <a href={txLink} target="_blank" rel="noopener noreferrer"
                                        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#0052B4", whiteSpace: "nowrap" }}>
                                        {truncateTx(t.txHash)} ↗
                                    </a>
                                ) : (
                                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(90,97,120,0.4)" }}>sim</span>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
