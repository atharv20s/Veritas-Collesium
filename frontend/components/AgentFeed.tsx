"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StreamEvent } from "@/types";

const BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  thinking: { bg: "bg-gray-100", text: "text-gray-500", label: "THINK" },
  crawling: { bg: "bg-blue-50", text: "text-blue-600", label: "CRAWL" },
  screenshot: { bg: "bg-purple-50", text: "text-purple-600", label: "SNAP" },
  claim_found: { bg: "bg-green-50", text: "text-green-600", label: "CLAIM" },
  conflict_detected: { bg: "bg-red-50", text: "text-red-600", label: "CONFLICT" },
  human_required: { bg: "bg-amber-50", text: "text-amber-600", label: "INPUT" },
  complete: { bg: "bg-blue-50", text: "text-blue-600", label: "DONE" },
};

interface AgentFeedProps {
  title: string;
  events: StreamEvent[];
  accentColor: string;
  avatar: string;
}

export default function AgentFeed({ title, events, accentColor, avatar }: AgentFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="bg-white border border-border-default rounded-card shadow-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border-default">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
          style={{ backgroundColor: accentColor }}
        >
          {avatar}
        </div>
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <span className="ml-auto text-xs text-text-muted">{events.length}</span>
      </div>

      {/* Events */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <AnimatePresence initial={false}>
          {events.map((event, idx) => {
            const badge = BADGE_STYLES[event.event_type] || BADGE_STYLES.thinking;
            const ts = new Date(event.timestamp).toLocaleTimeString("en-US", {
              hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
            });

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-3 min-h-[44px]"
              >
                <span className={`${badge.bg} ${badge.text} text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5`}>
                  {badge.label}
                </span>
                <span className="text-sm text-text-secondary flex-1 leading-relaxed">
                  {event.message}
                </span>
                <span className="text-[11px] font-mono text-text-muted shrink-0 mt-0.5">
                  {ts}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {events.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Waiting for investigation...
          </div>
        )}
      </div>
    </div>
  );
}
