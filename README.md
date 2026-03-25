# ⚔️ Alpha Arena — AI Trading Battleground

Real AI agents. Real funds. Real competition. On X Layer mainnet.

Alpha Arena is a paid AI trading competition where users pay an entry fee, choose an AI trading agent, and watch autonomous agents battle with real on-chain swaps. Winners receive their capital plus profits.

---

## Architecture

```
alpha-arena/
├── .env.example            # Environment template (copy to .env)
├── .gitignore
├── package.json            # Root monorepo scripts
├── backend/
│   ├── package.json
│   ├── config/
│   │   └── index.js        # Config loader + validation
│   └── src/
│       ├── index.js         # Express + WebSocket server entry
│       ├── agents/
│       │   ├── BaseAgent.js      # Core agent loop (fetch→reason→trade)
│       │   ├── WhaleFollower.js  # Whale signal strategy
│       │   ├── MomentumTrader.js # Trending token strategy
│       │   ├── RiskGuard.js      # Capital preservation strategy
│       │   └── index.js          # Agent factory + metadata
│       ├── arena/
│       │   └── ArenaManager.js   # Competition lifecycle orchestrator
│       ├── blockchain/
│       │   └── chain.js          # ethers.js provider, swaps, balances
│       ├── payments/
│       │   └── PaymentService.js # x402 entry fee processing
│       ├── routes/
│       │   └── api.js            # REST API endpoints
│       └── utils/
│           ├── aiService.js      # OpenAI / Anthropic reasoning
│           ├── logger.js         # Winston logger
│           └── okxClient.js      # OKX OnchainOS API client
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # Phase-based routing
│       ├── context/
│       │   └── ArenaContext.jsx   # Global state + WebSocket events
│       ├── hooks/
│       │   ├── useWallet.js      # MetaMask / OKX Wallet connection
│       │   └── useWebSocket.js   # Live arena updates
│       ├── utils/
│       │   └── api.js            # HTTP API client
│       ├── styles/
│       │   └── index.css         # Tailwind + custom styles
│       └── components/
│           ├── Landing/Landing.jsx
│           ├── AgentSelection/AgentSelection.jsx
│           ├── WaitingRoom/WaitingRoom.jsx
│           ├── LiveArena/LiveArena.jsx
│           └── Results/Results.jsx
└── contracts/                    # (Future: Solidity arena contracts)
    └── src/
```

---

## Prerequisites

- **Node.js** v18+ and npm
- **MetaMask** or **OKX Wallet** browser extension
- **OKX OnchainOS** API credentials (api key, secret, passphrase, project ID)
- **OpenAI** or **Anthropic** API key (for AI agent reasoning)
- **Arena wallet** — a dedicated hot wallet with USDC on X Layer mainnet

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd alpha-arena

# Install root dependencies (concurrently)
npm install

# Install backend + frontend dependencies
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in ALL required values:

```env
# OKX OnchainOS — get from https://www.okx.com/web3/build
OKX_API_KEY=your_key
OKX_SECRET_KEY=your_secret
OKX_PASSPHRASE=your_passphrase
OKX_PROJECT_ID=your_project_id

# AI provider — at least one is required
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=openai  # or "anthropic"

# Arena hot wallet (holds competition funds)
# Generate a NEW wallet for this. NEVER use a personal wallet.
ARENA_WALLET_PRIVATE_KEY=0x...
ARENA_WALLET_ADDRESS=0x...
```

### 3. Fund the arena wallet

The arena wallet on X Layer mainnet needs:
- **USDC** (for trading capital)
- **OKB** (for gas fees on X Layer)

Send both to your `ARENA_WALLET_ADDRESS` before running competitions.

### 4. Run in development

```bash
# Start both backend (port 4000) and frontend (port 5173)
npm run dev
```

Or run separately:

```bash
# Terminal 1 — Backend
npm run dev:backend

# Terminal 2 — Frontend
npm run dev:frontend
```

### 5. Open the app

Navigate to `http://localhost:5173`

---

## How It Works

### Competition Flow

1. **Connect wallet** — User connects MetaMask/OKX Wallet, switches to X Layer
2. **Pay entry fee** — $10 USDC transferred to arena wallet via x402
3. **Choose agent** — Pick Whale Follower, Momentum Trader, or Risk Guard
4. **Wait for arena** — Competition starts when all 3 agents have ≥1 user
5. **Agents trade live** — Autonomous 25-second cycles for 10 minutes
6. **Leaderboard updates** — Live ROI tracking every 5 seconds via WebSocket
7. **Winner determined** — Highest ROI agent wins
8. **Payouts distributed** — Winners get capital + proportional profits

### Agent Strategies

| Agent | Strategy | Data Source | Risk |
|-------|----------|-------------|------|
| 🐋 Whale Follower | Copy large wallet moves | `okx-dex-signal` | Medium-High |
| 🚀 Momentum Trader | Ride trending tokens | `okx-dex-market` | High |
| 🛡️ Risk Guard | Preserve capital | `okx-security` | Low |

### Agent Trading Loop (every 25s)

```
1. Fetch market data (OKX OnchainOS APIs)
2. AI reasoning (GPT-4o or Claude Sonnet)
3. Decide: BUY / SELL / HOLD
4. Security scan on target token
5. Simulate swap via eth_call
6. Execute real swap via OKX DEX Aggregator
7. Update balance
8. Repeat
```

### Safety Rules

- Max 1 trade per 25 seconds per agent
- Max 2% slippage on all swaps
- Whitelisted tokens only (ETH, BTC, OKB vs USDC)
- Security scan before every buy
- Transaction simulation before execution
- -15% stop loss triggers HOLD mode

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/config` | Public config (entry fee, chain, agents) |
| GET | `/api/agents` | Available agent metadata |
| GET | `/api/arena/current` | Current waiting arena status |
| GET | `/api/arena/:id` | Specific arena status + leaderboard |
| GET | `/api/arenas` | All arenas (history) |
| POST | `/api/payment/intent` | Create x402 payment intent |
| POST | `/api/payment/verify` | Verify on-chain payment |
| POST | `/api/arena/join` | Join arena with chosen agent |

### WebSocket Events (ws://localhost:4000/ws)

| Event | Direction | Description |
|-------|-----------|-------------|
| `arena_state` | Server → Client | Current arena on connect |
| `user_joined` | Server → Client | New user joined + selections |
| `arena_started` | Server → Client | Competition started |
| `leaderboard_update` | Server → Client | Live rankings (every 5s) |
| `arena_ended` | Server → Client | Final results + payouts |
| `ping` / `pong` | Bidirectional | Keep-alive |

---

## Production Deployment

### Backend

```bash
cd backend
npm install --production
NODE_ENV=production node src/index.js
```

### Frontend

```bash
cd frontend
npm run build
# Serve dist/ with nginx, Vercel, or Cloudflare Pages
```

### Production Checklist

- [ ] Dedicated arena wallet (never personal)
- [ ] Sufficient USDC + OKB in arena wallet
- [ ] Real OKX OnchainOS credentials
- [ ] Payment verification on-chain (not dev bypass)
- [ ] Rate limiting on API endpoints
- [ ] HTTPS + WSS in production
- [ ] Monitoring + alerting on agent failures
- [ ] Audit logging for all trades
- [ ] Multi-sig or time-locked payout contracts (future)

---

## OKX OnchainOS Skills Used

| Skill | Purpose |
|-------|---------|
| `okx-dex-token` | Token metadata and info |
| `okx-dex-market` | Trending tokens, price feeds |
| `okx-dex-signal` | Whale tracking signals |
| `okx-dex-swap` | DEX aggregator for real swaps |
| `okx-onchain-gateway` | Transaction execution |
| `okx-agentic-wallet` | Wallet management |
| `okx-wallet-portfolio` | Portfolio balances |
| `okx-security` | Token security scanning |
| `okx-x402-payment` | Entry fee processing |
| `okx-audit-log` | Trade audit trail |

---

## Development Notes

- **Dev mode** skips real x402 payment verification (set `NODE_ENV=development`)
- Agents share a single arena wallet in MVP — production should use sub-accounts or per-agent wallets
- The OKX API endpoints in `okxClient.js` may need path adjustments based on the latest OnchainOS documentation
- Token addresses in `.env.example` are placeholders — verify against X Layer mainnet contracts
- For local testing without real funds, you can mock the `executeSwap` function in `chain.js`

---

## License

MIT
