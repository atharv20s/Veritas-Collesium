/**
 * ============================================================================
 * SENTINEL ENCLAVE — XGBoost Fast Classifier (Distilled Execution Path)
 * ============================================================================
 * 
 * Replaces the heavy RL ensemble (TD3+SAC+PPO).
 * This provides a fast, O(1) latency risk assessment for the Real-Time Path,
 * allowing Sentinel to dodge the Solana latency death trap (400ms blocks).
 */

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

export interface RiskBreakdown {
  liquidityRisk: number;
  slippageRisk: number;
  tokenRisk: number;
  behavioralRisk: number;
}

export interface EnsembleResult {
  score: number;
  approved: boolean;
  reasons: string[];
  confidence: number;
  breakdown: RiskBreakdown;
  latencyMs: number;
}

export interface PolicyConfig {
  riskThreshold: number;
  whitelistedProtocols: string[];
  blacklistedTokens: string[];
  maxTransactionValue: number;
  minLiquidity: number;
  maxSlippage: number;
  minTokenAge: number;
  maxHolderConcentration: number;
}

export const DEFAULT_POLICY: PolicyConfig = {
  riskThreshold: 70, // This will be dynamically overridden
  whitelistedProtocols: [
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  ],
  blacklistedTokens: [],
  maxTransactionValue: 50000,
  minLiquidity: 10000,
  maxSlippage: 0.05,
  minTokenAge: 24,
  maxHolderConcentration: 0.8,
};

/**
 * Fast XGBoost-inspired decision tree ensemble (Distilled Model)
 */
export class FastXGBoostScorer {
  private config: PolicyConfig;

  constructor(config: Partial<PolicyConfig> = {}) {
    this.config = { ...DEFAULT_POLICY, ...config };
  }

  assessRisk(state: TransactionState): EnsembleResult {
    const startTime = Date.now();
    const breakdown: RiskBreakdown = { liquidityRisk: 0, slippageRisk: 0, tokenRisk: 0, behavioralRisk: 0 };
    const reasons: string[] = [];
    let baseScore = 0;

    // Fast Decision Tree Rules (Approximated XGBoost Nodes)
    if (state.poolLiquidity < 5000) { breakdown.liquidityRisk += 25; reasons.push("Critically low pool liquidity (<$5k)"); }
    else if (state.poolLiquidity < this.config.minLiquidity) { breakdown.liquidityRisk += 15; }

    if (state.priceImpact > 0.15) { breakdown.slippageRisk += 25; reasons.push("Slippage exceeds 15% (Sandwich risk)"); }
    else if (state.priceImpact > this.config.maxSlippage) { breakdown.slippageRisk += 15; }

    if (state.mintAuthority) { breakdown.tokenRisk += 15; reasons.push("Mint Authority Active"); }
    if (state.freezeAuthority) { breakdown.tokenRisk += 10; reasons.push("Freeze Authority Active"); }
    if (!state.lpLocked) { breakdown.tokenRisk += 20; reasons.push("LP Not Locked"); }
    if (state.tokenAge < this.config.minTokenAge) { breakdown.tokenRisk += 10; }

    if (state.holderConcentration > 0.9) { breakdown.behavioralRisk += 20; reasons.push("Extremely high token concentration"); }
    else if (state.holderConcentration > this.config.maxHolderConcentration) { breakdown.behavioralRisk += 10; }
    
    if (state.rugPullIndicators > 0) { breakdown.behavioralRisk += state.rugPullIndicators * 2; reasons.push(`Background Async AI scored rug risk at ${state.rugPullIndicators}`); }

    baseScore = breakdown.liquidityRisk + breakdown.slippageRisk + breakdown.tokenRisk + breakdown.behavioralRisk;
    baseScore = Math.min(100, baseScore);

    // Dynamic Threshold Calculation (Replacing hardcoded DEFAULT_POLICY threshold)
    let dynamicThreshold = this.config.riskThreshold;
    if (state.txAmount > 1000) {
      dynamicThreshold -= 15; // Stricter for large trades
    } else if (state.txAmount < 50) {
      dynamicThreshold += 15; // More lenient for microtransactions
    }

    // Stablecoin checks
    if (["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"].includes(state.tokenAddress)) {
      dynamicThreshold += 20; // USDC is generally safer
    }

    dynamicThreshold = Math.min(100, Math.max(10, dynamicThreshold));

    const approved = baseScore <= dynamicThreshold;
    
    if (!approved) {
      reasons.unshift(`❌ BLOCKED: Fast model risk ${baseScore}/100 exceeds dynamic threshold ${dynamicThreshold}/100`);
    } else {
      reasons.unshift(`✅ PASSED: Fast model risk ${baseScore}/100 is below dynamic threshold ${dynamicThreshold}/100`);
    }

    return {
      score: baseScore,
      approved,
      reasons,
      confidence: 0.95,
      breakdown,
      latencyMs: Date.now() - startTime,
    };
  }
}

export function createFastXGBoostScorer(config?: Partial<PolicyConfig>): FastXGBoostScorer {
  return new FastXGBoostScorer(config);
}
