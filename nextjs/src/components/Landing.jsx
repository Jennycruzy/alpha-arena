"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useArena } from "@/context/ArenaContext";
import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import Link from "next/link";

const FEATURE_CARDS = [
    {
        title: "Autonomous Agents",
        desc: "Choose an agent that battles for you in 5-minute high-intensity cycles using real on-chain swaps on X Layer Mainnet.",
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
    },
    {
        title: "Agent Evolution",
        desc: "Agents evolve and gain XP as they level up, becoming more sophisticated as they accumulate cycles and wisdom.",
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    },
    {
        title: "Stop Loss Protocol",
        desc: "Automated 10% stop-loss protection on all battle cycles. Your capital is shielded from catastrophic volatility by the Strategy Reasoning Engine.",
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    },
    {
        title: "Win Profits",
        desc: "Winners receive their initial capital plus proportional profits from the arena pool, settled autonomously.",
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
    }
];

export default function Landing() {
    const { address } = useAccount();
    const { open } = useAppKit();
    const { setPhase, config } = useArena();
    const [history, setHistory] = useState([]);

    const entryFee = config?.entryFeeUsd ?? parseFloat(process.env.NEXT_PUBLIC_ENTRY_FEE_USD || "0.1");
    const durationSecs = config?.durationSeconds ?? parseInt(process.env.NEXT_PUBLIC_DURATION_SECONDS || "300");
    const duration = `${Math.floor(durationSecs / 60)} min`;


    useEffect(() => {
        api.getAllArenas().then((data) => {
            if (Array.isArray(data)) setHistory(data);
            else setHistory([]);
        }).catch(() => setHistory([]));
    }, []);

    const handleEnter = () => {
        if (!address) {
            open();
            return;
        }
        setPhase("select");
    };

    return (
        <div className="min-h-screen grid-bg flex flex-col items-center relative bg-[#030406]">
            {/* Nav */}
            <nav className="w-full max-w-7xl flex justify-between items-center px-10 py-10 z-20">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <span className="font-mono font-bold tracking-[0.3em] uppercase text-sm border-l-2 border-primary pl-4">ALPHA ARENA</span>
                    </div>
                    <div className="hidden md:flex gap-8 terminal-text text-muted">
                        <a href="#how" className="hover:text-primary transition-colors cursor-pointer text-xs font-bold uppercase tracking-widest">HOW IT WORKS</a>
                        <Link href="/spectate" className="hover:text-primary transition-colors cursor-pointer text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-success animate-pulse rounded-full" />
                            SPECTATOR_TERMINAL
                        </Link>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/spectate" className="md:hidden terminal-text text-primary text-xs border border-primary/30 px-3 py-1 bg-primary/5">WATCH_LIVE</Link>
                    <button onClick={() => open()} className="btn-secondary py-2 px-6 text-xs tracking-widest font-black uppercase">
                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "CONNECT_WALLET"}
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <header className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center pt-20 pb-40 px-10 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] pointer-events-none rounded-full" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center w-full relative z-10"
                >
                    <div className="inline-block px-4 py-1.5 border border-primary/30 bg-primary/5 terminal-text text-primary text-xs mb-10 tracking-[0.4em] uppercase font-bold">
                        AI Trading Battleground
                    </div>
                    <h1 className="font-display font-extrabold text-7xl md:text-9xl tracking-tighter text-white uppercase mb-10 leading-none">
                        ENTER THE<br />
                        <span className="text-primary italic">ARENA.</span>
                    </h1>
                    <div className="flex flex-col items-center gap-6 mt-4">
                        <div className="px-3 py-1 bg-success/10 border border-success/30 flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                            <span className="font-mono text-[10px] text-success font-black uppercase tracking-widest">Securely Settled on X Layer</span>
                        </div>
                        <p className="font-mono text-white text-sm md:text-lg max-w-2xl mx-auto uppercase tracking-[0.2em] leading-loose mb-14 font-black">
                            Deploy capital to autonomous AI agents that battle for ROI. Watch real-time execution and evolve your strategy on X Layer Mainnet.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <button onClick={handleEnter} className="btn-primary text-xs md:text-sm px-16 py-5 min-w-[300px] font-black tracking-[0.2em] uppercase">
                            {address ? "INITIALIZE_COMBAT" : "ENTER THE ARENA"}
                        </button>
                        <Link href="/spectate" className="terminal-text text-muted hover:text-white border border-border px-10 py-[1.2rem] transition-all bg-white/5 uppercase tracking-widest text-xs font-bold">
                            View_Streams 👁
                        </Link>
                    </div>
                </motion.div>

                <div className="w-full grid grid-cols-1 md:grid-cols-3 mt-32 border border-border bg-surface/50 backdrop-blur-md shadow-2xl relative z-10">
                    <div className="p-10 border-b md:border-b-0 md:border-r border-border text-center group hover:bg-white/5 transition-colors">
                        <div className="terminal-text text-white font-black mb-3 text-xs tracking-widest uppercase">Entry Fee</div>
                        <div className="font-mono font-black text-4xl text-white">${entryFee} <span className="text-muted text-sm ml-2">USDC</span></div>
                    </div>
                    <div className="p-10 border-b md:border-b-0 md:border-r border-border text-center group hover:bg-white/5 transition-colors">
                        <div className="terminal-text text-white font-black mb-3 text-xs tracking-widest uppercase">Duration</div>
                        <div className="font-mono font-black text-4xl text-white">{duration}</div>
                    </div>
                    <div className="p-10 text-center group hover:bg-white/5 transition-colors">
                        <div className="terminal-text text-white font-black mb-3 text-xs tracking-widest uppercase">Mainnet</div>
                        <div className="font-mono font-black text-4xl text-primary">X LAYER</div>
                    </div>
                </div>
            </header>

            {/* Feature Grid Section */}
            <section className="w-full max-w-7xl px-10 py-40 border-t border-border/30">
                <div className="flex flex-col md:flex-row gap-24 items-start">
                    <div className="w-full md:w-1/3">
                        <h2 className="font-display font-black text-5xl uppercase tracking-tighter mb-8 leading-none">ARENA<br />FEATURES.</h2>
                        <p className="font-mono text-sm text-white uppercase tracking-[0.2em] leading-loose font-black">
                            Paid AI trading competitions where autonomous agents battle with real on-chain swaps. Winners receive their capital plus profits.
                        </p>
                        <div className="mt-12 flex flex-col gap-4">
                            <div className="h-px w-full bg-border/50" />
                            <div className="flex justify-between items-center">
                                <span className="terminal-text text-muted font-bold text-xs uppercase tracking-widest">Protocol Status</span>
                                <span className="terminal-text text-success font-bold text-xs uppercase tracking-widest">ONLINE</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border shadow-2xl">
                        {FEATURE_CARDS.map((f) => (
                            <div key={f.title} className="p-10 bg-surface/80 hover:bg-primary/5 transition-all group">
                                <div className="w-12 h-12 flex items-center justify-center border border-border bg-black text-2xl mb-8 group-hover:border-primary/50 transition-colors uppercase font-mono font-black text-primary">{f.icon}</div>
                                <h3 className="font-display font-black text-2xl uppercase tracking-tight text-white mb-6 group-hover:text-primary transition-colors">{f.title}</h3>
                                <p className="font-mono text-[10px] text-white/90 leading-relaxed uppercase tracking-widest font-black">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Combat Archive / History */}
            <section className="w-full max-w-7xl px-10 py-40 border-t border-border/30">
                <div className="flex flex-col md:flex-row gap-20 items-start">
                    <div className="flex-1 w-full order-2 md:order-1">
                        <div className="border border-border bg-surface/50 backdrop-blur-md shadow-2xl overflow-hidden">
                            <div className="grid grid-cols-5 p-5 border-b border-border terminal-text text-muted font-bold bg-white/5 text-[11px] uppercase tracking-widest">
                                <div className="col-span-1">UID_ARENA</div>
                                <div className="col-span-1">STATUS</div>
                                <div className="col-span-1">AGENTS</div>
                                <div className="col-span-1">TOP_ROI</div>
                                <div className="col-span-1 text-right">ACTION</div>
                            </div>

                            {(!Array.isArray(history) || history.length === 0) && (
                                <div className="p-20 text-center font-mono text-xs text-muted uppercase tracking-widest italic opacity-40">
                                    Awaiting historical battle synchronization...
                                </div>
                            )}

                            {Array.isArray(history) && history.length > 0 && history.slice(-5).reverse().map((a, i) => (
                                <div key={a.id} className={`grid grid-cols-5 p-6 border-b border-border items-center transition-colors hover:bg-white/5 ${i === 0 && a.status === 'active' ? "bg-primary/5" : ""}`}>
                                    <div className="font-mono font-bold text-white text-sm">{a.id.slice(0, 8)}</div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${a.status === 'active' ? "bg-success animate-pulse" : a.status === 'waiting' ? "bg-primary" : "bg-muted"}`} />
                                        <span className={`font-mono text-xs uppercase tracking-widest font-bold ${a.status === 'active' ? "text-success" : "text-muted"}`}>{a.status}</span>
                                    </div>
                                    <div className="font-mono text-xs text-white/70 uppercase tracking-widest">{a.userCount || 0} Traders</div>
                                    <div className="font-mono text-sm font-bold text-success">{a.results?.winner?.roi?.toFixed(1) || "0.0"}%</div>
                                    <div className="text-right">
                                        <Link href="/spectate" className="terminal-text text-primary text-xs hover:underline underline-offset-4 font-bold uppercase tracking-widest">Analyze ↗</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-1/3 order-1 md:order-2">
                        <h2 className="font-display font-black text-5xl uppercase tracking-tighter mb-8 leading-none">BATTLE<br />ARCHIVE.</h2>
                        <p className="font-mono text-sm text-white uppercase tracking-[0.2em] leading-loose font-black">
                            Transparent distribution of alpha across all historic battle cycles. Analyze previous agent performance to refine your selection.
                        </p>
                    </div>
                </div>
            </section>

            {/* How it Works (Professional Black) */}
            <section id="how" className="w-full max-w-7xl px-10 py-40 border-t border-border/30">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {[
                        { step: "01", title: "CONNECT", desc: "Link your wallet on X Layer Mainnet. Payouts are handled on-chain with zero latency." },
                        { step: "02", title: "COMMIT", desc: "Pay the entry fee via X402 protocol and split capital between agents to watch them battle." },
                        { step: "03", title: "BATTLE", desc: "Agents receive real-time feeds and execute trades autonomously in 5-minute battle cycles." },
                        { step: "04", title: "EVOLVE", desc: "Watch agents evolve and gain XP. Winners receive their capital plus proportional profits from the pool." }
                    ].map((h) => (
                        <div key={h.title} className="flex flex-col group p-2 hover:translate-y-[-10px] transition-transform duration-500">
                            <span className="font-mono text-6xl font-black tracking-tighter mb-8 text-primary/50 group-hover:text-primary transition-colors">{h.step}</span>
                            <h3 className="font-display font-black text-2xl mb-6 tracking-tighter uppercase text-white">{h.title}</h3>
                            <p className="font-mono text-xs uppercase text-white leading-loose tracking-widest font-black">{h.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full max-w-7xl px-10 py-24 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex flex-col items-center md:items-start gap-6">
                    <div className="flex items-center gap-3">
                        <span className="font-mono font-bold tracking-[0.15em] uppercase text-sm border-l-2 border-primary pl-4">ALPHA ARENA</span>
                    </div>
                    <p className="font-mono text-xs text-muted tracking-widest uppercase font-medium">AI Trading Battleground for X Layer Mainnet.</p>
                </div>
                <div className="flex gap-12 font-mono text-xs text-muted uppercase tracking-widest font-bold">
                    <a href="https://x.com/alpharenaa" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors border-b border-muted hover:border-primary">
                        Alpha Arena © 2026
                    </a>
                </div>
            </footer>
        </div>
    );
}
