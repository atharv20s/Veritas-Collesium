"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Fingerprint, Lock, FileWarning, EyeOff } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ACERejection {
  id: string;
  agentId: string;
  targetProgram: string;
  violationType: string;
  estimatedValueUsd: number;
  timestamp: number;
  identityToken?: string;
  policyVersion?: string;
}

// ── Dummy Data (Replace with API fetch in production) ──────────────────────

const MOCK_REJECTIONS: ACERejection[] = [
  {
    id: "ace-rej-8f72",
    agentId: "agent-0x92f",
    targetProgram: "RUGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    violationType: "PROGRAM_NOT_WHITELISTED",
    estimatedValueUsd: 12500,
    timestamp: Date.now() - 1000 * 60 * 5, // 5 mins ago
    identityToken: "ACE_ID_92F_V2.6",
    policyVersion: "policy_v2.6",
  },
  {
    id: "ace-rej-3b1a",
    agentId: "agent-0x44a",
    targetProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    violationType: "SPEND_LIMIT_EXCEEDED",
    estimatedValueUsd: 55000,
    timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
    identityToken: "ACE_ID_44A_V2.6",
    policyVersion: "policy_v2.6",
  },
  {
    id: "ace-rej-9c88",
    agentId: "agent-0x11b",
    targetProgram: "UNKNOWN_DEX_V1",
    violationType: "UNAUTHORIZED_SWAP_PROTOCOL",
    estimatedValueUsd: 3200,
    timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
    identityToken: "ACE_ID_11B_V2.6",
    policyVersion: "policy_v2.6",
  }
];

// ── Component ──────────────────────────────────────────────────────────────

export default function AceRejectionPanel() {
  const [rejections, setRejections] = useState<ACERejection[]>(MOCK_REJECTIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // In a real implementation, you would fetch from Supabase here
  // useEffect(() => { ... }, []);

  const totalProtected = rejections.reduce((acc, r) => acc + r.estimatedValueUsd, 0);

  return (
    <div className="w-full relative overflow-hidden rounded-2xl border border-rose-500/20 bg-black/40 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="border-b border-rose-500/20 bg-rose-500/5 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            ACE Intercept Log
          </h3>
          <p className="text-sm text-white/50 mt-1">Access Control Execution (ACE) Hardware Enforcements</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Total Protected</p>
            <p className="text-2xl font-black text-rose-400">${totalProtected.toLocaleString()}</p>
          </div>
          <div className="w-px bg-rose-500/20"></div>
          <div className="text-right">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Blocks (24h)</p>
            <p className="text-2xl font-black text-white">{rejections.length}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* List */}
          <div className="md:col-span-5 flex flex-col gap-3">
            {rejections.map(r => (
              <motion.div
                key={r.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedId(r.id)}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                  selectedId === r.id 
                    ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md">
                    {r.violationType}
                  </span>
                  <span className="text-xs text-white/40 font-mono">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-white/80 font-mono truncate">{r.targetProgram}</p>
                <div className="mt-3 flex justify-between items-end">
                  <p className="text-xs text-white/50">{r.agentId}</p>
                  <p className="text-sm font-bold text-white">${r.estimatedValueUsd.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Details */}
          <div className="md:col-span-7">
            <AnimatePresence mode="wait">
              {selectedId ? (
                <DetailsPane rejection={rejections.find(r => r.id === selectedId)!} key={selectedId} />
              ) : (
                <EmptyState key="empty" />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailsPane({ rejection }: { rejection: ACERejection }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full rounded-xl border border-white/10 bg-black/60 p-6 relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 blur-3xl rounded-full pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400">
          <FileWarning className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-white">Forensic Snapshot</h4>
          <p className="text-xs text-white/50 font-mono">{rejection.id}</p>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Violation</p>
            <p className="text-sm font-bold text-rose-400">{rejection.violationType}</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Value at Risk</p>
            <p className="text-sm font-bold text-white">${rejection.estimatedValueUsd.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Target Program</p>
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-rose-400" />
            <p className="text-sm text-white/80 font-mono break-all">{rejection.targetProgram}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white/60">
              <Fingerprint className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Identity Token</span>
            </div>
            <p className="text-sm text-white font-mono">{rejection.identityToken || 'MISSING'}</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white/60">
              <Lock className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Policy Version</span>
            </div>
            <p className="text-sm text-white font-mono">{rejection.policyVersion || 'v2.6'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full rounded-xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center p-12 text-center"
    >
      <ShieldAlert className="w-12 h-12 text-white/20 mb-4" />
      <p className="text-white/60 font-medium">Select an intercept to view forensic details</p>
      <p className="text-xs text-white/40 mt-2">All unauthorized protocol interactions are logged securely via ACE.</p>
    </motion.div>
  );
}
