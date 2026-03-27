"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract } from "wagmi";
import { useArena } from "@/context/ArenaContext";
import { ArrowLeft } from "lucide-react";
import { api } from "@/utils/api";
import { ARENA_VAULT_ABI, ERC20_APPROVE_ABI, arenaIdToBytes32, toUsdcUnits } from "@/utils/arenaVault";
import PrivacyToggle from "./PrivacyToggle";

const AGENTS = [
    {
        id: "whale-follower", name: "Whale Follower", icon: "WF", risk: "Medium-High", accent: "#4499FF",
        riskColor: "#4499FF", riskReward: "1.5x",
        description: "Monitors massive on-chain swaps and follows smart money flow before price impact hits retail.",
        strategy: "Strategy: On-Chain Volume Tracking"
    },
    {
        id: "momentum-trader", name: "Momentum Trader", icon: "MT", risk: "High", accent: "#FF4500",
        riskColor: "#FF4500", riskReward: "2.0x",
        description: "Executes rapid trades based on order book imbalance and short-term volatility spikes.",
        strategy: "Strategy: Order Book Imbalance"
    },
    {
        id: "risk-guard", name: "Risk Guard", icon: "RG", risk: "Low", accent: "#00E676",
        riskColor: "#00E676", riskReward: "0.8x",
        description: "Focuses on yield preservation, trading only when absolute arbitrage opportunities emerge.",
        strategy: "Strategy: Capital Preservation"
    }
];

const STEPS = ["Selection Validated", "Awaiting Approval", "Initiating Payout", "Joining Battle Arena"];

export default function AgentSelection() {
    const { address } = useAccount();
    const { setPhase, setSelectedAgent, setArenaId, agentSelections, config, veniceEnabled,
        isPrivateArena, setIsPrivateArena } = useArena();

    const [selectedId, setSelectedId] = useState(null);
    const [step, setStep] = useState(null);
    const [error, setError] = useState(null);
    const [pendingTxHash, setPendingTxHash] = useState(null);

    const entryFee = config?.entryFeeUsd ?? parseFloat(process.env.NEXT_PUBLIC_ENTRY_FEE_USD || "0.1");
    const usdcAddress = config?.usdcAddress;
    const vaultAddress = config?.vaultAddress;
    const durationSecs = config?.arenaDurationSecs ?? 300;

    const { writeContractAsync } = useWriteContract();

    const handleSelect = async (agentId) => {
        if (!address) return;
        setSelectedId(agentId);
        setError(null);

        try {
            setStep(0);
            const arenaData = await api.getCurrentArena();
            const arenaId = arenaData.arenaId;
            const arenaBytes32 = await arenaIdToBytes32(arenaId);
            const amount = toUsdcUnits(entryFee);

            setStep(1);
            await writeContractAsync({
                address: usdcAddress,
                abi: ERC20_APPROVE_ABI,
                functionName: "approve",
                args: [vaultAddress, amount],
            });
            await new Promise((r) => setTimeout(r, 5000));

            setStep(2);
            const depositTx = await writeContractAsync({
                address: vaultAddress,
                abi: ARENA_VAULT_ABI,
                functionName: "deposit",
                args: [arenaBytes32],
            });
            setPendingTxHash(depositTx);

            setStep(3);
            let result;
            for (let i = 0; i < 10; i++) {
                try {
                    result = await api.joinArena(address, agentId, arenaId, depositTx, isPrivateArena);
                    break;
                } catch (err) {
                    if (err.message?.includes("Payment verification") && i < 9) {
                        await new Promise((r) => setTimeout(r, 3000));
                        continue;
                    }
                    throw err;
                }
            }

            setSelectedAgent(agentId);
            setArenaId(result.arenaId);
            setPhase(result.readyToStart ? "live" : "waiting");
        } catch (err) {
            setError(err.message || "Payment failed. Please try again.");
            setStep(null);
            setSelectedId(null);
        }
    };

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center px-6 py-20 relative overflow-y-auto overflow-x-hidden bg-[#030406]">

            <button
                onClick={() => setPhase("landing")}
                className="absolute top-10 left-10 z-50 flex items-center gap-2 group"
            >
                <div className="w-8 h-8 flex items-center justify-center border border-border group-hover:bg-white group-hover:text-black transition-all">
                    <ArrowLeft size={14} />
                </div>
                <span className="terminal-text text-muted group-hover:text-white transition-colors">Abort Mission</span>
            </button>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16 z-10">
                <h2 className="font-display font-black text-5xl md:text-6xl text-white tracking-tighter uppercase mb-4">
                    AGENT<br /><span className="text-primary italic">SELECTION.</span>
                </h2>
                <div className="terminal-text text-white font-black flex items-center justify-center gap-6 text-sm">
                    <span className="bg-white/10 px-3 py-1 border border-white/20">ENTRY: ${entryFee} USDC</span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <span className="bg-white/10 px-3 py-1 border border-white/20">CYCLE: {durationSecs / 60} MIN</span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <span className="bg-error/20 text-error px-3 py-1 border border-error/40">STOP LOSS: 10%</span>
                </div>
            </motion.div>

            {/* Privacy Toggle */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="max-w-xl w-full z-10 mb-12 p-8 border border-border bg-surface/80 backdrop-blur-md">
                <PrivacyToggle isPrivate={isPrivateArena} onChange={setIsPrivateArena} veniceEnabled={veniceEnabled} />
                <div className="mt-6 flex flex-col items-center gap-4">
                    <div className="px-3 py-1 bg-success/10 border border-success/30 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                        <span className="font-mono text-[9px] text-success font-black uppercase tracking-widest">Funds Secured on X Layer</span>
                    </div>
                    <p className="terminal-text text-white text-center leading-loose text-xs font-black max-w-sm uppercase tracking-widest">
                        Private mode encrypts your agent's strategy weights during combat cycles. Recommended for elite trading logic.
                    </p>
                </div>
            </motion.div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-7xl relative z-10 pb-40">
                {AGENTS.map((agent, i) => {
                    const userCount = agentSelections[agent.id] || 0;
                    const isSelected = selectedId === agent.id;
                    const isLoading = isSelected && step !== null;

                    return (
                        <motion.div key={agent.id}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}
                            onClick={() => { if (step === null) setSelectedId(agent.id); }}
                            className={`group relative p-10 cursor-pointer flex flex-col h-full transition-all duration-300 border
                                ${isSelected ? "border-primary bg-primary/5" : "border-border bg-surface/40 hover:bg-surface/80 hover:border-white/20"}
                            `}
                            style={{ opacity: step !== null && !isSelected ? 0.2 : 1 }}>

                            {isSelected && (
                                <div className="absolute top-0 right-0 p-2 terminal-text text-primary">SELECTED_AGENT</div>
                            )}

                            <div className="w-16 h-16 flex items-center justify-center border border-border bg-black mb-8 group-hover:border-primary/50 transition-colors relative">
                                <span className="font-mono font-bold text-2xl" style={{ color: agent.accent }}>{agent.icon}</span>
                                <div className="absolute -bottom-2 -right-2 bg-primary text-black font-mono text-[8px] px-1 font-black">LV.1</div>
                            </div>

                            <div className="flex-grow">
                                <h3 className="font-display font-black text-3xl text-white mb-6 tracking-tighter uppercase">{agent.name}</h3>
                                <p className="font-mono text-xs text-white leading-relaxed uppercase tracking-widest mb-10 font-bold">
                                    {agent.description}
                                </p>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-4 border-t border-white/10">
                                        <span className="terminal-text text-white font-black uppercase text-[10px]">Risk-Reward</span>
                                        <span className="font-mono text-xs font-black tracking-widest text-[#4499FF] uppercase">{agent.riskReward} Multiplier</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-t border-white/10">
                                        <span className="terminal-text text-white font-black uppercase text-[10px]">Agent Status</span>
                                        <span className="font-mono text-xs text-success font-black tracking-widest uppercase">Operational</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-t border-white/10">
                                        <span className="terminal-text text-white font-black uppercase text-[10px]">Live Queue</span>
                                        <span className="font-mono text-xs text-white font-black tracking-widest underline decoration-primary underline-offset-4">{userCount} ACTIVE</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleSelect(agent.id); }}
                                disabled={step !== null}
                                className={`mt-10 w-full py-4 font-mono font-bold text-xs uppercase tracking-[0.3em] transition-all
                                    ${isSelected ? "bg-primary text-black hover:bg-white" : "bg-white/5 text-white hover:bg-white hover:text-black border border-white/10"}
                                    ${step !== null ? "opacity-30 cursor-not-allowed" : ""}
                                `}>
                                {isSelected ? "Finalize Selection" : "Lock In"}
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Payment Debugger UI */}
            <AnimatePresence>
                {step !== null && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-0 left-0 right-0 p-10 bg-surface border-t border-primary z-[100] flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex flex-col gap-2">
                            <h4 className="font-display font-bold text-xl uppercase tracking-widest text-primary">TRANSACTION_PAYLOAD</h4>
                            <div className="flex items-center gap-4">
                                {STEPS.map((s, i) => (
                                    <div key={s} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${step > i ? "bg-success" : step === i ? "bg-primary animate-pulse" : "bg-white/10"}`} />
                                        <span className={`terminal-text ${step === i ? "text-white" : "text-muted"}`}>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {pendingTxHash && (
                            <div className="flex-1 max-w-md hidden lg:block">
                                <div className="terminal-text text-muted mb-2">Hash Dump:</div>
                                <div className="p-3 bg-black border border-border font-mono text-xs break-all text-primary/80">
                                    {pendingTxHash}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-6">
                            {pendingTxHash && (
                                <a href={`${config?.explorerUrl || "https://www.okx.com/explorer/xlayer"}/tx/${pendingTxHash}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="terminal-text text-muted hover:text-white border-b border-muted transition-colors">
                                    Explorer View ↗
                                </a>
                            )}
                            <div className="px-6 py-3 bg-primary/10 border border-primary/30 flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                <span className="terminal-text text-primary">Processing...</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="fixed bottom-10 right-10 z-[110] bg-error p-8 max-w-md text-black font-mono text-xs uppercase font-black tracking-widest border-4 border-black shadow-[10px_10px_0px_#000]">
                    <div className="flex justify-between items-start mb-6 border-b border-black pb-4">
                        <span className="text-sm">CRITICAL_FAILURE</span>
                        <button onClick={() => setError(null)} className="bg-black text-error px-3 py-1 hover:bg-white hover:text-black transition-colors">CLOSE</button>
                    </div>
                    <div className="leading-loose break-all">
                        {error}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
