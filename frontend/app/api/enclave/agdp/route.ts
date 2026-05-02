import { NextResponse } from "next/server";
import { getGDPTracker } from "@/../../engine/index";

// ═══════════════════════════════════════════════════════════════════════════
// VERITAS ENCLAVE — aGDP Metrics Route
// ═══════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const tracker = getGDPTracker();
    const liveReport = tracker.getLiveReport();
    const efficiencyTrend = tracker.getEfficiencyTrend(30);
    const eventHistory = tracker.getEventHistory(20);

    return NextResponse.json({
      success: true,
      data: {
        liveReport,
        efficiencyTrend,
        eventHistory,
      }
    });
  } catch (error: any) {
    console.error("aGDP API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Agentic GDP metrics" },
      { status: 500 }
    );
  }
}
