"use client";

import { useEffect, useState } from "react";

interface TruthScoreGaugeProps {
  score: number;
}

export default function TruthScoreGauge({ score }: TruthScoreGaugeProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const color =
    score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626";

  return (
    <div className="text-center py-4">
      <div
        className="text-5xl font-bold font-mono transition-colors duration-500"
        style={{ color }}
      >
        {Math.round(animated)}
      </div>
      <div className="text-xs text-text-muted mt-1 font-medium">Truth Score</div>
    </div>
  );
}
