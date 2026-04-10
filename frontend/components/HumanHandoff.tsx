"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVeritasStore } from "@/lib/store";

export default function HumanHandoff() {
  const { humanInputRequired, humanQuestion, respondToHandoff } = useVeritasStore();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    await respondToHandoff(answer.trim());
    setAnswer("");
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {humanInputRequired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-elevated space-y-4"
          >
            <h2 className="text-lg font-semibold text-text-primary">
              Agent needs your input
            </h2>
            <div className="bg-surface-muted rounded-card p-4">
              <p className="text-sm text-text-secondary leading-relaxed">{humanQuestion}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAnswer("Focus on verifying official claims further")}
                className="flex-1 py-2 px-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-btn hover:bg-blue-100 transition-colors"
              >
                Verify claims
              </button>
              <button
                onClick={() => setAnswer("Deep-dive into contradictions and hidden data")}
                className="flex-1 py-2 px-3 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium rounded-btn hover:bg-purple-100 transition-colors"
              >
                Deep-dive contradictions
              </button>
            </div>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Or type a custom instruction..."
              className="w-full border border-border-default rounded-input px-3.5 py-2.5 text-sm focus:border-accent focus:shadow-focus focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting}
              className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-btn hover:bg-accent-hover disabled:opacity-40 transition-colors"
            >
              {submitting ? "Sending..." : "Send to Agent"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
