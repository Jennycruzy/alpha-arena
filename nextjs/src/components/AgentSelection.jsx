"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract } from "wagmi";
import { useArena } from "@/context/ArenaContext";
import { api } from "@/utils/api";
import { ARENA_VAULT_ABI, ERC20_APPROVE_ABI, arenaIdToBytes32, toUsdcUnits } from "@/utils/arenaVault";
import PrivacyToggle from "./PrivacyToggle";

const AGENTS = [
    {
        id: "whale-follower", name: "Whale Follower", icon: "🐋", risk: "Medium-High",
        riskColor: "#FACC15", description: "Follows large wallet movements via on-chain signals",
        strategy: "Mirrors whale buys using OKX DEX Signal in real-time",
        accent: "#3B82F6", border: "rgba(59,130,246,0.3)", bg: "rgba(59,130,246,0.04)",
    },
    {
        id: "momentum-trader", name: "Momentum Trader", icon: "🚀", risk: "High",
        riskColor: "#FF3B5C", description: "Rides trending tokens showing strong upward momentum",
        strategy: "Aggressive trend-following via OKX DEX Market data",
        accent: "#F97316", border: "rgba(249,115,22,0.3)", bg: "rgba(249,115,22,0.04)",
    },
    {
        id: "risk-guard", name: "Risk Guard", icon: "🛡️", risk: "Low",
        riskColor: "#00E676", description: "Conservative strategy focused on capital preservation",
        strategy: "Security-first — small positions, blue chips only, fast exits",
        accent: "#22C55E", border: "rgba(34,197,94,0.3)", bg: "rgba(34,197,94,0.04)",
    },
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

    const { writeContractAsync } = useWriteContract();

    const handleSelect = async (agentId) => {
        if (!address) return;
        setSelectedId(agentId);
        setError(null);

        if (demoMode) {
            setStep(3);
            try {
                const arena = await api.getCurrentArena();
                const result = await api.joinArena(address, agentId, arena.arenaId, null, isPrivateArena);
                setSelectedAgent(agentId);
                setArenaId(result.arenaId);
                setPhase(result.readyToStart ? "live" : "waiting");
            } catch (err) {
                setError(err.message);
                setStep(null);
            }
            return;
        }

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
        <div className="min-h-screen grid-bg flex flex-col items-center px-4 py-14 relative">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,82,180,0.08) 0%, transparent 70%)" }} />

            {demoMode && <div className="demo-banner mb-6">⚡ DEMO MODE — no real payment required</div>}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 z-10">
                <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "2.5rem", color: "#E8EAF0" }}>
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
            </motion.div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full z-10">
                {AGENTS.map((agent, i) => {
                    const userCount = agentSelections[agent.id] || 0;
                    const isSelected = selectedId === agent.id;
                    const isLoading = isSelected && step !== null;
                    return (
                        <motion.div key={agent.id}
                            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.12 }}
                            onClick={() => !isLoading && step === null && handleSelect(agent.id)}
                            className="glass-card p-6 cursor-pointer transition-all duration-300"
                            style={{
                                border: `1px solid ${isSelected ? "#0052B4" : agent.border}`,
                                background: isSelected ? "rgba(0,82,180,0.06)" : "transparent",
                                boxShadow: isSelected ? "0 0 30px rgba(0,82,180,0.15)" : "none",
                                opacity: step !== null && !isSelected ? 0.4 : 1,
                            }}>
                            <div style={{ fontSize: "3rem", marginBottom: 12 }}>{agent.icon}</div>
                            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: "#E8EAF0", marginBottom: 4 }}>{agent.name}</h3>
                            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: agent.riskColor, marginBottom: 10 }}>Risk: {agent.risk}</div>
                            <p style={{ color: "#64748B", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: 10 }}>{agent.description}</p>
                            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "rgba(100,116,139,0.6)", borderTop: "1px solid rgba(21,34,56,0.6)", paddingTop: 10 }}>{agent.strategy}</div>
                            {userCount > 0 && (
                                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(0,82,180,0.1)", border: "1px solid rgba(0,82,180,0.3)" }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0052B4" }} />
                                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#00E676" }}>{userCount} joined</span>
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
                        className="glass-card mt-8 p-6 max-w-md w-full z-10">
                        <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 16 }}>
                            {demoMode ? "Joining arena..." : "Processing x402 Payment"}
                        </p>
                        {!demoMode && (
                            <div className="flex gap-3 mb-4">
                                {["Approve", "Pay", "Verify", "Join"].map((label, i) => (
                                    <div key={label} className="flex-1 text-center">
                                        <div style={{
                                            width: 28, height: 28, borderRadius: "50%", border: "2px solid",
                                            borderColor: step > i ? "#00E676" : step === i ? "#0052B4" : "rgba(100,116,139,0.3)",
                                            background: step > i ? "rgba(0,230,118,0.1)" : "transparent",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            margin: "0 auto 4px", fontSize: "0.7rem",
                                            color: step > i ? "#00E676" : step === i ? "#0052B4" : "#64748B",
                                            fontFamily: "JetBrains Mono, monospace"
                                        }}>
                                            {step > i ? "✓" : i + 1}
                                        </div>
                                        <div style={{ fontSize: "0.6rem", color: step === i ? "#0052B4" : "#64748B", fontFamily: "JetBrains Mono, monospace" }}>{label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748B", fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem" }}>
                            <div className="animate-spin" style={{ width: 14, height: 14, border: "2px solid rgba(0,82,180,0.3)", borderTopColor: "#0052B4", borderRadius: "50%" }} />
                            {STEPS[step]}...
                        </div>
                        {pendingTxHash && (
                            <a href={`${config?.explorerUrl || "https://www.okx.com/explorer/xlayer"}/tx/${pendingTxHash}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", marginTop: 8, fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#0052B4" }}>
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
