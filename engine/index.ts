// ─── Sentinel Enclave Engine — Barrel Exports ───────────────────────────────

// Distilled XGBoost Risk Scoring Engine
export { 
  SentinelRiskScorer, 
  createSentinelScorer, 
  DEFAULT_POLICY 
} from "./risk_scorer";

export type { 
  TransactionState, 
  RiskAssessment, 
  PolicyConfig 
} from "./risk_scorer";

// Enclave Client (Shamir SSS + Solana Bridge)
export { 
  SentinelEnclaveClient, 
  ShamirSSS 
} from "./enclave_client";

export type { 
  EnclaveConfig, 
  TransactionRequest, 
  EnclaveResponse 
} from "./enclave_client";

// DeepSeek-R1 Sovereign Brain Auditor
export {
  DeepSeekAuditor,
  createDeepSeekAuditor,
} from "./deepseek_auditor";

export type {
  DeepSeekAuditRequest,
  DeepSeekAuditResult,
  DeepSeekConfig,
} from "./deepseek_auditor";

// Unified Brain Pivot (LangGraph State Machine)
export {
  runAgenticLoop,
  executeLangGuard
} from "./sentinel_brain";

export type {
  SecurityState,
  FinalStatus
} from "./langgraph/state";

// Unified Fast XGBoost Classifier
export {
  FastXGBoostScorer,
  createFastXGBoostScorer
} from "./models/xgboost_classifier";

export type {
  RiskBreakdown,
  EnsembleResult
} from "./models/xgboost_classifier";
