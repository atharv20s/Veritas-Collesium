"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, TrendingUp, Zap, ServerCrash } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

interface aGDPLiveReport {
  agentic_gdp_sol: number;
  net_value_created_usd: number;
  api_execution_cost_usd: number;
  roi_percent: number;
  funds_protected_usd: number;
  total_scans: number;
  last_update: number;
}

interface EfficiencyDataPoint {
  timestamp: number;
  income: number;
  expense: number;
  netProfit: number;
  cumulativeROI: number;
}

interface aGDPEvent {
  agentId: string;
  type: "INCOME" | "EXPENSE";
  value: number;
  description: string;
  timestamp: number;
}

// ── Components ─────────────────────────────────────────────────────────────

export default function AgdpDashboard() {
  const [liveReport, setLiveReport] = useState<aGDPLiveReport | null>(null);
  const [trendData, setTrendData] = useState<EfficiencyDataPoint[]>([]);
  const [eventHistory, setEventHistory] = useState<aGDPEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/enclave/agdp");
      const data = await res.json();
      if (data.success) {
        setLiveReport(data.data.liveReport);
        setTrendData(data.data.efficiencyTrend);
        setEventHistory(data.data.eventHistory.reverse()); // Newest first
      }
    } catch (e) {
      console.error("Failed to fetch aGDP metrics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Live polling every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading && !liveReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Level KPIs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Agentic GDP" 
          value={`${liveReport?.agentic_gdp_sol || 0} SOL`}
          subtitle="Cumulative Productivity"
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
          gradient="from-emerald-500/20 to-teal-500/5"
          border="border-emerald-500/30"
        />
        <MetricCard 
          title="Funds Protected" 
          value={`$${(liveReport?.funds_protected_usd || 0).toLocaleString()}`}
          subtitle="ACE & TEE Interventions"
          icon={<ShieldCheck className="w-5 h-5 text-blue-400" />}
          gradient="from-blue-500/20 to-indigo-500/5"
          border="border-blue-500/30"
        />
        <MetricCard 
          title="Swarm Execution Cost" 
          value={`$${(liveReport?.api_execution_cost_usd || 0).toFixed(2)}`}
          subtitle="API & Compute Overhead"
          icon={<ServerCrash className="w-5 h-5 text-rose-400" />}
          gradient="from-rose-500/20 to-orange-500/5"
          border="border-rose-500/30"
        />
        <MetricCard 
          title="Efficiency ROI" 
          value={`+${liveReport?.roi_percent || 0}%`}
          subtitle="Value Created vs. Cost"
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
          gradient="from-amber-500/20 to-yellow-500/5"
          border="border-amber-500/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── ROI Chart ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl shadow-emerald-500/5"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-32 h-32" />
          </div>
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            Agent Productivity Trend
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={12}
                  tickMargin={10}
                />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelFormatter={(val) => new Date(val).toLocaleString()}
                />
                <Line type="monotone" dataKey="netProfit" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#000', stroke: '#34d399', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#34d399' }} name="Net Profit ($)" />
                <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Execution Cost ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── Ledger Feed ── */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            Ledger Stream
            <span className="flex h-2 w-2 relative ml-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </h3>
          <div className="space-y-4 pr-2 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {eventHistory.length === 0 ? (
              <div className="text-center text-white/40 py-8 text-sm">No recent activity on ledger</div>
            ) : (
              eventHistory.map((evt, i) => (
                <div key={i} className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${evt.type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {evt.type === 'INCOME' ? '+' : '-'}${evt.value.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 leading-snug">{evt.description}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, icon, gradient, border }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative overflow-hidden rounded-2xl border ${border} bg-black/40 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`}></div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-white/60">{title}</p>
          <div className="p-2 bg-white/5 rounded-xl border border-white/10">
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">{value}</h4>
          <p className="text-xs text-white/40 font-medium">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}
