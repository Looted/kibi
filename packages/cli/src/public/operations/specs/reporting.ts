import { PROOF_RECEIPT_MAX_AGE_SECONDS } from "../../proof-receipt.js";
import { executeStatus } from "../discovery-executors.js";
import {
  type LegacyMigrationPlan,
  buildLegacyMigrationPlanFromContext,
} from "../legacy-migration-plan.js";
import {
  type MigrationPlan,
  buildActionsFromCoverage,
  buildMigrationPlan,
  mergeMigrationPlans,
} from "../migration-plan.js";
import {
  runOperationJsonQuery,
  toPrologAtom,
  toPrologList,
} from "../prolog-json.js";
import { type RepairPlan, buildRepairPlan } from "../repair-plan.js";
import type { OperationContext } from "../runtime-types.js";
import { buildSymbolRepairPlan } from "../symbol-repair-plan.js";
import type { OperationResult, OperationSpec } from "../types.js";
import { readWorkspaceSnapshot } from "../workspace-snapshot.js";

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
  readonly includeMigrationPreview?: boolean;
  readonly migrationLimit?: number;
  readonly migrationOffset?: number;
  readonly migrationPredicateLimit?: number;
  readonly migrationPredicateMinScore?: number;
};

export type CoveragePayload = {
  readonly summary: Readonly<Record<string, number>>;
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly repairPlan?: RepairPlan;
  readonly legacyMigrationPlan?: LegacyMigrationPlan;
  readonly symbolRepairPlan?: Readonly<Record<string, unknown>>;
  readonly migrationPlan?: MigrationPlan;
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
    const snapshotEvidence = await readWorkspaceSnapshot(context);
    const codeSnapshot = snapshotEvidence.available
      ? snapshotEvidence.snapshot.hash
      : "unknown";
    const checkedAt = context.clock().toISOString();
    const payload = await runOperationJsonQuery<CoveragePayload>(
      requireProlog(context),
      "discovery.pl",
      `discovery:coverage_report_json('${input.by ?? "req"}', ${toPrologList(input.tags)}, ${input.includePassing ?? false}, ${input.includeTransitive ?? true}, ${input.limit ?? 100}, ${input.offset ?? 0}, ${toPrologAtom(codeSnapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`,
      "Coverage execution",
    );
    const repairPlan = buildRepairPlan(payload, input, codeSnapshot);
    const symbolRepairPlan =
      input.by === "symbol"
        ? await buildSymbolRepairPlan(payload.rows, context)
        : undefined;
    const legacyMigrationPlan =
      input.includeMigrationPreview === true && repairPlan !== undefined
        ? await buildLegacyMigrationPlanFromContext(
            repairPlan,
            input,
            codeSnapshot,
            context,
          )
        : undefined;
    // Coverage can still report its complete Prolog-backed domain in a
    // synthetic or non-Git workspace where branch status cannot be resolved.
    // Preserve the coverage plan and let status expose its own branch action
    // when an attachment is available.
    let statusPlan: MigrationPlan | undefined;
    try {
      const statusResult = await executeStatus({}, context);
      statusPlan = statusResult.structuredContent?.migrationPlan;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Failed to resolve active branch")) throw error;
    }
    const coveragePlan = buildMigrationPlan({
      expected: {
        branch: context.branchAttachment?.gitBranch ?? null,
        kbBranch: context.branchAttachment?.kbBranch ?? null,
        ...(typeof payload.meta?.snapshotId === "string"
          ? { kbSnapshotId: payload.meta.snapshotId }
          : {}),
        workspaceSnapshot: codeSnapshot,
      },
      evaluatedDomains: ["semantic", "proof", "symbol"],
      incompleteDomains:
        payload.meta?.scopeComplete === false ? ["coverage"] : [],
      actions: buildActionsFromCoverage({
        ...(repairPlan !== undefined
          ? {
              repairPlan: repairPlan as unknown as Readonly<
                Record<string, unknown>
              >,
            }
          : {}),
        ...(symbolRepairPlan !== undefined ? { symbolRepairPlan } : {}),
      }),
    });
    const migrationPlan = statusPlan
      ? mergeMigrationPlans([statusPlan, coveragePlan])
      : coveragePlan;
    const enrichedPayload = {
      ...payload,
      ...(repairPlan !== undefined ? { repairPlan } : {}),
      ...(legacyMigrationPlan !== undefined ? { legacyMigrationPlan } : {}),
      ...(symbolRepairPlan !== undefined ? { symbolRepairPlan } : {}),
      migrationPlan,
      meta: {
        ...(payload.meta ?? {}),
        proofReceiptMaxAgeSeconds: PROOF_RECEIPT_MAX_AGE_SECONDS,
        proofSnapshot: codeSnapshot,
        proofSnapshotAvailable: snapshotEvidence.available,
        ...(snapshotEvidence.available
          ? {
              proofSnapshotDirty: snapshotEvidence.snapshot.dirty,
              proofSnapshotFileCount: snapshotEvidence.snapshot.fileCount,
              proofSnapshotVersion: snapshotEvidence.snapshot.version,
            }
          : { proofSnapshotError: snapshotEvidence.error }),
      },
    };
    const fullyCovered = Number(enrichedPayload.summary?.fullyCovered ?? 0);
    const proofProven = Number(enrichedPayload.summary?.proofProven ?? 0);
    const total = Number(enrichedPayload.summary?.total ?? 0);
    return {
      content: [
        {
          type: "text",
          text: `Coverage summary: ${fullyCovered} structurally covered and ${proofProven} proven out of ${total}.`,
        },
      ],
      structuredContent: enrichedPayload,
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
    "Generate curated structural coverage and conservative end-to-end requirement proof reports for requirements, symbols, or grouped types. Reports include the compatible repair plan plus typed kibi.migration-plan.v2 actions; semantic and E2E actions remain review/execution work. Paginated plans identify incomplete scope and no mutation occurs.",
  businessInputSchema: {
    type: "object",
    properties: {
      by: { type: "string", enum: ["req", "symbol", "type"], default: "req" },
      tags: { type: "array", items: { type: "string" } },
      includePassing: { type: "boolean", default: false },
      includeTransitive: { type: "boolean", default: true },
      limit: { type: "integer", default: 100 },
      offset: { type: "integer", default: 0 },
      includeMigrationPreview: {
        type: "boolean",
        default: false,
        description:
          "Opt in to a deterministic, read-only kibi.legacy-migration-plan.v1 preview for ready semantic-inventory repair batches.",
      },
      migrationLimit: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        default: 1,
        description:
          "Maximum requirement migration batches to preview. Defaults to one review batch.",
      },
      migrationOffset: {
        type: "integer",
        minimum: 0,
        default: 0,
        description: "Zero-based offset into ready semantic-inventory batches.",
      },
      migrationPredicateLimit: {
        type: "integer",
        minimum: 1,
        maximum: 20,
        default: 5,
        description:
          "Maximum exact predicate-schema candidates retained per assertive proposition.",
      },
      migrationPredicateMinScore: {
        type: "number",
        minimum: 0,
        maximum: 1,
        default: 0.35,
        description:
          "Minimum deterministic predicate-schema rank score retained in migration previews.",
      },
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
