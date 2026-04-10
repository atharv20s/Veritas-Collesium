export interface InvestigationRequest {
  query: string;
  target_entity: string;
  investigation_depth: "quick" | "standard" | "deep";
  focus_areas: ("claims" | "financials" | "people" | "legal" | "esg")[];
}

export interface Claim {
  id: string;
  text: string;
  source_url: string;
  source_type: "official" | "news" | "legal" | "social" | "historical";
  timestamp: string;
  confidence: number;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  status: "verified" | "disputed" | "unverified" | "false";
}

export interface CrawlCertificate {
  url: string;
  crawl_timestamp: string;
  dom_snapshot_path: string;
  screenshot_path: string;
  interaction_log: string[];
  openclaw_session_id: string;
}

export interface EntityNode {
  id: string;
  name: string;
  entity_type: "person" | "company" | "asset" | "legal_entity" | "location";
  attributes: Record<string, unknown>;
  risk_score: number;
}

export interface EntityEdge {
  source_id: string;
  target_id: string;
  relationship: string;
  confidence: number;
  is_suspicious: boolean;
  evidence_url: string;
}

export interface SimpleSummary {
  verdict_sentence: string;
  trust_label: string;
  trust_color: "green" | "yellow" | "orange" | "red";
  bullets: string[];
}

export interface RiskCategory {
  category: string;
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  findings: string[];
  evidence_urls: string[];
}

export interface PersonProfile {
  name: string;
  role: string;
  background: string;
  risk_flags: string[];
  prior_companies: string[];
  source_urls: string[];
}

export interface SourceReliability {
  source_name: string;
  source_type: string;
  reliability: "high" | "medium" | "low";
  rationale: string;
  url: string;
}

export interface ConflictDetail {
  id: string;
  title: string;
  severity: "minor" | "major" | "critical" | string;
  category: string;
  claim_a: string;
  claim_b: string;
  detailed_analysis: string;
  materiality: string;
  who_benefits: string;
  resolution_status: string;
  evidence_strength_a: number;
  evidence_strength_b: number;
}

export interface InvestigationReport {
  id: string;
  request: InvestigationRequest;
  truth_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  claims: Claim[];
  entity_graph: { nodes: EntityNode[]; edges: EntityEdge[] };
  timeline_events: Record<string, unknown>[];
  conflict_report: string;
  conflict_details?: ConflictDetail[];
  audit_certificates: CrawlCertificate[];
  simple_summary?: SimpleSummary;
  generated_at: string;
  // Deep-analysis sections
  executive_narrative?: string;
  risk_breakdown?: RiskCategory[];
  key_people?: PersonProfile[];
  financial_analysis?: string;
  legal_exposure?: string;
  source_reliability_matrix?: SourceReliability[];
  methodology_note?: string;
}

export interface QASource {
  text: string;
  url: string;
  source_type: "official" | "news" | "legal" | "social" | "historical";
  reliability: "high" | "medium" | "low";
}

export interface QAResponse {
  query: string;
  answer: string;
  confidence: number;
  verified: boolean;
  sources: QASource[];
  caveats: string[];
  generated_at: string;
}

export interface AgentEvent {
  event_type:
    | "thinking"
    | "crawling"
    | "screenshot"
    | "claim_found"
    | "conflict_detected"
    | "human_required"
    | "complete"
    | "claims_data"
    | "graph_data"
    | "timeline_data"
    | "report_ready";
  agent_id: string;
  message: string;
  data: Record<string, unknown> | null;
  timestamp: string;
}

export interface StreamEvent extends AgentEvent {
  is_hunter: boolean;
}

export interface TimelineEvent {
  id: string;
  date: string;
  lane: "official" | "external";
  title: string;
  description: string;
  source_url: string;
  is_conflict: boolean;
  conflict_pair_id?: string;
}
