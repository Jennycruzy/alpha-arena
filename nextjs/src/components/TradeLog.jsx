"use client";

import { motion, AnimatePresence } from "framer-motion";

const AGENT_COLORS = {
    "whale-follower": { color: "#0066FF", icon: "WF" },
    "momentum-trader": { color: "#FF4500", icon: "MT" },
    "risk-guard": { color: "#00E676", icon: "RG" },
};

function truncateTx(hash) {
    if (!hash || hash.startsWith("0xdemo")) return "demo";
    return hash.slice(0, 8) + "..." + hash.slice(-4);
}

function actionBadge(action) {
    const map = {
        BUY: { color: "text-success", border: "border-success/30" },
        SELL: { color: "text-error", border: "border-error/30" },
        HOLD: { color: "text-muted", border: "border-muted/30" }
    };
    const s = map[action?.toUpperCase()] || map.HOLD;
    return (
        <span className={`px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest border ${s.color} ${s.border}`}>
            {action}
        </span>
    );
}

export default function TradeLog({ trades = [], explorerUrl }) {
    if (!trades.length) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-10 opacity-30">
                <div className="w-1 h-10 bg-primary animate-pulse" />
                <p className="terminal-text mt-4">AWAITING_INPUT</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <AnimatePresence initial={false}>
                {trades.map((t, i) => {
                    const meta = AGENT_COLORS[t.agentId] || { color: "#0066FF", icon: "AI" };
                    const txLink = t.txHash && !t.txHash.startsWith("0xdemo")
                        ? `${explorerUrl || "https://www.okx.com/explorer/xlayer"}/tx/${t.txHash}` : null;
                    return (
                        <motion.div key={`${t.txHash}-${i}`}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                            className="flex items-start gap-6 py-6 border-b border-white/5 transition-colors hover:bg-white/[0.02]">

                            <div className="w-10 h-10 flex items-center justify-center font-mono font-bold text-xs border border-border bg-black shrink-0" style={{ color: meta.color }}>
                                {meta.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-display text-sm font-bold uppercase tracking-wider text-white">
                                        {t.agentName || t.agentId}
                                    </span>
                                    {actionBadge(t.action || "—")}
                                    {t.token && <span className="font-mono text-xs text-muted tracking-widest font-bold">{t.token}</span>}
                                </div>
                                {t.reason && (
                                    <div className="font-mono text-xs text-muted/60 leading-relaxed uppercase tracking-wider font-bold">
                                        {t.reason}
                                    </div>
                                )}
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-2">
                                <div className="font-mono text-sm text-white font-bold opacity-80">$2,410.20</div>
                                {txLink ? (
                                    <a href={txLink} target="_blank" rel="noopener noreferrer"
                                        className="terminal-text text-primary hover:text-white transition-colors border-b border-primary/30 pb-0.5">
                                        TX:{truncateTx(t.txHash)} ↗
                                    </a>
                                ) : (
                                    <span className="terminal-text text-muted/30">SIMULATED</span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
