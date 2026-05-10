"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnclaveReport from "@/components/EnclaveReport";
import AgdpDashboard from "@/components/AgdpDashboard";
import {
  Shield, Activity, Lock, Cpu, Server, CheckCircle2, Search,
} from "lucide-react";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

interface TEEStatus {
  status: string;
  enclave_version: string;
  hardware: string;
  threat_cache_size: number;
  attestation: {
    verified: boolean;
    measurements: { pcr0: string };
  };
}

export default function Page() {
  const [teeStatus, setTeeStatus] = useState<TEEStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/tee/status");
        const data = await res.json();
        setTeeStatus(data);
      } catch (e) {
        console.error("Failed to fetch TEE status", e);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#030303] text-white overflow-x-hidden">
      {/* ── Ambient Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 max-w-[1400px] mx-auto border-b border-white/[0.05]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-bold tracking-tight text-white/90">Veritas Frontier</span>
            <span className="text-[10px] font-mono text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">v2.6</span>
          </div>

          {/* TEE Health Bar */}
          <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${teeStatus?.status === 'HEALTHY' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Enclave: {teeStatus?.status || 'OFFLINE'}</span>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3 text-blue-400/50" />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">PCR0: {teeStatus?.attestation?.measurements?.pcr0.slice(0, 10)}...</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <WalletMultiButton
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)",
              fontWeight: "600",
              borderRadius: "12px",
              fontSize: "12px",
              padding: "10px 20px",
              height: "auto",
            }}
          />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 max-w-[1200px] mx-auto px-6 pt-10 pb-20">
        <Tabs defaultValue="scan" className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="bg-white/[0.03] border border-white/[0.08] p-1 rounded-2xl h-auto">
              <TabsTrigger 
                value="investigate" 
                className="rounded-xl px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black transition-all text-xs font-bold gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                Deep Investigation
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="scan" className="mt-0 outline-none">
             <EnclaveReport />
          </TabsContent>

          <TabsContent value="investigate" className="mt-0 outline-none">
             <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-12 h-12 text-blue-400/20 mb-4" />
                <h3 className="text-xl font-bold mb-2">Multi-Agent Forensics</h3>
                <p className="text-white/40 max-w-md mb-8">Deploy the Hunter and Skeptic agents to crawl the web and verify claims about any entity or token.</p>
                <button 
                  onClick={() => window.location.href = '/investigate'}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Start New Investigation
                </button>
             </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0 outline-none">
             <AgdpDashboard />
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer Status ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-[#030303]/80 backdrop-blur-md border-t border-white/[0.05] px-6 py-2.5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-white/20" />
                <span className="text-[10px] font-mono text-white/20">AGENT_PROTOCOL_V2.6_ACTIVE</span>
             </div>
             <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500/30" />
                <span className="text-[10px] font-mono text-white/20">TEE_SIGNED_SESSIONS_ONLY</span>
             </div>
          </div>
          <div className="text-[10px] font-mono text-white/10 uppercase tracking-widest">
            Hardware Root of Trust: AWS Nitro Enclave (Simulated)
          </div>
        </div>
      </footer>
    </div>
  );
}
