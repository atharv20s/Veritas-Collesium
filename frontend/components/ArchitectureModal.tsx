"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Node,
  Edge,
  Handle,
  Position,
  BackgroundVariant
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network } from "lucide-react";

// --- Custom Node Components for beautiful styling ---

const GroupNode = ({ data }: any) => (
  <div className="bg-slate-900/30 border border-slate-700/50 rounded-2xl w-full h-full p-4 relative backdrop-blur-md">
    <div className="absolute top-0 left-6 -translate-y-1/2 bg-slate-800 px-3 py-1 rounded-full border border-slate-600 flex items-center gap-2 shadow-xl">
      {data.icon && <span>{data.icon}</span>}
      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{data.label}</span>
    </div>
  </div>
);

const DbNode = ({ data }: any) => (
  <div className={`border-2 rounded-xl shadow-lg min-w-[200px] overflow-hidden backdrop-blur-xl ${data.color || "bg-slate-900 border-purple-500 shadow-purple-500/20"}`}>
    <Handle type="target" position={Position.Top} className="w-2 h-2 opacity-0" id="t-top" />
    <div className="bg-white/5 px-3 py-2 border-b border-white/10 text-xs font-bold text-white flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${data.dotColor || "bg-purple-400"}`}></span>
      {data.label}
    </div>
    <div className="p-2 space-y-1 bg-black/40">
      {data.fields.map((f: any, i: number) => (
        <div key={i} className="flex justify-between text-[10px] font-mono">
          <span className="text-white/80">{f.name}</span>
          <span className="text-white/40">{f.type}</span>
        </div>
      ))}
    </div>
  </div>
);

const ServiceNode = ({ data }: any) => {
  const getColors = () => {
    switch (data.bg) {
      case "red": return "bg-red-950/40 border-red-500/50 text-red-300 shadow-red-500/20";
      case "green": return "bg-green-950/40 border-green-500/50 text-green-300 shadow-green-500/20";
      case "purple": return "bg-purple-950/40 border-purple-500/50 text-purple-300 shadow-purple-500/20";
      case "orange": return "bg-orange-950/40 border-orange-500/50 text-orange-300 shadow-orange-500/20";
      default: return "bg-slate-900/60 border-blue-500/50 text-blue-300 shadow-blue-500/20";
    }
  };

  return (
    <div className={`border-2 rounded-xl shadow-lg p-4 min-w-[180px] text-center backdrop-blur-xl transition-all ${getColors()}`}>
      <Handle type="target" position={Position.Top} className="w-0 h-0 border-none opacity-0" id="top" />
      <Handle type="target" position={Position.Left} className="w-0 h-0 border-none opacity-0" id="left" />
      <Handle type="target" position={Position.Right} className="w-0 h-0 border-none opacity-0" id="t-right" />
      <Handle type="target" position={Position.Bottom} className="w-0 h-0 border-none opacity-0" id="t-bottom" />
      
      <div className="text-[11px] font-bold uppercase tracking-wider">{data.label}</div>
      {data.desc && <div className="text-[9px] text-white/50 mt-1.5 font-mono">{data.desc}</div>}
      
      <Handle type="source" position={Position.Bottom} className="w-0 h-0 border-none opacity-0" id="bottom" />
      <Handle type="source" position={Position.Right} className="w-0 h-0 border-none opacity-0" id="right" />
      <Handle type="source" position={Position.Left} className="w-0 h-0 border-none opacity-0" id="s-left" />
      <Handle type="source" position={Position.Top} className="w-0 h-0 border-none opacity-0" id="s-top" />
    </div>
  );
};

const nodeTypes = {
  dbNode: DbNode,
  serviceNode: ServiceNode,
  groupNode: GroupNode,
};

// --- Initial Data ---

const initialNodes: Node[] = [
  // Top level triggers
  { id: "tx_in", type: "serviceNode", position: { x: 500, y: 0 }, data: { label: "Agent Proposes Transaction", bg: "default" } },

  // --- Triage Group ---
  { id: "g_triage", type: "groupNode", position: { x: 500, y: 120 }, style: { width: 350, height: 260 }, data: { label: "Entry Node: Triage", icon: "🟢" } },
  { id: "xgb", type: "serviceNode", parentNode: "g_triage", extent: "parent", position: { x: 80, y: 50 }, data: { label: "Fast XGBoost Scorer", desc: "Heuristic evaluation" } },
  { id: "swarm_node", type: "serviceNode", parentNode: "g_triage", extent: "parent", position: { x: 80, y: 160 }, data: { label: "SwarmRouter", bg: "purple" } },

  // --- Context Resolution Group ---
  { id: "g_context", type: "groupNode", position: { x: 100, y: 450 }, style: { width: 1100, height: 450 }, data: { label: "Context Resolution", icon: "🧠" } },
  
  // Parallel Swarm (Inside Context)
  { id: "g_swarm", type: "groupNode", parentNode: "g_context", extent: "parent", position: { x: 50, y: 50 }, style: { width: 1000, height: 160 }, data: { label: "Parallel Swarm", icon: "⚡" } },
  { id: "forensic", type: "serviceNode", parentNode: "g_swarm", extent: "parent", position: { x: 40, y: 50 }, data: { label: "Forensics Agent", desc: "Tavily Search: Scams/Hacks" } },
  { id: "protocol", type: "serviceNode", parentNode: "g_swarm", extent: "parent", position: { x: 380, y: 50 }, data: { label: "Protocol Agent", desc: "RPC ABI & Audit Validation" } },
  { id: "execution", type: "serviceNode", parentNode: "g_swarm", extent: "parent", position: { x: 720, y: 50 }, data: { label: "Execution Sim Agent", desc: "State Change Prediction" } },
  
  { id: "colosseum", type: "serviceNode", parentNode: "g_context", extent: "parent", position: { x: 430, y: 250 }, data: { label: "Colosseum Grounding Node", desc: "Conflict resolution boundary" } },
  { id: "deepseek", type: "serviceNode", parentNode: "g_context", extent: "parent", position: { x: 430, y: 350 }, data: { label: "DeepSeek Synthesizer", bg: "orange", desc: "LLM Verdict Consensus" } },

  // --- Enclave Group ---
  { id: "g_enclave", type: "groupNode", position: { x: 100, y: 950 }, style: { width: 1100, height: 420 }, data: { label: "AWS Nitro Enclave Boundary", icon: "🛡️" } },
  { id: "verdict", type: "serviceNode", parentNode: "g_enclave", extent: "parent", position: { x: 430, y: 60 }, data: { label: "Final Verdict Logic", desc: "Fail-Closed Gate" } },
  
  { id: "blocked", type: "serviceNode", parentNode: "g_enclave", extent: "parent", position: { x: 150, y: 180 }, data: { label: "TX BLOCKED", bg: "red" } },
  { id: "cache", type: "serviceNode", parentNode: "g_enclave", extent: "parent", position: { x: 40, y: 300 }, data: { label: "Update Threat Cache", desc: "Poison wallet list", bg: "red" } },
  { id: "zeroize", type: "serviceNode", parentNode: "g_enclave", extent: "parent", position: { x: 260, y: 300 }, data: { label: "Zeroize MPC Fragments", bg: "red", desc: "Destroy enclave memory" } },
  
  { id: "approve", type: "serviceNode", parentNode: "g_enclave", extent: "parent", position: { x: 750, y: 180 }, data: { label: "Approve & Sign", bg: "green" } },
  { id: "shamir", type: "serviceNode", parentNode: "g_enclave", extent: "parent", position: { x: 750, y: 270 }, data: { label: "Reconstruct Shamir Shares", bg: "green" } },
  { id: "cpi", type: "serviceNode", parentNode: "g_enclave", extent: "parent", position: { x: 750, y: 360 }, data: { label: "Execute Target Solana CPI", bg: "green" } },

  // --- DB Nodes (ERD layer) ---
  { id: "db_sessions", type: "dbNode", position: { x: -250, y: 150 }, data: { label: "wallet_sessions", fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "wallet_address", type: "text" },
      { name: "session_start", type: "timestamp" }
    ]}
  },
  { id: "db_history", type: "dbNode", position: { x: -250, y: 600 }, data: { label: "scan_history", color: "bg-slate-900 border-orange-500 shadow-orange-500/20", dotColor: "bg-orange-400", fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "wallet_address", type: "text" },
      { name: "verdict", type: "text" },
      { name: "xgboost_score", type: "numeric" },
      { name: "fast_path", type: "boolean" }
    ]}
  },
  { id: "db_agents", type: "dbNode", position: { x: -250, y: 800 }, data: { label: "agent_reports", color: "bg-slate-900 border-blue-500 shadow-blue-500/20", dotColor: "bg-blue-400", fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "scan_id", type: "uuid (FK)" },
      { name: "agent_name", type: "text" },
      { name: "status", type: "text" },
      { name: "findings", type: "jsonb" }
    ]}
  },
];

const initialEdges: Edge[] = [
  // Triage flows
  { id: "e1", source: "tx_in", target: "xgb", sourceHandle: "bottom", targetHandle: "top", type: "step", animated: true, style: { stroke: "#fff" } },
  { id: "e2", source: "xgb", target: "swarm_node", sourceHandle: "bottom", targetHandle: "top", type: "step", label: "Risk >= 20", animated: true, style: { stroke: "#f59e0b" }, labelBgStyle: { fill: "#000" }, labelStyle: { fill: "#f59e0b", fontWeight: "bold" } },
  { id: "e3", source: "xgb", target: "approve", sourceHandle: "right", targetHandle: "top", type: "step", label: "Risk < 20 (Fast Path)", animated: true, style: { stroke: "#10b981" }, labelBgStyle: { fill: "#000" }, labelStyle: { fill: "#10b981", fontWeight: "bold" } },
  
  // Swarm split
  { id: "e4", source: "swarm_node", target: "forensic", sourceHandle: "left", targetHandle: "top", type: "step", animated: true, style: { stroke: "#3b82f6" } },
  { id: "e5", source: "swarm_node", target: "protocol", sourceHandle: "bottom", targetHandle: "top", type: "step", animated: true, style: { stroke: "#3b82f6" } },
  { id: "e6", source: "swarm_node", target: "execution", sourceHandle: "right", targetHandle: "top", type: "step", animated: true, style: { stroke: "#3b82f6" } },

  // Swarm convergence
  { id: "e7", source: "forensic", target: "colosseum", sourceHandle: "bottom", targetHandle: "top", type: "step", animated: true, style: { stroke: "#a855f7" } },
  { id: "e8", source: "protocol", target: "colosseum", sourceHandle: "bottom", targetHandle: "top", type: "step", animated: true, style: { stroke: "#a855f7" } },
  { id: "e9", source: "execution", target: "colosseum", sourceHandle: "bottom", targetHandle: "top", type: "step", animated: true, style: { stroke: "#a855f7" } },

  // Synth & Vertex
  { id: "e10", source: "colosseum", target: "deepseek", sourceHandle: "bottom", targetHandle: "top", type: "step", animated: true, style: { stroke: "#fff" } },
  { id: "e11", source: "deepseek", target: "forensic", sourceHandle: "left", targetHandle: "s-left", type: "step", label: "Contradiction / Exception Loop", animated: true, style: { stroke: "#f43f5e" }, labelBgStyle: { fill: "#000" }, labelStyle: { fill: "#f43f5e", fontSize: 10 } },
  { id: "e12", source: "deepseek", target: "verdict", sourceHandle: "bottom", targetHandle: "top", type: "step", label: "Consensus Reached", animated: true, style: { stroke: "#fff" }, labelBgStyle: { fill: "#000" }, labelStyle: { fill: "#fff" } },

  // Enclave logic
  { id: "e13", source: "verdict", target: "blocked", sourceHandle: "left", targetHandle: "top", type: "step", animated: true, style: { stroke: "#ef4444", strokeWidth: 2 } },
  { id: "e14", source: "verdict", target: "approve", sourceHandle: "right", targetHandle: "t-left", type: "step", animated: true, style: { stroke: "#22c55e", strokeWidth: 2 } },
  
  { id: "e15", source: "blocked", target: "cache", sourceHandle: "bottom", targetHandle: "top", type: "step", animated: true, style: { stroke: "#ef4444" } },
  { id: "e16", source: "blocked", target: "zeroize", sourceHandle: "bottom", targetHandle: "top", type: "step", animated: true, style: { stroke: "#ef4444" } },

  { id: "e17", source: "approve", target: "shamir", sourceHandle: "bottom", targetHandle: "top", type: "smoothstep", animated: true, style: { stroke: "#22c55e" } },
  { id: "e18", source: "shamir", target: "cpi", sourceHandle: "bottom", targetHandle: "top", type: "smoothstep", animated: true, style: { stroke: "#22c55e" } },

  // DB Relations
  { id: "db1", source: "tx_in", target: "db_sessions", sourceHandle: "s-top", targetHandle: "t-top", type: "step", label: "Log Auth", style: { stroke: "#64748b", strokeDasharray: "5,5" } },
  { id: "db2", source: "deepseek", target: "db_history", sourceHandle: "s-left", targetHandle: "t-top", type: "step", label: "Log Scan History", style: { stroke: "#64748b", strokeDasharray: "5,5" } },
  { id: "db3", source: "db_history", target: "db_agents", sourceHandle: "bottom", targetHandle: "t-top", type: "straight", label: "1:N", style: { stroke: "#64748b" } },
];

export function ArchitectureModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 backdrop-blur-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-full px-4 py-2 font-mono text-xs flex items-center gap-2 transition-all shadow-lg shadow-purple-500/10"
      >
        <Network className="w-4 h-4" />
        View System ERD & Architecture
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-3xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                <h2 className="text-xl font-semibold text-white tracking-wider uppercase font-mono">
                  Veritas System Architecture & Entity Relationships
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 w-full h-full relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-zinc-950"
              >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ffffff20" />
                <Controls className="bg-white/5 border-white/10 fill-white/50 stroke-white/50" />
              </ReactFlow>
            </div>
            
            {/* Legend / Info */}
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-center pointer-events-none">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex gap-6 shadow-2xl">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500/20 border-2 border-blue-500"></div><span className="text-xs text-white/60 font-mono">Core Services</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500/20 border-2 border-dashed border-green-500"></div><span className="text-xs text-white/60 font-mono">External API</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-500/20 border-2 border-purple-500"></div><span className="text-xs text-white/60 font-mono">Supabase DB Tables</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
