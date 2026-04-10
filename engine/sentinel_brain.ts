import { SecurityState, createInitialState } from "./langgraph/state";
import { 
    triageNode, 
    forensicsAgent, 
    protocolAgent, 
    executionAgent, 
    colosseumGroundingNode, 
    synthesizerNode, 
    finalVerdictNode 
} from "./langgraph/nodes";
import { TransactionState } from "./models/xgboost_classifier";

/**
 * ============================================================================
 * SENTINEL BRAIN — The LangGuard State Machine (Orchestrator)
 * ============================================================================
 * 
 * Executes the cyclical State Machine graph for transaction verification.
 * Follows the Triage -> Swarm -> Grounding -> Synthesizer -> Verdict flow.
 */

export async function runAgenticLoop(initialState: SecurityState): Promise<SecurityState> {
    console.log("\n==========================================================");
    console.log("🌀 LangGuard State Machine Initialized...");
    console.log("==========================================================");

    let currentState = await triageNode(initialState);
    
    // Fast path exit
    if (currentState.final_status === 'APPROVED') {
        return finalVerdictNode(currentState);
    }

    // Entering the Graph Loop
    while (currentState.final_status === 'PENDING' && currentState.loop_count < 3) {
        currentState.loop_count++;
        const loopString = `\n🔄 --- Graph Loop Iteration ${currentState.loop_count} ---`;
        console.log(loopString);
        if (currentState.onLog) currentState.onLog("orchestrator", loopString);

        // 1. Parallel Swarm Execution
        if (currentState.onLog) currentState.onLog("system", "Starting Swarm Validation Parallel Nodes...");
        const [forensics, protocol, execution] = await Promise.all([
            forensicsAgent(currentState),
            protocolAgent(currentState),
            executionAgent(currentState)
        ]);
        
        // Merge findings into state
        currentState.forensics_findings = forensics;
        currentState.protocol_findings = protocol;
        currentState.execution_findings = execution;

        if (currentState.onLog) {
            currentState.onLog("forensics", `Forensics check resolved: ${JSON.stringify(forensics.risk_profile || forensics.error)}`);
            currentState.onLog("protocol", `Protocol check bounded: ${protocol.verified_protocol ? "TRUSTED" : "UNTRUSTED"}`, protocol);
            currentState.onLog("execution", `RPC Simulated Gas Output: ${execution.gas_used || execution.error}`);
        }

        // 2. Colosseum Grounding
        if (currentState.onLog) currentState.onLog("colosseum", "Fetching Historical Exploit Correlators from Copilot...");
        currentState = await colosseumGroundingNode(currentState);
        if (currentState.onLog) currentState.onLog("colosseum", "Archive patterns mapped successfully.");

        // 3. Synthesizer Decision (The LLM Budget)
        if (currentState.onLog) currentState.onLog("synthesizer", "Injecting determinism memory into DeepSeek-R1 evaluation prompt...");
        currentState = await synthesizerNode(currentState);
        if (currentState.onLog) currentState.onLog("synthesizer", `Intelligence synthesized successfully determining action constraints -> '${currentState.final_status}'`, { reason: currentState.synthesizer_decision });

        // Synthesizer logic updates currentState.final_status to 'APPROVED', 'BLOCKED', 
        // or leaves it 'PENDING' to loop back to Execution Agent.
    }

    if (currentState.final_status === 'PENDING') {
        console.log("\n⚠️ [ORCHESTRATOR] Max loops reached! Forcing BLOCKED condition.");
        currentState.final_status = 'BLOCKED';
    }

    return finalVerdictNode(currentState);
}

export async function executeLangGuard(txData: TransactionState, onLog?: (agent: string, msg: string, data?: any) => void): Promise<SecurityState> {
    const initialState = createInitialState(txData, onLog);
    return runAgenticLoop(initialState);
}
