import config from "../../config/index.js";
import logger from "./logger.js";

// ─── Demo mode market data ────────────────────────────────────────────────────
const _mockPrices = { WETH: 3200, WBTC: 65000, OKB: 48 };
function _drift(token) {
  _mockPrices[token] = parseFloat(
    (_mockPrices[token] * (1 + (Math.random() - 0.48) * 0.01)).toFixed(2)
  );
  return _mockPrices[token];
}

function mockPrice(token) {
  return { data: [{ price: String(_drift(token)), symbol: token }] };
}

function mockWhaleSignals() {
  const tokens = ["WETH", "WBTC", "OKB"];
  return {
    data: tokens.map((t) => ({
      tokenSymbol: t,
      walletSize: "$" + (Math.floor(Math.random() * 10) + 1) + "M",
      action: Math.random() > 0.4 ? "BUY" : "SELL",
      confidence: (0.6 + Math.random() * 0.35).toFixed(2),
    })),
  };
}

function mockTrendingTokens() {
  return {
    data: ["WETH", "WBTC", "OKB"].map((t) => ({
      symbol: t,
      priceChange24h: ((Math.random() - 0.45) * 8).toFixed(2),
      volume24h: Math.floor(Math.random() * 1e7),
    })),
  };
}

// ─── OKX Client ───────────────────────────────────────────────────────────────
import axios from "axios";
import CryptoJS from "crypto-js";

class OkxClient {
  constructor() {
    this.baseUrl = config.okx.baseUrl;
    this.apiKey = config.okx.apiKey;
    this.secretKey = config.okx.secretKey;
    this.passphrase = config.okx.passphrase;
    this.projectId = config.okx.projectId;
  }

  _sign(timestamp, method, requestPath, body = "") {
    const prehash = timestamp + method.toUpperCase() + requestPath + (body || "");
    return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(prehash, this.secretKey));
  }

  _headers(method, requestPath, body) {
    const timestamp = new Date().toISOString();
    return {
      "OK-ACCESS-KEY": this.apiKey,
      "OK-ACCESS-SIGN": this._sign(timestamp, method, requestPath, body),
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": this.passphrase,
      "OK-ACCESS-PROJECT": this.projectId || "",
      "Content-Type": "application/json",
    };
  }

  async get(path, params = {}) {
    if (config.demoMode) return null; // caller handles null
    const query = new URLSearchParams(params).toString();
    const requestPath = query ? `${path}?${query}` : path;
    const headers = this._headers("GET", requestPath);
    try {
      const res = await axios.get(`${this.baseUrl}${requestPath}`, { headers });
      return res.data;
    } catch (err) {
      const status = (err.response && err.response.status) || 500;
      logger.error(`OKX GET ${path} failed`, { status });
      throw err;
    }
  }

  async getTokenPrice(chainId, tokenAddress) {
    if (config.demoMode) {
      const item = Object.entries(config.tokens).find((pair) => pair[1] === tokenAddress);
      const sym = item ? item[0] : "WETH";
      return mockPrice(sym);
    }
    const item = Object.entries(config.tokens).find((pair) => {
      const addr = pair[1];
      if (!addr || !tokenAddress) return false;
      return addr.toLowerCase() === tokenAddress.toLowerCase();
    });
    const sym = item ? item[0] : "WETH";
    try {
      const res = await this.get("/api/v5/dex/market/token-price", { chainId: String(chainId), tokenContractAddress: tokenAddress });
      return res;
    } catch (err) {
      logger.warn(`OKX token price failed for ${sym}, using mock`, { error: err.message });
      return mockPrice(sym);
    }
  }

  async getTrendingTokens(chainId) {
    if (config.demoMode) return mockTrendingTokens();
    try {
      return await this.get("/api/v5/dex/market/trending-tokens", { chainId: String(chainId) });
    } catch (err) {
      logger.warn("OKX Trending Tokens failed, falling back to mock", { error: err.message });
      return mockTrendingTokens();
    }
  }

  async getWhaleSignals(chainId) {
    if (config.demoMode) return mockWhaleSignals();
    try {
      return await this.get("/api/v5/dex/signal/whale-tracking", { chainId: String(chainId) });
    } catch (err) {
      logger.warn("OKX Whale Signals failed, falling back to mock", { error: err.message });
      return mockWhaleSignals();
    }
  }

  async getTokenInfo(chainId, tokenAddress) {
    if (config.demoMode) return { data: [{ symbol: "TOKEN" }] };
    return this.get("/api/v5/dex/token/token-info", { chainId: String(chainId), tokenContractAddress: tokenAddress });
  }

  async securityScan(chainId, tokenAddress) {
    if (config.demoMode) return { data: [{ riskLevel: "low" }] };
    return this.get("/api/v5/dex/security/token-security", { chainId: String(chainId), tokenContractAddress: tokenAddress });
  }

  async getSwapQuote(params) {
    if (config.demoMode) return null;
    return this.get("/api/v5/dex/aggregator/quote", params);
  }

  async executeSwap(params) {
    if (config.demoMode) return null;
    return this.get("/api/v5/dex/aggregator/swap", params);
  }

  async getPortfolio(address, chainId) {
    if (config.demoMode) return { data: [] };
    return this.get("/api/v5/dex/balance/token-balances-by-address", { address, chainId: String(chainId) });
  }
}

export const okxClient = new OkxClient();
export default okxClient;
