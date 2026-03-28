import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";
import config, { validateConfig } from "../config/index.js";
import apiRoutes from "./routes/api.js";
import { arenaManager } from "./arena/ArenaManager.js";
import logger from "./utils/logger.js";

// Validate environment
validateConfig();

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// API routes
app.use("/api", apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`[Global Error] ${err.stack}`);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    path: req.path,
    timestamp: Date.now()
  });
});

// HTTP server
const server = http.createServer(app);

// WebSocket server (same port)
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  logger.info("WebSocket client connected");
  arenaManager.addWsClient(ws);

  // Send current arena state on connect
  const arena = arenaManager.getWaitingArena();
  if (arena) {
    ws.send(
      JSON.stringify({
        event: "arena_state",
        data: {
          arenaId: arena.id,
          status: arena.status,
          userCount: arena.users.length,
          agentSelections: arenaManager._getAgentSelections(arena),
        },
        timestamp: Date.now(),
      })
    );
  }

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.event === "ping") {
        ws.send(JSON.stringify({ event: "pong", timestamp: Date.now() }));
      }
    } catch {
      // ignore malformed messages
    }
  });
});

server.listen(config.port, "0.0.0.0", () => {
  logger.info(`
╔══════════════════════════════════════════╗
║         ⚔️  ALPHA ARENA  ⚔️              ║
║  AI Trading Battleground — X Layer       ║
╠══════════════════════════════════════════╣
║  PORT:  ${config.port}                             ║
║  REST:  /api                             ║
║  WS:    /ws                              ║
║  Chain: X Layer (${config.chain.id})                ║
║  Entry: $${config.competition.entryFeeUsd} USDC                       ║
║  Mode:  ${config.nodeEnv.toUpperCase().padEnd(18)}       ║
╚══════════════════════════════════════════╝
  `);
});
