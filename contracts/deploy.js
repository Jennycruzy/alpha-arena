const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const network = hre.network.name;

    if (!deployer) {
        console.error("❌ DEPLOYER_PRIVATE_KEY is missing or invalid in your .env file!");
        console.error("   Please add it and try again.");
        process.exit(1);
    }

    console.log(`\n⚔️  Deploying ArenaVault to ${network}`);
    console.log(`   Deployer: ${deployer.address}`);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`   OKB Balance (gas): ${hre.ethers.formatEther(balance)} OKB`);

    if (balance === 0n) {
        console.error("❌ No OKB for gas. Fund the deployer wallet and retry.");
        process.exit(1);
    }

    // USDC address on X Layer mainnet
    const USDC_ADDRESS =
        process.env.USDC_ADDRESS || "0x74b7f16337b8972027f6196a17a631ac6de26d22";

    // Operator = arena backend wallet
    const OPERATOR_ADDRESS =
        process.env.ARENA_WALLET_ADDRESS || deployer.address;

    console.log(`   USDC: ${USDC_ADDRESS}`);
    console.log(`   Operator: ${OPERATOR_ADDRESS}`);

    // Deploy
    const ArenaVault = await hre.ethers.getContractFactory("ArenaVault");
    const vault = await ArenaVault.deploy(USDC_ADDRESS, OPERATOR_ADDRESS);
    await vault.waitForDeployment();

    const vaultAddress = await vault.getAddress();

    console.log(`\n✅ ArenaVault deployed!`);
    console.log(`   Address: ${vaultAddress}`);
    console.log(`   Explorer: https://www.okx.com/explorer/xlayer/address/${vaultAddress}`);

    // Append ARENA_VAULT_ADDRESS to .env
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");
        if (envContent.includes("ARENA_VAULT_ADDRESS=")) {
            envContent = envContent.replace(
                /ARENA_VAULT_ADDRESS=.*/,
                `ARENA_VAULT_ADDRESS=${vaultAddress}`
            );
        } else {
            envContent += `\nARENA_VAULT_ADDRESS=${vaultAddress}\n`;
        }
        fs.writeFileSync(envPath, envContent);
        console.log(`   Written ARENA_VAULT_ADDRESS to .env`);
    }

    // Save ABI for backend
    const artifactPath = path.resolve(
        __dirname,
        "artifacts/contracts/ArenaVault.sol/ArenaVault.json"
    );
    const abiPath = path.resolve(__dirname, "ArenaVault.abi.json");
    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
        console.log(`   ABI written to contracts/ArenaVault.abi.json`);
    }

    console.log(`\n🚀 Next steps:`);
    console.log(`   1. Fund the operator wallet with OKB for gas`);
    console.log(`   2. Fund the operator wallet with USDC to seed agent wallets`);
    console.log(`   3. Start the backend: npm run dev:backend`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
