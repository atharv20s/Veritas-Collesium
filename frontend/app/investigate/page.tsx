"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function InvestigatePage() {
    const [target, setTarget] = useState("");
    const router = useRouter();

    const startInvestigation = () => {
        if (!target) return;
        router.push(`/investigate/${encodeURIComponent(target)}`);
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6">
            <div className="max-w-2xl w-full text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <Search className="w-10 h-10 text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">Multi-Agent Investigation</h1>
                    <p className="text-white/40 text-lg">
                        Deploy the Hunter and Skeptic swarm to verify claims, detect conflicts, and generate high-fidelity intelligence reports.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/[0.03] border border-white/[0.08] p-8 rounded-3xl shadow-2xl backdrop-blur-xl"
                >
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                        <input
                            type="text"
                            placeholder="Enter entity name, token address, or website..."
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && startInvestigation()}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                        />
                    </div>

                    <button
                        onClick={startInvestigation}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                    >
                        <Zap className="w-5 h-5" />
                        Deploy Investigation Swarm
                    </button>

                    <div className="mt-8 grid grid-cols-3 gap-4">
                        <div className="text-left p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <Shield className="w-4 h-4 text-blue-400 mb-2" />
                            <div className="text-[10px] font-bold text-white/30 uppercase mb-1">Hunter Agent</div>
                            <div className="text-xs text-white/60">Aggressive web crawler & claim extractor</div>
                        </div>
                        <div className="text-left p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <Shield className="w-4 h-4 text-purple-400 mb-2" />
                            <div className="text-[10px] font-bold text-white/30 uppercase mb-1">Skeptic Agent</div>
                            <div className="text-xs text-white/60">Adversarial verification & conflict detection</div>
                        </div>
                        <div className="text-left p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <Shield className="w-4 h-4 text-emerald-400 mb-2" />
                            <div className="text-[10px] font-bold text-white/30 uppercase mb-1">Synthesizer</div>
                            <div className="text-xs text-white/60">Gemini-powered intelligence reporting</div>
                        </div>
                    </div>
                </motion.div>

                <div className="mt-12 flex items-center justify-center gap-8 text-[10px] font-mono text-white/20 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-green-500/50" />
                        Tavily Search API Connected
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-green-500/50" />
                        Gemini 2.5 Flash Active
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-green-500/50" />
                        LangGraph Pipeline Validated
                    </div>
                </div>
            </div>
        </div>
    );
}
