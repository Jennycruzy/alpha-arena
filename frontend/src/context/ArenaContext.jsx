import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useWallet } from "../hooks/useWallet";
import { useWebSocket } from "../hooks/useWebSocket";

const ArenaContext = createContext(null);

export function ArenaProvider({ children }) {
  const wallet = useWallet();
  const ws = useWebSocket();

  const [phase, setPhase] = useState("landing"); // landing | select | waiting | live | results
  const [arenaId, setArenaId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [results, setResults] = useState(null);
  const [agentSelections, setAgentSelections] = useState({});

  // WebSocket event listeners
  useEffect(() => {
    const unsubs = [
      ws.on("arena_state", (data) => {
        setArenaId(data.arenaId);
        setAgentSelections(data.agentSelections || {});
      }),
      ws.on("user_joined", (data) => {
        setAgentSelections(data.agentSelections || {});
      }),
      ws.on("arena_started", (data) => {
        if (data.arenaId === arenaId || phase === "waiting") {
          setArenaId(data.arenaId);
          setPhase("live");
          setRemainingMs(data.durationSeconds * 1000);
        }
      }),
      ws.on("leaderboard_update", (data) => {
        setLeaderboard(data.leaderboard || []);
        setRemainingMs(data.remainingMs || 0);
      }),
      ws.on("arena_ended", (data) => {
        setResults(data.results);
        setPhase("results");
      }),
    ];
    return () => unsubs.forEach((fn) => fn?.());
  }, [ws, arenaId, phase]);

  // Countdown timer (client-side between WS updates)
  useEffect(() => {
    if (phase !== "live" || remainingMs <= 0) return;
    const interval = setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, remainingMs]);

  const resetArena = useCallback(() => {
    setPhase("landing");
    setArenaId(null);
    setSelectedAgent(null);
    setLeaderboard([]);
    setRemainingMs(0);
    setResults(null);
    setAgentSelections({});
  }, []);

  return (
    <ArenaContext.Provider
      value={{
        wallet,
        ws,
        phase,
        setPhase,
        arenaId,
        setArenaId,
        selectedAgent,
        setSelectedAgent,
        leaderboard,
        remainingMs,
        results,
        agentSelections,
        resetArena,
      }}
    >
      {children}
    </ArenaContext.Provider>
  );
}

export function useArena() {
  const ctx = useContext(ArenaContext);
  if (!ctx) throw new Error("useArena must be used within ArenaProvider");
  return ctx;
}
