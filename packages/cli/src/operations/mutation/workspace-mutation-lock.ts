import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { InputError, OperationError } from "../../cli-errors.js";

/**
 * Portable cooperative mutex for Kibi source mutations. The lock protects
 * cooperating Kibi writers; arbitrary external processes remain outside this
 * protocol and cannot be CAS-protected by it.
 */

const DEFAULT_LOCK_FILE_RELATIVE = path.join(
  ".kb",
  "recovery",
  "source-authoring.lock",
);
const OWNER_FILE = "owner.json";
const DEFAULT_TIMEOUT_MS = 15_000;
const RETRY_INTERVAL_MS = 25;
const MAX_RELEASE_FILESYSTEM_ATTEMPTS = 3;
/** Bounded rereads for the transient mkdir->owner and unlink->rmdir windows. */
const MAX_MISSING_OWNER_REREADS = 4;

// implements REQ-generated-coordinate-persistence
export interface WorkspaceMutationLockFileSystem {
  readonly mkdirSync: (
    target: string,
    options?: { readonly recursive?: boolean },
  ) => void;
  readonly readFileSync: (target: string) => string;
  readonly writeFileSync: (
    target: string,
    data: string,
    options: { readonly encoding: "utf8"; readonly flag: "wx" },
  ) => void;
  readonly unlinkSync: (target: string) => void;
  readonly rmdirSync: (target: string) => void;
  /** Atomic rename; required to reclaim a lock from a dead holder. */
  readonly renameSync?: (from: string, to: string) => void;
}

const NODE_FILE_SYSTEM: WorkspaceMutationLockFileSystem = {
  mkdirSync: (target, options) => {
    mkdirSync(target, options);
  },
  readFileSync: (target) => readFileSync(target, "utf8"),
  writeFileSync: (target, data, options) => {
    writeFileSync(target, data, options);
  },
  unlinkSync: (target) => unlinkSync(target),
  rmdirSync: (target) => rmdirSync(target),
  renameSync: (from, to) => renameSync(from, to),
};

// implements REQ-generated-coordinate-persistence
export interface WorkspaceMutationLockOptions {
  readonly lockFileRelative?: string;
  readonly timeoutMs?: number;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly fileSystem?: WorkspaceMutationLockFileSystem;
  readonly isProcessAlive?: (pid: number) => boolean;
  /**
   * Decide whether a lock whose holder pid is verifiably not alive may be
   * reclaimed instead of failing closed with operator recovery. Called only
   * for a readable owner record whose pid is dead; a live, unverifiable,
   * corrupt or missing owner always keeps the fail-closed refusal.
   */
  readonly reclaimDeadHolder?: (holder: DeadLockHolder) => boolean;
}

/** The owner record of a lock whose holder process is no longer alive. */
// implements REQ-bootstrap-apply-long-running
export interface DeadLockHolder {
  readonly pid: number;
  readonly token: string;
  readonly acquiredAt: number;
}

/** A dead holder's lock this acquisition reclaimed. */
// implements REQ-bootstrap-apply-long-running
export interface WorkspaceMutationLockReclaim extends DeadLockHolder {
  readonly reclaimedAt: number;
  readonly reclaimedByPid: number;
}

// implements REQ-generated-coordinate-persistence
export class WorkspaceMutationLockError extends Error {
  override readonly name = "WorkspaceMutationLockError";
}

interface LockRecord {
  readonly pid: number;
  readonly token: string;
  readonly acquiredAt: number;
}

function lockPath(workspaceRoot: string, lockFileRelative: string): string {
  return path.join(workspaceRoot, lockFileRelative);
}

function randomToken(): string {
  return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readLockRecord(content: string): LockRecord | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).pid !== "number" ||
      typeof (parsed as Record<string, unknown>).token !== "string" ||
      typeof (parsed as Record<string, unknown>).acquiredAt !== "number"
    ) {
      return null;
    }
    return parsed as LockRecord;
  } catch {
    return null;
  }
}

function errorDetail(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as NodeJS.ErrnoException).code;
  return code === undefined ? error.message : `${code}: ${error.message}`;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  return (error as NodeJS.ErrnoException).code;
}

function isTransientFilesystemError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "EBUSY" ||
    code === "EAGAIN" ||
    code === "EINTR" ||
    code === "EPERM"
  );
}

type RetryOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly attempts: number }
  | { readonly ok: false; readonly error: unknown; readonly attempts: number };

function retryTransientFilesystemOperation<T>(
  operation: () => T,
  canRetry: (error: unknown) => boolean = () => true,
): RetryOutcome<T> {
  let attempts = 0;
  while (attempts < MAX_RELEASE_FILESYSTEM_ATTEMPTS) {
    attempts += 1;
    try {
      return { ok: true, value: operation(), attempts };
    } catch (error) {
      if (
        !isTransientFilesystemError(error) ||
        attempts === MAX_RELEASE_FILESYSTEM_ATTEMPTS ||
        !canRetry(error)
      ) {
        return { ok: false, error, attempts };
      }
    }
  }
  throw new Error("unreachable retry state");
}

function manualCleanupGuidance(target: string, ownerPath: string): string {
  return `To clean it manually, verify no operation is active, verify ${ownerPath} and ${target}, then remove ${target}`;
}

function removeLockDirectory(
  fileSystem: WorkspaceMutationLockFileSystem,
  target: string,
): void {
  const result = retryTransientFilesystemOperation(() =>
    fileSystem.rmdirSync(target),
  );
  if (result.ok) return;

  const ownerPath = path.join(target, OWNER_FILE);
  throw new WorkspaceMutationLockError(
    `failed to remove workspace mutation lock directory at ${target} after ${result.attempts} attempt(s): ${errorDetail(result.error)}; lock remains fail-closed. ${manualCleanupGuidance(target, ownerPath)}`,
  );
}

function removeLockOwner(
  fileSystem: WorkspaceMutationLockFileSystem,
  target: string,
  ownerPath: string,
  ignoreMissing: boolean,
): void {
  const result = retryTransientFilesystemOperation(() =>
    fileSystem.unlinkSync(ownerPath),
  );
  if (result.ok) return;

  const code = errorCode(result.error);
  if (ignoreMissing && code === "ENOENT") return;

  throw new WorkspaceMutationLockError(
    `failed to remove workspace mutation lock owner at ${ownerPath} after ${result.attempts} attempt(s): ${errorDetail(result.error)}; lock remains fail-closed. ${manualCleanupGuidance(target, ownerPath)}`,
  );
}

type LockObservation =
  | { readonly kind: "live"; readonly description: string }
  | { readonly kind: "missing"; readonly description: string }
  | {
      readonly kind: "recovery";
      readonly description: string;
      /** Set only when the owner metadata is readable and its pid is dead. */
      readonly deadHolder?: LockRecord;
    };

function observeExistingLock(
  fileSystem: WorkspaceMutationLockFileSystem,
  target: string,
  ownerPath: string,
  isProcessAlive: (pid: number) => boolean,
): LockObservation {
  let record: LockRecord | null = null;
  let source = "lock owner metadata";
  let ownerMissing = false;
  try {
    record = readLockRecord(fileSystem.readFileSync(ownerPath));
  } catch (ownerError) {
    ownerMissing = errorCode(ownerError) === "ENOENT";
    try {
      source = "legacy lock metadata";
      record = readLockRecord(fileSystem.readFileSync(target));
    } catch {
      // A lock directory without readable owner metadata is the normal
      // mkdir->owner-publish window (and the unlink->rmdir release window):
      // callers reread it a bounded number of times before failing closed.
      // Any other owner read failure is not a creation gap.
      if (ownerMissing) {
        return {
          kind: "missing",
          description: "lock owner metadata is missing",
        };
      }
      return {
        kind: "recovery",
        description: "lock owner metadata is missing or unverifiable",
      };
    }
  }
  if (record === null) {
    return {
      kind: "recovery",
      description: `${source} is corrupt or unverifiable`,
    };
  }
  try {
    if (isProcessAlive(record.pid)) {
      return { kind: "live", description: `held by pid ${record.pid}` };
    }
  } catch {
    return {
      kind: "recovery",
      description: `holder pid ${record.pid} could not be verified as live`,
    };
  }
  return {
    kind: "recovery",
    description: `holder pid ${record.pid} is not live`,
    // Legacy file locks are never reclaimed automatically.
    ...(source === "lock owner metadata" ? { deadHolder: record } : {}),
  };
}

type ReclaimOutcome = "reclaimed" | "changed";

/**
 * Move a dead holder's lock directory aside atomically, confirm the moved
 * owner is still that dead holder, then delete it. A concurrent reclaimer
 * loses the rename and simply retries acquisition. If another writer replaced
 * the lock between observation and rename, the lock is put back and the
 * acquisition fails closed.
 */
function reclaimDeadLock(
  fileSystem: WorkspaceMutationLockFileSystem,
  target: string,
  holder: LockRecord,
  token: string,
): ReclaimOutcome {
  const rename = fileSystem.renameSync;
  if (rename === undefined) return "changed";
  const tombstone = `${target}.reclaimed-${token}`;
  try {
    rename(target, tombstone);
  } catch (error) {
    const code = errorCode(error);
    if (code === "ENOENT" || code === "EEXIST" || code === "ENOTEMPTY")
      return "changed";
    throw new WorkspaceMutationLockError(
      `failed to reclaim workspace mutation lock at ${target} from dead pid ${holder.pid}: ${errorDetail(error)}`,
    );
  }
  const tombstoneOwner = path.join(tombstone, OWNER_FILE);
  let moved: LockRecord | null = null;
  try {
    moved = readLockRecord(fileSystem.readFileSync(tombstoneOwner));
  } catch {
    moved = null;
  }
  if (moved === null || moved.token !== holder.token) {
    try {
      rename(tombstone, target);
    } catch {
      // The original path was taken again; the tombstone stays for an operator.
    }
    throw new OperationError(
      "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
      `workspace mutation lock at ${target} changed owner while it was reclaimed from dead pid ${holder.pid}. Quiesce all Kibi and source-mutating writers, then verify ${target} and ${tombstone} before removing either`,
      false,
    );
  }
  removeLockOwner(fileSystem, tombstone, tombstoneOwner, true);
  removeLockDirectory(fileSystem, tombstone);
  return "reclaimed";
}

function defaultIsProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ESRCH"
    )
      return false;
    throw error;
  }
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

// implements REQ-generated-coordinate-persistence
export interface WorkspaceMutationLockHandle {
  /**
   * Remove this handle's validated owner metadata and then its empty lock
   * directory. Transient cleanup errors are retried; exhausted or permanent
   * failures leave the lock fail-closed and may require verified manual
   * cleanup. Successful release is idempotent, and a stale handle never
   * removes a different owner token.
   */
  readonly release: () => void;
  /** Dead holders this acquisition reclaimed the lock from, oldest first. */
  readonly reclaimed?: readonly WorkspaceMutationLockReclaim[];
}

// implements REQ-generated-coordinate-persistence
export function releaseWorkspaceMutationLock(
  handle: WorkspaceMutationLockHandle | undefined,
  operationFailure?: { readonly error: unknown },
  committed = false,
): void {
  if (handle === undefined) return;
  try {
    handle.release();
  } catch (releaseError) {
    if (committed) {
      throw new OperationError(
        "SOURCE_MUTATION_LOCK_RELEASE_FAILED",
        `Mutation committed, but workspace source lock release failed: ${errorDetail(releaseError)}; do not retry the mutation until the lock is manually verified and released`,
        false,
      );
    }
    if (operationFailure !== undefined) {
      throw new AggregateError(
        [operationFailure.error, releaseError],
        "Operation failed and workspace mutation lock release failed",
      );
    }
    throw releaseError;
  }
}

/**
 * Classify the failure of an operation whose authoritative commit already
 * happened. Typed operation errors keep their code and retryability; generic
 * failures are wrapped immediately as non-retryable so callers never read a
 * committed mutation as an invitation to retry.
 */
export function classifySourceMutationFailure(
  operation: string,
  error: unknown,
  committed: boolean,
): unknown {
  if (!committed) return error;
  if (error instanceof OperationError || error instanceof InputError) {
    return error;
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new OperationError(
    "SOURCE_MUTATION_POST_COMMIT_FAILED",
    `${operation} committed, but a postcommit step failed: ${detail}; do not retry the original mutation; inspect the committed snapshot and recovery metadata before repairing`,
    false,
  );
}

/**
 * Acquire the workspace workspace mutation lock without a callback shape, for
 * operations whose lock must span several awaits (source publication,
 * coordinate refresh, canonical re-extraction, and the RDF commit).
 */
// implements REQ-generated-coordinate-persistence
export async function acquireWorkspaceMutationLock(
  workspaceRoot: string,
  options: WorkspaceMutationLockOptions = {},
): Promise<WorkspaceMutationLockHandle> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const fileSystem = options.fileSystem ?? NODE_FILE_SYSTEM;
  const isProcessAlive = options.isProcessAlive ?? defaultIsProcessAlive;

  const target = lockPath(
    workspaceRoot,
    options.lockFileRelative ?? DEFAULT_LOCK_FILE_RELATIVE,
  );
  const ownerPath = path.join(target, OWNER_FILE);
  const token = randomToken();
  const deadline = now() + timeoutMs;

  const parentPath = path.dirname(target);
  const parentResult = retryTransientFilesystemOperation(() =>
    fileSystem.mkdirSync(parentPath, { recursive: true }),
  );
  if (!parentResult.ok) {
    throw new WorkspaceMutationLockError(
      `failed to create workspace mutation lock parent at ${parentPath} after ${parentResult.attempts} attempt(s): ${errorDetail(parentResult.error)}`,
    );
  }

  let acquired = false;
  const reclaimed: WorkspaceMutationLockReclaim[] = [];
  let lastBlocker = "unknown";
  let lastObservationMissing = false;
  let missingOwnerRereads = 0;
  while (now() < deadline) {
    const targetResult = retryTransientFilesystemOperation(() => {
      // Directory creation is the sole atomic lock authority.
      fileSystem.mkdirSync(target);
    });
    if (targetResult.ok) {
      acquired = true;
      break;
    }
    if (errorCode(targetResult.error) !== "EEXIST") {
      throw new WorkspaceMutationLockError(
        `failed to acquire workspace mutation lock directory at ${target} after ${targetResult.attempts} attempt(s): ${errorDetail(targetResult.error)}`,
      );
    }
    const observation = observeExistingLock(
      fileSystem,
      target,
      ownerPath,
      isProcessAlive,
    );
    lastBlocker = observation.description;
    lastObservationMissing = observation.kind === "missing";
    if (observation.kind === "missing") {
      // A missing owner is usually another holder's transient
      // mkdir->owner-publish or unlink->rmdir window. Reread a bounded number
      // of times; never reclaim the lock automatically.
      if (missingOwnerRereads < MAX_MISSING_OWNER_REREADS) {
        missingOwnerRereads += 1;
        await sleep(RETRY_INTERVAL_MS);
        continue;
      }
      throw new OperationError(
        "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
        `workspace mutation lock at ${target} requires operator recovery: ${observation.description} after ${missingOwnerRereads} reread(s). Quiesce all Kibi and source-mutating writers, then manually verify the owner metadata and remove the lock only after confirming no operation is active`,
        false,
      );
    }
    if (
      observation.kind === "recovery" &&
      observation.deadHolder !== undefined &&
      fileSystem.renameSync !== undefined &&
      options.reclaimDeadHolder?.(observation.deadHolder) === true
    ) {
      const holder = observation.deadHolder;
      if (reclaimDeadLock(fileSystem, target, holder, token) === "reclaimed") {
        reclaimed.push({
          pid: holder.pid,
          token: holder.token,
          acquiredAt: holder.acquiredAt,
          reclaimedAt: now(),
          reclaimedByPid: process.pid,
        });
      } else {
        await sleep(RETRY_INTERVAL_MS);
      }
      continue;
    }
    if (observation.kind === "recovery") {
      throw new OperationError(
        "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
        `workspace mutation lock at ${target} requires operator recovery: ${observation.description}. Quiesce all Kibi and source-mutating writers, then manually verify the owner metadata and remove the lock only after confirming no operation is active`,
        false,
      );
    }
    await sleep(RETRY_INTERVAL_MS);
  }

  if (!acquired) {
    if (lastObservationMissing) {
      // The deadline expired inside a sustained missing-owner window: that is
      // a fail-closed recovery state, not a busy holder.
      throw new OperationError(
        "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
        `workspace mutation lock at ${target} requires operator recovery: ${lastBlocker} for the whole acquisition window. Quiesce all Kibi and source-mutating writers, then manually verify the owner metadata and remove the lock only after confirming no operation is active`,
        false,
      );
    }
    throw new OperationError(
      "SOURCE_MUTATION_LOCK_TIMEOUT",
      `workspace mutation lock is ${lastBlocker}; acquisition timed out after ${timeoutMs}ms while the live owner remained in place; retry after the owner releases the lock to avoid a lost update`,
      true,
    );
  }

  const payload = `${JSON.stringify({
    pid: process.pid,
    token,
    acquiredAt: now(),
  } satisfies LockRecord)}\n`;

  try {
    const ownerResult = retryTransientFilesystemOperation(
      () =>
        fileSystem.writeFileSync(ownerPath, payload, {
          encoding: "utf8",
          flag: "wx",
        }),
      () => {
        try {
          fileSystem.readFileSync(ownerPath);
          return false;
        } catch (probeError) {
          return errorCode(probeError) === "ENOENT";
        }
      },
    );
    if (!ownerResult.ok) throw ownerResult.error;
  } catch (error) {
    const cleanupFailures: string[] = [];
    try {
      removeLockOwner(fileSystem, target, ownerPath, true);
    } catch (cleanupError) {
      cleanupFailures.push(`owner cleanup: ${errorDetail(cleanupError)}`);
    }
    try {
      removeLockDirectory(fileSystem, target);
    } catch (cleanupError) {
      cleanupFailures.push(`directory cleanup: ${errorDetail(cleanupError)}`);
    }

    const cleanupContext =
      cleanupFailures.length === 0
        ? "lock directory cleanup completed"
        : `lock remains fail-closed at ${target}; ${cleanupFailures.join("; ")}`;
    throw new WorkspaceMutationLockError(
      `failed to initialize workspace mutation lock owner at ${ownerPath}: ${errorDetail(error)}; ${cleanupContext}`,
    );
  }

  let releaseState: "owned" | "owner-removed" | "released" = "owned";
  return {
    ...(reclaimed.length > 0 ? { reclaimed } : {}),
    release: () => {
      if (releaseState === "released") return;

      if (releaseState === "owned") {
        const readResult = retryTransientFilesystemOperation(() =>
          fileSystem.readFileSync(ownerPath),
        );
        if (!readResult.ok) {
          throw new WorkspaceMutationLockError(
            `failed to validate workspace mutation lock owner at ${ownerPath} after ${readResult.attempts} attempt(s): ${errorDetail(readResult.error)}; lock remains fail-closed. ${manualCleanupGuidance(target, ownerPath)}`,
          );
        }

        const record = readLockRecord(readResult.value);
        if (record === null) {
          throw new WorkspaceMutationLockError(
            `refused to release workspace mutation lock with corrupt owner metadata at ${ownerPath}; lock remains fail-closed. ${manualCleanupGuidance(target, ownerPath)}`,
          );
        }
        if (record.token !== token) {
          releaseState = "released";
          return;
        }

        removeLockOwner(fileSystem, target, ownerPath, false);
        releaseState = "owner-removed";
      }

      removeLockDirectory(fileSystem, target);
      releaseState = "released";
    },
  };
}

/**
 * Run `operation` while holding the workspace mutation lock.
 *
 * Atomic directory creation is the sole lock authority. Owner metadata is
 * release authorization and diagnostics. Every existing target, including a
 * legacy file or a directory with missing/corrupt metadata, blocks or fails
 * closed without mutating the lock path. Release failures propagate so
 * successful work is never reported unlocked.
 */
// implements REQ-generated-coordinate-persistence
export async function withWorkspaceMutationLock<T>(
  workspaceRoot: string,
  operation: () => Promise<T>,
  options: WorkspaceMutationLockOptions = {},
): Promise<T> {
  const handle = await acquireWorkspaceMutationLock(workspaceRoot, options);
  let operationFailure: { readonly error: unknown } | undefined;
  try {
    return await operation();
  } catch (error) {
    operationFailure = { error };
    throw error;
  } finally {
    releaseWorkspaceMutationLock(handle, operationFailure);
  }
}
