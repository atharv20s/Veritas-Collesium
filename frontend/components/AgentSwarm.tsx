"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, Activity, Search, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface AgentStatusProps {
    name: string;
    description: string;
    status: 'idle' | 'scanning' | 'complete' | 'flagged';
    findings?: string;
    icon: any;
    delay?: number;
}

function AgentCard({ name, description, status, findings, icon: Icon, delay = 0 }: AgentStatusProps) {
    const isScanning = status === 'scanning';
    const isComplete = status === 'complete';
    const isFlagged = status === 'flagged';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className={`relative overflow-hidden backdrop-blur-xl bg-white/[0.03] border rounded-2xl p-5 transition-all duration-500 ${
                isFlagged ? 'border-red-500/30 bg-red-500/[0.02]' : 
                isComplete ? 'border-green-500/30 bg-green-500/[0.02]' : 
                isScanning ? 'border-blue-500/40 bg-blue-500/[0.04]' : 'border-white/[0.06]'
            }`}
        >
            {isScanning && (
                <motion.div 
                    className="absolute bottom-0 left-0 h-[2px] bg-blue-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
            )}

            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${
                    isFlagged ? 'bg-red-500/10 text-red-400' :
                    isComplete ? 'bg-green-500/10 text-green-400' :
                    'bg-blue-500/10 text-blue-400'
                }`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                    {isScanning ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                            <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Scanning</span>
                        </div>
                    ) : isComplete ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider">Verified</span>
                        </div>
                    ) : isFlagged ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                            <AlertCircle className="w-3 h-3 text-red-400" />
                            <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">Flagged</span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-medium text-white/20 uppercase tracking-wider">Standby</span>
                    )}
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white/90">{name}</h3>
                <p className="text-[12px] text-white/40 leading-relaxed">{description}</p>
            </div>

            <AnimatePresence>
                {findings && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-white/[0.05]"
                    >
                        <p className={`text-[11px] font-mono leading-relaxed ${isFlagged ? 'text-red-400/80' : 'text-white/60'}`}>
                            {findings}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function AgentSwarm({ agents }: { agents: any }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl mx-auto">
            <AgentCard
                name="Forensics Agent"
                description="Reputation & Actor Intelligence"
                icon={Search}
                status={agents.forensics?.status || 'idle'}
                findings={agents.forensics?.findings}
                delay={0.1}
            />
            <AgentCard
                name="Protocol Agent"
                description="Smart Contract & Whitelist Verification"
                icon={Shield}
                status={agents.protocol?.status || 'idle'}
                findings={agents.protocol?.findings}
                delay={0.2}
            />
            <AgentCard
                name="Simulation Agent"
                description="Deterministic Execution Predictor"
                icon={Activity}
                status={agents.simulation?.status || 'idle'}
                findings={agents.simulation?.findings}
                delay={0.3}
            />
        </div>
    );
}
