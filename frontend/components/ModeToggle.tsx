"use client";

import { useEffect, useState } from "react";

export type UIMode = "simple" | "expert";

export function usePersistentMode(): [UIMode, (m: UIMode) => void] {
  const [mode, setModeState] = useState<UIMode>("simple");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("veritas-ui-mode");
      if (stored === "expert" || stored === "simple") setModeState(stored);
    } catch {}
  }, []);

  const setMode = (m: UIMode) => {
    setModeState(m);
    try { localStorage.setItem("veritas-ui-mode", m); } catch {}
  };

  return [mode, setMode];
}

interface ModeToggleProps {
  mode: UIMode;
  onChange: (m: UIMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex bg-surface-elevated rounded-full p-0.5">
      <button
        onClick={() => onChange("simple")}
        className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
          mode === "simple"
            ? "bg-accent text-white shadow-sm"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        Simple
      </button>
      <button
        onClick={() => onChange("expert")}
        className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
          mode === "expert"
            ? "bg-accent text-white shadow-sm"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        Expert
      </button>
    </div>
  );
}
