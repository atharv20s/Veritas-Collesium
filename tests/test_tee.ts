/**
 * ============================================================================
 * VERITAS FRONTIER — TEE Signer Unit Tests
 * ============================================================================
 * 
 * Tests for the Confidential Computing layer:
 *   1. Deterministic Keccak256 instruction hashing
 *   2. Hash mismatch detection (tampered instructions)
 *   3. Flash-Freeze circuit breaker — trips at 300% velocity
 *   4. Flash-Freeze circuit breaker — passes under threshold
 *   5. Baseline reset for recalibration
 */

import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { expect } from "chai";
import { InstructionHasher, VeritasTEEClient } from "../engine/tee_signer";

// ── Helpers ─────────────────────────────────────────────────────────────────

const JUPITER_V6 = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
const ORCA = new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
const SYSTEM = new PublicKey("11111111111111111111111111111111");

function makeInstruction(programId: PublicKey, data: string, accounts: PublicKey[] = []): TransactionInstruction {
    return new TransactionInstruction({
        programId,
        data: Buffer.from(data),
        keys: accounts.map(pubkey => ({ pubkey, isSigner: false, isWritable: false })),
    });
}

describe("TEE Signer — Frontier v2.6", () => {
    const testKeypair = Keypair.generate();
    let teeClient: VeritasTEEClient;

    beforeEach(() => {
        teeClient = new VeritasTEEClient(testKeypair);
    });

    // ── Test 1: Deterministic Keccak256 Hashing ─────────────────────────

    describe("InstructionHasher", () => {
        it("produces deterministic Keccak256 hashes for identical instructions", () => {
            const instructions = [
                makeInstruction(JUPITER_V6, "swap-1000-USDC-SOL", [testKeypair.publicKey]),
                makeInstruction(ORCA, "provide-liquidity-500"),
                makeInstruction(SYSTEM, "transfer-100-lamports"),
            ];

            const hash1 = InstructionHasher.hash(instructions);
            const hash2 = InstructionHasher.hash(instructions);
            const hash3 = InstructionHasher.hash(instructions);

            expect(hash1).to.equal(hash2);
            expect(hash2).to.equal(hash3);
            expect(hash1).to.have.lengthOf(64); // Keccak256 = 32 bytes = 64 hex chars

            console.log(`  ✓ Deterministic hash: ${hash1.substring(0, 16)}...`);
        });

        it("produces different hashes for different instructions", () => {
            const ix1 = [makeInstruction(JUPITER_V6, "swap-1000-USDC-SOL")];
            const ix2 = [makeInstruction(JUPITER_V6, "swap-2000-USDC-SOL")]; // Different data
            const ix3 = [makeInstruction(ORCA, "swap-1000-USDC-SOL")];       // Different program

            const hash1 = InstructionHasher.hash(ix1);
            const hash2 = InstructionHasher.hash(ix2);
            const hash3 = InstructionHasher.hash(ix3);

            expect(hash1).to.not.equal(hash2); // Different data
            expect(hash1).to.not.equal(hash3); // Different program
            expect(hash2).to.not.equal(hash3);

            console.log(`  ✓ Unique hashes for different instructions`);
        });
    });

    // ── Test 2: Hash Mismatch Detection ─────────────────────────────────

    describe("Hash Mismatch Detection", () => {
        it("rejects when provided hash doesn't match target hash", async () => {
            const result = await teeClient.signInstructionHash(
                "0xTargetHash_ABCDEF1234567890",
                "0xTamperedHash_DEADBEEF00000000",  // Tampered!
                100
            );

            expect(result.approved).to.be.false;
            expect(result.rejectionReason).to.equal("HASH_MISMATCH");
            expect(result.signature).to.be.undefined;

            console.log(`  ✓ Hash mismatch correctly rejected: ${result.rejectionReason}`);
        });

        it("approves when hashes match exactly", async () => {
            const hash = "0xValidHash_CAFE1234";
            const result = await teeClient.signInstructionHash(hash, hash, 100);

            expect(result.approved).to.be.true;
            expect(result.signature).to.be.a("string");
            expect(result.signature).to.include("0xTEE_Coldkey_Signature_");

            console.log(`  ✓ Matching hash approved: ${result.signature!.substring(0, 32)}...`);
        });
    });

    // ── Test 3: Flash-Freeze Trips at 300%+ ─────────────────────────────

    describe("Flash-Freeze Circuit Breaker", () => {
        it("trips when spend velocity exceeds 300% of baseline", async () => {
            const hash = "0xTestHash";

            // First transaction — establishes baseline at $100
            const result1 = await teeClient.signInstructionHash(hash, hash, 100);
            expect(result1.approved).to.be.true;
            expect(teeClient.getBaselineSpend()).to.equal(100);
            console.log(`  Baseline established: $${teeClient.getBaselineSpend()}`);

            // Second transaction — $400 = 400% velocity → TRIPS (> 300%)
            const result2 = await teeClient.signInstructionHash(hash, hash, 400);
            expect(result2.approved).to.be.false;
            expect(result2.rejectionReason).to.equal("FLASH_FREEZE");
            expect(result2.spendVelocity).to.equal(4.0); // 400/100 = 4.0x

            console.log(`  ✓ Flash-Freeze tripped at ${result2.spendVelocity}x velocity ($400 vs $100 baseline)`);
        });

        it("passes when spend velocity is under 300% threshold", async () => {
            const hash = "0xTestHash";

            // First transaction — establishes baseline at $100
            const result1 = await teeClient.signInstructionHash(hash, hash, 100);
            expect(result1.approved).to.be.true;

            // Second transaction — $250 = 250% velocity → PASSES (< 300%)
            const result2 = await teeClient.signInstructionHash(hash, hash, 250);
            expect(result2.approved).to.be.true;
            expect(result2.spendVelocity).to.equal(2.5); // 250/100 = 2.5x

            console.log(`  ✓ Flash-Freeze passed at ${result2.spendVelocity}x velocity ($250 vs $100 baseline)`);
        });

        it("exactly at 300% threshold passes (boundary test)", async () => {
            const hash = "0xTestHash";

            // Establish baseline at $100
            await teeClient.signInstructionHash(hash, hash, 100);

            // $300 = exactly 300% → should PASS (threshold is > 3.0, not >= 3.0)
            const result = await teeClient.signInstructionHash(hash, hash, 300);
            expect(result.approved).to.be.true;
            expect(result.spendVelocity).to.equal(3.0);

            console.log(`  ✓ Boundary: exactly 3.0x velocity passes (threshold is >3.0)`);
        });
    });

    // ── Test 4: Baseline Reset ──────────────────────────────────────────

    describe("Baseline Management", () => {
        it("resets baseline for recalibration", async () => {
            const hash = "0xTestHash";

            // Establish baseline at $100
            await teeClient.signInstructionHash(hash, hash, 100);
            expect(teeClient.getBaselineSpend()).to.equal(100);

            // Reset
            teeClient.resetBaseline();
            expect(teeClient.getBaselineSpend()).to.equal(0);

            // New transaction at $500 — should pass because baseline is reset
            const result = await teeClient.signInstructionHash(hash, hash, 500);
            expect(result.approved).to.be.true;
            expect(teeClient.getBaselineSpend()).to.equal(500); // New baseline

            console.log(`  ✓ Baseline reset and re-established at $${teeClient.getBaselineSpend()}`);
        });

        it("manual baseline update via updateBaseline()", () => {
            teeClient.updateBaseline(200);
            expect(teeClient.getBaselineSpend()).to.equal(200);

            const velocity = teeClient.getSpendVelocity(600);
            expect(velocity).to.equal(3.0); // 600/200 = 3.0x

            console.log(`  ✓ Manual baseline: $200, velocity at $600 = ${velocity}x`);
        });
    });

    // ── Test 5: Attestation Document ────────────────────────────────────

    describe("Remote Attestation", () => {
        it("returns valid attestation document", async () => {
            const attestation = await teeClient.getAttestationDoc();

            expect(attestation.hardwareId).to.include("nitro");
            expect(attestation.policyHash).to.include("Veritas");
            expect(attestation.timestamp).to.be.a("number");
            expect(attestation.timestamp).to.be.closeTo(Date.now(), 1000);

            console.log(`  ✓ Attestation: ${attestation.hardwareId} @ ${new Date(attestation.timestamp).toISOString()}`);
        });

        it("includes attestation in every sign result (approved or rejected)", async () => {
            const hash = "0xTestHash";

            // Approved
            const approved = await teeClient.signInstructionHash(hash, hash, 100);
            expect(approved.attestation).to.not.be.null;
            expect(approved.attestation.hardwareId).to.include("nitro");

            // Rejected (hash mismatch)
            const rejected = await teeClient.signInstructionHash(hash, "tampered", 100);
            expect(rejected.attestation).to.not.be.null;
            expect(rejected.attestation.hardwareId).to.include("nitro");

            console.log(`  ✓ Attestation present in both approved and rejected results`);
        });
    });
});
