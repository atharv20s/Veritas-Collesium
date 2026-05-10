import { Annotation } from "@langchain/langgraph";

export const InvestigationStateAnnotation = Annotation.Root({
    target: Annotation<string>(),
    claims: Annotation<Array<{
        id: string;
        content: string;
        source: string;
        confidence: number;
        timestamp: number;
    }>>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    conflicts: Annotation<Array<{
        claimId: string;
        evidence: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }>>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    human_input: Annotation<string | undefined>(),
    status: Annotation<'RESEARCHING' | 'WAITING_FOR_HUMAN' | 'SYNTHESIZING' | 'COMPLETED'>(),
    report: Annotation<any>(),
    events: Annotation<Array<{
        type: string;
        message: string;
        data?: any;
    }>>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
});

export type InvestigationState = typeof InvestigationStateAnnotation.State;
