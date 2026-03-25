import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import config from "../../config/index.js";
import logger from "./logger.js";

let openai = null;
let anthropic = null;

if (!config.demoMode) {
  if (config.ai.openaiKey) openai = new OpenAI({ apiKey: config.ai.openaiKey });
  if (config.ai.anthropicKey) anthropic = new Anthropic({ apiKey: config.ai.anthropicKey });
}

// ─── Demo mode: deterministic but varied AI decisions ────────────────────────
const DEMO_ACTIONS = ["BUY", "SELL", "HOLD"];
const DEMO_TOKENS = ["WETH", "WBTC", "OKB"];
let _demoCounter = 0;

function demoDec(agentId) {
  _demoCounter++;
  // Each agent has a biased strategy in demo mode
  const biases = {
    "whale-follower": ["BUY", "BUY", "HOLD"],
    "momentum-trader": ["BUY", "BUY", "SELL"],
    "risk-guard": ["HOLD", "HOLD", "BUY"],
  };
  const pool = biases[agentId] || DEMO_ACTIONS;
  const action = pool[_demoCounter % pool.length];
  const token = DEMO_TOKENS[(_demoCounter + (agentId?.length || 0)) % 3];
  const confidence = 0.55 + (((_demoCounter * 7) % 30) / 100);
  return { action, token, confidence, reason: `[DEMO] ${agentId} demo reasoning cycle ${_demoCounter}` };
}

/**
 * Sends a trading decision prompt to the configured AI provider.
 * Returns a structured JSON decision: { action, token, confidence, reason }
 */
export async function aiReason(systemPrompt, userPrompt, agentId) {
  if (config.demoMode) {
    const dec = demoDec(agentId);
    logger.info(`[DEMO AI] ${agentId}: ${dec.action} ${dec.token} (conf: ${dec.confidence.toFixed(2)})`);
    return dec;
  }

  const provider = config.ai.provider;

  try {
    if (provider === "anthropic" && anthropic) {
      const res = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = res.content.find((b) => b.type === "text")?.text || "";
      return parseAiResponse(text);
    }

    if (!openai) throw new Error("No AI provider configured");
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return parseAiResponse(res.choices[0].message.content);
  } catch (err) {
    logger.error("AI reasoning failed", { error: err.message });
    return { action: "HOLD", reason: "AI error — holding", confidence: 0 };
  }
}

function parseAiResponse(text) {
  try {
    const clean = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    logger.warn("Could not parse AI response as JSON");
    const upper = text.toUpperCase();
    if (upper.includes("BUY")) return { action: "BUY", reason: text, confidence: 0.5 };
    if (upper.includes("SELL")) return { action: "SELL", reason: text, confidence: 0.5 };
    return { action: "HOLD", reason: text, confidence: 0.3 };
  }
}
