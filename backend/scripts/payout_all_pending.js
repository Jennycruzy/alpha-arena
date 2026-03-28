import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function run() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.ARENA_WALLET_PRIVATE_KEY, provider);
    const vaultAddress = process.env.ARENA_VAULT_ADDRESS;
    const vault = new ethers.Contract(vaultAddress, [
        "event Deposited(bytes32 indexed arenaId, address indexed user, uint256 amount)",
        "function distributePayout(bytes32 arenaId, address[] recipients, uint256[] amounts) external",
        "function fundsRouted(bytes32 arenaId) view returns (bool)",
        "function payoutDistributed(bytes32 arenaId) view returns (bool)",
        "function arenaReceipts(bytes32 arenaId, address user) view returns (uint256)"
    ], wallet);

    const user = "0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1";
    console.log(`\n🕵️‍♂️ PENDING PAYOUT SCAN FOR ${user}`);
    console.log(`Vault: ${vaultAddress}`);

    // Scan for all deposits to find relevant arenas (in chunks of 2000 for speed)
    const currentBlock = await provider.getBlockNumber();
    const lookback = 100000;
    const startBlock = currentBlock - lookback;

    console.log(`Scanning ${lookback} blocks for deposits...`);
    const filter = vault.filters.Deposited(null, user);

    let logs = [];
    for (let i = currentBlock; i > startBlock; i -= 2000) {
        const from = Math.max(startBlock, i - 1999);
        const chunk = await vault.queryFilter(filter, from, i).catch(() => []);
        logs = logs.concat(chunk);
    }

    const relevantArenas = [...new Set(logs.map(l => l.args.arenaId))];
    console.log(`Found ${relevantArenas.length} arenas with user deposits.\n`);

    for (const arenaId of relevantArenas) {
        try {
            const [isRouted, isPaid, balance] = await Promise.all([
                vault.fundsRouted(arenaId),
                vault.payoutDistributed(arenaId),
                vault.arenaReceipts(arenaId, user)
            ]);

            const balStr = ethers.utils.formatUnits(balance, 6);
            process.stdout.write(`Arena ${arenaId.slice(0, 10)}... | Routed: ${isRouted ? "Y" : "N"} | Paid: ${isPaid ? "Y" : "N"} | Balance: ${balStr} USDC `);

            if (isRouted && !isPaid && balance.gt(0)) {
                console.log(`\n🚀 Distributing ${balStr} USDC...`);
                const tx = await vault.distributePayout(arenaId, [user], [balance], { gasLimit: 1000000 });
                await tx.wait();
                console.log("✅ Success!");
            } else {
                process.stdout.write(`- OK\n`);
            }
        } catch (e) {
            console.log(`\n❌ Error checking ${arenaId}: ${e.message}`);
        }
    }
}

run().catch(console.error);
