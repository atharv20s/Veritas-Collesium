import { StateGraph, START, END } from "@langchain/langgraph";
import { InvestigationStateAnnotation } from "./investigation_state";
import { hunterNode, skepticNode, humanHandoffNode, synthesizerNode } from "./investigation_nodes";

export const createInvestigationGraph = () => {
    const workflow = new StateGraph(InvestigationStateAnnotation)
        .addNode("hunter", hunterNode)
        .addNode("skeptic", skepticNode)
        .addNode("human_handoff", humanHandoffNode)
        .addNode("synthesizer", synthesizerNode)
        
        .addEdge(START, "hunter")
        .addEdge("hunter", "skeptic")
        .addEdge("skeptic", "human_handoff")
        
        .addConditionalEdges(
            "human_handoff",
            (state) => state.status === 'WAITING_FOR_HUMAN' ? "end" : "synthesizer",
            {
                end: END,
                synthesizer: "synthesizer"
            }
        )
        .addEdge("synthesizer", END);

    return workflow.compile();
};
