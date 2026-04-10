"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVeritasStore } from "@/lib/store";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { ParticleCanvas } from "@/components/ui/particle-canvas";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

import HumanHandoff from "@/components/HumanHandoff";
import FinalReport from "@/components/FinalReport";
import ClaimCards from "@/components/ClaimCards";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import ForensicTimeline from "@/components/ForensicTimeline";
import VerdictCard from "@/components/VerdictCard";
import QAAnswer from "@/components/QAAnswer";
import EnclaveReport from "@/components/EnclaveReport";
import { InvestigationHero } from "@/components/ui/investigation-hero";
import { usePersistentMode } from "@/components/ModeToggle";
import { Home, Loader2, Shield } from "lucide-react";

const EXPERT_TABS = ["feed", "report", "claims", "graph", "timeline", "enclave"] as const;
type ExpertTab = (typeof EXPERT_TABS)[number];

export default function Page() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();

  const {
    isInvestigating, report, claims, entityNodes, entityEdges,
    timelineEvents, allEvents, truthScore, riskLevel,
    sourcesCrawled, claimsFound, conflictsCount,
    qaMode, qaLoading, qaResponse,
  } = useVeritasStore();

  const [reportMode, setReportMode] = usePersistentMode();
  const [expertTab, setExpertTab] = useState<ExpertTab>("report");

  const isIdle = !isInvestigating && allEvents.length === 0 && !qaMode;
  const isActive = isInvestigating;

  // Wallet-aware header menu
  const WalletMenu = () => (
    <div className="flex items-center gap-2">
      <WalletMultiButton
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.7)",
          fontWeight: "500",
          borderRadius: "8px",
          fontSize: "12px",
          padding: "8px 16px",
          height: "auto",
          transition: "all 0.2s",
        }}
      />
      {connected && publicKey && (
        <div className="flex items-center gap-1.5 backdrop-blur-xl bg-green-500/[0.08] border border-green-500/[0.15] rounded-lg px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="text-[11px] text-green-400/80 font-mono">
            {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
          </span>
        </div>
      )}
    </div>
  );

  // ── IDLE → Hero ──
  if (isIdle) {
    return (
      <>
        <HumanHandoff />
        {/* Wallet menu overlay on hero */}
        <div className="fixed top-4 right-4 z-50">
          <WalletMenu />
        </div>
        <InvestigationHero />
      </>
    );
  }

  // ── Q&A MODE → Quick answer (no investigation chrome) ──
  if (qaMode) {
    return (
      <>
        <div className="h-screen w-full overflow-hidden relative bg-black">
          <div className="absolute inset-0 z-0">
            <ParticleCanvas disableCursor />
          </div>

          <div className="absolute top-0 inset-x-0 z-30">
            <div className="flex items-center justify-between px-6 py-4 max-w-[1400px] mx-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => useVeritasStore.getState().reset()}
                  className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] rounded-lg p-2 text-white/50 hover:text-white/90 hover:bg-white/[0.1] transition-all"
                >
                  <Home className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-semibold text-white/90 tracking-tight">Veritas</span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Quick Answer
                </span>
                <WalletMenu />
              </div>
            </div>
          </div>

          <div className="relative z-10 h-full pt-16">
            {qaLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                  <div className="text-sm text-white/40">Fact-checking your question...</div>
                  <div className="text-[11px] text-white/20">Searching sources & verifying claims</div>
                </div>
              </div>
            ) : qaResponse ? (
              <QAAnswer response={qaResponse} />
            ) : null}
          </div>
        </div>
      </>
    );
  }

  // ── ACTIVE → Particle + live feed ──
  if (isActive) {
    return (
      <>
        <HumanHandoff />
        <div className="h-screen w-full overflow-hidden">
          <VerdictCard report={report} />
        </div>
      </>
    );
  }

  // ── DONE → Results (Simple or Expert, both on particle bg) ──
  return (
    <>
      <HumanHandoff />

      <div className="h-screen w-full overflow-hidden relative">
        <div className="absolute inset-0 z-0">
          <ParticleCanvas disableCursor />
        </div>

        <div className="absolute top-0 inset-x-0 z-30">
          <div className="flex items-center justify-between px-6 py-4 max-w-[1400px] mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => useVeritasStore.getState().reset()}
                className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] rounded-lg p-2 text-white/50 hover:text-white/90 hover:bg-white/[0.1] transition-all"
              >
                <Home className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-semibold text-white/90 tracking-tight">Veritas</span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              </div>
            </div>

            {/* Stats */}
            <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.06] rounded-xl px-5 py-2 flex items-center gap-6 max-md:hidden">
              <StatPill label="Sources" value={sourcesCrawled} />
              <StatPill label="Claims" value={claimsFound} />
              <StatPill label="Conflicts" value={conflictsCount} danger />
              <div className="w-px h-4 bg-white/[0.08]" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30">Truth</span>
                <span className={`text-sm font-mono font-bold ${truthScore >= 70 ? "text-green-400" : truthScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                  {truthScore.toFixed(0)}
                </span>
              </div>
              {riskLevel && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase ${
                  riskLevel === "critical" ? "bg-red-500/20 text-red-400" :
                  riskLevel === "high" ? "bg-orange-500/20 text-orange-400" :
                  riskLevel === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                  "bg-green-500/20 text-green-400"
                }`}>
                  {riskLevel}
                </span>
              )}
            </div>

            {/* Mode toggle + wallet menu */}
            <div className="flex items-center gap-3">
              <div className="flex bg-white/[0.05] backdrop-blur-xl rounded-full p-0.5 border border-white/[0.08]">
                <button
                  onClick={() => setReportMode("simple")}
                  className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
                    reportMode === "simple" ? "bg-white text-black shadow-sm" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setReportMode("expert")}
                  className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
                    reportMode === "expert" ? "bg-white text-black shadow-sm" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  Expert
                </button>
              </div>
              <WalletMenu />
            </div>
          </div>
        </div>

        <div className="relative z-10 h-full pt-16 overflow-hidden">
          {reportMode === "simple" ? (
            <VerdictCard report={report} />
          ) : (
            <div className="h-full flex flex-col px-6 max-w-[1400px] mx-auto">
              <div className="flex items-center gap-1 backdrop-blur-xl bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 self-start mb-4 shrink-0">
                {EXPERT_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setExpertTab(tab)}
                    className={`px-4 py-1.5 text-xs font-medium capitalize rounded-lg transition-all flex items-center gap-1.5 ${
                      expertTab === tab
                        ? "bg-white text-black shadow-sm"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {tab === "enclave" && <Shield className="w-3 h-3" />}
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pb-6">
                {expertTab === "feed" && <VerdictCard report={report} />}
                {expertTab === "report" && report && <FinalReport report={report} />}
                {expertTab === "claims" && <ClaimCards claims={claims} />}
                {expertTab === "graph" && <KnowledgeGraph nodes={entityNodes} edges={entityEdges} />}
                {expertTab === "timeline" && <ForensicTimeline events={timelineEvents} />}
                {expertTab === "enclave" && <EnclaveReport />}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatPill({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-white/30">{label}</span>
      <span className={`text-sm font-mono font-semibold ${danger ? "text-red-400/80" : "text-white/70"}`}>{value}</span>
    </div>
  );
}
