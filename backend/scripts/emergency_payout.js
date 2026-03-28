import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load ENV
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const VAULT_ABI = [
    "event Deposited(bytes32 indexed arenaId, address indexed user, uint256 amount)",
    "function distributePayout(bytes32 arenaId, address[] recipients, uint256[] amounts) external",
    "function routeFunds(bytes32 arenaId, address[] agentWallets, uint256[] amounts) external",
    "function pooledFunds(bytes32 arenaId) view returns (uint256)",
    "function fundsRouted(bytes32 arenaId) view returns (bool)",
    "function payoutDistributed(bytes32 arenaId) view returns (bool)"
];

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

async function blockchain_recovery() {
    const rpcUrl = process.env.RPC_URL || "https://rpc.xlayer.tech";
    const privateKey = process.env.ARENA_WALLET_PRIVATE_KEY;
    const vaultAddress = process.env.ARENA_VAULT_ADDRESS;
    const usdcAddress = process.env.USDC_ADDRESS || "0x74b7f16337b8972027f6196a17a631ac6de26d22";

    if (!privateKey || !vaultAddress) {
        console.error("❌ Missing ARENA_WALLET_PRIVATE_KEY or ARENA_VAULT_ADDRESS in .env");
        return;
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const vault = new ethers.Contract(vaultAddress, VAULT_ABI, wallet);
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider);

    console.log(`\n🕵️‍♂️ BLOCKCHAIN RECOVERY SCAN 🕵️‍♂️`);
    console.log(`Vault: ${vaultAddress}`);
    console.log(`Operator: ${wallet.address}`);

    // 1. Scan for recent deposits
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 100000; // Look back ~1 day
    console.log(`Scanning from block ${fromBlock} to ${currentBlock}...`);

    const filter = vault.filters.Deposited();
    const logs = await vault.queryFilter(filter, fromBlock, currentBlock);

    console.log(`Found ${logs.length} total deposit events.`);

    const arenasToRefund = new Map(); // arenaId -> { user -> amount }

    for (const log of logs) {
        const { arenaId, user, amount } = log.args;
        if (!arenasToRefund.has(arenaId)) {
            arenasToRefund.set(arenaId, new Map());
        }
        const userMap = arenasToRefund.get(arenaId);
        userMap.set(user, (userMap.get(user) || BigInt(0)) + amount);
    }

    for (const [arenaId, users] of arenasToRefund.entries()) {
        console.log(`\nReviewing Arena ${arenaId}...`);

        const isPayoutDone = await vault.payoutDistributed(arenaId);
        const isRouted = await vault.fundsRouted(arenaId);
        const pool = await vault.pooledFunds(arenaId);

        if (isPayoutDone) {
            console.log("✅ Already paid out. Skipping.");
            continue;
        }

        if (pool.eq(0)) {
            console.log("⏩ Pool is empty. Skipping.");
            continue;
        }

        const recipients = Array.from(users.keys());
        const amounts = Array.from(users.values());
        const total = amounts.reduce((s, a) => s + a, BigInt(0));

        console.log(`💰 Pooled: ${ethers.utils.formatUnits(pool, 6)} USDC | Found User Balance: ${ethers.utils.formatUnits(total, 6)} USDC`);

        try {
            if (!isRouted) {
                console.log(`🚀 ROUTING (REFUND) to ${recipients.length} users...`);
                // Use a larger gas limit to be safe
                const tx = await vault.routeFunds(arenaId, recipients, amounts, { gasLimit: 1000000 });
                console.log(`Tx: ${tx.hash}. Waiting...`);
                await tx.wait();
                console.log("✅ REFUND ROUTED!");
            } else {
                console.log(`🚀 DISTRIBUTING PAYOUT to ${recipients.length} users...`);
                const tx = await vault.distributePayout(arenaId, recipients, amounts, { gasLimit: 1000000 });
                console.log(`Tx: ${tx.hash}. Waiting...`);
                await tx.wait();
                console.log("✅ PAYOUT DISTRIBUTED!");
            }
        } catch (err) {
            console.error(`❌ Error refunding ${arenaId}: ${err.message}`);
        }
    }

    console.log(`\n✅ Recovery Complete.`);
}

blockchain_recovery().catch(console.error);
