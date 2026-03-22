import { escapeAtom } from "../prolog/codec.js";
import {
  printDiscoveryResult,
  resolveCurrentKbPath,
  runJsonModuleQuery,
  withPrologProcess,
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

// implements REQ-002, REQ-003
export async function graphCommand(options: GraphOptions): Promise<void> {
  if (!options.from?.trim()) {
    console.error("Error: --from is required");
    process.exitCode = 1;
    return;
  }

  await withPrologProcess(async (prolog) => {
    const kbPath = await resolveCurrentKbPath();
    const seedIds = csvToPrologList(options.from);
    const relationships = csvToPrologList(options.relationships);
    const direction = options.direction || "outgoing";
    const depth = Number.parseInt(options.depth || "1", 10);
    const entityTypes = csvToPrologList(options.entityTypes);
    const maxNodes = Number.parseInt(options.maxNodes || "200", 10);
    const maxEdges = Number.parseInt(options.maxEdges || "500", 10);

    const result = await runJsonModuleQuery<Record<string, unknown>>(
      prolog,
      "discovery.pl",
      `discovery:graph_expand_json(${seedIds}, ${relationships}, '${direction}', ${depth}, ${entityTypes}, ${maxNodes}, ${maxEdges}, JsonString)`,
      "graph query failed",
      kbPath,
    );

    const nodes = Array.isArray(result.nodes) ? result.nodes.length : 0;
    const edges = Array.isArray(result.edges) ? result.edges.length : 0;
    printDiscoveryResult(
      options.format,
      result,
      `Graph traversal returned ${nodes} nodes and ${edges} edges.`,
    );
  });
}

function csvToPrologList(value?: string): string {
  if (!value?.trim()) {
    return "[]";
  }

  return `[${value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `'${escapeAtom(item)}'`)
    .join(",")}]`;
}
