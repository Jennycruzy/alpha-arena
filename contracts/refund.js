const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config({ path: "../.env" });
async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const abi = ["function distributePayout(bytes32,address[],uint256[]) external"];
  const contract = new ethers.Contract("0xa07d2Ff33400fbE2c741385cb959D5BCbA041493", abi, wallet);
  const arenaId = "cade6ef4-d5a3-4a64-b21f-834dee37d540";
  const arenaBytes32 = ethers.id(arenaId); // Wait, keccak256(toUtf8Bytes(arenaId)) is what id() does
  const recipients = ["0x676e94494b0B55f65fBa189B0d76488623076f6D", "0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1", "0x03406A125A604831AC66ADdCD60F21592EDA34A1"];
  const amounts = [100000n, 100000n, 100000n];
  console.log("Sending refund for arena", arenaId, "on contract", contract.target);
  const tx = await contract.distributePayout(arenaBytes32, recipients, amounts);
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Success!");
}
main().catch(console.error);
