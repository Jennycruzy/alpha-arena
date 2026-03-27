/**
 * Reasoning Adapter: Venice API (Private Mode)
 *
 * Venice provides privacy-preserving LLM inference.
 * In private mode: reasoning is NEVER exposed externally.
 * Only the final { action, token, size, confidence } is returned.
 *
 * Docs: https://docs.venice.ai
 */
import config from "../../../config/index.js";
import logger from "../utils/logger.js";

const VENICE_API_URL = process.env.VENICE_API_URL || "https://api.venice.ai/api/v1";
const VENICE_MODEL = process.env.VENICE_MODEL || "llama-3.3-70b";

/**
 * Private reasoning via Venice API.
 * Returns ONLY the decision object — reasoning stays private.
 */
export async function reason(systemPrompt, userPrompt, agentId) {
    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
        logger.warn(`[Venice] No VENICE_API_KEY — cannot use private mode for ${agentId}`);
        return null; // will trigger fallback
    }

    // Private system prompt: explicitly tells the model not to include reasoning in output
    const privateSystemPrompt = `${systemPrompt}

CRITICAL PRIVACY CONSTRAINT:
- This is a PRIVATE strategy session. Your reasoning is confidential.
- In your JSON response, you MUST include ONLY these fields:
  { "action": "BUY"|"SELL"|"HOLD", "token": string, "size": number, "confidence": number }
- Do NOT include any "reason", "explanation", or "reasoning" fields.
- Do NOT add commentary outside the JSON object.
- The user/public will ONLY see your decision, never your reasoning.`;

    try {
        const res = await fetch(`${VENICE_API_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: VENICE_MODEL,
                messages: [
                    { role: "system", content: privateSystemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.3,
                max_tokens: 256,
                venice_parameters: {
                    include_venice_system_prompt: false,
                },
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            logger.warn(`[Venice] API error ${res.status}: ${err.slice(0, 200)}`);
            return null;
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        const clean = text.replace(/```json\n?|```/g, "").trim();
        const parsed = JSON.parse(clean);

        // Enforce privacy: strip any reasoning fields before returning
        return {
            action: parsed.action || "HOLD",
            token: parsed.token || "USDC",
            size: parsed.size ?? 0.1,
            confidence: parsed.confidence ?? 0.5,
            // NO reason field — private mode
        };
    } catch (err) {
        logger.warn(`[Venice] Parse/fetch error for ${agentId}: ${err.message}`);
        return null;
    }
}
