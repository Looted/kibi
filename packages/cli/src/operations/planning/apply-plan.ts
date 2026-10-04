import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { OperationError } from "../../cli-errors.js";
import {
  branchEnsureCommand,
  branchMigrateCommand,
  branchRecoverCommand,
} from "../../commands/branch.js";
import { migrateCommand } from "../../commands/migrate.js";
import { syncCommand } from "../../commands/sync.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import { executeStatus } from "../../public/operations/discovery-executors.js";
import {
  type MigrationAction,
  type MigrationPlan,
  PREDICATE_SCHEMA_ALIGNMENT_CODE,
  migrationPlanHash,
} from "../../public/operations/migration-plan.js";
import { readMigrationConfigStatus } from "../../public/operations/migration-plan.js";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../public/operations/runtime-types.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
import {
  computeShardPath,
  renderShardWithRelationship,
} from "../../relationships/shards.js";
import { canonicalFilesystemPath } from "../../utils/canonical-path.js";
import { isDerivedKbPath } from "../../utils/kb-paths.js";
import {
  type BootstrapAction,
  type BootstrapPlanV1,
  bootstrapEmptyKbSnapshotId,
  bootstrapPlanHash,
} from "../bootstrap/types.js";
import {
  SCHEMA6_AUTOMATIC_CODES,
  applySchema6MigrationAction,
} from "../migration/schema6.js";
import {
  buildUpsertBatchCommitGoal,
  formatUpsertError,
} from "../mutation/contradictions.js";
import { executeDelete } from "../mutation/delete.js";
import {
  PLAN_APPLY_JOURNAL_VERSION,
  type PlanApplyFileWrite,
  type PlanApplyJournal,
  type PlanApplyJournalHandle,
  type PlanApplyRecovery,
  type PlanApplyStoreEntry,
  contentHash,
  createPlanApplyJournal,
  isPlanApplyJournalId,
  openPlanApplyJournal,
  openPlanApplyJournalById,
  planRecoveryNotes,
  publishJournaledFiles,
  reconcilePendingSourceReceipts,
  recordPlanApplyJournal,
  recoverPlanApplyJournal,
  restoreJournaledFiles,
  settlePendingPlanApplyJournals,
  storeFingerprint,
  withPlanRecoveryNotes,
} from "../mutation/plan-apply-journal.js";
import type {
  DeletePayload,
  RelationshipInput,
  UpsertInput,
} from "../mutation/types.js";
import {
  assertRelationshipShardContained,
  executeUpsert,
  validateUpsertForCommit,
} from "../mutation/upsert.js";
import {
  type WorkspaceMutationLockHandle,
  acquireWorkspaceMutationLock,
  releaseWorkspaceMutationLock,
} from "../mutation/workspace-mutation-lock.js";
import {
  type CompilePlanV1,
  type PlanStep,
  type SourceWritePlan,
  compilePlanHash,
  isBlockingWitness,
  parseWhatIfAnalysis,
  planWhatIfGoal,
} from "./compile-intent.js";

import type {
  ApplyPlanArgs,
  ApplyPlanResult,
  BootstrapActionResult,
  EntityDeletionPlan,
} from "./apply-plan-types.js";

export type {
  ApplyPlanArgs,
  ApplyPlanResult,
  EntityDeletionPlan,
} from "./apply-plan-types.js";

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export const PLAN_APPLY_RESULT_VERSION = "kibi.plan-apply-result.v1" as const;

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
  const document = isRecord(step.document)
    ? {
        ...(typeof step.document.path === "string"
          ? { path: step.document.path }
          : {}),
        ...(typeof step.document.body === "string"
          ? { body: step.document.body }
          : {}),
      }
    : undefined;
  return {
    type,
    id,
    properties,
    relationships: relationships(step),
    ...(document !== undefined ? { document } : {}),
  };
}

function validateCompilePlanShape(
  args: Extract<ApplyPlanArgs, { plan: CompilePlanV1 }>,
): void {
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

function isBootstrapApplyArgs(
  args: ApplyPlanArgs,
): args is Extract<ApplyPlanArgs, { plan: BootstrapPlanV1 }> {
  return "plan" in args && args.plan.version === "kibi.bootstrap-plan.v1";
}

export function assertSourceWriteStaysInWorkspace(
  root: string,
  absolute: string,
  writePath: string,
): void {
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error(
      `Apply plan failed: sourceWrites.path escapes workspace: ${writePath}`,
    );
  }
}

export function assertBootstrapRecoveryDependencies(
  remaining: readonly { id: string; dependsOn?: readonly string[] }[],
  applied: ReadonlySet<string>,
): void {
  for (const action of remaining) {
    for (const dependency of action.dependsOn ?? []) {
      if (
        !applied.has(dependency) &&
        !remaining.some((candidate) => candidate.id === dependency)
      ) {
        throw new Error(
          `Bootstrap recovery journal is missing dependency '${dependency}' for '${action.id}'`,
        );
      }
    }
  }
}

export function orderBootstrapActions(
  actions: readonly BootstrapAction[],
  completed = new Set<string>(),
): BootstrapAction[] {
  const byId = new Map<string, BootstrapAction>();
  for (const action of actions) {
    if (!action.id || byId.has(action.id))
      throw new Error("Bootstrap apply failed: action IDs must be unique");
    if (action.kind !== "upsert" || !isRecord(action.payload))
      throw new Error(
        `Bootstrap apply failed: action '${action.id}' is invalid`,
      );
    byId.set(action.id, action);
  }
  const result: BootstrapAction[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (action: BootstrapAction): void => {
    if (visited.has(action.id)) return;
    if (completed.has(action.id)) {
      visited.add(action.id);
      return;
    }
    if (visiting.has(action.id))
      throw new Error(
        `Bootstrap apply failed: dependency cycle at '${action.id}'`,
      );
    visiting.add(action.id);
    for (const dependency of action.dependsOn ?? []) {
      if (completed.has(dependency)) continue;
      const endpoint = byId.get(dependency);
      if (!endpoint)
        throw new Error(
          `Bootstrap apply failed: action '${action.id}' requires missing dependency '${dependency}'`,
        );
      visit(endpoint);
    }
    visiting.delete(action.id);
    visited.add(action.id);
    result.push(action);
  };
  for (const action of [...actions].sort((left, right) =>
    left.id.localeCompare(right.id),
  ))
    visit(action);
  return result;
}

function validateBootstrapPlanShape(
  args: Extract<ApplyPlanArgs, { plan: BootstrapPlanV1 }>,
): BootstrapAction[] {
  const { plan } = args;
  if (plan.status !== "ready")
    throw new Error("Bootstrap apply failed: only ready plans may be applied");
  if (!/^[a-f0-9]{64}$/i.test(args.approvedPlanHash))
    throw new Error("Bootstrap apply failed: approvedPlanHash must be SHA-256");
  if (args.approvedPlanHash !== plan.planHash)
    throw new Error(
      "Bootstrap apply failed: approvedPlanHash does not match planHash",
    );
  if (
    bootstrapPlanHash(plan as unknown as Record<string, unknown>) !==
    plan.planHash
  )
    throw new Error(
      "Bootstrap apply failed: planHash does not match canonical plan body",
    );
  if (plan.activation.applyBlocked)
    throw new Error(
      "Bootstrap apply failed: activation policy blocks application",
    );
  if (
    !plan.expected.branch ||
    plan.expected.branch === "unknown" ||
    plan.expected.branch === "unavailable" ||
    !plan.expected.kbSnapshotId ||
    plan.expected.kbSnapshotId === "unknown" ||
    plan.expected.kbSnapshotId === "missing" ||
    plan.expected.kbSnapshotId === "unavailable" ||
    !/^[a-f0-9]{64}$/i.test(plan.expected.workspaceSnapshot)
  ) {
    throw new Error(
      "Bootstrap apply failed: ready plans require exact branch, KB snapshot, and workspace snapshot bindings",
    );
  }
  if (
    !/^[a-f0-9]{64}$/i.test(plan.expected.kbSnapshotId) &&
    !/^empty-source-state-[a-f0-9]{64}$/i.test(plan.expected.kbSnapshotId)
  ) {
    throw new Error(
      "Bootstrap apply failed: ready plans require an exact KB snapshot binding",
    );
  }
  for (const [sourcePath, sourceHash] of Object.entries(
    plan.expected.sourceHashes,
  )) {
    if (
      !sourcePath ||
      sourceHash === null ||
      !/^[a-f0-9]{64}$/i.test(sourceHash)
    )
      throw new Error(
        `Bootstrap apply failed: ready plans require an exact hash for evidence source '${sourcePath}'`,
      );
  }
  if (!Array.isArray(plan.actions) || plan.actions.length === 0)
    throw new Error("Bootstrap apply failed: ready plans must contain actions");
  return orderBootstrapActions(plan.actions);
}

function isEntityDeletionApplyArgs(
  args: ApplyPlanArgs,
): args is Extract<ApplyPlanArgs, { plan: EntityDeletionPlan }> {
  return "plan" in args && args.plan.version === "kibi.entity-deletion-plan.v1";
}

function validateEntityDeletionPlan(
  args: Extract<ApplyPlanArgs, { plan: EntityDeletionPlan }>,
): void {
  if (
    !/^[a-f0-9]{64}$/i.test(args.approvedPlanHash) ||
    args.approvedPlanHash !== args.plan.planHash
  ) {
    throw new Error(
      "Entity deletion apply failed: approvedPlanHash does not match planHash",
    );
  }
  const { planHash: _ignored, ...body } = args.plan;
  if (
    createHash("sha256").update(JSON.stringify(body)).digest("hex") !==
    args.plan.planHash
  ) {
    throw new Error(
      "Entity deletion apply failed: planHash does not match the canonical plan body",
    );
  }
  if (!Array.isArray(args.plan.entityIds) || args.plan.entityIds.length === 0) {
    throw new Error(
      "Entity deletion apply failed: entityIds must be non-empty",
    );
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
    throw new Error(
      "Migration apply failed: approvedPlanHash must be a SHA-256 hash",
    );
  if (args.approvedPlanHash !== args.plan.planHash)
    throw new Error(
      "Migration apply failed: approvedPlanHash does not match plan.planHash",
    );
  const bodyHash = migrationPlanHash({
    version: args.plan.version,
    expected: args.plan.expected,
    scope: args.plan.scope,
    actions: args.plan.actions,
    diagnostics: args.plan.diagnostics,
  });
  if (bodyHash !== args.plan.planHash)
    throw new Error(
      "Migration apply failed: planHash does not match the canonical plan body",
    );
  if (
    !Array.isArray(args.approvedActionIds) ||
    args.approvedActionIds.length === 0
  )
    throw new Error(
      "Migration apply failed: approvedActionIds must contain at least one action",
    );
  const selected = new Set(args.approvedActionIds);
  const actions = args.plan.actions.filter((action) => selected.has(action.id));
  if (actions.length !== selected.size)
    throw new Error(
      "Migration apply failed: approvedActionIds contains an action not present in the plan",
    );
  for (const action of actions) {
    if (action.state !== "ready")
      throw new Error(
        `Migration apply failed: action '${action.id}' is blocked`,
      );
    if (action.safety !== "automatic" || action.autoApplicable !== true)
      throw new Error(
        `Migration apply failed: action '${action.id}' is not automatic`,
      );
    for (const dependency of action.dependsOn) {
      if (!selected.has(dependency))
        throw new Error(
          `Migration apply failed: action '${action.id}' requires approved dependency '${dependency}'`,
        );
    }
  }
  return actions;
}

function topologicalActions(
  actions: readonly MigrationAction[],
): MigrationAction[] {
  const byId = new Map(actions.map((action) => [action.id, action]));
  const result: MigrationAction[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (action: MigrationAction): void => {
    if (visited.has(action.id)) return;
    if (visiting.has(action.id))
      throw new Error(
        `Migration apply failed: action dependency cycle at '${action.id}'`,
      );
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

/**
 * Validate one approved source write against the live workspace: the target
 * must be workspace-relative, stay inside the workspace (also through
 * symlinks), avoid Kibi's derived runtime trees, still hold the approved
 * before-bytes, and carry an after-hash that matches its staged body.
 */
async function resolveSourceWriteTarget(
  workspaceRoot: string,
  fsPort: NonNullable<OperationContext["fs"]>,
  write: SourceWritePlan,
): Promise<{
  absolute: string;
  /** Workspace-relative path with forward slashes. */
  relative: string;
  existing: string | undefined;
  mode: "write" | "delete";
}> {
  if (
    !write.path ||
    path.isAbsolute(write.path) ||
    write.path.split(/[\\/]/).includes("..")
  ) {
    throw new Error(
      `Apply plan failed: sourceWrites.path must be workspace-relative: ${write.path}`,
    );
  }
  const absolute = path.resolve(workspaceRoot, write.path);
  const root = path.resolve(workspaceRoot);
  assertSourceWriteStaysInWorkspace(root, absolute, write.path);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (relative === ".kb" || isDerivedKbPath(relative)) {
    throw new Error(
      "Apply plan failed: sourceWrites.path cannot target Kibi's derived .kb runtime trees",
    );
  }
  const realRoot = canonicalFilesystemPath(root);
  const realExisting = canonicalFilesystemPath(absolute);
  if (
    realExisting !== realRoot &&
    !realExisting.startsWith(`${realRoot}${path.sep}`)
  ) {
    throw new Error(
      `Apply plan failed: sourceWrites.path follows a symlink outside the workspace: ${write.path}`,
    );
  }
  const existing = await fsPort.readFile(absolute).catch(() => undefined);
  const beforeHash = existing === undefined ? null : digest(existing);
  if (beforeHash !== write.beforeHash) {
    throw new Error(`Apply plan failed: source hash changed for ${write.path}`);
  }
  const mode = write.mode ?? "write";
  if (
    mode === "write" &&
    (write.body === undefined ||
      write.afterHash === null ||
      digest(write.body) !== write.afterHash)
  ) {
    throw new Error(
      `Apply plan failed: afterHash does not match staged body for ${write.path}`,
    );
  }
  if (mode === "delete" && write.afterHash !== null) {
    throw new Error(
      `Apply plan failed: delete source write must have a null afterHash for ${write.path}`,
    );
  }
  return { absolute, relative, existing, mode };
}

async function applySourceWrites(
  context: OperationContext,
  writes: readonly SourceWritePlan[],
  planHash: string,
  allowReplay = false,
  onCommitted: () => void = () => undefined,
): Promise<{
  paths: string[];
  rollback: () => Promise<void>;
  journalId: string | null;
}> {
  if (writes.length === 0) {
    return { paths: [], rollback: async () => undefined, journalId: null };
  }
  if (!context.fs) {
    throw new Error(
      "Apply plan failed: sourceWrites require a filesystem-capable runtime",
    );
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
      const parsed = JSON.parse(
        await fsPort.readFile(journalPath),
      ) as Partial<SourceJournal>;
      if (
        parsed.version === 1 &&
        parsed.planHash === planHash &&
        Array.isArray(parsed.entries) &&
        (parsed.state === "prepared" ||
          parsed.state === "publishing_sources" ||
          parsed.state === "sources_committed" ||
          parsed.state === "compiled_published" ||
          parsed.state === "committed" ||
          parsed.state === "repair_required" ||
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
    [
      "committed",
      "sources_committed",
      "compiled_published",
      "repair_required",
    ].includes(prior.state)
  ) {
    let allAfter = true;
    for (const entry of prior.entries) {
      try {
        const current = await context.fs.readFile(
          path.resolve(context.workspaceRoot, entry.path),
        );
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
      onCommitted();
      reconcilePendingSourceReceipts(context.workspaceRoot, prior.entries);
      return { paths: priorPaths, rollback: async () => undefined, journalId };
    }
  }

  if (
    prior &&
    (prior.state === "prepared" || prior.state === "publishing_sources")
  ) {
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
        throw new Error(
          `Apply plan recovery refused: ${entry.path} changed outside its journal`,
        );
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
  let sourceCommitted = false;
  try {
    // Validate every target and hash before touching the working tree.
    for (const write of writes) {
      const { absolute, existing, mode } = await resolveSourceWriteTarget(
        context.workspaceRoot,
        fsPort,
        write,
      );
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
          throw new Error(
            `Apply plan failed: delete requires filesystem unlink support: ${write.path}`,
          );
        }
        await context.fs.unlink(absolute);
      } else {
        const staged = `${absolute}.kibi-stage-${journalId}-${index}-${randomUUID()}`;
        try {
          await context.fs.writeFile(staged, write.body ?? "");
          if (context.fs.rename) {
            await context.fs.rename(staged, absolute);
          } else {
            // Test and constrained host ports may not expose rename. Keep the
            // compatibility fallback explicit; production nodeFilesystem uses
            // same-directory rename for atomic replacement.
            await context.fs.writeFile(absolute, write.body ?? "");
            if (context.fs.unlink)
              await context.fs.unlink(staged).catch(() => undefined);
          }
        } catch (error) {
          // A failed rename must not leak the unique staged temp file into
          // the authored tree; rollback of originals happens in the caller.
          if (context.fs.unlink)
            await context.fs.unlink(staged).catch(() => undefined);
          throw error;
        }
      }
    }
    await context.fs.writeFile(
      journalPath,
      `${JSON.stringify({ version: 1, planHash, state: "sources_committed", entries }, null, 2)}\n`,
    );
    sourceCommitted = true;
    onCommitted();
    // A newly authored file is intentionally excluded from ordinary Git
    // discovery until the operator stages it. The receipt binds that pending
    // input to the exact bytes committed by this plan.
    reconcilePendingSourceReceipts(context.workspaceRoot, writes);
  } catch (error) {
    if (sourceCommitted) {
      // The authoritative source bytes must remain in place once the commit
      // milestone has fired. A pending receipt failure is repair metadata
      // failure, not permission to roll back the committed mutation. Surface
      // the recovery journal instead of a generic exception so callers never
      // read the committed plan as retryable.
      await markSourceJournal(context, journalId, "repair_required");
      if (error instanceof OperationError) throw error;
      throw new OperationError(
        "SOURCE_COMMIT_REPAIR_REQUIRED",
        `Source plan ${planHash} committed its authoritative bytes, but postcommit repair metadata failed: ${error instanceof Error ? error.message : String(error)}; recovery journal ${journalId} is marked repair_required; use kb_apply_plan recoveryJournalId=${journalId} instead of retrying the original mutation`,
        false,
      );
    }
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
  const journalPath = path.join(
    context.workspaceRoot,
    ".kb",
    "recovery",
    `${journalId}.json`,
  );
  try {
    const current = JSON.parse(
      await context.fs.readFile(journalPath),
    ) as Record<string, unknown>;
    await context.fs.writeFile(
      journalPath,
      `${JSON.stringify({ ...current, state }, null, 2)}\n`,
    );
  } catch {
    // Journal repair is surfaced by the next status/check; do not hide the
    // authoritative operation result behind a best-effort metadata write.
  }
}

async function executeSourceRecovery(
  args: Extract<ApplyPlanArgs, { recoveryJournalId: string }>,
  context: OperationContext,
  onCommitted: () => void = () => undefined,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  if (!context.fs)
    throw new Error("Source recovery requires a filesystem-capable runtime");
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
    onCommitted,
  );
  reconcilePendingSourceReceipts(context.workspaceRoot, writes);
  const sync = await syncCommand({
    workspaceRoot: context.workspaceRoot,
    rebuild: true,
  });
  await markSourceJournal(context, sourceWrites.journalId, "committed");
  return {
    content: [
      {
        type: "text",
        text: `Repaired source journal ${args.recoveryJournalId}.`,
      },
    ],
    structuredContent: {
      version: PLAN_APPLY_RESULT_VERSION,
      outcome: "replayed",
      planHash: journal.planHash,
      changedEntities: sync.entityCounts
        ? Object.values(sync.entityCounts).reduce(
            (sum, count) => sum + count,
            0,
          )
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
        notes: [
          "Compiled state rebuilt from the authoritative recovery journal.",
        ],
      },
      recoveryJournalId: args.recoveryJournalId,
    },
  };
}

async function executeBootstrapPlan(
  args: Extract<ApplyPlanArgs, { plan: BootstrapPlanV1 }>,
  context: OperationContext,
  recovery = false,
  remainingActions?: readonly BootstrapAction[],
  priorResults: readonly BootstrapActionResult[] = [],
  onCommitted: () => void = () => undefined,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  const actions = recovery
    ? [...(remainingActions ?? args.plan.actions)]
    : validateBootstrapPlanShape(args);
  const prolog = context.prolog ?? (await context.ensureProlog?.());
  if (!prolog) throw new Error("Bootstrap apply requires a Prolog runtime");
  const operationContext = { ...context, prolog, sourceFirst: true as const };
  const statusResult = await executeStatus({}, operationContext);
  const status = statusResult.structuredContent;
  if (!status)
    throw new Error("Bootstrap apply failed: status returned no payload");
  const workspace = await readWorkspaceSnapshot(operationContext);
  const boundLiveKbSnapshot =
    status.snapshotId === "missing" &&
    workspace.available &&
    /^[a-f0-9]{64}$/i.test(workspace.snapshot.hash)
      ? bootstrapEmptyKbSnapshotId({
          branch: status.branch,
          workspaceSnapshot: workspace.snapshot.hash,
          sourceHashes: args.plan.expected.sourceHashes,
        })
      : status.snapshotId;
  if (!recovery) {
    if (
      args.plan.expected.branch !== "unknown" &&
      status.branch !== args.plan.expected.branch
    )
      throw new Error("Bootstrap apply failed: branch changed since planning");
    if (boundLiveKbSnapshot !== args.plan.expected.kbSnapshotId)
      throw new Error(
        "Bootstrap apply failed: KB snapshot changed since planning",
      );
    if (
      args.plan.expected.workspaceSnapshot !== "unknown" &&
      (!workspace.available ||
        workspace.snapshot.hash !== args.plan.expected.workspaceSnapshot)
    )
      throw new Error(
        "Bootstrap apply failed: workspace snapshot changed since planning",
      );
    await validateSources(operationContext, args.plan.expected.sourceHashes);
  }
  const journalId = `bootstrap-${args.plan.planHash.slice(0, 16)}`;
  const journalPath = path.join(
    context.workspaceRoot,
    ".kb",
    "recovery",
    `${journalId}.json`,
  );
  if (!recovery && context.fs) {
    try {
      await context.fs.readFile(journalPath);
      throw new Error(
        `Bootstrap apply refused: journal ${journalId} already exists; recover it with kb_apply_plan recoveryJournalId=${journalId} instead of replaying the original plan`,
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("journal "))
        throw error;
      // No journal exists yet; this is the first application attempt.
    }
  }
  const results: BootstrapActionResult[] = [...priorResults];
  let changedEntities = 0;
  let changedRelationships = 0;
  const failures: Readonly<Record<string, unknown>>[] = [];
  let activeActionId: string | undefined;
  type BootstrapCheckpoint = {
    branch: string;
    kbSnapshotId: string;
    workspaceSnapshot: string;
  };
  const checkpoint = async (): Promise<BootstrapCheckpoint> => {
    const current = (await executeStatus({}, operationContext))
      .structuredContent;
    const currentWorkspace = await readWorkspaceSnapshot(operationContext);
    return {
      branch: current?.branch ?? "unavailable",
      kbSnapshotId:
        current?.snapshotId === "missing" &&
        currentWorkspace.available &&
        /^[a-f0-9]{64}$/i.test(currentWorkspace.snapshot.hash)
          ? bootstrapEmptyKbSnapshotId({
              branch: current?.branch ?? "unavailable",
              workspaceSnapshot: currentWorkspace.snapshot.hash,
              sourceHashes: args.plan.expected.sourceHashes,
            })
          : (current?.snapshotId ?? "unavailable"),
      workspaceSnapshot: currentWorkspace.available
        ? currentWorkspace.snapshot.hash
        : "unavailable",
    };
  };
  const initialCheckpoint = await checkpoint();
  let lastCheckpoint = initialCheckpoint;
  const writeJournal = async (
    state: "applying" | "committed" | "repair_required",
    activeActionId?: string,
    currentCheckpoint: BootstrapCheckpoint = lastCheckpoint,
  ) => {
    if (!context.fs) return;
    await context.fs.mkdir(path.dirname(journalPath));
    await context.fs.writeFile(
      journalPath,
      `${JSON.stringify({ version: 2, kind: "bootstrap", plan: args.plan, state, checkpoint: currentCheckpoint, ...(activeActionId ? { activeActionId } : {}), results }, null, 2)}\n`,
    );
  };
  await writeJournal("applying", undefined, initialCheckpoint);
  try {
    for (const action of actions) {
      try {
        activeActionId = action.id;
        await writeJournal("applying", activeActionId);
        const result = await executeUpsert(
          asUpsert(action.payload as PlanStep),
          operationContext,
        );
        onCommitted();
        const payload = result.structuredContent;
        if (payload && typeof payload === "object") {
          const row = payload as Record<string, unknown>;
          changedEntities +=
            Number(row.created ?? 0) + Number(row.updated ?? 0);
          changedRelationships += Number(row.relationships_created ?? 0);

          // A source-first upsert can commit its authoritative mutation while
          // a derived effect still needs repair. Treat that as a committed
          // action with repair state, checkpoint it, and stop the bootstrap
          // graph. Recovery will see the applied action in the journal and
          // resume only its remaining dependants.
          if (row.status === "committed_with_repairs") {
            results.push({
              actionId: action.id,
              outcome: "applied",
              detail:
                "Applied with committed derived effects requiring repair.",
            });
            const effectFailures = Array.isArray(row.effectFailures)
              ? row.effectFailures
                  .filter(
                    (failure): failure is Readonly<Record<string, unknown>> =>
                      failure !== null &&
                      typeof failure === "object" &&
                      !Array.isArray(failure),
                  )
                  .map((failure) => ({ ...failure, actionId: action.id }))
              : [];
            failures.push(...effectFailures);
            const nextActions = Array.isArray(row.nextActions)
              ? row.nextActions.filter(
                  (
                    nextAction,
                  ): nextAction is Readonly<Record<string, unknown>> =>
                    nextAction !== null &&
                    typeof nextAction === "object" &&
                    !Array.isArray(nextAction),
                )
              : [];
            lastCheckpoint = await checkpoint();
            activeActionId = undefined;
            await writeJournal("repair_required", action.id, lastCheckpoint);
            return {
              content: [
                {
                  type: "text",
                  text: `Bootstrap plan ${args.plan.planHash.slice(0, 12)} committed an action with repair effects; repair journal ${journalId}.`,
                },
              ],
              structuredContent: {
                version: PLAN_APPLY_RESULT_VERSION,
                outcome: "partially_applied",
                planHash: args.plan.planHash,
                actionResults: results,
                changedEntities,
                changedRelationships,
                finalSnapshots: {
                  branch: lastCheckpoint.branch,
                  kbSnapshotId: lastCheckpoint.kbSnapshotId,
                  workspaceSnapshot: lastCheckpoint.workspaceSnapshot,
                },
                recoveryJournalId: journalId,
                changedPaths: [],
                validationSummary: {
                  stepsValidated: actions.length,
                  stepsApplied: results.filter(
                    (row) => row.outcome === "applied",
                  ).length,
                  sourceHashesChecked: Object.keys(
                    args.plan.expected.sourceHashes,
                  ).length,
                  notes: [
                    "Bootstrap stopped after an authoritative action committed with derived repair effects.",
                  ],
                },
                status: "committed_with_repairs",
                effectFailures: failures,
                nextActions: [
                  ...nextActions,
                  {
                    operation: "kb_apply_plan",
                    input: { recoveryJournalId: journalId },
                    reason:
                      "Resume the remaining bootstrap actions from the immutable recovery journal; do not retry the original plan.",
                    required: true,
                  },
                ],
              },
            };
          }
        }
        results.push({
          actionId: action.id,
          outcome: "applied",
          detail: "Applied sequentially.",
        });
        lastCheckpoint = await checkpoint();
        activeActionId = undefined;
        await writeJournal("applying", undefined, lastCheckpoint);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        results.push({ actionId: action.id, outcome: "failed", detail });
        failures.push({ actionId: action.id, detail });
        await writeJournal("repair_required", activeActionId, lastCheckpoint);
        return {
          content: [
            {
              type: "text",
              text: `Bootstrap plan ${args.plan.planHash.slice(0, 12)} partially applied; repair journal ${journalId}.`,
            },
          ],
          structuredContent: {
            version: PLAN_APPLY_RESULT_VERSION,
            outcome: "partially_applied",
            planHash: args.plan.planHash,
            actionResults: results,
            changedEntities,
            changedRelationships,
            finalSnapshots: {
              branch: lastCheckpoint.branch,
              kbSnapshotId: lastCheckpoint.kbSnapshotId,
              workspaceSnapshot: lastCheckpoint.workspaceSnapshot,
            },
            recoveryJournalId: journalId,
            changedPaths: [],
            validationSummary: {
              stepsValidated: actions.length,
              stepsApplied: results.filter((row) => row.outcome === "applied")
                .length,
              sourceHashesChecked: Object.keys(args.plan.expected.sourceHashes)
                .length,
              notes: [
                "Bootstrap application stopped at a repairable action failure.",
              ],
            },
            status: "committed_with_repairs",
            effectFailures: failures,
            nextActions: [
              {
                operation: "kb_apply_plan",
                input: { recoveryJournalId: journalId },
                reason:
                  "Resume the remaining bootstrap actions from the immutable recovery journal; do not retry the original plan.",
                required: true,
              },
            ],
          },
        };
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    failures.push({ kind: "bootstrap", detail });
    await writeJournal("repair_required", activeActionId, lastCheckpoint);
    return {
      content: [
        {
          type: "text",
          text: `Bootstrap plan ${args.plan.planHash.slice(0, 12)} requires repair; journal ${journalId}.`,
        },
      ],
      structuredContent: {
        version: PLAN_APPLY_RESULT_VERSION,
        outcome: "partially_applied",
        planHash: args.plan.planHash,
        actionResults: results,
        changedEntities,
        changedRelationships,
        finalSnapshots: {
          branch: lastCheckpoint.branch,
          kbSnapshotId: lastCheckpoint.kbSnapshotId,
          workspaceSnapshot: lastCheckpoint.workspaceSnapshot,
        },
        recoveryJournalId: journalId,
        changedPaths: [],
        validationSummary: {
          stepsValidated: actions.length,
          stepsApplied: results.filter((row) => row.outcome === "applied")
            .length,
          sourceHashesChecked: Object.keys(args.plan.expected.sourceHashes)
            .length,
          notes: [
            "Bootstrap application stopped before its full action graph completed.",
          ],
        },
        status: "committed_with_repairs",
        effectFailures: failures,
        nextActions: [
          {
            operation: "kb_apply_plan",
            input: { recoveryJournalId: journalId },
            reason:
              "Resume the remaining bootstrap actions from the immutable recovery journal; do not retry the original plan.",
            required: true,
          },
        ],
      },
    };
  }
  await writeJournal("committed");
  const finalStatus =
    (await executeStatus({}, operationContext)).structuredContent ?? status;
  const finalWorkspace = await readWorkspaceSnapshot(operationContext);
  return {
    content: [
      {
        type: "text",
        text: `Applied bootstrap plan ${args.plan.planHash.slice(0, 12)}.`,
      },
    ],
    structuredContent: {
      version: PLAN_APPLY_RESULT_VERSION,
      outcome: "applied",
      planHash: args.plan.planHash,
      actionResults: results,
      changedEntities,
      changedRelationships,
      finalSnapshots: {
        branch: finalStatus.branch,
        kbSnapshotId: finalStatus.snapshotId,
        workspaceSnapshot: finalWorkspace.available
          ? finalWorkspace.snapshot.hash
          : "unknown",
      },
      recoveryJournalId: context.fs ? journalId : null,
      changedPaths: [],
      validationSummary: {
        stepsValidated: actions.length,
        stepsApplied: results.filter((row) => row.outcome === "applied").length,
        sourceHashesChecked: Object.keys(args.plan.expected.sourceHashes)
          .length,
        notes: [
          "Bootstrap actions applied sequentially through the shared plan executor.",
        ],
      },
    },
  };
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-atomic-upsert-persistence
async function executeApplyPlanUnlocked(
  args: ApplyPlanArgs,
  context: OperationContext,
  onCommitted: () => void = () => undefined,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  // Finish any interrupted plan application before this call reads or writes
  // anything, and report what was done alongside this call's own result.
  const recovered = await recoverInterruptedPlans(
    context,
    "recoveryJournalId" in args ? args.recoveryJournalId : undefined,
  );
  if (recovered.some((recovery) => recovery.action !== "none")) onCommitted();
  let result: Awaited<ReturnType<typeof dispatchApplyPlan>>;
  try {
    result = await dispatchApplyPlan(args, context, onCommitted, recovered);
  } catch (error) {
    // A plan compiled before the recovery commonly fails its snapshot check
    // now; the failure still names the interrupted plan that was settled.
    throw withPlanRecoveryNotes(error, planRecoveryNotes(recovered));
  }
  return withRecoveryReport(result, recovered);
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-agent-guided-migration-orchestration
async function dispatchApplyPlan(
  args: ApplyPlanArgs,
  context: OperationContext,
  onCommitted: () => void,
  recovered: readonly PlanApplyRecovery[],
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  if ("recoveryJournalId" in args) {
    if (isPlanApplyJournalId(args.recoveryJournalId))
      return executePlanJournalRecovery(
        args.recoveryJournalId,
        context,
        recovered,
      );
    if (args.recoveryJournalId.startsWith("bootstrap-")) {
      if (!context.fs)
        throw new Error(
          "Bootstrap recovery requires a filesystem-capable runtime",
        );
      if (!/^bootstrap-[a-f0-9]{16}$/.test(args.recoveryJournalId))
        throw new Error("Bootstrap recovery journal ID is invalid");
      const journalPath = path.join(
        context.workspaceRoot,
        ".kb",
        "recovery",
        `${args.recoveryJournalId}.json`,
      );
      const journal = JSON.parse(await context.fs.readFile(journalPath)) as {
        version?: number;
        kind?: string;
        plan?: BootstrapPlanV1;
        checkpoint?: {
          branch?: string;
          kbSnapshotId?: string;
          workspaceSnapshot?: string;
        };
        results?: readonly {
          actionId?: unknown;
          outcome?: unknown;
          detail?: unknown;
        }[];
      };
      if (
        journal.version !== 2 ||
        journal.kind !== "bootstrap" ||
        !journal.plan
      )
        throw new Error("Bootstrap recovery journal is invalid");
      if (
        !/^[a-f0-9]{64}$/i.test(journal.plan.planHash) ||
        bootstrapPlanHash(
          journal.plan as unknown as Record<string, unknown>,
        ) !== journal.plan.planHash
      )
        throw new Error("Bootstrap recovery journal plan hash is invalid");
      const ordered = validateBootstrapPlanShape({
        plan: journal.plan,
        approvedPlanHash: journal.plan.planHash,
      });
      if (
        !journal.checkpoint?.branch ||
        !journal.checkpoint.kbSnapshotId ||
        !journal.checkpoint.workspaceSnapshot
      )
        throw new Error("Bootstrap recovery journal has no state checkpoint");
      const recoveryStatus = (await executeStatus({}, context))
        .structuredContent;
      const recoveryWorkspace = await readWorkspaceSnapshot(context);
      const liveCheckpoint = {
        branch: recoveryStatus?.branch ?? "unavailable",
        kbSnapshotId:
          recoveryStatus?.snapshotId === "missing" &&
          recoveryWorkspace.available &&
          /^[a-f0-9]{64}$/i.test(recoveryWorkspace.snapshot.hash)
            ? bootstrapEmptyKbSnapshotId({
                branch: recoveryStatus?.branch ?? "unavailable",
                workspaceSnapshot: recoveryWorkspace.snapshot.hash,
                sourceHashes: journal.plan.expected.sourceHashes,
              })
            : (recoveryStatus?.snapshotId ?? "unavailable"),
        workspaceSnapshot: recoveryWorkspace.available
          ? recoveryWorkspace.snapshot.hash
          : "unavailable",
      };
      if (
        liveCheckpoint.branch !== journal.checkpoint.branch ||
        liveCheckpoint.kbSnapshotId !== journal.checkpoint.kbSnapshotId ||
        liveCheckpoint.workspaceSnapshot !==
          journal.checkpoint.workspaceSnapshot
      )
        throw new Error(
          "Bootstrap recovery refused: repository state changed since the last action checkpoint",
        );
      const actionIds = new Set(ordered.map((action) => action.id));
      const applied = new Set<string>();
      for (const row of journal.results ?? []) {
        if (typeof row.actionId !== "string" || !actionIds.has(row.actionId))
          throw new Error(
            "Bootstrap recovery journal contains an unknown action",
          );
        if (row.outcome === "applied") applied.add(row.actionId);
      }
      const remaining = orderBootstrapActions(
        ordered.filter((action) => !applied.has(action.id)),
        applied,
      );
      assertBootstrapRecoveryDependencies(remaining, applied);
      return executeBootstrapPlan(
        { plan: journal.plan, approvedPlanHash: journal.plan.planHash },
        context,
        true,
        remaining,
        (journal.results ?? []).flatMap((row) =>
          row &&
          typeof row.actionId === "string" &&
          (row.outcome === "applied" ||
            row.outcome === "failed" ||
            row.outcome === "skipped") &&
          typeof row.detail === "string"
            ? row.outcome === "applied"
              ? [
                  {
                    actionId: row.actionId,
                    outcome: row.outcome,
                    detail: row.detail,
                  },
                ]
              : []
            : [],
        ),
        onCommitted,
      );
    }
    return executeSourceRecovery(args, context, onCommitted);
  }
  if (isBootstrapApplyArgs(args))
    return executeBootstrapPlan(
      args,
      context,
      false,
      undefined,
      [],
      onCommitted,
    );
  if (isMigrationApplyArgs(args)) {
    return applyMigrationPlan(args, context, onCommitted);
  }
  if (isEntityDeletionApplyArgs(args)) {
    validateEntityDeletionPlan(args);
    const sourceWrites = await applySourceWrites(
      context,
      args.plan.sourceWrites ?? [],
      args.plan.planHash,
      false,
      onCommitted,
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
      onCommitted();
      await markSourceJournal(
        operationContext,
        sourceWrites.journalId,
        "compiled_published",
      );
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
      await markSourceJournal(
        operationContext,
        sourceWrites.journalId,
        "repair_required",
      );
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
  return executeCompilePlan(args, context, onCommitted, recovered);
}

type ValidatedPlanStep = Readonly<{
  input: UpsertInput;
  entity: Readonly<Record<string, unknown>>;
  relationships: readonly RelationshipInput[];
}>;

// implements REQ-kibi-truthful-consistency
/**
 * Run every step through the validation chain executeUpsert runs. Each step
 * is validated against the live store plus what the earlier steps will have
 * written by then (`staged`): entities they create count as relationship
 * targets, their kinds and claim keys are read from the plan, their
 * relationships merge into a later upsert of the same entity, and their
 * predicate schemas govern later predicate facts.
 */
async function validatePlanSteps(
  steps: readonly UpsertInput[],
  context: OperationContext,
): Promise<ValidatedPlanStep[]> {
  const stagedEntities = new Map<string, Readonly<Record<string, unknown>>>();
  const stagedRelationships: RelationshipInput[] = [];
  const validated: ValidatedPlanStep[] = [];
  for (const step of steps) {
    try {
      const { validated: result } = await validateUpsertForCommit(
        step,
        context,
        {
          staged: {
            entities: stagedEntities,
            relationships: [...stagedRelationships],
          },
        },
      );
      stagedEntities.set(step.id, result.entity);
      stagedRelationships.push(...result.relationships);
      validated.push({
        input: step,
        entity: result.entity,
        relationships: result.relationships,
      });
    } catch (error) {
      throw new Error(
        `step ${step.id} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return validated;
}

type MutablePlanFileWrite = {
  -readonly [Key in keyof PlanApplyFileWrite]: PlanApplyFileWrite[Key];
};

/**
 * Every workspace file the plan changes, with exact before/after bytes: the
 * plan's approved sourceWrites plus the relationship shards its steps append
 * (rendered exactly as executeUpsert would append them, in step order).
 */
async function planFileWrites(
  workspaceRoot: string,
  fsPort: FilesystemPort,
  sourceWrites: readonly SourceWritePlan[],
  steps: readonly ValidatedPlanStep[],
  now: Date,
): Promise<PlanApplyFileWrite[]> {
  const files = new Map<string, MutablePlanFileWrite>();
  for (const write of sourceWrites) {
    const target = await resolveSourceWriteTarget(workspaceRoot, fsPort, write);
    if (files.has(target.relative)) {
      throw new Error(
        `Apply plan failed: sourceWrites lists ${write.path} more than once`,
      );
    }
    if (target.mode === "delete" && !fsPort.unlink) {
      throw new Error(
        `Apply plan failed: delete requires filesystem unlink support: ${write.path}`,
      );
    }
    const before = target.existing ?? null;
    const after = target.mode === "write" ? (write.body ?? "") : null;
    files.set(target.relative, {
      path: target.relative,
      origin: "plan",
      mode: target.mode,
      before,
      beforeHash: before === null ? null : contentHash(before),
      after,
      afterHash: after === null ? null : contentHash(after),
    });
  }
  const root = path.resolve(workspaceRoot);
  const kbRoot = path.join(workspaceRoot, ".kb");
  const createdAt = now.toISOString();
  for (const step of steps) {
    for (const relationship of step.relationships) {
      const type =
        typeof relationship.type === "string" ? relationship.type : "";
      const from =
        typeof relationship.from === "string"
          ? relationship.from
          : step.input.id;
      const to = typeof relationship.to === "string" ? relationship.to : "";
      if (!type || !from || !to) continue;
      const shardPath = computeShardPath(kbRoot, from);
      assertRelationshipShardContained(workspaceRoot, shardPath);
      const relative = path
        .relative(root, path.resolve(shardPath))
        .split(path.sep)
        .join("/");
      let file = files.get(relative);
      if (file === undefined) {
        const existing = await fsPort.readFile(shardPath).catch(() => null);
        const existingHash = existing === null ? null : contentHash(existing);
        file = {
          path: relative,
          origin: "relationship-shard",
          mode: "write",
          before: existing,
          beforeHash: existingHash,
          after: existing,
          afterHash: existingHash,
        };
        files.set(relative, file);
      }
      const next = renderShardWithRelationship(shardPath, file.after, {
        type,
        from,
        to,
        created_at: createdAt,
        created_by: "kibi/upsert",
        source: "mcp://kibi/upsert",
      });
      if (next !== null) {
        file.mode = "write";
        file.after = next;
        file.afterHash = contentHash(next);
      }
    }
  }
  return [...files.values()].filter(
    (file) => file.origin === "plan" || file.afterHash !== file.beforeHash,
  );
}

type CompilePlanCommit = Readonly<{
  journalId: string | null;
  changedEntities: number;
  changedRelationships: number;
  effectFailures: readonly Readonly<Record<string, unknown>>[];
  nextActions: readonly Readonly<Record<string, unknown>>[];
}>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-atomic-upsert-persistence
/**
 * Apply a validated compile plan all-or-nothing:
 * 1. journal every file change (exact bytes) and every store upsert, plus a
 *    fingerprint of the touched store entities, before the first write;
 * 2. publish the files with temp-file + rename (fsync where available);
 * 3. commit every step in one Prolog batch transaction — the only commit
 *    point.
 * Any failure before the commit restores every file from the journal and
 * leaves the store untouched; an interrupted application is completed or
 * rolled back from the journal by the next mutating call.
 */
async function commitCompilePlan(
  context: OperationContext,
  prolog: PrologPort,
  plan: CompilePlanV1,
  steps: readonly ValidatedPlanStep[],
  revalidate: () => Promise<void>,
  now: Date,
  onCommitted: () => void,
): Promise<CompilePlanCommit> {
  const entries: PlanApplyStoreEntry[] = steps.map((step) => ({
    entity: step.entity,
    relationships: step.relationships,
    skipContradictionCheck: step.input._skipContradictionCheck === true,
  }));
  const goal = buildUpsertBatchCommitGoal(entries);
  const entityIds = [
    ...new Set(entries.map((entry) => String(entry.entity.id))),
  ];
  const changedRelationships = entries.reduce(
    (sum, entry) => sum + entry.relationships.length,
    0,
  );
  const storeRejection = (result: PrologQueryResult): Error =>
    new Error(
      `the store rejected the plan's batch transaction: ${formatUpsertError(
        entityIds.length === 1
          ? String(entityIds[0])
          : `plan batch [${entityIds.join(", ")}]`,
        result.error,
        result.errorRecord,
      )}`,
    );
  const fsPort = context.fs;
  if (fsPort === undefined) {
    if (plan.sourceWrites.length > 0) {
      throw new Error(
        "Apply plan failed: sourceWrites require a filesystem-capable runtime",
      );
    }
    // Without a filesystem there are no workspace files to coordinate: the
    // single store transaction is the whole application.
    const written = await prolog.query(goal);
    if (!written.success) {
      throw new Error(
        `Apply plan failed; no change was applied: ${storeRejection(written).message}`,
      );
    }
    onCommitted();
    prolog.invalidateCache?.();
    return {
      journalId: null,
      changedEntities: entries.length,
      changedRelationships,
      effectFailures: [],
      nextActions: [],
    };
  }

  const slot = openPlanApplyJournal(context, plan.planHash);
  if (slot.existing?.state === "committed") {
    throw new OperationError(
      "MUTATION_ALREADY_COMMITTED",
      `MUTATION_ALREADY_COMMITTED: plan ${plan.planHash} was already applied (journal ${slot.journalId}); compile a fresh plan instead of applying it again`,
      false,
    );
  }
  if (slot.existing !== null && slot.existing.state !== "rolled_back") {
    throw new OperationError(
      "PLAN_APPLY_RECOVERY_REQUIRED",
      `Plan ${plan.planHash} has an unfinished journal ${slot.journalId}; run kb_apply_plan with recoveryJournalId=${slot.journalId} before applying it again`,
      false,
    );
  }
  const files = await planFileWrites(
    context.workspaceRoot,
    fsPort,
    plan.sourceWrites,
    steps,
    now,
  );
  let preCommitFingerprint: string;
  try {
    preCommitFingerprint = await storeFingerprint(prolog, entityIds);
  } catch (error) {
    throw new Error(
      `Apply plan failed before any write: the store could not be fingerprinted for the plan journal: ${errorMessage(error)}`,
    );
  }
  const handle: PlanApplyJournalHandle = createPlanApplyJournal(
    slot.journalPath,
    {
      version: PLAN_APPLY_JOURNAL_VERSION,
      journalId: slot.journalId,
      planHash: plan.planHash,
      branch: slot.branch,
      state: "prepared",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      files,
      store: { entityIds, preCommitFingerprint, entries },
      summary: {
        planPaths: plan.sourceWrites.map((write) => write.path),
        filePaths: files.map((file) => file.path),
        changedEntities: entries.length,
        changedRelationships,
      },
    },
  );

  const rollBack = async (error: unknown, phase: string): Promise<never> => {
    let restored: string[];
    try {
      restored = await restoreJournaledFiles(
        fsPort,
        context.workspaceRoot,
        handle.journalPath,
        files,
      );
    } catch (rollbackError) {
      throw new OperationError(
        "PLAN_APPLY_RECOVERY_REQUIRED",
        `Plan ${plan.planHash} failed ${phase} (${errorMessage(error)}), and restoring its source writes also failed (${errorMessage(rollbackError)}). Journal ${slot.journalId} is kept: the next kb_apply_plan or kb_upsert call rolls it back, or run kb_apply_plan with recoveryJournalId=${slot.journalId}`,
        false,
      );
    }
    const detail = `Plan ${plan.planHash.slice(0, 12)} failed ${phase}; no change was applied: the store is unchanged and ${restored.length} source file(s) were restored from journal ${slot.journalId}.`;
    try {
      recordPlanApplyJournal(handle, {
        state: "rolled_back",
        resolution: { action: "rolled_back", by: "apply", detail },
      });
    } catch {
      // The files are restored and the store never committed, so a journal
      // left in an earlier state resolves to the same rollback next time.
    }
    const message = `Apply plan failed ${phase}; no change was applied (store unchanged, ${restored.length} source file(s) restored from journal ${slot.journalId}): ${errorMessage(error)}`;
    if (error instanceof OperationError) {
      throw new OperationError(error.code, message, error.retryable);
    }
    throw new Error(message);
  };

  try {
    await publishJournaledFiles(fsPort, context.workspaceRoot, files);
  } catch (error) {
    return rollBack(error, "while publishing its source writes");
  }
  if (plan.sourceWrites.length > 0) {
    // Steps were validated against the workspace as it was; validate them
    // again against the published source bytes before the commit.
    try {
      await revalidate();
    } catch (error) {
      return rollBack(error, "validation against its published source writes");
    }
  }
  try {
    recordPlanApplyJournal(handle, { state: "store_committing" });
  } catch (error) {
    return rollBack(error, "while journaling its store commit");
  }

  let written: PrologQueryResult | undefined;
  let commitFailure: unknown;
  try {
    written = await prolog.query(goal);
    if (!written.success) commitFailure = storeRejection(written);
  } catch (error) {
    commitFailure = error;
  }
  const effectFailures: Readonly<Record<string, unknown>>[] = [];
  const nextActions: Readonly<Record<string, unknown>>[] = [];
  if (commitFailure !== undefined) {
    // The batch is one transaction: it either changed the plan's entities or
    // changed nothing. Decide from the store, not from the transport.
    let fingerprint: string | undefined;
    try {
      fingerprint = await storeFingerprint(prolog, entityIds);
    } catch (probeError) {
      if (written === undefined) {
        throw new OperationError(
          "PLAN_APPLY_RECOVERY_REQUIRED",
          `Plan ${plan.planHash} lost contact with the store during its commit (${errorMessage(commitFailure)}), and the store could not be inspected (${errorMessage(probeError)}). Journal ${slot.journalId} is kept: the next kb_apply_plan or kb_upsert call completes or rolls it back, or run kb_apply_plan with recoveryJournalId=${slot.journalId}`,
          false,
        );
      }
      // The store answered with a rejection; trust it.
    }
    if (fingerprint === undefined || fingerprint === preCommitFingerprint) {
      return rollBack(commitFailure, "at its store commit");
    }
    effectFailures.push({
      kind: "store-commit",
      errorCode: "STORE_COMMIT_REPORTED_FAILURE",
      detail: `The store reported a failure (${errorMessage(commitFailure)}) but shows the plan's batch committed; the plan is kept as applied.`,
    });
    nextActions.push(
      {
        operation: "kb_status",
        reason:
          "The store committed the plan's batch while reporting a failure; confirm the branch snapshot is persisted before further writes.",
        required: true,
      },
      {
        operation: "kb_check",
        reason:
          "Run the consistency checks after the unconfirmed store commit and follow their typed repair actions.",
        required: true,
      },
    );
  }
  // The batch transaction committed: every step is in the store.
  onCommitted();
  prolog.invalidateCache?.();
  try {
    recordPlanApplyJournal(handle, { state: "store_committed" });
  } catch {
    // A journal left at store_committing is completed on the next call: the
    // store fingerprint now shows the commit.
  }
  try {
    reconcilePendingSourceReceipts(context.workspaceRoot, files);
  } catch (error) {
    effectFailures.push({
      kind: "pending-source-receipt",
      errorCode: "PENDING_SOURCE_RECEIPT_FAILED",
      detail: errorMessage(error),
    });
    nextActions.push({
      operation: "kb_apply_plan",
      input: { recoveryJournalId: slot.journalId },
      reason:
        "The plan committed, but binding its new source files to pending-source receipts failed; recovering the journal finishes the receipts. Do not apply the original plan again.",
      required: true,
    });
    return {
      journalId: slot.journalId,
      changedEntities: entries.length,
      changedRelationships,
      effectFailures,
      nextActions,
    };
  }
  try {
    recordPlanApplyJournal(handle, {
      state: "committed",
      resolution: {
        action: "completed",
        by: "apply",
        detail: `Applied plan ${plan.planHash.slice(0, 12)}: ${entries.length} step(s) in one store transaction and ${files.length} journaled file(s).`,
      },
    });
  } catch {
    // A store_committed journal completes idempotently on the next call.
  }
  return {
    journalId: slot.journalId,
    changedEntities: entries.length,
    changedRelationships,
    effectFailures,
    nextActions,
  };
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2
async function executeCompilePlan(
  args: Extract<ApplyPlanArgs, { plan: CompilePlanV1 }>,
  context: OperationContext,
  onCommitted: () => void,
  recovered: readonly PlanApplyRecovery[],
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  validateCompilePlanShape(args);
  // Re-applying a plan whose interrupted application this call just
  // completed returns that completion instead of failing its snapshot check.
  const completed = recovered.find(
    (recovery) =>
      recovery.planHash === args.plan.planHash &&
      recovery.action === "completed",
  );
  if (completed !== undefined) {
    return planJournalRecoveryResult(
      context,
      completed,
      openPlanApplyJournalById(context, completed.journalId).journal,
    );
  }
  const prolog =
    context.prolog ?? (await context.ensureProlog?.()) ?? undefined;
  if (!prolog) throw new Error("Apply plan requires a Prolog runtime");
  // Compile plans carry the complete, hash-bound sourceWrites set. Apply the
  // compiled entity steps against the staged source snapshot without asking
  // each step to independently select a document target; otherwise a plan
  // with multiple authored entity kinds could be rejected for an ambiguous
  // per-entity path after its source batch has already been validated. One
  // clock reading stamps every step, so the journaled store payload is exactly
  // what validation produced.
  const now = context.clock();
  const operationContext: OperationContext = {
    ...context,
    prolog,
    sourceFirst: false as const,
    clock: () => now,
  };
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
  // implements REQ-kibi-truthful-consistency
  // Run every step through the same validation chain executeUpsert runs,
  // then stage all of them together in a rolled-back transaction, before the
  // first write. A step executeUpsert would reject, or a final state that
  // introduces a contradiction or an infeasible success scenario, fails the
  // whole plan up front. Limits of the staged emulation:
  // - symbol granularity reads source code from the workspace as it is now;
  //   the plan's sourceWrites are validated again once they are published,
  //   before the store commit, and a failure then rolls them back;
  // - staged entities are the validated plan payloads; fields executeUpsert
  //   derives while committing source-first (canonical symbol re-extraction,
  //   chosen source paths) do not arise, because compile plans apply with
  //   sourceFirst disabled;
  // - the store's own checks (entity schema, relationship endpoints,
  //   requirement contradictions) run again inside the batch transaction, so
  //   state another writer changed after this preflight aborts the whole
  //   batch instead of committing part of it.
  let validated: ValidatedPlanStep[];
  try {
    validated = await validatePlanSteps(steps, operationContext);
  } catch (error) {
    throw new Error(
      `Apply plan failed before any write: ${errorMessage(error)}`,
    );
  }
  const preflight = await prolog.query(planWhatIfGoal(args.plan.steps, now));
  if (!preflight.success)
    throw new Error(
      `Apply plan failed before any write: the store rejected the staged plan: ${preflight.error ?? "unknown error"}`,
    );
  const staged = parseWhatIfAnalysis(preflight.bindings.JsonString);
  if (staged === null)
    throw new Error(
      "Apply plan failed before any write: the staged plan's contradiction analysis could not be read",
    );
  const introducedBlocking = staged.introduced.filter(isBlockingWitness);
  if (introducedBlocking.length > 0)
    throw new Error(
      `Apply plan failed before any write: the staged plan introduces ${introducedBlocking.length} contradiction(s) or infeasible scenario(s): ${introducedBlocking
        .map((witness) => witness.reason || witness.requirements.join("/"))
        .join("; ")}`,
    );
  const commit = await commitCompilePlan(
    operationContext,
    prolog,
    args.plan,
    validated,
    async () => {
      await validatePlanSteps(steps, operationContext);
    },
    now,
    onCommitted,
  );
  const effectFailures = [...commit.effectFailures];
  const nextActions = [...commit.nextActions];
  const notes: string[] = [
    commit.journalId === null
      ? "Plan steps were validated together and committed in one store transaction."
      : `Plan steps were validated together, journaled in ${commit.journalId}, and committed in one store transaction; source writes are restored from the journal if the commit fails.`,
  ];
  // Everything before this point is authoritative. A status/workspace
  // readback failure therefore cannot turn the operation into a retryable
  // mutation: return a repairable completion with deterministic next actions
  // instead.
  let finalStatus: typeof status | undefined;
  let finalWorkspace:
    | Awaited<ReturnType<typeof readWorkspaceSnapshot>>
    | undefined;
  let postCommitFailure: string | undefined;
  try {
    const finalStatusResult = await executeStatus({}, operationContext);
    finalStatus = finalStatusResult.structuredContent;
    if (!finalStatus) {
      throw new Error("final status query returned no payload");
    }
    finalWorkspace = await readWorkspaceSnapshot(operationContext);
    if (!finalWorkspace.available) {
      throw new Error(
        finalWorkspace.error ?? "final workspace snapshot unavailable",
      );
    }
  } catch (error) {
    postCommitFailure = errorMessage(error);
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
    changedEntities: commit.changedEntities,
    changedRelationships: commit.changedRelationships,
    changedPaths: args.plan.sourceWrites.map((write) => write.path),
    finalSnapshots,
    validationSummary: {
      stepsValidated: steps.length,
      stepsApplied: steps.length,
      sourceHashesChecked,
      notes,
    },
    recoveryJournalId: commit.journalId,
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
        text: `Applied plan ${args.plan.planHash.slice(0, 12)}: ${steps.length} step(s) committed in one store transaction.`,
      },
    ],
    structuredContent: payload,
  };
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-atomic-upsert-persistence
/** The kb_apply_plan result for a plan journal this call recovered or found finished. */
async function planJournalRecoveryResult(
  context: OperationContext,
  recovery: PlanApplyRecovery,
  journal: PlanApplyJournal,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  let finalSnapshots = {
    branch: journal.branch,
    kbSnapshotId: "recovered",
    workspaceSnapshot: "recovered",
  };
  try {
    const status = (await executeStatus({}, context)).structuredContent;
    const workspace = await readWorkspaceSnapshot(context);
    if (status !== undefined && workspace.available) {
      finalSnapshots = {
        branch: status.branch,
        kbSnapshotId: status.snapshotId,
        workspaceSnapshot: workspace.snapshot.hash,
      };
    }
  } catch {
    // Snapshot readback is informational after a recovery.
  }
  const completedNow = recovery.action === "completed";
  return {
    content: [{ type: "text", text: recovery.detail }],
    structuredContent: {
      version: PLAN_APPLY_RESULT_VERSION,
      outcome: recovery.state === "committed" ? "replayed" : "rolled_back",
      planHash: recovery.planHash,
      changedEntities: completedNow ? journal.summary.changedEntities : 0,
      changedRelationships: completedNow
        ? journal.summary.changedRelationships
        : 0,
      changedPaths: recovery.restoredPaths,
      finalSnapshots,
      validationSummary: {
        stepsValidated: 0,
        stepsApplied: completedNow ? journal.summary.changedEntities : 0,
        sourceHashesChecked: journal.summary.filePaths.length,
        notes: [recovery.detail],
      },
      recoveryJournalId: recovery.journalId,
      ...(recovery.receiptFailure !== undefined
        ? {
            status: "committed_with_repairs" as const,
            effectFailures: [
              {
                kind: "pending-source-receipt",
                errorCode: "PENDING_SOURCE_RECEIPT_FAILED",
                detail: recovery.receiptFailure,
              },
            ],
            nextActions: [
              {
                operation: "kb_apply_plan",
                input: { recoveryJournalId: recovery.journalId },
                reason:
                  "The plan is committed, but binding its new source files to pending-source receipts failed; recover the journal again to finish them.",
                required: true,
              },
            ],
          }
        : {}),
    },
  };
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-atomic-upsert-persistence
async function executePlanJournalRecovery(
  journalId: string,
  context: OperationContext,
  recovered: readonly PlanApplyRecovery[],
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  if (!context.fs)
    throw new Error(
      "Plan journal recovery requires a filesystem-capable runtime",
    );
  const handle = openPlanApplyJournalById(context, journalId);
  const recovery =
    recovered.find((candidate) => candidate.journalId === journalId) ??
    (await recoverPlanApplyJournal(context, handle, {
      prolog: async () => context.prolog ?? (await context.ensureProlog?.()),
    }));
  return planJournalRecoveryResult(context, recovery, handle.journal);
}

/**
 * Finish every interrupted plan application of the active branch before
 * this call reads or writes anything.
 */
async function recoverInterruptedPlans(
  context: OperationContext,
  explicitJournalId: string | undefined,
): Promise<PlanApplyRecovery[]> {
  if (!context.fs) return [];
  return settlePendingPlanApplyJournals(
    context,
    {
      prolog: async () => context.prolog ?? (await context.ensureProlog?.()),
    },
    explicitJournalId,
  );
}

/** Report recoveries this call performed alongside its own result. */
function withRecoveryReport(
  result: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent: ApplyPlanResult;
  },
  recovered: readonly PlanApplyRecovery[],
): {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
} {
  const structured = result.structuredContent as Readonly<
    Record<string, unknown>
  >;
  const own =
    typeof structured.recoveryJournalId === "string"
      ? structured.recoveryJournalId
      : undefined;
  const reported = recovered.filter(
    (recovery) => recovery.action !== "none" && recovery.journalId !== own,
  );
  if (reported.length === 0) return result;
  const notes = reported.map((recovery) => recovery.detail);
  const [first, ...rest] = result.content;
  const content = [
    {
      type: "text" as const,
      text: [first?.text ?? "", ...notes].join(" ").trim(),
    },
    ...rest,
  ];
  const recoveredJournals = reported.map((recovery) => ({
    journalId: recovery.journalId,
    planHash: recovery.planHash,
    action: recovery.action,
    restoredPaths: recovery.restoredPaths,
  }));
  if (isRecord(structured.validationSummary)) {
    const summary = structured.validationSummary;
    return {
      content,
      structuredContent: {
        ...structured,
        validationSummary: {
          ...summary,
          notes: [
            ...(Array.isArray(summary.notes) ? summary.notes : []),
            ...notes,
          ],
          recoveredJournals,
        },
      } as unknown as ApplyPlanResult,
    };
  }
  if (Array.isArray(structured.notes)) {
    return {
      content,
      structuredContent: {
        ...structured,
        notes: [...structured.notes, ...notes],
      } as unknown as ApplyPlanResult,
    };
  }
  return { content, structuredContent: result.structuredContent };
}

// implements REQ-agent-guided-migration-orchestration, REQ-cli-canonical-runtime, REQ-KIBI-BOOTSTRAP-PLAN, REQ-kibi-change-to-proof-plan-compiler-v2, REQ-kibi-predicate-vocabulary-migration
export async function executeApplyPlan(
  args: ApplyPlanArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  if (!context.fs || context.sourceMutationLockHeld === true)
    return executeApplyPlanUnlocked(args, context);
  const lock: WorkspaceMutationLockHandle = await acquireWorkspaceMutationLock(
    context.workspaceRoot,
  );
  let operationFailure: { readonly error: unknown } | undefined;
  let committed = false;
  try {
    const result = await executeApplyPlanUnlocked(
      args,
      {
        ...context,
        sourceMutationLockHeld: true,
      },
      () => {
        committed = true;
      },
    );
    committed = true;
    return result;
  } catch (error) {
    operationFailure = { error };
    throw error;
  } finally {
    releaseWorkspaceMutationLock(lock, operationFailure, committed);
  }
}

async function applyMigrationPlan(
  args: Extract<ApplyPlanArgs, { plan: MigrationPlan }>,
  context: OperationContext,
  onCommitted: () => void = () => undefined,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ApplyPlanResult;
}> {
  const actions = topologicalActions(validateMigrationPlanShape(args));
  const initialStatus = (await executeStatus({}, context)).structuredContent;
  if (!initialStatus)
    throw new Error("Migration apply failed: status query returned no payload");
  if (
    args.plan.expected.branch !== null &&
    initialStatus.branch !== args.plan.expected.branch
  )
    throw new Error(
      "Migration apply failed: active branch changed since planning",
    );
  if (
    args.plan.expected.kbBranch !== null &&
    initialStatus.branch !== args.plan.expected.kbBranch
  )
    throw new Error("Migration apply failed: KB branch changed since planning");
  if (
    args.plan.expected.kbSnapshotId !== null &&
    initialStatus.snapshotId !== args.plan.expected.kbSnapshotId
  )
    throw new Error(
      "Migration apply failed: KB snapshot changed since planning",
    );
  if (args.plan.expected.workspaceSnapshot !== null) {
    const workspace = await readWorkspaceSnapshot(context);
    if (
      !workspace.available ||
      workspace.snapshot.hash !== args.plan.expected.workspaceSnapshot
    )
      throw new Error(
        "Migration apply failed: workspace snapshot changed since planning",
      );
  }
  if (args.plan.expected.configHash !== null) {
    const currentConfig = readMigrationConfigStatus(context.workspaceRoot);
    if (currentConfig.configHash !== args.plan.expected.configHash)
      throw new Error("Migration apply failed: config changed since planning");
  }
  const results: Array<{
    actionId: string;
    outcome: "applied" | "failed" | "skipped";
    detail: string;
  }> = [];
  let failed = false;
  for (const action of actions) {
    if (failed) {
      results.push({
        actionId: action.id,
        outcome: "skipped",
        detail: "Skipped after an earlier action failed.",
      });
      continue;
    }
    try {
      await applyMigrationAction(action, context);
      onCommitted();
      results.push({
        actionId: action.id,
        outcome: "applied",
        detail: `Applied ${action.code}.`,
      });
    } catch (error) {
      failed = true;
      results.push({
        actionId: action.id,
        outcome: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const finalStatus = (await executeStatus({}, context)).structuredContent;
  if (!finalStatus)
    throw new Error(
      "Migration apply failed: final status query returned no payload",
    );
  const finalWorkspace = await readWorkspaceSnapshot(context);
  if (!finalWorkspace.available)
    throw new Error(`Migration apply failed: ${finalWorkspace.error}`);
  let remainingPlan: MigrationPlan | undefined;
  let coverageSummary: Readonly<Record<string, number>> | undefined;
  if (!failed && finalStatus.branchStore?.state === "healthy") {
    try {
      const prolog = context.prolog ?? (await context.ensureProlog?.());
      if (prolog !== undefined) {
        const operationContext = context.prolog
          ? context
          : { ...context, prolog };
        const [{ executeCheck }, { executeCoverage }, { mergeMigrationPlans }] =
          await Promise.all([
            import("../../public/operations/check-executor.js"),
            import("../../public/operations/specs/reporting.js"),
            import("../../public/operations/migration-plan.js"),
          ]);
        const check = await executeCheck({}, operationContext);
        const coverage = await executeCoverage(
          { by: "req", limit: 10_000, offset: 0 },
          operationContext,
        );
        const symbolCoverage = await executeCoverage(
          { by: "symbol", limit: 10_000, offset: 0 },
          operationContext,
        );
        const fragments = [
          check.structuredContent?.migrationPlan,
          coverage.structuredContent?.migrationPlan,
          symbolCoverage.structuredContent?.migrationPlan,
        ].filter((value): value is MigrationPlan => value !== undefined);
        if (fragments.length > 0)
          remainingPlan = mergeMigrationPlans(fragments);
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
  const snapshotState =
    finalStatus.proofSnapshotAvailable === false
      ? "unavailable"
      : finalStatus.proofSnapshotDirty === true
        ? "dirty"
        : finalStatus.proofSnapshotDirty === false
          ? "fresh"
          : "not_evaluated";
  const proven = coverageSummary?.proofProven;
  const missing = coverageSummary?.proofMissing;
  const proofState =
    typeof proven !== "number" || typeof missing !== "number"
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
    notes: [
      "Migration actions were applied sequentially; rerun kibi status, check, and complete coverage to obtain the next plan.",
    ],
    ...(remainingPlan !== undefined ? { remainingPlan } : {}),
    closeout: {
      taskOutcome:
        outcome === "applied"
          ? "complete"
          : outcome === "reconciliation_required"
            ? "blocked"
            : "interim",
      kbState,
      snapshotState,
      proofState,
      limitationDisposition: "not_applicable",
    },
  };
  return {
    content: [
      {
        type: "text",
        text: `${outcome === "applied" ? "Applied" : "Stopped after"} migration plan ${args.plan.planHash.slice(0, 12)}.`,
      },
    ],
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
        throw new Error(
          "Legacy branch migration action is missing its explicit source identity.",
        );
      {
        const argv = action.invocation.command_argv;
        const fromIndex = argv.indexOf("--from");
        const toIndex = argv.indexOf("--to");
        const from = fromIndex >= 0 ? argv[fromIndex + 1] : undefined;
        const to = toIndex >= 0 ? argv[toIndex + 1] : undefined;
        if (!from || !to)
          throw new Error(
            "Legacy branch migration action requires explicit --from and --to.",
          );
        await branchMigrateCommand({
          from,
          to,
          apply: true,
          workspaceRoot: context.workspaceRoot,
        });
      }
      return;
    case "missing_exact_branch_store":
      await branchEnsureCommand({ workspaceRoot: context.workspaceRoot });
      return;
    case "damaged_exact_branch_store":
      await branchRecoverCommand({
        apply: true,
        workspaceRoot: context.workspaceRoot,
      });
      return;
    case "schema_version_upgrade":
    case "invalid_schema_version":
    case "legacy_storage_migration":
      if (
        (
          await migrateCommand({
            yes: true,
            workspaceRoot: context.workspaceRoot,
            initializeMissingConfig: true,
          })
        ).exitCode !== 0
      )
        throw new Error("Schema migration did not complete successfully.");
      return;
    case "symbol_refresh_coordinates":
    case "coverage_source_coordinates": {
      const result = await syncCommand({
        refreshSymbolCoordinates: true,
        workspaceRoot: context.workspaceRoot,
      });
      if (!result.success)
        throw new Error("Coordinate refresh did not complete successfully.");
      return;
    }
    case PREDICATE_SCHEMA_ALIGNMENT_CODE:
      await applyPredicateSchemaAlignment(action, context);
      return;
    default:
      if (SCHEMA6_AUTOMATIC_CODES.has(action.code)) {
        await applySchema6MigrationAction(action, context);
        return;
      }
      throw new Error(
        `Migration action '${action.code}' has no automatic executor.`,
      );
  }
}

/**
 * Replay the planned kb_upsert for one predicate fact after confirming the
 * fact still has the namespace and alias spellings the plan was built from.
 */
// implements REQ-kibi-predicate-vocabulary-migration
async function applyPredicateSchemaAlignment(
  action: MigrationAction,
  context: OperationContext,
): Promise<void> {
  const invocation = action.invocation;
  if (invocation.kind !== "operation" || invocation.name !== "kb_upsert")
    throw new Error(
      "Predicate schema alignment requires its planned kb_upsert invocation.",
    );
  const input = asUpsert(invocation.input as PlanStep);
  if (input.type !== "fact")
    throw new Error("Predicate schema alignment only rewrites fact entities.");
  const prolog = context.prolog ?? (await context.ensureProlog?.());
  if (!prolog)
    throw new Error("Predicate schema alignment requires a Prolog runtime.");
  const operationContext = { ...context, prolog, sourceFirst: true as const };
  const [current] = await loadEntities(prolog, { type: "fact", id: input.id });
  const evidence = action.evidence;
  const currentNamespace =
    typeof current?.predicate_namespace === "string" &&
    current.predicate_namespace !== ""
      ? current.predicate_namespace
      : "default";
  const currentArgs = Array.isArray(current?.predicate_args)
    ? current.predicate_args
    : [];
  const rewrites = Array.isArray(evidence.rewrites) ? evidence.rewrites : [];
  const unchanged =
    current !== undefined &&
    current.fact_kind === "predicate" &&
    currentNamespace === evidence.namespace &&
    rewrites.every(
      (rewrite) =>
        isRecord(rewrite) &&
        typeof rewrite.index === "number" &&
        currentArgs[rewrite.index] === rewrite.from,
    );
  if (!unchanged)
    throw new Error(
      `Predicate fact ${input.id} changed since planning; rerun kibi check and approve the new plan.`,
    );
  await executeUpsert(input, operationContext);
}
