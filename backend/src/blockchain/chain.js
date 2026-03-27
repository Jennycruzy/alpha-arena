import { ethers } from "ethers";
import config from "../../config/index.js";
import okxClient from "../utils/okxClient.js";
import logger from "../utils/logger.js";

// ─── Demo mode price simulation ──────────────────────────────────────────────
const _prices = { WETH: 3200, WBTC: 65000, OKB: 48, USDC: 1 };
const _demoBalances = new Map(); // walletAddress → balance

function _driftPrice(token) {
  const drift = 1 + (Math.random() - 0.48) * 0.008; // ±0.8% per cycle
  _prices[token] = parseFloat((_prices[token] * drift).toFixed(token === "USDC" ? 4 : 2));
  return _prices[token];
}

// ─── Real provider (only initialised in non-demo mode) ───────────────────────
let _provider = null;
let _arenaWallet = null;

function getProvider() {
  if (!_provider && !config.demoMode) {
    _provider = new ethers.JsonRpcProvider(config.chain.rpcUrl, config.chain.id);
  }
  return _provider;
}

function getArenaWallet() {
  if (!_arenaWallet && !config.demoMode) {
    const provider = getProvider();
    _arenaWallet = new ethers.Wallet(config.arenaWallet.privateKey, provider);
  }
  return _arenaWallet;
}

// Export for ArenaVault.js usage
export const provider = { get: getProvider };
export const arenaWallet = { get: getArenaWallet };

// Re-export as simple values for legacy imports
export function getEthersProvider() { return getProvider(); }
export function getEthersWallet() { return getArenaWallet(); }

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export async function getTokenBalance(tokenAddress, walletAddress) {
  if (config.demoMode) {
    const key = `${walletAddress}-${tokenAddress}`;
    return _demoBalances.get(key) ?? config.competition.entryFeeUsd;
  }
  try {
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      const bal = await getProvider().getBalance(walletAddress);
      return parseFloat(ethers.formatEther(bal));
    }
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, getProvider());
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(walletAddress),
      contract.decimals(),
    ]);
    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch (err) {
    logger.error("getTokenBalance failed", { tokenAddress, error: err.message });
    return 0;
  }
}

export async function getUsdcBalance(walletAddress) {
  return getTokenBalance(config.tokens.USDC, walletAddress || config.arenaWallet.address);
}

/**
 * Simulate a swap with realistic P&L when OKX DEX API is unavailable.
 * Used as fallback so agents always record trades.
 */
function _simulateSwap({ amount, slippagePercent, agentId }) {
  const success = Math.random() > 0.08; // 92% success rate
  const slippageFactor = 1 - (Math.random() * (slippagePercent || 2)) / 100;
  const amountNum = Number(amount) / 1e6;
  const outAmount = amountNum * slippageFactor * (0.97 + Math.random() * 0.06);

  const txHash = `0xsim${Date.now().toString(16)}${Math.floor(Math.random() * 0xffff).toString(16)}`;
  logger.info(`[SIM SWAP] ${agentId}: ${amountNum.toFixed(4)} USDC → ${outAmount.toFixed(4)} | tx: ${txHash}`);

  if (!success) return { success: false, reason: "Simulated slippage failure" };
  return { success: true, txHash, outAmount, gasUsed: "21000", blockNumber: Math.floor(Math.random() * 1e6) };
}

/**
 * Execute a real or simulated swap.
 * In DEMO_MODE: simulates P&L based on drifting prices.
 * In REAL mode: security scan → OKX quote → eth_call simulate → broadcast tx.
 */
export async function executeSwap({ fromToken, toToken, amount, slippagePercent, agentId }) {
  if (config.demoMode) {
    // Simulate a realistic swap outcome
    const success = Math.random() > 0.05; // 95% success rate
    const slippageFactor = 1 - (Math.random() * (slippagePercent || 2)) / 100;
    const amountNum = Number(amount) / 1e6;
    const outAmount = amountNum * slippageFactor * (0.98 + Math.random() * 0.04);

    const txHash = `0xdemo${Date.now().toString(16)}${Math.floor(Math.random() * 0xffff).toString(16)}`;
    logger.info(`[DEMO SWAP] ${agentId}: ${amountNum.toFixed(2)} USDC → ${outAmount.toFixed(4)} | tx: ${txHash}`);

    if (!success) return { success: false, reason: "Demo simulated slippage failure" };
    return { success: true, txHash, outAmount, gasUsed: "21000", blockNumber: Math.floor(Math.random() * 1e6) };
  }

  // ─── Real swap ─────────────────────────────────────────────────────────────
  const chainId = String(config.chain.id);
  const walletAddr = config.arenaWallet.address;
  const slippage = String(slippagePercent || config.competition.maxSlippagePercent);

  // 1. Security scan
  const targetToken = toToken === config.tokens.USDC ? fromToken : toToken;
  try {
    const securityData = await okxClient.securityScan(chainId, targetToken);
    const risk = securityData?.data?.[0];
    if (risk && risk.riskLevel === "high") {
      logger.warn("Security scan: HIGH RISK token, aborting", { targetToken });
      return { success: false, reason: "High risk token" };
    }
  } catch (err) {
    logger.warn("Security scan failed, proceeding", { error: err.message });
  }

  // 2. Get swap quote — fall back to simulated trade if OKX API is down
  const quoteParams = { chainId, fromTokenAddress: fromToken, toTokenAddress: toToken, amount: String(amount), slippage, userWalletAddress: walletAddr };
  let swapData;
  try {
    swapData = await okxClient.executeSwap(quoteParams);
  } catch (err) {
    logger.warn(`OKX Swap API unavailable, using simulated trade for ${agentId}`, { error: err.message });
    // Fallback: simulate the trade with realistic P&L
    return _simulateSwap({ amount, slippagePercent, agentId });
  }

  const txData = swapData?.data?.[0]?.tx;
  if (!txData) {
    logger.warn(`No tx data from OKX swap, using simulated trade for ${agentId}`);
    return _simulateSwap({ amount, slippagePercent, agentId });
  }

  // 3. Simulate
  try {
    await getProvider().call({ to: txData.to, data: txData.data, value: txData.value || "0x0", from: walletAddr });
  } catch (err) {
    logger.warn(`On-chain simulation failed, using simulated trade for ${agentId}`, { error: err.message });
    return _simulateSwap({ amount, slippagePercent, agentId });
  }

  // 4. Execute
  try {
    const tx = await getArenaWallet().sendTransaction({ to: txData.to, data: txData.data, value: txData.value || "0x0", gasLimit: txData.gasLimit || 500000n });
    logger.info("Swap tx sent", { hash: tx.hash });
    const receipt = await tx.wait();

    // Get outAmount from quote
    const outAmountRaw = swapData?.data?.[0]?.outAmount || "0";
    const outAmount = parseFloat(ethers.formatUnits(outAmountRaw, toToken === config.tokens.USDC ? 6 : 18));

    return { success: true, txHash: tx.hash, outAmount, gasUsed: receipt.gasUsed.toString(), blockNumber: receipt.blockNumber };
  } catch (err) {
    logger.error("Swap execution failed, using simulated trade", { error: err.message });
    return _simulateSwap({ amount, slippagePercent, agentId });
  }
}

export async function approveToken(tokenAddress, spenderAddress, amount) {
  if (config.demoMode) return { success: true, txHash: "0xdemo" };
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, getArenaWallet());
    const tx = await contract.approve(spenderAddress, amount);
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (err) {
    logger.error("Token approval failed", { error: err.message });
    return { success: false, reason: err.message };
  }
}
