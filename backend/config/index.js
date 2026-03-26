import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Auto-detect demo mode: true if keys are missing
const missingKeys = [];
if (!process.env.OKX_API_KEY) missingKeys.push("OKX_API_KEY");
if (!process.env.OKX_SECRET_KEY) missingKeys.push("OKX_SECRET_KEY");
if (!process.env.OKX_PASSPHRASE) missingKeys.push("OKX_PASSPHRASE");
if (!process.env.ARENA_WALLET_PRIVATE_KEY) missingKeys.push("ARENA_WALLET_PRIVATE_KEY");
if (!process.env.ARENA_WALLET_ADDRESS) missingKeys.push("ARENA_WALLET_ADDRESS");
if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) missingKeys.push("OPENAI_API_KEY or ANTHROPIC_API_KEY");

const requestedDemo = process.env.DEMO_MODE === "true";
const demoMode = requestedDemo;

if (!requestedDemo && missingKeys.length > 0) {
  console.warn(`\n⚠️  PRODUCTION MODE — missing critical env vars: ${missingKeys.join(", ")}`);
  console.warn(`   Server will refuse to start until real keys are provided.\n`);
}

const config = {
  port: parseInt(process.env.PORT || "4000"),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
  demoMode,

  // OKX
  okx: {
    apiKey: process.env.OKX_API_KEY || "",
    secretKey: process.env.OKX_SECRET_KEY || "",
    passphrase: process.env.OKX_PASSPHRASE || "",
    projectId: process.env.OKX_PROJECT_ID || "",
    baseUrl: "https://www.okx.com",
  },

  // AI
  ai: {
    provider: process.env.AI_PROVIDER || "openai",
    openaiKey: process.env.OPENAI_API_KEY || "",
    anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  },

  // Blockchain — X Layer mainnet, gas in OKB
  chain: {
    id: parseInt(process.env.CHAIN_ID || "196"),
    rpcUrl: process.env.RPC_URL || "https://rpc.xlayer.tech",
    explorerUrl: process.env.EXPLORER_URL || "https://www.okx.com/explorer/xlayer",
  },

  // Arena wallet (operator — holds OKB for gas)
  arenaWallet: {
    privateKey: process.env.ARENA_WALLET_PRIVATE_KEY || ("0x" + "1".repeat(64)), // dummy key in demo
    address: process.env.ARENA_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000",
  },

  // ArenaVault contract (deployed on X Layer)
  arenaVaultAddress: process.env.ARENA_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000",

  // Competition rules
  competition: {
    entryFeeUsd: parseFloat(process.env.ENTRY_FEE_USD || "0.5"),   // 0.5 USDC minimum
    durationSeconds: parseInt(process.env.COMPETITION_DURATION_SECONDS || "300"), // 5 mins
    agentLoopIntervalSeconds: parseInt(process.env.AGENT_LOOP_INTERVAL_SECONDS || "25"),
    leaderboardUpdateSeconds: parseInt(process.env.LEADERBOARD_UPDATE_INTERVAL_SECONDS || "5"),
    maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || "2"),
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || "10"),
  },

  // Token addresses on X Layer mainnet
  tokens: {
    USDC: process.env.USDC_ADDRESS || "0x74b7f16337b8972027f6196a17a631ac6de26d22",
    WETH: process.env.WETH_ADDRESS || "0x5a77f1443d16ee5761d310e38b7e24ce946cf484",
    WBTC: process.env.WBTC_ADDRESS || "0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1",
    OKB: process.env.OKB_ADDRESS || "0x0000000000000000000000000000000000000000",
  },

  tradingPairs: [
    { base: "WETH", quote: "USDC", label: "ETH/USDC" },
    { base: "WBTC", quote: "USDC", label: "BTC/USDC" },
    { base: "OKB", quote: "USDC", label: "OKB/USDC" },
  ],
};

// In non-demo mode, validate critical keys
export function validateConfig() {
  if (config.demoMode) {
    console.log("🟡 Running in DEMO MODE — no real trades will be executed.\n");
    return;
  }
  const required = [
    ["okx.apiKey", config.okx.apiKey],
    ["okx.secretKey", config.okx.secretKey],
    ["okx.passphrase", config.okx.passphrase],
    ["arenaWallet.privateKey", config.arenaWallet.privateKey],
    ["arenaWallet.address", config.arenaWallet.address],
  ];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (!config.ai.openaiKey && !config.ai.anthropicKey) missing.push("OPENAI_API_KEY or ANTHROPIC_API_KEY");
  if (missing.length > 0) {
    console.error(`❌ Missing required config:\n  ${missing.join("\n  ")}`);
    console.error("   Copy .env.example to .env and fill in your keys, or set DEMO_MODE=true");
    process.exit(1);
  }
}

export default config;
