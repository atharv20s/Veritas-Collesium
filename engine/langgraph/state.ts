import { TransactionInstruction, PublicKey } from "@solana/web3.js";
import type { ACERejectionDetails } from "../ace_guard";

export type FinalStatus = 'PENDING' | 'APPROVED' | 'BLOCKED' | 'ACE_REJECTED';

export interface VeritasTransaction {
    instructions: TransactionInstruction[];
    signatures: string[];
    feePayer: PublicKey;
    estimatedValueUsd: number;
    agentId: string;
    metadata?: any;
}

export interface SecurityState {
    // 🏛️ The Transaction Payload
    transaction: VeritasTransaction;

    // 🌀 Orchestration metadata
    loop_count: number;
    final_status: FinalStatus;

    // 🛡️ Swarm + Hardware Attestations
    instruction_hash: string;
    tee_attestation: any;
    ace_identity_token: string | null;

    // 🚦 ACE Governance (v2.6)
    ace_rejection_details?: ACERejectionDetails;

    // 💳 x402 Agentic Payments (v2.6)
    x402_payment?: { paid: boolean; txId?: string; reason: string };

    // 🔍 Swarm Agent Findings
    forensics_findings: any;
    protocol_findings: any;
    simulation_findings: any;

    // 🏛️ Context & Grounding
    colosseum_insights: any;
    archive_theses: any;

    // 📈 Agentic GDP (aGDP) Context
    gdp_metrics: any;

    // 🚀 Execution Plan (Jupiter V6)
    execution_plan?: { quote: any; route: string; estimatedOutput: number };

    // 🧠 Decisions
    synthesizer_decision: string;
    final_verdict_reason: string;

    // Optional Event Streamer
    onLog?: (agent: string, msg: string, data?: any) => void;
}

export function createInitialState(txData: VeritasTransaction, onLog?: (agent: string, msg: string, data?: any) => void): SecurityState {
    return {
        transaction: txData,
        loop_count: 0,
        final_status: 'PENDING',
        instruction_hash: "",
        tee_attestation: null,
        ace_identity_token: null,
        ace_rejection_details: undefined,
        x402_payment: undefined,
        forensics_findings: null,
        protocol_findings: null,
        simulation_findings: null,
        colosseum_insights: null,
        archive_theses: null,
        gdp_metrics: null,
        execution_plan: undefined,
        synthesizer_decision: "",
        final_verdict_reason: "",
        onLog
    };
}
