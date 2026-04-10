"use client";

import { useVeritasStore } from "@/lib/store";
import ModeToggle, { type UIMode } from "./ModeToggle";

interface StatsHeaderProps {
  uiMode: UIMode;
  onModeChange: (m: UIMode) => void;
}

export default function StatsHeader({ uiMode, onModeChange }: StatsHeaderProps) {
  const { sourcesCrawled, claimsFound, conflictsCount, isInvestigating } =
    useVeritasStore();

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-border-default shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-semibold text-text-primary tracking-tight">
          Veritas
        </span>
        <span className="w-1.5 h-1.5 bg-accent rounded-full" />
        {isInvestigating && (
          <span className="ml-2 text-xs text-text-muted">Investigating...</span>
        )}
      </div>

      {uiMode === "expert" && (
        <div className="flex items-center gap-6 max-md:hidden">
          <Stat label="Sources" value={sourcesCrawled} />
          <Stat label="Claims" value={claimsFound} />
          <Stat label="Conflicts" value={conflictsCount} danger />
        </div>
      )}

      <ModeToggle mode={uiMode} onChange={onModeChange} />
    </header>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm font-mono font-semibold ${danger ? "text-danger" : "text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}
