import { InvestigationState } from "./investigation_state";
import { tavily } from "@tavily/core";
import { GoogleGenerativeAI } from "@google-genai/generative-ai";
import axios from "axios";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─── 1. Hunter Agent ────────────────────────────────────────────────────────

export async function hunterNode(state: InvestigationState) {
    console.log(`🕵️ [HUNTER] Investigating: ${state.target}`);
    
    const events = [];
    events.push({ type: 'crawling', message: `Searching web for ${state.target}...` });

    const searchResponse = await tvly.search(state.target, {
        searchDepth: "advanced",
        maxResults: 5
    });

    const newClaims = searchResponse.results.map((result: any, index: number) => ({
        id: `claim_${Date.now()}_${index}`,
        content: result.content,
        source: result.url,
        confidence: 0.8,
        timestamp: Date.now()
    }));

    for (const claim of newClaims) {
        events.push({ type: 'claim_found', message: `Extracted claim from ${claim.source}`, data: claim });
    }

    // Mock screenshot
    events.push({ type: 'screenshot', message: `Captured proof for ${state.target}`, data: { url: searchResponse.results[0]?.url } });

    return {
        claims: newClaims,
        events: events,
        status: 'RESEARCHING'
    };
}

// ─── 2. Skeptic Agent ───────────────────────────────────────────────────────

export async function skepticNode(state: InvestigationState) {
    console.log(`🧐 [SKEPTIC] Cross-examining ${state.claims.length} claims...`);
    
    const events = [];
    const conflicts = [];

    for (const claim of state.claims) {
        // Simple mock: if claim contains "scam" or "warning", skeptic flags it
        if (claim.content.toLowerCase().includes("scam") || claim.content.toLowerCase().includes("warning")) {
            const conflict = {
                claimId: claim.id,
                evidence: `Conflicting report found regarding this entity's past behavior.`,
                severity: 'HIGH' as const
            };
            conflicts.push(conflict);
            events.push({ type: 'conflict_detected', message: `Potential conflict for claim ${claim.id}`, data: conflict });
        }
    }

    return {
        conflicts: conflicts,
        events: events
    };
}

// ─── 3. Human Handoff Node ─────────────────────────────────────────────────

export async function humanHandoffNode(state: InvestigationState) {
    if (state.conflicts.length > 0 && !state.human_input) {
        console.log("✋ [HUMAN_HANDOFF] Conflict detected. Pausing for human input...");
        return {
            status: 'WAITING_FOR_HUMAN',
            events: [{ type: 'human_required', message: "Multiple conflicting claims found. How should I proceed?" }]
        };
    }
    return { status: 'SYNTHESIZING' };
}

// ─── 4. Synthesizer Node ────────────────────────────────────────────────────

export async function synthesizerNode(state: InvestigationState) {
    console.log("🧠 [SYNTHESIZER] Generating structured report via Gemini 2.5 Flash...");
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
        As an expert investigator, synthesize a structured report for the target: ${state.target}
        
        Claims found:
        ${JSON.stringify(state.claims, null, 2)}
        
        Conflicts detected:
        ${JSON.stringify(state.conflicts, null, 2)}
        
        Human Input:
        ${state.human_input || "None"}
        
        Generate a JSON report that matches this exact structure:
        {
            "id": "inv_${Date.now()}",
            "truth_score": (number 0-100),
            "risk_level": ("low" | "medium" | "high" | "critical"),
            "generated_at": "${new Date().toISOString()}",
            "request": {
                "target_entity": "${state.target}",
                "query": "Investigation into ${state.target}",
                "investigation_depth": "deep",
                "focus_areas": ["all"]
            },
            "simple_summary": {
                "verdict_sentence": (short summary sentence),
                "trust_label": (e.g. "Trusted", "Suspicious"),
                "trust_color": ("green" | "yellow" | "orange" | "red"),
                "bullets": [string, string, ...]
            },
            "executive_narrative": (detailed string),
            "risk_breakdown": [
                { "category": string, "score": number, "severity": string, "findings": [string] }
            ],
            "key_people": [
                { "name": string, "role": string, "background": string, "risk_flags": [string] }
            ],
            "financial_analysis": (string),
            "legal_exposure": (string),
            "conflict_report": (narrative string),
            "conflict_details": [
                { "id": string, "severity": string, "title": string, "claim_a": string, "claim_b": string, "detailed_analysis": string }
            ],
            "source_reliability_matrix": [
                { "source_name": string, "source_type": string, "reliability": string, "rationale": string }
            ],
            "claims": (the input claims),
            "audit_certificates": [],
            "entity_graph": { "nodes": [], "edges": [] },
            "timeline_events": []
        }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Attempt to parse JSON from response
    let report;
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        report = jsonMatch ? JSON.parse(jsonMatch[0]) : { narrative: text };
    } catch (e) {
        report = { narrative: text };
    }

    return {
        report: report,
        status: 'COMPLETED',
        events: [{ type: 'synthesis_complete', message: "Report generated successfully." }]
    };
}
