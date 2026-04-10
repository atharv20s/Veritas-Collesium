import { executeLangGuard } from "./engine/sentinel_brain";
import { TransactionState } from "./engine/risk_scorer";

async function runDemo() {
    console.log("🚀 Starting LangGuard Agentic Loop Demo...");

    // Simulate a high-risk transaction that bypasses Triage into the Swarm
    const toxicTx: TransactionState = {
        tokenAddress: "RUGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        poolLiquidity: 500,        // critically low
        priceImpact: 0.95,         // 95% slippage (insane sandwich/rug risk)
        tokenAge: 2,               // 2 hours old
        holderConcentration: 0.99, // 99% held by top wallets
        volume24h: 10000,
        txAmount: 5000,            // $5k trade on $500 pool
        targetProtocol: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
        mintAuthority: true,
        freezeAuthority: true,
        lpLocked: false,
        lpLockDuration: 0,
        creatorTxHistory: 20,
        rugPullIndicators: 9       // Very high async background risk
    };

    console.log("\n[Payload] Initiating Toxic Transaction Simulation:");
    console.dir(toxicTx, { colors: true, depth: null });

    const finalState = await executeLangGuard(toxicTx);

    console.log("\n==========================================================");
    console.log("🏁 DEMO COMPLETE");
    console.log("Target Program:", finalState.transaction_data.targetProtocol);
    console.log("Final Decision Status:", finalState.final_status);
    console.log("Loops Used:", finalState.loop_count);
    console.log("Synthesizer Reasoning:", finalState.synthesizer_decision);
    console.log("==========================================================");
}

runDemo().catch(console.error);
