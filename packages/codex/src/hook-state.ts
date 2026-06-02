// implements REQ-codex-kibi-plugin-v1
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const stateFileName = "hook-state.json";
const lockFileName = "hook-state.lock";
const maxDirtyPaths = 50;
const lockRetryCount = 100;
const lockRetryDelayMs = 5;
const staleLockAgeMs = 30_000;

export type HookState = {
  dirtyPaths: string[];
};

function statePath(pluginData: string): string {
  return path.join(pluginData, stateFileName);
}

function lockPath(pluginData: string): string {
  return path.join(pluginData, lockFileName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDirtyPath(dirtyPath: string): string {
  return dirtyPath.trim().replaceAll("\\", "/");
}

function sleepSync(milliseconds: number): void {
  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);
  Atomics.wait(view, 0, 0, milliseconds);
}

function uniqueTempPath(pluginData: string): string {
  return path.join(
    pluginData,
    `${stateFileName}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`,
  );
}

function mergeDirtyPaths(
  existingPaths: readonly string[],
  dirtyPaths: readonly string[],
): HookState {
  const merged = [...existingPaths, ...dirtyPaths]
    .map(normalizeDirtyPath)
    .filter((dirtyPath) => dirtyPath.length > 0);

  return { dirtyPaths: [...new Set(merged)].slice(-maxDirtyPaths) };
}

function acquireLock(pluginData: string): number | undefined {
  const targetLockPath = lockPath(pluginData);

  for (let attempt = 0; attempt < lockRetryCount; attempt++) {
    try {
      return fs.openSync(targetLockPath, "wx");
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        if (removeStaleLock(targetLockPath)) {
          continue;
        }

        sleepSync(lockRetryDelayMs);
        continue;
      }

      return undefined;
    }
  }

  return undefined;
}

function removeStaleLock(targetLockPath: string): boolean {
  let stats: fs.Stats;

  try {
    stats = fs.statSync(targetLockPath);
  } catch {
    return false;
  }

  if (Date.now() - stats.mtimeMs < staleLockAgeMs) {
    return false;
  }

  try {
    fs.unlinkSync(targetLockPath);
    return true;
  } catch {
    return false;
  }
}

function releaseLock(pluginData: string, fileDescriptor: number): void {
  try {
    fs.closeSync(fileDescriptor);
  } catch {
    // Ignore close failures; unlink still gives future hook runs a chance.
  }

  try {
    fs.unlinkSync(lockPath(pluginData));
  } catch {
    // A missing lock file is safe: bounded retries prevent permanent blocking.
  }
}

function coerceHookState(value: unknown): HookState {
  if (!isRecord(value) || !Array.isArray(value.dirtyPaths)) {
    return { dirtyPaths: [] };
  }

  const dirtyPaths = value.dirtyPaths
    .filter((dirtyPath): dirtyPath is string => typeof dirtyPath === "string")
    .map(normalizeDirtyPath)
    .filter((dirtyPath) => dirtyPath.length > 0);

  return { dirtyPaths: [...new Set(dirtyPaths)].slice(-maxDirtyPaths) };
}

export function loadHookState(pluginData: string | undefined): HookState {
  if (!pluginData) {
    return { dirtyPaths: [] };
  }

  try {
    return coerceHookState(
      JSON.parse(fs.readFileSync(statePath(pluginData), "utf8")),
    );
  } catch {
    return { dirtyPaths: [] };
  }
}

export function saveHookState(
  pluginData: string | undefined,
  state: HookState,
): void {
  if (!pluginData) {
    return;
  }

  fs.mkdirSync(pluginData, { recursive: true });
  const boundedState = coerceHookState(state);
  const tempPath = uniqueTempPath(pluginData);
  fs.writeFileSync(tempPath, `${JSON.stringify(boundedState)}\n`);
  fs.renameSync(tempPath, statePath(pluginData));
}

export function addDirtyPaths(
  pluginData: string | undefined,
  dirtyPaths: readonly string[],
): HookState {
  const initialState = loadHookState(pluginData);
  const fallbackState = mergeDirtyPaths(initialState.dirtyPaths, dirtyPaths);

  if (!pluginData) {
    return fallbackState;
  }

  fs.mkdirSync(pluginData, { recursive: true });
  const lockFileDescriptor = acquireLock(pluginData);

  if (lockFileDescriptor === undefined) {
    return fallbackState;
  }

  try {
    const lockedState = loadHookState(pluginData);
    const nextState = mergeDirtyPaths(lockedState.dirtyPaths, dirtyPaths);
    saveHookState(pluginData, nextState);
    return nextState;
  } catch {
    return fallbackState;
  } finally {
    releaseLock(pluginData, lockFileDescriptor);
  }
}


export function clearDirtyPaths(pluginData: string | undefined): HookState {
  const clearedState: HookState = { dirtyPaths: [] };

  if (!pluginData) {
    return clearedState;
  }

  fs.mkdirSync(pluginData, { recursive: true });
  const lockFileDescriptor = acquireLock(pluginData);

  if (lockFileDescriptor === undefined) {
    return clearedState;
  }

  try {
    saveHookState(pluginData, clearedState);
    return clearedState;
  } catch {
    return clearedState;
  } finally {
    releaseLock(pluginData, lockFileDescriptor);
  }
}
