"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVeritasStore } from "@/lib/store";

const BORDER_COLORS: Record<string, string> = {
  info: "border-l-accent",
  warning: "border-l-warning",
  conflict: "border-l-danger",
  success: "border-l-success",
};

export default function NotificationSystem() {
  const { notifications, removeNotification } = useVeritasStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {notifications.slice(-4).map((n) => (
          <Toast key={n.id} id={n.id} type={n.type} message={n.message} persistent={n.persistent} onDismiss={removeNotification} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ id, type, message, persistent, onDismiss }: {
  id: string; type: string; message: string; persistent?: boolean; onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (persistent) return;
    const t = setTimeout(() => onDismiss(id), type === "conflict" ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [id, type, persistent, onDismiss]);

  const borderClass = BORDER_COLORS[type] || BORDER_COLORS.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      onClick={() => onDismiss(id)}
      className={`bg-white border border-border-default ${borderClass} border-l-4 rounded-card p-3 shadow-elevated cursor-pointer`}
    >
      <span className="text-sm text-text-secondary">{message}</span>
    </motion.div>
  );
}
