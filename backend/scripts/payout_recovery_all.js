import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function run() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.ARENA_WALLET_PRIVATE_KEY, provider);
    const vault = new ethers.Contract(process.env.ARENA_VAULT_ADDRESS, [
        "event Deposited(bytes32 indexed arenaId, address indexed user, uint256 amount)",
        "function distributePayout(bytes32 arenaId, address[] recipients, uint256[] amounts) external",
        "function routeFunds(bytes32 arenaId, address[] agentWallets, uint256[] amounts) external",
        "function fundsRouted(bytes32 arenaId) view returns (bool)",
        "function payoutDistributed(bytes32 arenaId) view returns (bool)",
        "function arenaReceipts(bytes32 arenaId, address user) view returns (uint256)"
    ], wallet);

    const targetUser = "0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1";
    console.log(`\n🕵️‍♂️ GLOBAL RECOVERY SCAN FOR ${targetUser}`);

    const currentBlock = await provider.getBlockNumber();
    const lookback = 300000;
    const startBlock = currentBlock - lookback;

    console.log(`Scanning ${lookback} blocks for ALL deposits...`);
    const filter = vault.filters.Deposited();

    let logs = [];
    const chunks = [];
    for (let i = currentBlock; i > startBlock; i -= 2000) {
        const from = Math.max(startBlock, i - 1999);
        chunks.push({ from, to: i });
    }

    console.log(`Scanning ${chunks.length} chunks with concurrency 20...`);
    const concurrency = 20;
    for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        process.stdout.write(`\r🔍 Batch ${i / concurrency + 1}/${Math.ceil(chunks.length / concurrency)}... `);
        const results = await Promise.all(batch.map(c =>
            vault.queryFilter(filter, c.from, c.to).catch(e => {
                console.warn(`\n⚠️ Error ${c.from}-${c.to}: ${e.message}`);
                return [];
            })
        ));
        for (const r of results) logs = logs.concat(r);
    }
    process.stdout.write(`\r🔍 Progress: 100.0%!      \n`);

    const allArenas = [...new Set(logs.map(l => l.args.arenaId))];
    console.log(`Found ${allArenas.length} unique arenas in history.`);

    for (const arenaId of allArenas) {
        try {
            const [isRouted, isPaid, balance] = await Promise.all([
                vault.fundsRouted(arenaId),
                vault.payoutDistributed(arenaId),
                vault.arenaReceipts(arenaId, targetUser)
            ]);

            if (balance.gt(0) && !isPaid) {
                const balStr = ethers.utils.formatUnits(balance, 6);
                console.log(`\nArena ${arenaId.slice(0, 10)}... | Balance: ${balStr} USDC | Routed: ${isRouted}`);

                if (!isRouted) {
                    console.log(`🚀 ROUTING AND DISTRIBUTING...`);
                    await (await vault.routeFunds(arenaId, [targetUser], [balance], { gasLimit: 1000000 })).wait();
                } else {
                    console.log(`🚀 DISTRIBUTING...`);
                }

                await (await vault.distributePayout(arenaId, [targetUser], [balance], { gasLimit: 1000000 })).wait();
                console.log("✅ SUCCESS!");
            }
        } catch (e) {
            // Skip errors
        }
    }
    console.log("\n✅ Global Recovery Finished.");
}

run().catch(console.error);
