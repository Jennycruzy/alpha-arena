const { ethers } = require("ethers");
async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const usdcAbi = ["function balanceOf(address) view returns (uint256)"];
  const usdcAddress = "0x74b7F16337b8972027F6196A17a631aC6dE26d22";
  const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);

  const w1 = await usdcContract.balanceOf("0x676e94494b0B55f65fBa189B0d76488623076f6D");
  const w2 = await usdcContract.balanceOf("0x03406A125A604831AC66ADdCD60F21592EDA34A1");
  const w3 = await usdcContract.balanceOf("0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1");
  const vault = await usdcContract.balanceOf("0xa07d2Ff33400fbE2c741385cb959D5BCbA041493");

  console.log("Vault:", vault.toString());
  console.log("Wallet 1 (0x676e...):", ethers.formatUnits(w1, 6), "USDC");
  console.log("Wallet 2 (0x0340...):", ethers.formatUnits(w2, 6), "USDC");
  console.log("Wallet 3 (0xfF88...):", ethers.formatUnits(w3, 6), "USDC");
}
main().catch(console.error).then(() => process.exit(0));
