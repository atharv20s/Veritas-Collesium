"use client";

import { motion } from "framer-motion";
import type { InvestigationReport } from "@/types";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageBreak, TabStopPosition, TabStopType,
} from "docx";
import { saveAs } from "file-saver";

async function exportReport(report: InvestigationReport) {
  const date = new Date(report.generated_at).toLocaleString();
  const verified = report.claims.filter(c => c.status === "verified");
  const disputed = report.claims.filter(c => c.status === "disputed");
  const falseClaims = report.claims.filter(c => c.status === "false");
  const unverified = report.claims.filter(c => c.status === "unverified");
  const nodes = (report.entity_graph?.nodes || []) as any[];
  const edges = (report.entity_graph?.edges || []) as any[];
  const timeline = (report.timeline_events || []) as any[];
  const certs = (report.audit_certificates || []) as any[];
  const summary = report.simple_summary;

  const GRAY = "666666";
  const BLACK = "111111";
  const LIGHT_BG = "F5F5F5";

  const hr = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } }, spacing: { after: 200 } });
  const gap = (pts = 120) => new Paragraph({ spacing: { after: pts } });
  const heading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) =>
    new Paragraph({ heading: level, spacing: { before: 300, after: 100 }, children: [new TextRun({ text, bold: true, color: BLACK, font: "Calibri" })] });
  const body = (text: string, opts?: { bold?: boolean; italic?: boolean; color?: string }) =>
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, size: 22, font: "Calibri", color: opts?.color || "333333", bold: opts?.bold, italics: opts?.italic })] });
  const small = (text: string, color = GRAY) =>
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text, size: 18, font: "Calibri", color })] });

  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  const headerCell = (text: string) => new TableCell({
    shading: { type: ShadingType.SOLID, color: "E8E8E8" },
    borders,
    width: { size: 0, type: WidthType.AUTO },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: "Calibri", color: BLACK })] })],
  });
  const dataCell = (text: string, color = "333333") => new TableCell({
    borders,
    width: { size: 0, type: WidthType.AUTO },
    children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: "Calibri", color })] })],
  });

  // ── Build sections ──
  const sections: Paragraph[] = [];

  // Title block
  sections.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "VERITAS-NEXUS", size: 20, font: "Calibri", color: GRAY, allCaps: true, characterSpacing: 200 })] }));
  sections.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Veritas Security Report", size: 16, font: "Calibri", color: GRAY, italics: true })] }));
  sections.push(hr());
  sections.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: report.request?.target_entity || "Target Entity", bold: true, size: 36, font: "Calibri", color: BLACK })] }));
  sections.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: `"${report.request?.query || ""}"`, size: 22, font: "Calibri", color: GRAY, italics: true })] }));
  sections.push(small(`Generated: ${date}  |  Depth: ${report.request?.investigation_depth?.toUpperCase() || "STANDARD"}  |  Focus: ${report.request?.focus_areas?.join(", ") || "ALL"}  |  Report ID: ${report.id}`));
  sections.push(hr());

  // Key metrics
  sections.push(heading("Key Metrics"));
  sections.push(body(`Truth Score: ${report.truth_score.toFixed(0)} / 100`, { bold: true }));
  sections.push(body(`Risk Level: ${report.risk_level.toUpperCase()}`, { bold: true, color: report.risk_level === "critical" ? "CC0000" : report.risk_level === "high" ? "CC6600" : BLACK }));
  sections.push(body(`Claims Analyzed: ${report.claims.length}  |  Verified: ${verified.length}  |  Disputed: ${disputed.length}  |  False: ${falseClaims.length}  |  Unverified: ${unverified.length}`));
  const uniqueSourceUrls = new Set(report.claims.map(c => c.source_url).filter(Boolean));
  sections.push(body(`Sources: ${uniqueSourceUrls.size + certs.length}`));
  sections.push(hr());

  // Verdict
  if (summary?.verdict_sentence) {
    sections.push(heading("Verdict"));
    sections.push(body(`${summary.trust_label.toUpperCase()}`, { bold: true, color: summary.trust_color === "red" ? "CC0000" : summary.trust_color === "orange" ? "CC6600" : summary.trust_color === "yellow" ? "998800" : "228B22" }));
    sections.push(body(summary.verdict_sentence, { bold: true }));
    summary.bullets.forEach(b => {
      sections.push(new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [new TextRun({ text: b, size: 22, font: "Calibri", color: "333333" })] }));
    });
    sections.push(hr());
  }

  // Executive narrative
  if (report.executive_narrative) {
    sections.push(heading("Executive Narrative"));
    report.executive_narrative.split(/\n+/).forEach(line => {
      if (line.trim()) sections.push(body(line.trim()));
    });
    sections.push(hr());
  }

  // Risk breakdown
  if (report.risk_breakdown && report.risk_breakdown.length > 0) {
    sections.push(heading("Risk Breakdown"));
    const riskRows = [
      new TableRow({ children: [headerCell("Category"), headerCell("Score"), headerCell("Severity"), headerCell("Key Findings")] }),
      ...report.risk_breakdown.map((rb: any) => {
        const sevColor = rb.severity === "critical" ? "CC0000" : rb.severity === "high" ? "CC6600" : rb.severity === "medium" ? "998800" : "228B22";
        return new TableRow({ children: [
          dataCell((rb.category || "").toUpperCase()),
          dataCell(`${rb.score || 0}/100`),
          dataCell((rb.severity || "").toUpperCase(), sevColor),
          dataCell((rb.findings || []).join("; ")),
        ] });
      }),
    ];
    sections.push(new Table({ rows: riskRows, width: { size: 100, type: WidthType.PERCENTAGE } }) as any);
    sections.push(hr());
  }

  // Key people profiles
  if (report.key_people && report.key_people.length > 0) {
    sections.push(heading("Key People"));
    report.key_people.forEach((p: any) => {
      sections.push(body(`${p.name} — ${p.role || ""}`, { bold: true }));
      if (p.background) sections.push(body(p.background));
      if (p.risk_flags?.length > 0) sections.push(small(`Risk flags: ${p.risk_flags.join(", ")}`, "CC6600"));
      if (p.prior_companies?.length > 0) sections.push(small(`Prior: ${p.prior_companies.join(", ")}`));
      sections.push(gap(80));
    });
    sections.push(hr());
  }

  // Financial analysis
  if (report.financial_analysis) {
    sections.push(heading("Financial Analysis"));
    report.financial_analysis.split(/\n+/).forEach((line: string) => {
      if (line.trim()) sections.push(body(line.trim()));
    });
    sections.push(hr());
  }

  // Legal exposure
  if (report.legal_exposure) {
    sections.push(heading("Legal Exposure"));
    report.legal_exposure.split(/\n+/).forEach((line: string) => {
      if (line.trim()) sections.push(body(line.trim()));
    });
    sections.push(hr());
  }

  // Conflict analysis — narrative summary + structured table
  if (report.conflict_report || (report.conflict_details && report.conflict_details.length > 0)) {
    sections.push(heading("Conflict Analysis"));

    // Narrative summary
    if (report.conflict_report) {
      report.conflict_report.split(/\n+/).forEach(line => {
        if (line.trim()) sections.push(body(line.trim()));
      });
      sections.push(gap(120));
    }

    // Structured conflict table
    const conflicts = report.conflict_details || [];
    if (conflicts.length > 0) {
      sections.push(heading("Conflict Details", HeadingLevel.HEADING_3));

      const conflictRows = [
        new TableRow({ children: [
          headerCell("Severity"), headerCell("Conflict"), headerCell("Official Claim"),
          headerCell("Contradicting Evidence"), headerCell("Category"),
        ] }),
        ...conflicts.map((c: any) => {
          const sevColor = c.severity === "critical" ? "CC0000" : c.severity === "major" ? "CC6600" : "998800";
          return new TableRow({ children: [
            dataCell((c.severity || "").toUpperCase(), sevColor),
            dataCell(c.title || ""),
            dataCell(c.claim_a || ""),
            dataCell(c.claim_b || ""),
            dataCell((c.category || "").toUpperCase()),
          ] });
        }),
      ];
      sections.push(new Table({ rows: conflictRows, width: { size: 100, type: WidthType.PERCENTAGE } }) as any);
      sections.push(gap(120));

      // Detailed analysis for each conflict
      sections.push(heading("Detailed Conflict Analysis", HeadingLevel.HEADING_3));
      conflicts.forEach((c: any, i: number) => {
        const sevColor = c.severity === "critical" ? "CC0000" : c.severity === "major" ? "CC6600" : "998800";
        sections.push(body(`${i + 1}. [${(c.severity || "").toUpperCase()}] ${c.title || ""}`, { bold: true, color: sevColor }));
        if (c.detailed_analysis) sections.push(body(c.detailed_analysis));
        if (c.materiality) sections.push(body(`Materiality: ${c.materiality}`, { italic: true, color: GRAY }));
        if (c.who_benefits) sections.push(small(`Who benefits: ${c.who_benefits}`));
        sections.push(gap(80));
      });
    }
    sections.push(hr());
  }

  // Source reliability matrix
  if (report.source_reliability_matrix && report.source_reliability_matrix.length > 0) {
    sections.push(heading("Source Reliability"));
    const srcRows = [
      new TableRow({ children: [headerCell("Source"), headerCell("Type"), headerCell("Reliability"), headerCell("Rationale")] }),
      ...report.source_reliability_matrix.map((src: any) => {
        const relColor = src.reliability === "high" ? "228B22" : src.reliability === "low" ? "CC0000" : "998800";
        return new TableRow({ children: [
          dataCell(src.source_name || ""),
          dataCell(src.source_type || ""),
          dataCell((src.reliability || "").toUpperCase(), relColor),
          dataCell(src.rationale || ""),
        ] });
      }),
    ];
    sections.push(new Table({ rows: srcRows, width: { size: 100, type: WidthType.PERCENTAGE } }) as any);
    sections.push(hr());
  }

  // Methodology
  if (report.methodology_note) {
    sections.push(heading("Methodology"));
    report.methodology_note.split(/\n+/).forEach((line: string) => {
      if (line.trim()) sections.push(body(line.trim()));
    });
    sections.push(hr());
  }

  // Claims table
  sections.push(heading("Evidence — All Claims"));
  const claimRows = [
    new TableRow({ children: [headerCell("Claim"), headerCell("Status"), headerCell("Confidence"), headerCell("Source Type"), headerCell("Source URL")] }),
    ...report.claims.map(c => {
      let evidenceText = c.text;
      if (c.supporting_evidence.length > 0) evidenceText += "\n" + c.supporting_evidence.map(e => `  ✓ ${e}`).join("\n");
      if (c.contradicting_evidence.length > 0) evidenceText += "\n" + c.contradicting_evidence.map(e => `  ✗ ${e}`).join("\n");
      const statusColor = c.status === "verified" ? "228B22" : c.status === "false" ? "CC0000" : c.status === "disputed" ? "CC6600" : GRAY;
      return new TableRow({ children: [
        dataCell(evidenceText),
        dataCell(c.status.toUpperCase(), statusColor),
        dataCell(`${(c.confidence * 100).toFixed(0)}%`),
        dataCell(c.source_type),
        dataCell(c.source_url),
      ] });
    }),
  ];
  const claimTable = new Table({ rows: claimRows, width: { size: 100, type: WidthType.PERCENTAGE } });

  // Entity network
  const entityParagraphs: (Paragraph | Table)[] = [];
  if (nodes.length > 0) {
    entityParagraphs.push(heading("Entity Network"));
    entityParagraphs.push(body(`${nodes.length} entities identified, ${edges.length} relationships mapped.`));
    entityParagraphs.push(gap(80));

    const entityRows = [
      new TableRow({ children: [headerCell("Entity"), headerCell("Type"), headerCell("Risk"), headerCell("Attributes")] }),
      ...nodes.map((n: any) => {
        const attrs = n.attributes ? Object.entries(n.attributes).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
        const riskPct = ((n.risk_score || 0) * 100).toFixed(0);
        const riskCol = (n.risk_score || 0) >= 0.7 ? "CC0000" : (n.risk_score || 0) >= 0.4 ? "CC6600" : "228B22";
        return new TableRow({ children: [dataCell(n.name), dataCell((n.entity_type || "").replace("_", " ")), dataCell(`${riskPct}%`, riskCol), dataCell(attrs)] });
      }),
    ];
    entityParagraphs.push(new Table({ rows: entityRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    entityParagraphs.push(gap(120));

    entityParagraphs.push(heading("Relationships", HeadingLevel.HEADING_3));
    edges.forEach((e: any) => {
      const src = nodes.find((n: any) => n.id === e.source_id);
      const tgt = nodes.find((n: any) => n.id === e.target_id);
      const suspTag = e.is_suspicious ? "  [SUSPICIOUS]" : "";
      entityParagraphs.push(body(`${src?.name || "?"} → ${e.relationship} → ${tgt?.name || "?"}  (${(e.confidence * 100).toFixed(0)}%)${suspTag}`, e.is_suspicious ? { color: "CC0000" } : undefined));
    });
    entityParagraphs.push(hr());
  }

  // Timeline
  const timelineParagraphs: (Paragraph | Table)[] = [];
  if (timeline.length > 0) {
    timelineParagraphs.push(heading("Forensic Timeline"));
    timelineParagraphs.push(body(`${timeline.length} events identified. Events marked [CONFLICT] indicate contradictions between official claims and external evidence.`));
    timelineParagraphs.push(gap(80));

    const sortedTl = [...timeline].sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
    const tlRows = [
      new TableRow({ children: [headerCell("Date"), headerCell("Source"), headerCell("Event"), headerCell("Conflict")] }),
      ...sortedTl.map((t: any) => {
        const desc = [t.title || t.event || "", t.description || ""].filter(Boolean).join(" — ");
        return new TableRow({ children: [
          dataCell(t.date || ""),
          dataCell((t.lane || "external").toUpperCase()),
          dataCell(desc),
          dataCell(t.is_conflict ? "YES" : "", t.is_conflict ? "CC0000" : GRAY),
        ] });
      }),
    ];
    timelineParagraphs.push(new Table({ rows: tlRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    timelineParagraphs.push(hr());
  }

  // Audit trail
  const auditParagraphs: Paragraph[] = [];
  if (certs.length > 0) {
    auditParagraphs.push(heading("Crawl Audit Trail"));
    certs.forEach((c: any) => {
      auditParagraphs.push(body(c.url, { bold: true }));
      if (c.interaction_log?.length) auditParagraphs.push(small(`Steps: ${c.interaction_log.join(" → ")}`));
      if (c.openclaw_session_id) auditParagraphs.push(small(`Session: ${c.openclaw_session_id}`));
      auditParagraphs.push(gap(60));
    });
    auditParagraphs.push(hr());
  }

  // Footer
  const footer = [
    gap(200),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "VERITAS — SECURE DEFI AGENT TRANSACTION ENCLAVE", size: 16, font: "Calibri", color: "AAAAAA", allCaps: true, characterSpacing: 100 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: `Report generated ${date}. This document is for informational purposes only.`, size: 16, font: "Calibri", color: "AAAAAA", italics: true })] }),
  ];

  // ── Assemble document ──
  const doc = new Document({
    creator: "Veritas-Nexus",
    title: `Veritas Report — ${report.request?.target_entity || "Report"}`,
    description: report.request?.query || "",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: "333333" } },
        heading2: { run: { font: "Calibri", size: 28, bold: true, color: BLACK } },
        heading3: { run: { font: "Calibri", size: 24, bold: true, color: "444444" } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1200, bottom: 1000, left: 1200, right: 1200 },
        },
      },
      children: [
        ...sections,
        claimTable,
        gap(200),
        ...entityParagraphs,
        ...timelineParagraphs,
        ...auditParagraphs,
        ...footer,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const entitySlug = report.request.target_entity.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  saveAs(blob, `veritas-nexus-report-${entitySlug}.docx`);
}

const RISK_PILL: Record<string, string> = {
  low: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-300",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

export default function FinalReport({ report }: { report: InvestigationReport }) {
  const scoreColor = report.truth_score >= 70 ? "#22C55E" : report.truth_score >= 40 ? "#FBBF24" : "#EF4444";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1000px] mx-auto space-y-6 pb-8"
    >
      {/* Header */}
      <div className="text-center space-y-2 py-4">
        <div className="text-[11px] text-white/25 uppercase tracking-[0.2em] font-medium">
          Veritas Security Report
        </div>
        <h1 className="text-2xl font-semibold text-white/90">{report.request?.target_entity || "Security Analysis"}</h1>
        <div className="text-[11px] text-white/20 font-mono">{report.generated_at ? new Date(report.generated_at).toLocaleString() : ""}</div>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassMetric label="Truth Score" value={`${report.truth_score.toFixed(0)}`} color={scoreColor} large />
        <GlassMetric label="Risk Level" badge badgeClass={RISK_PILL[report.risk_level]} value={report.risk_level.toUpperCase()} />
        <GlassMetric label="Claims Analyzed" value={`${report.claims.length}`} />
        <GlassMetric label="Sources" value={`${new Set(report.claims.map(c => c.source_url).filter(Boolean)).size + report.audit_certificates.length}`} />
      </div>

      {/* Executive summary */}
      <GlassCard title="Executive Summary">
        <p className="text-sm text-white/50 leading-relaxed">
          Investigation of &ldquo;{report.request.target_entity}&rdquo; yields a truth score of{" "}
          <strong className="text-white/80">{report.truth_score.toFixed(0)}/100</strong> with{" "}
          <span className={RISK_PILL[report.risk_level]?.split(" ")[1] || "text-white/80"}>
            {report.risk_level.toUpperCase()}
          </span>{" "}risk.
        </p>
        <ul className="mt-3 space-y-2">
          {report.claims
            .filter((c) => c.status === "false" || c.status === "disputed")
            .slice(0, 10)
            .map((claim) => (
              <li key={claim.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${claim.status === "false" ? "bg-red-400" : "bg-yellow-400"}`} />
                <span className="text-white/40">{claim.text}</span>
              </li>
            ))}
        </ul>
      </GlassCard>

      {/* Conflict analysis — narrative + table */}
      {(report.conflict_report || (report.conflict_details && report.conflict_details.length > 0)) && (
        <div className="space-y-4">
          {/* Narrative summary */}
          {report.conflict_report && (
            <GlassCard title="Conflict Analysis">
              <p className="text-sm text-white/40 leading-relaxed whitespace-pre-wrap">{report.conflict_report}</p>
            </GlassCard>
          )}

          {/* Structured conflict table */}
          {report.conflict_details && report.conflict_details.length > 0 && (
            <div className="backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.05]">
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Conflict Details — {report.conflict_details.length} Contradictions Found
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-white/30 text-[11px] uppercase tracking-wider">
                      <th className="text-left py-3 px-4 font-medium w-[80px]">Severity</th>
                      <th className="text-left py-3 px-4 font-medium">Conflict</th>
                      <th className="text-left py-3 px-4 font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.conflict_details.map((c, i) => (
                      <tr key={c.id || i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors align-top">
                        <td className="py-3 px-4">
                          <SeverityPill severity={c.severity} />
                        </td>
                        <td className="py-3 px-4 space-y-2">
                          <div className="text-white/70 font-medium text-sm">{c.title}</div>
                          <div className="flex gap-3 text-xs">
                            <div className="flex-1 bg-green-500/5 border border-green-500/10 rounded-lg p-2.5">
                              <div className="text-green-400/60 text-[10px] uppercase tracking-wider mb-1 font-medium">Official Claim</div>
                              <div className="text-white/40 leading-relaxed">{c.claim_a}</div>
                            </div>
                            <div className="flex-1 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
                              <div className="text-red-400/60 text-[10px] uppercase tracking-wider mb-1 font-medium">Contradicting Evidence</div>
                              <div className="text-white/40 leading-relaxed">{c.claim_b}</div>
                            </div>
                          </div>
                          {c.detailed_analysis && (
                            <div className="text-white/30 text-xs leading-relaxed mt-1">{c.detailed_analysis}</div>
                          )}
                          {c.materiality && (
                            <div className="text-white/20 text-[11px] italic">Materiality: {c.materiality}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40 uppercase">
                            {c.category || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence table */}
      <div className="backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.05]">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Evidence Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05] text-white/30 text-[11px] uppercase tracking-wider">
                <th className="text-left py-3 px-5 font-medium">Claim</th>
                <th className="text-left py-3 px-5 font-medium">Status</th>
                <th className="text-left py-3 px-5 font-medium">Confidence</th>
                <th className="text-left py-3 px-5 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {report.claims.map((claim) => (
                <tr key={claim.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-5 text-white/45 max-w-md whitespace-normal">{claim.text}</td>
                  <td className="py-3 px-5"><StatusPill status={claim.status} /></td>
                  <td className="py-3 px-5 font-mono text-white/30">{(claim.confidence * 100).toFixed(0)}%</td>
                  <td className="py-3 px-5 text-white/25 capitalize">{claim.source_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tagline */}
      <div className="border-l-2 border-blue-400/40 pl-4 py-2">
        <p className="text-sm text-white/20 italic">&ldquo;Veritas — Hardware-secured, RL-optimized security for AI agent wallets.&rdquo;</p>
      </div>

      {/* Export */}
      <div className="flex gap-3 justify-center">
        <button onClick={() => { exportReport(report); }} className="px-6 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors">
          Export Report (.docx)
        </button>
        <button onClick={() => navigator.clipboard.writeText(report.id)} className="px-4 py-2.5 backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] text-white/50 text-sm font-medium rounded-lg hover:text-white/80 transition-colors">
          Copy Report ID
        </button>
      </div>
    </motion.div>
  );
}

function GlassCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.06] p-6">
      <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

function GlassMetric({ label, value, color, large, badge, badgeClass }: {
  label: string; value: string; color?: string; large?: boolean; badge?: boolean; badgeClass?: string;
}) {
  return (
    <div className="backdrop-blur-2xl bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 text-center flex flex-col justify-center min-h-[80px]">
      <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{label}</div>
      {badge ? (
        <div className={`text-xs font-semibold uppercase px-2 py-1 rounded-full inline-block mx-auto ${badgeClass}`}>{value}</div>
      ) : (
        <div className={`font-mono font-bold ${large ? "text-3xl" : "text-xl"}`} style={color ? { color } : { color: "rgba(255,255,255,0.7)" }}>{value}</div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s: Record<string, string> = {
    verified: "bg-green-500/20 text-green-400",
    disputed: "bg-yellow-500/20 text-yellow-300",
    false: "bg-red-500/20 text-red-400",
    unverified: "bg-white/[0.05] text-white/30",
  };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s[status] || s.unverified}`}>{status.toUpperCase()}</span>;
}

function SeverityPill({ severity }: { severity: string }) {
  const s: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/20",
    major: "bg-orange-500/20 text-orange-400 border-orange-500/20",
    minor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/20",
  };
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${s[severity] || "bg-white/[0.05] text-white/30 border-white/10"}`}>
      {(severity || "unknown").toUpperCase()}
    </span>
  );
}
