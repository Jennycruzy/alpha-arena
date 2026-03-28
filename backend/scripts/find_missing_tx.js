import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function run() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const user = "0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1";
    const vault = "0x89C9DD15D0ee7D994235097fE88547ccC1c82D92";
    const usdc = "0x74b7f16337b8972027f6196a17a631ac6de26d22";

    console.log(`\n🕵️‍♂️ SEARCHING FOR TRANFERS FROM ${user} TO ${vault}`);

    const filter = {
        address: usdc,
        topics: [
            ethers.utils.id("Transfer(address,address,uint256)"),
            ethers.utils.hexZeroPad(user, 32),
            ethers.utils.hexZeroPad(vault, 32)
        ]
    };

    const currentBlock = await provider.getBlockNumber();
    const logs = await provider.getLogs({
        ...filter,
        fromBlock: currentBlock - 300000,
        toBlock: currentBlock
    });

    console.log(`Found ${logs.length} transfers in last 300k blocks.`);
    for (const log of logs) {
        console.log(`Tx: ${log.transactionHash} | Block: ${log.blockNumber}`);
    }
}

run().catch(console.error);
