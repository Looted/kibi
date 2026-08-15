import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
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
import type { DeletePayload, RelationshipInput, UpsertInput } from "../mutation/types.js";
import { executeDelete } from "../mutation/delete.js";
import { executeUpsert } from "../mutation/upsert.js";
import { writePendingSourceReceipt } from "../mutation/source-authoring.js";
import {
  type CompilePlanV1,
  type PlanStep,
  type SourceWritePlan,
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
}> | Readonly<{
  plan: EntityDeletionPlan;
  approvedPlanHash: string;
}> | Readonly<{
  recoveryJournalId: string;
}>;

export type EntityDeletionPlan = Readonly<{
  version: "kibi.entity-deletion-plan.v1";
  planHash: string;
  entityIds: readonly string[];
  sourceHashes: Readonly<Record<string, string | null>>;
  sourceWrites?: readonly SourceWritePlan[];
  supersessionRequired: boolean;
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
  status?: "committed_with_repairs";
  effectFailures?: readonly Readonly<Record<string, unknown>>[];
  nextActions?: readonly Readonly<Record<string, unknown>>[];
}> | Readonly<{
  version: "kibi.entity-deletion-apply-result.v1";
  outcome: "applied";
  planHash: string;
  deleted: number;
  sourcePaths: readonly string[];
  recoveryJournalId?: string | null;
  status?: "committed_with_repairs";
  nextActions?: readonly Readonly<Record<string, unknown>>[];
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
  return createHash("sha256").update(value).digest("hex");
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
}

function isMigrationApplyArgs(
  args: ApplyPlanArgs,
): args is Extract<ApplyPlanArgs, { plan: MigrationPlan }> {
  return "plan" in args && args.plan.version === "kibi.migration-plan.v2";
}

function isEntityDeletionApplyArgs(
  args: ApplyPlanArgs,
): args is Extract<ApplyPlanArgs, { plan: EntityDeletionPlan }> {
  return "plan" in args && args.plan.version === "kibi.entity-deletion-plan.v1";
}

function validateEntityDeletionPlan(args: Extract<ApplyPlanArgs, { plan: EntityDeletionPlan }>): void {
  if (!/^[a-f0-9]{64}$/i.test(args.approvedPlanHash) || args.approvedPlanHash !== args.plan.planHash) {
    throw new Error("Entity deletion apply failed: approvedPlanHash does not match planHash");
  }
  const { planHash: _ignored, ...body } = args.plan;
  if (createHash("sha256").update(JSON.stringify(body)).digest("hex") !== args.plan.planHash) {
    throw new Error("Entity deletion apply failed: planHash does not match the canonical plan body");
  }
  if (!Array.isArray(args.plan.entityIds) || args.plan.entityIds.length === 0) {
    throw new Error("Entity deletion apply failed: entityIds must be non-empty");
  }
  if (args.plan.supersessionRequired) {
    throw new Error(
      "REQUIREMENT_SUPERSESSION_REQUIRED: authored requirements evolve through a new requirement linked with supersedes; compile and approve that evolution plan instead of deleting the requirement",
    );
  }
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

async function applySourceWrites(
  context: OperationContext,
  writes: readonly SourceWritePlan[],
  planHash: string,
  allowReplay = false,
): Promise<{ paths: string[]; rollback: () => Promise<void>; journalId: string | null }> {
  if (writes.length === 0) {
    return { paths: [], rollback: async () => undefined, journalId: null };
  }
  if (!context.fs) {
    throw new Error("Apply plan failed: sourceWrites require a filesystem-capable runtime");
  }
  const fsPort = context.fs;
  const journalPath = path.join(
    context.workspaceRoot,
    ".kb",
    "recovery",
    `source-writes-${planHash.slice(0, 16)}.json`,
  );
  const journalId = `source-writes-${planHash.slice(0, 16)}`;
  type JournalEntry = {
    path: string;
    mode: "write" | "delete";
    beforeHash: string | null;
    afterHash: string | null;
    beforeExisted: boolean;
    beforeStage: string;
    afterStage: string;
  };
  type SourceJournal = {
    version: 1;
    planHash: string;
    state:
      | "prepared"
      | "publishing_sources"
      | "sources_committed"
      | "compiled_published"
      | "committed"
      | "repair_required"
      | "rolled_back";
    entries: JournalEntry[];
  };

  const sameEntries = (entries: readonly JournalEntry[]): boolean =>
    entries.length === writes.length &&
    entries.every((entry) =>
      writes.some(
        (write) =>
          write.path === entry.path &&
          (write.mode ?? "write") === entry.mode &&
          write.beforeHash === entry.beforeHash &&
          write.afterHash === entry.afterHash,
      ),
    );
  const readJournal = async (): Promise<SourceJournal | undefined> => {
    try {
      const parsed = JSON.parse(await fsPort.readFile(journalPath)) as Partial<SourceJournal>;
      if (
        parsed.version === 1 &&
        parsed.planHash === planHash &&
        Array.isArray(parsed.entries) &&
        (parsed.state === "prepared" || parsed.state === "publishing_sources" ||
          parsed.state === "sources_committed" || parsed.state === "compiled_published" ||
          parsed.state === "committed" || parsed.state === "repair_required" ||
          parsed.state === "rolled_back") &&
        parsed.entries.every((entry) => entry && typeof entry === "object") &&
        sameEntries(parsed.entries as JournalEntry[])
      ) {
        return parsed as SourceJournal;
      }
    } catch {
      // First attempt or an incomplete journal.
    }
    return undefined;
  };

  const prior = await readJournal();
  const priorPaths = prior?.entries.map((entry) => entry.path) ?? [];
  if (
    prior &&
    ["committed", "sources_committed", "compiled_published", "repair_required"].includes(
      prior.state,
    )
  ) {
    let allAfter = true;
    for (const entry of prior.entries) {
      try {
        const current = await context.fs.readFile(path.resolve(context.workspaceRoot, entry.path));
        if (entry.afterHash === null || digest(current) !== entry.afterHash) {
          allAfter = false;
        }
      } catch {
        if (entry.afterHash !== null) allAfter = false;
      }
    }
    if (allAfter) {
      if (!allowReplay) {
        throw new Error(
          `MUTATION_ALREADY_COMMITTED: source plan ${planHash} already crossed the authoritative commit boundary; use kb_apply_plan recoveryJournalId=${journalId} instead of retrying the original mutation`,
        );
      }
      for (const entry of prior.entries) {
        if (entry.mode === "write" && entry.afterHash !== null) {
          writePendingSourceReceipt(context.workspaceRoot, entry.path, entry.afterHash);
        }
      }
      return { paths: priorPaths, rollback: async () => undefined, journalId };
    }
  }

  if (prior && (prior.state === "prepared" || prior.state === "publishing_sources")) {
    // A crash before the authoritative source commit must restore every
    // before-image. Refuse recovery if another writer changed a target to a
    // hash that is neither the planned before nor after value.
    for (const entry of prior.entries) {
      const absolute = path.resolve(context.workspaceRoot, entry.path);
      let current: string | undefined;
      try {
        current = await context.fs.readFile(absolute);
      } catch {
        current = undefined;
      }
      const currentHash = current === undefined ? null : digest(current);
      if (currentHash !== entry.beforeHash && currentHash !== entry.afterHash) {
        throw new Error(`Apply plan recovery refused: ${entry.path} changed outside its journal`);
      }
      if (entry.beforeExisted) {
        const before = await context.fs.readFile(entry.beforeStage);
        await context.fs.writeFile(absolute, before);
      } else if (context.fs.unlink) {
        await context.fs.unlink(absolute);
      }
    }
    await context.fs.writeFile(
      journalPath,
      `${JSON.stringify({ ...prior, state: "rolled_back" }, null, 2)}\n`,
    );
    return { paths: priorPaths, rollback: async () => undefined, journalId };
  }

  const originals: Array<{ absolute: string; body: string | undefined }> = [];
  const entries: JournalEntry[] = [];
  const paths: string[] = [];
  try {
    // Validate every target and hash before touching the working tree.
    for (const write of writes) {
      if (
        !write.path ||
        path.isAbsolute(write.path) ||
        write.path.split(/[\\/]/).includes("..")
      ) {
        throw new Error(`Apply plan failed: sourceWrites.path must be workspace-relative: ${write.path}`);
      }
      const absolute = path.resolve(context.workspaceRoot, write.path);
      const root = path.resolve(context.workspaceRoot);
      if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
        throw new Error(`Apply plan failed: sourceWrites.path escapes workspace: ${write.path}`);
      }
      const workspaceRelative = path.relative(root, absolute);
      if (
        workspaceRelative === ".kb" ||
        (workspaceRelative.startsWith(`.kb${path.sep}`) &&
          !workspaceRelative.startsWith(`.kb${path.sep}relationships${path.sep}`))
      ) {
        throw new Error(
          "Apply plan failed: sourceWrites.path cannot target Kibi's derived .kb directory (except canonical relationship shards)",
        );
      }
      let existingPath = absolute;
      while (!existsSync(existingPath) && path.dirname(existingPath) !== existingPath) {
        existingPath = path.dirname(existingPath);
      }
      const realExisting = realpathSync.native(existingPath);
      if (realExisting !== root && !realExisting.startsWith(`${root}${path.sep}`)) {
        throw new Error(`Apply plan failed: sourceWrites.path follows a symlink outside the workspace: ${write.path}`);
      }
      const existing = await context.fs.readFile(absolute).catch(() => undefined);
      const beforeHash = existing === undefined ? null : digest(existing);
      if (beforeHash !== write.beforeHash) {
        throw new Error(`Apply plan failed: source hash changed for ${write.path}`);
      }
      const mode = write.mode ?? "write";
      if (
        mode === "write" &&
        (write.body === undefined || write.afterHash === null || digest(write.body) !== write.afterHash)
      ) {
        throw new Error(`Apply plan failed: afterHash does not match staged body for ${write.path}`);
      }
      if (mode === "delete" && write.afterHash !== null) {
        throw new Error(`Apply plan failed: delete source write must have a null afterHash for ${write.path}`);
      }
      originals.push({ absolute, body: existing });
      paths.push(write.path);
      const stageBase = path.join(
        context.workspaceRoot,
        ".kb",
        "recovery",
        `${journalId}-${entries.length}`,
      );
      entries.push({
        path: write.path,
        mode,
        beforeHash: write.beforeHash,
        afterHash: write.afterHash,
        beforeExisted: existing !== undefined,
        beforeStage: `${stageBase}.before`,
        afterStage: `${stageBase}.after`,
      });
    }

    // Stage both versions and publish a prepared journal before any
    // authoritative working-tree write. This makes a crash replayable.
    await context.fs.mkdir(path.dirname(journalPath));
    for (let index = 0; index < writes.length; index += 1) {
      const original = originals[index];
      const entry = entries[index];
      const write = writes[index];
      if (!original || !entry || !write) continue;
      if (original.body !== undefined) {
        await context.fs.writeFile(entry.beforeStage, original.body);
      }
      if ((write.mode ?? "write") === "write") {
        await context.fs.writeFile(entry.afterStage, write.body ?? "");
      }
    }
    await context.fs.writeFile(
      journalPath,
      `${JSON.stringify({ version: 1, planHash, state: "prepared", entries }, null, 2)}\n`,
    );

    // Publish all target files. Journal each boundary so a crash can be
    // rolled back without trusting in-memory originals.
    for (let index = 0; index < writes.length; index += 1) {
      const absolute = originals[index]?.absolute;
      const write = writes[index];
      if (!absolute || !write) continue;
      await context.fs.mkdir(path.dirname(absolute));
      await context.fs.writeFile(
        journalPath,
        `${JSON.stringify({ version: 1, planHash, state: "publishing_sources", entries }, null, 2)}\n`,
      );
      if ((write.mode ?? "write") === "delete") {
        if (!context.fs.unlink) {
          throw new Error(`Apply plan failed: delete requires filesystem unlink support: ${write.path}`);
        }
        await context.fs.unlink(absolute);
      } else {
        const staged = `${absolute}.kibi-stage-${journalId}-${index}`;
        await context.fs.writeFile(staged, write.body ?? "");
        if (context.fs.rename) {
          await context.fs.rename(staged, absolute);
        } else {
          // Test and constrained host ports may not expose rename. Keep the
          // compatibility fallback explicit; production nodeFilesystem uses
          // same-directory rename for atomic replacement.
          await context.fs.writeFile(absolute, write.body ?? "");
          if (context.fs.unlink) await context.fs.unlink(staged).catch(() => undefined);
        }
      }
    }
    await context.fs.writeFile(
      journalPath,
      `${JSON.stringify({ version: 1, planHash, state: "sources_committed", entries }, null, 2)}\n`,
    );
    // A newly authored file is intentionally excluded from ordinary Git
    // discovery until the operator stages it. The receipt binds that pending
    // input to the exact bytes committed by this plan.
    for (const write of writes) {
      if ((write.mode ?? "write") === "write" && write.afterHash !== null) {
        writePendingSourceReceipt(context.workspaceRoot, write.path, write.afterHash);
      }
    }
  } catch (error) {
    for (const original of [...originals].reverse()) {
      try {
        if (original.body === undefined && context.fs.unlink) {
          await context.fs.unlink(original.absolute);
        } else {
          await context.fs.writeFile(original.absolute, original.body ?? "");
        }
      } catch {
        // Preserve the original failure; the journal remains available for
        // the next recovery attempt.
      }
    }
    try {
      await context.fs.mkdir(path.dirname(journalPath));
      await context.fs.writeFile(
        journalPath,
        `${JSON.stringify({ version: 1, planHash, state: "rolled_back", entries }, null, 2)}\n`,
      );
    } catch {
      // Best effort only; the original error is authoritative.
    }
    throw error;
  }
  return {
    paths,
    journalId,
    // Source publication is the authoritative commit boundary. Derived
    // compiled effects must be repaired from the journal, never rolled back
    // by retrying the original mutation.
    rollback: async () => undefined,
  };
}

async function markSourceJournal(
  context: OperationContext,
  journalId: string | null,
  state: "compiled_published" | "committed" | "repair_required" | "rolled_back",
): Promise<void> {
  if (!journalId || !context.fs) return;
  const journalPath = path.join(context.workspaceRoot, ".kb", "recovery", `${journalId}.json`);
  try {
    const current = JSON.parse(await context.fs.readFile(journalPath)) as Record<string, unknown>;
    await context.fs.writeFile(journalPath, `${JSON.stringify({ ...current, state }, null, 2)}\n`);
  } catch {
    // Journal repair is surfaced by the next status/check; do not hide the
    // authoritative operation result behind a best-effort metadata write.
  }
}

async function executeSourceRecovery(
  args: Extract<ApplyPlanArgs, { recoveryJournalId: string }>,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  if (!context.fs) throw new Error("Source recovery requires a filesystem-capable runtime");
  if (!/^[A-Za-z0-9._-]+$/.test(args.recoveryJournalId)) {
    throw new Error("Source recovery journal ID is invalid");
  }
  const journalPath = path.join(
    context.workspaceRoot,
    ".kb",
    "recovery",
    `${args.recoveryJournalId}.json`,
  );
  const journal = JSON.parse(await context.fs.readFile(journalPath)) as {
    version?: number;
    planHash?: string;
    state?: string;
    entries?: readonly {
      path: string;
      mode: "write" | "delete";
      beforeHash: string | null;
      afterHash: string | null;
      beforeExisted: boolean;
      beforeStage: string;
      afterStage: string;
    }[];
  };
  if (
    journal.version !== 1 ||
    typeof journal.planHash !== "string" ||
    !Array.isArray(journal.entries) ||
    !["sources_committed", "compiled_published", "repair_required"].includes(
      journal.state ?? "",
    )
  ) {
    throw new Error(
      "Source recovery requires a committed or repair_required journal",
    );
  }
  const writes: SourceWritePlan[] = [];
  for (const entry of journal.entries) {
    const body =
      entry.mode === "write"
        ? await context.fs.readFile(entry.afterStage)
        : undefined;
    writes.push({
      path: entry.path,
      mode: entry.mode,
      beforeHash: entry.beforeHash,
      afterHash: entry.afterHash,
      ...(body === undefined ? {} : { body }),
    });
  }
  const sourceWrites = await applySourceWrites(
    context,
    writes,
    journal.planHash,
    true,
  );
  for (const write of writes) {
    if (write.mode === "write" && write.afterHash !== null) {
      writePendingSourceReceipt(context.workspaceRoot, write.path, write.afterHash);
    }
  }
  const sync = await syncCommand({
    workspaceRoot: context.workspaceRoot,
    rebuild: true,
  });
  await markSourceJournal(context, sourceWrites.journalId, "committed");
  return {
    content: [{ type: "text", text: `Repaired source journal ${args.recoveryJournalId}.` }],
    structuredContent: {
      version: PLAN_APPLY_RESULT_VERSION,
      outcome: "replayed",
      planHash: journal.planHash,
      changedEntities: sync.entityCounts
        ? Object.values(sync.entityCounts).reduce((sum, count) => sum + count, 0)
        : 0,
      changedRelationships: sync.relationshipCount ?? 0,
      changedPaths: sourceWrites.paths,
      finalSnapshots: {
        branch: sync.branch,
        kbSnapshotId: "recovered",
        workspaceSnapshot: "recovered",
      },
      validationSummary: {
        stepsValidated: 0,
        stepsApplied: 0,
        sourceHashesChecked: writes.length,
        notes: ["Compiled state rebuilt from the authoritative recovery journal."],
      },
      recoveryJournalId: args.recoveryJournalId,
    },
  };
}

// implements REQ-kibi-change-to-proof-plan-compiler, REQ-agent-guided-migration-orchestration
export async function executeApplyPlan(
  args: ApplyPlanArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  if ("recoveryJournalId" in args) {
    return executeSourceRecovery(args, context);
  }
  if (isMigrationApplyArgs(args)) {
    return applyMigrationPlan(args, context);
  }
  if (isEntityDeletionApplyArgs(args)) {
    validateEntityDeletionPlan(args);
    const sourceWrites = await applySourceWrites(
      context,
      args.plan.sourceWrites ?? [],
      args.plan.planHash,
    );
    const operationContext = {
      ...context,
      sourceFirst: false as const,
      sourcePlanApplication: true as const,
    };
    let payload: DeletePayload;
    const nextActions: Readonly<Record<string, unknown>>[] = [];
    let status: "committed_with_repairs" | undefined;
    try {
      const result = await executeDelete(
        { ids: args.plan.entityIds },
        operationContext,
      );
      payload = result.structuredContent as DeletePayload;
      await markSourceJournal(operationContext, sourceWrites.journalId, "compiled_published");
    } catch (error) {
      status = "committed_with_repairs";
      nextActions.push({
        operation: "kb_apply_plan",
        input: { recoveryJournalId: sourceWrites.journalId },
        detail: error instanceof Error ? error.message : String(error),
        reason:
          "The deletion source commit is authoritative but compiled retraction failed; repair from the journal without retrying deletion.",
        required: true,
      });
      await markSourceJournal(operationContext, sourceWrites.journalId, "repair_required");
      payload = {
        deleted: 0,
        skipped: args.plan.entityIds.length,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Applied entity deletion plan ${args.plan.planHash.slice(0, 12)}.`,
        },
      ],
      structuredContent: {
        version: "kibi.entity-deletion-apply-result.v1",
        outcome: "applied",
        planHash: args.plan.planHash,
        deleted: payload.deleted,
        sourcePaths: sourceWrites.paths,
        ...(sourceWrites.journalId !== null
          ? { recoveryJournalId: sourceWrites.journalId }
          : {}),
        ...(status !== undefined ? { status, nextActions } : {}),
      },
    };
  }
  validateCompilePlanShape(args);
  const prolog =
    context.prolog ?? (await context.ensureProlog?.()) ?? undefined;
  if (!prolog) throw new Error("Apply plan requires a Prolog runtime");
  // Compile plans carry the complete, hash-bound sourceWrites set. Apply the
  // compiled entity steps against the staged source snapshot without asking
  // each step to independently select a document target; otherwise a plan
  // with multiple authored entity kinds could be rejected for an ambiguous
  // per-entity path after its source batch has already been validated.
  const operationContext = context.prolog
    ? { ...context, sourceFirst: false as const }
    : { ...context, prolog, sourceFirst: false as const };
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
  const sourceWrites = await applySourceWrites(
    operationContext,
    args.plan.sourceWrites,
    args.plan.planHash,
  );
  const notes: string[] = [
    "Plan steps and tracked source writes are validated before sequential application; source writes are journaled for replay.",
  ];
  let changedEntities = 0;
  let changedRelationships = 0;
  const effectFailures: Readonly<Record<string, unknown>>[] = [];
  const nextActions: Readonly<Record<string, unknown>>[] = [];
  let compiledCommit = false;
  try {
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
        const details = payload as Record<string, unknown>;
        if (Array.isArray(details.effectFailures)) {
          effectFailures.push(
            ...details.effectFailures.filter(isRecord),
          );
        }
        if (Array.isArray(details.nextActions)) {
          nextActions.push(...details.nextActions.filter(isRecord));
        }
      }
    }
    compiledCommit = true;
  } catch (error) {
    if (sourceWrites.journalId !== null) {
      effectFailures.push({
        kind: "compiled-store",
        errorCode: "DERIVED_COMMIT_FAILED",
        detail: error instanceof Error ? error.message : String(error),
      });
      nextActions.push({
        operation: "kb_apply_plan",
        input: { recoveryJournalId: sourceWrites.journalId },
        reason:
          "Authoritative source files are committed but compiled effects failed; replay the recovery journal instead of retrying the original mutation.",
        required: true,
      });
      await markSourceJournal(operationContext, sourceWrites.journalId, "repair_required");
    } else {
      throw error;
    }
  }
  if (compiledCommit) {
    await markSourceJournal(operationContext, sourceWrites.journalId, "compiled_published");
  }
  // Everything before this point is authoritative. A status/workspace
  // readback failure therefore cannot turn the operation into a retryable
  // mutation: return a repairable partial completion with deterministic next
  // actions instead.
  let finalStatus: typeof status | undefined;
  let finalWorkspace: Awaited<ReturnType<typeof readWorkspaceSnapshot>> | undefined;
  let postCommitFailure: string | undefined;
  try {
    const finalStatusResult = await executeStatus({}, operationContext);
    finalStatus = finalStatusResult.structuredContent;
    if (!finalStatus) {
      throw new Error("final status query returned no payload");
    }
    finalWorkspace = await readWorkspaceSnapshot(operationContext);
    if (!finalWorkspace.available) {
      throw new Error(finalWorkspace.error ?? "final workspace snapshot unavailable");
    }
  } catch (error) {
    postCommitFailure = error instanceof Error ? error.message : String(error);
    effectFailures.push({
      kind: "post-commit-readback",
      errorCode: "POST_COMMIT_READBACK_FAILED",
      detail: postCommitFailure,
    });
    nextActions.push(
      {
        operation: "kb_status",
        reason:
          "The plan committed its source and compiled mutations, but final status readback failed; inspect the committed snapshot before any repair.",
        required: true,
      },
      {
        operation: "kb_check",
        reason:
          "After status is readable, run the consistency checks and follow their typed repair actions.",
        required: true,
      },
    );
    await markSourceJournal(operationContext, sourceWrites.journalId, "repair_required");
  }
  const finalSnapshots =
    finalStatus !== undefined && finalWorkspace?.available === true
      ? {
          branch: finalStatus.branch,
          kbSnapshotId: finalStatus.snapshotId,
          workspaceSnapshot: finalWorkspace.snapshot.hash,
        }
      : {
          branch: args.plan.expected.branch,
          kbSnapshotId: args.plan.expected.kbSnapshotId,
          workspaceSnapshot: args.plan.expected.workspaceSnapshot,
        };
  const payload: ApplyPlanResult = {
    version: PLAN_APPLY_RESULT_VERSION,
    outcome: "applied",
    planHash: args.plan.planHash,
    changedEntities,
    changedRelationships,
    changedPaths: sourceWrites.paths,
    finalSnapshots,
    validationSummary: {
      stepsValidated: steps.length,
      stepsApplied: steps.length,
      sourceHashesChecked,
      notes,
    },
    recoveryJournalId: sourceWrites.journalId,
    ...(effectFailures.length > 0 || postCommitFailure !== undefined
      ? {
          status: "committed_with_repairs" as const,
          effectFailures,
          nextActions,
        }
      : {}),
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
      if (action.invocation.kind !== "cli")
        throw new Error("Legacy branch migration action is missing its explicit source identity.");
      {
        const argv = action.invocation.command_argv;
        const fromIndex = argv.indexOf("--from");
        const toIndex = argv.indexOf("--to");
        const from = fromIndex >= 0 ? argv[fromIndex + 1] : undefined;
        const to = toIndex >= 0 ? argv[toIndex + 1] : undefined;
        if (!from || !to) throw new Error("Legacy branch migration action requires explicit --from and --to.");
        await branchMigrateCommand({ from, to, apply: true, workspaceRoot: context.workspaceRoot });
      }
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
