/**
 * ============================================================================
 * SENTINEL ENSEMBLE — Multi-Model RL Risk Scoring Engine
 * ============================================================================
 * 
 * "Why use one RL model when you have three?"
 * 
 * This ensemble runs TD3, SAC, and PPO in parallel and combines scores
 * using a weighted voting mechanism. The idea: if all three independently
 * trained models agree a transaction is dangerous, confidence is sky-high.
 * 
 * Architecture (from atharv20s/td3ndsac):
 *   TD3: Deterministic policy, twin critics, delayed updates
 *   SAC: Stochastic policy, entropy-regularized, auto-alpha
 *   PPO: On-policy, 3-layer networks, clipped surrogate, GAE
 * 
 * Ensemble Strategies:
 *   1. MAJORITY_VOTE: Approve only if 2/3+ models agree
 *   2. WEIGHTED_AVERAGE: Weighted combination (TD3=0.45, SAC=0.35, PPO=0.20)
 *   3. CONSERVATIVE: Use the HIGHEST risk score (most cautious)
 *   4. UNANIMOUS: Approve only if ALL models agree
 * 
 * State Vector (14 dimensions):
 *   [0]  poolLiquidity (log-normalized)
 *   [1]  priceImpact (0-1)
 *   [2]  tokenAge (normalized to 30d)
 *   [3]  holderConcentration (0-1)
 *   [4]  volume24h (log-normalized)
 *   [5]  txAmount (log-normalized)
 *   [6]  mintAuthority (binary)
 *   [7]  freezeAuthority (binary)
 *   [8]  lpUnlocked (binary, inverted)
 *   [9]  lpLockDuration (normalized to 1y)
 *   [10] creatorTxHistory (normalized)
 *   [11] rugPullIndicators (0-1, from DeepSeek-R1)
 *   [12] txToLiquidityRatio
 *   [13] txToVolumeRatio
 */

import { TD3Actor, TD3Critic, TD3_CONFIG } from "./td3";
import { SACGaussianActor, SAC_CONFIG } from "./sac";
import { PPOActorCritic, PPO_CONFIG } from "./ppo";

// ─── Types ──────────────────────────────────────────────────────────────────

export type EnsembleStrategy = "MAJORITY_VOTE" | "WEIGHTED_AVERAGE" | "CONSERVATIVE" | "UNANIMOUS";

export interface EnsembleResult {
  /** Final combined risk score (0-100) */
  score: number;
  /** Whether the transaction is approved */
  approved: boolean;
  /** Individual model scores */
  modelScores: {
    td3: number;
    sac: number;
    ppo: number;
  };
  /** Agreement level (0-1): how much the models agree */
  agreement: number;
  /** Confidence (0-1): how confident we are in the ensemble result */
  confidence: number;
  /** Which strategy was used */
  strategy: EnsembleStrategy;
  /** Breakdown */
  breakdown: RiskBreakdown;
}

export interface RiskBreakdown {
  liquidityRisk: number;
  slippageRisk: number;
  tokenRisk: number;
  behavioralRisk: number;
}

export interface TransactionState {
  tokenAddress: string;
  poolLiquidity: number;
  priceImpact: number;
  tokenAge: number;
  holderConcentration: number;
  volume24h: number;
  txAmount: number;
  targetProtocol: string;
  mintAuthority: boolean;
  freezeAuthority: boolean;
  lpLocked: boolean;
  lpLockDuration: number;
  creatorTxHistory: number;
  rugPullIndicators: number;
}

export interface PolicyConfig {
  riskThreshold: number;
  maxTransactionValue: number;
  minLiquidity: number;
  maxSlippage: number;
  minTokenAge: number;
  maxHolderConcentration: number;
}

// ─── Default Policy ─────────────────────────────────────────────────────────

export const DEFAULT_POLICY: PolicyConfig = {
  riskThreshold: 70,
  maxTransactionValue: 50000,
  minLiquidity: 10000,
  maxSlippage: 0.05,
  minTokenAge: 24,
  maxHolderConcentration: 0.8,
};

// ─── State Builder ──────────────────────────────────────────────────────────

function buildStateVector(tx: TransactionState): number[] {
  return [
    Math.log1p(tx.poolLiquidity) / 20,           // [0] liquidity
    tx.priceImpact,                                // [1] slippage
    Math.min(tx.tokenAge / 720, 1),                // [2] age (30d)
    tx.holderConcentration,                        // [3] concentration
    Math.log1p(tx.volume24h) / 20,                 // [4] volume
    Math.log1p(tx.txAmount) / 15,                  // [5] amount
    tx.mintAuthority ? 1 : 0,                      // [6] mint auth
    tx.freezeAuthority ? 1 : 0,                    // [7] freeze auth
    tx.lpLocked ? 0 : 1,                           // [8] LP unlocked (inverted)
    Math.min(tx.lpLockDuration / 365, 1),          // [9] lock duration
    Math.min(tx.creatorTxHistory / 20, 1),         // [10] creator history
    tx.rugPullIndicators / 10,                     // [11] rug indicators (from DeepSeek)
    tx.txAmount / Math.max(tx.poolLiquidity, 1),   // [12] tx/liquidity ratio
    tx.volume24h > 0 ? tx.txAmount / tx.volume24h : 1, // [13] tx/volume ratio
  ];
}

// ─── Rule-Based Pre-Screener ────────────────────────────────────────────────

function ruleBasedScreen(tx: TransactionState, policy: PolicyConfig): { breakdown: RiskBreakdown; reasons: string[]; score: number } {
  const reasons: string[] = [];
  const breakdown: RiskBreakdown = { liquidityRisk: 0, slippageRisk: 0, tokenRisk: 0, behavioralRisk: 0 };

  // Liquidity Risk (0-25)
  if (tx.poolLiquidity < policy.minLiquidity) {
    breakdown.liquidityRisk = Math.round((1 - tx.poolLiquidity / policy.minLiquidity) * 25);
    reasons.push(`Low liquidity: $${tx.poolLiquidity.toLocaleString()} (min: $${policy.minLiquidity.toLocaleString()})`);
  }

  // Slippage Risk (0-25)
  if (tx.priceImpact > policy.maxSlippage) {
    breakdown.slippageRisk = Math.min(25, Math.round(tx.priceImpact * 100));
    reasons.push(`Excessive slippage: ${(tx.priceImpact * 100).toFixed(1)}% (max: ${(policy.maxSlippage * 100).toFixed(1)}%)`);
  }

  // Token Risk (0-25)
  let tokenRisk = 0;
  if (tx.mintAuthority) { tokenRisk += 7; reasons.push("⚠️ Mint authority is active"); }
  if (tx.freezeAuthority) { tokenRisk += 5; reasons.push("⚠️ Freeze authority is active"); }
  if (!tx.lpLocked) { tokenRisk += 8; reasons.push("🔓 Liquidity is NOT locked"); }
  else if (tx.lpLockDuration < 30) { tokenRisk += 4; reasons.push(`LP lock: ${tx.lpLockDuration}d remaining`); }
  if (tx.tokenAge < policy.minTokenAge) { tokenRisk += 5; reasons.push(`Token age: ${tx.tokenAge.toFixed(1)}h (min: ${policy.minTokenAge}h)`); }
  breakdown.tokenRisk = Math.min(25, tokenRisk);

  // Behavioral Risk (0-25)
  let behavioralRisk = 0;
  if (tx.holderConcentration > policy.maxHolderConcentration) {
    behavioralRisk += 10;
    reasons.push(`Top holders: ${(tx.holderConcentration * 100).toFixed(1)}% concentration`);
  }
  if (tx.creatorTxHistory > 5) {
    behavioralRisk += 8;
    reasons.push(`Serial deployer: ${tx.creatorTxHistory} prior tokens`);
  }
  if (tx.rugPullIndicators > 5) {
    behavioralRisk += 7;
    reasons.push(`Rug indicators: ${tx.rugPullIndicators}/10`);
  }
  breakdown.behavioralRisk = Math.min(25, behavioralRisk);

  const score = breakdown.liquidityRisk + breakdown.slippageRisk + breakdown.tokenRisk + breakdown.behavioralRisk;
  return { breakdown, reasons, score };
}

// ─── Ensemble Risk Scorer ───────────────────────────────────────────────────

export class SentinelEnsemble {
  private td3Actor: TD3Actor;
  private sacActor: SACGaussianActor;
  private ppoActor: PPOActorCritic;
  private policy: PolicyConfig;
  private strategy: EnsembleStrategy;
  private weights: { td3: number; sac: number; ppo: number };

  constructor(
    policy: Partial<PolicyConfig> = {},
    strategy: EnsembleStrategy = "WEIGHTED_AVERAGE"
  ) {
    this.td3Actor = new TD3Actor(14, 1, TD3_CONFIG.HIDDEN_DIM);
    this.sacActor = new SACGaussianActor(14, 1, SAC_CONFIG.HIDDEN_DIM);
    this.ppoActor = new PPOActorCritic(14, 1, PPO_CONFIG.HIDDEN_DIM);
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.strategy = strategy;
    // TD3 gets highest weight — deterministic policy is most stable for security
    this.weights = { td3: 0.45, sac: 0.35, ppo: 0.20 };
  }

  /**
   * Run the full ensemble assessment
   */
  assessRisk(tx: TransactionState): EnsembleResult {
    const stateVec = buildStateVector(tx);
    const { breakdown, reasons, score: ruleScore } = ruleBasedScreen(tx, this.policy);

    // ── Run all three models ────────────────────────────────────────────
    const td3Score = this.td3Actor.predict(stateVec);
    const sacScore = this.sacActor.predict(stateVec);
    const ppoScore = this.ppoActor.predict(stateVec);

    const modelScores = {
      td3: Math.round(td3Score),
      sac: Math.round(sacScore),
      ppo: Math.round(ppoScore),
    };

    // ── Ensemble combination ────────────────────────────────────────────
    let neuralScore: number;

    switch (this.strategy) {
      case "WEIGHTED_AVERAGE":
        neuralScore = td3Score * this.weights.td3 + sacScore * this.weights.sac + ppoScore * this.weights.ppo;
        break;

      case "CONSERVATIVE":
        neuralScore = Math.max(td3Score, sacScore, ppoScore);
        break;

      case "MAJORITY_VOTE": {
        const threshold = this.policy.riskThreshold;
        const votes = [td3Score > threshold, sacScore > threshold, ppoScore > threshold];
        const rejectVotes = votes.filter(v => v).length;
        neuralScore = rejectVotes >= 2
          ? Math.max(td3Score, sacScore, ppoScore)
          : Math.min(td3Score, sacScore, ppoScore);
        break;
      }

      case "UNANIMOUS": {
        const threshold = this.policy.riskThreshold;
        const allReject = td3Score > threshold && sacScore > threshold && ppoScore > threshold;
        neuralScore = allReject
          ? Math.max(td3Score, sacScore, ppoScore)
          : (td3Score + sacScore + ppoScore) / 3;
        break;
      }
    }

    // Combine rule-based (60%) + neural ensemble (40%)
    const finalScore = Math.round(
      Math.min(100, Math.max(0, ruleScore * 0.6 + neuralScore * 0.4))
    );

    // Agreement: inverse of standard deviation across models
    const modelArr = [td3Score, sacScore, ppoScore];
    const mean = modelArr.reduce((s, v) => s + v, 0) / 3;
    const variance = modelArr.reduce((s, v) => s + (v - mean) ** 2, 0) / 3;
    const stdDev = Math.sqrt(variance);
    const agreement = Math.max(0, 1 - stdDev / 50); // Normalize

    // Confidence: based on agreement + rule score alignment
    const confidence = Math.min(1, agreement * 0.6 + (1 - Math.abs(ruleScore - neuralScore) / 100) * 0.4);

    const approved = finalScore <= this.policy.riskThreshold;

    return {
      score: finalScore,
      approved,
      modelScores,
      agreement: Math.round(agreement * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      strategy: this.strategy,
      breakdown,
    };
  }

  /** Change ensemble strategy */
  setStrategy(strategy: EnsembleStrategy): void {
    this.strategy = strategy;
  }

  /** Update model weights */
  setWeights(weights: { td3: number; sac: number; ppo: number }): void {
    const sum = weights.td3 + weights.sac + weights.ppo;
    this.weights = {
      td3: weights.td3 / sum,
      sac: weights.sac / sum,
      ppo: weights.ppo / sum,
    };
  }

  /** Get config info */
  getInfo(): {
    strategy: EnsembleStrategy;
    weights: typeof this.weights;
    models: string[];
    architectures: { td3: string; sac: string; ppo: string };
    source: string;
  } {
    return {
      strategy: this.strategy,
      weights: this.weights,
      models: ["TD3", "SAC", "PPO"],
      architectures: {
        td3: `Actor: 14→${TD3_CONFIG.HIDDEN_DIM}→${TD3_CONFIG.HIDDEN_DIM}→1 (deterministic, tanh)`,
        sac: `Actor: 14→${SAC_CONFIG.HIDDEN_DIM}→${SAC_CONFIG.HIDDEN_DIM}→[mean,log_std] (Gaussian, reparameterization)`,
        ppo: `ActorCritic: 14→${PPO_CONFIG.HIDDEN_DIM}→${PPO_CONFIG.HIDDEN_DIM}→128→1 (3-layer, orthogonal init, GAE)`,
      },
      source: "github.com/atharv20s/td3ndsac",
    };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createSentinelEnsemble(
  policy?: Partial<PolicyConfig>,
  strategy?: EnsembleStrategy
): SentinelEnsemble {
  return new SentinelEnsemble(policy, strategy);
}
