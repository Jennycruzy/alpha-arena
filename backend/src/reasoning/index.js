/**
 * Reasoning Adapter Index
 *
 * Two providers only:
 *   PUBLIC  → OpenAI (gpt-4o) OR Claude (claude-3-5-sonnet) — pick one via AI_PROVIDER env
 *   PRIVATE → Venice API (reasoning stays on-device, never exposed)
 *
 * Return format (always consistent):
 * {
 *   action:     "BUY" | "SELL" | "HOLD" | "LONG" | "SHORT",
 *   token:      "WETH" | "WBTC" | "OKB",
 *   size:       number,
 *   confidence: number,
 *   reason?:    string  (public only — undefined in private mode),
 *   provider:   "openai" | "claude" | "venice" | "demo",
 *   isPrivate:  boolean,
 * }
 */
import config from "../../config/index.js";
import logger from "../utils/logger.js";

// ─── Demo mode mock ───────────────────────────────────────────────────────────
let _counter = 0;
const DEMO_REASONS = {
    "whale-follower": [
        "Detected smart money buy of OKB (+$2.3M in 4h)",
        "Whale wallet clustering: 3 large wallets buying WETH simultaneously",
        "Mempool signal: institutional flow into BTC on-chain",
    ],
    "momentum-trader": [
        "OKB RSI crossed 60 with 2.3x volume spike — momentum confirmed",
        "WETH breaking 4h resistance with strong bullish engulfing",
        "Trend acceleration: price above 20/50 EMA crossover",
    ],
    "risk-guard": [
        "Volatility within bounds — opening small 12% position",
        "Preserving capital: tight stop-loss set at 3%, blue-chip only",
        "Rebalancing: reducing OKB exposure, adding USDC buffer",
    ],
};

function mockReason(agentId, isPrivate) {
    _counter++;
    const biases = {
        "whale-follower": ["BUY", "LONG", "HOLD"],
        "momentum-trader": ["BUY", "LONG", "SHORT"],
        "risk-guard": ["HOLD", "HOLD", "SHORT"],
    };
    const tokens = ["WETH", "WBTC", "OKB"];
    const pool = biases[agentId] || ["BUY", "SELL", "HOLD", "LONG", "SHORT"];
    const action = pool[_counter % pool.length];
    const token = tokens[(_counter + ((agentId && agentId.length) || 0)) % 3];
    const conf = parseFloat((0.55 + ((_counter * 7) % 30) / 100).toFixed(2));
    const reasons = DEMO_REASONS[agentId] || ["Analyzing market conditions..."];

    return {
        action, token, size: parseFloat((conf * 0.3).toFixed(2)), confidence: conf,
        reason: isPrivate ? undefined : reasons[_counter % reasons.length],
        provider: "demo",
        isPrivate,
    };
}

/**
 * Main reasoning call.
 *   - DEMO_MODE     → mock (always)
 *   - isPrivate=true → Venice (fallback: public provider)
 *   - isPrivate=false→ configured public provider (OpenAI or Claude)
 */
export async function reason(systemPrompt, userPrompt, agentId, isPrivate = false) {
    if (config.demoMode) {
        const r = mockReason(agentId, isPrivate);
        logger.info(`[DEMO ${isPrivate ? "🔒" : "👁"}] ${agentId}: ${r.action} ${r.token} (${r.confidence})`);
        return r;
    }

    // ── Private: Venice ──────────────────────────────────────────────────────
    if (isPrivate) {
        const { reason: veniceReason } = await import("./venice.js");
        const result = await veniceReason(systemPrompt, userPrompt, agentId);
        if (result) return { ...result, provider: "venice", isPrivate: true };
        logger.warn(`[Reasoning] Venice unavailable, falling back to public for ${agentId}`);
    }

    // ── Public: OpenAI or Claude (one, not both) ─────────────────────────────
    const provider = config.ai.provider; // "openai" | "claude"

    if (provider === "claude" && config.ai.anthropicKey) {
        const { reason: claudeReason } = await import("./claude.js");
        const result = await claudeReason(systemPrompt, userPrompt, agentId);
        if (result) return { ...result, provider: "claude", isPrivate: false };
    }

    if (config.ai.openaiKey) {
        const { reason: openaiReason } = await import("./openai.js");
        const result = await openaiReason(systemPrompt, userPrompt, agentId);
        if (result) return { ...result, provider: "openai", isPrivate: false };
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    logger.warn(`[Reasoning] No provider available for ${agentId}`);
    return {
        action: "HOLD", token: "USDC", size: 0, confidence: 0,
        reason: isPrivate ? undefined : "No provider configured — holding",
        provider: "fallback", isPrivate,
    };
}

export { mockReason };
