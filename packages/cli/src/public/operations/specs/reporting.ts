import {
  runOperationJsonQuery,
  toPrologAtom,
  toPrologList,
} from "../prolog-json.js";
import type { OperationContext } from "../runtime-types.js";
import type { OperationResult, OperationSpec } from "../types.js";

const ENTITY_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
] as const;
const ENTITY_TYPE_SET: ReadonlySet<string> = new Set(ENTITY_TYPES);

export type FindGapsInput = {
  readonly type?: string;
  readonly missingRelationships?: readonly string[];
  readonly presentRelationships?: readonly string[];
  readonly tags?: readonly string[];
  readonly sourceFile?: string;
  readonly limit?: number;
  readonly offset?: number;
};

export type FindGapsPayload = {
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly count: number;
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type CoverageInput = {
  readonly by?: "req" | "symbol" | "type";
  readonly tags?: readonly string[];
  readonly includePassing?: boolean;
  readonly includeTransitive?: boolean;
  readonly limit?: number;
  readonly offset?: number;
};

export type CoveragePayload = {
  readonly summary: Readonly<Record<string, number>>;
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type GraphInput = {
  readonly seedIds: readonly string[];
  readonly relationships?: readonly string[];
  readonly direction?: "outgoing" | "incoming" | "both";
  readonly depth?: number;
  readonly entityTypes?: readonly string[];
  readonly maxNodes?: number;
  readonly maxEdges?: number;
};

export type GraphPayload = {
  readonly nodes: readonly Readonly<Record<string, unknown>>[];
  readonly edges: readonly Readonly<Record<string, unknown>>[];
  readonly truncated: boolean;
  readonly meta?: Readonly<Record<string, unknown>>;
};

function requireProlog(context: OperationContext) {
  if (context.prolog === undefined) {
    throw new Error("Reporting operation requires a Prolog runtime");
  }
  return context.prolog;
}

function validateEntityType(type?: string): void {
  if (type !== undefined && !ENTITY_TYPE_SET.has(type)) {
    throw new Error(
      `Invalid type '${type}'. Valid types: ${ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
    );
  }
}

export async function executeFindGaps(
  input: FindGapsInput,
  context: OperationContext,
): Promise<OperationResult<FindGapsPayload>> {
  validateEntityType(input.type);
  try {
    const payload = await runOperationJsonQuery<FindGapsPayload>(
      requireProlog(context),
      "discovery.pl",
      `discovery:find_gaps_json(${toPrologAtom(input.type)}, ${toPrologList(input.missingRelationships)}, ${toPrologList(input.presentRelationships)}, ${toPrologList(input.tags)}, ${toPrologAtom(input.sourceFile)}, ${input.limit ?? 100}, ${input.offset ?? 0}, JsonString)`,
      "Find-gaps execution",
    );
    const rows = payload.rows ?? [];
    return {
      content: [
        {
          type: "text",
          text:
            rows.length === 0
              ? "No matching gaps found."
              : `Found ${payload.count ?? rows.length} gap rows. Showing ${rows.length}: ${rows.map((row) => row.id).join(", ")}`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Find-gaps execution failed: ${message}`);
  }
}

export const findGapsSpec = {
  name: "kb_find_gaps",
  cliName: "find-gaps",
  description:
    "Run bulk missing/present relationship analysis over KB entities. Use for questions like which requirements lack scenarios or tests. No mutation side effects.",
  businessInputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ENTITY_TYPES,
      },
      missingRelationships: { type: "array", items: { type: "string" } },
      presentRelationships: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
      sourceFile: { type: "string" },
      limit: { type: "integer", default: 100 },
      offset: { type: "integer", default: 0 },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executeFindGaps,
} as const satisfies OperationSpec<FindGapsInput, FindGapsPayload>;

export async function executeCoverage(
  input: CoverageInput,
  context: OperationContext,
): Promise<OperationResult<CoveragePayload>> {
  try {
    const payload = await runOperationJsonQuery<CoveragePayload>(
      requireProlog(context),
      "discovery.pl",
      `discovery:coverage_report_json('${input.by ?? "req"}', ${toPrologList(input.tags)}, ${input.includePassing ?? false}, ${input.includeTransitive ?? true}, ${input.limit ?? 100}, ${input.offset ?? 0}, JsonString)`,
      "Coverage execution",
    );
    const fullyCovered = Number(payload.summary?.fullyCovered ?? 0);
    const total = Number(payload.summary?.total ?? 0);
    return {
      content: [
        {
          type: "text",
          text: `Coverage summary: ${fullyCovered} fully covered out of ${total}.`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Coverage execution failed: ${message}`);
  }
}

export const coverageSpec = {
  name: "kb_coverage",
  cliName: "coverage",
  description:
    "Generate curated coverage reports for requirements, symbols, or grouped types. Read-only reporting with no mutation side effects.",
  businessInputSchema: {
    type: "object",
    properties: {
      by: { type: "string", enum: ["req", "symbol", "type"], default: "req" },
      tags: { type: "array", items: { type: "string" } },
      includePassing: { type: "boolean", default: false },
      includeTransitive: { type: "boolean", default: true },
      limit: { type: "integer", default: 100 },
      offset: { type: "integer", default: 0 },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executeCoverage,
} as const satisfies OperationSpec<CoverageInput, CoveragePayload>;

export async function executeGraph(
  input: GraphInput,
  context: OperationContext,
): Promise<OperationResult<GraphPayload>> {
  const depth = input.depth ?? 1;
  if (depth < 1 || depth > 5) {
    throw new RangeError("Graph depth must be between 1 and 5");
  }
  try {
    const payload = await runOperationJsonQuery<GraphPayload>(
      requireProlog(context),
      "discovery.pl",
      `discovery:graph_expand_json(${toPrologList(input.seedIds)}, ${toPrologList(input.relationships)}, '${input.direction ?? "outgoing"}', ${depth}, ${toPrologList(input.entityTypes)}, ${input.maxNodes ?? 200}, ${input.maxEdges ?? 500}, JsonString)`,
      "Graph execution",
    );
    const nodes = payload.nodes ?? [];
    const edges = payload.edges ?? [];
    return {
      content: [
        {
          type: "text",
          text:
            nodes.length === 0
              ? "Graph traversal returned no nodes."
              : `Graph traversal returned ${nodes.length} nodes and ${edges.length} edges from ${input.seedIds.join(", ")}.`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Graph execution failed: ${message}`);
  }
}

export const graphSpec = {
  name: "kb_graph",
  cliName: "graph",
  description:
    "Run bounded graph traversal from one or more seed IDs across curated relationship types. No mutation side effects.",
  businessInputSchema: {
    type: "object",
    required: ["seedIds"],
    properties: {
      seedIds: { type: "array", items: { type: "string" } },
      relationships: { type: "array", items: { type: "string" } },
      direction: {
        type: "string",
        enum: ["outgoing", "incoming", "both"],
        default: "outgoing",
      },
      depth: { type: "integer", default: 1, minimum: 1, maximum: 5 },
      entityTypes: { type: "array", items: { type: "string" } },
      maxNodes: { type: "integer", default: 200 },
      maxEdges: { type: "integer", default: 500 },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executeGraph,
} as const satisfies OperationSpec<GraphInput, GraphPayload>;
