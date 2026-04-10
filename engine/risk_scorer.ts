/**
 * ============================================================================
 * SENTINEL ENCLAVE — Distilled Risk Scoring Engine (XGBoost)
 * ============================================================================
 * 
 * Replaces the old TD3 implementation with a lightning-fast XGBoost-inspired 
 * decision tree model. This ensures real-time latency (< 20ms) inside the critical 
 * path before MPC signatures are granted.
 */

import {
  FastXGBoostScorer,
  createFastXGBoostScorer,
  TransactionState,
  EnsembleResult,
  PolicyConfig,
  DEFAULT_POLICY
} from "./models/xgboost_classifier";

// Map EnsembleResult to RiskAssessment for backward compatibility
export interface RiskAssessment extends EnsembleResult {
    breakdown: any;
}

export type { TransactionState, PolicyConfig };
export { DEFAULT_POLICY };

export class SentinelRiskScorer {
  private scorer: FastXGBoostScorer;

  constructor(config: Partial<PolicyConfig> = {}) {
    this.scorer = createFastXGBoostScorer(config);
  }

  assessRisk(state: TransactionState): RiskAssessment {
    return this.scorer.assessRisk(state);
  }

  assessSwap(
    tokenAddress: string,
    amountUsd: number,
    poolLiquidityUsd: number,
    slippage: number,
    tokenMetadata: Partial<TransactionState> = {}
  ): RiskAssessment {
    const state: TransactionState = {
      tokenAddress,
      poolLiquidity: poolLiquidityUsd,
      priceImpact: slippage,
      tokenAge: tokenMetadata.tokenAge ?? 24,
      holderConcentration: tokenMetadata.holderConcentration ?? 0.5,
      volume24h: tokenMetadata.volume24h ?? 0,
      txAmount: amountUsd,
      targetProtocol: tokenMetadata.targetProtocol ?? "unknown",
      mintAuthority: tokenMetadata.mintAuthority ?? false,
      freezeAuthority: tokenMetadata.freezeAuthority ?? false,
      lpLocked: tokenMetadata.lpLocked ?? false,
      lpLockDuration: tokenMetadata.lpLockDuration ?? 0,
      creatorTxHistory: tokenMetadata.creatorTxHistory ?? 0,
      rugPullIndicators: tokenMetadata.rugPullIndicators ?? 0,
    };
    return this.scorer.assessRisk(state);
  }

  getConfig(): PolicyConfig {
    return DEFAULT_POLICY; // The underlying FastXGBoostScorer handles dynamic overrides.
  }
}

export function createSentinelScorer(
  overrides: Partial<PolicyConfig> = {}
): SentinelRiskScorer {
  return new SentinelRiskScorer(overrides);
}
