// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ArenaVault
 * @notice On-chain escrow and payout engine for Alpha Arena on X Layer.
 *         Gas is paid in OKB (X Layer native token).
 *
 * Flow:
 *  1. User calls deposit(arenaId) sending USDC → this contract holds it.
 *     This is the x402 payment target: the HTTP 402 response tells the frontend
 *     to call this function with the correct arenaId encoded in calldata.
 *
 *  2. Operator calls routeFunds(arenaId, agentWallets, amounts)
 *     → USDC moves to each agent's dedicated trading wallet so agents can trade.
 *
 *  3. After competition, operator calls distributePayout(arenaId, recipients, amounts)
 *     → USDC sent directly to each user's wallet (winner gets principal + profit,
 *        losers get their remaining balance).
 *
 *  4. Emergency: if operator never calls distribute within EMERGENCY_TIMEOUT,
 *     any depositor can withdraw their original deposit.
 */
contract ArenaVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────────

    address public operator;
    address public immutable usdc;

    uint256 public constant MINIMUM_ENTRY = 500_000; // 0.5 USDC (6 decimals)
    uint256 public constant EMERGENCY_TIMEOUT = 48 hours;

    // arenaId → user → amount deposited
    mapping(bytes32 => mapping(address => uint256)) public deposits;

    // arenaId → total pooled USDC
    mapping(bytes32 => uint256) public pooledFunds;

    // arenaId → start timestamp (set when routeFunds is called)
    mapping(bytes32 => uint256) public arenaStartTime;

    // arenaId → whether payout has been distributed
    mapping(bytes32 => bool) public payoutDistributed;

    // arenaId → whether funds have been routed to agents
    mapping(bytes32 => bool) public fundsRouted;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Deposited(bytes32 indexed arenaId, address indexed user, uint256 amount);
    event FundsRouted(bytes32 indexed arenaId, address[] agentWallets, uint256[] amounts);
    event PayoutDistributed(bytes32 indexed arenaId, address indexed recipient, uint256 amount);
    event EmergencyWithdraw(bytes32 indexed arenaId, address indexed user, uint256 amount);
    event OperatorChanged(address indexed oldOperator, address indexed newOperator);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOperator() {
        require(msg.sender == operator, "ArenaVault: not operator");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdc, address _operator) {
        require(_usdc != address(0), "ArenaVault: zero usdc");
        require(_operator != address(0), "ArenaVault: zero operator");
        usdc = _usdc;
        operator = _operator;
    }

    // ─── User Functions ───────────────────────────────────────────────────────

    /**
     * @notice x402 payment target — deposit USDC entry fee into the arena escrow.
     * @dev    Frontend calls this after receiving a 402 response from the backend.
     *         User must first approve this contract to spend USDC.
     * @param  arenaId  The competition identifier (bytes32 UUID from backend)
     */
    function deposit(bytes32 arenaId) external nonReentrant {
        require(!fundsRouted[arenaId], "ArenaVault: competition already started");
        require(!payoutDistributed[arenaId], "ArenaVault: competition already ended");

        uint256 entryAmount = MINIMUM_ENTRY;

        // Pull USDC from user (requires prior approve())
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), entryAmount);

        deposits[arenaId][msg.sender] += entryAmount;
        pooledFunds[arenaId] += entryAmount;

        emit Deposited(arenaId, msg.sender, entryAmount);
    }

    /**
     * @notice Deposit a custom amount (for future variable entry tiers).
     * @param  arenaId  Competition identifier
     * @param  amount   USDC amount in base units (6 decimals). Must be >= MINIMUM_ENTRY.
     */
    function depositAmount(bytes32 arenaId, uint256 amount) external nonReentrant {
        require(amount >= MINIMUM_ENTRY, "ArenaVault: below minimum entry");
        require(!fundsRouted[arenaId], "ArenaVault: competition already started");
        require(!payoutDistributed[arenaId], "ArenaVault: competition already ended");

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);

        deposits[arenaId][msg.sender] += amount;
        pooledFunds[arenaId] += amount;

        emit Deposited(arenaId, msg.sender, amount);
    }

    // ─── Operator Functions ───────────────────────────────────────────────────

    /**
     * @notice Route pooled entry fees to agent trading wallets when competition starts.
     * @dev    Called by the arena backend once all 3 agents are selected.
     *         Gas paid in OKB from the operator wallet.
     * @param  arenaId       Competition identifier
     * @param  agentWallets  Array of agent trading wallet addresses
     * @param  amounts       USDC amount to send to each agent wallet
     */
    function routeFunds(
        bytes32 arenaId,
        address[] calldata agentWallets,
        uint256[] calldata amounts
    ) external onlyOperator nonReentrant {
        require(!fundsRouted[arenaId], "ArenaVault: already routed");
        require(agentWallets.length == amounts.length, "ArenaVault: length mismatch");
        require(agentWallets.length > 0, "ArenaVault: empty arrays");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(total <= pooledFunds[arenaId], "ArenaVault: insufficient pool");

        fundsRouted[arenaId] = true;
        arenaStartTime[arenaId] = block.timestamp;

        for (uint256 i = 0; i < agentWallets.length; i++) {
            if (amounts[i] > 0) {
                IERC20(usdc).safeTransfer(agentWallets[i], amounts[i]);
            }
        }

        emit FundsRouted(arenaId, agentWallets, amounts);
    }

    /**
     * @notice Distribute payouts to all users after competition ends.
     * @dev    Called by the arena backend after agents return funds to the vault.
     *         Winners receive principal + proportional profit.
     *         Losers receive remaining balance (if any).
     *         Gas paid in OKB from the operator wallet.
     * @param  arenaId     Competition identifier
     * @param  recipients  Array of user wallet addresses
     * @param  amounts     USDC payout amount per user (in base units)
     */
    function distributePayout(
        bytes32 arenaId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOperator nonReentrant {
        require(fundsRouted[arenaId], "ArenaVault: funds not yet routed");
        require(!payoutDistributed[arenaId], "ArenaVault: payout already done");
        require(recipients.length == amounts.length, "ArenaVault: length mismatch");
        require(recipients.length > 0, "ArenaVault: empty arrays");

        payoutDistributed[arenaId] = true;

        uint256 vaultBalance = IERC20(usdc).balanceOf(address(this));

        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] > 0 && amounts[i] <= vaultBalance) {
                IERC20(usdc).safeTransfer(recipients[i], amounts[i]);
                vaultBalance -= amounts[i];
                emit PayoutDistributed(arenaId, recipients[i], amounts[i]);
            }
        }
    }

    /**
     * @notice Receive agent funds back into the vault before distributePayout.
     * @dev    Agent trading wallets approve + call this to return funds.
     *         The operator backend calls this on behalf of each agent wallet.
     * @param  amount  USDC amount to return to vault
     */
    function returnFunds(uint256 amount) external nonReentrant {
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);
    }

    // ─── Emergency ────────────────────────────────────────────────────────────

    /**
     * @notice Emergency withdrawal — available if operator never distributes within 48h.
     * @param  arenaId  Competition identifier
     */
    function emergencyWithdraw(bytes32 arenaId) external nonReentrant {
        require(fundsRouted[arenaId], "ArenaVault: funds not routed yet");
        require(!payoutDistributed[arenaId], "ArenaVault: payout already done");
        require(
            block.timestamp >= arenaStartTime[arenaId] + EMERGENCY_TIMEOUT,
            "ArenaVault: timeout not reached"
        );

        uint256 userDeposit = deposits[arenaId][msg.sender];
        require(userDeposit > 0, "ArenaVault: no deposit");

        uint256 totalPool = pooledFunds[arenaId];
        uint256 vaultBalance = IERC20(usdc).balanceOf(address(this));

        // Proportional share of whatever is left
        uint256 share = (vaultBalance * userDeposit) / totalPool;
        deposits[arenaId][msg.sender] = 0;

        if (share > 0) {
            IERC20(usdc).safeTransfer(msg.sender, share);
        }

        emit EmergencyWithdraw(arenaId, msg.sender, share);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Transfer operator role to a new address.
     */
    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "ArenaVault: zero address");
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getDeposit(bytes32 arenaId, address user) external view returns (uint256) {
        return deposits[arenaId][user];
    }

    function getPooledFunds(bytes32 arenaId) external view returns (uint256) {
        return pooledFunds[arenaId];
    }

    function isArenaStarted(bytes32 arenaId) external view returns (bool) {
        return fundsRouted[arenaId];
    }

    function isPayoutDone(bytes32 arenaId) external view returns (bool) {
        return payoutDistributed[arenaId];
    }
}
