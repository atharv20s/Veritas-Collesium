"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Claim } from "@/types";

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  verified: { cls: "bg-green-500/20 text-green-400", label: "VERIFIED" },
  disputed: { cls: "bg-yellow-500/20 text-yellow-300", label: "DISPUTED" },
  false: { cls: "bg-red-500/20 text-red-400", label: "FALSE" },
  unverified: { cls: "bg-white/[0.05] text-white/30", label: "UNVERIFIED" },
};

type SortKey = "confidence" | "date" | "source_type";

export default function ClaimCards({ claims }: { claims: Claim[] }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [search, setSearch] = useState("");

  const filtered = claims
    .filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (search && !c.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "confidence") return b.confidence - a.confidence;
      if (sortKey === "date") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return a.source_type.localeCompare(b.source_type);
    });

  return (
    <div className="max-w-[1100px] mx-auto space-y-5 pb-8">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {["", "verified", "disputed", "false", "unverified"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === statusFilter ? "" : s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
              statusFilter === s || (!s && !statusFilter)
                ? "bg-white text-black"
                : "bg-white/[0.05] text-white/40 hover:text-white/60"
            }`}
          >
            {s || "All"}
          </button>
        ))}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="ml-auto text-xs bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white/50 focus:outline-none"
        >
          <option value="confidence">Confidence</option>
          <option value="date">Date</option>
          <option value="source_type">Source</option>
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 w-40"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ClaimCard({ claim }: { claim: Claim }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"supporting" | "contradicting">("supporting");
  const style = STATUS_PILL[claim.status] || STATUS_PILL.unverified;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04]">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.cls}`}>{style.label}</span>
        <span className="text-[11px] text-white/20 capitalize">{claim.source_type}</span>
        <span className="ml-auto text-[11px] font-mono text-white/25">{(claim.confidence * 100).toFixed(0)}%</span>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-sm font-medium text-white/75 leading-relaxed">{claim.text}</p>

        <div className="flex gap-4 mt-3 border-b border-white/[0.04]">
          <button onClick={() => setTab("supporting")}
            className={`text-xs pb-1.5 ${tab === "supporting" ? "text-green-400 border-b border-green-400 font-medium" : "text-white/25"}`}>
            Supporting ({claim.supporting_evidence.length})
          </button>
          <button onClick={() => setTab("contradicting")}
            className={`text-xs pb-1.5 ${tab === "contradicting" ? "text-red-400 border-b border-red-400 font-medium" : "text-white/25"}`}>
            Contradicting ({claim.contradicting_evidence.length})
          </button>
        </div>
        <div className="mt-2 max-h-16 overflow-y-auto">
          {(tab === "supporting" ? claim.supporting_evidence : claim.contradicting_evidence).map((ev, i) => (
            <div key={i} className="text-[11px] text-white/25 py-0.5">{ev}</div>
          ))}
          {(tab === "supporting" ? claim.supporting_evidence : claim.contradicting_evidence).length === 0 && (
            <div className="text-[11px] text-white/15 italic">None</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/[0.04]">
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-400/70 hover:text-blue-400 font-medium">
          {expanded ? "Hide audit trail" : "View audit trail"}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 space-y-1 overflow-hidden">
              <div className="text-[11px] text-white/20">Source: {claim.source_url}</div>
              <div className="text-[11px] text-white/20">Time: {new Date(claim.timestamp).toLocaleString()}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
