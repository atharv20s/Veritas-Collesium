import { NextRequest, NextResponse } from "next/server";
import { executeLangGuard } from "@/../../engine/sentinel_brain";
import { JupiterV6Client } from "@/../../engine/execution_engine";
import { PublicKey } from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════════════
// VERITAS ENCLAVE — Frontier v2.6 Security Pipeline
// ═══════════════════════════════════════════════════════════════════════════

const jupiterClient = new JupiterV6Client({ useRealAPI: true });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tokenAddress,
      targetProtocol,
      txAmount = 100,
      agentId = "unknown-agent",
      userPublicKey = "11111111111111111111111111111111", // Default to system program if none provided
    } = body;

    if (!tokenAddress) {
      return NextResponse.json({ error: "tokenAddress is required" }, { status: 400 });
    }

    const scanStart = Date.now();

    // ── 1. Execution Engine: Build the Transaction ──────────────────────────
    // Simulate fetching a quote from Jupiter for the requested token swap
    // (Assuming tokenAddress is the output mint, and USDC is the input mint for simplicity)
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const quote = await jupiterClient.getQuote(
        USDC_MINT, 
        tokenAddress, 
        Math.floor(txAmount * 1e6) // convert USDC to lamports
    );

    const { transaction, executionPlan } = jupiterClient.buildVeritasTransaction(
        quote, 
        agentId, 
        new PublicKey(userPublicKey)
    );

    // ── 2. Veritas Pipeline: Execute the State Machine ──────────────────────
    const finalState = await executeLangGuard(transaction);

    // ── 3. Swap Transaction (If Approved) ──────────────────────────────────
    let swapTransaction: string | null = null;
    if (finalState.final_status === "APPROVED") {
      try {
        const swapRes = await jupiterClient.getSwapTransaction(quote, userPublicKey);
        swapTransaction = swapRes.swapTransaction;
      } catch (err) {
        console.warn("Could not fetch swap transaction:", err);
      }
    }

    // ── 4. Response Formatting ─────────────────────────────────────────────
    return NextResponse.json({
      verdict: finalState.final_status,
      reason: finalState.final_verdict_reason,
      gdp_metrics: finalState.gdp_metrics,
      ace_rejection: finalState.ace_rejection_details,
      executionPlan,
      swapTransaction,
      swarm_findings: {
        forensics: finalState.forensics_findings,
        protocol: finalState.protocol_findings,
        simulation: finalState.simulation_findings,
      },
      loop_count: finalState.loop_count,
      totalLatencyMs: Date.now() - scanStart,
    });
  } catch (e: any) {
    console.error("Enclave scan error:", e);
    return NextResponse.json(
      { error: e.message || "Internal scan error" },
      { status: 500 }
    );
  }
}
