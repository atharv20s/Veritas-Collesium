"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EntityNode, EntityEdge } from "@/types";

function riskColor(s: number) { return s < 0.3 ? "#22C55E" : s < 0.6 ? "#FBBF24" : "#EF4444"; }

function PersonNode({ data }: { data: Record<string, unknown> }) {
  const risk = (data.risk_score as number) || 0;
  const name = data.label as string;
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 100 }}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 text-sm font-bold"
        style={{ borderColor: riskColor(risk), color: riskColor(risk), background: "rgba(255,255,255,0.04)" }}>
        {initials}
      </div>
      <div className="text-[11px] font-medium text-white/80 text-center max-w-[140px] leading-tight">{name}</div>
      <div className="text-[9px] text-white/25">Person</div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

function EntityNodeComp({ data }: { data: Record<string, unknown> }) {
  const risk = (data.risk_score as number) || 0;
  const name = data.label as string;
  const typeLabel = (data._node_type as string) || "Entity";
  return (
    <div className="px-4 py-3 rounded-xl border-2 text-center"
      style={{ borderColor: riskColor(risk), background: "rgba(255,255,255,0.03)", minWidth: 140, maxWidth: 200 }}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1">{typeLabel}</div>
      <div className="text-xs font-semibold text-white/80 leading-snug">{name}</div>
      <div className="text-[10px] font-mono mt-1" style={{ color: riskColor(risk) }}>
        Risk: {(risk * 100).toFixed(0)}%
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  person: PersonNode,
  company: EntityNodeComp,
  asset: EntityNodeComp,
  legal_entity: EntityNodeComp,
  location: EntityNodeComp,
};

export default function KnowledgeGraph({ nodes, edges }: { nodes: EntityNode[]; edges: EntityEdge[] }) {
  const [selectedNode, setSelectedNode] = useState<EntityNode | null>(null);

  const flowNodes: Node[] = useMemo(() => {
    const cx = 400, cy = 350;
    const radius = Math.max(200, nodes.length * 50);
    return nodes.map((n, idx) => {
      const angle = (idx / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: n.id, type: n.entity_type,
        position: { x: cx + radius * Math.cos(angle) - 70, y: cy + radius * Math.sin(angle) - 30 },
        data: { label: n.name, risk_score: n.risk_score, _node_type: n.entity_type.replace("_", " "), ...n.attributes },
      };
    });
  }, [nodes]);

  const flowEdges: Edge[] = useMemo(() => edges.map((e, i) => ({
    id: `edge-${i}`, source: e.source_id, target: e.target_id, label: e.relationship, animated: e.is_suspicious,
    style: { stroke: e.is_suspicious ? "#EF4444" : "rgba(255,255,255,0.12)", strokeWidth: e.is_suspicious ? 2.5 : 1.5 },
    labelStyle: { fill: e.is_suspicious ? "#EF4444" : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: e.is_suspicious ? 600 : 400, fontFamily: "Inter" },
    labelBgStyle: { fill: "rgba(0,0,0,0.7)", fillOpacity: 1 },
    labelBgPadding: [4, 8] as [number, number], labelBgBorderRadius: 4,
  })), [edges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(nodes.find((n) => n.id === node.id) || null);
  }, [nodes]);

  if (!nodes.length) return <div className="flex items-center justify-center h-96 text-white/25 text-sm">No entities discovered yet</div>;

  return (
    <div className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden" style={{ height: 650 }}>
      <ReactFlow nodes={flowNodes} edges={flowEdges} onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.3 }} proOptions={{ hideAttribution: true }} minZoom={0.3} maxZoom={1.5}>
        <Background color="rgba(255,255,255,0.04)" gap={24} size={1} />
        <Controls style={{ background: "rgba(0,0,0,0.6)", borderColor: "rgba(255,255,255,0.1)", borderRadius: 8 }} />
        <MiniMap nodeColor={(n) => riskColor((n.data?.risk_score as number) || 0)} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 backdrop-blur-xl bg-black/50 border border-white/[0.08] rounded-xl px-4 py-2.5 flex items-center gap-5 text-[11px] text-white/30 z-10">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-green-400" /> Low</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-yellow-400" /> Medium</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-red-400" /> High</div>
        <div className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-red-400" /> Suspicious</div>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div className="absolute top-0 right-0 w-72 h-full backdrop-blur-2xl bg-black/60 border-l border-white/[0.08] p-6 overflow-y-auto z-20">
          <div className="flex justify-between mb-5">
            <h3 className="text-sm font-semibold text-white/90 pr-4 leading-snug">{selectedNode.name}</h3>
            <button onClick={() => setSelectedNode(null)} className="text-white/30 hover:text-white text-lg shrink-0">&times;</button>
          </div>
          <div className="space-y-4 text-sm">
            <Row label="Type" value={selectedNode.entity_type.replace("_", " ")} />
            <div className="flex justify-between">
              <span className="text-white/30">Risk</span>
              <span className="font-mono font-semibold" style={{ color: riskColor(selectedNode.risk_score) }}>{(selectedNode.risk_score * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${selectedNode.risk_score * 100}%`, backgroundColor: riskColor(selectedNode.risk_score) }} />
            </div>
            {Object.keys(selectedNode.attributes).length > 0 && (
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <span className="text-[10px] text-white/25 uppercase tracking-wider">Attributes</span>
                {Object.entries(selectedNode.attributes).map(([k, v]) => <Row key={k} label={k} value={String(v)} />)}
              </div>
            )}
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <span className="text-[10px] text-white/25 uppercase tracking-wider">Connections</span>
              {edges.filter(e => e.source_id === selectedNode.id || e.target_id === selectedNode.id).map((e, i) => {
                const other = nodes.find(n => n.id === (e.source_id === selectedNode.id ? e.target_id : e.source_id));
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs py-0.5 ${e.is_suspicious ? "text-red-400" : "text-white/40"}`}>
                    {e.is_suspicious && <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />}
                    <span>{e.relationship} &rarr; {other?.name || "Unknown"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-white/30 capitalize">{label}</span>
      <span className="text-white/60 font-medium capitalize">{value}</span>
    </div>
  );
}
