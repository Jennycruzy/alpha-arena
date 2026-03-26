"use client";

import { motion } from "framer-motion";

export default function PrivacyToggle({ isPrivate, onChange, veniceEnabled = false }) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="font-display font-black text-2xl text-white uppercase tracking-tighter">Strategy</h4>
                    <p className="terminal-text text-primary font-black mt-1">
                        {isPrivate ? "SHIELD: ENCRYPTED" : "AUDIT: TRANSPARENT"}
                    </p>
                </div>

                {/* Toggle */}
                <div
                    onClick={() => onChange(!isPrivate)}
                    className={`relative w-14 h-7 cursor-pointer border transition-all duration-300
                        ${isPrivate ? "bg-primary/20 border-primary" : "bg-white/5 border-border"}
                    `}
                >
                    <motion.div
                        animate={{ x: isPrivate ? 28 : 2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className={`absolute top-1 w-4 h-4 shadow-[0_0_10px_rgba(0,102,255,0.4)]
                            ${isPrivate ? "bg-primary" : "bg-white/40"}
                        `}
                    />
                </div>
            </div>

            {/* Mode Cards */}
            <div className="grid grid-cols-2 gap-px bg-border border border-border">
                <div
                    onClick={() => onChange(false)}
                    className={`p-6 cursor-pointer transition-all hover:bg-white/5
                        ${!isPrivate ? "bg-primary/10" : "bg-surface"}
                    `}
                >
                    <div className={`font-display font-black text-sm uppercase tracking-widest mb-2
                        ${!isPrivate ? "text-primary" : "text-white/40"}
                    `}>
                        Transparent
                    </div>
                    <div className="font-mono text-xs text-white uppercase font-black leading-tight">
                        FULL REASONING VISIBLE
                    </div>
                </div>

                <div
                    onClick={() => onChange(true)}
                    className={`p-6 cursor-pointer transition-all hover:bg-white/5
                        ${isPrivate ? "bg-primary/10" : "bg-surface"}
                        ${!veniceEnabled && !isPrivate ? "opacity-40" : ""}
                    `}
                >
                    <div className={`font-display font-black text-sm uppercase tracking-widest mb-2
                        ${isPrivate ? "text-primary" : "text-white/40"}
                    `}>
                        Encrypted
                    </div>
                    <div className="font-mono text-xs text-white uppercase font-black leading-tight">
                        STRATEGY OBFUSCATED
                    </div>
                </div>
            </div>

            {isPrivate && (
                <div className="mt-6 p-4 border border-primary/40 bg-primary/10">
                    <p className="font-mono text-[10px] text-primary font-black uppercase tracking-widest leading-loose">
                        [CRITICAL] Private mode isolates agent logic on sovereign infrastructure. Spectators see decisions only.
                    </p>
                </div>
            )}
        </div>
    );
}
