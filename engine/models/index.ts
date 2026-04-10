// ─── Sentinel Enclave — Distilled Models Barrel Export ──────────────────────────────
// Replaced the heavy RL ensemble (TD3, SAC, PPO) with high-speed xgboost classifier.

export { FastXGBoostScorer, createFastXGBoostScorer, DEFAULT_POLICY } from "./xgboost_classifier";
export type {
  TransactionState,
  RiskBreakdown,
  EnsembleResult,
  PolicyConfig,
} from "./xgboost_classifier";
