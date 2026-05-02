/**
 * ============================================================================
 * VERITAS FRONTIER — x402 Facilitator (Agent-to-Agent Payments)
 * ============================================================================
 * 
 * Intercepts HTTP 402 Payment Required headers from vendor APIs.
 * Cross-references facilitators against the Solana Audit Arena blacklist.
 * Automates micropayments for "Verified Vendors" (e.g., elizaOS, Tavily).
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface x402Request {
  merchantId: string;
  amount: number; // in SOL or USDC
  item: string;
  facilitatorAddress: string;
}

export interface x402PaymentResult {
  paid: boolean;
  txId?: string;
  reason: string;
  merchantVerified: boolean;
  budgetRemaining?: number;
}

export interface x402PaymentRecord {
  request: x402Request;
  result: x402PaymentResult;
  timestamp: number;
}

// ── Blacklist (Known Scam Facilitators) ────────────────────────────────────

const SCAM_FACILITATORS = new Set([
  "drain-wallet-fake-api",
  "rugpull-data-service",
  "phishing-oracle-v2",
]);

// ── x402 Facilitator Class ────────────────────────────────────────────────

export class x402Facilitator {
  private verifiedVendors: Set<string> = new Set([
    "eliza-os-official",
    "jupiter-ag-swap",
    "tavily-search-api",
    "deepseek-api-v3",
    "helius-rpc-provider",
    "birdeye-token-api",
  ]);

  private paymentHistory: x402PaymentRecord[] = [];
  private totalSpent: number = 0;

  /**
   * Automatically negotiates and pays HTTP 402 requests.
   * Cross-references against the scam blacklist before payment.
   */
  async handlePayment(request: x402Request, dailyBudget: number): Promise<x402PaymentResult> {
    console.log(`\n💳 [x402] Intercepted Payment Required: $${request.amount} for "${request.item}"...`);

    // 1. Blacklist Check
    if (SCAM_FACILITATORS.has(request.merchantId)) {
      console.error(`🚨 [x402] BLACKLISTED FACILITATOR: ${request.merchantId}`);
      const result: x402PaymentResult = {
        paid: false,
        reason: "X402_BLACKLISTED_FACILITATOR",
        merchantVerified: false,
      };
      this.recordPayment(request, result);
      return result;
    }

    // 2. Budget Check
    if (request.amount > dailyBudget) {
      const result: x402PaymentResult = {
        paid: false,
        reason: "X402_BUDGET_EXCEEDED",
        merchantVerified: this.verifiedVendors.has(request.merchantId),
        budgetRemaining: dailyBudget,
      };
      this.recordPayment(request, result);
      return result;
    }

    // 3. Reputation Check
    const isVerified = this.verifiedVendors.has(request.merchantId);

    if (isVerified) {
      console.log(`✅ [x402] Automated payment to verified vendor: ${request.merchantId}`);
      this.totalSpent += request.amount;
      const result: x402PaymentResult = {
        paid: true,
        txId: "0xX402_TX_" + Date.now(),
        reason: "PAID_AUTOMATICALLY",
        merchantVerified: true,
        budgetRemaining: dailyBudget - request.amount,
      };
      this.recordPayment(request, result);
      return result;
    }

    // 4. Unverified — Escalation to Swarm
    console.log(`⚠️ [x402] Unverified vendor detected. Escalating to Swarm for Forensics...`);
    const result: x402PaymentResult = {
      paid: false,
      reason: "X402_REQUIRES_SWARM_VERIFICATION",
      merchantVerified: false,
    };
    this.recordPayment(request, result);
    return result;
  }

  // ── Vendor Management ──────────────────────────────────────────────────

  addVerifiedVendor(vendorId: string): void {
    this.verifiedVendors.add(vendorId);
    console.log(`🟢 [x402] Vendor verified: ${vendorId}`);
  }

  removeVendor(vendorId: string): void {
    this.verifiedVendors.delete(vendorId);
    console.log(`🔴 [x402] Vendor removed: ${vendorId}`);
  }

  getVerifiedVendors(): string[] {
    return Array.from(this.verifiedVendors);
  }

  isVendorVerified(vendorId: string): boolean {
    return this.verifiedVendors.has(vendorId);
  }

  // ── Payment History & Analytics ────────────────────────────────────────

  private recordPayment(request: x402Request, result: x402PaymentResult): void {
    this.paymentHistory.push({ request, result, timestamp: Date.now() });
  }

  getPaymentHistory(limit: number = 20): x402PaymentRecord[] {
    return this.paymentHistory.slice(-limit);
  }

  getTotalSpent(): number {
    return this.totalSpent;
  }

  getPaymentStats(): {
    totalPayments: number;
    successfulPayments: number;
    blockedPayments: number;
    totalSpent: number;
    averagePayment: number;
  } {
    const successful = this.paymentHistory.filter(p => p.result.paid);
    return {
      totalPayments: this.paymentHistory.length,
      successfulPayments: successful.length,
      blockedPayments: this.paymentHistory.length - successful.length,
      totalSpent: this.totalSpent,
      averagePayment: successful.length > 0
        ? this.totalSpent / successful.length
        : 0,
    };
  }
}
