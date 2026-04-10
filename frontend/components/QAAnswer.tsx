"use client";

import type { QAResponse } from "@/types";
import { CheckCircle2, AlertTriangle, ExternalLink, Shield, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Send } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useVeritasStore } from "@/lib/store";

interface Props {
  response: QAResponse;
}

const CONFIDENCE_CONFIG = {
  high: { min: 0.75, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", label: "High Confidence", icon: ShieldCheck },
  medium: { min: 0.5, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "Medium Confidence", icon: Shield },
  low: { min: 0, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Low Confidence", icon: ShieldAlert },
};

function getConfidenceLevel(score: number) {
  if (score >= 0.75) return CONFIDENCE_CONFIG.high;
  if (score >= 0.5) return CONFIDENCE_CONFIG.medium;
  return CONFIDENCE_CONFIG.low;
}

const RELIABILITY_COLORS: Record<string, string> = {
  high: "bg-green-500/15 text-green-400 border-green-500/20",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  low: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function QAAnswer({ response }: Props) {
  const [showSources, setShowSources] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const { submitQuestion, qaLoading } = useVeritasStore();
  const conf = getConfidenceLevel(response.confidence);
  const ConfIcon = conf.icon;

  const handleFollowUp = () => {
    if (followUp.trim() && !qaLoading) {
      submitQuestion(followUp.trim());
      setFollowUp("");
    }
  };

  return (
    <div className="h-full flex items-start justify-center pt-12 px-4 overflow-y-auto pb-8">
      <motion.div
        className="w-full max-w-2xl space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Question */}
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-3">
          <div className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Question</div>
          <div className="text-white/80 text-sm">{response.query}</div>
        </div>

        {/* Answer card */}
        <motion.div
          className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Confidence header */}
          <div className={`flex items-center justify-between px-5 py-3 ${conf.bg} border-b ${conf.border}`}>
            <div className="flex items-center gap-2">
              <ConfIcon className={`w-4 h-4 ${conf.color}`} />
              <span className={`text-xs font-medium ${conf.color}`}>
                {conf.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${conf.color}`}>
                {(response.confidence * 100).toFixed(0)}%
              </span>
              {response.verified && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Answer body */}
          <div className="px-5 py-5">
            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
              {response.answer}
            </p>
          </div>

          {/* Caveats */}
          {response.caveats.length > 0 && (
            <div className="mx-5 mb-4 p-3 rounded-lg bg-yellow-500/[0.05] border border-yellow-500/10">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400/70" />
                <span className="text-[11px] font-medium text-yellow-400/70 uppercase tracking-wider">
                  Caveats
                </span>
              </div>
              <ul className="space-y-1">
                {response.caveats.map((c, i) => (
                  <li key={i} className="text-xs text-white/50 pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-1.5 before:w-1 before:h-1 before:bg-yellow-400/30 before:rounded-full">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources toggle */}
          {response.sources.length > 0 && (
            <div className="border-t border-white/[0.06]">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center justify-between w-full px-5 py-3 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                <span>{response.sources.length} source{response.sources.length > 1 ? "s" : ""}</span>
                {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSources && (
                <motion.div
                  className="px-5 pb-4 space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                >
                  {response.sources.map((src, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 leading-relaxed">{src.text}</p>
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-400/60 hover:text-blue-400 mt-1 transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {src.url.replace(/^https?:\/\//, "").slice(0, 50)}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/30 capitalize">
                          {src.source_type}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border capitalize ${RELIABILITY_COLORS[src.reliability] || RELIABILITY_COLORS.medium}`}>
                          {src.reliability}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* Follow-up input */}
        <motion.div
          className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 p-2">
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleFollowUp(); }}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-transparent text-white/90 text-sm placeholder:text-white/20 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/10 transition-all"
            />
            <button
              onClick={handleFollowUp}
              disabled={!followUp.trim() || qaLoading}
              className={`p-2 rounded-lg transition-all ${
                followUp.trim() ? "bg-white/[0.1] text-white/70 hover:bg-white/[0.15] hover:text-white" : "text-white/20 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
