import { SecurityState, createInitialState, VeritasTransaction } from "./langgraph/state";
import { 
    ingestionNode,
    aceGuardNode,
    forensicsAgent, 
    protocolAgent, 
    simulationAgent, 
    synthesizerNode, 
    finalVerdictNode 
} from "./langgraph/nodes";

/**
 * ============================================================================
 * VERITAS FRONTIER — Sentinel Brain (Orchestrator)
 * ============================================================================
 * 
 * Executes the Frontier v2.6 State Machine for transaction verification.
 * Follows the flow: Ingestion -> ACE -> Swarm -> Synthesizer -> Verdict.
 */

export async function runAgenticLoop(initialState: SecurityState): Promise<SecurityState> {
    console.log("\n==========================================================");
    console.log("🌀 Veritas Frontier v2.6 State Machine Initialized...");
    console.log("==========================================================");

    // 1. Ingestion & Hashing
    let currentState = await ingestionNode(initialState);
    if (currentState.final_status === 'BLOCKED') return finalVerdictNode(currentState);

    // 2. ACE Protocol Gating (Access Control Execution)
    currentState = await aceGuardNode(currentState);
    if (currentState.final_status === 'ACE_REJECTED') return finalVerdictNode(currentState);

    // 3. Parallel Swarm Intelligence
    const loopString = `\n🔄 --- Swarm Intelligence Analysis ---`;
    console.log(loopString);
    if (currentState.onLog) currentState.onLog("orchestrator", loopString);

    const [forensics, protocol, simulation] = await Promise.all([
        forensicsAgent(currentState),
        protocolAgent(currentState),
        simulationAgent(currentState)
    ]);
    
    // Merge findings into state
    currentState.forensics_findings = forensics;
    currentState.protocol_findings = protocol;
    currentState.simulation_findings = simulation;

    if (currentState.onLog) {
        currentState.onLog("forensics", `Forensics check resolved: ${forensics.risk_profile}`);
        currentState.onLog("protocol", `Protocol check bounded: ${protocol.trust_tier}`, protocol);
        currentState.onLog("simulation", `Deterministic Balance Prediction: ${simulation.projected_balance_change}`);
    }

    // 4. Synthesizer & Hardware Attestation (DeepSeek-R1)
    if (currentState.onLog) currentState.onLog("synthesizer", "Injecting determinism memory into DeepSeek-R1 for TEE Attestation...");
    currentState = await synthesizerNode(currentState);
    
    if (currentState.onLog) {
        currentState.onLog("synthesizer", `Intelligence synthesized successfully -> '${currentState.final_status}'`, { reason: currentState.synthesizer_decision });
    }

    // 5. Final Verdict & aGDP Tracking
    return finalVerdictNode(currentState);
}

export async function executeLangGuard(txData: VeritasTransaction, onLog?: (agent: string, msg: string, data?: any) => void): Promise<SecurityState> {
    const initialState = createInitialState(txData, onLog);
    return runAgenticLoop(initialState);
}
