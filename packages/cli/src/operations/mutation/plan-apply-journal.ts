import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import path from "node:path";

import { InputError, OperationError } from "../../cli-errors.js";
import { escapeAtom } from "../../prolog/codec.js";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import {
  branchStoreKey,
  branchStoreManifestPath,
} from "../../utils/branch-store-locator.js";
import { RELATIONSHIP_TYPES } from "./relationships.js";
import {
  retirePendingSourceReceipt,
  writePendingSourceReceipt,
} from "./source-authoring.js";
import type { RelationshipInput } from "./types.js";

/**
 * Write-ahead journal for atomic kb_apply_plan application.
 *
 * A compile plan changes two resources: workspace files (the plan's
 * sourceWrites and the relationship shards its steps append) and the compiled
 * branch store. Before the first write, the journal records every intended
 * file change with exact before/after bytes and hashes, every store upsert,
 * and a fingerprint of the store entities the plan touches. Files are then
 * published with temp-file + rename (fsync where the port supports it), and
 * the store mutations commit in one Prolog transaction. The store commit is
 * the only commit point: any failure before it restores every file from the
 * journal, and an interrupted application is completed or rolled back from
 * the journal by the next mutating call.
 */

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
export const PLAN_APPLY_JOURNAL_VERSION = "kibi.plan-apply-journal.v1" as const;

const JOURNAL_DIRECTORY = "plan-apply";
const JOURNAL_ID_PATTERN = /^plan-apply-[a-f0-9]{16}$/;

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
export type PlanApplyFileWrite = Readonly<{
  /** Workspace-relative path with forward slashes. */
  path: string;
  /**
   * plan: one of the plan's sourceWrites; entity-document: the authored
   * document a step's entity is rendered into; relationship-shard: a shard
   * the steps' relationships append to.
   */
  origin: "plan" | "entity-document" | "relationship-shard";
  mode: "write" | "delete";
  beforeHash: string | null;
  afterHash: string | null;
  /** Exact bytes before the plan; null when the file did not exist. */
  before: string | null;
  /** Exact bytes after the plan; null for a delete. */
  after: string | null;
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
export type PlanApplyStoreEntry = Readonly<{
  entity: Readonly<Record<string, unknown>>;
  relationships: readonly RelationshipInput[];
  skipContradictionCheck: boolean;
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
export type PlanApplyJournalState =
  /** Journal durable; files may be partly published; store untouched. */
  | "prepared"
  /** Files published; the store batch was (or is about to be) submitted. */
  | "store_committing"
  /** The store accepted the batch; postcommit receipts may be pending. */
  | "store_committed"
  | "committed"
  | "rolled_back";

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
export type PlanApplyJournal = Readonly<{
  version: typeof PLAN_APPLY_JOURNAL_VERSION;
  journalId: string;
  planHash: string;
  branch: string;
  state: PlanApplyJournalState;
  createdAt: string;
  updatedAt: string;
  /** Emptied once the journal reaches a terminal state. */
  files: readonly PlanApplyFileWrite[];
  store: Readonly<{
    entityIds: readonly string[];
    /** Fingerprint of the touched store entities before the commit. */
    preCommitFingerprint: string;
    /** Emptied once the journal reaches a terminal state. */
    entries: readonly PlanApplyStoreEntry[];
  }>;
  summary: Readonly<{
    planPaths: readonly string[];
    filePaths: readonly string[];
    changedEntities: number;
    changedRelationships: number;
  }>;
  resolution?: Readonly<{
    action: "completed" | "rolled_back";
    by: "apply" | "recovery";
    detail: string;
  }>;
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
export type PlanApplyRecovery = Readonly<{
  journalId: string;
  planHash: string;
  /** What this recovery did; "none" when the journal was already terminal. */
  action: "completed" | "rolled_back" | "none";
  state: "committed" | "rolled_back";
  /** Workspace files this recovery changed. */
  restoredPaths: readonly string[];
  detail: string;
  /** Postcommit receipt failure left for the next recovery, if any. */
  receiptFailure?: string;
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export function planApplyJournalId(planHash: string): string {
  return `plan-apply-${planHash.slice(0, 16).toLowerCase()}`;
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export function isPlanApplyJournalId(value: string): boolean {
  return JOURNAL_ID_PATTERN.test(value);
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2
export function contentHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type JournalLocation = Readonly<{
  branch: string;
  /** Where a new journal is written. */
  primary: string;
  /** Every directory that may hold a journal for this branch. */
  all: readonly string[];
}>;

/**
 * Journals live in the branch store directory, next to the compiled store
 * they guard. Before the store has been created (no identity manifest yet)
 * they live in the branch-keyed `.kb/recovery/plan-apply/<key>` directory, so
 * the store's adoption check never finds unexpected entries.
 */
function journalLocation(context: OperationContext): JournalLocation | null {
  const attachment =
    context.branchAttachment ?? resolveBranchAttachment(context.workspaceRoot);
  if ("error" in attachment) return null;
  const storeDirectory = path.join(attachment.storePath, JOURNAL_DIRECTORY);
  const fallback = path.join(
    path.resolve(context.workspaceRoot),
    ".kb",
    "recovery",
    JOURNAL_DIRECTORY,
    branchStoreKey(attachment.kbBranch),
  );
  let storeReady = false;
  try {
    storeReady =
      statSync(attachment.storePath).isDirectory() &&
      existsSync(branchStoreManifestPath(attachment.storePath));
  } catch {
    storeReady = false;
  }
  return {
    branch: attachment.kbBranch,
    primary: storeReady ? storeDirectory : fallback,
    all: [...new Set([storeDirectory, fallback])],
  };
}

function fsyncDirectory(directory: string): void {
  if (process.platform === "win32") return;
  try {
    const descriptor = openSync(directory, "r");
    try {
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
  } catch {
    // Directory fsync is best effort; the journal file itself is synced.
  }
}

/** Publish the journal with temp-file + fsync + rename + directory fsync. */
function writeJournal(journalPath: string, journal: PlanApplyJournal): void {
  const directory = path.dirname(journalPath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = `${journalPath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    const descriptor = openSync(temporary, "w", 0o600);
    try {
      writeSync(descriptor, `${JSON.stringify(journal, null, 2)}\n`);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    renameSync(temporary, journalPath);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // The temporary file may never have been created.
    }
    throw error;
  }
  fsyncDirectory(directory);
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isFileWrite(value: unknown): value is PlanApplyFileWrite {
  if (value === null || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  const before = entry.before;
  const after = entry.after;
  return (
    typeof entry.path === "string" &&
    entry.path !== "" &&
    !path.isAbsolute(entry.path) &&
    !entry.path.split(/[\\/]/).includes("..") &&
    (entry.origin === "plan" ||
      entry.origin === "entity-document" ||
      entry.origin === "relationship-shard") &&
    (entry.mode === "write" || entry.mode === "delete") &&
    (before === null
      ? entry.beforeHash === null
      : typeof before === "string" &&
        entry.beforeHash === contentHash(before)) &&
    (after === null
      ? entry.afterHash === null
      : typeof after === "string" && entry.afterHash === contentHash(after)) &&
    (entry.mode === "delete") === (after === null)
  );
}

/**
 * Parse a journal and check its internal consistency: every recorded file
 * carries bytes whose hashes match the recorded before/after hashes.
 */
function parseJournal(journalId: string, text: string): PlanApplyJournal {
  const parsed = JSON.parse(text) as Partial<PlanApplyJournal>;
  const terminal =
    parsed.state === "committed" || parsed.state === "rolled_back";
  if (
    parsed.version !== PLAN_APPLY_JOURNAL_VERSION ||
    parsed.journalId !== journalId ||
    !isHash(parsed.planHash) ||
    planApplyJournalId(parsed.planHash) !== journalId ||
    typeof parsed.branch !== "string" ||
    ![
      "prepared",
      "store_committing",
      "store_committed",
      "committed",
      "rolled_back",
    ].includes(String(parsed.state)) ||
    !Array.isArray(parsed.files) ||
    !parsed.files.every(isFileWrite) ||
    parsed.store === undefined ||
    !Array.isArray(parsed.store.entityIds) ||
    !parsed.store.entityIds.every((id) => typeof id === "string") ||
    typeof parsed.store.preCommitFingerprint !== "string" ||
    !Array.isArray(parsed.store.entries) ||
    (!terminal && parsed.store.entries.length === 0) ||
    parsed.summary === undefined
  ) {
    throw new Error("journal fields are missing or inconsistent");
  }
  return parsed as PlanApplyJournal;
}

function unrecoverableJournal(journalPath: string, detail: string): never {
  throw new OperationError(
    "PARTIAL_COMMIT_REPAIR_REQUIRED",
    `Plan application journal ${journalPath} cannot be recovered automatically: ${detail}. Kibi will not apply or recover plans on this branch until it is resolved: restore each listed file to its journaled before or after bytes and retry, or reconcile the workspace and branch store by hand (kibi sync) and remove the journal`,
    false,
  );
}

function readJournalFile(journalPath: string): PlanApplyJournal {
  const journalId = path.basename(journalPath, ".json");
  let text: string;
  try {
    text = readFileSync(journalPath, "utf8");
  } catch (error) {
    unrecoverableJournal(journalPath, `unreadable (${errorText(error)})`);
  }
  try {
    return parseJournal(journalId, text);
  } catch (error) {
    unrecoverableJournal(journalPath, `invalid (${errorText(error)})`);
  }
}

/** A journal handle bound to its file. */
// implements REQ-kibi-change-to-proof-plan-compiler-v2
export type PlanApplyJournalHandle = {
  readonly journalPath: string;
  journal: PlanApplyJournal;
};

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
/**
 * The terminal-or-absent journal slot for a plan. Returns the existing
 * journal (if any) so the caller can refuse a plan that already committed.
 */
export function openPlanApplyJournal(
  context: OperationContext,
  planHash: string,
): Readonly<{
  journalId: string;
  journalPath: string;
  branch: string;
  existing: PlanApplyJournal | null;
}> {
  const location = journalLocation(context);
  if (location === null) {
    throw new Error(
      "Apply plan failed before any write: the KB branch could not be resolved for the plan journal",
    );
  }
  const journalId = planApplyJournalId(planHash);
  let existing: PlanApplyJournal | null = null;
  let journalPath = path.join(location.primary, `${journalId}.json`);
  for (const directory of location.all) {
    const candidate = path.join(directory, `${journalId}.json`);
    if (existsSync(candidate)) {
      existing = readJournalFile(candidate);
      journalPath = candidate;
      break;
    }
  }
  return { journalId, journalPath, branch: location.branch, existing };
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
/** Durably record a journal state; the handle tracks the latest record. */
export function recordPlanApplyJournal(
  handle: PlanApplyJournalHandle,
  update: Partial<Pick<PlanApplyJournal, "state" | "resolution">>,
  now: Date = new Date(),
): void {
  const next: PlanApplyJournal = {
    ...handle.journal,
    ...update,
    updatedAt: now.toISOString(),
  };
  const terminal = next.state === "committed" || next.state === "rolled_back";
  // Terminal journals keep only their summary: the bytes and store payload
  // are no longer needed and the record stays small.
  const compacted: PlanApplyJournal = terminal
    ? { ...next, files: [], store: { ...next.store, entries: [] } }
    : next;
  writeJournal(handle.journalPath, compacted);
  handle.journal = compacted;
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
export function createPlanApplyJournal(
  journalPath: string,
  journal: PlanApplyJournal,
): PlanApplyJournalHandle {
  writeJournal(journalPath, journal);
  return { journalPath, journal };
}

/** Bind pending-source receipts to the bytes a committed plan published. */
// implements REQ-core-journaled-engine-persistence
export function reconcilePendingSourceReceipts(
  workspaceRoot: string,
  writes: readonly {
    readonly path: string;
    readonly mode?: "write" | "delete";
    readonly afterHash: string | null;
  }[],
): void {
  for (const write of writes) {
    if ((write.mode ?? "write") === "delete") {
      retirePendingSourceReceipt(workspaceRoot, write.path);
    } else if (write.afterHash !== null) {
      writePendingSourceReceipt(workspaceRoot, write.path, write.afterHash);
    }
  }
}

async function currentHash(
  fsPort: FilesystemPort,
  absolute: string,
): Promise<string | null> {
  try {
    return contentHash(await fsPort.readFile(absolute));
  } catch {
    return null;
  }
}

// implements REQ-core-journaled-engine-persistence
/**
 * Replace one workspace file atomically: write a unique staged file in the
 * target directory, fsync it, rename it over the target, then fsync the
 * directory. Ports without rename (test and constrained hosts) write the
 * target directly.
 */
export async function publishWorkspaceFile(
  fsPort: FilesystemPort,
  absolute: string,
  content: string,
): Promise<void> {
  await fsPort.mkdir(path.dirname(absolute));
  if (fsPort.rename) {
    const staged = `${absolute}.kibi-stage-${process.pid}-${randomUUID()}`;
    try {
      await fsPort.writeFile(staged, content);
      if (fsPort.fsync) await fsPort.fsync(staged);
      await fsPort.rename(staged, absolute);
    } catch (error) {
      if (fsPort.unlink) await fsPort.unlink(staged).catch(() => undefined);
      throw error;
    }
  } else {
    await fsPort.writeFile(absolute, content);
    if (fsPort.fsync) await fsPort.fsync(absolute);
  }
  if (fsPort.fsync)
    await fsPort.fsync(path.dirname(absolute)).catch(() => undefined);
}

async function removeWorkspaceFile(
  fsPort: FilesystemPort,
  absolute: string,
  relative: string,
): Promise<void> {
  if (!fsPort.unlink) {
    throw new Error(
      `Apply plan failed: delete requires filesystem unlink support: ${relative}`,
    );
  }
  try {
    await fsPort.unlink(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (fsPort.fsync)
    await fsPort.fsync(path.dirname(absolute)).catch(() => undefined);
}

async function setFile(
  fsPort: FilesystemPort,
  workspaceRoot: string,
  relative: string,
  content: string | null,
): Promise<void> {
  const absolute = path.resolve(workspaceRoot, relative);
  if (content === null) await removeWorkspaceFile(fsPort, absolute, relative);
  else await publishWorkspaceFile(fsPort, absolute, content);
}

// implements REQ-core-journaled-engine-persistence
/**
 * Publish every journaled file's after-bytes in journal order. Throws on the
 * first failure; the caller restores the before-bytes from the journal.
 */
export async function publishJournaledFiles(
  fsPort: FilesystemPort,
  workspaceRoot: string,
  files: readonly PlanApplyFileWrite[],
): Promise<void> {
  for (const file of files) {
    await setFile(fsPort, workspaceRoot, file.path, file.after);
  }
}

/**
 * Move every journaled file to one side of the plan. With `verify`, every
 * file must currently hold its journaled before or after bytes, checked for
 * all files before any of them changes; a file another writer changed makes
 * the move refuse without touching anything. Without `verify` (the in-process
 * rollback of a write this call just attempted) files are restored as-is.
 */
async function moveJournaledFiles(
  fsPort: FilesystemPort,
  workspaceRoot: string,
  journalPath: string,
  files: readonly PlanApplyFileWrite[],
  side: "before" | "after",
  verify: boolean,
): Promise<string[]> {
  const pending: PlanApplyFileWrite[] = [];
  const conflicts: string[] = [];
  for (const file of files) {
    const actual = await currentHash(
      fsPort,
      path.resolve(workspaceRoot, file.path),
    );
    const wanted = side === "before" ? file.beforeHash : file.afterHash;
    if (actual === wanted) continue;
    const other = side === "before" ? file.afterHash : file.beforeHash;
    if (verify && actual !== other) {
      conflicts.push(file.path);
      continue;
    }
    pending.push(file);
  }
  if (conflicts.length > 0) {
    unrecoverableJournal(
      journalPath,
      `${conflicts.join(", ")} changed outside the journal (neither the journaled before nor after bytes)`,
    );
  }
  const ordered = side === "before" ? [...pending].reverse() : pending;
  for (const file of ordered) {
    await setFile(
      fsPort,
      workspaceRoot,
      file.path,
      side === "before" ? file.before : file.after,
    );
  }
  return ordered.map((file) => file.path);
}

/**
 * An interrupted publish can leave its unique staged temp file next to the
 * target. Remove those (best effort) once recovery has settled the target.
 */
function removeOrphanedStagedFiles(
  workspaceRoot: string,
  files: readonly PlanApplyFileWrite[],
): void {
  for (const file of files) {
    const absolute = path.resolve(workspaceRoot, file.path);
    const prefix = `${path.basename(absolute)}.kibi-stage-`;
    let names: string[];
    try {
      names = readdirSync(path.dirname(absolute));
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.startsWith(prefix)) continue;
      try {
        unlinkSync(path.join(path.dirname(absolute), name));
      } catch {
        // A leftover staged file is untracked noise, never plan state.
      }
    }
  }
}

// implements REQ-core-journaled-engine-persistence
/** Restore every journaled file's before-bytes (in-process rollback). */
export async function restoreJournaledFiles(
  fsPort: FilesystemPort,
  workspaceRoot: string,
  journalPath: string,
  files: readonly PlanApplyFileWrite[],
): Promise<string[]> {
  return moveJournaledFiles(
    fsPort,
    workspaceRoot,
    journalPath,
    files,
    "before",
    false,
  );
}

// implements REQ-core-journaled-engine-persistence
/**
 * Fingerprint the store state of the entities a plan touches: their sorted
 * properties and outgoing relationships. Comparing the fingerprint taken
 * before the commit with a later one decides whether an interrupted batch
 * commit took effect; the batch is one transaction, so it either changed the
 * plan's entities or changed nothing.
 */
export async function storeFingerprint(
  prolog: PrologPort,
  entityIds: readonly string[],
): Promise<string> {
  const ids = entityIds.map((id) => `'${escapeAtom(id)}'`).join(", ");
  const state = `findall(Id-Entities-Relationships, (member(Id, [${ids}]), findall(Type-Sorted, (kb_entity(Id, Type, Props), msort(Props, Sorted)), Entities), findall(Rel-To, (member(Rel, [${RELATIONSHIP_TYPES.join(", ")}]), kb_relationship(Rel, Id, To)), Unsorted), msort(Unsorted, Relationships)), State)`;
  // Hash inside Prolog so large entity properties never cross the
  // transport; the outer findall leaves every intermediate variable unbound,
  // so only the SHA-256 hex digest is reported back.
  const goal = `findall(Hex, (${state}, format(string(StateText), '~q', [State]), sha:sha_hash(StateText, Digest, [algorithm(sha256)]), sha:hash_atom(Digest, Hex)), [FingerprintHash])`;
  // Never answer a fingerprint from a cached read of an earlier state.
  prolog.invalidateCache?.();
  const result = await prolog.query(goal);
  if (!result.success) {
    throw new Error(
      `store fingerprint query failed: ${result.error ?? "unknown error"}`,
    );
  }
  return contentHash(
    (result.bindings.FingerprintHash ?? "").replace(/^['"]|['"]$/g, ""),
  );
}

type RecoveryOptions = Readonly<{
  /** Lazily acquire Prolog; needed only to resolve a store_committing journal. */
  prolog: () => Promise<PrologPort | undefined>;
  now?: () => Date;
}>;

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
/**
 * Deterministically finish one journal:
 * - prepared: the store was never asked to commit, so every file is restored
 *   to its before-bytes and the journal ends rolled_back;
 * - store_committing: the store fingerprint decides. Unchanged since the
 *   journal was written means the batch never took effect (roll back);
 *   changed means it committed (complete: publish every after-byte);
 * - store_committed: complete;
 * - committed / rolled_back: nothing to do (replay is idempotent).
 * Recovery refuses, changing nothing, when a journaled file holds neither
 * its before nor its after bytes.
 */
export async function recoverPlanApplyJournal(
  context: OperationContext,
  handle: PlanApplyJournalHandle,
  options: RecoveryOptions,
): Promise<PlanApplyRecovery> {
  const { journal } = handle;
  const now = options.now ?? (() => new Date());
  if (journal.state === "committed" || journal.state === "rolled_back") {
    return {
      journalId: journal.journalId,
      planHash: journal.planHash,
      action: "none",
      state: journal.state,
      restoredPaths: [],
      detail: `Journal ${journal.journalId} is already ${journal.state === "committed" ? "committed" : "rolled back"}; nothing to recover.`,
    };
  }
  const fsPort = context.fs;
  if (!fsPort) {
    throw new Error(
      `Plan journal ${journal.journalId} recovery requires a filesystem-capable runtime`,
    );
  }
  let committed: boolean;
  let reason: string;
  if (journal.state === "prepared") {
    committed = false;
    reason = "the store commit was never submitted";
  } else if (journal.state === "store_committed") {
    committed = true;
    reason = "the store had accepted the batch";
  } else {
    const prolog = await options.prolog();
    if (!prolog) {
      throw new OperationError(
        "PLAN_APPLY_RECOVERY_REQUIRED",
        `Plan journal ${journal.journalId} was interrupted during its store commit; recovering it needs the branch engine, which is unavailable. Retry kb_apply_plan with recoveryJournalId=${journal.journalId} once the engine is available`,
        false,
      );
    }
    let fingerprint: string;
    try {
      fingerprint = await storeFingerprint(prolog, journal.store.entityIds);
    } catch (error) {
      throw new OperationError(
        "PLAN_APPLY_RECOVERY_REQUIRED",
        `Plan journal ${journal.journalId} was interrupted during its store commit and the store could not be inspected (${errorText(error)}). Retry kb_apply_plan with recoveryJournalId=${journal.journalId}`,
        false,
      );
    }
    committed = fingerprint !== journal.store.preCommitFingerprint;
    reason = committed
      ? "the store shows the batch took effect"
      : "the store shows the batch never took effect";
  }
  // Record the decision before touching files, so a second interruption
  // resumes the same direction without inspecting the store again.
  if (committed && journal.state !== "store_committed") {
    recordPlanApplyJournal(handle, { state: "store_committed" }, now());
  }
  const restoredPaths = await moveJournaledFiles(
    fsPort,
    context.workspaceRoot,
    handle.journalPath,
    journal.files,
    committed ? "after" : "before",
    true,
  );
  removeOrphanedStagedFiles(context.workspaceRoot, journal.files);
  if (!committed) {
    const detail = `Rolled back interrupted plan ${journal.planHash.slice(0, 12)} (journal ${journal.journalId}): ${reason}; restored ${restoredPaths.length} of ${journal.files.length} journaled file(s) to their before-bytes.`;
    recordPlanApplyJournal(
      handle,
      {
        state: "rolled_back",
        resolution: { action: "rolled_back", by: "recovery", detail },
      },
      now(),
    );
    return {
      journalId: journal.journalId,
      planHash: journal.planHash,
      action: "rolled_back",
      state: "rolled_back",
      restoredPaths,
      detail,
    };
  }
  const detail = `Completed interrupted plan ${journal.planHash.slice(0, 12)} (journal ${journal.journalId}): ${reason}; published ${restoredPaths.length} of ${journal.files.length} journaled file(s) at their after-bytes.`;
  try {
    reconcilePendingSourceReceipts(context.workspaceRoot, journal.files);
  } catch (error) {
    // The store and files are complete; receipts stay pending in the
    // store_committed journal for the next recovery.
    return {
      journalId: journal.journalId,
      planHash: journal.planHash,
      action: "completed",
      state: "committed",
      restoredPaths,
      detail,
      receiptFailure: errorText(error),
    };
  }
  recordPlanApplyJournal(
    handle,
    {
      state: "committed",
      resolution: { action: "completed", by: "recovery", detail },
    },
    now(),
  );
  return {
    journalId: journal.journalId,
    planHash: journal.planHash,
    action: "completed",
    state: "committed",
    restoredPaths,
    detail,
  };
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
/** Open an explicit journal by id for kb_apply_plan recoveryJournalId. */
export function openPlanApplyJournalById(
  context: OperationContext,
  journalId: string,
): PlanApplyJournalHandle {
  if (!isPlanApplyJournalId(journalId)) {
    throw new Error("Plan journal ID is invalid");
  }
  const location = journalLocation(context);
  if (location === null) {
    throw new Error(
      "Plan journal recovery failed: the KB branch could not be resolved",
    );
  }
  for (const directory of location.all) {
    const candidate = path.join(directory, `${journalId}.json`);
    if (existsSync(candidate)) {
      return { journalPath: candidate, journal: readJournalFile(candidate) };
    }
  }
  throw new Error(
    `Plan journal ${journalId} does not exist for branch ${location.branch}`,
  );
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
/**
 * Detect and finish every incomplete plan journal of the active branch. Runs
 * at the start of each mutating call that holds the workspace mutation lock,
 * before that call reads or writes anything. Journals are finished in path
 * order so the outcome does not depend on directory enumeration order.
 */
export async function recoverPendingPlanApplyJournals(
  context: OperationContext,
  options: RecoveryOptions,
): Promise<PlanApplyRecovery[]> {
  if (!context.fs) return [];
  const location = journalLocation(context);
  if (location === null) return [];
  const candidates: string[] = [];
  for (const directory of location.all) {
    let names: string[];
    try {
      names = readdirSync(directory);
    } catch {
      continue;
    }
    for (const name of names) {
      if (name.endsWith(".json") && isPlanApplyJournalId(name.slice(0, -5))) {
        candidates.push(path.join(directory, name));
      }
    }
  }
  const recoveries: PlanApplyRecovery[] = [];
  for (const journalPath of candidates.sort()) {
    const journal = readJournalFile(journalPath);
    if (journal.state === "committed" || journal.state === "rolled_back")
      continue;
    recoveries.push(
      await recoverPlanApplyJournal(context, { journalPath, journal }, options),
    );
  }
  return recoveries;
}

/** One line per journal a recovery actually changed, for result warnings. */
// implements REQ-kibi-change-to-proof-plan-compiler-v2
export function planRecoveryNotes(
  recoveries: readonly PlanApplyRecovery[],
): string[] {
  return recoveries
    .filter((recovery) => recovery.action !== "none")
    .map((recovery) => recovery.detail);
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
/**
 * A mutating call that settled an interrupted plan and then failed on its own
 * work still reports the settlement in its failure text. Typed errors keep
 * their class, code and retryability.
 */
export function withPlanRecoveryNotes(
  error: unknown,
  notes: readonly string[],
): unknown {
  if (notes.length === 0) return error;
  const suffix = ` [settled before this failure: ${notes.join(" ")}]`;
  if (error instanceof OperationError) {
    return new OperationError(
      error.code,
      `${error.detail}${suffix}`,
      error.retryable,
    );
  }
  if (error instanceof InputError) {
    return new InputError(error.code, `${error.detail}${suffix}`);
  }
  if (error instanceof Error) {
    error.message = `${error.message}${suffix}`;
    return error;
  }
  return new Error(`${String(error)}${suffix}`);
}

// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-journaled-engine-persistence
/**
 * Recover every pending plan journal before another mutation, then refuse
 * that mutation while a recovered plan still has unfinished postcommit work
 * (pending-source receipts): a later write could change the files the
 * journal guards and leave it unrecoverable. `explicitJournalId` is the
 * journal the caller is recovering on purpose, which reports its own
 * unfinished work instead.
 */
export async function settlePendingPlanApplyJournals(
  context: OperationContext,
  options: RecoveryOptions,
  explicitJournalId?: string,
): Promise<PlanApplyRecovery[]> {
  const recoveries = await recoverPendingPlanApplyJournals(context, options);
  const unfinished = recoveries.find(
    (recovery) =>
      recovery.receiptFailure !== undefined &&
      recovery.journalId !== explicitJournalId,
  );
  if (unfinished !== undefined) {
    throw new OperationError(
      "PLAN_APPLY_RECOVERY_REQUIRED",
      `${unfinished.detail} Binding its new source files to pending-source receipts failed (${unfinished.receiptFailure}); run kb_apply_plan with recoveryJournalId=${unfinished.journalId} before further writes`,
      false,
    );
  }
  return recoveries;
}
