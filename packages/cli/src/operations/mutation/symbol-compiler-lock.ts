import {
  mkdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { OperationError } from "../../cli-errors.js";

/**
 * Workspace-scoped mutex serializing every writer of the symbol compiler
 * surface: authored manifest edits, targeted coordinate refresh, full
 * coordinate refresh, ordinary manifest compilation, and the RDF commit that
 * consumes them. Atomic rename prevents torn files but not lost updates, so
 * concurrent read-modify-write cycles must hold this lock across their whole
 * sequence.
 */

const LOCK_FILE_RELATIVE = path.join(".kb", ".symbol-compiler.lock");
const OWNER_FILE = "owner.json";
const DEFAULT_TIMEOUT_MS = 15_000;
const RETRY_INTERVAL_MS = 25;
const MAX_RELEASE_FILESYSTEM_ATTEMPTS = 3;

export interface SymbolCompilerLockFileSystem {
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
}

const NODE_FILE_SYSTEM: SymbolCompilerLockFileSystem = {
  mkdirSync: (target, options) => {
    mkdirSync(target, options);
  },
  readFileSync: (target) => readFileSync(target).toString(),
  writeFileSync: (target, data, options) => {
    writeFileSync(target, data, options);
  },
  unlinkSync: (target) => unlinkSync(target),
  rmdirSync: (target) => rmdirSync(target),
};

export interface SymbolCompilerLockOptions {
  readonly timeoutMs?: number;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly fileSystem?: SymbolCompilerLockFileSystem;
  readonly isProcessAlive?: (pid: number) => boolean;
}

export class SymbolCompilerLockError extends Error {
  override readonly name = "SymbolCompilerLockError";
}

interface LockRecord {
  readonly pid: number;
  readonly token: string;
  readonly acquiredAt: number;
}

function lockPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, LOCK_FILE_RELATIVE);
}

function randomToken(): string {
  return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readLockRecord(content: string): LockRecord | null {
  try {
    // A primitive has none of the fields; null throws here and reads as
    // corrupt like any unparsable text.
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return typeof parsed.pid === "number" &&
      typeof parsed.token === "string" &&
      typeof parsed.acquiredAt === "number"
      ? (parsed as unknown as LockRecord)
      : null;
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
  // A primitive reads no code; only null and undefined need the guard.
  return (error as NodeJS.ErrnoException | null | undefined)?.code;
}

function isTransientFilesystemError(error: unknown): boolean {
  const code = errorCode(error);
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
  for (let attempts = 1; ; attempts += 1) {
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
}

function manualCleanupGuidance(target: string, ownerPath: string): string {
  return `To clean it manually, verify no operation is active, verify ${ownerPath} and ${target}, then remove ${target}`;
}

function removeLockDirectory(
  fileSystem: SymbolCompilerLockFileSystem,
  target: string,
): void {
  const result = retryTransientFilesystemOperation(() =>
    fileSystem.rmdirSync(target),
  );
  if (result.ok) return;

  const ownerPath = path.join(target, OWNER_FILE);
  throw new SymbolCompilerLockError(
    `failed to remove symbol compiler lock directory at ${target} after ${result.attempts} attempt(s): ${errorDetail(result.error)}; lock remains fail-closed. ${manualCleanupGuidance(target, ownerPath)}`,
  );
}

function removeLockOwner(
  fileSystem: SymbolCompilerLockFileSystem,
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

  throw new SymbolCompilerLockError(
    `failed to remove symbol compiler lock owner at ${ownerPath} after ${result.attempts} attempt(s): ${errorDetail(result.error)}; lock remains fail-closed. ${manualCleanupGuidance(target, ownerPath)}`,
  );
}

function existingLockDescription(
  fileSystem: SymbolCompilerLockFileSystem,
  target: string,
  ownerPath: string,
): string {
  try {
    const record = readLockRecord(fileSystem.readFileSync(ownerPath));
    return record === null
      ? "lock owner metadata is corrupt"
      : `held by pid ${record.pid}`;
  } catch {
    try {
      const legacyRecord = readLockRecord(fileSystem.readFileSync(target));
      return legacyRecord === null
        ? "legacy or corrupt lock"
        : `legacy lock held by pid ${legacyRecord.pid}`;
    } catch {
      return "lock is initializing or corrupt";
    }
  }
}

function defaultIsProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // process.kill throws only errno errors; only ESRCH proves the pid gone.
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

/**
 * Read the current lock owner record and steal the lock only when the
 * recorded holder pid is provably dead. A readable owner.json identifies a
 * directory lock; a readable lock path itself identifies a legacy file lock.
 * Corrupt, missing, or unreadable metadata stays fail-closed: an
 * initializing writer must never be stolen from, and a live holder (or an
 * unverifiable pid) keeps the mutex.
 */
function stealStaleLockIfHolderIsDead(
  fileSystem: SymbolCompilerLockFileSystem,
  target: string,
  ownerPath: string,
  isProcessAlive: (pid: number) => boolean,
): boolean {
  let record: LockRecord | null = null;
  let legacyFileLock = false;
  try {
    record = readLockRecord(fileSystem.readFileSync(ownerPath));
  } catch {
    try {
      record = readLockRecord(fileSystem.readFileSync(target));
      legacyFileLock = true;
    } catch {
      // Neither is readable: the record stays unknown.
    }
  }
  if (record === null || isProcessAlive(record.pid)) return false;
  if (legacyFileLock)
    return retryTransientFilesystemOperation(() =>
      fileSystem.unlinkSync(target),
    ).ok;
  try {
    removeLockOwner(fileSystem, target, ownerPath, true);
    removeLockDirectory(fileSystem, target);
  } catch {
    return false;
  }
  return true;
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export interface SymbolCompilerLockHandle {
  /**
   * Remove this handle's validated owner metadata and then its empty lock
   * directory. Transient cleanup errors are retried; exhausted or permanent
   * failures leave the lock fail-closed and may require verified manual
   * cleanup. Successful release is idempotent, and a stale handle never
   * removes a different owner token.
   */
  readonly release: () => void;
}

export function releaseSymbolCompilerLock(
  handle: SymbolCompilerLockHandle | undefined,
  operationFailure?: { readonly error: unknown },
  committed = false,
): void {
  if (handle === undefined) return;
  try {
    handle.release();
  } catch (releaseError) {
    if (committed) {
      throw new OperationError(
        "SYMBOL_COMPILER_LOCK_RELEASE_FAILED",
        `Mutation committed, but symbol compiler lock release failed: ${errorDetail(releaseError)}; do not retry the mutation until the lock is manually verified and released`,
        false,
      );
    }
    if (operationFailure !== undefined) {
      throw new AggregateError(
        [operationFailure.error, releaseError],
        "Operation failed and symbol compiler lock release failed",
      );
    }
    throw releaseError;
  }
}

/**
 * Acquire the workspace symbol compiler lock without a callback shape, for
 * operations whose lock must span several awaits (source publication,
 * coordinate refresh, canonical re-extraction, and the RDF commit).
 */
export async function acquireSymbolCompilerLock(
  workspaceRoot: string,
  options: SymbolCompilerLockOptions = {},
): Promise<SymbolCompilerLockHandle> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const fileSystem = options.fileSystem ?? NODE_FILE_SYSTEM;
  const isProcessAlive = options.isProcessAlive ?? defaultIsProcessAlive;

  const target = lockPath(workspaceRoot);
  const ownerPath = path.join(target, OWNER_FILE);
  const token = randomToken();
  const deadline = now() + timeoutMs;

  const parentPath = path.dirname(target);
  const parentResult = retryTransientFilesystemOperation(() =>
    fileSystem.mkdirSync(parentPath, { recursive: true }),
  );
  if (!parentResult.ok) {
    throw new SymbolCompilerLockError(
      `failed to create symbol compiler lock parent at ${parentPath} after ${parentResult.attempts} attempt(s): ${errorDetail(parentResult.error)}`,
    );
  }

  let acquired = false;
  let lastBlocker = "unknown";
  while (now() < deadline) {
    const targetResult = retryTransientFilesystemOperation(() => {
      // Directory creation is the atomic, cross-platform lock authority.
      fileSystem.mkdirSync(target);
    });
    if (targetResult.ok) {
      acquired = true;
      break;
    }
    if (errorCode(targetResult.error) !== "EEXIST") {
      throw new SymbolCompilerLockError(
        `failed to acquire symbol compiler lock directory at ${target} after ${targetResult.attempts} attempt(s): ${errorDetail(targetResult.error)}`,
      );
    }
    lastBlocker = existingLockDescription(fileSystem, target, ownerPath);

    if (
      stealStaleLockIfHolderIsDead(
        fileSystem,
        target,
        ownerPath,
        isProcessAlive,
      )
    )
      continue;

    await sleep(RETRY_INTERVAL_MS);
  }

  if (!acquired) {
    throw new SymbolCompilerLockError(
      `symbol compiler lock is ${lastBlocker}; refused after ${timeoutMs}ms to avoid a lost update`,
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
    throw new SymbolCompilerLockError(
      `failed to initialize symbol compiler lock owner at ${ownerPath}: ${errorDetail(error)}; ${cleanupContext}`,
    );
  }

  let ownerRemoved = false;
  let released = false;
  return {
    release: () => {
      if (released) return;

      if (!ownerRemoved) {
        const readResult = retryTransientFilesystemOperation(() =>
          fileSystem.readFileSync(ownerPath),
        );
        if (!readResult.ok) {
          throw new SymbolCompilerLockError(
            `failed to validate symbol compiler lock owner at ${ownerPath} after ${readResult.attempts} attempt(s): ${errorDetail(readResult.error)}; lock remains fail-closed. ${manualCleanupGuidance(target, ownerPath)}`,
          );
        }

        const record = readLockRecord(readResult.value);
        if (record === null) {
          throw new SymbolCompilerLockError(
            `refused to release symbol compiler lock with corrupt owner metadata at ${ownerPath}; lock remains fail-closed. ${manualCleanupGuidance(target, ownerPath)}`,
          );
        }
        if (record.token !== token) {
          released = true;
          return;
        }

        removeLockOwner(fileSystem, target, ownerPath, false);
        ownerRemoved = true;
      }

      removeLockDirectory(fileSystem, target);
      released = true;
    },
  };
}

/**
 * Run `operation` while holding the workspace symbol compiler lock.
 *
 * Atomic directory creation is the lock authority. Owner metadata is
 * release authorization and diagnostics: every existing target, including a
 * legacy file or a directory with missing/corrupt metadata, blocks contenders
 * until timeout. A well-formed owner record whose holder pid is provably
 * dead is stolen immediately instead of blocking for the full timeout;
 * corrupt metadata and live holders stay fail-closed.
 * Release failures propagate so successful work is never reported unlocked.
 */
export async function withSymbolCompilerLock<T>(
  workspaceRoot: string,
  operation: () => Promise<T>,
  options: SymbolCompilerLockOptions = {},
): Promise<T> {
  const handle = await acquireSymbolCompilerLock(workspaceRoot, options);
  let operationFailure: { readonly error: unknown } | undefined;
  try {
    return await operation();
  } catch (error) {
    operationFailure = { error };
    throw error;
  } finally {
    releaseSymbolCompilerLock(handle, operationFailure);
  }
}
