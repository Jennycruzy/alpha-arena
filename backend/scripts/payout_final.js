import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function run() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.ARENA_WALLET_PRIVATE_KEY, provider);
    const vault = new ethers.Contract(process.env.ARENA_VAULT_ADDRESS, [
        "function distributePayout(bytes32 arenaId, address[] recipients, uint256[] amounts) external",
        "function routeFunds(bytes32 arenaId, address[] agentWallets, uint256[] amounts) external",
        "function fundsRouted(bytes32 arenaId) view returns (bool)"
    ], wallet);

    const arenaId = "0x9ea0fd237b1ac3038c880d9b05b4c6bbf316bd27c320031ec31d63ed657e2f71";
    const user = "0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1";
    const amount = ethers.utils.parseUnits("0.1", 6);

    console.log(`Checking Arena ${arenaId}...`);
    const isRouted = await vault.fundsRouted(arenaId);
    console.log(`Funds Routed Status: ${isRouted}`);

    if (!isRouted) {
        console.log("🚀 Mapping out Route...");
        const gas = await vault.estimateGas.routeFunds(arenaId, [user], [amount]).catch(e => {
            console.warn("⚠️ Gas estimate failed, using 1M");
            return 1000000;
        });
        console.log(`Estimated Gas: ${gas}`);

        const tx = await vault.routeFunds(arenaId, [user], [amount], { gasLimit: gas });
        console.log(`Tx Broadcasted: ${tx.hash}. Waiting...`);
        const receipt = await tx.wait();
        console.log(`✅ Routed in block ${receipt.blockNumber}`);
    } else {
        console.log("⏩ Already Routed.");
    }

    console.log("🚀 Distributing...");
    const dGas = await vault.estimateGas.distributePayout(arenaId, [user], [amount]).catch(e => {
        console.warn("⚠️ Payout gas estimate failed, using 1M");
        return 1000000;
    });
    const tx2 = await vault.distributePayout(arenaId, [user], [amount], { gasLimit: dGas });
    console.log(`Tx2 Broadcasted: ${tx2.hash}. Waiting...`);
    const receipt2 = await tx2.wait();
    console.log(`✅ PAYOUT SUCCESS in block ${receipt2.blockNumber}`);
}

run().catch(e => console.error("❌ ERROR:", e.message));
