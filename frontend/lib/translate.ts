import type { StreamEvent } from "@/types";

/**
 * Translates a raw AgentEvent into plain English for Simple mode.
 * Never exposes URLs, floats, JSON, or field names.
 */
export function translateEventToSimple(
  event: StreamEvent,
  entityName: string
): string {
  const msg = event.message || "";
  const type = event.event_type;

  switch (type) {
    case "crawling": {
      if (msg.toLowerCase().includes("browser") || msg.toLowerCase().includes("crawl"))
        return `We're checking ${entityName}'s online presence...`;
      if (msg.toLowerCase().includes("contradiction") || msg.toLowerCase().includes("skeptic"))
        return `We're looking for anything that doesn't add up...`;
      if (msg.toLowerCase().includes("filing") || msg.toLowerCase().includes("legal"))
        return `We're checking legal and regulatory filings...`;
      return `We're checking their public records...`;
    }

    case "thinking": {
      if (msg.includes("reasoning"))
        return "Still analyzing...";
      if (msg.toLowerCase().includes("hunter"))
        return `Looking into what ${entityName} claims...`;
      if (msg.toLowerCase().includes("skeptic"))
        return "Double-checking everything we've found...";
      if (msg.toLowerCase().includes("analyz"))
        return "Putting all the pieces together...";
      if (msg.toLowerCase().includes("done") || msg.toLowerCase().includes("complete"))
        return "Wrapping up this part of the investigation.";
      return "Still investigating...";
    }

    case "claim_found": {
      // Extract the actual claim text after "Claim: "
      const claimText = msg.replace(/^Claim:\s*/i, "").slice(0, 120);
      return `They claim "${claimText}" — we're verifying this.`;
    }

    case "conflict_detected": {
      const clean = msg
        .replace(/^CONFLICT:\s*/i, "")
        .replace(/Conflict score:.*$/i, "")
        .slice(0, 120);
      if (clean.length < 10) return "Something doesn't add up with their claims.";
      return `Something doesn't add up: ${clean}`;
    }

    case "screenshot":
      return "We captured a snapshot of their website for evidence.";

    case "complete":
      return "Done. Here's what we found.";

    case "human_required":
      return "We need your input to continue the investigation.";

    default:
      return "Still investigating...";
  }
}
