"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/utils/api";

const ArenaContext = createContext(null);

export function ArenaProvider({ children }) {
    const { address } = useAccount();
    const ws = useWebSocket();

    const [phase, setPhase] = useState("landing");
    const [arenaId, setArenaId] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [remainingMs, setRemainingMs] = useState(0);
    const [results, setResults] = useState(null);
    const [agentSelections, setAgentSelections] = useState({});
    const [tradeLog, setTradeLog] = useState([]);
    const [demoMode, setDemoMode] = useState(false);
    const [config, setConfig] = useState(null);

    // ── New state for features 1-6 ──────────────────────────────────────────────
    const [reasoningLog, setReasoningLog] = useState([]); // [{agentId, reason, action, ...}]
    const [isPrivateArena, setIsPrivateArena] = useState(false); // current arena privacy mode
    const [veniceEnabled, setVeniceEnabled] = useState(false);   // server has VENICE_API_KEY
    const [copyTradeSession, setCopyTradeSession] = useState(null); // { sessionId, agentId, ... }
    const [copyTradeLog, setCopyTradeLog] = useState([]);
    // 🧬 Agent Evolution state
    const [evolutionLog, setEvolutionLog] = useState([]); // [{agentId, type, lesson, xp, level, ...}]
    const [agentEvolution, setAgentEvolution] = useState({}); // { [agentId]: { level, xp, xpToNextLevel, latestWisdom } }

    // Fetch config on mount
    useEffect(() => {
        api.getStatus().then((s) => {
            setDemoMode(s.demoMode);
            setVeniceEnabled(s.veniceEnabled || false);
        }).catch(() => { });
        api.getConfig().then(setConfig).catch(() => { });
    }, []);

    // Session reconnect
    useEffect(() => {
        if (!address || phase !== "landing") return;
        api.getArenaForUser(address)
            .then((data) => {
                if (data.status === "active") {
                    setArenaId(data.arenaId || data.id);
                    if (data.myAgentId) setSelectedAgent(data.myAgentId);
                    if (data.leaderboard) setLeaderboard(data.leaderboard);
                    if (data.isPrivate !== undefined) setIsPrivateArena(data.isPrivate);
                    setPhase("live");
                } else if (data.status === "waiting") {
                    setArenaId(data.arenaId || data.id);
                    if (data.myAgentId) setSelectedAgent(data.myAgentId);
                    setAgentSelections(data.agentSelections || {});
                    if (data.isPrivate !== undefined) setIsPrivateArena(data.isPrivate);
                    setPhase("waiting");
                } else if (data.status === "completed") {
                    setResults(data.results);
                    setPhase("results");
                }
            })
            .catch(() => { });
    }, [address]);

    // WebSocket listeners
    useEffect(() => {
        const unsubs = [
            ws.on("user_joined", (data) => {
                setAgentSelections(data.agentSelections || {});
                if (data.isPrivate !== undefined) setIsPrivateArena(data.isPrivate);
            }),
            ws.on("arena_started", (data) => {
                if (!arenaId || data.arenaId === arenaId) {
                    setArenaId(data.arenaId);
                    setIsPrivateArena(data.isPrivate || false);
                    setPhase("live");
                    setRemainingMs(data.durationSeconds * 1000);
                    setTradeLog([]);
                    setReasoningLog([]);
                    setEvolutionLog([]);
                    setAgentEvolution({});
                }
            }),
            ws.on("leaderboard_update", (data) => {
                if (data.arenaId === arenaId) {
                    setLeaderboard(data.leaderboard || []);
                    setRemainingMs(data.remainingMs ?? 0);
                }
            }),
            ws.on("trade_executed", (data) => {
                if (data.arenaId === arenaId) {
                    setTradeLog((p) => [data, ...p].slice(0, 50));
                }
            }),
            ws.on("agent_reasoning", (data) => {
                if (data.arenaId === arenaId && data.status === "decided") {
                    setReasoningLog((p) => [data, ...p].slice(0, 60));
                    // 🧬 Update evolution state extracted from reasoning data
                    if (data.level != null) {
                        setAgentEvolution((prev) => ({
                            ...prev,
                            [data.agentId]: {
                                level: data.level,
                                xp: data.xp,
                                xpToNextLevel: data.xpToNextLevel,
                                wisdomCount: data.wisdomCount,
                            },
                        }));
                    }
                }
            }),
            // 🧬 Evolution events
            ws.on("agent_evolution", (data) => {
                if (data.arenaId === arenaId) {
                    setEvolutionLog((p) => [data, ...p].slice(0, 30));
                    setAgentEvolution((prev) => ({
                        ...prev,
                        [data.agentId]: {
                            level: data.level,
                            xp: data.xpTotal,
                            xpToNextLevel: data.xpToNextLevel,
                            latestWisdom: data.lesson,
                            wisdomCount: (prev[data.agentId]?.wisdomCount || 0) + 1,
                        },
                    }));
                }
            }),
            ws.on("arena_ended", (data) => {
                if (data.arenaId === arenaId) {
                    setResults(data.results);
                    setPhase("results");
                }
            }),
            // Copy trade events
            ws.on("copy_trade_executed", (data) => {
                setCopyTradeLog((p) => [data, ...p].slice(0, 50));
            }),
        ];
        return () => unsubs.forEach((fn) => fn?.());
    }, [ws, arenaId]);

    // Countdown
    useEffect(() => {
        if (phase !== "live" || remainingMs <= 0) return;
        const id = setInterval(() => setRemainingMs((p) => Math.max(0, p - 1000)), 1000);
        return () => clearInterval(id);
    }, [phase, remainingMs]);

    const resetArena = useCallback(() => {
        setPhase("landing");
        setArenaId(null);
        setSelectedAgent(null);
        setLeaderboard([]);
        setRemainingMs(0);
        setResults(null);
        setAgentSelections({});
        setTradeLog([]);
        setReasoningLog([]);
        setIsPrivateArena(false);
        setCopyTradeSession(null);
        setCopyTradeLog([]);
        setEvolutionLog([]);
        setAgentEvolution({});
    }, []);

    return (
        <ArenaContext.Provider value={{
            ws,
            phase, setPhase,
            arenaId, setArenaId,
            selectedAgent, setSelectedAgent,
            leaderboard,
            remainingMs,
            results,
            agentSelections,
            tradeLog,
            reasoningLog,
            isPrivateArena, setIsPrivateArena,
            veniceEnabled,
            demoMode,
            config,
            resetArena,
            copyTradeSession, setCopyTradeSession,
            copyTradeLog,
            evolutionLog, setEvolutionLog,
            agentEvolution, setAgentEvolution,
        }}>
            {children}
        </ArenaContext.Provider>
    );
}

export function useArena() {
    const ctx = useContext(ArenaContext);
    if (!ctx) throw new Error("useArena must be used within ArenaProvider");
    return ctx;
}
