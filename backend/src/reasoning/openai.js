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
    if (config.demoMode || !config.ai.openaiKey) return null;
    try {
        const client = await getClient();
        const model = config.ai.openaiModel || "gpt-4o";
        const isReasoningModel = model.startsWith("o1");

        const options = {
            model: model,
            messages: [
                { role: isReasoningModel ? "developer" : "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        };

        if (!isReasoningModel) {
            options.temperature = 0.3;
            options.response_format = { type: "json_object" };
        } else {
            // o1 models don't support temperature or json_object format in the same way (yet)
            // and require max_completion_tokens
            options.max_completion_tokens = 2000;
        }

        const res = await client.chat.completions.create(options);
        let text = res.choices[0].message.content;

        // Clean up markdown code blocks if the model returned them
        if (text.includes("```json")) {
            text = text.split("```json")[1].split("```")[0].trim();
        } else if (text.includes("```")) {
            text = text.split("```")[1].split("```")[0].trim();
        }

        return JSON.parse(text);
    } catch (err) {
        logger.warn(`[OpenAI reasoning] ${agentId} (${config.ai.openaiModel || "gpt-4o"}): ${err.message}`);
        // Fallback or retry logic could go here
        return null;
    }
}
