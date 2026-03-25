import config from "../../config/index.js";
import { arenaVault } from "../contracts/ArenaVault.js";
import logger from "../utils/logger.js";

/**
 * x402 Payment Middleware for Alpha Arena
 *
 * Implements the HTTP 402 Payment Required protocol:
 *
 *   Client → POST /api/arena/join
 *   Server ← 402 { x402: { amount, token, recipient, calldata, chainId } }
 *   Client → call ArenaVault.deposit(arenaId) from wallet
 *   Client → POST /api/arena/join  X-Payment: <txHash>
 *   Server → verifyPayment() → check Deposited event on-chain
 *   Server ← 200 { arenaId, joined: true }
 */

/**
 * Express middleware: require payment before joinArena.
 * In DEMO_MODE: skips the payment check entirely.
 */
export function require402(req, res, next) {
    if (config.demoMode) {
        // Skip payment entirely in demo mode
        req.payment = { verified: true, amount: config.competition.entryFeeUsd, demo: true };
        return next();
    }

    const paymentHeader = req.headers["x-payment"];

    if (!paymentHeader) {
        // No payment header — issue a 402 with the payment specification
        const arenaId = req.body?.arenaId || "pending";
        const paymentSpec = arenaVault.getPaymentSpec(arenaId);

        logger.info(`x402: Issuing 402 for arena join (arena: ${arenaId})`);

        return res.status(402).json({
            error: "Payment Required",
            x402: paymentSpec,
        });
    }

    // Payment header present — store for verification in the route handler
    req.paymentTxHash = paymentHeader;
    next();
}

/**
 * Verify the X-Payment txHash on-chain against the ArenaVault contract.
 * Must be called inside the route handler after require402 middleware passes.
 *
 * @param {string} txHash      - Transaction hash from X-Payment header
 * @param {string} arenaId     - UUID of the arena
 * @param {string} userAddress - User's wallet address
 * @returns {{ verified: boolean, amount: number }}
 */
export async function verifyPayment(txHash, arenaId, userAddress) {
    if (config.demoMode) {
        return { verified: true, amount: config.competition.entryFeeUsd, demo: true };
    }

    try {
        const result = await arenaVault.verifyDeposit(
            txHash,
            arenaId,
            userAddress,
            config.competition.entryFeeUsd
        );
        logger.info(`x402: Payment verified for ${userAddress} (arena: ${arenaId}, tx: ${txHash})`);
        return result;
    } catch (err) {
        logger.error(`x402: Payment verification failed: ${err.message}`);
        throw err;
    }
}

/**
 * Build a 402 response body for any route that requires payment.
 * Useful for routes other than arena/join.
 */
export function build402Response(arenaId) {
    return {
        error: "Payment Required",
        x402: arenaVault.getPaymentSpec(arenaId),
    };
}
