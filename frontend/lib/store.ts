import { create } from "zustand";
import type {
  StreamEvent,
  InvestigationRequest,
  InvestigationReport,
  Claim,
  EntityNode,
  EntityEdge,
  TimelineEvent,
  QAResponse,
} from "@/types";

interface Notification {
  id: string;
  type: "info" | "warning" | "conflict" | "success";
  message: string;
  timestamp: string;
  persistent?: boolean;
  data?: Record<string, unknown>;
}

interface VeritasStore {
  // Connection
  investigationId: string | null;
  isConnected: boolean;
  isInvestigating: boolean;
  isDemoMode: boolean;

  // Events
  hunterEvents: StreamEvent[];
  skepticEvents: StreamEvent[];
  allEvents: StreamEvent[];

  // Data
  claims: Claim[];
  entityNodes: EntityNode[];
  entityEdges: EntityEdge[];
  timelineEvents: TimelineEvent[];
  report: InvestigationReport | null;

  // Metrics
  truthScore: number;
  riskLevel: string;
  conflictScore: number;
  sourcesCrawled: number;
  claimsFound: number;
  conflictsCount: number;

  // Human handoff
  humanInputRequired: boolean;
  humanQuestion: string;

  // Notifications
  notifications: Notification[];

  // Recent investigations
  recentInvestigations: { id: string; query: string; timestamp: string }[];

  // View
  viewMode: "live" | "report";

  // Q&A mode
  qaMode: boolean;
  qaLoading: boolean;
  qaResponse: QAResponse | null;

  // Actions
  startInvestigation: (request: InvestigationRequest) => Promise<void>;
  startDemo: () => Promise<void>;
  submitQuestion: (query: string) => Promise<void>;
  respondToHandoff: (answer: string) => Promise<void>;
  loadInvestigation: (data: Record<string, unknown>) => void;
  addNotification: (n: Omit<Notification, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  setViewMode: (mode: "live" | "report") => void;
  reset: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const initialState = {
  investigationId: null as string | null,
  isConnected: false,
  isInvestigating: false,
  isDemoMode: false,
  hunterEvents: [] as StreamEvent[],
  skepticEvents: [] as StreamEvent[],
  allEvents: [] as StreamEvent[],
  claims: [] as Claim[],
  entityNodes: [] as EntityNode[],
  entityEdges: [] as EntityEdge[],
  timelineEvents: [] as TimelineEvent[],
  report: null as InvestigationReport | null,
  truthScore: 0,
  riskLevel: "",
  conflictScore: 0,
  sourcesCrawled: 0,
  claimsFound: 0,
  conflictsCount: 0,
  humanInputRequired: false,
  humanQuestion: "",
  notifications: [] as Notification[],
  viewMode: "live" as "live" | "report",
  qaMode: false,
  qaLoading: false,
  qaResponse: null as QAResponse | null,
};

export const useVeritasStore = create<VeritasStore>((set, get) => ({
  ...initialState,
  recentInvestigations: [],

  reset: () => set({ ...initialState }),

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      notifications: [...s.notifications.slice(-3), notification],
    }));
  },

  removeNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  submitQuestion: async (query) => {
    const state = get();
    state.reset();
    set({ qaMode: true, qaLoading: true });

    try {
      const res = await fetch(`${API_URL}/api/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      set({ qaResponse: data as QAResponse, qaLoading: false });

      // Save to recent
      const recent = get().recentInvestigations;
      const newRecent = [
        { id: crypto.randomUUID(), query, timestamp: new Date().toISOString() },
        ...recent,
      ].slice(0, 5);
      set({ recentInvestigations: newRecent });
      try { localStorage.setItem("veritas-recent", JSON.stringify(newRecent)); } catch {}
    } catch {
      set({ qaLoading: false });
      get().addNotification({ type: "warning", message: "Failed to get answer" });
    }
  },

  loadInvestigation: (data: Record<string, unknown>) => {
    const state = get();
    state.reset();

    const result = data.result as Record<string, unknown> | null;
    if (!result) return;

    const report = (result.report || null) as InvestigationReport | null;
    const claims = (result.claims || []) as Claim[];
    const graph = (result.graph || { nodes: [], edges: [] }) as { nodes: EntityNode[]; edges: EntityEdge[] };
    const timeline = (result.timeline || []) as TimelineEvent[];
    const events = (result.events || []) as StreamEvent[];

    // Build a synthetic complete event if events are empty
    const allEvents: StreamEvent[] = events.length > 0
      ? events.map((e) => ({ ...e, is_hunter: (e as unknown as Record<string, unknown>).agent_id === "hunter" }))
      : [{
          event_type: "complete" as const,
          agent_id: "system",
          message: "Loaded from history",
          data: null,
          timestamp: new Date().toISOString(),
          is_hunter: false,
        }];

    set({
      investigationId: data.id as string,
      isInvestigating: false,
      report,
      claims,
      entityNodes: graph.nodes || [],
      entityEdges: graph.edges || [],
      timelineEvents: timeline,
      allEvents,
      truthScore: (data.truth_score as number) || report?.truth_score || 0,
      riskLevel: (data.risk_level as string) || report?.risk_level || "",
      sourcesCrawled: allEvents.filter((e) => e.event_type === "crawling").length,
      claimsFound: claims.length,
      conflictsCount: allEvents.filter((e) => e.event_type === "conflict_detected").length,
      viewMode: "report",
    });
  },

  startInvestigation: async (request) => {
    const state = get();
    state.reset();

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // Attach auth token if available
      try {
        const token = localStorage.getItem("veritas-token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch {}

      const res = await fetch(`${API_URL}/api/investigate`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });
      const data = await res.json();
      const investigationId = data.investigation_id;

      set({ investigationId, isInvestigating: true });

      // Save to recent
      const recent = get().recentInvestigations;
      const newRecent = [
        { id: investigationId, query: request.query, timestamp: new Date().toISOString() },
        ...recent,
      ].slice(0, 5);
      set({ recentInvestigations: newRecent });
      try { localStorage.setItem("veritas-recent", JSON.stringify(newRecent)); } catch {}

      _connectSSE(investigationId, set, get);
    } catch {
      get().addNotification({ type: "warning", message: "Failed to start investigation" });
    }
  },

  startDemo: async () => {
    const state = get();
    state.reset();
    set({ isInvestigating: true, isDemoMode: true });

    try {
      const eventSource = new EventSource(`${API_URL}/api/demo`);
      const investigationId = `demo-${Date.now()}`;
      set({ investigationId, isConnected: true });

      eventSource.onmessage = (e) => {
        const parsed = JSON.parse(e.data);
        _processEvent(parsed, set, get);
        // Close cleanly when complete event arrives
        if (parsed.event_type === "complete") {
          eventSource.close();
          set({ isConnected: false });
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // If stream ends and investigation is still "active", finalize it
        const current = get();
        if (current.isInvestigating && current.isDemoMode) {
          set({ isInvestigating: false, isConnected: false });
        } else {
          set({ isConnected: false });
        }
      };
    } catch {
      get().addNotification({ type: "warning", message: "Failed to start demo" });
    }
  },

  respondToHandoff: async (answer) => {
    const { investigationId } = get();
    if (!investigationId) return;

    try {
      await fetch(`${API_URL}/api/investigate/${investigationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      set({ humanInputRequired: false, humanQuestion: "" });
    } catch {
      get().addNotification({ type: "warning", message: "Failed to send response" });
    }
  },
}));

function _connectSSE(
  investigationId: string,
  set: (partial: Partial<VeritasStore> | ((s: VeritasStore) => Partial<VeritasStore>)) => void,
  get: () => VeritasStore,
) {
  const eventSource = new EventSource(
    `${API_URL}/api/investigate/${investigationId}/stream`
  );

  set({ isConnected: true });

  eventSource.onmessage = (e) => {
    const parsed = JSON.parse(e.data);
    _processEvent(parsed, set, get);
    if (parsed.event_type === "complete") {
      eventSource.close();
      set({ isConnected: false });
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    const current = get();
    if (current.isInvestigating) {
      set({ isInvestigating: false, isConnected: false });
    } else {
      set({ isConnected: false });
    }
  };
}

function _processEvent(
  event: Record<string, unknown>,
  set: (partial: Partial<VeritasStore> | ((s: VeritasStore) => Partial<VeritasStore>)) => void,
  get: () => VeritasStore,
) {
  const agentId = event.agent_id as string;
  const eventType = event.event_type as string;
  const message = event.message as string;
  const data = (event.data || {}) as Record<string, unknown>;

  const isHunter = agentId === "hunter";
  const streamEvent: StreamEvent = {
    ...(event as unknown as StreamEvent),
    is_hunter: isHunter,
  };

  set((s) => {
    const updates: Partial<VeritasStore> = {
      allEvents: [...s.allEvents, streamEvent],
    };

    if (isHunter) {
      updates.hunterEvents = [...s.hunterEvents, streamEvent];
    } else if (agentId === "skeptic" || agentId === "analyzer" || agentId === "synthesizer" || agentId === "planner" || agentId === "domain_specialist" || agentId === "financial_analyst" || agentId === "legal_analyst" || agentId === "conflict_analyst" || agentId === "entity_builder" || agentId === "timeline_builder" || agentId === "report_writer") {
      updates.skepticEvents = [...s.skepticEvents, streamEvent];
    }

    // Update metrics
    if (eventType === "crawling") {
      updates.sourcesCrawled = s.sourcesCrawled + 1;
    }
    if (eventType === "claim_found") {
      updates.claimsFound = s.claimsFound + 1;
    }
    if (eventType === "conflict_detected") {
      updates.conflictsCount = s.conflictsCount + 1;
      updates.conflictScore = Math.min(1, (s.conflictsCount + 1) / 10);
    }

    // Human handoff
    if (eventType === "human_required") {
      updates.humanInputRequired = true;
      updates.humanQuestion = message;
    }

    // Structured data events
    if (eventType === "claims_data" && data.claims) {
      updates.claims = data.claims as Claim[];
    }
    if (eventType === "graph_data") {
      if (data.nodes) updates.entityNodes = data.nodes as EntityNode[];
      if (data.edges) updates.entityEdges = data.edges as EntityEdge[];
    }
    if (eventType === "timeline_data" && data.events) {
      updates.timelineEvents = data.events as TimelineEvent[];
    }
    if (eventType === "report_ready" && data.report) {
      const rpt = data.report as InvestigationReport;
      updates.report = rpt;
      updates.viewMode = "report";
      // Also extract timeline from report as fallback
      if (rpt.timeline_events && rpt.timeline_events.length > 0 && !s.timelineEvents.length) {
        updates.timelineEvents = rpt.timeline_events as unknown as TimelineEvent[];
      }
    }

    // Complete
    if (eventType === "complete") {
      updates.isInvestigating = false;
      if (data.truth_score !== undefined) updates.truthScore = data.truth_score as number;
      if (data.risk_level) updates.riskLevel = data.risk_level as string;
    }

    return updates;
  });

  // Notifications
  const store = get();
  if (eventType === "claim_found") {
    store.addNotification({ type: "info", message: `New claim extracted: ${message.slice(0, 60)}...` });
  } else if (eventType === "conflict_detected") {
    store.addNotification({ type: "conflict", message: `⚠ ${message.slice(0, 80)}` });
  } else if (eventType === "screenshot") {
    store.addNotification({ type: "info", message: "Visual evidence captured" });
  } else if (eventType === "human_required") {
    store.addNotification({ type: "warning", message: "Agent requires strategic input", persistent: true });
  } else if (eventType === "complete") {
    store.addNotification({ type: "success", message: `Investigation complete — Truth Score: ${data.truth_score || "N/A"}` });
  }
}

// Load recent investigations from localStorage — deferred to avoid hydration mismatch
if (typeof window !== "undefined") {
  // Run after hydration completes, not at module import time
  setTimeout(() => {
    try {
      const stored = localStorage.getItem("veritas-recent");
      if (stored) {
        useVeritasStore.setState({ recentInvestigations: JSON.parse(stored) });
      }
    } catch {}
  }, 0);
}
