import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load ENV
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const VAULT_ABI = [
    "function distributePayout(bytes32 arenaId, address[] recipients, uint256[] amounts) external",
    "function routeFunds(bytes32 arenaId, address[] agentWallets, uint256[] amounts) external",
    "function pooledFunds(bytes32 arenaId) view returns (uint256)",
    "function fundsRouted(bytes32 arenaId) view returns (bool)"
];

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

async function emergency_payout() {
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

    console.log(`\n🏥 EMERGENCY PAYOUT RECOVERY 🏥`);
    console.log(`Operator: ${wallet.address}`);

    // 1. Check OKB (Gas)
    const okbBal = await provider.getBalance(wallet.address);
    console.log(`Gas Balance (OKB): ${ethers.utils.formatEther(okbBal)}`);
    if (okbBal.lt(ethers.utils.parseEther("0.005"))) {
        console.error("❌ INSUFFICIENT GAS (OKB). Payout will fail. Please fund this wallet with at least 0.05 OKB.");
        return;
    }

    // 2. Read arenas.json to find users
    const arenasPath = path.resolve(__dirname, "../data/arenas.json");
    if (!fs.existsSync(arenasPath)) {
        console.error("❌ arenas.json not found in backend/data/");
        return;
    }

    const data = JSON.parse(fs.readFileSync(arenasPath, "utf8"));
    const arenas = data.arenas || [];

    for (const arena of arenas) {
        const idStr = arena.id;
        console.log(`\nProcessing Arena: ${idStr.slice(0, 8)}`);

        const arenaBytes32 = idStr.startsWith("0x") ? idStr : ethers.utils.keccak256(ethers.utils.toUtf8Bytes(idStr));

        try {
            const routed = await vault.fundsRouted(arenaBytes32);
            const pool = await vault.pooledFunds(arenaBytes32);
            console.log(`Status: ${routed ? "ROUTED" : "WAITING"} | Pool: ${ethers.utils.formatUnits(pool, 6)} USDC`);

            if (pool.eq(0)) {
                console.log("⏩ No funds in pool, skipping.");
                continue;
            }

            const recipients = arena.users.map(u => u.userId);
            const amounts = arena.users.map(u => ethers.utils.parseUnits(String(u.entryFee.toFixed(6)), 6));

            if (!routed) {
                console.log(`🚀 ROUTING (REFUND) ${recipients.length} users...`);
                const tx = await vault.routeFunds(arenaBytes32, recipients, amounts, { gasLimit: 800000 });
                console.log(`Tx Sent: ${tx.hash}. Waiting for confirmation...`);
                await tx.wait();
                console.log("✅ REFUND ROUTED SUCCESSFULLY!");
            } else {
                console.log(`🚀 DISTRIBUTING PAYOUT to ${recipients.length} users...`);
                const tx = await vault.distributePayout(arenaBytes32, recipients, amounts, { gasLimit: 800000 });
                console.log(`Tx Sent: ${tx.hash}. Waiting for confirmation...`);
                await tx.wait();
                console.log("✅ PAYOUT DISTRIBUTED SUCCESSFULLY!");
            }
        } catch (err) {
            console.error(`❌ Error processing arena ${idStr}: ${err.message}`);
        }
    }

    console.log(`\n✅ Emergency Cleanup Complete.`);
}

emergency_payout().catch(console.error);
