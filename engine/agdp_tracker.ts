/**
 * ============================================================================
 * VERITAS FRONTIER — Agentic GDP (aGDP) Tracker
 * ============================================================================
 * 
 * Tracks the economic productivity of AI agents:
 *   - Cumulative value generated (INCOME from protected funds + successful ops)
 *   - Execution costs (EXPENSE from API calls, compute, gas)
 *   - Real-time ROI calculation
 *   - Efficiency trends for dashboard charting
 * 
 * Integrates with the Virtuals Protocol aGDP Dashboard (mocked for demo).
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface aGDPEvent {
  agentId: string;
  type: "INCOME" | "EXPENSE";
  value: number;
  description: string;
  timestamp: number;
}

export interface aGDPMetrics {
  totalGDP: number;
  netProfit: number;
  executionCost: number;
  efficiencyRatio: number;
  fundsProtected: number;
  totalScans: number;
}

export interface aGDPLiveReport {
  agentic_gdp_sol: number;
  net_value_created_usd: number;
  api_execution_cost_usd: number;
  roi_percent: number;
  funds_protected_usd: number;
  total_scans: number;
  last_update: number;
}

export interface EfficiencyDataPoint {
  timestamp: number;
  income: number;
  expense: number;
  netProfit: number;
  cumulativeROI: number;
}

// ── aGDP Tracker Class ────────────────────────────────────────────────────

export class aGDPTracker {
  private events: aGDPEvent[] = [];
  private scanCount: number = 0;

  /**
   * Track an aGDP event (INCOME or EXPENSE).
   */
  track(event: aGDPEvent): void {
    this.events.push(event);
    if (event.description.includes('APPROVED') || event.description.includes('BLOCKED') || event.description.includes('ACE_PROTECTION')) {
      this.scanCount++;
    }
    console.log(`📈 [aGDP] Updated: ${event.type === 'INCOME' ? '+' : '-'}$${event.value.toFixed(2)} (${event.description})`);
  }

  /**
   * Get metrics for a specific agent (or all agents if no agentId provided).
   */
  getMetrics(agentId?: string): aGDPMetrics {
    const filtered = agentId
      ? this.events.filter(e => e.agentId === agentId)
      : this.events;

    const income = filtered
      .filter(e => e.type === "INCOME")
      .reduce((acc, e) => acc + e.value, 0);
    const expense = filtered
      .filter(e => e.type === "EXPENSE")
      .reduce((acc, e) => acc + e.value, 0);

    const fundsProtected = filtered
      .filter(e => e.type === "INCOME" && (e.description.includes('PROTECTED') || e.description.includes('ACE_PROTECTION')))
      .reduce((acc, e) => acc + e.value, 0);

    return {
      totalGDP: income,
      netProfit: income - expense,
      executionCost: expense,
      efficiencyRatio: income > 0 ? (income - expense) / income : 0,
      fundsProtected,
      totalScans: this.scanCount,
    };
  }

  /**
   * Get the live report for the dashboard (with SOL conversion mock).
   */
  getLiveReport(): aGDPLiveReport {
    const metrics = this.getMetrics();
    const SOL_PRICE = 145; // Mock SOL price for demo

    return {
      agentic_gdp_sol: parseFloat((metrics.totalGDP / SOL_PRICE).toFixed(2)),
      net_value_created_usd: parseFloat(metrics.netProfit.toFixed(2)),
      api_execution_cost_usd: parseFloat(metrics.executionCost.toFixed(2)),
      roi_percent: metrics.executionCost > 0
        ? Math.round(((metrics.totalGDP - metrics.executionCost) / metrics.executionCost) * 100)
        : 0,
      funds_protected_usd: parseFloat(metrics.fundsProtected.toFixed(2)),
      total_scans: metrics.totalScans,
      last_update: Date.now(),
    };
  }

  /**
   * Get the event history for the dashboard timeline.
   */
  getEventHistory(limit: number = 30): aGDPEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get efficiency trend data points for charting.
   * Returns the last N data points showing cumulative metrics over time.
   */
  getEfficiencyTrend(points: number = 20): EfficiencyDataPoint[] {
    if (this.events.length === 0) return [];

    const result: EfficiencyDataPoint[] = [];
    let cumulativeIncome = 0;
    let cumulativeExpense = 0;

    // Group events into data points (every few events = 1 point)
    const step = Math.max(1, Math.floor(this.events.length / points));

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      if (event.type === 'INCOME') {
        cumulativeIncome += event.value;
      } else {
        cumulativeExpense += event.value;
      }

      if ((i + 1) % step === 0 || i === this.events.length - 1) {
        result.push({
          timestamp: event.timestamp,
          income: cumulativeIncome,
          expense: cumulativeExpense,
          netProfit: cumulativeIncome - cumulativeExpense,
          cumulativeROI: cumulativeExpense > 0
            ? ((cumulativeIncome - cumulativeExpense) / cumulativeExpense) * 100
            : 0,
        });
      }
    }

    return result.slice(-points);
  }

  /**
   * Get total funds protected across all agents.
   */
  getTotalFundsProtected(): number {
    return this.events
      .filter(e => e.type === "INCOME" && (e.description.includes('PROTECTED') || e.description.includes('ACE_PROTECTION')))
      .reduce((acc, e) => acc + e.value, 0);
  }

  /**
   * Get the total number of events tracked.
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Clear all events (for testing).
   */
  reset(): void {
    this.events = [];
    this.scanCount = 0;
  }
}
