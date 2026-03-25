# Alpha Arena — Smart Contracts

This directory is reserved for future on-chain arena contracts:

- **ArenaEscrow.sol** — Holds entry fees in escrow during competition
- **PayoutDistributor.sol** — Trustless winner payout distribution
- **AgentRegistry.sol** — On-chain agent registration and verification

For MVP, the backend manages funds via a hot wallet. Production should move to
contract-based escrow for trustless operation.
