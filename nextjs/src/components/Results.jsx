"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useArena } from "@/context/ArenaContext";
import CopyWinner from "./CopyWinner";

const AGENT_META = {
    "whale-follower": { name: "Whale Follower", icon: "WF", color: "#0066FF" },
    "momentum-trader": { name: "Momentum Trader", icon: "MT", color: "#FF4500" },
    "risk-guard": { name: "Risk Guard", icon: "RG", color: "#00E676" },
};

function Confetti() {
    const [particles] = useState(() => [...Array(40)].map((_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 0.5,
        color: ["#0066FF", "#00E676", "#FFFFFF"][i % 3],
        size: 2, duration: 1.5 + Math.random() * 2,
    })));
    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {particles.map((p) => (
                <motion.div key={p.id}
                    initial={{ x: `${p.x}vw`, y: "-10vh", opacity: 1 }}
                    animate={{ y: "110vh", opacity: [1, 1, 0] }}
                    transition={{ delay: p.delay, duration: p.duration, ease: "linear" }}
                    className="absolute" style={{ width: p.size, height: p.size * 4, background: p.color }} />
            ))}
        </div>
    );
}

export default function Results() {
    const { results, selectedAgent, resetArena, config, isPrivateArena, agentEvolution } = useArena();
    const { address } = useAccount();
    const [showConfetti, setShowConfetti] = useState(false);
    const explorerUrl = config?.explorerUrl || "https://www.okx.com/explorer/xlayer";

    const winner = results?.winner;
    const standings = results?.standings || [];
    const payouts = results?.payouts || [];
    const myPayout = payouts.find((p) => p.userId?.toLowerCase() === address?.toLowerCase());
    const isWinner = myPayout?.isWinner;

    const winnerEvolution = winner ? agentEvolution[winner.agentId] : null;

    useEffect(() => {
        if (isWinner) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3500); }
    }, [isWinner]);

    if (!results) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#030406]">
            <div className="w-12 h-1 bg-primary/20 relative overflow-hidden mb-6">
                <motion.div className="absolute top-0 bottom-0 left-0 bg-primary"
                    initial={{ x: -48 }} animate={{ x: 48 }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: "40%" }} />
            </div>
            <p className="terminal-text animate-pulse">Reconciling_Settlement_Logs</p>
        </div>
    );

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center px-6 py-20 relative bg-[#030406]">
            <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

            <div className="z-10 w-full max-w-5xl">

                {/* Major Result Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-10">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            <span className="terminal-text text-primary">Settlement Resolved</span>
                        </div>
                        <h1 className="font-display text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
                            CYCLE <span className="text-primary italic">RESULTS.</span>
                        </h1>
                    </div>
                    <div className="flex flex-col items-start md:items-end">
                        <div className="terminal-text text-muted mb-2">Total Yield Distribution</div>
                        <div className="font-mono text-5xl font-bold text-success tracking-tighter bg-surface border border-border px-6 py-2 shadow-xl">
                            ${results.totalPool?.toFixed(2)} <span className="text-xs opacity-50">USDC</span>
                        </div>
                    </div>
                </div>

                {/* Champion Banner */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full p-12 mb-10 bg-surface border border-primary relative overflow-hidden shadow-[0_0_50px_rgba(0,102,255,0.15)]">
                    <div className="absolute top-0 right-0 p-4 terminal-text text-primary font-black">DOMINANT_AGENT</div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-10">
                            <div className="w-24 h-24 border border-primary/30 bg-primary/5 flex items-center justify-center font-mono font-bold text-4xl text-primary">
                                {AGENT_META[winner?.agentId]?.icon}
                            </div>
                            <div>
                                <div className="terminal-text text-primary mb-2">Primary Champion</div>
                                <h2 className="font-display font-black text-4xl text-white uppercase tracking-tighter mb-2">
                                    {winner?.name}
                                </h2>
                                {winnerEvolution && (
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs font-bold text-success px-2 py-0.5 bg-success/10 border border-success/20">EVOLVED TO LV.{winnerEvolution.level}</span>
                                        <span className="font-mono text-xs text-muted uppercase tracking-widest font-bold">{winnerEvolution.xp} XP ACCUMULATED</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-center md:text-right">
                            <div className="terminal-text text-muted mb-2">Performance ROI</div>
                            <div className={`font-mono text-6xl font-black tracking-tighter ${winner?.roi >= 0 ? "text-success" : "text-error"}`}>
                                {winner?.roi >= 0 ? "+" : ""}{winner?.roi?.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Personal Payout & Copy Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
                    {myPayout && (
                        <div className={`p-10 bg-surface border ${myPayout.profit >= 0 ? "border-success/30" : "border-error/30"} relative overflow-hidden group`}>
                            <div className="terminal-text text-muted mb-10 text-xs font-bold uppercase tracking-widest">Your Agent Outcome</div>
                            <div className="flex justify-between items-end relative z-10">
                                <div>
                                    <div className="terminal-text text-muted mb-2">Payout Amount</div>
                                    <div className={`font-mono text-5xl font-bold tracking-tighter ${myPayout.profit >= 0 ? "text-success" : "text-error"}`}>
                                        ${myPayout.payout.toFixed(4)}
                                    </div>
                                    <div className="terminal-text text-muted mt-6 flex gap-4">
                                        <span>ENTRY: ${myPayout.entryFee.toFixed(2)}</span>
                                        <span>PNL: {((myPayout.payout / myPayout.entryFee - 1) * 100).toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="font-display font-black text-6xl opacity-10 select-none group-hover:opacity-20 transition-opacity">
                                    {myPayout.isWinner ? "WIN" : "LOSS"}
                                </div>
                            </div>
                            {myPayout.isWinner && (
                                <div className="absolute inset-0 bg-success/5 animate-pulse pointer-events-none" />
                            )}
                        </div>
                    )}

                    {winner && (
                        <div className="p-10 bg-surface border border-border flex flex-col justify-between">
                            <div className="terminal-text text-muted mb-10">Strategic Persistence</div>
                            <div className="mb-8">
                                <CopyWinner winner={winner} isPrivate={isPrivateArena} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Final Rankings List */}
                <div className="w-full mb-20 border border-border bg-surface/50 backdrop-blur-md overflow-hidden">
                    <div className="grid grid-cols-5 p-4 border-b border-border terminal-text text-muted font-bold bg-white/5 uppercase text-[9px]">
                        <div className="col-span-1">RANKING</div>
                        <div className="col-span-1 text-center">AGENT</div>
                        <div className="col-span-1 text-center font-bold">EVOLUTION</div>
                        <div className="col-span-1 text-center font-bold">PnL_YIELD</div>
                        <div className="col-span-1 text-right font-bold tracking-widest">TRADES</div>
                    </div>
                    {standings.map((agent, i) => {
                        const meta = AGENT_META[agent.agentId];
                        const evol = agentEvolution[agent.agentId];
                        return (
                            <div key={agent.agentId} className="grid grid-cols-5 p-8 border-b border-border transition-colors hover:bg-white/5 items-center">
                                <div className="font-mono font-bold text-xl text-muted/30">0{i + 1}</div>
                                <div className="flex items-center gap-6 justify-center">
                                    <div className="w-8 h-8 border border-border bg-black flex items-center justify-center font-mono font-bold text-xs" style={{ color: meta?.color }}>
                                        {meta?.icon}
                                    </div>
                                    <span className="font-display font-bold text-xs text-white uppercase tracking-wider">{meta?.name || agent.name}</span>
                                </div>
                                <div className="text-center font-mono text-xs">
                                    <div className="text-white font-bold">LVL {evol?.level || 1}</div>
                                    <div className="text-muted text-xs uppercase tracking-widest font-bold">{evol?.xp || 0} XP</div>
                                </div>
                                <div className={`font-mono text-xl font-bold tracking-tighter text-center ${agent.roi >= 0 ? "text-success" : "text-error"}`}>
                                    {agent.roi >= 0 ? "+" : ""}{agent.roi?.toFixed(2)}%
                                </div>
                                <div className="font-mono text-muted text-right text-[10px] uppercase font-bold">{agent.tradeCount} TXS</div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col items-center gap-10">
                    <button onClick={resetArena} className="btn-primary w-full max-w-sm font-black tracking-[0.3em] py-5">
                        INITIALIZE_NEXT_CYCLE
                    </button>
                    <div className="terminal-text text-muted flex gap-10">
                        <a href={explorerUrl} target="_blank" className="hover:text-white transition-colors border-b border-muted/20">XLayer_Explorer_Feed ↗</a>
                        <a href="#" className="hover:text-white transition-colors border-b border-muted/20">Archive_Metadata ↗</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
