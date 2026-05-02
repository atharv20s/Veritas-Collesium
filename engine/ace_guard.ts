/**
 * ============================================================================
 * VERITAS FRONTIER — ACE Governance (Access Control Execution)
 * ============================================================================
 * 
 * Implements the Access Control Execution (ACE) logic for Solana protocol-level gating.
 * Includes a "Soft-ACE" simulation layer for the Hackathon dashboard.
 * 
 * v2.6 Upgrade: Enriched rejection details, dynamic whitelist management,
 * and policy snapshot exports for frontend visualization.
 */

import { PublicKey, TransactionInstruction } from "@solana/web3.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ACEPolicy {
  allowedPrograms: Set<string>;
  maxSpendPerTransaction: number;
  velocityLimit: number; // Max total spend delta in short window
}

export type ACEViolationType = 
  | 'PROGRAM_NOT_WHITELISTED' 
  | 'SPEND_LIMIT_EXCEEDED' 
  | 'ATTESTATION_MISSING'
  | 'VELOCITY_BREACH';

export interface ACERejectionDetails {
  program_id: string;
  violation_type: ACEViolationType;
  policy_snapshot: ACEPolicySnapshot;
  timestamp: number;
  estimated_value?: number;
}

export interface ACEPolicySnapshot {
  allowedPrograms: string[];
  maxSpendPerTransaction: number;
  velocityLimit: number;
  totalPrograms: number;
}

export interface ACEValidationResult {
  approved: boolean;
  reason: string;
  rejection_details?: ACERejectionDetails;
  identity_token?: string;
}

// ── Soft-ACE Layer ─────────────────────────────────────────────────────────

export class SoftACELayer {
  private policy: ACEPolicy;
  private rejectionLog: ACERejectionDetails[] = [];

  constructor(policy: ACEPolicy) {
    this.policy = policy;
  }

  /**
   * ACE Protocol Gating: Rejects transactions at the protocol level (Simulated).
   * Returns enriched validation result with rejection details for frontend visualization.
   */
  async validate(
    targetProgram: PublicKey,
    estimatedValue: number,
    isWhitelisted: boolean
  ): Promise<ACEValidationResult> {
    console.log(`\n🚦 [SOFT-ACE] Intercepting transaction to ${targetProgram.toBase58()}...`);

    const policySnapshot = this.getPolicySnapshot();

    // 1. Program Whitelist Check
    if (!this.policy.allowedPrograms.has(targetProgram.toBase58())) {
      const rejection: ACERejectionDetails = {
        program_id: targetProgram.toBase58(),
        violation_type: 'PROGRAM_NOT_WHITELISTED',
        policy_snapshot: policySnapshot,
        timestamp: Date.now(),
        estimated_value: estimatedValue,
      };
      this.rejectionLog.push(rejection);
      return { 
        approved: false, 
        reason: `ACE_IDENTITY_TOKEN_NOT_FOUND: Program ${targetProgram.toBase58()} is not authorized for this agent.`,
        rejection_details: rejection,
      };
    }

    // 2. Spend Limit Check
    if (estimatedValue > this.policy.maxSpendPerTransaction) {
      const rejection: ACERejectionDetails = {
        program_id: targetProgram.toBase58(),
        violation_type: 'SPEND_LIMIT_EXCEEDED',
        policy_snapshot: policySnapshot,
        timestamp: Date.now(),
        estimated_value: estimatedValue,
      };
      this.rejectionLog.push(rejection);
      return { 
        approved: false, 
        reason: `ACE_POLICY_VIOLATION: Estimated value $${estimatedValue} exceeds transaction limit $${this.policy.maxSpendPerTransaction}.`,
        rejection_details: rejection,
      };
    }

    // 3. Security Agent Check (Attestation)
    if (!isWhitelisted) {
      const rejection: ACERejectionDetails = {
        program_id: targetProgram.toBase58(),
        violation_type: 'ATTESTATION_MISSING',
        policy_snapshot: policySnapshot,
        timestamp: Date.now(),
        estimated_value: estimatedValue,
      };
      this.rejectionLog.push(rejection);
      return { 
        approved: false, 
        reason: `ACE_SECURITY_BLOCK: Veritas Swarm Attestation missing or invalid.`,
        rejection_details: rejection,
      };
    }

    console.log(`✅ [SOFT-ACE] ACE Proof attached efficiently. Routing to validator...`);
    const identity_token = ACEGuard.createIdentityToken(targetProgram.toBase58(), "policy_v2.6");
    return { approved: true, reason: "ACE_VALIDATION_SUCCESS", identity_token };
  }

  // ── Dynamic Whitelist Management ────────────────────────────────────────

  /**
   * Add a program to the ACE whitelist.
   */
  addProgram(programId: string): void {
    this.policy.allowedPrograms.add(programId);
    console.log(`🟢 [ACE] Program added to whitelist: ${programId.substring(0, 12)}...`);
  }

  /**
   * Remove a program from the ACE whitelist.
   */
  removeProgram(programId: string): void {
    this.policy.allowedPrograms.delete(programId);
    console.log(`🔴 [ACE] Program removed from whitelist: ${programId.substring(0, 12)}...`);
  }

  /**
   * Check if a program is currently whitelisted.
   */
  isProgramAllowed(programId: string): boolean {
    return this.policy.allowedPrograms.has(programId);
  }

  /**
   * Get the current policy snapshot for frontend display.
   */
  getPolicySnapshot(): ACEPolicySnapshot {
    const programs = Array.from(this.policy.allowedPrograms);
    return {
      allowedPrograms: programs,
      maxSpendPerTransaction: this.policy.maxSpendPerTransaction,
      velocityLimit: this.policy.velocityLimit,
      totalPrograms: programs.length,
    };
  }

  /**
   * Get the rejection log for the ACE Rejection Panel.
   */
  getRejectionLog(limit: number = 20): ACERejectionDetails[] {
    return this.rejectionLog.slice(-limit);
  }

  /**
   * Get rejection stats for dashboard.
   */
  getRejectionStats(): { total: number; byType: Record<ACEViolationType, number>; totalBlockedValue: number } {
    const byType: Record<ACEViolationType, number> = {
      'PROGRAM_NOT_WHITELISTED': 0,
      'SPEND_LIMIT_EXCEEDED': 0,
      'ATTESTATION_MISSING': 0,
      'VELOCITY_BREACH': 0,
    };
    let totalBlockedValue = 0;

    for (const rejection of this.rejectionLog) {
      byType[rejection.violation_type]++;
      totalBlockedValue += rejection.estimated_value || 0;
    }

    return { total: this.rejectionLog.length, byType, totalBlockedValue };
  }

  /**
   * Update the max spend per transaction policy.
   */
  setMaxSpend(newMax: number): void {
    this.policy.maxSpendPerTransaction = newMax;
  }

  /**
   * Update the velocity limit policy.
   */
  setVelocityLimit(newLimit: number): void {
    this.policy.velocityLimit = newLimit;
  }
}

// ── ACE Guard (Identity Token Generator) ───────────────────────────────────

export class ACEGuard {
  static createIdentityToken(agentId: string, policyHash: string): string {
    // [Mock] Generates a short-lived ACE Identity Token for the Solana runtime
    return `ace_token_${agentId.substring(0, 8)}_${policyHash.substring(0, 8)}_${Date.now().toString(36)}`;
  }
}
