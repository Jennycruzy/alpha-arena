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

    // 1. Scan for recent deposits in CHUNKS (X Layer limit is 100 blocks)
    const currentBlock = await provider.getBlockNumber();
    const lookback = 100000; // ~24+ hours
    const startBlock = currentBlock - lookback;
    console.log(`Scanning from block ${startBlock} to ${currentBlock} in 100-block chunks...`);

    const filter = vault.filters.Deposited();
    let logs = [];
    const chunks = [];
    for (let chunkTo = currentBlock; chunkTo > startBlock; chunkTo -= 100) {
        const chunkFrom = Math.max(chunkTo - 99, startBlock);
        chunks.push({ from: chunkFrom, to: chunkTo });
    }

    console.log(`Scanning ${chunks.length} chunks in parallel...`);
    const concurrency = 20;
    for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        process.stdout.write(`\r🔍 Progress: ${((i / chunks.length) * 100).toFixed(1)}%... `);
        const results = await Promise.all(batch.map(c =>
            vault.queryFilter(filter, c.from, c.to).catch(e => {
                console.warn(`\n⚠️ Error on chunk ${c.from}-${c.to}: ${e.message}`);
                return [];
            })
        ));
        for (const r of results) logs = logs.concat(r);
    }
    process.stdout.write(`\r🔍 Progress: 100.0%!      \n`);

    console.log(`Found ${logs.length} total deposit events in history.`);

    const arenasToRefund = new Map(); // arenaId -> { user -> amount }

    for (const log of logs) {
        const arenaId = log.args.arenaId;
        const user = log.args.user;
        const amount = BigInt(log.args.amount.toString());

        if (!arenasToRefund.has(arenaId)) {
            arenasToRefund.set(arenaId, new Map());
        }
        const userMap = arenasToRefund.get(arenaId);
        userMap.set(user, (userMap.get(user) || 0n) + amount);
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
                console.log(`🚀 ROUTING for arena ${arenaId.slice(0, 10)}...`);
                const tx = await vault.routeFunds(arenaId, recipients, amounts, { gasLimit: 1000000 });
                await tx.wait();
                console.log("✅ ROUTED!");
            }

            // Re-check after routing
            const alreadyPaid = await vault.payoutDistributed(arenaId);
            if (!alreadyPaid) {
                console.log(`🚀 DISTRIBUTING to ${recipients.length} users...`);
                const tx = await vault.distributePayout(arenaId, recipients, amounts, { gasLimit: 1000000 });
                await tx.wait();
                console.log("✅ DISTRIBUTED!");
            }
        } catch (err) {
            console.error(`❌ Error refunding ${arenaId}: ${err.message}`);
        }
    }

    console.log(`\n✅ Recovery Complete.`);
}

blockchain_recovery().catch(console.error);
