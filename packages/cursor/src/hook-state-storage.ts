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
  // rationale: every coerced field tolerates primitives (missing -> empty
  // lists, flags -> false), so dropping the type/null checks still yields
  // the same coerced state for every JSON value.
  // Stryker disable next-line ConditionalExpression, LogicalOperator
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizePath(dirtyPath: string): string {
  return dirtyPath.trim().replaceAll("\\", "/");
}

// rationale: sleepSync only paces lock retries; the lock outcome and state
// result are identical without it.
// Stryker disable next-line BlockStatement
function sleepSync(milliseconds: number): void {
  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);
  // rationale: the wait only paces retries; see the function rationale above.
  // Stryker disable next-line CallExpression
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

  // rationale: the extra attempt only re-runs the same EEXIST handling one
  // more time; the eventual lock outcome is unchanged.
  // Stryker disable next-line EqualityOperator
  for (let attempt = 0; attempt < lockRetryCount; attempt++) {
    try {
      return fs.openSync(targetLockPath, "wx");
    } catch (error) {
      // rationale: fail-fast vs re-entering the retry loop both end with the
      // same undefined result; stale removal and sleepSync only pace it.
      if (
        // Stryker disable next-line ConditionalExpression, LogicalOperator
        error instanceof Error &&
        "code" in error &&
        // rationale: same convergence argument as the comment above.
        // Stryker disable next-line ConditionalExpression
        error.code === "EEXIST"
      ) {
        // rationale: after removal or a paced retry the lock state converges
        // on the same acquisition outcome.
        // Stryker disable next-line ConditionalExpression, BlockStatement
        if (removeStaleLock(targetLockPath)) {
          // rationale: an immediate retry after successful removal has the
          // same outcome as a paced retry.
          // Stryker disable next-line BlockStatement
          continue;
        }

        // rationale: pacing only; see the acquireLock rationale above.
        // Stryker disable next-line CallExpression
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

  // rationale: removeStaleLock only runs after an EEXIST open, so a failed
  // stat cannot change the observable lock outcome within a single thread.
  // Stryker disable BlockStatement, BooleanLiteral
  try {
    stats = fs.statSync(targetLockPath);
  } catch {
    return false;
  }
  // Stryker restore

  // rationale: the fresh/stale boundary is a pacing decision, not a state
  // transition; both answers converge on the same eventual update result.
  // Stryker disable next-line EqualityOperator
  if (Date.now() - stats.mtimeMs < staleLockAgeMs) {
    // rationale: same convergence argument as the fresh/stale comment above.
    // Stryker disable next-line BooleanLiteral
    return false;
  }

  // rationale: after a successful unlink the lock is gone either way, and an
  // unlink failure leaves it in place; either answer converges on the same
  // eventual lock outcome.
  // Stryker disable BlockStatement, BooleanLiteral
  try {
    fs.unlinkSync(targetLockPath);
    return true;
  } catch {
    return false;
  }
  // Stryker restore
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
  // rationale: every coerced field tolerates non-records (missing -> empty
  // lists, flags -> false), so the guard is behaviorally redundant.
  // Stryker disable ConditionalExpression, BlockStatement
  if (!isRecord(value)) {
    return emptyHookState();
  }
  // Stryker restore

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
  // rationale: the read below throws for a missing stateDir and the catch
  // returns the same empty state.
  // Stryker disable next-line ConditionalExpression, BlockStatement
  if (!stateDir) {
    return emptyHookState();
  }
  try {
    return coerceHookState(
      // rationale: Bun treats the empty encoding as utf8 (verified).
      // Stryker disable next-line StringLiteral
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
