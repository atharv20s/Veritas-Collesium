import { createInvestigationGraph } from "@/../../engine/langgraph/investigation_graph";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();
  const target = params.id;

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type: string, agent: string, msg: string, data: any = {}) {
        const payload = JSON.stringify({
          event_type: type,
          agent_id: agent,
          message: msg,
          data: data,
          timestamp: new Date().toISOString()
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      try {
        console.log(`🚀 [STREAM] Starting investigation for target: ${target}`);
        
        const graph = createInvestigationGraph();
        
        // Initial state
        const initialState = {
          target: target,
          claims: [],
          conflicts: [],
          events: [],
          status: 'RESEARCHING' as const
        };

        // Stream the graph execution
        const eventStream = await graph.stream(initialState, {
            streamMode: "values"
        });

        let lastEventIndex = 0;

        for await (const state of eventStream) {
            // Check for new events in the state
            if (state.events && state.events.length > lastEventIndex) {
                for (let i = lastEventIndex; i < state.events.length; i++) {
                    const event = state.events[i];
                    // Map event types to agent roles if needed
                    let agent = "system";
                    if (event.type === 'crawling' || event.type === 'claim_found' || event.type === 'screenshot') agent = "hunter";
                    if (event.type === 'conflict_detected') agent = "skeptic";
                    if (event.type === 'human_required') agent = "human_handoff";
                    if (event.type === 'synthesis_complete') agent = "synthesizer";

                    sendEvent(event.type, agent, event.message, event.data);
                }
                lastEventIndex = state.events.length;
            }

            // Handle terminal states
            if (state.status === 'WAITING_FOR_HUMAN') {
                // sendEvent("human_required", "system", "Agent swarm requires strategic guidance.");
                // We don't break here, we let the stream finish or wait
            }

            if (state.status === 'COMPLETED' && state.report) {
                sendEvent("report_ready", "synthesizer", "Final report generated.", state.report);
            }
        }

        sendEvent("complete", "system", "Investigation lifecycle finalized.");

      } catch (err: any) {
        console.error("Investigation stream error:", err);
        sendEvent("error", "system", err.message);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
