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
        id: "whale-follower", name: "Whale Follower", icon: "WF", risk: "Medium-High", accent: "#0052B4",
        riskColor: "#0052B4",
        description: "Monitors massive on-chain swaps and follows smart money flow before price impact hits retail.",
        strategy: "Strategy: On-Chain Volume Tracking"
    },
    {
        id: "momentum-trader", name: "Momentum Trader", icon: "MT", risk: "High", accent: "#FFB000",
        riskColor: "#FFB000",
        description: "Executes rapid trades based on order book imbalance and short-term volatility spikes.",
        strategy: "Strategy: Order Book Imbalance"
    },
    {
        id: "risk-guard", name: "Risk Guard", icon: "RG", risk: "Low", accent: "#00E676",
        riskColor: "#00E676",
        description: "Focuses on yield preservation, trading only when absolute arbitrage opportunities emerge.",
        strategy: "Strategy: Delta-Neutral Arbitrage"
    }
];

const STEPS = ["Select Agent", "Approve USDC", "Pay Entry Fee", "Joining Arena"];

export default function AgentSelection() {
    const { address } = useAccount();
    const { setPhase, setSelectedAgent, setArenaId, agentSelections, demoMode, config, veniceEnabled,
        isPrivateArena, setIsPrivateArena } = useArena();

    const [selectedId, setSelectedId] = useState(null);
    const [step, setStep] = useState(null);
    const [error, setError] = useState(null);
    const [pendingTxHash, setPendingTxHash] = useState(null);

    const entryFee = config?.entryFeeUsd ?? 0.5;
    const usdcAddress = config?.usdcAddress;
    const vaultAddress = config?.vaultAddress;
    const durationSecs = config?.arenaDurationSecs ?? 300;

    const { writeContractAsync } = useWriteContract();

    const handleSelect = async (agentId) => {
        if (!address) return;
        setSelectedId(agentId);
        setError(null);

        // ─── Real x402 Payment Flow ──────────────────────────────────────────────
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
        <div className="min-h-screen grid-bg flex flex-col items-center px-4 py-8 md:py-16 relative overflow-y-auto overflow-x-hidden">

            <button
                onClick={() => setPhase("landing")}
                className="absolute top-4 left-4 md:top-8 md:left-8 z-50 flex items-center gap-2 px-4 py-2 glass-card hover:bg-[rgba(0,102,255,0.1)] transition-colors text-foreground text-sm font-semibold rounded-full border border-[rgba(0,102,255,0.2)]"
            >
                <ArrowLeft size={16} /> Back to Home
            </button>

            <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full pointer-events-none -z-10"
                style={{ background: "radial-gradient(circle, rgba(0,102,255,0.08) 0%, transparent 70%)" }} />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 z-10 pt-12 md:pt-0">
                <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }} className="text-3xl md:text-[2.5rem] text-foreground mb-4">
                    Choose Your Agent
                </h2>
                <p style={{ color: "#64748B", marginTop: 8 }}>Pick the AI strategy that matches your conviction</p>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "rgba(100,116,139,0.7)", marginTop: 4 }}>
                    Entry fee: ${entryFee} USDC · All 3 agents must be selected to start
                </p>
            </motion.div>

            {/* Privacy Toggle */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="max-w-md w-full z-10 mb-8">
                <PrivacyToggle isPrivate={isPrivateArena} onChange={setIsPrivateArena} veniceEnabled={veniceEnabled} />
                <p className="text-foreground/70 text-sm mt-4">
                    Pick your AI combatant. The arena runs for {durationSecs / 60} mins. Winners divide entry fees.
                </p>
            </motion.div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 w-full max-w-6xl relative z-10 pb-16">
                {AGENTS.map((agent, i) => {
                    const userCount = agentSelections[agent.id] || 0;
                    const isSelected = selectedId === agent.id;
                    const isLoading = isSelected && step !== null;

                    return (
                        <motion.div key={agent.id}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                            onClick={() => { if (step === null) setSelectedId(agent.id); }}
                            className={`glass-card p-6 md:p-8 cursor-pointer flex flex-col h-full transition-all duration-300
                                ${isSelected ? "ring-2 ring-offset-bg bg-background/80 shadow-2xl scale-105 z-20" : "hover:bg-background/60 hover:-translate-y-2"}
                            `}
                            style={{
                                borderColor: isSelected ? agent.accent : "var(--glass-border)",
                                boxShadow: isSelected ? `0 0 40px ${agent.accent}40, inset 0 0 20px ${agent.accent}20` : undefined,
                                opacity: step !== null && !isSelected ? 0.3 : 1,
                            }}>
                            <div className="w-16 h-16 rounded-xl flex items-center justify-center font-display font-bold text-3xl mb-8 mx-auto md:mx-0 shadow-inner" style={{ background: `${agent.accent}10`, color: agent.accent, border: `1px solid ${agent.accent}40`, textShadow: `0 0 20px ${agent.accent}60` }}>{agent.icon}</div>

                            <div className="flex-grow flex flex-col text-center md:text-left items-center md:items-start">
                                <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "var(--text-color)", marginBottom: 8 }}>{agent.name}</h3>
                                <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 6, background: `${agent.riskColor}15`, color: agent.riskColor, fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, marginBottom: 16, border: `1px solid ${agent.riskColor}30` }}>
                                    {agent.risk} Risk
                                </div>
                                <p className="text-foreground/70 text-sm leading-relaxed mb-6 flex-grow">{agent.description}</p>

                                <div className="w-full">
                                    <div className="text-foreground/50 text-[11px] font-mono border-t border-border/50 pt-4 leading-relaxed">{agent.strategy}</div>
                                </div>
                            </div>

                            {userCount > 0 && (
                                <div style={{ marginTop: 24, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.2)" }} className="w-full">
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0052B4" }} className="animate-pulse shadow-[0_0_8px_#0052B4]" />
                                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "#0052B4" }}>{userCount} Fighter{userCount !== 1 ? "s" : ""} Ready</span>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Payment Progress */}
            <AnimatePresence>
                {step !== null && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="glass-card mt-8 p-6 max-w-md w-full z-10 mx-auto bg-background/90 backdrop-blur-3xl shadow-2xl absolute md:relative bottom-4 md:bottom-auto left-4 right-4 md:left-auto md:right-auto md:w-auto w-[calc(100%-2rem)]">
                        <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600 }} className="text-foreground mb-4">
                            Processing x402 Payment
                        </p>
                        <div className="flex gap-3 mb-4">
                            {["Approve", "Pay", "Verify", "Join"].map((label, i) => (
                                <div key={label} className="flex-1 text-center">
                                    <div style={{
                                        width: 28, height: 28, borderRadius: "50%", border: "2px solid",
                                        borderColor: step > i ? "#00E676" : step === i ? "#0066FF" : "rgba(100,116,139,0.3)",
                                        background: step > i ? "rgba(0,230,118,0.1)" : "transparent",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        margin: "0 auto 4px", fontSize: "0.7rem",
                                        color: step > i ? "#00E676" : step === i ? "#0066FF" : "#64748B",
                                        fontFamily: "JetBrains Mono, monospace"
                                    }}>
                                        {step > i ? "✓" : i + 1}
                                    </div>
                                    <div style={{ fontSize: "0.6rem", color: step === i ? "#0066FF" : "#64748B", fontFamily: "JetBrains Mono, monospace" }}>{label}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748B", fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem" }}>
                            <div className="animate-spin" style={{ width: 14, height: 14, border: "2px solid rgba(0,102,255,0.3)", borderTopColor: "#0066FF", borderRadius: "50%" }} />
                            {STEPS[step]}...
                        </div>
                        {pendingTxHash && (
                            <a href={`${config?.explorerUrl || "https://www.okx.com/explorer/xlayer"}/tx/${pendingTxHash}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", marginTop: 8, fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#0066FF" }}>
                                View tx: {pendingTxHash.slice(0, 16)}...
                            </a>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-sm" style={{ color: "#FF395C" }}>
                    {error}
                </motion.div>
            )}
        </div>
    );
}
