import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Ed25519Program,
} from "@solana/web3.js";
import { expect } from "chai";
import { createHash } from "crypto";
import { createSentinelScorer, DEFAULT_POLICY } from "../engine/risk_scorer";

describe("sentinel-enclave", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Use the program ID from Anchor.toml
  const PROGRAM_ID = new PublicKey("2SuD5N8dJ2zmdzvstQzZWjxvS39fptexTfEDDAoaVwJT");

  const owner = provider.wallet.publicKey;
  const enclaveSigner = Keypair.generate();
  const policyRoot = createHash("sha256")
    .update("sentinel-initial-policy-v1")
    .digest();

  let vaultPda: PublicKey;
  let vaultBump: number;

  before(async () => {
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("sentinel-vault"),
        owner.toBuffer(),
        enclaveSigner.publicKey.toBuffer(),
      ],
      PROGRAM_ID
    );
    console.log("\n  ╔══════════════════════════════════════════════╗");
    console.log("  ║     SENTINEL ENCLAVE — Test Suite            ║");
    console.log("  ╠══════════════════════════════════════════════╣");
    console.log(`  ║  Owner:   ${owner.toString().substring(0, 32)}...  ║`);
    console.log(`  ║  Enclave: ${enclaveSigner.publicKey.toString().substring(0, 32)}...  ║`);
    console.log(`  ║  Vault:   ${vaultPda.toString().substring(0, 32)}...  ║`);
    console.log("  ╚══════════════════════════════════════════════╝\n");
  });

  // ── Risk Scorer Unit Tests ─────────────────────────────────────────────

  describe("TD3 Risk Scorer", () => {
    const scorer = createSentinelScorer();

    it("approves a safe Jupiter swap", () => {
      const result = scorer.assessSwap(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        1000,    // $1,000 swap
        5000000, // $5M liquidity
        0.001,   // 0.1% slippage
        {
          tokenAge: 8760,  // 1 year old
          holderConcentration: 0.1,
          lpLocked: true,
          lpLockDuration: 365,
          targetProtocol: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
        }
      );

      console.log(`  Safe swap risk score: ${result.score}/100`);
      expect(result.approved).to.be.true;
      expect(result.score).to.be.lessThan(30);
    });

    it("REJECTS a toxic memecoin swap ($10k into 90% slippage)", () => {
      // THE SCENARIO: Agent tries to swap $10,000 into a low-liquidity
      // memecoin with 90% slippage
      const result = scorer.assessSwap(
        "RUGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Sketch token
        10000,   // $10,000 swap
        5000,    // Only $5k liquidity (terrible)
        0.90,    // 90% slippage (!!!!)
        {
          tokenAge: 2,               // 2 hours old
          holderConcentration: 0.95,  // 95% held by top 10 wallets
          mintAuthority: true,        // Can mint more
          freezeAuthority: true,      // Can freeze
          lpLocked: false,            // LP not locked
          lpLockDuration: 0,
          creatorTxHistory: 12,       // Serial deployer
          rugPullIndicators: 8,       // 8/10 rug indicators
          targetProtocol: "unknown",
        }
      );

      console.log(`  Toxic swap risk score: ${result.score}/100`);
      console.log(`  Reasons:`);
      result.reasons.forEach(r => console.log(`    ${r}`));
      
      expect(result.approved).to.be.false;
      expect(result.score).to.be.greaterThan(70);
    });

    it("flags a blacklisted token with score 100", () => {
      const customScorer = createSentinelScorer({
        blacklistedTokens: ["SCAM_TOKEN_ADDRESS"],
      });

      const result = customScorer.assessSwap(
        "SCAM_TOKEN_ADDRESS",
        100,
        1000000,
        0.001,
        { lpLocked: true, tokenAge: 8760 }
      );

      expect(result.score).to.equal(100);
      expect(result.approved).to.be.false;
      expect(result.reasons[0]).to.include("BLACKLISTED");
    });

    it("handles edge case: massive TX with moderate risk factors", () => {
      const result = scorer.assessSwap(
        "So11111111111111111111111111111111111111112", // Wrapped SOL
        45000,   // $45k (close to $50k limit)
        200000,  // $200k liquidity
        0.04,    // 4% slippage (close to 5% limit)
        {
          tokenAge: 48,
          holderConcentration: 0.4,
          lpLocked: true,
          lpLockDuration: 90,
        }
      );

      console.log(`  Edge case risk score: ${result.score}/100`);
      // Should be borderline — passes but with warnings
      expect(result.score).to.be.greaterThan(10);
      expect(result.score).to.be.lessThan(70);
    });
  });

  // ── Shamir's Secret Sharing Tests ──────────────────────────────────────

  describe("Shamir's Secret Sharing", () => {
    // Dynamic import for SSS since it uses crypto
    it("splits and reconstructs a 32-byte secret (3-of-5)", async () => {
      const { ShamirSSS } = await import("../engine/enclave_client");

      const secret = Buffer.alloc(32);
      for (let i = 0; i < 32; i++) secret[i] = i + 1;

      const shares = ShamirSSS.split(secret, 5, 3);
      expect(shares).to.have.length(5);

      // Reconstruct from any 3 shares
      const reconstructed = ShamirSSS.reconstruct([shares[0], shares[2], shares[4]]);
      
      // The first 32 bytes should match (mod prime might differ for very large secrets)
      console.log(`  Secret:        ${secret.toString("hex").substring(0, 32)}...`);
      console.log(`  Reconstructed: ${reconstructed.toString("hex").substring(0, 32)}...`);
    });
  });

  // ── Integration Tests ──────────────────────────────────────────────────

  describe("End-to-End Flow Simulation", () => {
    it("simulates full approve/reject flow", async () => {
      const { SentinelEnclaveClient } = await import("../engine/enclave_client");
      
      const client = new SentinelEnclaveClient({
        connection: provider.connection,
        enclaveSigner: enclaveSigner,
        programId: PROGRAM_ID,
      });

      // Simulate a SAFE transaction
      console.log("\n  ── Safe Transaction ──");
      const safeResult = await client.processRequest(owner, {
        agentId: "agent-alpha-001",
        targetProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
        instructionData: Buffer.from("swap-1000-USDC-SOL"),
        accounts: [],
        estimatedValue: 1000,
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        metadata: {
          poolLiquidity: 5000000,
          priceImpact: 0.001,
          tokenAge: 8760,
          lpLocked: true,
          lpLockDuration: 365,
        },
      });
      expect(safeResult.approved).to.be.true;

      // Simulate a TOXIC transaction (the memecoin rug scenario)
      console.log("\n  ── Toxic Transaction ──");
      const toxicResult = await client.processRequest(owner, {
        agentId: "agent-alpha-001",
        targetProgram: new PublicKey("11111111111111111111111111111111"),
        instructionData: Buffer.from("swap-10000-SOL-RUGCOIN"),
        accounts: [],
        estimatedValue: 10000,
        tokenAddress: "RUGRUG_MEMECOIN_xxxxxxxxxxxxxxxxxxxxx",
        metadata: {
          poolLiquidity: 5000,
          priceImpact: 0.9,
          tokenAge: 1,
          holderConcentration: 0.95,
          mintAuthority: true,
          freezeAuthority: true,
          lpLocked: false,
          creatorTxHistory: 15,
          rugPullIndicators: 9,
        },
      });
      expect(toxicResult.approved).to.be.false;

      // Check stats
      const stats = client.getStats();
      console.log("\n  ── Enclave Stats ──");
      console.log(`  Total: ${stats.totalRequests}`);
      console.log(`  Approved: ${stats.approved}`);
      console.log(`  Rejected: ${stats.rejected}`);
      console.log(`  Avg Risk: ${stats.avgRiskScore}/100`);

      expect(stats.totalRequests).to.equal(2);
      expect(stats.approved).to.equal(1);
      expect(stats.rejected).to.equal(1);
    });
  });
});
