/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { execSync } from "node:child_process";
import * as path from "node:path";

const WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
] as const;

const KB_PATH_ENV_KEYS = ["KIBI_KB_PATH", "KB_PATH"] as const;

export type ResolutionReason = "env" | "kb" | "git" | "cwd";

export interface WorkspaceInfo {
  root: string;
  reason: ResolutionReason;
}

export interface KbTarget {
  workspaceRoot: string;
  branch: string;
  kbPath: string;
  reason: ResolutionReason;
}

export type BranchErrorCode =
  | "ENV_OVERRIDE"
  | "DETACHED_HEAD"
  | "UNBORN_BRANCH"
  | "GIT_NOT_AVAILABLE"
  | "NOT_A_GIT_REPO"
  | "UNKNOWN_ERROR";

export interface BranchResolutionSuccess {
  branch: string;
}

export interface BranchResolutionError {
  error: string;
  code: BranchErrorCode;
}

export type BranchResolutionResult =
  | BranchResolutionSuccess
  | BranchResolutionError;

/**
 * Resolve workspace root directory.
 * Priority: env vars > .kb directory > .git directory > cwd
 */
export function resolveWorkspaceRoot(startDir: string = process.cwd()): string {
  const envRoot = readFirstEnv(WORKSPACE_ENV_KEYS);
  if (envRoot) {
    return path.resolve(envRoot);
  }

  const kbRoot = findUpwards(startDir, ".kb");
  if (kbRoot) {
    return kbRoot;
  }

  const gitRoot = findUpwards(startDir, ".git");
  if (gitRoot) {
    return gitRoot;
  }

  return path.resolve(startDir);
}

/**
 * Resolve workspace root with reason for resolution.
 */
export function resolveWorkspaceRootInfo(
  startDir: string = process.cwd(),
): WorkspaceInfo {
  const envRoot = readFirstEnv(WORKSPACE_ENV_KEYS);
  if (envRoot) {
    return { root: path.resolve(envRoot), reason: "env" };
  }

  const kbRoot = findUpwards(startDir, ".kb");
  if (kbRoot) {
    return { root: kbRoot, reason: "kb" };
  }

  const gitRoot = findUpwards(startDir, ".git");
  if (gitRoot) {
    return { root: gitRoot, reason: "git" };
  }

  return { root: path.resolve(startDir), reason: "cwd" };
}

/**
 * Resolve KB path for a given workspace and branch.
 */
export function resolveKbPath(workspaceRoot: string, branch: string): string {
  const envPath = readFirstEnv(KB_PATH_ENV_KEYS);
  if (envPath) {
    const resolved = path.resolve(envPath);
    if (isBranchPath(resolved)) {
      return resolved;
    }
    return path.join(resolved, "branches", branch);
  }

  return path.join(workspaceRoot, ".kb", "branches", branch);
}

/**
 * Resolve the active branch according to precedence:
 * 1. KIBI_BRANCH env var (if set)
 * 2. Git active branch (from git branch --show-current)
 * 3. Diagnostic failure (no silent fallback)
 */
export function resolveActiveBranch(
  workspaceRoot: string = process.cwd(),
): BranchResolutionResult {
  // 1. Check KIBI_BRANCH env var first (highest precedence)
  const envBranch = process.env.KIBI_BRANCH?.trim();
  if (envBranch) {
    if (!isValidBranchName(envBranch)) {
      return {
        error: `Invalid branch name from KIBI_BRANCH environment variable: '${envBranch}'`,
        code: "ENV_OVERRIDE",
      };
    }
    return { branch: envBranch };
  }

  // 2. Try to get the current git branch
  try {
    const branch = execSync("git branch --show-current", {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!branch) {
      return {
        error: getBranchDiagnostic(undefined, "Git is in detached HEAD state"),
        code: "DETACHED_HEAD",
      };
    }

    if (!isValidBranchName(branch)) {
      return {
        error: `Invalid branch name detected: '${branch}'`,
        code: "UNKNOWN_ERROR",
      };
    }

    // Normalize 'master' to 'main' for consistency
    const normalizedBranch = branch === "master" ? "main" : branch;
    return { branch: normalizedBranch };
  } catch (error) {
    // Try alternative: git rev-parse --abbrev-ref HEAD
    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (branch === "HEAD") {
        return {
          error: getBranchDiagnostic(
            undefined,
            "Git is in detached HEAD state",
          ),
          code: "DETACHED_HEAD",
        };
      }

      if (!branch || branch === "") {
        return {
          error: getBranchDiagnostic(
            undefined,
            "Unable to determine git branch",
          ),
          code: "UNBORN_BRANCH",
        };
      }

      if (!isValidBranchName(branch)) {
        return {
          error: `Invalid branch name detected: '${branch}'`,
          code: "UNKNOWN_ERROR",
        };
      }

      const normalizedBranch = branch === "master" ? "main" : branch;
      return { branch: normalizedBranch };
    } catch {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("not a git repository")) {
        return {
          error: getBranchDiagnostic(undefined, "Not a git repository"),
          code: "NOT_A_GIT_REPO",
        };
      }

      if (
        errorMessage.includes("command not found") ||
        errorMessage.includes("ENOENT")
      ) {
        return {
          error: getBranchDiagnostic(
            undefined,
            "Git is not installed or not available in PATH",
          ),
          code: "GIT_NOT_AVAILABLE",
        };
      }

      return {
        error: getBranchDiagnostic(undefined, errorMessage),
        code: "UNKNOWN_ERROR",
      };
    }
  }
}

/**
 * @deprecated defaultBranch is deprecated. Branch lifecycle now follows git naturally.
 * This function is kept for backward compatibility but should not be used for new code.
 *
 * Resolve the default branch using precedence:
 * 1. Configured defaultBranch from config (if set and valid)
 * 2. Git remote HEAD (refs/remotes/origin/HEAD)
 * 3. Fallback to "main"
 */
export function resolveDefaultBranch(
  cwd: string = process.cwd(),
  config?: { defaultBranch?: string },
): { branch: string } | { error: string; code: string } {
  // 1. Check config.defaultBranch first
  const configuredBranch = config?.defaultBranch?.trim();
  if (configuredBranch) {
    if (!isValidBranchName(configuredBranch)) {
      return {
        error: `Invalid defaultBranch configured in .kb/config.json: '${configuredBranch}'`,
        code: "INVALID_CONFIG",
      };
    }
    return { branch: configuredBranch };
  }

  // 2. Try to get the remote default branch from origin/HEAD
  try {
    const remoteHead = execSync("git symbolic-ref refs/remotes/origin/HEAD", {
      cwd,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const match = remoteHead.match(/^refs\/remotes\/origin\/(.+)$/);
    if (match) {
      const branch = match[1];
      if (isValidBranchName(branch)) {
        return { branch };
      }
    }
  } catch {
    // origin/HEAD doesn't exist or command failed
  }

  // 3. Final fallback to "main"
  return { branch: "main" };
}

/**
 * Resolve complete KB target with all components.
 */
export function resolveKbTarget(options?: {
  // implements REQ-012, REQ-008
  workspaceRoot?: string;
  branch?: string;
  config?: { defaultBranch?: string };
}): KbTarget {
  const workspaceRoot = options?.workspaceRoot ?? resolveWorkspaceRoot();

  let branch: string;
  let reason: ResolutionReason;

  if (options?.branch) {
    branch = options.branch;
    reason = "env";
  } else {
    const branchResult = resolveActiveBranch(workspaceRoot);
    if ("error" in branchResult) {
      throw new Error(
        `Failed to resolve active branch: ${branchResult.error}. Ensure you are in a git repository with a valid branch checked out.`,
      );
    }
    branch = branchResult.branch;
    reason = "git";
  }

  const kbPath = resolveKbPath(workspaceRoot, branch);

  return { workspaceRoot, branch, kbPath, reason };
}

/**
 * Check if repository is in detached HEAD state.
 */
export function isDetachedHead(workspaceRoot: string = process.cwd()): boolean {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    return branch === "HEAD";
  } catch {
    return true;
  }
}

/**
 * Validate a branch name for safety.
 */
export function isValidBranchName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 255) return false;

  // Reject path traversal attempts
  if (name.includes("..") || path.isAbsolute(name) || name.startsWith("/")) {
    return false;
  }

  // Only allow safe characters
  if (!/^[a-zA-Z0-9._\-/+]+$/.test(name)) return false;

  // Reject problematic patterns
  if (
    name.includes("//") ||
    name.endsWith("/") ||
    name.endsWith(".") ||
    name.includes("\\") ||
    name.startsWith("-")
  ) {
    return false;
  }

  return true;
}

/**
 * Get a detailed diagnostic message for branch resolution failures.
 */
export function getBranchDiagnostic(
  branch: string | undefined,
  error: string,
): string {
  const lines: string[] = ["Branch Resolution Failed", "", `Reason: ${error}`];

  if (branch) {
    lines.push(`Detected branch: ${branch}`);
  }

  lines.push(
    "",
    "Resolution options:",
    "1. Set KIBI_BRANCH environment variable to explicitly specify the branch:",
    "   export KIBI_BRANCH=main",
    "",
    "2. Ensure you are in a git repository with a valid checked-out branch",
    "",
    "3. If in detached HEAD state, create or checkout a branch:",
    "   git checkout -b my-branch",
    "",
    "4. For non-git workspaces, always use KIBI_BRANCH:",
    "   KIBI_BRANCH=feature-branch kibi sync",
  );

  return lines.join("\n");
}

function readFirstEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function findUpwards(startDir: string, marker: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, marker);
    try {
      // Check if path exists (works for both files and directories)
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      import("node:fs").then((fs) => {
        fs.accessSync(candidate);
      });
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }
}

function isBranchPath(p: string): boolean {
  const parent = path.basename(path.dirname(p));
  return parent === "branches";
}
