import { createHash } from "node:crypto";
import path from "node:path";

import { executeStatus } from "../../public/operations/discovery-executors.js";
import {
  migrationPlanHash,
  type MigrationAction,
  type MigrationPlan,
} from "../../public/operations/migration-plan.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
import { branchEnsureCommand, branchMigrateCommand, branchRecoverCommand } from "../../commands/branch.js";
import { migrateCommand } from "../../commands/migrate.js";
import { syncCommand } from "../../commands/sync.js";
import { readMigrationConfigStatus } from "../../public/operations/migration-plan.js";
import type { RelationshipInput, UpsertInput } from "../mutation/types.js";
import { executeUpsert } from "../mutation/upsert.js";
import {
  type CompilePlanV1,
  type PlanStep,
  compilePlanHash,
} from "./compile-intent.js";

// implements REQ-kibi-change-to-proof-plan-compiler
export const PLAN_APPLY_RESULT_VERSION = "kibi.plan-apply-result.v1" as const;

// implements REQ-kibi-change-to-proof-plan-compiler
export type ApplyPlanArgs = Readonly<{
  plan: CompilePlanV1;
  approvedPlanHash: string;
}> | Readonly<{
  plan: MigrationPlan;
  approvedPlanHash: string;
  approvedActionIds: readonly string[];
}>;

// implements REQ-kibi-change-to-proof-plan-compiler
export type ApplyPlanResult = Readonly<{
  version: typeof PLAN_APPLY_RESULT_VERSION;
  outcome: "applied" | "replayed";
  planHash: string;
  changedEntities: number;
  changedRelationships: number;
  changedPaths: readonly string[];
  finalSnapshots: {
    branch: string;
    kbSnapshotId: string;
    workspaceSnapshot: string;
  };
  validationSummary: {
    stepsValidated: number;
    stepsApplied: number;
    sourceHashesChecked: number;
    notes: readonly string[];
  };
  recoveryJournalId: string | null;
}> | Readonly<{
  version: "kibi.migration-apply-result.v1";
  outcome: "applied" | "partially_applied" | "replayed" | "reconciliation_required";
  planHash: string;
  actionResults: readonly Readonly<{
    actionId: string;
    outcome: "applied" | "failed" | "skipped";
    detail: string;
  }>[];
  finalSnapshots: {
    branch: string;
    kbSnapshotId: string;
    workspaceSnapshot: string;
  };
  notes: readonly string[];
  remainingPlan?: MigrationPlan;
  closeout?: {
    taskOutcome: "complete" | "interim" | "blocked";
    kbState: "clean_fresh" | "stale" | "dirty" | "legacy_compat" | "not_evaluated";
    verificationState: "fresh" | "dirty" | "unavailable" | "not_evaluated";
    proofState: "proven" | "mixed" | "unresolved" | "not_evaluated";
    limitationDisposition: "none" | "accepted" | "unaccepted" | "not_applicable";
  };
}>;

const ENTITY_TYPES = new Set([
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function digest(value: string): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function relationships(step: PlanStep): RelationshipInput[] {
  if (!Array.isArray(step.relationships)) return [];
  return step.relationships.filter(isRecord).map((relationship) => {
    const type = text(relationship.type);
    const from = text(relationship.from);
    const to = text(relationship.to);
    if (!type || !from || !to)
      throw new Error(
        "Apply plan failed: every relationship needs type, from, and to",
      );
    return { type, from, to };
  });
}

function asUpsert(step: PlanStep): UpsertInput {
  const type = text(step.type);
  const id = text(step.id);
  if (!ENTITY_TYPES.has(type))
    throw new Error(
      `Apply plan failed: unsupported step entity type '${type}'`,
    );
  if (!id) throw new Error("Apply plan failed: every step needs an entity id");
  const properties = isRecord(step.properties) ? step.properties : {};
  return {
    type,
    id,
    properties,
    relationships: relationships(step),
  };
}

function validateCompilePlanShape(args: Extract<ApplyPlanArgs, { plan: CompilePlanV1 }>): void {
  if (!isRecord(args.plan))
    throw new Error("Apply plan failed: plan must be an object");
  if (args.plan.version !== "kibi.compile-plan.v1")
    throw new Error("Apply plan failed: unsupported plan version");
  if (args.plan.status !== "ready")
    throw new Error("Apply plan failed: only ready plans may be applied");
  if (!/^[a-f0-9]{64}$/i.test(args.approvedPlanHash))
    throw new Error(
      "Apply plan failed: approvedPlanHash must be a SHA-256 hash",
    );
  if (args.approvedPlanHash !== args.plan.planHash)
    throw new Error(
      "Apply plan failed: approvedPlanHash does not match plan.planHash",
    );
  if (
    compilePlanHash(args.plan as unknown as Record<string, unknown>) !==
    args.plan.planHash
  )
    throw new Error(
      "Apply plan failed: planHash does not match the canonical plan body",
    );
  if (!Array.isArray(args.plan.steps) || args.plan.steps.length === 0)
    throw new Error(
      "Apply plan failed: ready plans must contain at least one step",
    );
  if (args.plan.sourceWrites.length > 0)
    throw new Error(
      "Apply plan failed: sourceWrites are not supported by this apply boundary yet",
    );
}

function isMigrationApplyArgs(
  args: ApplyPlanArgs,
): args is Extract<ApplyPlanArgs, { plan: MigrationPlan }> {
  return args.plan.version === "kibi.migration-plan.v2";
}

function validateMigrationPlanShape(
  args: Extract<ApplyPlanArgs, { plan: MigrationPlan }>,
): MigrationAction[] {
  if (!isRecord(args.plan))
    throw new Error("Migration apply failed: plan must be an object");
  if (args.plan.version !== "kibi.migration-plan.v2")
    throw new Error("Migration apply failed: unsupported plan version");
  if (!/^[a-f0-9]{64}$/i.test(args.approvedPlanHash))
    throw new Error("Migration apply failed: approvedPlanHash must be a SHA-256 hash");
  if (args.approvedPlanHash !== args.plan.planHash)
    throw new Error("Migration apply failed: approvedPlanHash does not match plan.planHash");
  const bodyHash = migrationPlanHash({
    version: args.plan.version,
    expected: args.plan.expected,
    scope: args.plan.scope,
    actions: args.plan.actions,
    diagnostics: args.plan.diagnostics,
  });
  if (bodyHash !== args.plan.planHash)
    throw new Error("Migration apply failed: planHash does not match the canonical plan body");
  if (!Array.isArray(args.approvedActionIds) || args.approvedActionIds.length === 0)
    throw new Error("Migration apply failed: approvedActionIds must contain at least one action");
  const selected = new Set(args.approvedActionIds);
  const actions = args.plan.actions.filter((action) => selected.has(action.id));
  if (actions.length !== selected.size)
    throw new Error("Migration apply failed: approvedActionIds contains an action not present in the plan");
  for (const action of actions) {
    if (action.state !== "ready")
      throw new Error(`Migration apply failed: action '${action.id}' is blocked`);
    if (action.safety !== "automatic" || action.autoApplicable !== true)
      throw new Error(`Migration apply failed: action '${action.id}' is not automatic`);
    for (const dependency of action.dependsOn) {
      if (!selected.has(dependency))
        throw new Error(`Migration apply failed: action '${action.id}' requires approved dependency '${dependency}'`);
    }
  }
  return actions;
}

function topologicalActions(actions: readonly MigrationAction[]): MigrationAction[] {
  const byId = new Map(actions.map((action) => [action.id, action]));
  const result: MigrationAction[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (action: MigrationAction): void => {
    if (visited.has(action.id)) return;
    if (visiting.has(action.id)) throw new Error(`Migration apply failed: action dependency cycle at '${action.id}'`);
    visiting.add(action.id);
    for (const dependency of action.dependsOn) {
      const dependencyAction = byId.get(dependency);
      if (dependencyAction !== undefined) visit(dependencyAction);
    }
    visiting.delete(action.id);
    visited.add(action.id);
    result.push(action);
  };
  for (const action of actions) visit(action);
  return result;
}

async function validateSources(
  context: OperationContext,
  sourceHashes: Readonly<Record<string, string | null>>,
): Promise<number> {
  let checked = 0;
  for (const [relative, expected] of Object.entries(sourceHashes)) {
    if (
      !relative ||
      path.isAbsolute(relative) ||
      relative.split(/[\\/]/).includes("..")
    )
      throw new Error(
        "Apply plan failed: source hash paths must be workspace-relative",
      );
    if (!context.fs)
      throw new Error(
        "Apply plan failed: source hashes require a filesystem-capable runtime",
      );
    let actual: string | null;
    try {
      actual = digest(
        await context.fs.readFile(path.join(context.workspaceRoot, relative)),
      );
    } catch {
      actual = null;
    }
    if (actual !== expected)
      throw new Error(`Apply plan failed: source hash changed for ${relative}`);
    checked += 1;
  }
  return checked;
}

// implements REQ-kibi-change-to-proof-plan-compiler, REQ-agent-guided-migration-orchestration
export async function executeApplyPlan(
  args: ApplyPlanArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  if (isMigrationApplyArgs(args)) {
    return applyMigrationPlan(args, context);
  }
  validateCompilePlanShape(args);
  const prolog =
    context.prolog ?? (await context.ensureProlog?.()) ?? undefined;
  if (!prolog) throw new Error("Apply plan requires a Prolog runtime");
  const operationContext = context.prolog ? context : { ...context, prolog };
  const statusResult = await executeStatus({}, operationContext);
  const status = statusResult.structuredContent;
  if (!status)
    throw new Error("Apply plan failed: status query returned no payload");
  if (status.branch !== args.plan.expected.branch)
    throw new Error("Apply plan failed: branch changed since compilation");
  if (status.snapshotId !== args.plan.expected.kbSnapshotId)
    throw new Error("Apply plan failed: KB snapshot changed since compilation");
  const workspace = await readWorkspaceSnapshot(operationContext);
  if (!workspace.available)
    throw new Error(`Apply plan failed: ${workspace.error}`);
  if (workspace.snapshot.hash !== args.plan.expected.workspaceSnapshot)
    throw new Error(
      "Apply plan failed: workspace snapshot changed since compilation",
    );
  const sourceHashesChecked = await validateSources(
    operationContext,
    args.plan.expected.sourceHashes,
  );
  const steps = args.plan.steps.map((step) => asUpsert(step));
  const notes: string[] = [
    "Plan steps are validated before sequential application; source publishing and crash recovery remain outside this v1 boundary.",
  ];
  let changedEntities = 0;
  let changedRelationships = 0;
  for (const step of steps) {
    const result = await executeUpsert(step, operationContext);
    const payload = result.structuredContent;
    if (payload && typeof payload === "object") {
      const row = payload as {
        created?: number;
        updated?: number;
        relationships_created?: number;
      };
      changedEntities += Number(row.created ?? 0) + Number(row.updated ?? 0);
      changedRelationships += Number(row.relationships_created ?? 0);
    }
  }
  const finalStatusResult = await executeStatus({}, operationContext);
  const finalStatus = finalStatusResult.structuredContent;
  if (!finalStatus)
    throw new Error(
      "Apply plan failed: final status query returned no payload",
    );
  const finalWorkspace = await readWorkspaceSnapshot(operationContext);
  if (!finalWorkspace.available)
    throw new Error(`Apply plan failed: ${finalWorkspace.error}`);
  const payload: ApplyPlanResult = {
    version: PLAN_APPLY_RESULT_VERSION,
    outcome: "applied",
    planHash: args.plan.planHash,
    changedEntities,
    changedRelationships,
    changedPaths: [],
    finalSnapshots: {
      branch: finalStatus.branch,
      kbSnapshotId: finalStatus.snapshotId,
      workspaceSnapshot: finalWorkspace.snapshot.hash,
    },
    validationSummary: {
      stepsValidated: steps.length,
      stepsApplied: steps.length,
      sourceHashesChecked,
      notes,
    },
    recoveryJournalId: null,
  };
  return {
    content: [
      {
        type: "text",
        text: `Applied plan ${args.plan.planHash.slice(0, 12)} with ${steps.length} sequential step(s).`,
      },
    ],
    structuredContent: payload,
  };
}

async function applyMigrationPlan(
  args: Extract<ApplyPlanArgs, { plan: MigrationPlan }>,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  const actions = topologicalActions(validateMigrationPlanShape(args));
  const initialStatus = (await executeStatus({}, context)).structuredContent;
  if (!initialStatus) throw new Error("Migration apply failed: status query returned no payload");
  if (args.plan.expected.branch !== null && initialStatus.branch !== args.plan.expected.branch)
    throw new Error("Migration apply failed: active branch changed since planning");
  if (args.plan.expected.kbBranch !== null && initialStatus.branch !== args.plan.expected.kbBranch)
    throw new Error("Migration apply failed: KB branch changed since planning");
  if (args.plan.expected.kbSnapshotId !== null && initialStatus.snapshotId !== args.plan.expected.kbSnapshotId)
    throw new Error("Migration apply failed: KB snapshot changed since planning");
  if (args.plan.expected.workspaceSnapshot !== null) {
    const workspace = await readWorkspaceSnapshot(context);
    if (!workspace.available || workspace.snapshot.hash !== args.plan.expected.workspaceSnapshot)
      throw new Error("Migration apply failed: workspace snapshot changed since planning");
  }
  if (args.plan.expected.configHash !== null) {
    const currentConfig = readMigrationConfigStatus(context.workspaceRoot);
    if (currentConfig.configHash !== args.plan.expected.configHash)
      throw new Error("Migration apply failed: config changed since planning");
  }
  const results: Array<{ actionId: string; outcome: "applied" | "failed" | "skipped"; detail: string }> = [];
  let failed = false;
  for (const action of actions) {
    if (failed) {
      results.push({ actionId: action.id, outcome: "skipped", detail: "Skipped after an earlier action failed." });
      continue;
    }
    try {
      await applyMigrationAction(action, context);
      results.push({ actionId: action.id, outcome: "applied", detail: `Applied ${action.code}.` });
    } catch (error) {
      failed = true;
      results.push({ actionId: action.id, outcome: "failed", detail: error instanceof Error ? error.message : String(error) });
    }
  }
  const finalStatus = (await executeStatus({}, context)).structuredContent;
  if (!finalStatus) throw new Error("Migration apply failed: final status query returned no payload");
  const finalWorkspace = await readWorkspaceSnapshot(context);
  if (!finalWorkspace.available) throw new Error(`Migration apply failed: ${finalWorkspace.error}`);
  let remainingPlan: MigrationPlan | undefined;
  let coverageSummary: Readonly<Record<string, number>> | undefined;
  if (!failed && finalStatus.branchStore?.state === "healthy") {
    try {
      const prolog = context.prolog ?? (await context.ensureProlog?.());
      if (prolog !== undefined) {
        const operationContext = context.prolog ? context : { ...context, prolog };
        const [{ executeCheck }, { executeCoverage }, { mergeMigrationPlans }] = await Promise.all([
          import("../../public/operations/check-executor.js"),
          import("../../public/operations/specs/reporting.js"),
          import("../../public/operations/migration-plan.js"),
        ]);
        const check = await executeCheck({}, operationContext);
        const coverage = await executeCoverage({ by: "req", limit: 10_000, offset: 0 }, operationContext);
        const symbolCoverage = await executeCoverage({ by: "symbol", limit: 10_000, offset: 0 }, operationContext);
        const fragments = [check.structuredContent?.migrationPlan, coverage.structuredContent?.migrationPlan, symbolCoverage.structuredContent?.migrationPlan].filter(
          (value): value is MigrationPlan => value !== undefined,
        );
        if (fragments.length > 0) remainingPlan = mergeMigrationPlans(fragments);
        coverageSummary = coverage.structuredContent?.summary;
      }
    } catch (error) {
      failed = true;
      results.push({
        actionId: "post-apply-readback",
        outcome: "failed",
        detail: `Post-apply check/coverage readback failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  const outcome = failed
    ? results.some((result) => result.outcome === "applied")
      ? "partially_applied"
      : "reconciliation_required"
    : "applied";
  const kbState = finalStatus.branchAttachment?.migrationRequired
    ? "legacy_compat"
    : finalStatus.syncState === "stale"
      ? "stale"
      : finalStatus.dirty
        ? "dirty"
        : finalStatus.syncState === "fresh"
          ? "clean_fresh"
          : "not_evaluated";
  const verificationState = finalStatus.verificationSnapshotAvailable === false
    ? "unavailable"
    : finalStatus.verificationSnapshotDirty === true
      ? "dirty"
      : finalStatus.verificationSnapshotDirty === false
        ? "fresh"
        : "not_evaluated";
  const proven = coverageSummary?.proofProven;
  const missing = coverageSummary?.proofMissing;
  const proofState = typeof proven !== "number" || typeof missing !== "number"
    ? "not_evaluated"
    : proven > 0 && missing === 0
      ? "proven"
      : proven > 0
        ? "mixed"
        : "unresolved";
  const payload: ApplyPlanResult = {
    version: "kibi.migration-apply-result.v1",
    outcome,
    planHash: args.plan.planHash,
    actionResults: results,
    finalSnapshots: {
      branch: finalStatus.branch,
      kbSnapshotId: finalStatus.snapshotId,
      workspaceSnapshot: finalWorkspace.snapshot.hash,
    },
    notes: ["Migration actions were applied sequentially; rerun kibi status, check, and complete coverage to obtain the next plan."],
    ...(remainingPlan !== undefined ? { remainingPlan } : {}),
    closeout: {
      taskOutcome: outcome === "applied" ? "complete" : outcome === "reconciliation_required" ? "blocked" : "interim",
      kbState,
      verificationState,
      proofState,
      limitationDisposition: "not_applicable",
    },
  };
  return {
    content: [{ type: "text", text: `${outcome === "applied" ? "Applied" : "Stopped after"} migration plan ${args.plan.planHash.slice(0, 12)}.` }],
    structuredContent: payload,
  };
}

async function applyMigrationAction(
  action: MigrationAction,
  context: OperationContext,
): Promise<void> {
  switch (action.code) {
    case "legacy_branch_storage":
      await branchMigrateCommand({ from: "main", apply: true, workspaceRoot: context.workspaceRoot });
      return;
    case "missing_exact_branch_store":
      await branchEnsureCommand({ workspaceRoot: context.workspaceRoot });
      return;
    case "damaged_exact_branch_store":
      await branchRecoverCommand({ apply: true, workspaceRoot: context.workspaceRoot });
      return;
    case "schema_version_upgrade":
    case "invalid_schema_version":
      if ((await migrateCommand({ yes: true, workspaceRoot: context.workspaceRoot, initializeMissingConfig: true })).exitCode !== 0)
        throw new Error("Schema migration did not complete successfully.");
      return;
    case "symbol_refresh_coordinates":
    case "coverage_source_coordinates": {
      const result = await syncCommand({ refreshSymbolCoordinates: true, workspaceRoot: context.workspaceRoot });
      if (!result.success) throw new Error("Coordinate refresh did not complete successfully.");
      return;
    }
    default:
      throw new Error(`Migration action '${action.code}' has no automatic executor.`);
  }
}
