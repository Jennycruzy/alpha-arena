/**
 * Reasoning Adapter: Claude / Anthropic (Public Mode)
 * Full reasoning visible.
 */
import config from "../../../config/index.js";
import logger from "../utils/logger.js";

let _anthropic = null;
async function getClient() {
    if (_anthropic) return _anthropic;
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    _anthropic = new Anthropic({ apiKey: config.ai.anthropicKey });
    return _anthropic;
}

export async function reason(systemPrompt, userPrompt, agentId) {
    if (config.demoMode || !config.ai.anthropicKey) return null;
    try {
        const client = await getClient();
        const res = await client.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 512,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
        });
        const text = res.content.find((b) => b.type === "text")?.text || "";
        const clean = text.replace(/```json\n?|```/g, "").trim();
        return JSON.parse(clean);
    } catch (err) {
        logger.warn(`[Claude reasoning] ${agentId}: ${err.message}`);
        return null;
    }
}
