// ─── Veritas Frontier Engine — Barrel Exports ───────────────────────────────

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

export {
  getGDPTracker,
  getACELayer
} from "./langgraph/nodes";

export type {
  SecurityState,
  FinalStatus,
  VeritasTransaction,
} from "./langgraph/state";

// TEE Signer (AWS Nitro / Intel TDX)
export {
  VeritasTEEClient,
  InstructionHasher
} from "./tee_signer";

export type {
  TEEAttestation,
  TEESignResult
} from "./tee_signer";

// ACE Governance (Access Control Execution)
export {
  ACEGuard,
  SoftACELayer
} from "./ace_guard";

export type {
  ACEPolicy,
  ACEViolationType,
  ACERejectionDetails,
  ACEPolicySnapshot,
  ACEValidationResult,
} from "./ace_guard";

// x402 Facilitator (Agent-to-Agent Payments)
export {
  x402Facilitator
} from "./x402_facilitator";

export type {
  x402Request,
  x402PaymentResult,
  x402PaymentRecord,
} from "./x402_facilitator";

// Agentic GDP (aGDP) Tracker
export {
  aGDPTracker
} from "./agdp_tracker";

export type {
  aGDPEvent,
  aGDPMetrics,
  aGDPLiveReport,
  EfficiencyDataPoint,
} from "./agdp_tracker";

// Jupiter V6 Execution Engine
export {
  JupiterV6Client,
  TOKEN_MINTS,
} from "./execution_engine";

export type {
  JupiterQuoteResponse,
  JupiterSwapResponse,
  ExecutionPlan,
} from "./execution_engine";

// Sentinel Enclave Vault SDK
export {
  SentinelVaultClient,
  SENTINEL_PROGRAM_ID,
} from "./vault_client";
