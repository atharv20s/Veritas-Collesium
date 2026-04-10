"use client";

import { useState } from "react";
import { useVeritasStore } from "@/lib/store";
import TruthScoreGauge from "./TruthScoreGauge";

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function IntelPanels() {
  const {
    truthScore, riskLevel, claimsFound, conflictsCount,
    entityNodes, isInvestigating,
    humanInputRequired, humanQuestion, respondToHandoff,
  } = useVeritasStore();

  const verified = useVeritasStore((s) =>
    s.allEvents.filter((e) => e.event_type === "claim_found" && e.data?.status === "verified").length
  );

  return (
    <div className="flex flex-col p-6 space-y-5">
      {/* Truth Score */}
      <div className="bg-white border border-border-default rounded-card shadow-card p-6">
        <TruthScoreGauge score={truthScore} />
      </div>

      {/* Risk Level */}
      {riskLevel && (
        <div className={`text-center py-2 px-3 rounded-btn border text-xs font-semibold uppercase tracking-wider ${RISK_STYLES[riskLevel] || RISK_STYLES.medium}`}>
          {riskLevel}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Entities" value={isInvestigating && !entityNodes.length ? "--" : String(entityNodes.length)} />
        <MetricCard label="Claims" value={isInvestigating && !claimsFound ? "--" : String(claimsFound)} />
        <MetricCard label="Verified" value={isInvestigating && !verified ? "--" : String(verified)} color="#16A34A" />
        <MetricCard label="Disputed" value={isInvestigating && !conflictsCount ? "--" : String(conflictsCount)} color="#DC2626" />
      </div>

      {/* Claims bar */}
      {claimsFound > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-text-muted font-medium">Claims Breakdown</div>
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
            <div className="bg-success transition-all duration-500" style={{ width: `${(verified / Math.max(claimsFound, 1)) * 100}%` }} />
            <div className="bg-danger transition-all duration-500" style={{ width: `${(conflictsCount / Math.max(claimsFound, 1)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Human Handoff */}
      {humanInputRequired && (
        <HandoffCard question={humanQuestion} onRespond={respondToHandoff} />
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white border border-border-default rounded-card p-3 text-center">
      <div className="text-xl font-semibold font-mono" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-[11px] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}

function HandoffCard({ question, onRespond }: { question: string; onRespond: (a: string) => void }) {
  const [answer, setAnswer] = useState("");
  return (
    <div className="border border-danger/30 rounded-card p-4 bg-red-50/50 space-y-3">
      <div className="text-xs font-semibold text-danger uppercase tracking-wider">Input Required</div>
      <div className="text-sm text-text-secondary">{question}</div>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Your instruction..."
        className="w-full border border-border-default rounded-input px-3 py-2 text-sm focus:border-accent focus:shadow-focus focus:outline-none"
      />
      <button
        onClick={() => { if (answer.trim()) { onRespond(answer.trim()); setAnswer(""); } }}
        className="w-full py-2 bg-danger text-white text-sm font-medium rounded-btn hover:bg-red-700 transition-colors"
      >
        Respond
      </button>
    </div>
  );
}
