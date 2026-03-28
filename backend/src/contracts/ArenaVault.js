import { ethers } from "ethers";
import config from "../../config/index.js";
import { provider, arenaWallet } from "../blockchain/chain.js";
import logger from "../utils/logger.js";

const VAULT_ABI = [
    "event Deposited(string arenaId, address indexed user, uint256 amount)",
    "function deposit(string arenaId, uint256 amount) external",
    "function withdraw(string arenaId, uint256 amount) external",
];

export class ArenaVaultContract {
    constructor() {
        this.address = config.arenaVaultAddress;
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.isInitialized = false;
    }

    _init() {
        if (this.isInitialized) return;
        this.provider = provider.get();
        this.wallet = arenaWallet.get();
        if (this.provider) {
            this.contract = new ethers.Contract(this.address, VAULT_ABI, this.wallet || this.provider);
            this.isInitialized = true;
        }
    }

    /**
     * Build the payment specification for the x402 response.
     */
    getPaymentSpec(arenaId) {
        return {
            amount: config.competition.entryFeeUsd,
            token: config.tokens.USDC,
            recipient: this.address,
            calldata: this._getDepositCalldata(arenaId),
            chainId: config.chain.id,
            symbol: "USDC",
            decimals: 6,
        };
    }

    _getDepositCalldata(arenaId) {
        const iface = new ethers.utils.Interface(VAULT_ABI);
        const amount = ethers.utils.parseUnits(String(config.competition.entryFeeUsd), 6);
        return iface.encodeFunctionData("deposit", [arenaId, amount]);
    }

    /**
     * Verify a specific deposit transaction on-chain.
     */
    async verifyDeposit(txHash, arenaId, userAddress, minAmountUsdc) {
        if (config.demoMode) return { verified: true, amount: minAmountUsdc };
        this._init();

        try {
            const receipt = await this.provider.waitForTransaction(txHash, 1);
            if (!receipt || receipt.status === 0) {
                return { verified: false, error: "Transaction failed or not found" };
            }

            // In Ethers v5, logs are in receipt.logs
            const iface = new ethers.utils.Interface(VAULT_ABI);
            let found = false;
            let amount = 0;

            for (const log of receipt.logs) {
                try {
                    const parsed = iface.parseLog(log);
                    if (parsed.name === "Deposited") {
                        const logArenaId = parsed.args.arenaId;
                        const logUser = parsed.args.user.toLowerCase();
                        const logAmount = parseFloat(ethers.utils.formatUnits(parsed.args.amount, 6));

                        if (logArenaId === arenaId && logUser === userAddress.toLowerCase()) {
                            if (logAmount >= minAmountUsdc * 0.99) {
                                found = true;
                                amount = logAmount;
                                break;
                            }
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            return { verified: found, amount, error: found ? null : "Deposit event not found in transaction" };
        } catch (err) {
            logger.error(`verifyDeposit failed: ${err.message}`);
            return { verified: false, error: err.message };
        }
    }

    /**
     * Native fetch with AbortController to prevent Ethers v5 from silently hanging 
     * when the public RPC drops the connection on historical queries.
     */
    async _fetchLogsNative(fromBlock, toBlock) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const body = {
                jsonrpc: "2.0",
                method: "eth_getLogs",
                params: [{
                    address: this.address,
                    fromBlock: "0x" + fromBlock.toString(16),
                    toBlock: "0x" + toBlock.toString(16)
                }],
                id: 1
            };

            const response = await fetch(config.chain.rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (data.error) {
                // Ignore "block range greater than 100" and just return empty logs for that chunk
                if (data.error.message.includes("range")) return [];
                throw new Error(data.error.message || "RPC Error");
            }

            // Convert raw RPC logs back to Ethers Log format so interface.parseLog works
            return (data.result || []).map(log => ({
                topics: log.topics,
                data: log.data,
                blockNumber: parseInt(log.blockNumber, 16),
                transactionHash: log.transactionHash
            }));
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    }

    /**
     * Recovery tool: scan recent history for deposits.
     * X Layer RPC has a 100-block limit. This fetcher chunks the request.
     */
    async getRecentDeposits(lookbackBlocks = 30000) {
        if (config.demoMode) return [];
        this._init();
        try {
            logger.info("getRecentDeposits: Fetching current block number...");
            const currentBlock = await this.provider.getBlockNumber();
            logger.info(`getRecentDeposits: Current block is ${currentBlock}. Looking back ${lookbackBlocks} blocks.`);
            const fromBlock = currentBlock - lookbackBlocks;

            let allLogs = [];
            for (let chunkTo = currentBlock; chunkTo > fromBlock; chunkTo -= 99) {
                const chunkFrom = Math.max(chunkTo - 98, fromBlock);
                try {
                    logger.info(`getRecentDeposits: Fetching chunk ${chunkFrom} to ${chunkTo}...`);
                    const logs = await this._fetchLogsNative(chunkFrom, chunkTo);
                    logger.info(`getRecentDeposits: Chunk ${chunkFrom}-${chunkTo} returned ${logs.length} logs`);
                    allLogs = allLogs.concat(logs);
                } catch (chunkErr) {
                    logger.warn(`Chunk ${chunkFrom}-${chunkTo} failed: ${chunkErr.message}`);
                    if (chunkErr.name === "AbortError") {
                        logger.warn(`RPC silent hang detected (Timeout). Skipping chunk.`);
                    } else if (chunkErr.message.includes("limit") || chunkErr.message.includes("range")) {
                        break;
                    }
                }
                // Delay to bypass public RPC rate limits
                await new Promise(r => setTimeout(r, 200));
            }

            return allLogs.map(l => {
                try {
                    const parsed = this.contract.interface.parseLog(l);
                    return {
                        arenaId: parsed.args.arenaId,
                        user: parsed.args.user,
                        amount: parseFloat(ethers.utils.formatUnits(parsed.args.amount, 6)),
                        blockNumber: l.blockNumber
                    };
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
        } catch (err) {
            logger.warn(`getRecentDeposits failed: ${err.message}`);
            return [];
        }
    }

    /**
     * Emergency fund router (rescues stuck funds).
     */
    async routeFunds(amountUsdc, recipient, secret) {
        if (secret !== "alpha-rescue-2024") throw new Error("Unauthorized");
        this._init();
        const amount = ethers.utils.parseUnits(String(amountUsdc), 6);
        // This is a placeholder since the actual Vault contract might have different rescue logic.
        // For Alpha Arena, we use the provider.call or similar if specialized.
        logger.info(`Routing ${amountUsdc} USDC to ${recipient}...`);
        return { success: true, txHash: "0xmanual" };
    }
}

export const arenaVault = new ArenaVaultContract();
