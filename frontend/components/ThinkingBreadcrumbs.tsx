"use client";

import { useRef, useEffect } from "react";
import { useVeritasStore } from "@/lib/store";

export default function ThinkingBreadcrumbs() {
  const events = useVeritasStore((s) => s.allEvents);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recent = events.slice(-6);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [events]);

  if (recent.length === 0) return null;

  return (
    <div ref={scrollRef} className="overflow-y-auto max-h-24 px-6 py-2 border-t border-border-default bg-surface-muted shrink-0">
      {recent.map((event, idx) => {
        const ts = new Date(event.timestamp).toLocaleTimeString("en-US", {
          hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
        const agent = event.agent_id.toUpperCase();
        return (
          <div key={idx} className="text-[11px] text-text-muted flex items-center gap-2 py-0.5">
            <span className="font-mono">{ts}</span>
            <span className="text-text-muted">&rarr;</span>
            <span className={agent === "HUNTER" ? "text-hunter-blue" : agent === "SKEPTIC" ? "text-skeptic-purple" : "text-accent"} style={{ fontWeight: 500 }}>
              {agent}
            </span>
            <span className="text-text-muted">&rarr;</span>
            <span className="text-text-secondary truncate">{event.message.slice(0, 70)}</span>
          </div>
        );
      })}
    </div>
  );
}
