// implements REQ-cursor-kibi-plugin-v1
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const stateFileName = "hook-state.json";
const lockFileName = "hook-state.lock";
const maxDirtyPaths = 50;
const maxGuidedPaths = 100;
const lockRetryCount = 100;
const lockRetryDelayMs = 5;
const staleLockAgeMs = 30_000;

export type HookState = {
  dirtyPaths: string[];
  guidedReadPaths: string[];
  guidedWritePaths: string[];
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

function normalizePath(dirtyPath: string): string {
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

function mergeStringPaths(
  existingPaths: readonly string[],
  nextPaths: readonly string[],
): string[] {
  const merged = [...existingPaths, ...nextPaths]
    .map(normalizePath)
    .filter((dirtyPath) => dirtyPath.length > 0);

  return [...new Set(merged)].slice(-maxGuidedPaths);
}

function mergeDirtyPaths(
  existingPaths: readonly string[],
  dirtyPaths: readonly string[],
): HookState {
  return {
    dirtyPaths: mergeStringPaths(existingPaths, dirtyPaths).slice(-maxDirtyPaths),
    guidedReadPaths: [],
    guidedWritePaths: [],
  };
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
  if (!isRecord(value)) {
    return { dirtyPaths: [], guidedReadPaths: [], guidedWritePaths: [] };
  }

  const dirtyPaths = Array.isArray(value.dirtyPaths)
    ? value.dirtyPaths
        .filter((dirtyPath): dirtyPath is string => typeof dirtyPath === "string")
        .map(normalizePath)
        .filter((dirtyPath) => dirtyPath.length > 0)
    : [];
  const guidedReadPaths = Array.isArray(value.guidedReadPaths)
    ? value.guidedReadPaths
        .filter((entry): entry is string => typeof entry === "string")
        .map(normalizePath)
        .filter((entry) => entry.length > 0)
    : [];
  const guidedWritePaths = Array.isArray(value.guidedWritePaths)
    ? value.guidedWritePaths
        .filter((entry): entry is string => typeof entry === "string")
        .map(normalizePath)
        .filter((entry) => entry.length > 0)
    : [];

  return {
    dirtyPaths: [...new Set(dirtyPaths)].slice(-maxDirtyPaths),
    guidedReadPaths: [...new Set(guidedReadPaths)].slice(-maxGuidedPaths),
    guidedWritePaths: [...new Set(guidedWritePaths)].slice(-maxGuidedPaths),
  };
}

export function resolveStateDir(
  pluginData: string | undefined,
  conversationId: string | undefined,
): string | undefined {
  if (pluginData) {
    return pluginData;
  }

  if (!conversationId) {
    return undefined;
  }

  return path.join(
    os.tmpdir(),
    "kibi-cursor-hook-state",
    conversationId.replaceAll(/[^a-zA-Z0-9._-]/g, "_"),
  );
}

export function loadHookState(stateDir: string | undefined): HookState {
  if (!stateDir) {
    return { dirtyPaths: [], guidedReadPaths: [], guidedWritePaths: [] };
  }

  try {
    return coerceHookState(
      JSON.parse(fs.readFileSync(statePath(stateDir), "utf8")),
    );
  } catch {
    return { dirtyPaths: [], guidedReadPaths: [], guidedWritePaths: [] };
  }
}

export function saveHookState(
  stateDir: string | undefined,
  state: HookState,
): void {
  if (!stateDir) {
    return;
  }

  fs.mkdirSync(stateDir, { recursive: true });
  const boundedState = coerceHookState(state);
  const tempPath = uniqueTempPath(stateDir);
  fs.writeFileSync(tempPath, `${JSON.stringify(boundedState)}\n`);
  fs.renameSync(tempPath, statePath(stateDir));
}

export function updateHookState(
  stateDir: string | undefined,
  updater: (state: HookState) => HookState,
): HookState {
  const initialState = loadHookState(stateDir);

  if (!stateDir) {
    return updater(initialState);
  }

  fs.mkdirSync(stateDir, { recursive: true });
  const lockFileDescriptor = acquireLock(stateDir);

  if (lockFileDescriptor === undefined) {
    return updater(initialState);
  }

  try {
    const lockedState = loadHookState(stateDir);
    const nextState = updater(lockedState);
    saveHookState(stateDir, nextState);
    return nextState;
  } catch {
    return updater(initialState);
  } finally {
    releaseLock(stateDir, lockFileDescriptor);
  }
}

export function addDirtyPaths(
  stateDir: string | undefined,
  dirtyPaths: readonly string[],
): HookState {
  return updateHookState(stateDir, (state) => ({
    ...state,
    dirtyPaths: mergeStringPaths(state.dirtyPaths, dirtyPaths).slice(
      -maxDirtyPaths,
    ),
  }));
}

export function rememberGuidedPath(
  stateDir: string | undefined,
  kind: "read" | "write",
  guidedPath: string,
): HookState {
  return updateHookState(stateDir, (state) => {
    const normalized = normalizePath(guidedPath);
    if (normalized.length === 0) {
      return state;
    }

    if (kind === "read") {
      return {
        ...state,
        guidedReadPaths: mergeStringPaths(state.guidedReadPaths, [normalized]),
      };
    }

    return {
      ...state,
      guidedWritePaths: mergeStringPaths(state.guidedWritePaths, [normalized]),
    };
  });
}

export function hasGuidedPath(
  state: HookState,
  kind: "read" | "write",
  guidedPath: string,
): boolean {
  const normalized = normalizePath(guidedPath);
  const bucket =
    kind === "read" ? state.guidedReadPaths : state.guidedWritePaths;
  return bucket.includes(normalized);
}

export function clearDirtyPaths(stateDir: string | undefined): HookState {
  const clearedState: HookState = {
    dirtyPaths: [],
    guidedReadPaths: [],
    guidedWritePaths: [],
  };

  if (!stateDir) {
    return clearedState;
  }

  return updateHookState(stateDir, () => clearedState);
}
