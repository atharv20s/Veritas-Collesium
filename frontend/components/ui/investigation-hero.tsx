"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Zap, Users, Scale, ArrowLeft } from "lucide-react";
import { useVeritasStore } from "@/lib/store";
import type { InvestigationRequest } from "@/types";
import { HeroShapesBackground } from "@/components/ui/shape-landing-hero";
import { FloatingNavbar } from "@/components/ui/floating-navbar";

// ── Focus/Depth config ──

const FOCUS_OPTIONS: {
  key: InvestigationRequest["focus_areas"][number];
  label: string;
  icon: typeof Search;
}[] = [
  { key: "claims", label: "Token Age", icon: Search },
  { key: "financials", label: "Liquidity", icon: Zap },
  { key: "people", label: "Slippage Risk", icon: Users },
  { key: "legal", label: "HoneyPot Code", icon: Scale },
];

const DEPTH_OPTIONS: InvestigationRequest["investigation_depth"][] = [
  "quick",
  "standard",
  "deep",
];

const MOCK_RECENTS = [
  { entity: "JUP Token", type: "Deep", focus: ["claims", "financials"], date: "Apr 9, 2026", status: "Secure" },
  { entity: "BONK Swap", type: "Quick", focus: ["claims", "people"], date: "Apr 8, 2026", status: "Flagged" },
  { entity: "RAY/SOL LP", type: "Standard", focus: ["financials", "legal"], date: "Apr 7, 2026", status: "Secure" },
  { entity: "Unknown Mint", type: "Deep", focus: ["claims", "legal"], date: "Apr 6, 2026", status: "Blocked" },
];

// ── Main Component ──

export function InvestigationHero() {
  const router = useRouter();
  const [entity, setEntity] = useState("");
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState<InvestigationRequest["investigation_depth"]>("standard");
  const [focusAreas, setFocusAreas] = useState<InvestigationRequest["focus_areas"]>(["claims"]);

  const { startInvestigation, startDemo, submitQuestion, isInvestigating, qaLoading } = useVeritasStore();
  const [isClassifying, setIsClassifying] = useState(false);

  const toggleFocus = (area: InvestigationRequest["focus_areas"][number]) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;

    // If entity is provided, always do investigation
    if (entity.trim()) {
      startInvestigation({
        query: query.trim(),
        target_entity: entity.trim(),
        investigation_depth: depth,
        focus_areas: focusAreas,
      });
      return;
    }

    // No entity → classify the query
    setIsClassifying(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${API_URL}/api/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (data.mode === "qa") {
        submitQuestion(query.trim());
      } else {
        // Investigation mode but no entity — use query as entity
        startInvestigation({
          query: query.trim(),
          target_entity: query.trim().split(" ").slice(0, 3).join(" "),
          investigation_depth: depth,
          focus_areas: focusAreas,
        });
      }
    } catch {
      // Fallback: treat as Q&A
      submitQuestion(query.trim());
    } finally {
      setIsClassifying(false);
    }
  };

  // Ctrl+D or Cmd+D for demo (works even when input is focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        startDemo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [startDemo]);

  return (
    <>
      <FloatingNavbar />
      <div className="relative min-h-screen w-full overflow-hidden bg-[#030303]">
        {/* Geometric shapes background */}
        <HeroShapesBackground />

        {/* Form overlay */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <motion.div
            className="w-full max-w-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          >
            {/* Back button */}
            <motion.div
              className="mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => router.push("/landing")}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </motion.div>

            {/* Logo */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h1 className="text-3xl font-semibold tracking-tight text-white/90">
                Veritas
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full ml-1 mb-1" />
              </h1>
              <p className="text-sm text-white/30 mt-1">
                Secure your DeFi Agents. We evaluate it.
              </p>
            </motion.div>

            {/* Glassmorphism card */}
            <motion.div
              className="backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.06] shadow-2xl p-6 space-y-5"
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe the transaction or token to evaluate..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                className="w-full bg-transparent text-white/90 text-sm placeholder:text-white/20 px-4 py-3 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-white/10 transition-all resize-none"
              />

              <input
                type="text"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder="Paste Solana Token Address or Signature..."
                className="w-full bg-transparent text-white/90 text-sm placeholder:text-white/20 px-4 py-3 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-white/10 transition-all"
              />

              {/* Depth */}
              <div>
                <div className="text-[11px] text-white/25 uppercase tracking-wider mb-2 px-1">
                  Investigation Depth
                </div>
                <div className="flex gap-1.5">
                  {DEPTH_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={`flex-1 py-2 text-xs font-medium capitalize rounded-lg transition-all ${
                        depth === d
                          ? "bg-white text-black"
                          : "bg-white/[0.05] text-white/40 hover:text-white/60"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus areas */}
              <div>
                <div className="text-[11px] text-white/25 uppercase tracking-wider mb-2 px-1">
                  Focus Areas
                </div>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_OPTIONS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => toggleFocus(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        focusAreas.includes(key)
                          ? "bg-white text-black"
                          : "bg-white/[0.05] text-white/40 hover:text-white/60"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/[0.05]" />

              {/* Submit */}
              <motion.button
                onClick={handleSubmit}
                disabled={isInvestigating || isClassifying || qaLoading || !query.trim()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  query.trim()
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : "bg-white/[0.05] text-white/30 cursor-not-allowed"
                }`}
              >
                {isInvestigating || isClassifying || qaLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {isClassifying ? "Classifying..." : qaLoading ? "Answering..." : "Investigating..."}
                  </>
                ) : entity.trim() ? (
                  <>Evaluate Token --></>
                ) : (
                  <>Ask Veritas &rarr;</>
                )}
              </motion.button>
            </motion.div>

            {/* Demo button */}
            <motion.div
              className="text-center mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <button
                onClick={() => startDemo()}
                className="text-xs text-white/20 hover:text-white/50 transition-colors cursor-pointer"
              >
                Click here or press{" "}
                <kbd className="px-1.5 py-0.5 bg-white/[0.05] rounded text-white/40 text-[10px]">
                  Ctrl+D
                </kbd>{" "}
                for demo
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Recent investigations below fold */}
      <div className="bg-black px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-xl font-semibold text-white/80 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Recent Investigations
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_RECENTS.map((item, idx) => (
              <motion.div
                key={idx}
                className="backdrop-blur-2xl bg-white/[0.02] rounded-xl border border-white/[0.05] p-5 hover:border-white/[0.1] transition-all cursor-pointer group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                      {item.entity}
                    </h3>
                    <span className="text-[11px] text-white/30">{item.date}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-white/50">
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.focus.map((f) => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-white/30 capitalize">
                      {f}
                    </span>
                  ))}
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400/70">
                    <span className="w-1.5 h-1.5 bg-green-400/70 rounded-full" />
                    {item.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
