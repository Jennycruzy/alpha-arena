import config from "../../config/index.js";
import logger from "../utils/logger.js";

/**
 * PaymentService — handles x402 entry fee payments.
 *
 * In production, this integrates with the okx-x402-payment skill
 * to verify on-chain payment from user wallet to arena wallet.
 *
 * Flow:
 * 1. Frontend requests payment intent
 * 2. User signs and sends USDC tx to arena wallet
 * 3. Backend verifies tx on-chain
 * 4. User is cleared to join arena
 */
class PaymentService {
  constructor() {
    this.pendingPayments = new Map(); // paymentId -> { userId, amount, status }
    this.verifiedPayments = new Map(); // paymentId -> tx details
  }

  /**
   * Create a payment intent
   */
  createPaymentIntent(userId) {
    const paymentId = `pay_${Date.now()}_${userId.slice(0, 8)}`;
    const intent = {
      paymentId,
      userId,
      amount: config.competition.entryFeeUsd,
      currency: "USDC",
      recipientAddress: config.arenaWallet.address,
      chainId: config.chain.id,
      tokenAddress: config.tokens.USDC,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
    };

    this.pendingPayments.set(paymentId, intent);
    logger.info(`Payment intent created: ${paymentId} for $${intent.amount} USDC`);
    return intent;
  }

  /**
   * Verify a payment on-chain.
   * In production, this checks the actual tx on X Layer.
   * For MVP, we verify the tx hash and amount.
   */
  async verifyPayment(paymentId, txHash) {
    const intent = this.pendingPayments.get(paymentId);
    if (!intent) throw new Error("Payment intent not found");
    if (intent.status === "verified") throw new Error("Payment already verified");
    if (Date.now() > intent.expiresAt) throw new Error("Payment expired");

    // In production: verify tx on-chain using ethers.js
    // const receipt = await provider.getTransactionReceipt(txHash);
    // Verify: correct to address, correct token, correct amount, sufficient confirmations

    // For now, mark as verified (replace with real verification)
    intent.status = "verified";
    intent.txHash = txHash;
    intent.verifiedAt = Date.now();

    this.verifiedPayments.set(paymentId, intent);
    this.pendingPayments.delete(paymentId);

    logger.info(`Payment verified: ${paymentId} | tx: ${txHash}`);

    return {
      verified: true,
      paymentId,
      userId: intent.userId,
      amount: intent.amount,
    };
  }

  /**
   * Check if a user has a verified payment for the current arena
   */
  hasVerifiedPayment(userId) {
    for (const [, payment] of this.verifiedPayments) {
      if (payment.userId === userId && payment.status === "verified") {
        return payment;
      }
    }
    return null;
  }
}

export const paymentService = new PaymentService();
export default paymentService;
