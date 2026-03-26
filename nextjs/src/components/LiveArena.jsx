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
    "whale-follower": { icon: "WF", gradient: "from-blue-500/10 to-transparent", barColor: "bg-[#0052B4]", textColor: "text-[#0052B4]", glow: "glow-cyan" },
    "momentum-trader": { icon: "MT", gradient: "from-orange-500/10 to-transparent", barColor: "bg-[#FFB000]", textColor: "text-[#FFB000]", glow: "glow-gold" },
    "risk-guard": { icon: "RG", gradient: "from-green-500/10 to-transparent", barColor: "bg-[#00E676]", textColor: "text-[#00E676]", glow: "glow-green" },
};

export default function LiveArena() {
    const { leaderboard, remainingMs, selectedAgent, tradeLog, reasoningLog, evolutionLog, isPrivateArena, config } = useArena();
    const explorerUrl = config?.explorerUrl;
    const durationSecs = config?.durationSeconds || 600;

    const progress = Math.max(0, 1 - remainingMs / (durationSecs * 1000));

    return (
        <div className="min-h-screen grid-bg flex flex-col px-4 py-8 relative">
            {/* Top Progress Bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-surface z-50">
                <motion.div
                    className="h-full bg-gradient-to-r from-[#0052B4] to-[#8A2BE2]"
                    style={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            <div className="max-w-5xl mx-auto w-full pt-4 relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold text-foreground">
                            ARENA <span className="text-[#0052B4] drop-shadow-md">LIVE</span>
                        </h1>
                        <p className="text-muted text-sm font-mono mt-1 text-foreground/70 flex items-center gap-2">
                            Agents are trading autonomously with real funds
                            {isPrivateArena && <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-[10px] border border-purple-500/30 font-bold tracking-[0.2em]">ENCRYPTED</span>}
                        </p>
                    </div>
                    <div className="text-left sm:text-right bg-background/50 glass-card px-6 py-3 rounded-2xl border-border">
                        <div className="font-mono text-4xl font-bold text-foreground tracking-wider">{formatTime(remainingMs)}</div>
                        <div className="text-muted text-xs font-mono uppercase tracking-wider text-foreground/50 mt-1">Remaining Time</div>
                    </div>
                </div>

                {/* Leaderboard Cards */}
                <div className="space-y-8 mb-16">
                    {leaderboard.length === 0 ? (
                        <div className="glass-card p-16 text-center">
                            <div className="w-12 h-12 border-[3px] border-foreground/20 border-t-[#0052B4] rounded-full animate-spin mb-8 mx-auto" />
                            <p className="text-muted font-mono text-foreground/70 text-lg">Waiting for first trade cycle...</p>
                            <p className="text-muted/50 text-sm font-mono mt-4 text-foreground/40">Agents execute trades every 25 seconds</p>
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
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`glass-card p-6 md:p-8 bg-gradient-to-r ${style.gradient} transition-all duration-500
                                           ${isYours ? `ring-1 ring-[#0052B4]/40 shadow-xl ${style.glow}` : ""}
                                           ${index === 0 ? "glow-gold ring-1 ring-[#FFB000]/30 shadow-lg" : ""}`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-12">
                                    {/* Rank + Agent Identity */}
                                    <div className="flex items-center gap-6 md:gap-8">
                                        <div className={`text-4xl md:text-5xl font-display font-bold md:w-16 text-center ${index === 0 ? "text-[#FFB000] text-glow-gold drop-shadow-lg" : "text-muted text-foreground/40"}`}>
                                            #{index + 1}
                                        </div>
                                        <div className="w-14 h-14 rounded-xl bg-background/50 flex items-center justify-center font-display font-bold text-xl border border-border/50 shadow-inner tracking-wider" style={{ color: style.textColor }}>
                                            {style.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className={`font-display text-xl font-bold ${style.textColor} drop-shadow-sm`}>{agent.name}</h3>
                                                {isYours && (
                                                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#0052B4]/10 text-[#0052B4] border border-[#0052B4]/30 tracking-widest uppercase">
                                                        YOUR PICK
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-muted text-xs font-mono text-foreground/60 flex items-center gap-4">
                                                <span>USERS: {agent.userCount || 0}</span>
                                                <span className="opacity-30">|</span>
                                                <span>TRADES: {agent.tradeCount || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Stats */}
                                    <div className="flex items-center gap-8 bg-background/40 px-6 py-3 rounded-xl border border-border/30">
                                        <div className="text-center">
                                            <div className="text-foreground font-mono text-2xl font-semibold tracking-tight">
                                                ${(agent.currentBalance || 0).toFixed(2)}
                                            </div>
                                            <div className="text-muted text-[10px] font-mono uppercase text-foreground/50 mt-1">Live Balance</div>
                                        </div>
                                        <div className="w-px h-10 bg-border/50" />
                                        <div className="text-center">
                                            <div className={`font-mono text-3xl font-bold tracking-tighter ${roiPositive ? "text-[#00E676] drop-shadow-sm" : "text-[#FF3B5C] drop-shadow-sm"}`}>
                                                {roiPositive ? "+" : ""}{roi.toFixed(2)}%
                                            </div>
                                            <div className="text-muted text-[10px] font-mono uppercase text-foreground/50 mt-1">Net ROI</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic ROI Bar */}
                                <div className="mt-6 h-1.5 bg-background/50 rounded-full overflow-hidden border border-border/50">
                                    <motion.div
                                        className={`h-full rounded-full ${roiPositive ? "bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.5)]" : "bg-[#FF3B5C] shadow-[0_0_10px_rgba(255,59,92,0.5)]"}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, Math.abs(roi) * 2 + 5)}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Tactical Data Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 items-start pb-24">
                    <div className="glass-card p-8 border-border backdrop-blur-2xl">
                        <div className="flex items-center gap-4 mb-8 border-b border-border/50 pb-6">
                            <div className="w-3 h-3 rounded-full bg-[#0052B4] animate-pulse" />
                            <h2 className="font-display font-semibold text-foreground text-base md:text-lg uppercase tracking-widest text-[#0052B4]">
                                Live Trade Feed
                            </h2>
                        </div>
                        <TradeLog trades={tradeLog} explorerUrl={explorerUrl} />
                    </div>

                    <div className="glass-card p-8 border-border backdrop-blur-2xl">
                        <div className="flex items-center gap-4 mb-8 border-b border-border/50 pb-6">
                            <div className={`w-3 h-3 rounded-full ${isPrivateArena ? "bg-purple-500" : "bg-[#FFB000]"} animate-pulse`} />
                            <h2 className={`font-display font-semibold text-foreground text-base md:text-lg uppercase tracking-widest ${isPrivateArena ? "text-purple-500" : "text-[#FFB000]"}`}>
                                {isPrivateArena ? "Encrypted Strategy Log" : "Agent Reasoning Engine"}
                            </h2>
                        </div>
                        <ReasoningPanel log={[...reasoningLog, ...(evolutionLog || [])].sort((a, b) => b.timestamp - a.timestamp)} isPrivate={isPrivateArena} />
                    </div>
                </div>
            </div>
        </div>
    );
}
