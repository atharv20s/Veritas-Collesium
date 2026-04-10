"use client";

import { useState } from "react";
import { useVeritasStore } from "@/lib/store";
import type { InvestigationRequest } from "@/types";

const FOCUS_OPTIONS = ["claims", "financials", "people", "legal", "esg"] as const;
const DEPTH_OPTIONS = ["quick", "standard", "deep"] as const;

export default function MissionBrief() {
  const { startInvestigation, isInvestigating, recentInvestigations } =
    useVeritasStore();
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState("");
  const [depth, setDepth] =
    useState<InvestigationRequest["investigation_depth"]>("standard");
  const [focusAreas, setFocusAreas] = useState<
    InvestigationRequest["focus_areas"]
  >(["claims"]);

  const toggleFocus = (area: (typeof FOCUS_OPTIONS)[number]) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSubmit = () => {
    if (!query.trim() || !entity.trim()) return;
    startInvestigation({
      query: query.trim(),
      target_entity: entity.trim(),
      investigation_depth: depth,
      focus_areas: focusAreas,
    });
  };

  return (
    <div className="flex flex-col p-6 space-y-5">
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Target entity name..."
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="w-full bg-white border border-border-default rounded-input px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:shadow-focus focus:outline-none transition-all"
        />
        <textarea
          placeholder="What do you want to investigate?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full bg-white border border-border-default rounded-input px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:shadow-focus focus:outline-none transition-all resize-none"
        />
      </div>

      {/* Depth */}
      <div className="flex gap-1 bg-surface-elevated rounded-btn p-0.5">
        {DEPTH_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            className={`flex-1 py-1.5 text-xs font-medium capitalize rounded-btn transition-all ${
              depth === d
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Focus pills */}
      <div className="flex flex-wrap gap-2">
        {FOCUS_OPTIONS.map((area) => (
          <button
            key={area}
            onClick={() => toggleFocus(area)}
            className={`px-3 py-1 text-xs font-medium capitalize rounded-full border transition-all ${
              focusAreas.includes(area)
                ? "border-accent text-accent bg-accent/5"
                : "border-border-default text-text-muted hover:border-border-strong hover:text-text-secondary"
            }`}
          >
            {area}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={isInvestigating || !query.trim() || !entity.trim()}
        className="w-full py-3 bg-accent text-white font-medium text-sm rounded-btn hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isInvestigating ? "Investigating..." : "Investigate"}
      </button>

      {/* Recent */}
      {recentInvestigations.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border-default">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Recent
          </h3>
          {recentInvestigations.map((inv) => (
            <div
              key={inv.id}
              className="p-2.5 bg-surface-elevated rounded-btn text-xs"
            >
              <div className="text-text-secondary truncate">{inv.query}</div>
              <div className="text-text-muted mt-1 text-[11px]">
                {new Date(inv.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
