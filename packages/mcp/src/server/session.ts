/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";
import { PrologProcess } from "kibi-cli/prolog";
import {
  copyCleanSnapshot,
  getBranchDiagnostic,
  isValidBranchName,
  resolveActiveBranch,
} from "kibi-cli/public/branch-resolver";
import { getBranchOverride, isMcpDebugEnabled } from "../env.js";
import { resolveKbPath, resolveWorkspaceRoot } from "../workspace.js";
import {
  type BranchKbStamp,
  KbRefreshError,
  readBranchKbStamp,
  sameBranchKbStamp,
} from "./kb-freshness.js";

interface SessionDeps {
  PrologProcess: typeof PrologProcess;
  copyCleanSnapshot: typeof copyCleanSnapshot;
  createRequire: typeof createRequire;
  fs: Pick<typeof fs, "existsSync" | "mkdirSync">;
  getBranchDiagnostic: typeof getBranchDiagnostic;
  isValidBranchName: typeof isValidBranchName;
  resolveActiveBranch: typeof resolveActiveBranch;
  resolveKbPath: typeof resolveKbPath;
  resolveWorkspaceRoot: typeof resolveWorkspaceRoot;
}

const defaultSessionDeps: SessionDeps = {
  PrologProcess,
  copyCleanSnapshot,
  createRequire,
  fs,
  getBranchDiagnostic,
  isValidBranchName,
  resolveActiveBranch,
  resolveKbPath,
  resolveWorkspaceRoot,
};

let sessionDeps: SessionDeps = { ...defaultSessionDeps };

export let prologProcess: PrologProcess | null = null;
let isInitialized = false;
export let activeBranchName = "develop";
let ensurePrologTail: Promise<void> = Promise.resolve();
let prologResetGeneration = 0;
let attachedBranchKbPath: string | null = null;
let attachedBranchStamp: BranchKbStamp | null = null;
let hasValidatedSameBranchRefresh = false;
export let isShuttingDown = false;
let shutdownTimeout: NodeJS.Timeout | null = null;
export const inFlightRequests = new Map<string, Promise<unknown>>();

// implements REQ-008
export function resetSessionStateForTests(): void {
  prologProcess = null;
  isInitialized = false;
  activeBranchName = "develop";
  ensurePrologTail = Promise.resolve();
  prologResetGeneration = 0;
  attachedBranchKbPath = null;
  attachedBranchStamp = null;
  hasValidatedSameBranchRefresh = false;
  isShuttingDown = false;
  inFlightRequests.clear();
  if (shutdownTimeout) {
    clearTimeout(shutdownTimeout);
    shutdownTimeout = null;
  }
}

export function _setSessionDepsForTests(
  // implements REQ-008
  overrides: Partial<SessionDeps>,
): void {
  sessionDeps = { ...sessionDeps, ...overrides };
}

export function _resetSessionDepsForTests(): void {
  // implements REQ-008
  sessionDeps = { ...defaultSessionDeps };
}

function debugLog(...args: Parameters<typeof console.error>): void {
  if (isMcpDebugEnabled()) {
    console.error(...args);
  }
}

export function ensureBranchKbExists(
  workspaceRoot: string,
  branch: string,
): void {
  // implements REQ-008
  if (!sessionDeps.isValidBranchName(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }

  const branchPath = sessionDeps.resolveKbPath(workspaceRoot, branch);
  if (sessionDeps.fs.existsSync(branchPath)) {
    return;
  }

  // Try to copy from the previously active branch if available
  const previousBranch = activeBranchName;
  const previousBranchPath = sessionDeps.resolveKbPath(
    workspaceRoot,
    previousBranch,
  );

  if (
    previousBranch !== branch &&
    previousBranch !== "develop" &&
    sessionDeps.fs.existsSync(previousBranchPath)
  ) {
    // Copy from previous branch for continuity
    sessionDeps.copyCleanSnapshot(previousBranchPath, branchPath);
    debugLog(
      `[KIBI-MCP] Created branch KB for '${branch}' from '${previousBranch}'`,
    );
    return;
  }

  // No previous branch available - create empty KB
  sessionDeps.fs.mkdirSync(branchPath, { recursive: true });
  debugLog(`[KIBI-MCP] Created empty branch KB for '${branch}'`);
}

export async function initiateGracefulShutdown(exitCode = 0): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  debugLog(`[KIBI-MCP] Initiating graceful shutdown (exit code: ${exitCode})`);

  // Wait for in-flight requests
  if (inFlightRequests.size > 0) {
    debugLog(
      `[KIBI-MCP] Waiting for ${inFlightRequests.size} in-flight requests to complete...`,
    );

    const timeoutPromise = new Promise((_, reject) => {
      shutdownTimeout = setTimeout(() => {
        reject(new Error("Shutdown timeout"));
      }, 10000); // 10 second timeout
    });

    try {
      await Promise.race([
        Promise.allSettled(Array.from(inFlightRequests.values())),
        timeoutPromise,
      ]);
      debugLog("[KIBI-MCP] All in-flight requests completed");
    } catch (_error) {
      console.error("[KIBI-MCP] Shutdown timeout reached, forcing exit");
    } finally {
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = null;
      }
    }
  }

  // Cleanup Prolog process
  if (prologProcess?.isRunning()) {
    debugLog("[KIBI-MCP] Terminating Prolog process...");
    try {
      await prologProcess.terminate();
      debugLog("[KIBI-MCP] Prolog process terminated");
    } catch (error) {
      console.error("[KIBI-MCP] Error terminating Prolog:", error);
    }
  }

  // Exit
  process.exit(exitCode);
}

// implements REQ-008
export async function resetProlog(reason: string): Promise<void> {
  debugLog(`[KIBI-MCP] Resetting Prolog worker: ${reason}`);
  prologResetGeneration += 1;
  const current = prologProcess;
  prologProcess = null;
  isInitialized = false;
  attachedBranchKbPath = null;
  attachedBranchStamp = null;
  hasValidatedSameBranchRefresh = false;

  if (current) {
    try {
      await current.terminate();
    } catch (error) {
      console.error("[KIBI-MCP] Error resetting Prolog worker:", error);
    }
  }
}

async function refreshAttachedBranchKb(
  prolog: PrologProcess,
  kbPath: string,
  assertGeneration: () => Promise<void>,
): Promise<BranchKbStamp> {
  prolog.invalidateCache();

  const detachResult = await prolog.query("kb_detach");
  await assertGeneration();
  if (!detachResult.success) {
    throw new KbRefreshError(
      `KB refresh failed: detach failed: ${detachResult.error || "Unknown error"}`,
    );
  }

  const attachResult = await prolog.query(`kb_attach('${kbPath}')`);
  await assertGeneration();
  if (!attachResult.success) {
    throw new KbRefreshError(
      `KB refresh failed: attach failed: ${attachResult.error || "Unknown error"}`,
    );
  }

  return await readBranchKbStamp(kbPath);
}

async function refreshAttachedBranchKbWithRetry(
  prolog: PrologProcess,
  kbPath: string,
  currentStamp: BranchKbStamp,
  assertGeneration: () => Promise<void>,
): Promise<BranchKbStamp> {
  let postAttachStamp = await refreshAttachedBranchKb(
    prolog,
    kbPath,
    assertGeneration,
  );

  if (sameBranchKbStamp(postAttachStamp, currentStamp)) {
    return postAttachStamp;
  }

  postAttachStamp = await refreshAttachedBranchKb(prolog, kbPath, assertGeneration);
  if (!sameBranchKbStamp(postAttachStamp, currentStamp)) {
    throw new KbRefreshError("KB refresh failed: stamp changed during attach");
  }

  return postAttachStamp;
}

function usesBranchKbPath(kbPath: string): boolean {
  return kbPath.includes("/.kb/branches/") || kbPath.includes("\\.kb\\branches\\");
}

// implements REQ-008
async function ensurePrologUnsafe(): Promise<PrologProcess> {
  const generationAtStart = prologResetGeneration;
  const workspaceRoot = sessionDeps.resolveWorkspaceRoot();

  const assertGeneration = async (): Promise<void> => {
    if (generationAtStart !== prologResetGeneration) {
      const current = prologProcess;
      prologProcess = null;
      isInitialized = false;
      if (current) {
        await current.terminate().catch((error) => {
          console.error(
            "[KIBI-MCP] Error terminating stale Prolog after reset generation change:",
            error,
          );
        });
      }
      throw new Error(
        "Prolog worker reset while initialization was in progress",
      );
    }
  };

  // Determine target branch: respect KIBI_BRANCH override or resolve from git
  const envBranch = getBranchOverride();
  let targetBranch: string;

  if (envBranch) {
    // KIBI_BRANCH override is set - use it without re-resolving from git
    if (!sessionDeps.isValidBranchName(envBranch)) {
      throw new Error(`Invalid branch name from KIBI_BRANCH: '${envBranch}'`);
    }
    targetBranch = envBranch;
  } else {
    // No override - resolve active branch from git (may change between requests)
    const branchResult = sessionDeps.resolveActiveBranch(workspaceRoot);

    if ("error" in branchResult) {
      const diagnostic = sessionDeps.getBranchDiagnostic(
        undefined,
        branchResult.error,
      );
      console.error(`[KIBI-MCP] ${diagnostic}`);
      throw new Error(`Failed to resolve active branch: ${branchResult.error}`);
    }

    targetBranch = branchResult.branch;
  }

  // Check if we need to switch branches
  if (isInitialized && prologProcess?.isRunning()) {
    const kbPath = sessionDeps.resolveKbPath(workspaceRoot, targetBranch);

    if (targetBranch === activeBranchName) {
      const currentStamp = await readBranchKbStamp(kbPath);
      const shouldRefresh =
        attachedBranchKbPath === kbPath &&
        attachedBranchStamp !== null &&
        usesBranchKbPath(kbPath) &&
        (!hasValidatedSameBranchRefresh ||
          !sameBranchKbStamp(currentStamp, attachedBranchStamp));

      if (shouldRefresh) {
        attachedBranchStamp = await refreshAttachedBranchKbWithRetry(
          prologProcess,
          kbPath,
          currentStamp,
          assertGeneration,
        );
        hasValidatedSameBranchRefresh = true;
      } else {
        attachedBranchKbPath = kbPath;
        attachedBranchStamp = currentStamp;
      }
      attachedBranchKbPath = kbPath;
      return prologProcess;
    }

    // Branch changed - need to detach and re-attach
    debugLog(
      `[KIBI-MCP] Branch changed: ${activeBranchName} -> ${targetBranch}`,
    );

    // Persist and detach from old KB
    const saveResult = await prologProcess.query("kb_save");
    await assertGeneration();
    if (!saveResult.success) {
      throw new Error(
        `Failed to save old KB before detach: ${saveResult.error || "Unknown error"}`,
      );
    }

    const detachResult = await prologProcess.query("kb_detach");
    await assertGeneration();
    if (!detachResult.success) {
      debugLog(
        `[KIBI-MCP] Warning: failed to detach from old KB: ${detachResult.error || "Unknown error"}`,
      );
      // Continue anyway - we'll try to attach to the new KB
    }

    // Ensure new branch KB exists
    ensureBranchKbExists(workspaceRoot, targetBranch);

    // Attach to new branch KB
    const attachResult = await prologProcess.query(`kb_attach('${kbPath}')`);
    await assertGeneration();
    if (!attachResult.success) {
      throw new Error(
        `Failed to attach to new branch KB: ${attachResult.error || "Unknown error"}`,
      );
    }

    activeBranchName = targetBranch;
    attachedBranchKbPath = kbPath;
    attachedBranchStamp = await readBranchKbStamp(kbPath);
    hasValidatedSameBranchRefresh = false;
    debugLog(`[KIBI-MCP] Re-attached to branch: ${targetBranch}`);
    debugLog(`[KIBI-MCP] KB path: ${kbPath}`);

    return prologProcess;
  }

  // First initialization
  debugLog("[KIBI-MCP] Initializing Prolog process...");

  prologProcess = new sessionDeps.PrologProcess({ timeout: 120000 });
  await prologProcess.start();
  await assertGeneration();

  // Startup debug: resolve which kibi-cli is being used and its version (best-effort).
  // Gate all output under KIBI_MCP_DEBUG and write only to stderr via debugLog.
  if (isMcpDebugEnabled()) {
    try {
      const req = sessionDeps.createRequire(import.meta.url);
      try {
        const resolved = req.resolve("kibi-cli/prolog");
        debugLog(
          `[KIBI-MCP] require.resolve('kibi-cli/prolog') -> ${resolved}`,
        );
      } catch (resolveErr) {
        debugLog(
          "[KIBI-MCP] require.resolve('kibi-cli/prolog') failed:",
          (resolveErr as Error).message,
        );
      }

      // Try to read package.json for kibi-cli to get version. This may fail if
      // the package uses exports blocking package.json access — log explicit failure.
      try {
        // prefer direct package.json require; createRequire makes this ESM-friendly
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = req("kibi-cli/package.json");
        if (pkg && typeof pkg.version === "string") {
          debugLog(`[KIBI-MCP] kibi-cli version: ${pkg.version}`);
        } else {
          debugLog(
            "[KIBI-MCP] kibi-cli package.json read but no version field",
          );
        }
      } catch (pkgErr) {
        debugLog(
          "[KIBI-MCP] Failed to read kibi-cli package.json (exports may restrict access):",
          (pkgErr as Error).message,
        );
      }
    } catch (err) {
      debugLog(
        "[KIBI-MCP] Failed to create require() for debug lookup:",
        (err as Error).message,
      );
    }
  }

  debugLog("[KIBI-MCP] Branch selection:");
  debugLog(`[KIBI-MCP]   KIBI_BRANCH env: ${envBranch || "not set"}`);
  debugLog(`[KIBI-MCP]   Resolved branch: ${targetBranch}`);

  activeBranchName = targetBranch;
  ensureBranchKbExists(workspaceRoot, targetBranch);
  const kbPath = sessionDeps.resolveKbPath(workspaceRoot, targetBranch);
  const attachResult = await prologProcess.query(`kb_attach('${kbPath}')`);
  await assertGeneration();

  if (!attachResult.success) {
    throw new Error(
      `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
    );
  }

  attachedBranchKbPath = kbPath;
  attachedBranchStamp = await readBranchKbStamp(kbPath);
  hasValidatedSameBranchRefresh = false;

  isInitialized = true;
  debugLog(
    `[KIBI-MCP] Prolog process started (PID: ${prologProcess.getPid()})`,
  );
  debugLog(`[KIBI-MCP] KB attached: ${kbPath}`);
  return prologProcess;
}

export async function ensureProlog(): Promise<PrologProcess> {
  const previous = ensurePrologTail;
  let release!: () => void;
  ensurePrologTail = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await ensurePrologUnsafe();
  } finally {
    release();
  }
}
