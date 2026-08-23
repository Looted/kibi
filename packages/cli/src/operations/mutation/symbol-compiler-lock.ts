import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import * as path from "node:path";

/**
 * Workspace-scoped mutex serializing every writer of the symbol compiler
 * surface: authored manifest edits, targeted coordinate refresh, full
 * coordinate refresh, ordinary manifest compilation, and the RDF commit that
 * consumes them. Atomic rename prevents torn files but not lost updates, so
 * concurrent read-modify-write cycles must hold this lock across their whole
 * sequence.
 */

const LOCK_FILE_RELATIVE = path.join(".kb", ".symbol-compiler.lock");
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_STALE_MS = 60_000;
const RETRY_INTERVAL_MS = 25;

// implements REQ-generated-coordinate-persistence
export interface SymbolCompilerLockOptions {
  readonly timeoutMs?: number;
  readonly staleMs?: number;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly isProcessAlive?: (pid: number) => boolean;
}

// implements REQ-generated-coordinate-persistence
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

function defaultIsProcessAlive(pid: number): boolean {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

// implements REQ-generated-coordinate-persistence
export interface SymbolCompilerLockHandle {
  readonly release: () => void;
}

/**
 * Acquire the workspace symbol compiler lock without a callback shape, for
 * operations whose lock must span several awaits (source publication,
 * coordinate refresh, canonical re-extraction, and the RDF commit).
 */
// implements REQ-generated-coordinate-persistence
export async function acquireSymbolCompilerLock(
  workspaceRoot: string,
  options: SymbolCompilerLockOptions = {},
): Promise<SymbolCompilerLockHandle> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const isProcessAlive = options.isProcessAlive ?? defaultIsProcessAlive;

  const target = lockPath(workspaceRoot);
  mkdirSync(path.dirname(target), { recursive: true });
  const token = randomToken();
  const deadline = now() + timeoutMs;

  let acquired = false;
  let lastBlocker = "unknown";
  while (now() < deadline) {
    let record: LockRecord | null = null;
    try {
      const content = readFileSync(target, "utf8");
      record = readLockRecord(content);
      if (record === null) lastBlocker = "corrupt";
      else lastBlocker = `held by pid ${record.pid}`;
    } catch {
      record = null;
    }

    const expired =
      record === null ||
      now() - record.acquiredAt > staleMs ||
      !isProcessAlive(record.pid);

    if (expired) {
      if (record !== null) {
        try {
          unlinkSync(target);
        } catch {
          // Another writer may have already released or stolen it.
        }
      }
      try {
        const handle = openSync(target, "wx");
        try {
          const payload: LockRecord = {
            pid: process.pid,
            token,
            acquiredAt: now(),
          };
          writeSync(handle, `${JSON.stringify(payload)}\n`, null, "utf8");
        } finally {
          closeSync(handle);
        }
        acquired = true;
        break;
      } catch {
        // Lost the creation race; back off and retry.
      }
    }

    await sleep(RETRY_INTERVAL_MS);
  }

  if (!acquired) {
    throw new SymbolCompilerLockError(
      `symbol compiler lock is ${lastBlocker}; refused after ${timeoutMs}ms to avoid a lost update`,
    );
  }

  return {
    release: () => {
      try {
        const current = readFileSync(target, "utf8");
        const record = readLockRecord(current);
        if (record?.token === token) unlinkSync(target);
      } catch {
        // The lock file is advisory state; never mask the operation result.
      }
    },
  };
}

/**
 * Run `operation` while holding the workspace symbol compiler lock.
 *
 * Acquisition uses exclusive file creation. A lock whose owning process is no
 * longer alive, or whose age exceeds `staleMs`, is stolen atomically so a
 * crashed writer cannot block repair forever. Contention beyond `timeoutMs`
 * refuses to proceed rather than risking a lost update.
 */
// implements REQ-generated-coordinate-persistence
export async function withSymbolCompilerLock<T>(
  workspaceRoot: string,
  operation: () => Promise<T>,
  options: SymbolCompilerLockOptions = {},
): Promise<T> {
  const handle = await acquireSymbolCompilerLock(workspaceRoot, options);
  try {
    return await operation();
  } finally {
    handle.release();
  }
}
