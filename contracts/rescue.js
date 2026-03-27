const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });
async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const abi = [
    "function routeFunds(bytes32,address[],uint256[]) external",
    "function distributePayout(bytes32,address[],uint256[]) external"
  ];
  const contract = new ethers.Contract("0xa07d2Ff33400fbE2c741385cb959D5BCbA041493", abi, wallet);
  const arenaId = "cade6ef4-d5a3-4a64-b21f-834dee37d540";
  const arenaBytes32 = ethers.id(arenaId);

  console.log("Routing funds (0 to agents)...");
  const agentWallets = [wallet.address, wallet.address, wallet.address];
  const fakeAmounts = [0n, 0n, 0n];
  const tx1 = await contract.routeFunds(arenaBytes32, agentWallets, fakeAmounts);
  console.log("Tx1 hash:", tx1.hash);
  await tx1.wait();

  console.log("Distributing payout (0.1 to users)...");
  const recipients = ["0x676e94494b0B55f65fBa189B0d76488623076f6D", "0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1", "0x03406A125A604831AC66ADdCD60F21592EDA34A1"];
  const refunds = [100000n, 100000n, 100000n];
  const tx2 = await contract.distributePayout(arenaBytes32, recipients, refunds);
  console.log("Tx2 hash:", tx2.hash);
  await tx2.wait();

  console.log("Rescue Complete!");
}
main().catch(console.error);
