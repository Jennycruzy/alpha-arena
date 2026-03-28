import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const RPC_URL = process.env.RPC_URL || "https://rpc.xlayer.tech";
const USDC_ADDR = process.env.USDC_ADDRESS || "0x74b7f16337b8972027f6196a17a631ac6de26d22";
const USER_ADDR = "0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1";

async function check() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
    const usdc = new ethers.Contract(USDC_ADDR, abi, provider);

    const [bal, dec] = await Promise.all([
        usdc.balanceOf(USER_ADDR),
        usdc.decimals()
    ]);

    console.log(`User: ${USER_ADDR}`);
    console.log(`USDC Balance: ${ethers.utils.formatUnits(bal, dec)} USDC`);

    const txs = [
        "0xc0101d2ce47f38049df490dbf2d8b1e8f926d150b3d6b516148e0c06bed65a87",
        "0xdeb6025791a81b691ad18ea820f21ac032d089b0c3306fdfdcd78da1b12c76b5",
        "0x8fa8ececc9a48733fdfd41d67848883bb2a9cffdd2a83f354dd03a2c4ceafa1c",
        "0xe2f45c1a4d90476ccd4b7084bcca630f5b333aab1871d8cb5f38f93c8102eaf5"
    ];

    for (const hash of txs) {
        try {
            const rc = await provider.getTransactionReceipt(hash);
            console.log(`Tx ${hash.slice(0, 10)}...: ${rc ? (rc.status === 1 ? "SUCCESS" : "FAILED") : "NOT FOUND"}`);
        } catch (e) {
            console.log(`Tx ${hash.slice(0, 10)}...: ERROR ${e.message}`);
        }
    }
}

check().catch(console.error);
