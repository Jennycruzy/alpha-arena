"use client";

import { motion } from "framer-motion";
import { useArena } from "@/context/ArenaContext";
import TradeLog from "./TradeLog";
import ReasoningPanel from "./ReasoningPanel";

function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const AGENT_STYLES = {
    "whale-follower": { icon: "WF", accent: "#4499FF" },
    "momentum-trader": { icon: "MT", accent: "#FF4500" },
    "risk-guard": { icon: "RG", accent: "#00E676" },
};

function XPBar({ xp, xpToNextLevel }) {
    const total = xp + xpToNextLevel;
    const pct = total > 0 ? (xp / total) * 100 : 0;
    return (
        <div className="w-full h-1 bg-white/5 border border-white/10 overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                className="h-full bg-primary shadow-[0_0_5px_rgba(0,102,255,0.5)]"
            />
        </div>
    );
}

export default function LiveArena() {
    const { leaderboard, remainingMs, selectedAgent, tradeLog, reasoningLog, evolutionLog, isPrivateArena, config } = useArena();
    const explorerUrl = config?.explorerUrl;
    const durationSecs = config?.durationSeconds || 300;

    const progress = Math.max(0, 1 - remainingMs / (durationSecs * 1000));

    return (
        <div className="min-h-screen grid-bg flex flex-col px-10 py-10 relative bg-[#030406]">
            {/* Top Progress Bar */}
            <div className="fixed top-0 left-0 right-0 h-0.5 bg-black/40 z-50">
                <motion.div
                    className="h-full bg-primary shadow-[0_0_10px_rgba(0,102,255,0.5)]"
                    style={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            <div className="max-w-7xl mx-auto w-full pt-10 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-10">
                    <div>
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono font-bold tracking-[0.3em] uppercase text-sm border-l-2 border-primary pl-4">ALPHA ARENA</span>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-success animate-pulse rounded-full" />
                                <span className="terminal-text text-success font-bold text-xs uppercase tracking-widest">Battle Sequence Active</span>
                            </div>
                            <h1 className="font-display text-5xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
                                ARENA <span className="text-primary italic">SESSION.</span>
                            </h1>
                            <p className="font-mono text-xs text-muted uppercase tracking-[0.2em] mt-4 font-medium">
                                Live on X Layer Mainnet · Pool Ref: {config?.vaultAddress?.slice(0, 8)}... · Session ID: <span className="text-white select-all">{arenaId?.slice(0, 8)}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end">
                        <div className="terminal-text text-muted mb-2">Cycle Expiry</div>
                        <div className="font-mono text-5xl font-bold text-white tracking-tighter bg-surface border border-border px-6 py-2 shadow-xl">
                            {formatTime(remainingMs)}
                        </div>
                    </div>
                </div>

                {/* Leaderboard Table (Institutional Terminal Style) */}
                <div className="w-full mb-20 border border-border bg-surface/50 backdrop-blur-md overflow-hidden">
                    <div className="grid grid-cols-6 p-4 border-b border-border terminal-text text-muted font-bold bg-white/5">
                        <div className="col-span-1">RANKING</div>
                        <div className="col-span-1">AGENT</div>
                        <div className="col-span-1 text-center">EVOLUTION</div>
                        <div className="col-span-1 text-center">PnL_YIELD</div>
                        <div className="col-span-1 text-center">TOTAL_STAKE</div>
                        <div className="col-span-1 text-right">VICTORY_ODDS</div>
                    </div>

                    {leaderboard.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="font-mono text-primary text-[11px] animate-pulse tracking-widest uppercase mb-4 font-bold">Synchronizing Battle Streams...</div>
                            <div className="font-mono text-muted text-[10px] uppercase mb-8 opacity-60">Architecting first trade cycle — please standby</div>
                            <div className="w-full h-[1px] bg-border max-w-[200px] mx-auto overflow-hidden relative">
                                <motion.div className="absolute top-0 bottom-0 left-0 bg-primary" initial={{ x: -200 }} animate={{ x: 200 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} style={{ width: "50%" }} />
                            </div>
                        </div>
                    ) : leaderboard.map((agent, index) => {
                        const style = AGENT_STYLES[agent.agentId] || AGENT_STYLES["whale-follower"];
                        const isYours = agent.agentId === selectedAgent;
                        const roi = agent.roi ?? 0;
                        const roiPositive = roi >= 0;

                        return (
                            <motion.div
                                key={agent.agentId}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`grid grid-cols-6 p-10 border-b border-border transition-all items-center hover:bg-white/5
                                           ${isYours ? "bg-primary/5" : ""}`}
                            >
                                <div className="font-mono font-bold text-xl text-muted/50 flex items-center gap-4">
                                    <span className={index === 0 ? "text-primary" : ""}>0{index + 1}</span>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 border border-border bg-black flex items-center justify-center font-mono font-bold text-sm" style={{ color: style.accent }}>
                                        {style.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-display font-bold text-white uppercase tracking-wider text-sm">{agent.name}</h3>
                                        {isYours ? (
                                            <span className="terminal-text text-primary text-xs uppercase tracking-widest font-bold">Linked Agent</span>
                                        ) : (
                                            <span className="terminal-text text-muted text-xs opacity-40 uppercase tracking-widest font-bold">Rival Agent</span>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-mono text-[10px] text-white">Lv.{agent.level || 1}</span>
                                        <span className="font-mono text-[10px] text-muted font-bold">{agent.xp || 0} XP</span>
                                    </div>
                                    <XPBar xp={agent.xp || 0} xpToNextLevel={agent.xpToNextLevel || 50} />
                                </div>

                                <div className={`font-mono text-2xl font-bold tracking-tighter text-center ${roiPositive ? "text-success" : "text-error"}`}>
                                    {roiPositive ? "+" : ""}{roi.toFixed(2)}%
                                </div>

                                <div className="text-center font-mono">
                                    <div className="text-white font-bold text-lg leading-none">${(agent.currentBalance || 0).toFixed(2)}</div>
                                    <div className="text-muted text-xs mt-1 uppercase font-bold tracking-widest">POOL: ${(agent.pooledCapital || 0).toFixed(1)} USDC</div>
                                </div>

                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="terminal-text text-muted uppercase text-xs font-bold tracking-widest">Victory Odds</span>
                                        <span className="font-mono text-sm font-black text-primary">{(agent.winProbability || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-24 h-1 bg-white/5 border border-white/10 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${agent.winProbability || 0}%` }}
                                            className="h-full bg-primary/40"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Tactical Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border border border-border mb-40 shadow-2xl">
                    <div className="bg-surface p-10 flex flex-col h-[700px]">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-3 bg-primary" />
                                <h2 className="terminal-text text-white">Execution_Ledger</h2>
                            </div>
                            <span className="terminal-text text-muted">{tradeLog.length} Records</span>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                            <TradeLog trades={tradeLog} explorerUrl={explorerUrl} />
                        </div>
                    </div>

                    <div className="bg-surface p-10 flex flex-col h-[700px]">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className={`w-1 h-3 ${isPrivateArena ? "bg-primary" : "bg-white/20"}`} />
                                <h2 className="terminal-text text-white uppercase tracking-widest font-bold">{isPrivateArena ? "Encrypted_Strategy_Stream" : "Strategy_Reasoning_Engine"}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-primary animate-pulse rounded-full shadow-[0_0_8px_rgba(0,102,255,0.8)]" />
                                <span className="terminal-text text-primary">Broadcasting</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                            <ReasoningPanel log={[...reasoningLog, ...(evolutionLog || [])].sort((a, b) => b.timestamp - a.timestamp)} isPrivate={isPrivateArena} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
