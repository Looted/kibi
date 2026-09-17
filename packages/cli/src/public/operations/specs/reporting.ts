import { join } from "node:path";

import { resolveBoundSymbolScope } from "../../../extractors/manifest.js";
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
import {
  addCoordinateRepairEvidence,
  buildSymbolRepairPlan,
} from "../symbol-repair-plan.js";
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
  /** Requirement proof-status filter (req mode). Implies include-passing. */
  readonly statuses?: readonly string[];
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

const COVERAGE_PROOF_STATUSES: ReadonlySet<string> = new Set([
  "proven",
  "missing",
  "unresolved",
  "not_applicable",
]);

function validateCoverageStatus(status: string): string {
  if (!COVERAGE_PROOF_STATUSES.has(status)) {
    throw new Error(
      `Invalid coverage status '${status}'. Valid statuses: ${[...COVERAGE_PROOF_STATUSES].join(", ")}.`,
    );
  }
  return status;
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

/**
 * Per-contract receipt binding (W2): compute the current binding hash for
 * every receipt-bearing test (contract + receipt-stripped authored document
 * + bound-symbol code scope) and hand the Prolog coverage stage a
 * TestId -> BindingHash dict. This is the default binding mode since slice 3;
 * KIBI_PROOF_BINDING_MODE=strict-snapshot opts out (receipts then match only
 * against the whole-workspace snapshot they were proven on).
 */
// implements REQ-kibi-proof-evidence-protocol
export function currentProofBindingMode(): "per_contract" | "strict_snapshot" {
  return process.env.KIBI_PROOF_BINDING_MODE?.trim() === "strict-snapshot"
    ? "strict_snapshot"
    : "per_contract";
}

export async function perContractTestBindings(
  context: OperationContext,
): Promise<string | null> {
  if (currentProofBindingMode() !== "per_contract") return null;
  const { loadEntities } = await import("../discovery-entities.js");
  const { receiptBindingHash } = await import("../../proof-fingerprint.js");
  const { removeFrontmatterBlock } = await import(
    "../../../operations/proof/receipt-document.js"
  );
  let tests: Record<string, unknown>[];
  try {
    tests = await loadEntities(context.prolog as never, { type: "test" });
  } catch {
    return null;
  }
  const entries: string[] = [];
  const manifestPath = join(context.workspaceRoot, ".kb", "symbols.yaml");
  for (const test of tests) {
    const testId = typeof test.id === "string" ? test.id : "";
    const contract =
      test.proof_contract !== undefined &&
      test.proof_contract !== null &&
      typeof test.proof_contract === "object"
        ? (test.proof_contract as Record<string, unknown>)
        : undefined;
    const source = typeof test.source === "string" ? test.source : "";
    if (testId === "" || contract === undefined || source === "") continue;
    if (!/\.(md|mdx)$/i.test(source)) continue;
    if (!context.fs) continue;
    try {
      const absolute = join(context.workspaceRoot, source);
      const authored = await context.fs.readFile(absolute);
      const stripped = removeFrontmatterBlock(authored, "proof_receipts");
      const rawBindings: ReadonlyArray<{ symbol_id?: unknown }> = Array.isArray(
        test.proof_bindings,
      )
        ? (test.proof_bindings as ReadonlyArray<{ symbol_id?: unknown }>)
        : [];
      const boundIds = rawBindings
        .map((binding) =>
          typeof binding.symbol_id === "string" ? binding.symbol_id : "",
        )
        .filter((id) => id !== "");
      const codeScope = resolveBoundSymbolScope(manifestPath, boundIds);
      const binding = receiptBindingHash(
        contract as never,
        stripped ?? authored,
        codeScope,
      );
      entries.push(`${toPrologAtom(testId)}: ${toPrologAtom(binding)}`);
    } catch {
      // Unreadable documents keep strict semantics for that test.
    }
  }
  if (entries.length === 0) return null;
  return `_{${entries.join(", ")}}`;
}

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
    const statuses = (input.statuses ?? []).map((status) =>
      validateCoverageStatus(status),
    );
    const bindingsDict =
      statuses.length === 0 && (input.by ?? "req") === "req"
        ? await perContractTestBindings(context)
        : null;
    const goal =
      bindingsDict !== null
        ? `discovery:coverage_report_json('${input.by ?? "req"}', ${toPrologList(input.tags)}, ${input.includePassing ?? false}, per_contract, ${bindingsDict}, ${input.includeTransitive ?? true}, ${input.limit ?? 100}, ${input.offset ?? 0}, ${toPrologAtom(codeSnapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`
        : statuses.length > 0
          ? `discovery:coverage_report_json('${input.by ?? "req"}', ${toPrologList(input.tags)}, ${input.includePassing ?? false}, ${toPrologList(statuses)}, ${input.includeTransitive ?? true}, ${input.limit ?? 100}, ${input.offset ?? 0}, ${toPrologAtom(codeSnapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`
          : `discovery:coverage_report_json('${input.by ?? "req"}', ${toPrologList(input.tags)}, ${input.includePassing ?? false}, ${input.includeTransitive ?? true}, ${input.limit ?? 100}, ${input.offset ?? 0}, ${toPrologAtom(codeSnapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`;
    const payload = await runOperationJsonQuery<CoveragePayload>(
      requireProlog(context),
      "discovery.pl",
      goal,
      "Coverage execution",
    );
    const rows =
      (input.by ?? "req") === "req"
        ? await addCoordinateRepairEvidence(payload.rows, context)
        : payload.rows;
    const repairPlan = buildRepairPlan(
      { ...payload, rows },
      input,
      codeSnapshot,
    );
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
      rows,
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
      statuses: {
        type: "array",
        items: {
          type: "string",
          enum: ["proven", "missing", "unresolved", "not_applicable"],
        },
        description:
          "Requirement proof-status filter (req mode): include only rows whose proofStatus is listed. Selecting statuses implies include-passing; not_applicable rows carry their typed applicability reason in proofStages.applicability.reason. The summary always reflects the whole KB.",
      },
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
