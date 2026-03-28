const API_BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  getConfig: () => request("/config"),
  getAgents: () => request("/agents"),
  getCurrentArena: () => request("/arena/current"),
  getArena: (id) => request(`/arena/${id}`),
  getAllArenas: () => request("/arenas"),
  getUserArena: (userId) => request(`/arena/user/${userId}`),


  createPaymentIntent: (userId) =>
    request("/payment/intent", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  verifyPayment: (paymentId, txHash) =>
    request("/payment/verify", {
      method: "POST",
      body: JSON.stringify({ paymentId, txHash }),
    }),

  joinArena: (userId, agentId, paymentId) =>
    request("/arena/join", {
      method: "POST",
      body: JSON.stringify({ userId, agentId, paymentId }),
    }),
};
