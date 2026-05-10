"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Search, Shield, AlertCircle, CheckCircle, 
    Camera, Ghost, User, FileText, Brain, Scale, Terminal
} from "lucide-react";
import ClaimCards from "@/components/ClaimCards";
import HumanHandoff from "@/components/HumanHandoff";
import FinalReport from "@/components/FinalReport";

interface Event {
    event_type: string;
    agent_id: string;
    message: string;
    data: any;
    timestamp: string;
}

export default function InvestigationResultsPage() {
    const { id } = useParams();
    const target = decodeURIComponent(id as string);
    const [events, setEvents] = useState<Event[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [status, setStatus] = useState<string>("Initializing swarm...");
    const [isComplete, setIsComplete] = useState(false);
    const [waitingForHuman, setWaitingForHuman] = useState(false);
    const [report, setReport] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const eventSource = new EventSource(`/api/investigate/${encodeURIComponent(target)}/stream`);

        eventSource.onmessage = (event) => {
            const data: Event = JSON.parse(event.data);
            setEvents((prev) => [...prev, data]);
            setStatus(data.message);

            if (data.event_type === 'claim_found') {
                // Map to ClaimCards format
                const newClaim = {
                    id: data.data.id,
                    text: data.data.content,
                    source_type: "web",
                    source_url: data.data.source,
                    confidence: data.data.confidence,
                    status: "unverified",
                    timestamp: data.data.timestamp,
                    supporting_evidence: [data.data.source],
                    contradicting_evidence: []
                };
                setClaims((prev) => [...prev, newClaim]);
            }

            if (data.event_type === 'conflict_detected') {
                setConflicts((prev) => [...prev, data.data]);
                // Mark claim as disputed
                setClaims((prev) => prev.map(c => c.id === data.data.claimId ? { ...c, status: 'disputed' } : c));
            }

            if (data.event_type === 'human_required') {
                setWaitingForHuman(true);
            }

            if (data.event_type === 'report_ready') {
                setReport(data.data);
            }

            if (data.event_type === 'complete') {
                setIsComplete(true);
                eventSource.close();
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => eventSource.close();
    }, [target]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events]);

    return (
        <div className="min-h-screen bg-[#030303] text-white p-6 pb-20">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* ── Left Sidebar: Swarm Live Feed ── */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 h-[calc(100vh-120px)] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-blue-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Swarm Intelligence Feed</span>
                            </div>
                            {isComplete && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">LIVE_STREAM_COMPLETE</span>
                            )}
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                            <AnimatePresence>
                                {events.map((ev, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-[11px] font-mono border-l border-white/10 pl-3 py-1"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`uppercase font-bold ${
                                                ev.agent_id === 'hunter' ? 'text-blue-400' :
                                                ev.agent_id === 'skeptic' ? 'text-purple-400' :
                                                ev.agent_id === 'synthesizer' ? 'text-emerald-400' :
                                                'text-white/20'
                                            }`}>[{ev.agent_id}]</span>
                                            <span className="text-white/10">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="text-white/60 leading-relaxed">{ev.message}</div>
                                        {ev.event_type === 'screenshot' && (
                                            <div className="mt-2 rounded-lg border border-white/10 overflow-hidden bg-white/5 p-2">
                                                <div className="flex items-center gap-2 text-[9px] text-white/30 mb-2">
                                                    <Camera className="w-3 h-3" />
                                                    PROOFS_CAPTURED: {ev.data.url?.slice(0, 30)}...
                                                </div>
                                                <div className="aspect-video bg-black/40 rounded flex items-center justify-center italic text-white/10">
                                                    [Encrypted Proof Placeholder]
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {!isComplete && (
                                <div className="flex items-center gap-2 text-[10px] text-blue-400/50 animate-pulse mt-4">
                                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                                    Awaiting swarm updates...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Right Content: Intelligence Workspace ── */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{target}</h1>
                            <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1">
                                Case ID: {id?.slice(0, 8)} | Multi-Agent Forensic Investigation
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-[10px] text-white/30 uppercase font-bold">Current Status</div>
                                <div className={`text-xs font-bold ${isComplete ? 'text-emerald-400' : 'text-blue-400'}`}>
                                    {status}
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border ${isComplete ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-blue-500/10 border-blue-500/20 animate-pulse'}`}>
                                {isComplete ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Search className="w-5 h-5 text-blue-400" />}
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="claims">
                        <div className="flex items-center justify-between border-b border-white/5 mb-6">
                            <div className="flex gap-8">
                                {['claims', 'conflicts', 'report'].map((tab) => (
                                    <button 
                                        key={tab}
                                        className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all ${
                                            tab === 'claims' ? 'text-white border-b-2 border-blue-500' : 'text-white/20 hover:text-white/40'
                                        }`}
                                    >
                                        {tab} {tab === 'claims' && `(${claims.length})`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Claims Grid */}
                        <div className="space-y-6">
                            {claims.length > 0 ? (
                                <ClaimCards claims={claims} />
                            ) : (
                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <Ghost className="w-10 h-10 text-white/5 mx-auto mb-4" />
                                    <div className="text-sm text-white/20">Swarm is currently extracting claims...</div>
                                </div>
                            )}
                        </div>

                        {/* Human Handoff (Overlay when active) */}
                        <AnimatePresence>
                            {waitingForHuman && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                                    <div className="max-w-md w-full">
                                        <HumanHandoff 
                                            onContinue={(answer) => {
                                                setWaitingForHuman(false);
                                                // In real app, send this to the backend
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Final Report (Modal or full view) */}
                        {report && (
                            <div className="mt-12">
                                <FinalReport report={report} />
                            </div>
                        )}
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function Tabs({ children, defaultValue }: { children: any, defaultValue: string }) {
    // Simple mock tabs for now, could be improved with real state
    return <div>{children}</div>;
}
