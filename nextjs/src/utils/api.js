// Frontend API helpers — proxied via next.config.mjs to backend on :4000

const API_BASE = "/api";

async function request(path, options = {}) {
    const { headers, ...rest } = options;
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(headers || {}),
        },
        ...rest,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
}

export const api = {
    getStatus: () => request("/status"),
    getConfig: () => request("/config"),
    getAgents: () => request("/agents"),
    getCurrentArena: () => request("/arena/current"),
    getArena: (id) => request(`/arena/${id}`),
    getArenaForUser: (addr) => request(`/arena/user/${addr}`),
    getAllArenas: () => request("/arenas"),
    getPublicArenas: () => request("/arenas/public"),

    /** Join arena: optional X-Payment (x402) + privacy mode flag */
    joinArena: (userId, agentId, arenaId, paymentTxHash = null, isPrivate = false) =>
        request("/arena/join", {
            method: "POST",
            headers: paymentTxHash ? { "X-Payment": paymentTxHash } : {},
            body: JSON.stringify({ userId, agentId, arenaId, isPrivate }),
        }),

    // ── Spectator (no wallet required) ───────────────────────────────────────
    spectate: (arenaId) => request(`/spectate/${arenaId}`),
    spectateReasoning: (arenaId) => request(`/spectate/${arenaId}/reasoning`),

    // ── Copy Trade ───────────────────────────────────────────────────────────
    startCopyTrade: (userId, agentId, capitalUsdc, isPrivate = false) =>
        request("/copy-trade/start", {
            method: "POST",
            body: JSON.stringify({ userId, agentId, capitalUsdc, isPrivate }),
        }),

    stopCopyTrade: (userId) =>
        request("/copy-trade/stop", {
            method: "POST",
            body: JSON.stringify({ userId }),
        }),

    getCopyTradeStatus: (userId) => request(`/copy-trade/status/${userId}`),
};
