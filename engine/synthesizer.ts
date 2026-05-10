import { GoogleGenerativeAI } from "@google-genai/generative-ai";

export class Synthesizer {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * TEE threat reports on Solana token scans
     */
    async synthesizeThreatReport(scanData: any, sentinelReport: any) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            As a Senior Security Researcher at Veritas Enclave, synthesize a threat report for the following Solana token scan data:
            
            Token Data:
            ${JSON.stringify(scanData, null, 2)}
            
            Sentinel Brain Risk Analysis:
            ${JSON.stringify(sentinelReport, null, 2)}
            
            Please provide:
            1. Executive Narrative (Premium tone)
            2. Risk Breakdown by Category
            3. Financial Exposure Analysis
            4. Legal/Compliance Summary
            5. Final Verdict Sentence + Trust Color (Green, Yellow, Red)
            
            Format the response as a structured report.
        `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    }

    /**
     * Investigation Summary
     */
    async synthesizeInvestigationSummary(target: string, claims: any[], conflicts: any[]) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Summarize the investigation findings for target: ${target}
            
            Claims: ${JSON.stringify(claims)}
            Conflicts: ${JSON.stringify(conflicts)}
            
            Provide a concise, hard-hitting executive summary of the investigation.
        `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    }
}
