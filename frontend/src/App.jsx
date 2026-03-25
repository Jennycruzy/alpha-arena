import React from "react";
import { useArena } from "./context/ArenaContext";
import Landing from "./components/Landing/Landing";
import AgentSelection from "./components/AgentSelection/AgentSelection";
import WaitingRoom from "./components/WaitingRoom/WaitingRoom";
import LiveArena from "./components/LiveArena/LiveArena";
import Results from "./components/Results/Results";

export default function App() {
  const { phase } = useArena();

  return (
    <div className="min-h-screen relative">
      <div className="noise-overlay" />
      {phase === "landing" && <Landing />}
      {phase === "select" && <AgentSelection />}
      {phase === "waiting" && <WaitingRoom />}
      {phase === "live" && <LiveArena />}
      {phase === "results" && <Results />}
    </div>
  );
}
