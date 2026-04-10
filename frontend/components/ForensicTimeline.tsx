"use client";

import { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { TimelineEvent } from "@/types";

type FilterMode = "all" | "conflicts" | "official" | "external";

export default function ForensicTimeline({ events }: { events: TimelineEvent[] }) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [hovered, setHovered] = useState<TimelineEvent | null>(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize events
  const normalized = useMemo(
    () =>
      events
        .map((e, idx) => ({
          ...e,
          id: e.id || `tl-${idx}`,
          title: e.title || (e as unknown as Record<string, string>).event || "",
          lane: (e.lane ||
            ((e as unknown as Record<string, string>).source === "official"
              ? "official"
              : "external")) as "official" | "external",
          description:
            e.description || e.title || (e as unknown as Record<string, string>).event || "",
          date: e.date || "",
        }))
        .filter((e) => e.title && e.date),
    [events],
  );

  const hasConflicts = normalized.some((e) => e.is_conflict);

  const filtered = useMemo(
    () =>
      normalized.filter((e) => {
        if (filter === "conflicts") return e.is_conflict;
        if (filter === "official") return e.lane === "official";
        if (filter === "external") return e.lane === "external";
        return true;
      }),
    [normalized, filter],
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.date.localeCompare(b.date)),
    [filtered],
  );

  if (!events.length) {
    return (
      <div className="flex items-center justify-center h-96 text-white/25 text-sm">
        No timeline events yet
      </div>
    );
  }

  // Layout constants — evenly-spaced columns, no date-ratio overlap
  const COL_W = 160;
  const PAD_L = 140;
  const PAD_R = 60;
  const AXIS_Y = 220;
  const svgW = PAD_L + sorted.length * COL_W + PAD_R;
  const svgH = 440;

  // Even spacing: each event gets its own column
  const getX = (_d: string, i: number) => PAD_L + i * COL_W + COL_W / 2;

  // Stagger Y for official (above axis) and external (below axis) to avoid overlaps
  // Alternate between two Y levels within each lane
  let offCount = 0;
  let extCount = 0;
  const getY = (lane: string): number => {
    if (lane === "official") {
      const level = offCount % 3;
      offCount++;
      return AXIS_Y - 50 - level * 50; // 170, 120, 70
    }
    const level = extCount % 3;
    extCount++;
    return AXIS_Y + 50 + level * 50; // 270, 320, 370
  };

  // Pre-compute positions
  const positions = sorted.map((ev, i) => {
    const x = getX(ev.date, i);
    const y = getY(ev.lane);
    return { x, y };
  });

  // Reset counters for render (computed above was for position calc)
  // We'll use the positions array directly

  return (
    <div className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Conflict banner */}
      {hasConflicts && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-400 rounded-full" />
          <span className="text-red-400 text-xs font-semibold">Anachronism Detected</span>
          <span className="text-xs text-white/30">— Timeline inconsistencies found</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
        <div className="flex gap-2">
          {(["all", "conflicts", "official", "external"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                filter === f
                  ? "bg-white text-black"
                  : "bg-white/[0.05] text-white/40 hover:text-white/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-white/20">
          {sorted.length} event{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Horizontal timeline SVG */}
      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden p-6 relative">
        <svg width={svgW} height={svgH} className="block">
          {/* Background zones */}
          <rect x={0} y={0} width={svgW} height={AXIS_Y} fill="rgba(59,130,246,0.015)" rx={4} />
          <rect x={0} y={AXIS_Y} width={svgW} height={svgH - AXIS_Y} fill="rgba(124,58,237,0.015)" rx={4} />

          {/* Central axis line */}
          <line
            x1={PAD_L - 20} y1={AXIS_Y} x2={svgW - 20} y2={AXIS_Y}
            stroke="rgba(255,255,255,0.1)" strokeWidth={2}
          />

          {/* Lane labels */}
          <text x={16} y={AXIS_Y - 70} fill="#3B82F6" fontSize={12} fontWeight={600} fontFamily="system-ui">
            Official
          </text>
          <text x={16} y={AXIS_Y - 56} fill="rgba(255,255,255,0.2)" fontSize={10} fontFamily="system-ui">
            Claims &amp; Statements
          </text>
          <text x={16} y={AXIS_Y + 70} fill="#7C3AED" fontSize={12} fontWeight={600} fontFamily="system-ui">
            External
          </text>
          <text x={16} y={AXIS_Y + 84} fill="rgba(255,255,255,0.2)" fontSize={10} fontFamily="system-ui">
            Third-party Evidence
          </text>

          {/* Conflict pair links */}
          {sorted.map((ev, i) => {
            if (!ev.is_conflict || !ev.conflict_pair_id) return null;
            const j = sorted.findIndex(
              (e) => e.conflict_pair_id === ev.conflict_pair_id && e.id !== ev.id,
            );
            if (j === -1 || j < i) return null; // draw once
            const p1 = positions[i];
            const p2 = positions[j];
            return (
              <line
                key={`link-${ev.id}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#EF4444" strokeWidth={1.5} strokeDasharray="6,4" opacity={0.4}
              />
            );
          })}

          {/* Events */}
          {sorted.map((ev, i) => {
            const { x, y } = positions[i];
            const col = ev.is_conflict
              ? "#EF4444"
              : ev.lane === "official"
                ? "#3B82F6"
                : "#7C3AED";

            // Truncate title smartly
            const maxChars = 20;
            const shortTitle =
              ev.title.length > maxChars
                ? ev.title.slice(0, maxChars - 1) + "…"
                : ev.title;

            // Label position: above dot for official, below for external
            const isOfficial = ev.lane === "official";
            const labelY = isOfficial ? y - 14 : y + 18;
            const dateY = isOfficial ? y - 26 : y + 30;

            return (
              <g
                key={ev.id}
                onMouseEnter={() => {
                  setHovered(ev);
                  setTipPos({ x, y });
                }}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Stem line from dot to axis */}
                <line
                  x1={x} y1={y} x2={x} y2={AXIS_Y}
                  stroke={col} strokeWidth={1} opacity={0.15}
                />

                {/* Dot */}
                <motion.circle
                  cx={x} cy={y} r={ev.is_conflict ? 7 : 5}
                  fill={col}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                />

                {/* Conflict exclamation */}
                {ev.is_conflict && (
                  <text
                    x={x} y={y + 4} textAnchor="middle"
                    fill="white" fontSize={9} fontWeight={700}
                  >
                    !
                  </text>
                )}

                {/* Title label */}
                <text
                  x={x} y={labelY} textAnchor="middle"
                  fill="rgba(255,255,255,0.45)" fontSize={10}
                  fontFamily="system-ui" fontWeight={500}
                >
                  {shortTitle}
                </text>

                {/* Date label */}
                <text
                  x={x} y={dateY} textAnchor="middle"
                  fill="rgba(255,255,255,0.2)" fontSize={9}
                  fontFamily="ui-monospace, monospace"
                >
                  {ev.date}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip — anchored near the node */}
        {hovered && (
          <div
            className="absolute z-20 backdrop-blur-xl bg-black/80 border border-white/[0.12] rounded-xl shadow-2xl p-4 max-w-xs pointer-events-none"
            style={{
              left: tipPos.x + 12,
              top: tipPos.y < AXIS_Y ? tipPos.y + 15 : tipPos.y - 120,
            }}
          >
            <div className="text-sm font-semibold text-white/90 leading-snug">{hovered.title}</div>
            {hovered.description && hovered.description !== hovered.title && (
              <div className="text-xs text-white/40 mt-2 leading-relaxed">{hovered.description}</div>
            )}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-xs font-mono text-white/25">{hovered.date}</span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  hovered.lane === "official"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-purple-500/20 text-purple-400"
                }`}
              >
                {hovered.lane}
              </span>
              {hovered.is_conflict && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  CONFLICT
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-5 py-3 border-t border-white/[0.05] text-[11px] text-white/25">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Official</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500" /> External</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Conflict</div>
        <div className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-red-500" /> Link</div>
        <span className="ml-auto text-white/15">Hover for details</span>
      </div>
    </div>
  );
}
