/**
 * ============================================================================
 * SAC (Soft Actor-Critic) — Ported from atharv20s/td3ndsac
 * ============================================================================
 * 
 * Faithfully mirrors SAC/sac_agent.py:
 *   Actor (Gaussian):  fc1(state, 256) → ReLU → fc2(256, 256) → ReLU → [mean_head, log_std_head]
 *   Critic (Twin Q):   (state+action) → 256 → 256 → 1 (× 2)
 * 
 * KEY DIFFERENCE from TD3: Stochastic policy with entropy maximization
 *   - Reparameterization trick for gradient flow
 *   - Automatic entropy tuning (auto_alpha)
 *   - log_std clamped to [-20, 2]
 *   - No delayed policy updates (unlike TD3)
 * 
 * Hyperparameters (from sac_config.py):
 *   ACTOR_LR = 3e-4
 *   CRITIC_LR = 3e-4
 *   ALPHA_LR = 3e-4
 *   GAMMA = 0.99
 *   TAU = 0.005
 *   INITIAL_ALPHA = 0.2
 *   AUTO_ENTROPY = true
 *   TARGET_ENTROPY = -ACTION_DIM
 *   HIDDEN_DIM = 256
 *   BATCH_SIZE = 256
 *   BUFFER_SIZE = 300_000
 */

export const SAC_CONFIG = {
  HIDDEN_DIM: 256,
  ACTOR_LR: 3e-4,
  CRITIC_LR: 3e-4,
  ALPHA_LR: 3e-4,
  GAMMA: 0.99,
  TAU: 0.005,
  INITIAL_ALPHA: 0.2,
  AUTO_ENTROPY: true,
  LOG_STD_MIN: -20,
  LOG_STD_MAX: 2,
  BATCH_SIZE: 256,
  BUFFER_SIZE: 300_000,
  WARMUP_STEPS: 1_000,
} as const;

// ─── Linear Layer ───────────────────────────────────────────────────────────

class Linear {
  weights: number[][];
  biases: number[];
  inDim: number;
  outDim: number;

  constructor(inDim: number, outDim: number) {
    this.inDim = inDim;
    this.outDim = outDim;
    const scale = Math.sqrt(2.0 / (inDim + outDim));
    this.weights = Array.from({ length: outDim }, () =>
      Array.from({ length: inDim }, () => (Math.random() * 2 - 1) * scale)
    );
    this.biases = new Array(outDim).fill(0);
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

function relu(x: number[]): number[] { return x.map(v => Math.max(0, v)); }
function clamp(x: number, min: number, max: number): number { return Math.max(min, Math.min(max, x)); }

// ─── Box-Muller Transform (Gaussian sampling) ──────────────────────────────

function sampleGaussian(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// ─── SAC Gaussian Actor ─────────────────────────────────────────────────────
// Mirrors: Actor(state_dim, action_dim, hidden_dim=256, log_std_min=-20, log_std_max=2)
// Outputs mean AND log_std (stochastic policy)

export class SACGaussianActor {
  fc1: Linear;
  fc2: Linear;
  meanHead: Linear;
  logStdHead: Linear;

  constructor(
    stateDim: number = 14,
    actionDim: number = 1,
    hiddenDim: number = SAC_CONFIG.HIDDEN_DIM
  ) {
    this.fc1 = new Linear(stateDim, hiddenDim);
    this.fc2 = new Linear(hiddenDim, hiddenDim);
    this.meanHead = new Linear(hiddenDim, actionDim);
    this.logStdHead = new Linear(hiddenDim, actionDim);
  }

  /** Forward pass → (mean, log_std) */
  forward(state: number[]): { mean: number[]; logStd: number[] } {
    let x = relu(this.fc1.forward(state));
    x = relu(this.fc2.forward(x));

    const mean = this.meanHead.forward(x);
    const logStdRaw = this.logStdHead.forward(x);
    const logStd = logStdRaw.map(v => clamp(v, SAC_CONFIG.LOG_STD_MIN, SAC_CONFIG.LOG_STD_MAX));

    return { mean, logStd };
  }

  /** 
   * Sample action with reparameterization trick (matches sac_agent.py Actor.sample)
   * Returns: { action (tanh squashed), logProb }
   */
  sample(state: number[]): { action: number[]; logProb: number } {
    const { mean, logStd } = this.forward(state);
    const std = logStd.map(v => Math.exp(v));

    // Reparameterization: x_t = mean + std * epsilon
    const x_t = mean.map((m, i) => sampleGaussian(m, std[i]));

    // Tanh squashing: action = tanh(x_t)
    const action = x_t.map(v => Math.tanh(v));

    // Log probability with tanh correction:
    // log_prob = sum(log_p(x_t)) - sum(log(1 - tanh(x_t)^2))
    let logProb = 0;
    for (let i = 0; i < x_t.length; i++) {
      const variance = std[i] * std[i];
      const diff = x_t[i] - mean[i];
      logProb += -0.5 * (diff * diff / variance + Math.log(2 * Math.PI * variance));
      logProb -= Math.log(1 - action[i] * action[i] + 1e-6);
    }

    return { action, logProb };
  }

  /** Deterministic action (for evaluation) */
  getAction(state: number[], deterministic: boolean = false): number[] {
    const { mean, logStd } = this.forward(state);

    if (deterministic) {
      return mean.map(v => Math.tanh(v));
    }

    const std = logStd.map(v => Math.exp(v));
    const x_t = mean.map((m, i) => sampleGaussian(m, std[i]));
    return x_t.map(v => Math.tanh(v));
  }

  /** Map action from [-1, 1] → risk score [0, 100] */
  predict(state: number[]): number {
    const action = this.getAction(state, true);
    return (action[0] + 1) * 50;
  }
}

// ─── SAC Critic (same structure as TD3 — twin Q-networks) ───────────────────

export class SACCritic {
  q1_fc1: Linear; q1_fc2: Linear; q1_out: Linear;
  q2_fc1: Linear; q2_fc2: Linear; q2_out: Linear;

  constructor(stateDim: number = 14, actionDim: number = 1, hiddenDim: number = SAC_CONFIG.HIDDEN_DIM) {
    const inputDim = stateDim + actionDim;
    this.q1_fc1 = new Linear(inputDim, hiddenDim);
    this.q1_fc2 = new Linear(hiddenDim, hiddenDim);
    this.q1_out = new Linear(hiddenDim, 1);
    this.q2_fc1 = new Linear(inputDim, hiddenDim);
    this.q2_fc2 = new Linear(hiddenDim, hiddenDim);
    this.q2_out = new Linear(hiddenDim, 1);
  }

  forward(state: number[], action: number[]): [number, number] {
    const x = [...state, ...action];
    let q1 = relu(this.q1_fc1.forward(x));
    q1 = relu(this.q1_fc2.forward(q1));
    const q1_val = this.q1_out.forward(q1)[0];
    let q2 = relu(this.q2_fc1.forward(x));
    q2 = relu(this.q2_fc2.forward(q2));
    const q2_val = this.q2_out.forward(q2)[0];
    return [q1_val, q2_val];
  }

  q_min(state: number[], action: number[]): number {
    const [q1, q2] = this.forward(state, action);
    return Math.min(q1, q2);
  }
}

// ─── Entropy Temperature ────────────────────────────────────────────────────

export class EntropyTemperature {
  logAlpha: number;
  targetEntropy: number;
  lr: number;

  constructor(actionDim: number = 1) {
    this.logAlpha = 0; // log(1.0)
    this.targetEntropy = -actionDim;
    this.lr = SAC_CONFIG.ALPHA_LR;
  }

  get alpha(): number {
    return Math.exp(this.logAlpha);
  }

  /** 
   * Approximate alpha update step
   * In PyTorch: alpha_loss = -(log_alpha * (log_probs + target_entropy).detach()).mean()
   */
  update(logProb: number): void {
    const alphaLoss = -this.logAlpha * (logProb + this.targetEntropy);
    this.logAlpha -= this.lr * alphaLoss;
    // Clamp to prevent explosion
    this.logAlpha = clamp(this.logAlpha, -5, 2);
  }
}
