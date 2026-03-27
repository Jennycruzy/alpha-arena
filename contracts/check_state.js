const { ethers } = require("ethers");
async function main() {
    const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
    const abi = [
        "function fundsRouted(bytes32) view returns (bool)",
        "function payoutDistributed(bytes32) view returns (bool)",
        "function pooledFunds(bytes32) view returns (uint256)",
        "function arenaStartTime(bytes32) view returns (uint256)"
    ];
    const contract = new ethers.Contract("0xa07d2Ff33400fbE2c741385cb959D5BCbA041493", abi, provider);
    const arenaId = "cade6ef4-d5a3-4a64-b21f-834dee37d540";
    const arenaBytes32 = ethers.id(arenaId);

    const routed = await contract.fundsRouted(arenaBytes32);
    const payout = await contract.payoutDistributed(arenaBytes32);
    const pool = await contract.pooledFunds(arenaBytes32);
    const start = await contract.arenaStartTime(arenaBytes32);

    console.log({ routed, payout, pool: pool.toString(), start: start.toString() });
}
main().catch(console.error);
