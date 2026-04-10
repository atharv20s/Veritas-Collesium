"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth, useAuthFetch } from "@/lib/auth";
import { useVeritasStore } from "@/lib/store";
import { Home, Trash2, Clock, ArrowRight, Loader2 } from "lucide-react";

interface HistoryItem {
  id: string;
  query: string;
  target_entity: string;
  investigation_depth: string;
  focus_areas: string;
  status: string;
  truth_score: number | null;
  risk_level: string | null;
  created_at: string | null;
  completed_at: string | null;
}

const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-300",
  low: "bg-green-500/20 text-green-400",
};

const STATUS_COLORS: Record<string, string> = {
  complete: "bg-green-500/20 text-green-400",
  running: "bg-blue-500/20 text-blue-400",
  error: "bg-red-500/20 text-red-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const loadInvestigation = useVeritasStore((s) => s.loadInvestigation);

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    authFetch("/api/history")
      .then((r) => r.json())
      .then((data) => setItems(data.investigations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading, authFetch, router]);

  const handleOpen = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await authFetch(`/api/history/${id}`);
      const data = await res.json();
      if (data.result) {
        loadInvestigation(data);
        router.push("/");
      }
    } catch {
      // ignore
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await authFetch(`/api/history/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // ignore
    }
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="min-h-screen w-full bg-black">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] rounded-lg p-2 text-white/50 hover:text-white/90 hover:bg-white/[0.1] transition-all"
            >
              <Home className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white/90">Investigation History</h1>
              <p className="text-xs text-white/30 mt-0.5">{items.length} investigation{items.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-sm text-white/30">No investigations yet</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Start your first investigation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => item.status === "complete" && handleOpen(item.id)}
                className={`backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 transition-all group ${
                  item.status === "complete" ? "cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.1]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                      {item.target_entity}
                    </h3>
                    <p className="text-xs text-white/40 mt-1 truncate">{item.query}</p>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || STATUS_COLORS.running}`}>
                        {item.status}
                      </span>
                      {item.risk_level && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase ${RISK_COLORS[item.risk_level] || ""}`}>
                          {item.risk_level}
                        </span>
                      )}
                      {item.truth_score !== null && (
                        <span className={`text-[10px] font-mono font-bold ${
                          item.truth_score >= 70 ? "text-green-400" : item.truth_score >= 40 ? "text-yellow-400" : "text-red-400"
                        }`}>
                          Truth: {item.truth_score.toFixed(0)}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/30 capitalize">
                        {item.investigation_depth}
                      </span>
                      {item.created_at && (
                        <span className="text-[10px] text-white/20 ml-auto shrink-0">
                          {timeAgo(item.created_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {loadingId === item.id ? (
                      <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                    ) : item.status === "complete" ? (
                      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                    ) : null}
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
