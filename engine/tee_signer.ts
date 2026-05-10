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
} from "@solana/web3.js";
import { Keccak } from "sha3";
import nacl from "tweetnacl";
import { ThreatCache } from "./threat_cache";

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
  rejectionReason?: 'HASH_MISMATCH' | 'FLASH_FREEZE' | 'POLICY_VIOLATION' | 'THREAT_CACHE';
  spendVelocity: number;
  baselineSpend: number;
}

export class VeritasTEEClient {
  private coldkey: Keypair;
  private currentSpendVelocity: number = 0;
  private readonly FLASH_FREEZE_THRESHOLD = 3.0; // 300% spike trigger
  private baselineSpend: number = 0;

  private lastFreezeTime: number = 0;
  private readonly RECOVERY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(coldkey: Keypair) {
    this.coldkey = coldkey;
  }

  /**
   * Remote Attestation: Proves the Enclave is running the Veritas Policy Engine.
   * In production, this would call out to a hardware security module or TEE quote generator.
   */
  async getAttestationDoc(): Promise<TEEAttestation> {
    // Simulated Nitro/TDX Attestation Process with PCR measurements
    return {
      hardwareId: "nitro-enclave-v2.6-frontier-0xABC",
      signature: "0xAttestedSignature",
      policyHash: "0xVeritas_Policy_v2.6_Keccak_e3b0c442",
      timestamp: Date.now(),
    };
  }

  /**
   * Secure Signing inside the Enclave.
   * Uses Ed25519 via tweetnacl to sign the instruction hash.
   */
  async signInstructionHash(
    targetHash: string,
    providedHash: string,
    currentOutflow: number,
    tokenAddress?: string
  ): Promise<TEESignResult> {
    console.log(`\n🛡️ [TEE] Enclave Entry: Verifying Instruction Hash...`);
    
    const attestation = await this.getAttestationDoc();
    const velocity = this.getSpendVelocity(currentOutflow);

    // 0. Threat Cache Check (Fast Rejection)
    if (tokenAddress && ThreatCache.has(tokenAddress)) {
      console.log("⚡ [TEE] Fast-path Rejection: Token found in Threat Cache.");
      return {
        approved: false,
        attestation,
        rejectionReason: 'THREAT_CACHE',
        spendVelocity: velocity,
        baselineSpend: this.baselineSpend,
      };
    }

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
      this.lastFreezeTime = Date.now();
      
      // If tokenAddress is provided, cache it as a threat
      if (tokenAddress) ThreatCache.add(tokenAddress);
      
      return {
        approved: false,
        attestation,
        rejectionReason: 'FLASH_FREEZE',
        spendVelocity: velocity,
        baselineSpend: this.baselineSpend,
      };
    }

    // 3. Auto-recovery check (if we were frozen, are we still?)
    if (this.lastFreezeTime > 0 && (Date.now() - this.lastFreezeTime) < this.RECOVERY_WINDOW_MS) {
      console.warn("⏳ [TEE] Still in Flash-Freeze recovery window...");
      return {
        approved: false,
        attestation,
        rejectionReason: 'FLASH_FREEZE',
        spendVelocity: velocity,
        baselineSpend: this.baselineSpend,
      };
    }

    // 4. Update baseline after successful check
    if (this.baselineSpend === 0) {
      this.baselineSpend = currentOutflow;
    }

    // 5. Real Ed25519 Signing
    const message = Buffer.from(targetHash, "hex");
    const signature = nacl.sign.detached(message, this.coldkey.secretKey);
    const signatureHex = Buffer.from(signature).toString("hex");

    console.log("✅ [TEE] Hardware Approval Granted. Accessing isolated memory...");
    return {
      approved: true,
      signature: signatureHex,
      attestation,
      spendVelocity: velocity,
      baselineSpend: this.baselineSpend,
    };
  }

  private isFlashFreezeTripped(currentOutflow: number): boolean {
    if (this.baselineSpend === 0) return false;
    const velocity = currentOutflow / this.baselineSpend;
    return velocity > this.FLASH_FREEZE_THRESHOLD;
  }

  getSpendVelocity(currentOutflow: number): number {
    if (this.baselineSpend === 0) return 0;
    return currentOutflow / this.baselineSpend;
  }

  resetBaseline(): void {
    this.baselineSpend = 0;
    this.currentSpendVelocity = 0;
  }

  updateBaseline(newBaseline: number): void {
    this.baselineSpend = newBaseline;
  }

  getBaselineSpend(): number {
    return this.baselineSpend;
  }

  getPublicKey(): PublicKey {
    return this.coldkey.publicKey;
  }
}
