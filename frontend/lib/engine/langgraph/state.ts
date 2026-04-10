import { TransactionState } from "../models/xgboost_classifier";

export type FinalStatus = 'PENDING' | 'APPROVED' | 'BLOCKED';

export interface SecurityState {
    // Original Transaction payload context
    transaction_data: TransactionState;

    // Orchestration metadata
    loop_count: number;
    final_status: FinalStatus;

    // Triage / Routing flags
    triage_score: number;
    
    // Swarm Agent Outputs
    forensics_findings: any;
    protocol_findings: any;
    execution_findings: any;

    // External Grounding Data
    colosseum_insights: any;
    archive_theses: any;

    // Decision Logic Context
    synthesizer_decision: string;

    // Optional Event Streamer
    onLog?: (agent: string, msg: string, data?: any) => void;
}

export function createInitialState(txData: TransactionState, onLog?: (agent: string, msg: string, data?: any) => void): SecurityState {
    return {
        transaction_data: txData,
        loop_count: 0,
        final_status: 'PENDING',
        triage_score: 0,
        forensics_findings: null,
        protocol_findings: null,
        execution_findings: null,
        colosseum_insights: null,
        archive_theses: null,
        synthesizer_decision: "",
        onLog
    };
}
