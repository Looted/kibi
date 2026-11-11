import { graphSpec } from "../public/operations/specs/reporting.js";
import {
  executeReportingSpec,
  printDiscoveryResult,
} from "./discovery-shared.js";

interface GraphOptions {
  from?: string;
  relationships?: string;
  direction?: "outgoing" | "incoming" | "both";
  depth?: string;
  entityTypes?: string;
  maxNodes?: string;
  maxEdges?: string;
  format?: "json" | "table";
}

export async function graphCommand(options: GraphOptions): Promise<void> {
  if (!options.from?.trim()) {
    console.error("Error: --from is required");
    process.exitCode = 1;
    return;
  }

  const result = await executeReportingSpec(graphSpec, {
    seedIds: csvValues(options.from),
    relationships: csvValues(options.relationships),
    direction: options.direction ?? "outgoing",
    depth: Number.parseInt(options.depth || "1", 10),
    entityTypes: csvValues(options.entityTypes),
    maxNodes: Number.parseInt(options.maxNodes || "200", 10),
    maxEdges: Number.parseInt(options.maxEdges || "500", 10),
  });
  printDiscoveryResult(
    options.format,
    result.structuredContent,
    result.content[0]?.text ?? "Graph traversal returned no nodes.",
  );
}

function csvValues(value?: string): string[] {
  // A blank value splits into blank items, which the filter drops.
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
