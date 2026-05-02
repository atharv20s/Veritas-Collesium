/**
 * ============================================================================
 * VERITAS FRONTIER — E2E CFO Flush Test
 * ============================================================================
 * 
 * Simulates a rogue agent attempting to drain a corporate wallet using
 * high spend velocity on an unverified DEX, triggering a Flash-Freeze and
 * ACE Rejection. This is the "CFO Kill-Shot" demo for Colosseum.
 */

import { executeLangGuard } from "../engine/sentinel_brain";
import { PublicKey, TransactionInstruction, Keypair } from "@solana/web3.js";
import { VeritasTransaction } from "../engine/langgraph/state";
import { SentinelVaultClient } from "../engine/vault_client";

async function runE2E() {
    console.log("==========================================================");
    console.log("🔥 INITIATING 'CFO FLUSH' E2E SIMULATION");
    console.log("==========================================================\n");

    // 1. Setup mock transaction (Rogue Agent attempting a $50k drain)
    const rogueAgentId = "rogue-agent-007";
    const scamDEXProgram = Keypair.generate().publicKey; // Simulate unknown program
    const userWallet = Keypair.generate().publicKey;

    const maliciousInstruction = new TransactionInstruction({
        programId: scamDEXProgram,
        data: Buffer.from("DRAIN_FUNDS"),
        keys: [
            { pubkey: userWallet, isSigner: true, isWritable: true }
        ]
    });

    const txData: VeritasTransaction = {
        instructions: [maliciousInstruction],
        signatures: [],
        feePayer: userWallet,
        estimatedValueUsd: 55000, // $55k (Highly suspicious)
        agentId: rogueAgentId,
    };

    console.log(`🚨 Rogue Agent detected executing $${txData.estimatedValueUsd} swap on unverified program: ${scamDEXProgram.toBase58()}\n`);

    // 2. Execute Veritas Pipeline
    console.log("🛡️ Intercepting via Veritas Sentinel Enclave...");
    const state = await executeLangGuard(txData, (agent, msg, data) => {
        const prefix = 
            agent === "orchestrator" ? "⚙️ [ORCHESTRATOR]" :
            agent === "ace" ? "🚧 [ACE GOVERNANCE]" :
            agent === "forensics" ? "🔍 [FORENSICS]" :
            agent === "protocol" ? "🖧 [PROTOCOL]" :
            agent === "simulation" ? "📈 [SIMULATION]" :
            agent === "synthesizer" ? "🧠 [SYNTHESIZER]" :
            agent === "tee" ? "🔒 [TEE ENCLAVE]" : "💬";
        
        console.log(`${prefix} ${msg}`);
        if (data) console.log(`      Data:`, data);
    });

    console.log("\n==========================================================");
    console.log("📊 E2E SIMULATION RESULTS");
    console.log("==========================================================");
    console.log(`Final Status:     ${state.final_status}`);
    console.log(`Verdict Reason:   ${state.final_verdict_reason}`);
    console.log(`ACE Rejection:    ${state.ace_rejection_details?.violation_type || "None"}`);
    console.log(`aGDP ROI:         +${state.gdp_metrics?.roi_percent}%`);
    console.log(`Funds Protected:  $${state.gdp_metrics?.net_value_usd}`);
    console.log("==========================================================\n");

    if (state.final_status === "ACE_REJECTED" || state.final_status === "BLOCKED") {
        console.log("✅ E2E TEST PASSED: Rogue agent successfully neutralized.");
    } else {
        console.error("❌ E2E TEST FAILED: System permitted unauthorized drain.");
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    runE2E().catch(console.error);
}
