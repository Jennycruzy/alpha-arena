"use client";

import { motion } from "framer-motion";
import { useArena } from "@/context/ArenaContext";
import TradeLog from "./TradeLog";
import ReasoningPanel from "./ReasoningPanel";
import Image from "next/image";

const AGENT_META = {
    "whale-follower": { name: "Whale Follower", icon: "🐋", color: "#3B82F6" },
    "momentum-trader": { name: "Momentum Trader", icon: "🚀", color: "#F97316" },
    "risk-guard": { name: "Risk Guard", icon: "🛡️", color: "#22C55E" },
};

function Sparkline({ history = [] }) {
    if (!history.length) return null;
    const max = Math.max(...history.map(Math.abs), 1);
    return (
        <div className="sparkline">
            {history.slice(-16).map((v, i) => (
                <div key={i} className="spark-bar"
                    style={{ height: `${Math.max(2, Math.abs(v) / max * 100)}%`, background: v >= 0 ? "#00E676" : "#FF3B5C", opacity: 0.6 + i * 0.025 }} />
            ))}
        </div>
    );
}

function WinProbBar({ probability = 0, color = "#00F0FF" }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, height: 4, background: "rgba(26,30,42,0.8)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div
                    animate={{ width: `${probability}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ height: "100%", background: color, borderRadius: 2 }}
                />
            </div>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color, width: 32, textAlign: "right" }}>
                {probability.toFixed(0)}%
            </span>
        </div>
    );
}

function LevelXPBar({ level, xp, xpToNextLevel, color }) {
    const progress = xpToNextLevel === 0 ? 100 : (xp / Math.max(1, xp + xpToNextLevel)) * 100;
    return (
        <div style={{ marginTop: 12, borderTop: "1px dashed rgba(21,34,56,0.5)", paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "0.65rem", fontWeight: 700, color: "#E8EAF0", background: color, padding: "2px 6px", borderRadius: 4 }}>
                    Lv. {level}
                </span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#64748B" }}>
                    {xpToNextLevel === 0 ? "MAX LEVEL" : `${xp} XP (${xpToNextLevel} to next)`}
                </span>
            </div>
            <div style={{ width: "100%", height: 4, background: "rgba(21,34,56,0.8)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div animate={{ width: `${progress}%` }} style={{ height: "100%", background: color, borderRadius: 2 }} />
            </div>
            {/* Optional latest wisdom note if we passed it in */}
        </div>
    );
}

function AgentCard({ agent, isYours, rank }) {
    const meta = AGENT_META[agent.agentId] || { name: agent.name, icon: "🤖", color: "#00F0FF" };
    const roi = agent.roi ?? 0;
    const isPos = roi >= 0;
    const rankEmoji = ["🥇", "🥈", "🥉"][rank] || "";

    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
            style={{ borderColor: isYours ? meta.color : "rgba(26,30,42,0.5)", boxShadow: isYours ? `0 0 24px ${meta.color}22` : "none" }}>
            <div style={{ height: 3, background: `linear-gradient(90deg, ${meta.color}, transparent)`, opacity: isYours ? 1 : 0.4 }} />
            <div style={{ padding: "14px 16px" }}>
                {/* Row 1: name + ROI */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.3rem" }}>{meta.icon}</span>
                        <div>
                            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: meta.color, fontSize: "0.85rem" }}>{meta.name}</div>
                            {isYours && <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "#00F0FF" }}>YOUR AGENT</div>}
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: "1rem" }}>{rankEmoji}</span>
                        <span style={{
                            fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "1rem",
                            color: isPos ? "#00E676" : "#FF3B5C", textShadow: `0 0 10px ${isPos ? "rgba(0,230,118,0.4)" : "rgba(255,59,92,0.4)"}`
                        }}>
                            {isPos ? "+" : ""}{roi.toFixed(2)}%
                        </span>
                    </div>
                </div>
                {/* Row 2: balance + sparkline */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                    <div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#5A6178" }}>Balance</div>
                        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", fontSize: "0.85rem" }}>
                            ${(agent.currentBalance || 0).toFixed(3)}
                        </div>
                    </div>
                    <Sparkline history={agent.roiHistory} />
                </div>
                {/* Row 3: stats */}
                <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                    {[
                        { label: "Trades", val: agent.tradeCount || 0 },
                        { label: "Users", val: agent.userCount || "—" },
                        { label: "Pool", val: agent.pooledCapital ? `$${agent.pooledCapital.toFixed(1)}` : "—" },
                    ].map((s) => (
                        <div key={s.label}>
                            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "#5A6178" }}>{s.label}</div>
                            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#E8EAF0" }}>{s.val}</div>
                        </div>
                    ))}
                </div>
                {/* Row 4: win probability bar */}
                {agent.winProbability != null && (
                    <div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "#5A6178", marginBottom: 3 }}>Win Prob</div>
                        <WinProbBar probability={agent.winProbability} color={meta.color} />
                    </div>
                )}
                {/* 🧬 Row 5: Evolution / XP Bar */}
                {(agent.level != null) && (
                    <LevelXPBar
                        level={agent.level}
                        xp={agent.xp}
                        xpToNextLevel={agent.xpToNextLevel}
                        color={meta.color}
                    />
                )}
            </div>
        </motion.div>
    );
}

function Timer({ ms, durationSecs }) {
    const secs = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    const total = (durationSecs || 600) * 1000;
    const pct = Math.min(1, 1 - ms / total);
    const isLow = secs < 60;
    return (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
                fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "2.5rem",
                color: isLow ? "#FF3B5C" : "#00F0FF", textShadow: isLow ? "0 0 20px rgba(255,59,92,0.5)" : "0 0 20px rgba(0,240,255,0.4)"
            }}>
                {m}:{s}
            </div>
            <div style={{ width: 100, height: 3, background: "rgba(26,30,42,0.8)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div animate={{ scaleX: pct }} style={{ height: "100%", background: isLow ? "#FF3B5C" : "#00F0FF", borderRadius: 2, originX: 0 }} />
            </div>
        </div>
    );
}

export default function LiveArena() {
    const { leaderboard, remainingMs, selectedAgent, tradeLog, reasoningLog, evolutionLog, isPrivateArena, demoMode, config } = useArena();
    const explorerUrl = config?.explorerUrl;
    const durationSecs = config?.durationSeconds || 600;

    // ... inside LiveArena ...
    return (
        <div className="min-h-screen grid-bg flex flex-col px-4 py-6 relative overflow-x-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(0,82,180,0.08) 0%, transparent 70%)" }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
                    <div>
                        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "#E8EAF0" }}>
                            Arena Live
                        </h1>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: -2 }}>
                            <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF395C" }} />
                            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#FF395C", letterSpacing: "0.06em" }}>LIVE</span>
                            {demoMode && <span className="demo-banner" style={{ marginLeft: 4 }}>DEMO</span>}
                            {isPrivateArena && (
                                <span style={{
                                    marginLeft: 4, padding: "2px 8px", borderRadius: 12,
                                    background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)",
                                    fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#7C3AED"
                                }}>🔒 PRIVATE</span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Spectator link */}
                    <a href={`/spectate`} target="_blank" rel="noopener noreferrer"
                        style={{
                            fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#64748B",
                            border: "1px solid rgba(21,34,56,0.6)", padding: "4px 10px", borderRadius: 6
                        }}>
                        👁 Spectate ↗
                    </a>
                    <Timer ms={remainingMs} durationSecs={durationSecs} />
                </div>
            </div>

            {/* Leaderboard cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {leaderboard.length === 0
                    ? [0, 1, 2].map((i) => (
                        <div key={i} className="glass-card p-5 animate-pulse" style={{ height: 160, opacity: 0.3 }} />
                    ))
                    : leaderboard.map((agent, i) => (
                        <AgentCard key={agent.agentId} agent={agent}
                            isYours={agent.agentId === selectedAgent} rank={i} />
                    ))
                }
            </div>

            {/* 2-column: Trade feed + Reasoning panel */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                <div>
                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 10, fontSize: "0.85rem" }}>
                        Trade Feed
                    </div>
                    <TradeLog trades={tradeLog} explorerUrl={explorerUrl} />
                </div>
                <div>
                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", marginBottom: 10, fontSize: "0.85rem" }}>
                        {isPrivateArena ? "🔒 Strategy (Private)" : "Agent Reasoning"}
                    </div>
                    <ReasoningPanel log={[...reasoningLog, ...(evolutionLog || [])].sort((a, b) => b.timestamp - a.timestamp)} isPrivate={isPrivateArena} />
                </div>
            </div>
        </div>
    );
}
