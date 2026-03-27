"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useArena } from "@/context/ArenaContext";
import { api } from "@/utils/api";

const AGENT_META_MAP = {
    "whale-follower": { name: "Whale Follower", icon: "WF", color: "#0066FF" },
    "momentum-trader": { name: "Momentum Trader", icon: "MT", color: "#FF4500" },
    "risk-guard": { name: "Risk Guard", icon: "RG", color: "#00E676" },
};

export default function CopyWinner({ winner, isPrivate = false }) {
    const { address } = useAccount();
    const { setCopyTradeSession, config, copyTradeLog } = useArena();
    const [capital, setCapital] = useState(config?.entryFeeUsd ?? 0.5);
    const [isLoading, setIsLoading] = useState(false);
    const [started, setStarted] = useState(false);
    const [error, setError] = useState(null);
    const [show, setShow] = useState(true);
    const logEndRef = useRef(null);

    const meta = AGENT_META_MAP[winner?.agentId] || { name: winner?.name || "Unknown", icon: "AI", color: "#0066FF" };
    const minCapital = config?.entryFeeUsd ?? 0.5;

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [copyTradeLog]);

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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-surface border border-border overflow-hidden relative shadow-2xl"
            >
                <div className="h-1 w-full bg-primary/20">
                    <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1 }} />
                </div>

                <div className="p-10">
                    {started ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
                            <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 border border-success bg-success/5 flex items-center justify-center font-mono font-bold text-lg text-success">
                                        ✓
                                    </div>
                                    <div>
                                        <h3 className="font-display font-black text-xl text-white uppercase tracking-tighter">Agent_Linked</h3>
                                        <div className="terminal-text text-success flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-success animate-pulse rounded-full" />
                                            Active_Cloning_Stream
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="terminal-text text-muted text-[9px] mb-1">Cap Allocation</div>
                                    <div className="font-mono text-lg font-bold text-white">${capital} USDC</div>
                                </div>
                            </div>

                            {/* Live Terminal Feed */}
                            <div className="bg-black border border-border p-4 h-48 overflow-y-auto mb-8 custom-scrollbar">
                                <div className="terminal-text text-muted mb-4 opacity-50 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-primary animate-pulse" />
                                    [INITIALIZING_TELEMETRY_FEED...]
                                </div>
                                {copyTradeLog.length === 0 ? (
                                    <div className="h-full flex items-center justify-center">
                                        <span className="terminal-text text-muted/30 italic">Awaiting Synchronized Signals...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {copyTradeLog.map((log, i) => (
                                            <div key={i} className="font-mono text-[9px] leading-relaxed border-l border-primary/20 pl-3">
                                                <div className="flex justify-between text-muted/60 mb-0.5">
                                                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    <span className="text-primary">{log.status === "decided" ? "STRAT_EXEC" : "TRADE_CONF"}</span>
                                                </div>
                                                <div className="text-white">
                                                    {log.status === "decided" ? (
                                                        <span className="text-primary font-bold">{log.action} {log.token} @ {log.confidence?.toFixed(2)}</span>
                                                    ) : (
                                                        <span>{log.action} {log.token}: ${log.amountUsdc?.toFixed(2)} | ROI: {log.roi?.toFixed(2)}%</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={logEndRef} />
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setShow(false)} className="w-full py-3 border border-border terminal-text text-muted hover:text-white transition-colors">
                                Dissolve Connection
                            </button>
                        </motion.div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 border border-border bg-black flex items-center justify-center font-mono font-bold text-xl" style={{ color: meta.color }}>
                                        {meta.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-display font-black text-xl text-white uppercase tracking-tighter">Clone Winning Signal</h4>
                                        <div className="terminal-text text-primary mt-1">{meta.name} · ROI: {winner?.roi?.toFixed(2)}%</div>
                                    </div>
                                </div>
                                <button onClick={() => setShow(false)} className="terminal-text text-muted hover:text-white transition-colors">Abort</button>
                            </div>

                            <p className="font-mono text-[10px] text-muted leading-loose uppercase tracking-widest mb-10 opacity-70">
                                Synchronize your capital with this winning strategy. This agent will execute high-frequency trades autonomously on your behalf.
                            </p>

                            <div className="space-y-8">
                                <div>
                                    <label className="terminal-text text-muted mb-3 block">Agent Allocation (USDC)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={capital}
                                            min={minCapital}
                                            step={0.5}
                                            onChange={(e) => setCapital(Math.max(minCapital, parseFloat(e.target.value) || minCapital))}
                                            className="flex-1 bg-black border border-border p-4 font-mono text-sm text-white focus:border-primary outline-none transition-colors"
                                        />
                                        <div className="flex gap-1">
                                            {["5", "10", "25"].map((v) => (
                                                <button key={v} onClick={() => setCapital(parseFloat(v))}
                                                    className={`px-4 py-4 font-mono text-[10px] border transition-all ${capital === parseFloat(v) ? "bg-primary text-black border-primary" : "border-border text-muted hover:border-white"}`}>
                                                    ${v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border border-border bg-black/40 flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${isPrivate ? "bg-primary animate-pulse" : "bg-white/20"}`} />
                                    <div className="terminal-text text-muted">
                                        {isPrivate ? "ENCRYPTED_STREAM_ACTIVE" : "TRANSPARENT_LIQUID_REASONING"}
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-error/10 border border-error/30 terminal-text text-error">
                                        ERR: {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleCopy}
                                    disabled={isLoading || !address}
                                    className="btn-primary w-full text-xs font-black tracking-[0.3em]">
                                    {isLoading ? "Synchronizing..." : `LINK ${meta.name} LOGIC`}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
