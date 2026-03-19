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
import { resolveKbPath, resolveWorkspaceRoot } from "../workspace.js";

export let prologProcess: PrologProcess | null = null;
let isInitialized = false;
export let activeBranchName = "develop";
let ensurePrologTail: Promise<void> = Promise.resolve();
export let isShuttingDown = false;
let shutdownTimeout: NodeJS.Timeout | null = null;
export const inFlightRequests = new Map<string, Promise<unknown>>();

function debugLog(...args: Parameters<typeof console.error>): void {
  if (process.env.KIBI_MCP_DEBUG) {
    console.error(...args);
  }
}

export function ensureBranchKbExists(
  workspaceRoot: string,
  branch: string,
): void {
  if (!isValidBranchName(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }

  const branchPath = resolveKbPath(workspaceRoot, branch);
  if (fs.existsSync(branchPath)) {
    return;
  }

  // Try to copy from the previously active branch if available
  const previousBranch = activeBranchName;
  const previousBranchPath = resolveKbPath(workspaceRoot, previousBranch);

  if (
    previousBranch !== branch &&
    previousBranch !== "develop" &&
    fs.existsSync(previousBranchPath)
  ) {
    // Copy from previous branch for continuity
    copyCleanSnapshot(previousBranchPath, branchPath);
    debugLog(
      `[KIBI-MCP] Created branch KB for '${branch}' from '${previousBranch}'`,
    );
    return;
  }

  // No previous branch available - create empty KB
  fs.mkdirSync(branchPath, { recursive: true });
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
async function ensurePrologUnsafe(): Promise<PrologProcess> {
  const workspaceRoot = resolveWorkspaceRoot();

  // Determine target branch: respect KIBI_BRANCH override or resolve from git
  const envBranch = process.env.KIBI_BRANCH?.trim();
  let targetBranch: string;

  if (envBranch) {
    // KIBI_BRANCH override is set - use it without re-resolving from git
    if (!isValidBranchName(envBranch)) {
      throw new Error(`Invalid branch name from KIBI_BRANCH: '${envBranch}'`);
    }
    targetBranch = envBranch;
  } else {
    // No override - resolve active branch from git (may change between requests)
    const branchResult = resolveActiveBranch(workspaceRoot);

    if ("error" in branchResult) {
      const diagnostic = getBranchDiagnostic(undefined, branchResult.error);
      console.error(`[KIBI-MCP] ${diagnostic}`);
      throw new Error(`Failed to resolve active branch: ${branchResult.error}`);
    }

    targetBranch = branchResult.branch;
  }

  // Check if we need to switch branches
  if (isInitialized && prologProcess?.isRunning()) {
    if (targetBranch === activeBranchName) {
      // Still on the same branch - return existing connection
      return prologProcess;
    }

    // Branch changed - need to detach and re-attach
    debugLog(
      `[KIBI-MCP] Branch changed: ${activeBranchName} -> ${targetBranch}`,
    );

    // Persist and detach from old KB
    const saveResult = await prologProcess.query("kb_save");
    if (!saveResult.success) {
      throw new Error(
        `Failed to save old KB before detach: ${saveResult.error || "Unknown error"}`,
      );
    }

    const detachResult = await prologProcess.query("kb_detach");
    if (!detachResult.success) {
      debugLog(
        `[KIBI-MCP] Warning: failed to detach from old KB: ${detachResult.error || "Unknown error"}`,
      );
      // Continue anyway - we'll try to attach to the new KB
    }

    // Ensure new branch KB exists
    ensureBranchKbExists(workspaceRoot, targetBranch);
    const newKbPath = resolveKbPath(workspaceRoot, targetBranch);

    // Attach to new branch KB
    const attachResult = await prologProcess.query(`kb_attach('${newKbPath}')`);
    if (!attachResult.success) {
      throw new Error(
        `Failed to attach to new branch KB: ${attachResult.error || "Unknown error"}`,
      );
    }

    activeBranchName = targetBranch;
    debugLog(`[KIBI-MCP] Re-attached to branch: ${targetBranch}`);
    debugLog(`[KIBI-MCP] KB path: ${newKbPath}`);

    return prologProcess;
  }

  // First initialization
  debugLog("[KIBI-MCP] Initializing Prolog process...");

  prologProcess = new PrologProcess({ timeout: 120000 });
  await prologProcess.start();

  // Startup debug: resolve which kibi-cli is being used and its version (best-effort).
  // Gate all output under KIBI_MCP_DEBUG and write only to stderr via debugLog.
  if (process.env.KIBI_MCP_DEBUG) {
    try {
      const req = createRequire(import.meta.url);
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
  debugLog(
    `[KIBI-MCP]   KIBI_BRANCH env: ${process.env.KIBI_BRANCH || "not set"}`,
  );
  debugLog(`[KIBI-MCP]   Resolved branch: ${targetBranch}`);

  activeBranchName = targetBranch;
  ensureBranchKbExists(workspaceRoot, targetBranch);
  const kbPath = resolveKbPath(workspaceRoot, targetBranch);
  const attachResult = await prologProcess.query(`kb_attach('${kbPath}')`);

  if (!attachResult.success) {
    throw new Error(
      `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
    );
  }

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
