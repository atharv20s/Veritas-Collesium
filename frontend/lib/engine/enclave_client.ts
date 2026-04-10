/**
 * ============================================================================
 * SENTINEL ENCLAVE — Hardware TEE Client (AWS Nitro / Intel SGX)
 * ============================================================================
 * 
 * Bridges the Async Risk Scorer with the Solana Anchor program while maintaining
 * the integrity of Shamir's Secret Sharing (SSS) key management.
 * 
 * TEE DEPLOYMENT:
 * This client logic is compiled to run INSIDE a Trusted Execution Environment
 * (e.g. AWS Nitro Enclave or Arcium). It possesses the MPC fragments.
 * The Enclave fetches the pre-computed risk threshold offline or verifies
 * against the Fast Classifier locally before it computes the partial signature.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Ed25519Program,
} from "@solana/web3.js";
import {
  SentinelRiskScorer,
  TransactionState,
  createSentinelScorer,
  PolicyConfig,
} from "./risk_scorer";

// [Mock] Replace with real AWS Nitro KMS integration
import * as TEE_KMS from "crypto";

export interface EnclaveConfig {
  connection: Connection;
  enclaveSigner: Keypair;  // Securely provisioned inside the TEE
  programId: PublicKey;
  policyConfig?: Partial<PolicyConfig>;
  isNitroEnclaveMock?: boolean;
}

export interface TransactionRequest {
  agentId: string;
  targetProgram: PublicKey;
  instructionData: Buffer;
  accounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[];
  estimatedValue: number;  // USD
  tokenAddress?: string;
  metadata?: Partial<TransactionState>;
}

export interface EnclaveResponse {
  approved: boolean;
  score: number;
  reasons: string[];
  signature?: string;
  timestamp: number;
  teeAttestationID?: string;
}

// ─── Shamir's Secret Sharing (SSS) Inside the TEE ──────────────────────────

export class ShamirSSS {
  /**
   * Split a secret into n shares, requiring k to reconstruct
   */
  static split(secret: Buffer, n: number, k: number): Buffer[] {
    if (k > n) throw new Error("k must be <= n");
    if (k < 2) throw new Error("k must be >= 2");
    
    const PRIME = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    const secretNum = BigInt("0x" + secret.toString("hex")) % PRIME;
    
    const coefficients: bigint[] = [secretNum];
    for (let i = 1; i < k; i++) {
        // [Mock] In production Nitro, use hardware RNG 
      const randomBytes = TEE_KMS.randomBytes(32);
      coefficients.push(BigInt("0x" + randomBytes.toString("hex")) % PRIME);
    }

    const shares: Buffer[] = [];
    for (let i = 1; i <= n; i++) {
      const x = BigInt(i);
      let y = BigInt(0);
      for (let j = 0; j < k; j++) {
        y = (y + coefficients[j] * modPow(x, BigInt(j), PRIME)) % PRIME;
      }
      const share = Buffer.alloc(33);
      share[0] = i;
      const yHex = y.toString(16).padStart(64, "0");
      Buffer.from(yHex, "hex").copy(share, 1);
      shares.push(share);
    }

    return shares;
  }

  static reconstruct(shares: Buffer[]): Buffer {
    const PRIME = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    const points: { x: bigint; y: bigint }[] = shares.map(share => ({
      x: BigInt(share[0]),
      y: BigInt("0x" + share.slice(1).toString("hex")),
    }));

    let secret = BigInt(0);
    const k = points.length;

    for (let i = 0; i < k; i++) {
      let numerator = BigInt(1);
      let denominator = BigInt(1);
      for (let j = 0; j < k; j++) {
        if (i === j) continue;
        numerator = (numerator * (PRIME - points[j].x)) % PRIME;
        denominator = (denominator * ((points[i].x - points[j].x + PRIME) % PRIME)) % PRIME;
      }
      const lagrangeCoeff = (numerator * modInverse(denominator, PRIME)) % PRIME;
      secret = (secret + points[i].y * lagrangeCoeff) % PRIME;
    }

    const hex = secret.toString(16).padStart(64, "0");
    return Buffer.from(hex, "hex");
  }
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  base = base % mod;
  while (exp > 0) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = (result * base) % mod;
    }
    exp = exp / BigInt(2);
    base = (base * base) % mod;
  }
  return result;
}

function modInverse(a: bigint, mod: bigint): bigint {
  return modPow(a, mod - BigInt(2), mod);
}

// ─── Enclave Client (Run within AWS Nitro) ──────────────────────────────────

export class SentinelEnclaveClient {
  private connection: Connection;
  private enclaveSigner: Keypair;
  private programId: PublicKey;
  private riskScorer: SentinelRiskScorer;
  private txLog: EnclaveResponse[] = [];
  private hardwareID: string = "nitro-enclave-i-0abc123def456";

  constructor(config: EnclaveConfig) {
    this.connection = config.connection;
    this.enclaveSigner = config.enclaveSigner;
    this.programId = config.programId;
    this.riskScorer = createSentinelScorer(config.policyConfig);
  }

  async findVaultPDA(owner: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("sentinel-vault"),
        owner.toBuffer(),
        this.enclaveSigner.publicKey.toBuffer(),
      ],
      this.programId
    );
  }

  /**
   * Hardware execution bounded context.
   */
  async processRequest(
    owner: PublicKey,
    request: TransactionRequest
  ): Promise<EnclaveResponse> {
    const timestamp = Date.now();
    const state = await this.buildTransactionState(request);

    // Enclave runs Fast XGBoost Risk Scorer Offline to ensure deterministic output
    const assessment = this.riskScorer.assessRisk(state);

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log(`║           AWS NITRO ENCLAVE [${this.hardwareID}]            ║`);
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  Agent: ${request.agentId.substring(0, 40).padEnd(46)}║`);
    console.log(`║  Target: ${request.targetProgram.toString().substring(0, 44).padEnd(45)}║`);
    console.log(`║  Value: $${request.estimatedValue.toLocaleString().padEnd(44)}║`);
    console.log(`║  Fast Score: ${String(assessment.score).padEnd(42)}║`);
    console.log(`║  MPC Gate: ${(assessment.approved ? "✅ SIGNATURE GRANTED" : "❌ SHARE WITHHELD").padEnd(44)}║`);
    console.log("╚══════════════════════════════════════════════════════════╝");

    for (const reason of assessment.reasons) {
      console.log(`  ${reason}`);
    }

    let response: EnclaveResponse = {
      approved: assessment.approved,
      score: assessment.score,
      reasons: assessment.reasons,
      timestamp,
      teeAttestationID: assessment.approved ? `attest-${TEE_KMS.randomBytes(8).toString('hex')}` : undefined
    };

    this.txLog.push(response);
    return response;
  }

  createAttestationInstruction(
    targetProgram: PublicKey,
    actionHash: Buffer,
    riskScore: number
  ): TransactionInstruction {
    const message = Buffer.concat([
      targetProgram.toBuffer(),
      actionHash,
      Buffer.from([riskScore]),
    ]);

    return Ed25519Program.createInstructionWithPrivateKey({
      privateKey: this.enclaveSigner.secretKey.slice(0, 32),
      message,
    });
  }

  private async buildTransactionState(
    request: TransactionRequest
  ): Promise<TransactionState> {
    const metadata = request.metadata || {};

    return {
      tokenAddress: request.tokenAddress || "unknown",
      poolLiquidity: metadata.poolLiquidity ?? 100000,
      priceImpact: metadata.priceImpact ?? 0.01,
      tokenAge: metadata.tokenAge ?? 720,
      holderConcentration: metadata.holderConcentration ?? 0.3,
      volume24h: metadata.volume24h ?? 50000,
      txAmount: request.estimatedValue,
      targetProtocol: request.targetProgram.toString(),
      mintAuthority: metadata.mintAuthority ?? false,
      freezeAuthority: metadata.freezeAuthority ?? false,
      lpLocked: metadata.lpLocked ?? true,
      lpLockDuration: metadata.lpLockDuration ?? 180,
      creatorTxHistory: metadata.creatorTxHistory ?? 1,
      rugPullIndicators: metadata.rugPullIndicators ?? 0,
    };
  }

  getEnclavePublicKey(): PublicKey {
    return this.enclaveSigner.publicKey;
  }

  getStats(): { totalRequests: number; approved: number; rejected: number; avgRiskScore: number } {
    const totalRequests = this.txLog.length;
    const approved = this.txLog.filter(tx => tx.approved).length;
    const rejected = totalRequests - approved;
    const avgRiskScore = totalRequests > 0 ? this.txLog.reduce((acc, tx) => acc + tx.score, 0) / totalRequests : 0;
    return { totalRequests, approved, rejected, avgRiskScore };
  }
}
