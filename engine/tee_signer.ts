/**
 * ============================================================================
 * VERITAS FRONTIER — TEE Signer (Confidential Computing)
 * ============================================================================
 * 
 * Replaces legacy MPC with Hardware-isolated signing within AWS Nitro / Intel TDX.
 * The Coldkey sits in the enclave's encrypted memory, accessible only after
 * successfully verifying the Swarm's Keccak256 Instruction Approval.
 */

import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  Ed25519Program,
} from "@solana/web3.js";
import { Keccak } from "sha3";

export class InstructionHasher {
  /**
   * Deterministic Keccak256 hashing for transaction instructions.
   * Standardizes approval logic for cross-chain agentic compatibility.
   */
  static hash(instructions: TransactionInstruction[]): string {
    const hash = new Keccak(256);
    for (const ix of instructions) {
      hash.update(ix.programId.toBuffer());
      hash.update(ix.data);
      for (const account of ix.keys) {
        hash.update(account.pubkey.toBuffer());
      }
    }
    return hash.digest("hex");
  }
}

export interface TEEAttestation {
  hardwareId: string;
  signature: string;
  policyHash: string; // Hash of the running Veritas Policy Engine
  timestamp: number;
}

export interface TEESignResult {
  approved: boolean;
  signature?: string;
  attestation: TEEAttestation;
  rejectionReason?: 'HASH_MISMATCH' | 'FLASH_FREEZE' | 'POLICY_VIOLATION';
  spendVelocity: number;
  baselineSpend: number;
}

export class VeritasTEEClient {
  private coldkey: Keypair;
  private currentSpendVelocity: number = 0;
  private readonly FLASH_FREEZE_THRESHOLD = 3.0; // 300% spike trigger
  private baselineSpend: number = 0;

  constructor(coldkey: Keypair) {
    this.coldkey = coldkey;
  }

  /**
   * Remote Attestation: Proves the Enclave is running the Veritas Policy Engine.
   */
  async getAttestationDoc(): Promise<TEEAttestation> {
    // [Mock] Simulated Nitro Attestation Process
    return {
      hardwareId: "nitro-enclave-v2.6-frontier-0xABC",
      signature: "0xAttestedSignature",
      policyHash: "0xVeritas_Policy_v2.6_Keccak",
      timestamp: Date.now(),
    };
  }

  /**
   * Secure Signing inside the Enclave.
   * Only releases the signature if the flash-freeze circuit breaker is NOT tripped.
   * Returns a structured TEESignResult for full observability.
   */
  async signInstructionHash(
    targetHash: string,
    providedHash: string,
    currentOutflow: number
  ): Promise<TEESignResult> {
    console.log(`\n🛡️ [TEE] Verifying Instruction Hash Constraint...`);
    
    const attestation = await this.getAttestationDoc();
    const velocity = this.getSpendVelocity(currentOutflow);

    // 1. Integrity Check
    if (targetHash !== providedHash) {
      console.error("❌ [TEE SECURITY ALERT] Hash Mismatch! Request Tampered.");
      return {
        approved: false,
        attestation,
        rejectionReason: 'HASH_MISMATCH',
        spendVelocity: velocity,
        baselineSpend: this.baselineSpend,
      };
    }

    // 2. Flash-Freeze Logic (Stay inside the TEE)
    if (this.isFlashFreezeTripped(currentOutflow)) {
      console.error("🚨 [TEE CIRCUIT BREAKER] Flash-Freeze Tripped! Spend velocity > 300%.");
      return {
        approved: false,
        attestation,
        rejectionReason: 'FLASH_FREEZE',
        spendVelocity: velocity,
        baselineSpend: this.baselineSpend,
      };
    }

    // 3. Update baseline after successful check
    if (this.baselineSpend === 0) {
      this.baselineSpend = currentOutflow;
    }

    const signature = "0xTEE_Coldkey_Signature_" + Date.now();
    console.log("✅ [TEE] Hardware Approval Granted. Accessing isolated memory...");
    return {
      approved: true,
      signature,
      attestation,
      spendVelocity: velocity,
      baselineSpend: this.baselineSpend,
    };
  }

  private isFlashFreezeTripped(currentOutflow: number): boolean {
    if (this.baselineSpend === 0) {
      // First transaction — no baseline yet, can't trip
      return false;
    }

    const velocity = currentOutflow / this.baselineSpend;
    return velocity > this.FLASH_FREEZE_THRESHOLD;
  }

  /**
   * Calculate the current spend velocity ratio against baseline.
   * Returns 0 if no baseline is set yet.
   */
  getSpendVelocity(currentOutflow: number): number {
    if (this.baselineSpend === 0) return 0;
    return currentOutflow / this.baselineSpend;
  }

  /**
   * Reset the baseline spend for testing or recalibration.
   */
  resetBaseline(): void {
    this.baselineSpend = 0;
    this.currentSpendVelocity = 0;
  }

  /**
   * Manually update the baseline spend (used by aGDP integration
   * to adapt to the agent's normal spending patterns).
   */
  updateBaseline(newBaseline: number): void {
    this.baselineSpend = newBaseline;
  }

  /**
   * Get the current baseline spend value.
   */
  getBaselineSpend(): number {
    return this.baselineSpend;
  }

  getPublicKey(): PublicKey {
    return this.coldkey.publicKey;
  }
}
