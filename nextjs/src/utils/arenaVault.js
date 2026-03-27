/**
 * Frontend ArenaVault helper
 * Calls the deployed ArenaVault contract from the user's browser wallet.
 * Uses viem/wagmi for the actual signing — this module just prepares the call data.
 */

// Minimal ABI for frontend calls
export const ARENA_VAULT_ABI = [
    {
        name: "deposit",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "arenaId", type: "bytes32" }],
        outputs: [],
    },
    {
        name: "MINIMUM_ENTRY",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "getDeposit",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "arenaId", type: "bytes32" },
            { name: "user", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
];

// ERC20 approve ABI
export const ERC20_APPROVE_ABI = [
    {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
];

/**
 * Convert a string arenaId (UUID) to bytes32 for the contract.
 * Must match the backend's ArenaVaultContract.arenaIdToBytes32()
 */
export async function arenaIdToBytes32(arenaId) {
    // keccak256 of the UTF-8 arenaId string
    const { keccak256, toBytes } = await import("viem");
    return keccak256(toBytes(arenaId));
}

/**
 * Format entry fee as USDC base units (6 decimals)
 * e.g. 0.1 → 100000n
 */
export function toUsdcUnits(amount) {
    return BigInt(Math.floor(amount * 1_000_000));
}
