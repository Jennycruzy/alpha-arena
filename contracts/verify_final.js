const { ethers } = require("ethers");
async function main() {
    const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
    const vaultAddr = "0x89C9DD15D0ee7D994235097fE88547ccC1c82D92";
    const arenaId = "cade6ef4-d5a3-4a64-b21f-834dee37d540";
    const arenaBytes32 = ethers.id(arenaId);
    const userAddr = "0xfF88D1Fd6BEf257d8E76c035B6229700B23167e1";

    const vaultAbi = [
        "function usdc() view returns (address)",
        "function payoutDistributed(bytes32) view returns (bool)",
        "function fundsRouted(bytes32) view returns (bool)"
    ];
    const vault = new ethers.Contract(vaultAddr, vaultAbi, provider);

    const usdcAddr = await vault.usdc();
    const distributed = await vault.payoutDistributed(arenaBytes32);
    const routed = await vault.fundsRouted(arenaBytes32);

    const usdcAbi = ["function balanceOf(address) view returns (uint256)", "function symbol() view returns (string)", "function decimals() view returns (uint8)"];
    const usdc = new ethers.Contract(usdcAddr, usdcAbi, provider);

    const balance = await usdc.balanceOf(userAddr);
    const symbol = await usdc.symbol();
    const decimals = await usdc.decimals();

    console.log({
        vaultAddr,
        usdcAddr,
        symbol,
        decimals,
        distributed,
        routed,
        userBalance: ethers.formatUnits(balance, decimals)
    });
}
main().catch(console.error);
