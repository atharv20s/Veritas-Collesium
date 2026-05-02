// ─── Veritas Frontier — Models Barrel Export ────────────────────────────────
// Legacy XGBoost classifier removed in v2.6 Frontier migration.
// Risk assessment is now handled by the DeepSeek-R1 auditor + Swarm Intelligence.

// Re-export the DeepSeek auditor as the primary model
export {
  DeepSeekAuditor,
  createDeepSeekAuditor,
} from "../deepseek_auditor";

export type {
  DeepSeekAuditRequest,
  DeepSeekAuditResult,
  DeepSeekConfig,
} from "../deepseek_auditor";
