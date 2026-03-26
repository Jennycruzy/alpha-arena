"use client";

import { motion } from "framer-motion";

/**
 * PrivacyToggle — shown on agent selection screen when joining arena.
 * Lets users choose if the arena should use transparent (public) or
 * private (Venice) reasoning.
 */
export default function PrivacyToggle({ isPrivate, onChange, veniceEnabled = false }) {
    return (
        <div className="glass-card p-4" style={{ border: "1px solid rgba(26,30,42,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#E8EAF0", fontSize: "0.9rem" }}>
                        Arena Strategy Mode
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#5A6178", marginTop: 2 }}>
                        {isPrivate ? "Venice AI — strategy stays private" : "Public — full reasoning visible to all"}
                    </div>
                </div>
                {/* Toggle */}
                <div
                    onClick={() => onChange(!isPrivate)}
                    style={{
                        position: "relative", width: 52, height: 28, borderRadius: 14, cursor: "pointer",
                        background: isPrivate ? "rgba(168,85,247,0.25)" : "rgba(0,240,255,0.15)",
                        border: `1px solid ${isPrivate ? "rgba(168,85,247,0.5)" : "rgba(0,240,255,0.35)"}`,
                        transition: "all 0.3s",
                        flexShrink: 0,
                    }}
                >
                    <motion.div
                        animate={{ x: isPrivate ? 26 : 2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        style={{
                            position: "absolute", top: 4, width: 18, height: 18, borderRadius: "50%",
                            background: isPrivate ? "#A855F7" : "#0052B4",
                            boxShadow: isPrivate ? "0 0 8px rgba(168,85,247,0.6)" : "0 0 8px rgba(0,240,255,0.5)",
                        }}
                    />
                </div>
            </div>

            {/* Mode cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div
                    onClick={() => onChange(false)}
                    style={{
                        padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${!isPrivate ? "rgba(0,240,255,0.4)" : "rgba(26,30,42,0.5)"}`,
                        background: !isPrivate ? "rgba(0,240,255,0.05)" : "transparent",
                        transition: "all 0.2s",
                    }}
                >
                    <div style={{ fontSize: "1.1rem", marginBottom: 4, visibility: "hidden" }}>👁️</div>
                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: "0.75rem", color: !isPrivate ? "#0052B4" : "#5A6178" }}>
                        Transparent
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#5A6178", marginTop: 2 }}>
                        All reasoning visible<br />OpenAI / Claude
                    </div>
                </div>

                <div
                    onClick={() => onChange(true)}
                    style={{
                        padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${isPrivate ? "rgba(168,85,247,0.4)" : "rgba(26,30,42,0.5)"}`,
                        background: isPrivate ? "rgba(168,85,247,0.05)" : "transparent",
                        opacity: veniceEnabled || isPrivate ? 1 : 0.6,
                        transition: "all 0.2s",
                    }}
                >
                    <div style={{ fontSize: "1.1rem", marginBottom: 4 }}>🔒</div>
                    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: "0.75rem", color: isPrivate ? "#A855F7" : "#5A6178" }}>
                        Private
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "#5A6178", marginTop: 2 }}>
                        Strategy hidden<br />{veniceEnabled ? "Venice AI active" : "Venice (fallback to Claude)"}
                    </div>
                </div>
            </div>

            {isPrivate && (
                <div style={{
                    marginTop: 10, padding: "6px 10px", borderRadius: 6,
                    background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)"
                }}>
                    <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(168,85,247,0.8)", lineHeight: 1.4 }}>
                        ⚠️ Private mode: AI reasoning is processed on Venice's private infrastructure.
                        Spectators will only see trade decisions — never the strategy.
                    </p>
                </div>
            )}
        </div>
    );
}
