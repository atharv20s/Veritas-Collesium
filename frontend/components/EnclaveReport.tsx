"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/lib/supabase";
import {
  Shield, Cpu, Activity, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Search, Zap, Globe, Server,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface AgentFinding {
  agent: string;
  status: "safe" | "warning" | "critical";
  summary: string;
  details: Record<string, unknown>;
  latencyMs: number;
}

interface XGBoostResult {
  score: number;
  approved: boolean;
  reasons: string[];
  threshold: number;
  breakdown: {
    liquidityRisk: number;
    slippageRisk: number;
    tokenRisk: number;
    behavioralRisk: number;
  };
}

interface ScanResponse {
  verdict: "APPROVED" | "BLOCKED" | "REVIEW";
  fast_path: boolean;
  xgboost: XGBoostResult;
  agents: AgentFinding[];
  totalLatencyMs: number;
  error?: string;
}

// ── Preset Addresses (Real Solana mainnet) ──────────────────────────────────

const PRESETS = [
  {
    label: "USDC (Stablecoin)",
    tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    targetProtocol: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    txAmount: 100,
    poolLiquidity: 5000000,
    priceImpact: 0.001,
    tokenAge: 1500,
    holderConcentration: 0.05,
    lpLocked: true,
  },
  {
    label: "SOL (Native)",
    tokenAddress: "So11111111111111111111111111111111111111112",
    targetProtocol: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    txAmount: 500,
    poolLiquidity: 2000000,
    priceImpact: 0.003,
    tokenAge: 2000,
    holderConcentration: 0.1,
    lpLocked: true,
  },
  {
    label: "Suspicious Address",
    tokenAddress: "RUGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    targetProtocol: "UnknownDEXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    txAmount: 2000,
    poolLiquidity: 500,
    priceImpact: 0.4,
    tokenAge: 2,
    holderConcentration: 0.95,
    lpLocked: false,
  },
];

// ── Agent Icons ─────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<string, typeof Shield> = {
  "Forensics Agent": Search,
  "Protocol Agent": Server,
  "Execution Sim Agent": Activity,
};

const STATUS_CONFIG = {
  safe: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: CheckCircle2, label: "SAFE" },
  warning: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertTriangle, label: "WARNING" },
  critical: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle, label: "CRITICAL" },
};

const VERDICT_CONFIG = {
  APPROVED: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", label: "APPROVED" },
  BLOCKED: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "BLOCKED" },
  REVIEW: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "MANUAL REVIEW" },
};

// ── Main Component ──────────────────────────────────────────────────────────

export default function EnclaveReport() {
  const [tokenAddress, setTokenAddress] = useState(PRESETS[0].tokenAddress);
  const [targetProtocol, setTargetProtocol] = useState(PRESETS[0].targetProtocol);
  const [txAmount, setTxAmount] = useState(PRESETS[0].txAmount);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || "guest";

  const applyPreset = (idx: number) => {
    const p = PRESETS[idx];
    setTokenAddress(p.tokenAddress);
    setTargetProtocol(p.targetProtocol);
    setTxAmount(p.txAmount);
    setResult(null);
    setError(null);
  };

  const runScan = async () => {
    if (!tokenAddress.trim()) return;
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const preset = PRESETS.find((p) => p.tokenAddress === tokenAddress);
      const body = {
        tokenAddress: tokenAddress.trim(),
        targetProtocol: targetProtocol.trim() || tokenAddress.trim(),
        txAmount,
        poolLiquidity: preset?.poolLiquidity ?? 50000,
        priceImpact: preset?.priceImpact ?? 0.02,
        tokenAge: preset?.tokenAge ?? 365,
        holderConcentration: preset?.holderConcentration ?? 0.3,
        mintAuthority: false,
        freezeAuthority: false,
        lpLocked: preset?.lpLocked ?? true,
        rugPullIndicators: 0,
      };

      const res = await fetch("/api/enclave/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed");
      } else {
        setResult(data);

        // Async log to Supabase (fire and forget to not block UI)
        if (data && supabase) {
          (async () => {
            try {
              const { data: scanData } = await supabase.from('scan_history').insert([{
                wallet_address: walletAddress,
                token_address: tokenAddress.trim(),
                target_protocol: targetProtocol.trim() || tokenAddress.trim(),
                tx_amount: txAmount,
                verdict: data.verdict,
                fast_path: data.fast_path,
                xgboost_score: data.xgboost.score,
                total_latency_ms: data.totalLatencyMs
              }]).select();
              
              if (scanData && scanData[0] && data.agents && data.agents.length > 0) {
                const agentInserts = data.agents.map((a: any) => ({
                  scan_id: scanData[0].id,
                  agent_name: a.agent,
                  status: a.status,
                  summary: a.summary,
                  latency_ms: a.latencyMs,
                  findings: a.details
                }));
                await supabase.from('agent_reports').insert(agentInserts);
              }
            } catch (err) {
              console.error("Failed to log scan to Supabase:", err);
            }
          })();
        }
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[900px] mx-auto pb-8">
      {/* Input Section */}
      <div className="backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
            Veritas Security Enclave
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-green-400/60" />
            <span className="text-[10px] text-green-400/60 font-mono">LIVE — Tavily + Solana RPC</span>
          </div>
        </div>

        {/* Presets */}
        <div className="text-[11px] text-white/25 uppercase tracking-wider mb-2">Quick Presets</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(idx)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tokenAddress === p.tokenAddress
                  ? "bg-white text-black"
                  : "bg-white/[0.05] text-white/40 hover:text-white/60"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Address Inputs */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[11px] text-white/25 uppercase tracking-wider mb-1 block">
              Token / Mint Address
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="Paste any Solana token mint address..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white/90 font-mono placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/15 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/25 uppercase tracking-wider mb-1 block">
                Target Protocol / DEX
              </label>
              <input
                type="text"
                value={targetProtocol}
                onChange={(e) => setTargetProtocol(e.target.value)}
                placeholder="Program ID..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white/90 font-mono placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/15 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/25 uppercase tracking-wider mb-1 block">
                Transaction Amount (USD)
              </label>
              <input
                type="number"
                value={txAmount}
                onChange={(e) => setTxAmount(Number(e.target.value))}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white/90 font-mono placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/15 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Run Button */}
        <motion.button
          onClick={runScan}
          disabled={isRunning || !tokenAddress.trim()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            isRunning || !tokenAddress.trim()
              ? "bg-white/[0.05] text-white/30 cursor-not-allowed"
              : "bg-white text-black shadow-lg shadow-white/10"
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning with Tavily + Solana RPC...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Live Security Scan
            </>
          )}
        </motion.button>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-red-500/10 border-red-500/20 p-4"
        >
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <XCircle className="w-4 h-4" />
            {error}
          </div>
        </motion.div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Verdict Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl border p-5 text-center ${VERDICT_CONFIG[result.verdict].bg}`}
          >
            <div className={`text-3xl font-bold font-mono ${VERDICT_CONFIG[result.verdict].color}`}>
              {VERDICT_CONFIG[result.verdict].label}
            </div>
            <div className="text-xs text-white/40 mt-1">
              {result.fast_path
                ? "XGBoost fast-path approved — no swarm needed"
                : `Full swarm analysis complete in ${result.totalLatencyMs}ms`}
            </div>
            {result.fast_path && (
              <div className="text-[10px] text-green-400/50 mt-1 font-mono">
                XGBoost Score: {result.xgboost.score}/100 (threshold: {result.xgboost.threshold})
              </div>
            )}
          </motion.div>

          {/* XGBoost Triage */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  XGBoost Fast Triage
                </span>
              </div>
              <span className={`text-xs font-mono font-bold ${result.xgboost.approved ? "text-green-400" : "text-red-400"}`}>
                {result.xgboost.score}/100
              </span>
            </div>

            {/* Score bar */}
            <div className="mb-4">
              <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.xgboost.score}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    result.xgboost.score > 70 ? "bg-red-400" : result.xgboost.score > 40 ? "bg-yellow-400" : "bg-green-400"
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] mt-1">
                <span className="text-white/20">0 (Safe)</span>
                <span className="text-white/20 font-mono">Threshold: {result.xgboost.threshold}</span>
                <span className="text-white/20">100 (Critical)</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {Object.entries(result.xgboost.breakdown).map(([key, value]) => (
                <div key={key} className="bg-white/[0.02] rounded-lg p-3 text-center">
                  <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">
                    {key.replace("Risk", "")}
                  </div>
                  <div className={`text-lg font-mono font-bold ${
                    value > 15 ? "text-red-400" : value > 5 ? "text-yellow-400" : "text-green-400"
                  }`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Reasons */}
            <div className="space-y-1">
              {result.xgboost.reasons.map((reason, i) => (
                <div key={i} className={`text-xs leading-relaxed ${
                  i === 0 ? (result.xgboost.approved ? "text-green-400/80" : "text-red-400/80") : "text-white/30"
                }`}>
                  {reason}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Agent Findings */}
          {result.agents.map((agent, idx) => {
            const config = STATUS_CONFIG[agent.status];
            const StatusIcon = config.icon;
            const AgentIcon = AGENT_ICONS[agent.agent] || Shield;
            const details = agent.details || {};

            return (
              <motion.div
                key={agent.agent}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.15 }}
                className={`backdrop-blur-2xl bg-white/[0.03] rounded-2xl border overflow-hidden ${config.border}`}
              >
                {/* Agent Header */}
                <div className={`flex items-center justify-between px-5 py-3 ${config.bg} border-b ${config.border}`}>
                  <div className="flex items-center gap-2">
                    <AgentIcon className={`w-4 h-4 ${config.color}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                      {agent.agent}
                    </span>
                    {(details.tavily_powered || details.solana_rpc_verified) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400/70 border border-blue-500/20 font-mono">
                        {details.tavily_powered ? "TAVILY" : ""}{details.tavily_powered && details.solana_rpc_verified ? " + " : ""}{details.solana_rpc_verified ? "RPC" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
                    <span className={`text-[10px] font-medium uppercase ${config.color}`}>{config.label}</span>
                    <span className="text-[10px] font-mono text-white/20">{agent.latencyMs}ms</span>
                  </div>
                </div>

                {/* Agent Body */}
                <div className="px-5 py-4">
                  <p className="text-sm text-white/70 leading-relaxed mb-3">{agent.summary}</p>

                  {/* Key-Value Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {Object.entries(details)
                      .filter(([key]) => !["threats", "sources", "audit_sources", "risk_flags", "tavily_powered", "solana_rpc_verified"].includes(key))
                      .slice(0, 10)
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs py-1 px-2 rounded bg-white/[0.02]">
                          <span className="text-white/25">{key.replace(/_/g, " ")}</span>
                          <span className={`font-mono text-right max-w-[50%] truncate ${
                            typeof value === "boolean"
                              ? value ? "text-red-400" : "text-green-400"
                              : typeof value === "number" && value > 50
                                ? "text-red-400"
                                : "text-white/50"
                          }`}>
                            {typeof value === "boolean" ? (value ? "YES" : "NO") : String(value)}
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* Risk Flags */}
                  {Array.isArray(details.risk_flags) && (details.risk_flags as string[]).length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-red-500/[0.05] border border-red-500/10">
                      <div className="text-[10px] text-red-400/60 uppercase tracking-wider mb-1.5 font-medium">
                        Risk Flags
                      </div>
                      {(details.risk_flags as string[]).map((flag, i) => (
                        <div key={i} className="text-xs text-red-400/70 flex items-start gap-1.5 mb-1">
                          <span className="mt-1 w-1 h-1 rounded-full bg-red-400/50 shrink-0" />
                          {flag}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Threats (Forensics) */}
                  {Array.isArray(details.threats) && (details.threats as string[]).length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-orange-500/[0.05] border border-orange-500/10">
                      <div className="text-[10px] text-orange-400/60 uppercase tracking-wider mb-1.5 font-medium">
                        Threat Signals
                      </div>
                      {(details.threats as string[]).map((threat, i) => (
                        <div key={i} className="text-xs text-orange-400/70 flex items-start gap-1.5 mb-1">
                          <span className="mt-1 w-1 h-1 rounded-full bg-orange-400/50 shrink-0" />
                          {threat}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sources (Forensics / Protocol) */}
                  {Array.isArray(details.sources) && (details.sources as any[]).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[10px] text-white/25 uppercase tracking-wider">
                        Web Sources ({(details.sources as any[]).length})
                      </div>
                      {(details.sources as any[]).slice(0, 4).map((src: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors font-medium"
                          >
                            {src.title}
                          </a>
                          {src.snippet && (
                            <p className="text-[11px] text-white/25 mt-0.5 line-clamp-2">{src.snippet}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Audit Sources (Protocol) */}
                  {Array.isArray(details.audit_sources) && (details.audit_sources as any[]).length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] text-white/25 uppercase tracking-wider">
                        Audit References
                      </div>
                      {(details.audit_sources as any[]).map((src: any, i: number) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-400/60 hover:text-blue-400 transition-colors truncate"
                        >
                          {src.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Total Latency */}
          <div className="text-center text-[11px] text-white/20 font-mono">
            Total scan: {result.totalLatencyMs}ms | {result.agents.length} agents | {result.fast_path ? "Fast path" : "Full swarm"}
          </div>
        </>
      )}
    </div>
  );
}
