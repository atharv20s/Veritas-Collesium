"use client";

import { motion } from "framer-motion";

interface ConflictMeterProps {
  score: number;
}

export default function ConflictMeter({ score }: ConflictMeterProps) {
  const pct = Math.round(score * 100);
  const color = score < 0.3 ? "#16A34A" : score < 0.6 ? "#D97706" : "#DC2626";

  return (
    <div className="bg-white border border-border-default rounded-card shadow-card px-5 py-3 flex items-center gap-4">
      <span className="text-xs font-medium text-text-muted shrink-0">Conflict Score</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-sm font-mono font-semibold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}
