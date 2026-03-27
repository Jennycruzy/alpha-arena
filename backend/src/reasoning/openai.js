/**
 * Reasoning Adapter: OpenAI (Public Mode)
 * Full reasoning + decision, all visible.
 */
import config from "../../config/index.js";
import logger from "../utils/logger.js";

let _openai = null;
async function getClient() {
    if (_openai) return _openai;
    const { default: OpenAI } = await import("openai");
    _openai = new OpenAI({ apiKey: config.ai.openaiKey });
    return _openai;
}

export async function reason(systemPrompt, userPrompt, agentId) {
    if (config.demoMode || !config.ai.openaiKey) return null; // fallback to mock
    try {
        const client = await getClient();
        const res = await client.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });
        const text = res.choices[0].message.content;
        return JSON.parse(text);
    } catch (err) {
        logger.warn(`[OpenAI reasoning] ${agentId}: ${err.message}`);
        return null;
    }
}
