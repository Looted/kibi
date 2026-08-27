import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { HookState } from "./hook-state.js";
// implements REQ-cursor-kibi-plugin-v1, REQ-cursor-stop-job-vs-plan

const stateFileName = "hook-state.json";
const lockFileName = "hook-state.lock";
export const maxDirtyPaths = 50;
export const maxGuidedPaths = 100;
export const maxKbMutationTools = 20;
const lockRetryCount = 100;
const lockRetryDelayMs = 5;
const staleLockAgeMs = 30_000;

function statePath(pluginData: string): string {
  return path.join(pluginData, stateFileName);
}

function lockPath(pluginData: string): string {
  return path.join(pluginData, lockFileName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizePath(dirtyPath: string): string {
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

export function mergeStringPaths(
  existingPaths: readonly string[],
  nextPaths: readonly string[],
): string[] {
  const merged = [...existingPaths, ...nextPaths]
    .map(normalizePath)
    .filter((dirtyPath) => dirtyPath.length > 0);

  return [...new Set(merged)].slice(-maxGuidedPaths);
}

export function emptyHookState(): HookState {
  return {
    mcpState: "unknown",
    dirtyPaths: [],
    guidedReadPaths: [],
    guidedWritePaths: [],
    kbMutationTools: [],
    kbCheckRun: false,
    impactCheckRun: false,
    impactCheckedPaths: [],
    planDelivered: false,
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
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
  }

  try {
    fs.unlinkSync(lockPath(pluginData));
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
  }
}

function coerceHookState(value: unknown): HookState {
  if (!isRecord(value)) {
    return emptyHookState();
  }

  const strings = (candidate: unknown, normalize: (value: string) => string) =>
    Array.isArray(candidate)
      ? candidate
          .filter((entry): entry is string => typeof entry === "string")
          .map(normalize)
          .filter((entry) => entry.length > 0)
      : [];
  const dirtyPaths = strings(value.dirtyPaths, normalizePath);
  const guidedReadPaths = strings(value.guidedReadPaths, normalizePath);
  const guidedWritePaths = strings(value.guidedWritePaths, normalizePath);
  const kbMutationTools = strings(value.kbMutationTools, (entry) =>
    entry.trim(),
  );
  const impactCheckedPaths = strings(value.impactCheckedPaths, normalizePath);

  return {
    mcpState: value.mcpState === "observed" ? "observed" : "unknown",
    dirtyPaths: [...new Set(dirtyPaths)].slice(-maxDirtyPaths),
    guidedReadPaths: [...new Set(guidedReadPaths)].slice(-maxGuidedPaths),
    guidedWritePaths: [...new Set(guidedWritePaths)].slice(-maxGuidedPaths),
    kbMutationTools: [...new Set(kbMutationTools)].slice(-maxKbMutationTools),
    kbCheckRun: value.kbCheckRun === true,
    impactCheckRun: value.impactCheckRun === true,
    impactCheckedPaths: [...new Set(impactCheckedPaths)].slice(-maxGuidedPaths),
    planDelivered: value.planDelivered === true,
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
    return emptyHookState();
  }
  try {
    return coerceHookState(
      JSON.parse(fs.readFileSync(statePath(stateDir), "utf8")),
    );
  } catch {
    return emptyHookState();
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
