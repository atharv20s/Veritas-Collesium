/**
 * ============================================================================
 * SENTINEL ENCLAVE — DeepSeek-R1 Sovereign Brain Auditor
 * ============================================================================
 * 
 * Phase 2 of the "Grand Champion" architecture.
 * 
 * DeepSeek-R1 serves as the AI Auditor that "thinks" through every
 * transaction before the TD3 engine "decides."
 * 
 * Flow:
 *   1. Eliza/Agent proposes a trade
 *   2. DeepSeek-R1 reasons through it (chain-of-thought):
 *      - Detects sandwich attack patterns
 *      - Identifies rug-pull signatures
 *      - Analyzes slippage manipulation
 *      - Cross-references known scam patterns
 *   3. DeepSeek outputs:
 *      - Reasoning string (human-readable chain-of-thought)
 *      - JSON risk score (feeds into TD3 state vector)
 *   4. TD3 uses DeepSeek's score as part of its state vector [S, L, V, AuditorScore]
 * 
 * This is the "CEO" brain — institutional-grade reasoning before
 * any transaction touches the chain.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeepSeekAuditRequest {
  tokenAddress: string;
  tokenSymbol?: string;
  action: "swap" | "transfer" | "stake" | "unstake" | "provide_liquidity";
  amountUsd: number;
  targetProtocol: string;
  poolLiquidity: number;
  priceImpact: number;
  tokenAge: number;           // hours
  holderConcentration: number; // 0-1
  mintAuthority: boolean;
  freezeAuthority: boolean;
  lpLocked: boolean;
  lpLockDuration: number;     // days
  creatorHistory: number;     // # of tokens deployed by creator
  volume24h: number;
}

export interface DeepSeekAuditResult {
  reasoning: string;           // Chain-of-thought reasoning
  riskScore: number;           // 0-100 (auditor's assessment)
  threatVector: string[];      // Identified threats
  recommendation: "APPROVE" | "REJECT" | "CAUTION";
  confidence: number;          // 0-1
  sandwichRisk: number;        // 0-10
  rugPullRisk: number;         // 0-10
  slippageManipulation: number; // 0-10
  timestamp: number;
  modelUsed: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DeepSeekConfig = {
  apiKey: "",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-reasoner",     // DeepSeek-R1 for chain-of-thought
  maxTokens: 2048,
  temperature: 0.1,               // Low temp for consistent risk analysis
  timeoutMs: 30000,
};

// ─── System Prompt ──────────────────────────────────────────────────────────

const AUDITOR_SYSTEM_PROMPT = `You are SENTINEL AUDITOR, an institutional-grade DeFi transaction security analyzer. You are the last line of defense before an AI agent's transaction touches the Solana blockchain.

Your job is to analyze a proposed DeFi transaction and output a structured risk assessment. You must think through every angle:

## What You Check:
1. **Sandwich Attack Risk**: Is this trade large enough relative to pool liquidity to be frontrun? Would a MEV bot profit from sandwiching this?
2. **Rug Pull Detection**: Does the token show signs of being a scam? (new token, concentrated holdings, active mint authority, unlocked LP)
3. **Slippage Manipulation**: Is the proposed slippage reasonable? Could the price move against us during execution?
4. **Protocol Risk**: Is the target protocol a known, audited DEX? Or an unknown contract?
5. **Economic Anomalies**: Is the trade amount proportional to pool liquidity? Is the volume suspicious?
6. **Creator Red Flags**: Has the token creator deployed many tokens before (serial rug-puller)?

## Output Format (STRICT JSON):
You MUST output ONLY valid JSON with this exact structure:
{
  "reasoning": "Your chain-of-thought analysis (2-3 sentences)",
  "riskScore": <0-100>,
  "threatVector": ["list", "of", "identified", "threats"],
  "recommendation": "APPROVE" | "REJECT" | "CAUTION",
  "confidence": <0.0-1.0>,
  "sandwichRisk": <0-10>,
  "rugPullRisk": <0-10>,
  "slippageManipulation": <0-10>
}

Risk Score Guidelines:
- 0-20: Safe (well-established token, deep liquidity, low slippage)
- 21-40: Low risk (known token, reasonable parameters)
- 41-60: Medium risk (some red flags, needs attention)
- 61-80: High risk (multiple red flags, likely dangerous)
- 81-100: Critical (almost certainly a scam/attack)

Be aggressive in protecting the agent's funds. When in doubt, assign HIGHER risk scores. A false positive (blocking a safe trade) is infinitely better than a false negative (allowing a rug pull).`;

// ─── DeepSeek Auditor Class ────────────────────────────────────────────────

export class DeepSeekAuditor {
  private config: DeepSeekConfig;
  private auditLog: DeepSeekAuditResult[] = [];
  private totalTokensUsed: number = 0;

  constructor(config: Partial<DeepSeekConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Audit a proposed transaction using DeepSeek-R1
   * This is the core "thinking" step before TD3 "decides"
   */
  async auditTransaction(request: DeepSeekAuditRequest): Promise<DeepSeekAuditResult> {
    const startTime = Date.now();

    // Build the analysis prompt
    const userPrompt = this.buildAnalysisPrompt(request);

    try {
      // Call DeepSeek-R1 API
      const response = await this.callDeepSeek(userPrompt);
      const latencyMs = Date.now() - startTime;

      // Parse the structured response
      const result = this.parseAuditResponse(response, latencyMs);

      // Log the audit
      this.auditLog.push(result);
      this.totalTokensUsed += result.tokensUsed;

      console.log("\n┌──────────────────────────────────────────────────────┐");
      console.log("│         DEEPSEEK-R1 SOVEREIGN BRAIN AUDIT            │");
      console.log("├──────────────────────────────────────────────────────┤");
      console.log(`│  Token: ${request.tokenAddress.substring(0, 40).padEnd(42)}│`);
      console.log(`│  Action: ${request.action.toUpperCase().padEnd(41)}│`);
      console.log(`│  Amount: $${request.amountUsd.toLocaleString().padEnd(39)}│`);
      console.log(`│  Auditor Score: ${String(result.riskScore).padEnd(34)}│`);
      console.log(`│  Recommendation: ${result.recommendation.padEnd(32)}│`);
      console.log(`│  Sandwich Risk: ${String(result.sandwichRisk).padEnd(3)}/10                              │`);
      console.log(`│  Rug Pull Risk: ${String(result.rugPullRisk).padEnd(3)}/10                              │`);
      console.log(`│  Slippage Manip: ${String(result.slippageManipulation).padEnd(3)}/10                             │`);
      console.log(`│  Latency: ${latencyMs}ms`.padEnd(53) + "│");
      console.log("└──────────────────────────────────────────────────────┘");
      console.log(`  Reasoning: ${result.reasoning}`);

      return result;
    } catch (error) {
      // Fallback to heuristic analysis if API fails
      console.warn("⚠️  DeepSeek API unavailable, falling back to heuristic analysis");
      return this.heuristicFallback(request, Date.now() - startTime);
    }
  }

  /**
   * Build the analysis prompt for DeepSeek-R1
   */
  private buildAnalysisPrompt(request: DeepSeekAuditRequest): string {
    return `Analyze this proposed Solana DeFi transaction for security risks:

## Transaction Details
- **Action**: ${request.action.toUpperCase()}
- **Token**: ${request.tokenAddress}${request.tokenSymbol ? ` (${request.tokenSymbol})` : ""}
- **Amount**: $${request.amountUsd.toLocaleString()} USD
- **Target Protocol**: ${request.targetProtocol}

## Market Data
- **Pool Liquidity**: $${request.poolLiquidity.toLocaleString()} USD
- **Price Impact (Slippage)**: ${(request.priceImpact * 100).toFixed(2)}%
- **24h Volume**: $${request.volume24h.toLocaleString()} USD
- **Transaction-to-Liquidity Ratio**: ${((request.amountUsd / Math.max(request.poolLiquidity, 1)) * 100).toFixed(2)}%

## Token Metadata
- **Token Age**: ${request.tokenAge} hours (${(request.tokenAge / 24).toFixed(1)} days)
- **Top 10 Holder Concentration**: ${(request.holderConcentration * 100).toFixed(1)}%
- **Mint Authority Active**: ${request.mintAuthority ? "YES ⚠️" : "NO ✅"}
- **Freeze Authority Active**: ${request.freezeAuthority ? "YES ⚠️" : "NO ✅"}
- **LP Locked**: ${request.lpLocked ? `YES (${request.lpLockDuration} days remaining)` : "NO ⚠️"}
- **Creator Token History**: ${request.creatorHistory} previous token deployments

## Key Questions
1. Is this transaction likely to be sandwiched by MEV bots?
2. Does this token show rug-pull characteristics?
3. Is the slippage reasonable for this trade size and liquidity?
4. What is the overall risk score?

Output your analysis as the specified JSON structure.`;
  }

  /**
   * Call the DeepSeek API
   */
  private async callDeepSeek(prompt: string): Promise<{
    content: string;
    tokensUsed: number;
    model: string;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: "system", content: AUDITOR_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as any;
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content || "",
        tokensUsed: data.usage?.total_tokens || 0,
        model: data.model || this.config.model,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Parse DeepSeek's response into a structured audit result
   */
  private parseAuditResponse(
    response: { content: string; tokensUsed: number; model: string },
    latencyMs: number
  ): DeepSeekAuditResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        reasoning: parsed.reasoning || "Analysis complete",
        riskScore: Math.min(100, Math.max(0, parsed.riskScore || 50)),
        threatVector: parsed.threatVector || [],
        recommendation: parsed.recommendation || "CAUTION",
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        sandwichRisk: Math.min(10, Math.max(0, parsed.sandwichRisk || 0)),
        rugPullRisk: Math.min(10, Math.max(0, parsed.rugPullRisk || 0)),
        slippageManipulation: Math.min(10, Math.max(0, parsed.slippageManipulation || 0)),
        timestamp: Date.now(),
        modelUsed: response.model,
        tokensUsed: response.tokensUsed,
        latencyMs,
      };
    } catch (e) {
      // If parsing fails, try to extract key info from the text
      return {
        reasoning: response.content.substring(0, 200),
        riskScore: 50,
        threatVector: ["parsing_error"],
        recommendation: "CAUTION",
        confidence: 0.3,
        sandwichRisk: 5,
        rugPullRisk: 5,
        slippageManipulation: 5,
        timestamp: Date.now(),
        modelUsed: response.model,
        tokensUsed: response.tokensUsed,
        latencyMs,
      };
    }
  }

  /**
   * Heuristic fallback when DeepSeek API is unavailable
   * Uses rule-based logic that mirrors what DeepSeek would catch
   */
  private heuristicFallback(
    request: DeepSeekAuditRequest,
    latencyMs: number
  ): DeepSeekAuditResult {
    const threats: string[] = [];
    let riskScore = 0;

    // Sandwich risk: large trades relative to liquidity
    const txRatio = request.amountUsd / Math.max(request.poolLiquidity, 1);
    let sandwichRisk = 0;
    if (txRatio > 0.1) {
      sandwichRisk = Math.min(10, Math.round(txRatio * 20));
      riskScore += sandwichRisk * 2;
      threats.push(`High sandwich risk: TX is ${(txRatio * 100).toFixed(1)}% of pool`);
    }

    // Rug pull detection
    let rugPullRisk = 0;
    if (request.tokenAge < 24) { rugPullRisk += 3; threats.push("Token < 24h old"); }
    if (request.holderConcentration > 0.8) { rugPullRisk += 3; threats.push("Top holders control >80%"); }
    if (request.mintAuthority) { rugPullRisk += 2; threats.push("Mint authority active"); }
    if (!request.lpLocked) { rugPullRisk += 2; threats.push("LP not locked"); }
    if (request.creatorHistory > 5) { rugPullRisk += 2; threats.push("Serial token deployer"); }
    rugPullRisk = Math.min(10, rugPullRisk);
    riskScore += rugPullRisk * 3;

    // Slippage manipulation
    let slippageManip = 0;
    if (request.priceImpact > 0.05) { slippageManip += 3; threats.push("Slippage > 5%"); }
    if (request.priceImpact > 0.2) { slippageManip += 4; threats.push("Extreme slippage > 20%"); }
    if (request.priceImpact > 0.5) { slippageManip += 3; threats.push("Slippage > 50% — almost certain manipulation"); }
    slippageManip = Math.min(10, slippageManip);
    riskScore += slippageManip * 2;

    riskScore = Math.min(100, riskScore);

    let recommendation: "APPROVE" | "REJECT" | "CAUTION" = "APPROVE";
    if (riskScore > 70) recommendation = "REJECT";
    else if (riskScore > 40) recommendation = "CAUTION";

    const reasoning = threats.length > 0
      ? `Heuristic analysis detected ${threats.length} risk factors: ${threats.slice(0, 3).join(", ")}. Overall risk: ${riskScore}/100.`
      : `No significant risks detected. Token and market conditions appear normal.`;

    return {
      reasoning,
      riskScore,
      threatVector: threats,
      recommendation,
      confidence: 0.7, // Lower confidence for heuristic
      sandwichRisk,
      rugPullRisk,
      slippageManipulation: slippageManip,
      timestamp: Date.now(),
      modelUsed: "heuristic-fallback",
      tokensUsed: 0,
      latencyMs,
    };
  }

  /**
   * Get audit history
   */
  getAuditLog(): DeepSeekAuditResult[] {
    return [...this.auditLog];
  }

  /**
   * Get total tokens consumed
   */
  getTotalTokensUsed(): number {
    return this.totalTokensUsed;
  }

  /**
   * Update config (e.g., to switch models)
   */
  updateConfig(updates: Partial<DeepSeekConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createDeepSeekAuditor(
  apiKey: string,
  overrides: Partial<DeepSeekConfig> = {}
): DeepSeekAuditor {
  return new DeepSeekAuditor({ apiKey, ...overrides });
}
