"use client";

import { motion } from "framer-motion";
import { useArena } from "@/context/ArenaContext";

const AGENT_MAP = {
    "whale-follower": { name: "Whale Follower", icon: "WF", color: "#0066FF" },
    "momentum-trader": { name: "Momentum Trader", icon: "MT", color: "#FF4500" },
    "risk-guard": { name: "Risk Guard", icon: "RG", color: "#00E676" },
};

export default function WaitingRoom() {
    const { selectedAgent, agentSelections, arenaId, demoMode } = useArena();
    const allAgentIds = ["whale-follower", "momentum-trader", "risk-guard"];
    const filled = allAgentIds.filter((id) => (agentSelections[id] || 0) > 0).length;

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center justify-center px-6 relative bg-[#030406]">

            {demoMode && (
                <div className="absolute top-10 right-10 terminal-text text-primary border border-primary/30 px-4 py-2 bg-primary/5">
                    Simulation_Mode_Active
                </div>
            )}

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center z-10 w-full max-w-2xl">

                <div className="flex flex-col items-center mb-12">
                    <div className="w-16 h-16 border border-primary/40 bg-primary/5 flex items-center justify-center mb-6">
                        <div className="w-2 h-2 bg-primary animate-ping rounded-full" />
                    </div>
                    <h2 className="font-display font-black text-4xl md:text-5xl text-white tracking-tighter uppercase mb-4">
                        AWAITING_COMBATANTS
                    </h2>
                    <p className="terminal-text text-muted text-xs font-bold uppercase tracking-widest">Initiating sequence requires 3 synchronized strategy agents</p>
                </div>

                <div className="flex flex-col gap-px bg-border border border-border mb-12">
                    {allAgentIds.map((id, i) => {
                        const meta = AGENT_MAP[id];
                        const count = agentSelections[id] || 0;
                        const isFilled = count > 0;
                        const isYours = id === selectedAgent;
                        return (
                            <div key={id} className={`flex items-center justify-between p-10 bg-surface transition-all
                                ${isYours ? "bg-primary/5" : ""}
                            `}>
                                <div className="flex items-center gap-8">
                                    <div className="w-12 h-12 border border-border bg-black flex items-center justify-center font-mono font-bold text-sm" style={{ color: meta.color }}>
                                        {meta.icon}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-display font-bold text-white uppercase tracking-wider text-lg">
                                            {meta.name}
                                        </div>
                                        {isYours && <div className="terminal-text text-primary mt-1 font-bold text-xs uppercase tracking-widest">LINKED_AGENT</div>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 ${isFilled ? "bg-success" : "bg-white/10 animate-pulse"}`} />
                                    <span className={`terminal-text ${isFilled ? "text-success" : "text-muted"}`}>
                                        {isFilled ? `ACTIVE` : "WAITING..."}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="w-full h-1 bg-white/5 relative overflow-hidden mb-12">
                    <motion.div className="absolute top-0 bottom-0 left-0 bg-primary"
                        animate={{ width: `${(filled / 3) * 100}%` }} transition={{ duration: 1 }} />
                </div>

                {arenaId && (
                    <div className="flex items-center justify-between border-t border-border pt-6">
                        <div className="terminal-text text-muted">Arena_ID: {arenaId}</div>
                        <div className="terminal-text text-muted/30">PENDING_INIT</div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
