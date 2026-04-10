"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVeritasStore } from "@/lib/store";
import { translateEventToSimple } from "@/lib/translate";
import { ParticleCanvas } from "@/components/ui/particle-canvas";
import type { InvestigationReport } from "@/types";

const TRUST_COLORS: Record<string, string> = {
  green: "#22C55E", yellow: "#FBBF24", orange: "#F97316", red: "#EF4444",
};
const TRUST_PILL: Record<string, string> = {
  green: "bg-green-500/20 text-green-400 border-green-500/20",
  yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/20",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/20",
  red: "bg-red-500/20 text-red-400 border-red-500/20",
};

export default function VerdictCard({ report }: { report: InvestigationReport | null }) {
  const { allEvents, isInvestigating, report: storeReport, sourcesCrawled, claimsFound, conflictsCount } = useVeritasStore();
  const feedRef = useRef<HTMLDivElement>(null);
  const entityName = storeReport?.request?.target_entity || report?.request?.target_entity || "this entity";
  const summary = report?.simple_summary;

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [allEvents]);

  const trustColor = summary?.trust_color || "yellow";
  const color = TRUST_COLORS[trustColor] || TRUST_COLORS.yellow;
  const pillClass = TRUST_PILL[trustColor] || TRUST_PILL.yellow;

  const feedEvents = allEvents.filter(
    (e) => !["claims_data", "graph_data", "timeline_data", "report_ready"].includes(e.event_type)
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Particle canvas background — no cursor */}
      <div className="absolute inset-0 z-0">
        <ParticleCanvas disableCursor />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col h-full max-w-[780px] mx-auto px-6 pt-8 pb-6 overflow-y-auto">

        {/* ── Stats bar (glassmorphism) ── */}
        <div className="flex items-center gap-4 mb-6 shrink-0">
          <div className="backdrop-blur-2xl bg-white/[0.04] rounded-xl border border-white/[0.06] px-5 py-3 flex items-center gap-6 flex-1">
            <StatPill label="Sources" value={sourcesCrawled} />
            <StatPill label="Claims" value={claimsFound} />
            <StatPill label="Conflicts" value={conflictsCount} danger />
            {isInvestigating && (
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-xs text-white/40">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Verdict card (glassmorphism) ── */}
        {summary && summary.verdict_sentence ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="backdrop-blur-2xl bg-white/[0.04] rounded-2xl border border-white/[0.07] p-8 mb-6 shrink-0"
            style={{ borderTopColor: color, borderTopWidth: 3 }}
          >
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-5 border ${pillClass}`}>
              {summary.trust_label}
            </div>
            <h2 className="text-xl font-semibold text-white/90 leading-relaxed mb-5">
              {summary.verdict_sentence}
            </h2>
            <div className="space-y-3">
              {summary.bullets.map((bullet, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.15, duration: 0.3 }}
                  className="flex items-start gap-3 text-sm text-white/45 leading-relaxed"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span>{bullet}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : isInvestigating ? (
          <div className="backdrop-blur-2xl bg-white/[0.04] rounded-2xl border border-white/[0.07] p-8 mb-6 shrink-0" style={{ borderTopColor: "#3B82F6", borderTopWidth: 3 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-white/60">Investigating {entityName}...</span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full w-full bg-blue-400/60 rounded-full animate-progress" />
            </div>
            <p className="text-xs text-white/25 mt-2">This usually takes about a minute</p>
          </div>
        ) : null}

        {/* ── Live feed (glassmorphism) ── */}
        <div className="flex-1 min-h-[300px] backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between shrink-0">
            <span className="text-xs font-medium text-white/30">Investigation Log</span>
            <span className="text-[10px] text-white/20">{feedEvents.length} events</span>
          </div>
          <div ref={feedRef} className="flex-1 overflow-y-auto p-5 space-y-3">
            <AnimatePresence initial={false}>
              {feedEvents.map((event, idx) => {
                const text = translateEventToSimple(event, entityName);
                const isConflict = event.event_type === "conflict_detected";
                const isDone = event.event_type === "complete";
                const isScreenshot = event.event_type === "screenshot";

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`text-sm leading-relaxed min-h-[36px] flex items-start gap-3 ${
                      isConflict ? "text-orange-400/90" : isDone ? "text-blue-400 font-medium" : isScreenshot ? "text-purple-400/70" : "text-white/35"
                    }`}
                  >
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      isConflict ? "bg-orange-400" : isDone ? "bg-blue-400" : isScreenshot ? "bg-purple-400" : "bg-white/20"
                    }`} />
                    <span>{text}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {feedEvents.length === 0 && !isInvestigating && (
              <p className="text-white/15 text-sm">Waiting for events...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-white/30">{label}</span>
      <span className={`text-sm font-mono font-semibold ${danger ? "text-red-400/80" : "text-white/70"}`}>
        {value}
      </span>
    </div>
  );
}
