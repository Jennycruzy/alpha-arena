import { ethers } from "ethers";
import config from "./backend/config/index.js";
import { ArenaVaultContract } from "./backend/src/contracts/ArenaVault.js";
import { arenaWallet, provider } from "./backend/src/blockchain/chain.js";

async function rescue() {
    console.log("🚀 Starting manual rescue payout...");

    const recipients = [
        "0xff88d1fd6bef257d8e76c035b6229700b23167e1",
        "0x676e94494b0b55f65fba189b0d76488623076f6d",
        "0xc7187b343b5ab40203aa5cf98ab2c1eb3c8b2c7f"
    ];

    const amounts = [0.1, 0.1, 0.1]; // USDC floats
    const arenaId = "c2bcd80f-manual-rescue";
    const arenaBytes32 = ArenaVaultContract.arenaIdToBytes32(arenaId);
    const rawAmounts = amounts.map(a => BigInt(Math.floor(a * 1e6)));

    const signer = arenaWallet.get();
    const vaultAddress = config.arenaVaultAddress;

    const abi = [
        "function distributePayout(bytes32 arenaId, address[] recipients, uint256[] amounts) external"
    ];

    const contract = new ethers.Contract(vaultAddress, abi, signer);

    try {
        const nonce = await signer.getNonce();
        console.log(`Using nonce: ${nonce} for ${recipients.length} recipients`);

        const tx = await contract.distributePayout(arenaBytes32, recipients, rawAmounts, { nonce });
        console.log(`Rescue tx sent: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`Rescue confirmed in block ${receipt.blockNumber}`);
        console.log("✅ SUCCESS: Funds returned to testing wallets.");
    } catch (err) {
        console.error("❌ Rescue failed:", err.message);
    }
}

rescue().then(() => process.exit(0));
