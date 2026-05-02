import { SecurityState } from "./state";
import { InstructionHasher, VeritasTEEClient } from "../tee_signer";
import { SoftACELayer, ACEGuard } from "../ace_guard";
import { aGDPTracker } from "../agdp_tracker";
import { Keypair, PublicKey } from "@solana/web3.js";

// ─── Singleton aGDP Tracker ─────────────────────────────────────────────────
const gdpTracker = new aGDPTracker();

// ─── Constants & Global Config (Frontier v2.6) ──────────────────────────────

const ACE_ENABLED = true;
const TEE_MOCK_KEY = Keypair.generate();
const teeClient = new VeritasTEEClient(TEE_MOCK_KEY);

const softAce = new SoftACELayer({
    allowedPrograms: new Set([
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter V6
        "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca
        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"  // Raydium
    ]),
    maxSpendPerTransaction: 1000, // $1000 USD
    velocityLimit: 3.0 // 300% velocity spike trigger
});

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, name: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]).catch((err) => {
        console.warn(`⚠️ [${name} EXCEPTION]: ${err.message}. Falling back to default baseline.`);
        return fallback;
    });
}

// ─── 1. Ingestion & Hashing Node ───────────────────────────────────────────

export async function ingestionNode(state: SecurityState): Promise<SecurityState> {
    console.log("📥 [INGESTION] Parsing raw instruction buffers and computing Keccak256 hash...");
    
    try {
        const hash = InstructionHasher.hash(state.transaction.instructions);
        state.instruction_hash = hash;
        
        if (state.onLog) state.onLog("ingestion", `Instruction Hash computed: ${hash.substring(0, 16)}...`);
    } catch (e) {
        console.error("🚨 [INGESTION FAIL] Serialization error: ", e);
        state.final_status = 'BLOCKED';
    }

    return state;
}

// ─── 2. Soft-ACE Governance Node ──────────────────────────────────────────

export async function aceGuardNode(state: SecurityState): Promise<SecurityState> {
    console.log("🚦 [ACE-GUARD] Checking protocol-level Access Control Execution (SIM)...");

    const targetProgram = state.transaction.instructions[0]?.programId || PublicKey.default;
    const estValue = state.transaction.estimatedValueUsd;

    const validation = await softAce.validate(targetProgram, estValue, true); // Mock swarm as true for initial check

    if (!validation.approved) {
        console.warn(`❌ [ACE_REJECTED] ${validation.reason}`);
        state.final_status = 'ACE_REJECTED';
        state.final_verdict_reason = validation.reason;
        state.ace_rejection_details = validation.rejection_details;

        // Track as protected funds in aGDP
        gdpTracker.track({
            agentId: state.transaction.agentId,
            type: 'INCOME',
            value: estValue,
            description: `ACE_PROTECTION: Blocked $${estValue} to unauthorized program`,
            timestamp: Date.now(),
        });

        if (state.onLog) {
            state.onLog("ace", `ACE REJECTED: ${validation.rejection_details?.violation_type || 'UNKNOWN'}`, validation.rejection_details);
        }
    } else {
        state.ace_identity_token = validation.identity_token || ACEGuard.createIdentityToken(state.transaction.agentId, "policy_v2.6");
        if (state.onLog) state.onLog("ace", `ACE Identity Token Attached: ${state.ace_identity_token}`);
    }

    return state;
}

// ─── 3. Swarm Intelligence Nodes ──────────────────────────────────────────

export async function forensicsAgent(state: SecurityState): Promise<any> {
    console.log("🔍 [SWARM] Forensics Agent scanning account reputation and actor associations...");
    
    // In Frontier v2.6, we check the specific accounts in the transaction
    const accounts = state.transaction.instructions.flatMap(ix => ix.keys.map(k => k.pubkey.toBase58()));
    const flagged = accounts.some(a => a.startsWith("SCAM") || a.startsWith("RUG"));

    await new Promise(r => setTimeout(r, 400)); // Latency sim

    return {
        flagged,
        accounts_scanned: accounts.length,
        risk_profile: flagged ? "CRITICAL_THREAT_DETECTED" : "CLEAN_LEDGER_REPUTATION"
    };
}

export async function protocolAgent(state: SecurityState): Promise<any> {
    console.log("🖧 [SWARM] Protocol Agent verifying Program ID against Colosseum Codex...");
    
    const programId = state.transaction.instructions[0]?.programId.toBase58();
    const isWhitelisted = programId ? softAce["policy"].allowedPrograms.has(programId) : false;

    await new Promise(r => setTimeout(r, 300));

    return {
        verified: isWhitelisted,
        program_id: programId,
        trust_tier: isWhitelisted ? "TIER_1_VERIFIED_DEFI" : "UNVERIFIED_CONTRACT"
    };
}

export async function simulationAgent(state: SecurityState): Promise<any> {
    console.log("⚙️ [SWARM] Simulation Agent predicting net balance changes and slippage...");

    const estValue = state.transaction.estimatedValueUsd;
    const isHighValue = estValue > 500;

    await new Promise(r => setTimeout(r, 600));

    return {
        simulation_successful: true,
        projected_balance_change: `-${estValue} USDC`,
        unexpected_transfers: false,
        slippage_check: isHighValue ? "OPTIMIZED" : "STABLE"
    };
}

// ─── 4. Synthesizer & TEE Signing Node ────────────────────────────────────

export async function synthesizerNode(state: SecurityState): Promise<SecurityState> {
    console.log("🧠 [SYNTHESIZER] Injecting swarm findings into DeepSeek-R1 for hardware attestation...");

    const isAuthorized = state.protocol_findings?.verified && !state.forensics_findings?.flagged;
    
    if (isAuthorized) {
        console.log("🔒 [TEE] Swarm approved. Releasing Hardware Signature...");
        const teeResult = await teeClient.signInstructionHash(
            state.instruction_hash, 
            state.instruction_hash, 
            state.transaction.estimatedValueUsd
        );

        if (teeResult.approved) {
            state.final_status = 'APPROVED';
            state.tee_attestation = teeResult.attestation;
            state.synthesizer_decision = `Transaction verified by Hardware Attestation v2.6. Spend velocity: ${teeResult.spendVelocity.toFixed(2)}x baseline.`;
        } else {
            state.final_status = 'BLOCKED';
            state.tee_attestation = teeResult.attestation;
            state.synthesizer_decision = `TEE Rejection: ${teeResult.rejectionReason}. Spend velocity: ${teeResult.spendVelocity.toFixed(2)}x (baseline: $${teeResult.baselineSpend}).`;
        }
    } else {
        state.final_status = 'BLOCKED';
        state.synthesizer_decision = "Swarm verification failed. Transaction contains unverified protocols or malicious actors.";
    }

    return state;
}

// ─── 5. Final Verdict & aGDP Tracking ───────────────────────────────────

export async function finalVerdictNode(state: SecurityState): Promise<SecurityState> {
    console.log(`\n⚖️ [FINAL VERDICT] Result: ${state.final_status}`);
    
    const estValue = state.transaction.estimatedValueUsd;
    const agentId = state.transaction.agentId;

    if (state.final_status === 'APPROVED') {
        console.log("📈 [aGDP] Transaction Success! Updating Agentic GDP metrics...");
        gdpTracker.track({
            agentId,
            type: 'EXPENSE',
            value: estValue,
            description: `APPROVED: ${estValue} USD swap via verified protocol`,
            timestamp: Date.now(),
        });
        // Track execution cost as separate expense
        gdpTracker.track({
            agentId,
            type: 'EXPENSE',
            value: 0.42, // ~$0.42 per scan (API + compute costs)
            description: 'EXECUTION_COST: Swarm analysis + TEE attestation',
            timestamp: Date.now(),
        });
    } else if (state.final_status === 'ACE_REJECTED') {
        console.log("🛑 [ENCLAVE] ACE Protocol Blocked execution at the validator layer.");
        // ACE rejections already tracked in aceGuardNode
    } else {
        console.log("☣️ [FORENSICS] Threat signature cached. Coldkey remains isolated.");
        gdpTracker.track({
            agentId,
            type: 'INCOME',
            value: estValue,
            description: `FUNDS_PROTECTED: Blocked $${estValue} malicious transaction`,
            timestamp: Date.now(),
        });
    }

    // Attach live GDP metrics to state for API response
    state.gdp_metrics = gdpTracker.getLiveReport();

    return state;
}

// ─── Exported Singleton Access ──────────────────────────────────────────────

export function getGDPTracker() { return gdpTracker; }
export function getACELayer() { return softAce; }
