import type { PrologProcess } from "kibi-cli/prolog";
import { runJsonModuleQuery, toPrologList } from "./core-module.js";

export interface GraphArgs {
  seedIds: string[];
  relationships?: string[];
  direction?: "outgoing" | "incoming" | "both";
  depth?: number;
  entityTypes?: string[];
  maxNodes?: number;
  maxEdges?: number;
}

export interface GraphResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
    truncated: boolean;
    meta?: Record<string, unknown>;
  };
}

// implements REQ-002, REQ-013
export async function handleKbGraph(
  prolog: PrologProcess,
  args: GraphArgs,
): Promise<GraphResult> {
  const direction = args.direction ?? "outgoing";
  const depth = args.depth ?? 1;
  const maxNodes = args.maxNodes ?? 200;
  const maxEdges = args.maxEdges ?? 500;

  try {
    const payload = await runJsonModuleQuery<GraphResult["structuredContent"]>(
      prolog,
      "discovery.pl",
      `discovery:graph_expand_json(${toPrologList(args.seedIds)}, ${toPrologList(args.relationships)}, '${direction}', ${depth}, ${toPrologList(args.entityTypes)}, ${maxNodes}, ${maxEdges}, JsonString)`,
      "Graph execution",
    );

    const nodes = payload?.nodes ?? [];
    return {
      content: [
        {
          type: "text",
          text:
            nodes.length === 0
              ? "Graph traversal returned no nodes."
              : `Graph traversal returned ${nodes.length} nodes and ${(payload?.edges ?? []).length} edges from ${args.seedIds.join(", ")}.`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Graph execution failed: ${message}`);
  }
}
