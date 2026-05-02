/**
 * ============================================================================
 * VERITAS FRONTIER — Jupiter V6 Execution Engine
 * ============================================================================
 * 
 * Prepares Jupiter V6 swap transactions (quote + route), but does NOT
 * execute them. The TEE signs and the frontend/agent submits.
 * 
 * Flow:
 *   1. getQuote()              → Fetches best route from Jupiter Quote API
 *   2. getSwapTransaction()    → Prepares serialized transaction
 *   3. buildVeritasTransaction() → Wraps into VeritasTransaction for security pipeline
 */

import {
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  Connection,
} from "@solana/web3.js";
import type { VeritasTransaction } from "./langgraph/state";

// ── Types ──────────────────────────────────────────────────────────────────

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: JupiterRoutePlan[];
  contextSlot: number;
  timeTaken: number;
}

interface JupiterRoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface JupiterSwapResponse {
  swapTransaction: string; // Base64 encoded serialized transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

export interface ExecutionPlan {
  quote: JupiterQuoteResponse;
  route: string; // Human-readable route description
  estimatedOutput: number;
  priceImpact: number;
  slippageBps: number;
}

// ── Known Token Mints ──────────────────────────────────────────────────────

export const TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
} as const;

const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";
const JUPITER_V6_PROGRAM = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

// ── Jupiter V6 Client ─────────────────────────────────────────────────────

export class JupiterV6Client {
  private useRealAPI: boolean;

  constructor(options?: { useRealAPI?: boolean }) {
    this.useRealAPI = options?.useRealAPI ?? false;
  }

  /**
   * Get a swap quote from Jupiter V6.
   * Falls back to mock data if API is unreachable or useRealAPI is false.
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amountLamports: number,
    slippageBps: number = 50
  ): Promise<JupiterQuoteResponse> {
    if (this.useRealAPI) {
      try {
        const params = new URLSearchParams({
          inputMint,
          outputMint,
          amount: amountLamports.toString(),
          slippageBps: slippageBps.toString(),
        });

        const res = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`, {
          headers: { "Accept": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Jupiter API returned ${res.status}`);
        }

        return await res.json() as JupiterQuoteResponse;
      } catch (err) {
        console.warn(`⚠️ [JUPITER] Real API failed, falling back to mock: ${err}`);
      }
    }

    // Mock fallback for offline demo
    return this.getMockQuote(inputMint, outputMint, amountLamports, slippageBps);
  }

  /**
   * Get a swap transaction from Jupiter V6.
   * Returns the serialized transaction ready for TEE signing.
   */
  async getSwapTransaction(
    quoteResponse: JupiterQuoteResponse,
    userPublicKey: string
  ): Promise<JupiterSwapResponse> {
    if (this.useRealAPI) {
      try {
        const res = await fetch(`${JUPITER_QUOTE_API}/swap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: "auto",
            asLegacyTransaction: true,
          }),
        });

        if (!res.ok) {
          throw new Error(`Jupiter Swap API returned ${res.status}`);
        }

        return await res.json() as JupiterSwapResponse;
      } catch (err) {
        console.warn(`⚠️ [JUPITER] Swap API failed, using mock: ${err}`);
      }
    }

    // Mock fallback
    return {
      swapTransaction: Buffer.from("mock-jupiter-swap-tx-" + Date.now()).toString("base64"),
      lastValidBlockHeight: 280_000_000 + Math.floor(Math.random() * 100_000),
      prioritizationFeeLamports: 5000,
    };
  }

  /**
   * Build a VeritasTransaction from a Jupiter swap for the security pipeline.
   */
  buildVeritasTransaction(
    quoteResponse: JupiterQuoteResponse,
    agentId: string,
    userPublicKey: PublicKey
  ): { transaction: VeritasTransaction; executionPlan: ExecutionPlan } {
    // Build mock instructions that represent the Jupiter swap
    const swapInstruction = new TransactionInstruction({
      programId: JUPITER_V6_PROGRAM,
      data: Buffer.from(JSON.stringify({
        discriminator: "shared_accounts_route",
        inAmount: quoteResponse.inAmount,
        outAmount: quoteResponse.outAmount,
        slippageBps: quoteResponse.slippageBps,
      })),
      keys: [
        { pubkey: userPublicKey, isSigner: true, isWritable: true },
        { pubkey: new PublicKey(quoteResponse.inputMint), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(quoteResponse.outputMint), isSigner: false, isWritable: false },
      ],
    });

    const outAmountNum = parseInt(quoteResponse.outAmount) / 1e6; // Assume 6 decimals
    const inAmountNum = parseInt(quoteResponse.inAmount) / 1e6;
    const routeDesc = quoteResponse.routePlan
      .map(r => r.swapInfo.label)
      .join(" → ") || "Jupiter V6 Direct";

    const transaction: VeritasTransaction = {
      instructions: [swapInstruction],
      signatures: [],
      feePayer: userPublicKey,
      estimatedValueUsd: inAmountNum,
      agentId,
    };

    const executionPlan: ExecutionPlan = {
      quote: quoteResponse,
      route: routeDesc,
      estimatedOutput: outAmountNum,
      priceImpact: parseFloat(quoteResponse.priceImpactPct || "0"),
      slippageBps: quoteResponse.slippageBps,
    };

    return { transaction, executionPlan };
  }

  // ── Mock Data ──────────────────────────────────────────────────────────

  private getMockQuote(
    inputMint: string,
    outputMint: string,
    amountLamports: number,
    slippageBps: number
  ): JupiterQuoteResponse {
    const inAmountHuman = amountLamports / 1e6;
    const mockPriceImpact = inAmountHuman > 10000 ? 0.05 : inAmountHuman > 1000 ? 0.01 : 0.001;
    const mockOutAmount = Math.round(amountLamports * (1 - mockPriceImpact));

    return {
      inputMint,
      inAmount: amountLamports.toString(),
      outputMint,
      outAmount: mockOutAmount.toString(),
      otherAmountThreshold: Math.round(mockOutAmount * (1 - slippageBps / 10000)).toString(),
      swapMode: "ExactIn",
      slippageBps,
      priceImpactPct: (mockPriceImpact * 100).toFixed(4),
      routePlan: [
        {
          swapInfo: {
            ammKey: "HJPjoWUrhoZzkNfRpHuieeFk9mkEFgHeYsr1FeHY7TWp",
            label: "Raydium",
            inputMint,
            outputMint,
            inAmount: amountLamports.toString(),
            outAmount: mockOutAmount.toString(),
            feeAmount: Math.round(amountLamports * 0.003).toString(),
            feeMint: inputMint,
          },
          percent: 100,
        }
      ],
      contextSlot: 280_000_000 + Math.floor(Math.random() * 100_000),
      timeTaken: 0.12,
    };
  }
}
