import { createHash } from "node:crypto";
import path from "node:path";

import { executeStatus } from "../../public/operations/discovery-executors.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
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

function validatePlanShape(args: ApplyPlanArgs): void {
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

// implements REQ-kibi-change-to-proof-plan-compiler
export async function executeApplyPlan(
  args: ApplyPlanArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  validatePlanShape(args);
  if (!context.prolog) throw new Error("Apply plan requires a Prolog runtime");
  const statusResult = await executeStatus({}, context);
  const status = statusResult.structuredContent;
  if (!status)
    throw new Error("Apply plan failed: status query returned no payload");
  if (status.branch !== args.plan.expected.branch)
    throw new Error("Apply plan failed: branch changed since compilation");
  if (status.snapshotId !== args.plan.expected.kbSnapshotId)
    throw new Error("Apply plan failed: KB snapshot changed since compilation");
  const workspace = await readWorkspaceSnapshot(context);
  if (!workspace.available)
    throw new Error(`Apply plan failed: ${workspace.error}`);
  if (workspace.snapshot.hash !== args.plan.expected.workspaceSnapshot)
    throw new Error(
      "Apply plan failed: workspace snapshot changed since compilation",
    );
  const sourceHashesChecked = await validateSources(
    context,
    args.plan.expected.sourceHashes,
  );
  const steps = args.plan.steps.map((step) => asUpsert(step));
  const notes: string[] = [
    "Plan steps are validated before sequential application; source publishing and crash recovery remain outside this v1 boundary.",
  ];
  let changedEntities = 0;
  let changedRelationships = 0;
  for (const step of steps) {
    const result = await executeUpsert(step, context);
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
  const finalStatusResult = await executeStatus({}, context);
  const finalStatus = finalStatusResult.structuredContent;
  if (!finalStatus)
    throw new Error(
      "Apply plan failed: final status query returned no payload",
    );
  const finalWorkspace = await readWorkspaceSnapshot(context);
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
