"use client";

import { ArenaProvider, useArena } from "@/context/ArenaContext";
import "@/lib/wagmi"; // Initialize AppKit
import Landing from "@/components/Landing";
import AgentSelect from "@/components/AgentSelection";
import WaitingRoom from "@/components/WaitingRoom";
import LiveArena from "@/components/LiveArena";
import Results from "@/components/Results";

function ArenaRouter() {
    const { phase } = useArena();
    return (
        <div className="min-h-screen relative" style={{ background: "#07080A" }}>
            <div className="noise-overlay" />
            {phase === "landing" && <Landing />}
            {phase === "select" && <AgentSelect />}
            {phase === "waiting" && <WaitingRoom />}
            {phase === "live" && <LiveArena />}
            {phase === "results" && <Results />}
        </div>
    );
}

export default function Home() {
    return (
        <ArenaProvider>
            <ArenaRouter />
        </ArenaProvider>
    );
}
