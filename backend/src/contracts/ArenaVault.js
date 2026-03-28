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
     * Recovery tool: scan recent history for deposits.
     * X Layer RPC has a 100-block limit. This fetcher chunks the request.
     */
    async getRecentDeposits(lookbackBlocks = 2000) {
        if (config.demoMode) return [];
        this._init();
        try {
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = currentBlock - lookbackBlocks;
            const filter = this.contract.filters.Deposited();

            let allLogs = [];
            for (let chunkTo = currentBlock; chunkTo > fromBlock; chunkTo -= 99) {
                const chunkFrom = Math.max(chunkTo - 98, fromBlock);
                try {
                    const logs = await this.contract.queryFilter(filter, chunkFrom, chunkTo);
                    allLogs = allLogs.concat(logs);
                } catch (chunkErr) {
                    logger.warn(`Chunk ${chunkFrom}-${chunkTo} failed: ${chunkErr.message}`);
                    // If RPC forcefully rejects the deep history outright, we stop querying further back
                    if (chunkErr.message.includes("limit") || chunkErr.message.includes("range")) {
                        break;
                    }
                }
                // Delay to bypass public RPC rate limits
                await new Promise(r => setTimeout(r, 200));
            }

            return allLogs.map(l => {
                const parsed = this.contract.interface.parseLog(l);
                return {
                    arenaId: parsed.args.arenaId,
                    user: parsed.args.user,
                    amount: parseFloat(ethers.utils.formatUnits(parsed.args.amount, 6)),
                    blockNumber: l.blockNumber
                };
            });
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
