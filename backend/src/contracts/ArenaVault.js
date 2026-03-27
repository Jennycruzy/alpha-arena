import { ethers } from "ethers";
import config from "../../config/index.js";
import logger from "../utils/logger.js";
import { provider, arenaWallet } from "../blockchain/chain.js";

// Minimal ABI — only the functions we call from the backend
const ARENA_VAULT_ABI = [
    "event Deposited(bytes32 indexed arenaId, address indexed user, uint256 amount)",
    "event FundsRouted(bytes32 indexed arenaId, address[] agentWallets, uint256[] amounts)",
    "event PayoutDistributed(bytes32 indexed arenaId, address indexed recipient, uint256 amount)",

    "function deposit(bytes32 arenaId) external",
    "function routeFunds(bytes32 arenaId, address[] calldata agentWallets, uint256[] calldata amounts) external",
    "function distributePayout(bytes32 arenaId, address[] calldata recipients, uint256[] calldata amounts) external",
    "function returnFunds(uint256 amount) external",
    "function getDeposit(bytes32 arenaId, address user) external view returns (uint256)",
    "function getPooledFunds(bytes32 arenaId) external view returns (uint256)",
    "function isArenaStarted(bytes32 arenaId) external view returns (bool)",
    "function isPayoutDone(bytes32 arenaId) external view returns (bool)",
    "function MINIMUM_ENTRY() external view returns (uint256)",
];

class ArenaVaultContract {
    constructor() {
        this.address = config.arenaVaultAddress;
        this.contract = null;
        this._initialized = false;
    }

    _init() {
        if (this._initialized) return;
        if (!this.address || this.address === "0x0000000000000000000000000000000000000000") {
            if (!config.demoMode) {
                logger.warn("ArenaVault: no contract address set. DEMO_MODE should be enabled.");
            }
            return;
        }
        this.contract = new ethers.Contract(this.address, ARENA_VAULT_ABI, arenaWallet.get());
        this._initialized = true;
        logger.info(`ArenaVault contract initialized at ${this.address}`);
    }

    /**
     * Helper: convert string arenaId (UUID) to bytes32
     */
    static arenaIdToBytes32(arenaId) {
        // pad/hash the UUID string to bytes32
        return ethers.id(arenaId).slice(0, 66); // keccak256 of the UUID string
    }

    /**
     * Verify that a tx hash contains a valid Deposited event for this arenaId/user/amount.
     * Called by x402Middleware after user submits their payment tx hash.
     */
    async verifyDeposit(txHash, arenaId, userAddress, expectedAmount) {
        if (config.demoMode) {
            logger.info(`[DEMO] ArenaVault.verifyDeposit skipped — demo mode`);
            return { verified: true, amount: expectedAmount };
        }

        this._init();
        if (!this.contract) throw new Error("ArenaVault contract not initialized");

        try {
            const receipt = await provider.get().getTransactionReceipt(txHash);
            if (!receipt) throw new Error("Transaction not found or not confirmed");
            if (receipt.status !== 1) throw new Error("Transaction reverted");

            const arenaBytes32 = ArenaVaultContract.arenaIdToBytes32(arenaId);
            const iface = new ethers.Interface(ARENA_VAULT_ABI);

            let deposited = false;
            let depositedAmount = 0n;

            for (const log of receipt.logs) {
                try {
                    const parsed = iface.parseLog(log);
                    if (
                        parsed.name === "Deposited" &&
                        parsed.args.arenaId === arenaBytes32 &&
                        parsed.args.user.toLowerCase() === userAddress.toLowerCase()
                    ) {
                        deposited = true;
                        depositedAmount = parsed.args.amount;
                        break;
                    }
                } catch {
                    // not our event
                }
            }

            if (!deposited) {
                throw new Error("No valid Deposited event found in transaction");
            }

            const minEntry = BigInt(Math.floor(config.competition.entryFeeUsd * 1e6));
            if (depositedAmount < minEntry) {
                throw new Error(
                    `Deposit too small: got ${depositedAmount}, need ${minEntry}`
                );
            }

            return { verified: true, amount: Number(depositedAmount) / 1e6 };
        } catch (err) {
            logger.error(`ArenaVault.verifyDeposit failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Route pooled USDC to agent trading wallets when competition starts.
     * Gas paid in OKB from the arena operator wallet.
     */
    async routeFunds(arenaId, agentWallets, amounts) {
        if (config.demoMode) {
            logger.info(`[DEMO] ArenaVault.routeFunds skipped — demo mode`);
            return { success: true, txHash: "0xdemo" };
        }

        this._init();
        if (!this.contract) throw new Error("ArenaVault contract not initialized");

        const arenaBytes32 = ArenaVaultContract.arenaIdToBytes32(arenaId);
        const rawAmounts = amounts.map((a) => BigInt(Math.floor(a * 1e6)));

        try {
            const tx = await this.contract.routeFunds(arenaBytes32, agentWallets, rawAmounts);
            logger.info(`ArenaVault.routeFunds tx sent: ${tx.hash}`);
            const receipt = await tx.wait();
            logger.info(`ArenaVault.routeFunds confirmed (block ${receipt.blockNumber})`);
            return { success: true, txHash: tx.hash };
        } catch (err) {
            logger.error(`ArenaVault.routeFunds failed: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Distribute payouts to users after competition ends.
     * Gas paid in OKB from the arena operator wallet.
     */
    async distributePayout(arenaId, recipients, amounts) {
        if (config.demoMode) {
            logger.info(`[DEMO] ArenaVault.distributePayout skipped — demo mode`);
            return { success: true, txHash: "0xdemo" };
        }

        this._init();
        if (!this.contract) throw new Error("ArenaVault contract not initialized");

        const arenaBytes32 = ArenaVaultContract.arenaIdToBytes32(arenaId);
        // amounts are in USDC float — convert to 6-decimal uint256
        const rawAmounts = amounts.map((a) => BigInt(Math.floor(a * 1e6)));

        try {
            const tx = await this.contract.distributePayout(arenaBytes32, recipients, rawAmounts);
            logger.info(`ArenaVault.distributePayout tx sent: ${tx.hash}`);
            const receipt = await tx.wait();
            logger.info(`ArenaVault.distributePayout confirmed (block ${receipt.blockNumber})`);
            return { success: true, txHash: tx.hash };
        } catch (err) {
            logger.error(`ArenaVault.distributePayout failed: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Return trading funds from agent wallets to the vault before payout.
     */
    async returnFunds(amountUsdc) {
        if (config.demoMode) return { success: true, txHash: "0xdemo" };
        this._init();
        if (!this.contract) throw new Error("ArenaVault contract not initialized");

        const rawAmount = BigInt(Math.floor(amountUsdc * 1e6));
        try {
            const tx = await this.contract.returnFunds(rawAmount);
            logger.info(`ArenaVault.returnFunds tx sent: ${tx.hash}`);
            const receipt = await tx.wait();
            logger.info(`ArenaVault.returnFunds confirmed (block ${receipt.blockNumber})`);
            return { success: true, txHash: tx.hash };
        } catch (err) {
            logger.error(`ArenaVault.returnFunds failed: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Get the required payment spec for x402 response.
     * This is what the backend returns in the 402 body.
     */
    getPaymentSpec(arenaId) {
        const arenaBytes32 = ArenaVaultContract.arenaIdToBytes32(arenaId);
        const iface = new ethers.Interface(ARENA_VAULT_ABI);
        const calldata = iface.encodeFunctionData("deposit", [arenaBytes32]);

        return {
            x402Version: "1.0",
            scheme: "exact",
            network: `eip155:${config.chain.id}`,
            amount: String(Math.floor(config.competition.entryFeeUsd * 1e6)), // in USDC base units
            token: config.tokens.USDC,
            recipient: this.address || "0x0000000000000000000000000000000000000000",
            calldata,                // encoded deposit(arenaId)
            chainId: config.chain.id,
            description: `Alpha Arena entry fee — ${config.competition.entryFeeUsd} USDC`,
            expiresAt: Math.floor(Date.now() / 1000) + 300, // 5 min
        };
    }
}

export const arenaVault = new ArenaVaultContract();
export { ArenaVaultContract };
export default arenaVault;
