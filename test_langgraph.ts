import { executeLangGuard } from "./engine/sentinel_brain";
import { PublicKey } from "@solana/web3.js";

async function runDemo() {
    console.log("🚀 Starting LangGuard Agentic Loop Demo...");

    // Simulate a transaction for the Swarm
    const tx = {
        instructions: [],
        signatures: [],
        feePayer: new PublicKey("11111111111111111111111111111111"),
        estimatedValueUsd: 1000,
        agentId: "demo-agent-01"
    };

    console.log("\n[Payload] Initiating Transaction Simulation:");
    console.dir(tx, { colors: true, depth: null });

    const finalState = await executeLangGuard(tx);

    console.log("\n==========================================================");
    console.log("🏁 DEMO COMPLETE");
    console.log("Final Decision Status:", finalState.final_status);
    console.log("Loops Used:", finalState.loop_count);
    console.log("Synthesizer Reasoning:", finalState.synthesizer_decision);
    console.log("==========================================================");
}

runDemo().catch(console.error);
