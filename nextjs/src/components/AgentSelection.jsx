"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useArena } from "@/context/ArenaContext";
import { ArrowLeft, Play, Info } from "lucide-react";
import { api } from "@/utils/api";
import { ARENA_VAULT_ABI, ERC20_APPROVE_ABI, arenaIdToBytes32, toUsdcUnits } from "@/utils/arenaVault";
import PrivacyToggle from "./PrivacyToggle";

const AGENTS = [
    {
        id: "whale-follower", name: "Whale Follower", icon: "WF", accent: "#4499FF",
        description: "Follows smart money flow before price impact hits retail.",
        riskReward: "1.5x"
    },
    {
        id: "momentum-trader", name: "Momentum Trader", icon: "MT", accent: "#FF4500",
        description: "Executes rapid trades based on order book imbalance.",
        riskReward: "2.0x"
    },
    {
        id: "risk-guard", name: "Risk Guard", icon: "RG", accent: "#00E676",
        description: "Focuses on yield preservation and arbitrage opportunities.",
        riskReward: "0.8x"
    }
];

const STEPS = ["Validated", "Approving", "Depositing", "Launching"];

export default function AgentSelection() {
    const { address } = useAccount();
    const { setPhase, setSelectedAgent, setArenaId, config, veniceEnabled,
        isPrivateArena, setIsPrivateArena } = useArena();

    // Default: split 50/50/0 or similar. Total must be 100% (1.0)
    const [allocations, setAllocations] = useState({
        "whale-follower": 1,
        "momentum-trader": 0,
        "risk-guard": 0
    });

    const [step, setStep] = useState(null);
    const [error, setError] = useState(null);
    const [pendingTxHash, setPendingTxHash] = useState(null);

    const entryFee = config?.entryFeeUsd ?? 0.1;
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();

    const totalWeight = Object.values(allocations).reduce((a, b) => a + b, 0);

    const handleWeightChange = (id, val) => {
        setAllocations(prev => ({ ...prev, [id]: parseFloat(val) }));
    };

    const handleLaunch = async () => {
        if (!address || totalWeight === 0) return;

        // Normalize weights so they sum to 1.0
        const normalizedAllocations = {};
        for (const [id, w] of Object.entries(allocations)) {
            normalizedAllocations[id] = w / totalWeight;
        }

        try {
            setStep(0);
            const arenaData = await api.getCurrentArena();
            const arenaId = arenaData.arenaId;
            const arenaBytes32 = await arenaIdToBytes32(arenaId);
            const amount = toUsdcUnits(entryFee);

            setStep(1);
            const approveTx = await writeContractAsync({
                address: config.usdcAddress,
                abi: ERC20_APPROVE_ABI,
                functionName: "approve",
                args: [config.vaultAddress, amount],
            });
            await publicClient.waitForTransactionReceipt({ hash: approveTx });

            setStep(2);
            const depositTx = await writeContractAsync({
                address: config.vaultAddress,
                abi: ARENA_VAULT_ABI,
                functionName: "deposit",
                args: [arenaBytes32],
            });
            setPendingTxHash(depositTx);

            setStep(3);
            let result;
            for (let i = 0; i < 12; i++) {
                try {
                    result = await api.joinArena(address, normalizedAllocations, arenaId, depositTx, isPrivateArena);
                    break;
                } catch (err) {
                    if (err.message?.includes("Payment verification") && i < 11) {
                        await new Promise((r) => setTimeout(r, 3000));
                        continue;
                    }
                    throw err;
                }
            }

            setArenaId(result.arenaId);
            setPhase("live");
        } catch (err) {
            setError(err.message || "Launch failed. Please try again.");
            setStep(null);
        }
    };

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center px-6 py-20 relative overflow-y-auto bg-[#030406]">

            <button onClick={() => setPhase("landing")} className="absolute top-10 left-10 z-50 flex items-center gap-2 group">
                <div className="w-8 h-8 flex items-center justify-center border border-border group-hover:bg-white group-hover:text-black transition-all">
                    <ArrowLeft size={14} />
                </div>
                <span className="terminal-text text-muted group-hover:text-white uppercase text-[10px] font-black">Abort</span>
            </button>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                <h2 className="font-display font-black text-5xl text-white tracking-tighter uppercase mb-4">
                    SOLO<br /><span className="text-primary italic">DIRECTOR.</span>
                </h2>
                <p className="terminal-text text-white/40 text-[10px] font-black uppercase tracking-widest">
                    Build your squad. Allocate capital. Control the battle.
                </p>
            </motion.div>

            {/* Allocation Panel */}
            <div className="max-w-4xl w-full z-10 space-y-4">
                {AGENTS.map((agent, i) => (
                    <motion.div key={agent.id}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                        className="p-6 bg-surface/40 border border-white/5 flex flex-col md:flex-row items-center gap-8 group hover:border-white/20 transition-all">

                        <div className="w-12 h-12 flex items-center justify-center border border-border bg-black shrink-0">
                            <span className="font-mono font-bold text-xl" style={{ color: agent.accent }}>{agent.icon}</span>
                        </div>

                        <div className="flex-1 w-full text-center md:text-left">
                            <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">{agent.name}</h3>
                            <p className="terminal-text text-white/50 text-[10px] uppercase font-bold mt-1 line-clamp-1">
                                {agent.description}
                            </p>
                        </div>

                        <div className="w-full md:w-64 flex flex-col gap-2">
                            <div className="flex justify-between terminal-text text-[9px] font-black uppercase">
                                <span className="text-white/40">Capital Split</span>
                                <span className={allocations[agent.id] > 0 ? "text-primary" : "text-white/20"}>
                                    {Math.round((allocations[agent.id] / (totalWeight || 1)) * 100)}%
                                </span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.1"
                                value={allocations[agent.id]}
                                onChange={(e) => handleWeightChange(agent.id, e.target.value)}
                                className="w-full accent-primary h-1 bg-white/10 appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="hidden lg:block w-24 text-right">
                            <div className="terminal-text text-[9px] text-white/40 font-black uppercase mb-1">Risk Multi</div>
                            <div className="font-mono text-xs font-black text-white">{agent.riskReward}</div>
                        </div>
                    </motion.div>
                ))}

                <div className="p-8 border-t border-white/10 mt-12 flex flex-col items-center gap-10">
                    <PrivacyToggle isPrivate={isPrivateArena} onChange={setIsPrivateArena} veniceEnabled={veniceEnabled} />

                    <button
                        onClick={handleLaunch}
                        disabled={step !== null || totalWeight === 0}
                        className="relative group px-16 py-6 overflow-hidden">
                        <div className="absolute inset-0 bg-primary group-hover:bg-white transition-colors" />
                        <div className="relative flex items-center gap-4 text-black font-mono font-black uppercase tracking-[0.4em] text-sm">
                            <Play size={16} fill="black" />
                            Initialize Combat
                        </div>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                        <span className="terminal-text text-[10px] text-white/30 font-black uppercase tracking-widest">
                            Instant Start Protocol Enabled
                        </span>
                    </div>
                </div>
            </div>

            {/* Step Display (copied from old component) */}
            <AnimatePresence>
                {step !== null && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-0 left-0 right-0 p-10 bg-surface border-t border-primary z-[100] flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex flex-col gap-2">
                            <h4 className="font-display font-bold text-xl uppercase tracking-widest text-primary">LAUNCH_PROTOCOL</h4>
                            <div className="flex items-center gap-4">
                                {STEPS.map((s, i) => (
                                    <div key={s} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${step > i ? "bg-success" : step === i ? "bg-primary animate-pulse" : "bg-white/10"}`} />
                                        <span className={`terminal-text ${step === i ? "text-white" : "text-muted"}`}>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-primary/10 border border-primary/30 flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                            <span className="terminal-text text-primary uppercase text-xs font-black tracking-widest">Processing...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="fixed bottom-10 right-10 z-[110] bg-error p-8 max-w-md text-black font-mono text-xs uppercase font-black tracking-widest border-4 border-black shadow-[10px_10px_0px_#000]">
                    <div className="flex justify-between items-start mb-6 border-b border-black pb-4 text-sm font-bold">
                        <span>CRITICAL_FAILURE</span>
                        <button onClick={() => setError(null)} className="bg-black text-white px-2 py-1">CLOSE</button>
                    </div>
                    <div className="leading-loose break-all">{error}</div>
                </motion.div>
            )}
        </div>
    );
}
