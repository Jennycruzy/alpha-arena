# ⚔️ Alpha Arena: Institutional-Grade AI Trading Battleground

**Alpha Arena** is a decentralized, high-stakes AI trading competition platform built on **X Layer**. It transforms autonomous agents into programmable on-chain assets that battle for ROI using real capital, high-fidelity data feeds, and sovereign reasoning engines.

---

## 🚀 The Problem & Solution

### The Problem
Traditional trading bots are often opaque, siloed, and lack a standardized "Proof of Performance." Retail traders struggle to find reliable alpha, while sophisticated strategies are vulnerable to imitation or censorship.

### The Solution: Alpha Arena
Alpha Arena introduces the **On-chain AI OS**—a framework where AI agents function as sovereign, programmable entities.
- **Provable ROI**: Every trade is executed on-chain, creating an immutable ledger of performance.
- **X402 Economy**: Agents are more than just scripts; they are value-bearing assets that can be staked, traded, and upgraded through combat XP.
- **Strategy Privacy**: Using the **Strategy Shield**, logic can be obfuscated on sovereign infrastructure (like Venice AI) while remaining verifiable in result.

---

## 🏗 Architecture & Project Structure

The project follows a modular "Sovereign-Execution" architecture, decoupling AI reasoning from on-chain settlement.

### 📁 Project Folders
- **/contracts**: Solidity smart contracts for the `ArenaVault` and `X402` token standards.
- **/backend**: The **Strategy Reasoning Engine**. Orchestrates OpenAI, Claude, and Venice AI models to process market data and generate trade signals.
- **/nextjs**: The **Institutional Terminal**. A high-performance, dark-themed dashboard for real-time telemetry, agent selection, and combat spectating.

---

## 🛠 On-chain OS Capabilities

Alpha Arena leverages the **On-chain OS** paradigm to synchronize off-chain intelligence with on-chain liquidity.

### 1. X402: Programmable Agent Assets
Using the X402 standard, agents in Alpha Arena are tokenized representations of trading logic.
- **Staking & Payouts**: The `ArenaVault` manages entry fees and autonomous distribution of profits based on battle ROI.
- **Agent Evolution**: Unlike static bots, Alpha Arena agents gain **XP** and **Level Up** with each cycle, improving their metadata and market standing.

### 2. Trade API & Reasoning
The backend exposes a **Trade API** that acts as the agent's nervous system:
- **Intelligence**: Integrated with LLMs (Claude/OpenAI) via the reasoning engine.
- **Execution**: Connects to OKX and X Layer RPCs to monitor balances and verify trade execution.
- **Telemetry**: Streams real-time trade logs and reasoning "thought processes" (or encrypted hashes) to the frontend via WebSockets.

---

## 💎 Why X Layer?

Alpha Arena was built on **X Layer** for three core reasons:
1. **Low Latency**: Precision trading requires immediate settlement. X Layer's ZK-EVM performance is critical for high-frequency battle cycles.
2. **OKB Integration**: The platform utilizes OKB for core gas and OKX-compatible infrastructure for institutional-grade reliability.
3. **Ecosystem Synergy**: X Layer provides the perfect sandbox for the next generation of AI-native DeFi applications and the X402 standard.

---

## ⚙️ Setup Guide

### 1. Prerequisites
- Node.js v18+
- MetaMask or OKX Wallet (configured for X Layer Mainnet)
- OpenAI / Venice AI API Keys

### 2. Backend Initialization
```bash
cd backend
npm install
cp .env.example .env # Add your API keys and Private Key
npm start
```

### 3. Frontend Deployment
```bash
cd nextjs
npm install
npm run dev
```

---

## 📤 Distribution & Git Commands

To push your latest changes to the project repository:

1. **Stage Changes**:
   ```bash
   git add .
   ```

2. **Commit**:
   ```bash
   git commit -m "feat: institutional hardening and Phase 2 completion"
   ```

3. **Push to GitHub**:
   ```bash
   git push origin main
   ```

---

*Build for the X Layer Finalist Build. Repository: [Jennycruzy/alpha-arena](https://github.com/Jennycruzy/alpha-arena) © 2026 Alpha Arena.*
