/**
 * ============================================================================
 * TD3 (Twin Delayed DDPG) — Ported from atharv20s/td3ndsac
 * ============================================================================
 * 
 * Faithfully mirrors the PyTorch architecture from TD3/td3_agent.py:
 *   Actor:  fc1(state_dim, 256) → ReLU → fc2(256, 256) → ReLU → out(256, 1) → tanh
 *   Critic: Twin Q-networks: (state_dim + action_dim) → 256 → 256 → 1
 *
 * Hyperparameters (from td3_config.py):
 *   ACTOR_LR = 1e-4    (reduced from 3e-4 to prevent overshooting)
 *   CRITIC_LR = 3e-4
 *   GAMMA = 0.99
 *   TAU = 0.005         (conservative soft update)
 *   POLICY_NOISE = 0.1  (reduced from 0.2 — smoother exploration)
 *   NOISE_CLIP = 0.3    (reduced from 0.5 — limit extreme actions)
 *   POLICY_FREQ = 3     (delay actor updates more than vanilla TD3)
 *   BATCH_SIZE = 256
 *   BUFFER_SIZE = 200_000
 *   WARMUP_STEPS = 1_000
 *   GRADIENT CLIP: actor=0.3, critic=0.5
 * 
 * Original context: Microgrid energy management (continuous action space)
 * Adapted for: DeFi transaction risk scoring (state → risk action)
 */

// ─── Config (exact match to td3_config.py) ──────────────────────────────────

export const TD3_CONFIG = {
  HIDDEN_DIM: 256,
  ACTOR_LR: 1e-4,
  CRITIC_LR: 3e-4,
  GAMMA: 0.99,
  TAU: 0.005,
  POLICY_NOISE: 0.1,
  NOISE_CLIP: 0.3,
  POLICY_FREQ: 3,
  ACTION_NOISE: 0.05,
  BATCH_SIZE: 256,
  BUFFER_SIZE: 200_000,
  WARMUP_STEPS: 1_000,
  GRADIENT_STEPS: 1,
  ACTOR_GRAD_CLIP: 0.3,
  CRITIC_GRAD_CLIP: 0.5,
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
    // Xavier uniform initialization (matches PyTorch default)
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

// ─── Activation Functions ───────────────────────────────────────────────────

function relu(x: number[]): number[] {
  return x.map(v => Math.max(0, v));
}

function tanh(x: number[]): number[] {
  return x.map(v => Math.tanh(v));
}

// ─── TD3 Actor ──────────────────────────────────────────────────────────────
// Mirrors: Actor(state_dim, action_dim=1, hidden_dim=256)
//   fc1 → ReLU → fc2 → ReLU → out → tanh

export class TD3Actor {
  fc1: Linear;
  fc2: Linear;
  out: Linear;

  constructor(stateDim: number = 14, actionDim: number = 1, hiddenDim: number = TD3_CONFIG.HIDDEN_DIM) {
    this.fc1 = new Linear(stateDim, hiddenDim);
    this.fc2 = new Linear(hiddenDim, hiddenDim);
    this.out = new Linear(hiddenDim, actionDim);
  }

  forward(state: number[]): number[] {
    let x = relu(this.fc1.forward(state));
    x = relu(this.fc2.forward(x));
    return tanh(this.out.forward(x));
  }

  /** Map actor output from [-1, 1] → risk score [0, 100] */
  predict(state: number[]): number {
    const action = this.forward(state);
    return (action[0] + 1) * 50; // [-1,1] → [0,100]
  }

  loadWeights(w: { fc1: { weights: number[][]; biases: number[] }; fc2: { weights: number[][]; biases: number[] }; out: { weights: number[][]; biases: number[] } }): void {
    this.fc1.loadWeights(w.fc1.weights, w.fc1.biases);
    this.fc2.loadWeights(w.fc2.weights, w.fc2.biases);
    this.out.loadWeights(w.out.weights, w.out.biases);
  }
}

// ─── TD3 Critic (Twin Q-Networks) ───────────────────────────────────────────
// Mirrors: Critic(state_dim, action_dim=1, hidden_dim=256)
//   Q1: (state+action) → 256 → 256 → 1
//   Q2: (state+action) → 256 → 256 → 1

export class TD3Critic {
  q1_fc1: Linear; q1_fc2: Linear; q1_out: Linear;
  q2_fc1: Linear; q2_fc2: Linear; q2_out: Linear;

  constructor(stateDim: number = 14, actionDim: number = 1, hiddenDim: number = TD3_CONFIG.HIDDEN_DIM) {
    const inputDim = stateDim + actionDim;
    this.q1_fc1 = new Linear(inputDim, hiddenDim);
    this.q1_fc2 = new Linear(hiddenDim, hiddenDim);
    this.q1_out = new Linear(hiddenDim, 1);
    this.q2_fc1 = new Linear(inputDim, hiddenDim);
    this.q2_fc2 = new Linear(hiddenDim, hiddenDim);
    this.q2_out = new Linear(hiddenDim, 1);
  }

  forward(state: number[], action: number[]): [number, number] {
    const xu = [...state, ...action];
    let q1 = relu(this.q1_fc1.forward(xu));
    q1 = relu(this.q1_fc2.forward(q1));
    const q1_val = this.q1_out.forward(q1)[0];

    let q2 = relu(this.q2_fc1.forward(xu));
    q2 = relu(this.q2_fc2.forward(q2));
    const q2_val = this.q2_out.forward(q2)[0];

    return [q1_val, q2_val];
  }

  /** Return min(Q1, Q2) for conservative estimation */
  q_min(state: number[], action: number[]): number {
    const [q1, q2] = this.forward(state, action);
    return Math.min(q1, q2);
  }
}

// ─── Replay Buffer ──────────────────────────────────────────────────────────
// Mirrors: ReplayBuffer(state_dim, action_dim, max_size=200000)

export interface Experience {
  state: number[];
  action: number[];
  reward: number;
  nextState: number[];
  done: boolean;
}

export class ReplayBuffer {
  private buffer: Experience[] = [];
  private ptr: number = 0;
  private maxSize: number;

  constructor(maxSize: number = TD3_CONFIG.BUFFER_SIZE) {
    this.maxSize = maxSize;
  }

  add(exp: Experience): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(exp);
    } else {
      this.buffer[this.ptr] = exp;
    }
    this.ptr = (this.ptr + 1) % this.maxSize;
  }

  sample(batchSize: number): Experience[] {
    const batch: Experience[] = [];
    for (let i = 0; i < batchSize; i++) {
      batch.push(this.buffer[Math.floor(Math.random() * this.buffer.length)]);
    }
    return batch;
  }

  get size(): number { return this.buffer.length; }
  get isReady(): boolean { return this.buffer.length >= TD3_CONFIG.WARMUP_STEPS; }
}
