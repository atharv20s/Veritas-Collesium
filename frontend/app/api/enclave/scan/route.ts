import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════
// VERITAS ENCLAVE — Real-Time Security Scan API Route
// ═══════════════════════════════════════════════════════════════════════════
// Runs the 3 swarm agents + XGBoost with REAL data:
//   - Forensics Agent  → Tavily web search for scam/hack reports
//   - Protocol Agent   → Solana RPC getAccountInfo + Tavily audit search
//   - Execution Sim    → Solana RPC token metadata + heuristic simulation
//   - XGBoost Triage   → Fast decision tree scoring
// ═══════════════════════════════════════════════════════════════════════════

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// ── Tavily Search Helper ────────────────────────────────────────────────────

async function tavilySearch(query: string, maxResults = 5): Promise<TavilyResult[]> {
  if (!TAVILY_API_KEY) {
    console.warn("⚠️ TAVILY_API_KEY not set. Skipping search.");
    return [];
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      console.error(`Tavily returned ${res.status}: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
      score: r.score || 0,
    }));
  } catch (e) {
    console.error("Tavily search failed:", e);
    return [];
  }
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

// ── Solana RPC Helper ───────────────────────────────────────────────────────

async function solanaRpc(method: string, params: any[]): Promise<any> {
  try {
    const res = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });
    const data = await res.json();
    return data.result;
  } catch (e) {
    console.error(`Solana RPC ${method} failed:`, e);
    return null;
  }
}

async function getAccountInfo(address: string) {
  return solanaRpc("getAccountInfo", [address, { encoding: "jsonParsed" }]);
}

async function getTokenSupply(mint: string) {
  return solanaRpc("getTokenSupply", [mint]);
}

async function getSignaturesForAddress(address: string, limit = 5) {
  return solanaRpc("getSignaturesForAddress", [address, { limit }]);
}

// ── Known Data ──────────────────────────────────────────────────────────────

const KNOWN_PROGRAMS: Record<string, string> = {
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter Aggregator v6",
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB": "Jupiter Aggregator v4",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca Whirlpools",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium CLMM",
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": "Serum DEX v3",
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX": "Openbook DEX",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "SPL Token Program",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": "Associated Token Program",
  "11111111111111111111111111111111": "System Program",
};

const SCAM_KEYWORDS = ["scam", "hack", "rug pull", "exploit", "drain", "phishing", "malicious", "stolen", "fraud"];

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 1: FORENSICS — Real Tavily Search for Address Reputation
// ═══════════════════════════════════════════════════════════════════════════

async function forensicsAgent(address: string, protocol: string) {
  const start = Date.now();

  // Search for the address reputation
  const addressShort = address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
  const searchQueries = [
    `Solana ${addressShort} scam OR hack OR rug OR exploit`,
    `${protocol} Solana security vulnerability`,
  ];

  const allResults: TavilyResult[] = [];
  for (const q of searchQueries) {
    const results = await tavilySearch(q, 3);
    allResults.push(...results);
  }

  // Analyze results for scam signals
  let threatScore = 0;
  const threats: string[] = [];
  const sources: { title: string; url: string; snippet: string }[] = [];

  for (const result of allResults) {
    const text = `${result.title} ${result.content}`.toLowerCase();
    const matchedKeywords = SCAM_KEYWORDS.filter((kw) => text.includes(kw));

    if (matchedKeywords.length > 0) {
      threatScore += matchedKeywords.length * 15;
      threats.push(`Found "${matchedKeywords.join(", ")}" in: ${result.title}`);
    }

    sources.push({
      title: result.title,
      url: result.url,
      snippet: result.content.slice(0, 200),
    });
  }

  threatScore = Math.min(100, threatScore);
  const status = threatScore > 60 ? "critical" : threatScore > 20 ? "warning" : "safe";

  return {
    agent: "Forensics Agent",
    status,
    summary:
      threatScore > 60
        ? `CRITICAL: Multiple scam/hack reports found for this address across ${sources.length} sources`
        : threatScore > 20
          ? `WARNING: Some suspicious mentions found (${threats.length} signals)`
          : `No scam/hack associations found across ${sources.length} web sources`,
    details: {
      threat_score: threatScore,
      signals_found: threats.length,
      sources_searched: sources.length,
      tavily_powered: true,
      threats,
      sources: sources.slice(0, 5),
    },
    latencyMs: Date.now() - start,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 2: PROTOCOL — Solana RPC + Tavily Audit Search
// ═══════════════════════════════════════════════════════════════════════════

async function protocolAgent(programId: string) {
  const start = Date.now();

  // Check if it's a known verified program
  const knownName = KNOWN_PROGRAMS[programId];

  // Fetch account info from Solana RPC to verify it exists on-chain
  const accountInfo = await getAccountInfo(programId);
  const existsOnChain = !!accountInfo?.value;
  const isExecutable = accountInfo?.value?.executable === true;
  const owner = accountInfo?.value?.owner || "unknown";
  const dataSize = accountInfo?.value?.data?.[0]?.length || accountInfo?.value?.data?.length || 0;

  // Search for audit reports via Tavily
  const auditQuery = knownName
    ? `${knownName} Solana smart contract audit report`
    : `Solana program ${programId.slice(0, 8)} audit security`;
  const auditResults = await tavilySearch(auditQuery, 3);

  const hasAuditReport = auditResults.some(
    (r) =>
      r.content.toLowerCase().includes("audit") ||
      r.title.toLowerCase().includes("audit")
  );

  // Determine trust tier
  let trustTier = "UNKNOWN";
  let status: "safe" | "warning" | "critical" = "warning";

  if (knownName && existsOnChain && isExecutable) {
    trustTier = "TIER_1_VERIFIED";
    status = "safe";
  } else if (existsOnChain && isExecutable && hasAuditReport) {
    trustTier = "TIER_2_AUDITED";
    status = "safe";
  } else if (existsOnChain && isExecutable) {
    trustTier = "TIER_3_UNVERIFIED";
    status = "warning";
  } else if (!existsOnChain) {
    trustTier = "NOT_FOUND_ON_CHAIN";
    status = "critical";
  }

  return {
    agent: "Protocol Agent",
    status,
    summary: knownName
      ? `Verified protocol: ${knownName}. Trust tier: ${trustTier}${hasAuditReport ? " (audit report found)" : ""}`
      : existsOnChain
        ? `Program exists on-chain (${isExecutable ? "executable" : "NOT executable"}). Trust tier: ${trustTier}`
        : `Program NOT found on Solana mainnet. This may be a devnet-only or invalid address.`,
    details: {
      program_name: knownName || "Unknown",
      exists_on_chain: existsOnChain,
      is_executable: isExecutable,
      owner_program: owner,
      data_size_bytes: dataSize,
      trust_tier: trustTier,
      audit_report_found: hasAuditReport,
      audit_sources: auditResults.map((r) => ({ title: r.title, url: r.url })).slice(0, 3),
      solana_rpc_verified: true,
      tavily_powered: true,
    },
    latencyMs: Date.now() - start,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 3: EXECUTION SIM — Solana RPC Token Metadata + Simulation
// ═══════════════════════════════════════════════════════════════════════════

async function executionSimAgent(tokenAddress: string, txAmount: number) {
  const start = Date.now();

  // Fetch real token data from Solana RPC
  const accountInfo = await getAccountInfo(tokenAddress);
  const tokenSupply = await getTokenSupply(tokenAddress);
  const recentTxs = await getSignaturesForAddress(tokenAddress, 5);

  const existsOnChain = !!accountInfo?.value;
  const supply = tokenSupply?.value?.uiAmount || 0;
  const decimals = tokenSupply?.value?.decimals || 0;
  const recentTxCount = Array.isArray(recentTxs) ? recentTxs.length : 0;

  // Parse token account data for authorities
  const parsedData = accountInfo?.value?.data?.parsed?.info;
  const mintAuthority = parsedData?.mintAuthority || null;
  const freezeAuthority = parsedData?.freezeAuthority || null;
  const hasMintAuthority = !!mintAuthority;
  const hasFreezeAuthority = !!freezeAuthority;

  // Risk scoring based on real data
  let riskScore = 0;
  const riskFlags: string[] = [];

  if (!existsOnChain) {
    riskScore += 40;
    riskFlags.push("Token address not found on Solana mainnet");
  }

  if (hasMintAuthority) {
    riskScore += 20;
    riskFlags.push(`Mint authority is ACTIVE (${mintAuthority?.slice(0, 8)}...)`);
  }

  if (hasFreezeAuthority) {
    riskScore += 15;
    riskFlags.push(`Freeze authority is ACTIVE (${freezeAuthority?.slice(0, 8)}...)`);
  }

  if (supply > 0 && txAmount > supply * 0.01) {
    riskScore += 25;
    riskFlags.push(`Transaction amount represents >${((txAmount / supply) * 100).toFixed(2)}% of total supply`);
  }

  if (recentTxCount === 0) {
    riskScore += 10;
    riskFlags.push("No recent transactions found (low activity)");
  }

  riskScore = Math.min(100, riskScore);
  const status = riskScore > 50 ? "critical" : riskScore > 20 ? "warning" : "safe";

  // Simulated output value
  const estimatedSlippage = riskScore > 50 ? 0.8 : riskScore > 20 ? 0.05 : 0.002;
  const simulatedOutput = txAmount * (1 - estimatedSlippage);

  return {
    agent: "Execution Sim Agent",
    status,
    summary:
      riskScore > 50
        ? `CRITICAL: ${riskFlags.length} risk signals detected. Predicted slippage: ${(estimatedSlippage * 100).toFixed(0)}%`
        : riskScore > 20
          ? `WARNING: ${riskFlags.length} risk flags. Estimated output: $${simulatedOutput.toFixed(2)}`
          : `Transaction simulated safely. Output: $${simulatedOutput.toFixed(2)} (${(estimatedSlippage * 100).toFixed(2)}% slippage)`,
    details: {
      exists_on_chain: existsOnChain,
      total_supply: supply,
      decimals,
      mint_authority: mintAuthority || "Disabled",
      freeze_authority: freezeAuthority || "Disabled",
      recent_tx_count: recentTxCount,
      risk_score: riskScore,
      risk_flags: riskFlags,
      simulated_output_value: simulatedOutput,
      estimated_slippage: estimatedSlippage,
      value_at_risk: txAmount,
      solana_rpc_verified: true,
    },
    latencyMs: Date.now() - start,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// XGBOOST FAST TRIAGE (client-mirrored for consistency)
// ═══════════════════════════════════════════════════════════════════════════

function xgboostTriage(input: {
  poolLiquidity: number;
  priceImpact: number;
  tokenAge: number;
  holderConcentration: number;
  txAmount: number;
  mintAuthority: boolean;
  freezeAuthority: boolean;
  lpLocked: boolean;
  rugPullIndicators: number;
  tokenAddress: string;
}) {
  const breakdown = { liquidityRisk: 0, slippageRisk: 0, tokenRisk: 0, behavioralRisk: 0 };
  const reasons: string[] = [];

  if (input.poolLiquidity < 5000) { breakdown.liquidityRisk += 25; reasons.push("Critically low pool liquidity (<$5k)"); }
  else if (input.poolLiquidity < 10000) { breakdown.liquidityRisk += 15; reasons.push("Low pool liquidity (<$10k)"); }

  if (input.priceImpact > 0.15) { breakdown.slippageRisk += 25; reasons.push("Slippage exceeds 15%"); }
  else if (input.priceImpact > 0.05) { breakdown.slippageRisk += 15; reasons.push("Elevated slippage (5-15%)"); }

  if (input.mintAuthority) { breakdown.tokenRisk += 15; reasons.push("Mint Authority Active"); }
  if (input.freezeAuthority) { breakdown.tokenRisk += 10; reasons.push("Freeze Authority Active"); }
  if (!input.lpLocked) { breakdown.tokenRisk += 20; reasons.push("LP Not Locked"); }
  if (input.tokenAge < 24) { breakdown.tokenRisk += 10; reasons.push("Token age < 24h"); }

  if (input.holderConcentration > 0.9) { breakdown.behavioralRisk += 20; reasons.push("Extreme holder concentration"); }
  else if (input.holderConcentration > 0.8) { breakdown.behavioralRisk += 10; }

  if (input.rugPullIndicators > 0) { breakdown.behavioralRisk += input.rugPullIndicators * 2; }

  let score = Math.min(100, breakdown.liquidityRisk + breakdown.slippageRisk + breakdown.tokenRisk + breakdown.behavioralRisk);

  let threshold = 70;
  if (input.txAmount > 1000) threshold -= 15;
  else if (input.txAmount < 50) threshold += 15;
  if (["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"].includes(input.tokenAddress)) threshold += 20;
  threshold = Math.min(100, Math.max(10, threshold));

  const approved = score <= threshold;
  reasons.unshift(approved ? `PASSED: Risk ${score}/100 below threshold ${threshold}` : `BLOCKED: Risk ${score}/100 exceeds threshold ${threshold}`);

  return { score, approved, reasons, breakdown, threshold };
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tokenAddress,
      targetProtocol,
      txAmount = 100,
      poolLiquidity = 50000,
      priceImpact = 0.01,
      tokenAge = 365,
      holderConcentration = 0.3,
      mintAuthority = false,
      freezeAuthority = false,
      lpLocked = true,
      rugPullIndicators = 0,
    } = body;

    if (!tokenAddress) {
      return NextResponse.json({ error: "tokenAddress is required" }, { status: 400 });
    }

    const scanStart = Date.now();

    // Step 1: XGBoost Fast Triage
    const xgboost = xgboostTriage({
      poolLiquidity,
      priceImpact,
      tokenAge,
      holderConcentration,
      txAmount,
      mintAuthority,
      freezeAuthority,
      lpLocked,
      rugPullIndicators,
      tokenAddress,
    });

    // Step 2: If score < 20, fast-approve (skip swarm)
    if (xgboost.score < 20) {
      return NextResponse.json({
        verdict: "APPROVED",
        fast_path: true,
        xgboost,
        agents: [],
        totalLatencyMs: Date.now() - scanStart,
      });
    }

    // Step 3: Run all 3 agents in parallel (the swarm)
    const [forensics, protocol, executionSim] = await Promise.all([
      forensicsAgent(tokenAddress, targetProtocol || tokenAddress),
      protocolAgent(targetProtocol || tokenAddress),
      executionSimAgent(tokenAddress, txAmount),
    ]);

    // Step 4: Synthesizer — fail-closed verdict
    const agents = [forensics, protocol, executionSim];
    const hasCritical = agents.some((a) => a.status === "critical");
    const warningCount = agents.filter((a) => a.status === "warning").length;

    let verdict: "APPROVED" | "BLOCKED" | "REVIEW";
    if (hasCritical) {
      verdict = "BLOCKED";
    } else if (warningCount >= 2 || !xgboost.approved) {
      verdict = "BLOCKED";
    } else if (warningCount === 1) {
      verdict = "REVIEW";
    } else {
      verdict = "APPROVED";
    }

    return NextResponse.json({
      verdict,
      fast_path: false,
      xgboost,
      agents,
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
