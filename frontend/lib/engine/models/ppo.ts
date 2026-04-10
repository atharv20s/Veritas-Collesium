/**
 * ============================================================================
 * PPO (Proximal Policy Optimization) — Ported from atharv20s/td3ndsac
 * ============================================================================
 * 
 * Faithfully mirrors PPO/ppo_agent.py:
 *   ActorCritic with SEPARATE networks:
 *     Actor:  actor_fc1(state, 256) → ReLU → actor_fc2(256, 256) → ReLU →
 *             actor_fc3(256, 128) → ReLU → [policy_mean(128, 1), policy_log_std(128, 1)]
 *     Critic: critic_fc1(state, 256) → ReLU → critic_fc2(256, 256) → ReLU →
 *             critic_fc3(256, 128) → ReLU → value_head(128, 1)
 * 
 * KEY DIFFERENCES from TD3/SAC:
 *   - ON-POLICY (uses rollout buffer, not replay buffer)
 *   - 3-layer networks (vs 2-layer in TD3/SAC)
 *   - Orthogonal initialization (gain=sqrt(2))
 *   - Clipped surrogate objective
 *   - GAE (Generalized Advantage Estimation)
 *   - State-dependent log_std with floor (min 0.1)
 *   - Separate actor/critic optimizers
 * 
 * Hyperparameters (from ppo_config.py):
 *   ACTOR_LR = 3e-4
 *   CRITIC_LR = 1e-3 (higher than actor!)
 *   CLIP_EPSILON = 0.2
 *   GAE_LAMBDA = 0.95
 *   GAMMA = 0.99
 *   ENTROPY_COEF = 0.02
 *   VALUE_COEF = 0.5
 *   MAX_GRAD_NORM = 0.5
 *   N_EPOCHS = 10
 *   BATCH_SIZE = 64
 *   N_STEPS = 480
 *   HIDDEN_DIM = 256
 */

export const PPO_CONFIG = {
  HIDDEN_DIM: 256,
  ACTOR_LR: 3e-4,
  CRITIC_LR: 1e-3,
  CLIP_EPSILON: 0.2,
  GAMMA: 0.99,
  GAE_LAMBDA: 0.95,
  ENTROPY_COEF: 0.02,
  VALUE_COEF: 0.5,
  MAX_GRAD_NORM: 0.5,
  N_EPOCHS: 10,
  BATCH_SIZE: 64,
  N_STEPS: 480,
} as const;

// ─── Linear Layer with Orthogonal Init ──────────────────────────────────────

class Linear {
  weights: number[][];
  biases: number[];
  inDim: number;
  outDim: number;

  constructor(inDim: number, outDim: number, gain: number = Math.sqrt(2)) {
    this.inDim = inDim;
    this.outDim = outDim;
    // Orthogonal initialization (matches PPO's _initialize_weights)
    this.weights = orthogonalInit(outDim, inDim, gain);
    this.biases = new Array(outDim).fill(0); // constant_(bias, 0.0)
  }

  forward(input: number[]): number[] {
    const output = new Array(this.outDim);
    for (let i = 0; i < this.outDim; i++) {
      let sum = this.biases[i];
      const row = this.weights[i];
      for (let j = 0; j < this.inDim; j++) {
        sum += row[j] * input[j];
      }
      output[i] = sum;
    }
    return output;
  }

  loadWeights(weights: number[][], biases: number[]): void {
    this.weights = weights;
    this.biases = biases;
  }
}

/**
 * Approximate orthogonal initialization (matches nn.init.orthogonal_)
 * Uses Gram-Schmidt process for proper orthogonalization
 */
function orthogonalInit(rows: number, cols: number, gain: number): number[][] {
  // Generate random matrix
  const mat: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => gaussianRandom())
  );

  // Simple QR-like orthogonalization via Gram-Schmidt (for small matrices)
  // For large matrices, this is approximate but sufficient for inference
  const minDim = Math.min(rows, cols);
  for (let i = 0; i < minDim && i < 32; i++) {
    // Normalize row i
    let norm = 0;
    for (let j = 0; j < cols; j++) norm += mat[i][j] * mat[i][j];
    norm = Math.sqrt(norm) || 1;
    for (let j = 0; j < cols; j++) mat[i][j] /= norm;

    // Subtract projection from subsequent rows
    for (let k = i + 1; k < rows && k < i + 32; k++) {
      let dot = 0;
      for (let j = 0; j < cols; j++) dot += mat[k][j] * mat[i][j];
      for (let j = 0; j < cols; j++) mat[k][j] -= dot * mat[i][j];
    }
  }

  // Scale by gain
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      mat[i][j] *= gain;
    }
  }

  return mat;
}

function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function relu(x: number[]): number[] { return x.map(v => Math.max(0, v)); }
function clamp(x: number, min: number, max: number): number { return Math.max(min, Math.min(max, x)); }

// ─── PPO ActorCritic (SEPARATE Networks, 3 Layers) ─────────────────────────
// Mirrors the exact architecture from ppo_agent.py ActorCritic

export class PPOActorCritic {
  // Actor path (3 layers: 256 → 256 → 128)
  actorFc1: Linear;
  actorFc2: Linear;
  actorFc3: Linear;
  policyMean: Linear;
  policyLogStd: Linear;

  // Critic path (3 layers: 256 → 256 → 128) — completely separate
  criticFc1: Linear;
  criticFc2: Linear;
  criticFc3: Linear;
  valueHead: Linear;

  constructor(stateDim: number = 14, actionDim: number = 1, hiddenDim: number = PPO_CONFIG.HIDDEN_DIM) {
    const halfHidden = Math.floor(hiddenDim / 2); // 128

    // Actor network (orthogonal init, gain=sqrt(2))
    this.actorFc1 = new Linear(stateDim, hiddenDim, Math.sqrt(2));
    this.actorFc2 = new Linear(hiddenDim, hiddenDim, Math.sqrt(2));
    this.actorFc3 = new Linear(hiddenDim, halfHidden, Math.sqrt(2));
    // Output heads with smaller initialization (gain=0.01)
    this.policyMean = new Linear(halfHidden, actionDim, 0.01);
    this.policyLogStd = new Linear(halfHidden, actionDim, 0.01);

    // Critic network (orthogonal init, gain=sqrt(2))
    this.criticFc1 = new Linear(stateDim, hiddenDim, Math.sqrt(2));
    this.criticFc2 = new Linear(hiddenDim, hiddenDim, Math.sqrt(2));
    this.criticFc3 = new Linear(hiddenDim, halfHidden, Math.sqrt(2));
    this.valueHead = new Linear(halfHidden, 1, 1.0); // gain=1.0 for value head
  }

  /**
   * Full forward pass → (action_mean, action_std, value)
   * Mirrors ActorCritic.forward() with SEPARATE actor/critic paths
   */
  forward(state: number[]): { actionMean: number[]; actionStd: number[]; value: number } {
    // Actor path
    let a = relu(this.actorFc1.forward(state));
    a = relu(this.actorFc2.forward(a));
    a = relu(this.actorFc3.forward(a));
    const actionMean = this.policyMean.forward(a);
    const logStdRaw = this.policyLogStd.forward(a);
    // State-dependent std with WIDER bounds: clamp(-2, 1.0) then floor at 0.1
    const actionStd = logStdRaw.map(v => Math.max(0.1, Math.exp(clamp(v, -2, 1.0))));

    // Critic path (completely separate)
    let c = relu(this.criticFc1.forward(state));
    c = relu(this.criticFc2.forward(c));
    c = relu(this.criticFc3.forward(c));
    const value = this.valueHead.forward(c)[0];

    return { actionMean, actionStd, value };
  }

  /** Get action for inference */
  getAction(state: number[], deterministic: boolean = false): { action: number[]; value: number; logProb: number } {
    const { actionMean, actionStd, value } = this.forward(state);

    if (deterministic) {
      return {
        action: actionMean.map(v => Math.tanh(v)),
        value,
        logProb: 0,
      };
    }

    // Sample from Gaussian
    const actionSample = actionMean.map((m, i) => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return m + actionStd[i] * z;
    });

    // Tanh squashing
    const action = actionSample.map(v => Math.tanh(v));

    // Log probability with tanh correction
    let logProb = 0;
    for (let i = 0; i < actionSample.length; i++) {
      const variance = actionStd[i] * actionStd[i];
      const diff = actionSample[i] - actionMean[i];
      logProb += -0.5 * (diff * diff / variance + Math.log(2 * Math.PI * variance));
      logProb -= Math.log(1 - action[i] * action[i] + 1e-6);
    }

    return { action, value, logProb };
  }

  /** Map action from [-1, 1] → risk score [0, 100] */
  predict(state: number[]): number {
    const { action } = this.getAction(state, true);
    return (action[0] + 1) * 50;
  }
}

// ─── Rollout Buffer (ON-POLICY) ─────────────────────────────────────────────
// Mirrors: RolloutBuffer with GAE computation

export interface RolloutStep {
  state: number[];
  action: number[];
  reward: number;
  value: number;
  logProb: number;
  done: boolean;
}

export class RolloutBuffer {
  private buffer: RolloutStep[] = [];
  private maxSize: number;
  advantages: number[] = [];
  returns: number[] = [];

  constructor(maxSize: number = PPO_CONFIG.N_STEPS) {
    this.maxSize = maxSize;
  }

  add(step: RolloutStep): boolean {
    if (this.buffer.length >= this.maxSize) return false;
    this.buffer.push(step);
    return true;
  }

  /**
   * Compute GAE advantages (matches ppo_agent.py compute_returns_and_advantages)
   * delta = r + gamma * V(s') - V(s)
   * GAE: A = delta + gamma * lambda * A(t+1)
   */
  computeGAE(lastValue: number): void {
    const n = this.buffer.length;
    this.advantages = new Array(n).fill(0);
    this.returns = new Array(n).fill(0);

    let lastGaeLam = 0;
    for (let step = n - 1; step >= 0; step--) {
      const nextNonTerminal = this.buffer[step].done ? 0 : 1;
      const nextValue = step === n - 1 ? lastValue : this.buffer[step + 1].value;

      const delta = this.buffer[step].reward + PPO_CONFIG.GAMMA * nextValue * nextNonTerminal - this.buffer[step].value;
      lastGaeLam = delta + PPO_CONFIG.GAMMA * PPO_CONFIG.GAE_LAMBDA * nextNonTerminal * lastGaeLam;
      this.advantages[step] = lastGaeLam;
    }

    // Returns = advantages + values
    for (let i = 0; i < n; i++) {
      this.returns[i] = this.advantages[i] + this.buffer[i].value;
    }
  }

  get size(): number { return this.buffer.length; }
  get isFull(): boolean { return this.buffer.length >= this.maxSize; }
  reset(): void { this.buffer = []; this.advantages = []; this.returns = []; }
}
