/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { execSync as rawExecSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import * as path from "node:path";
import { getBranchOverride } from "../env.js";

export type BranchResolutionSuccess = { branch: string };
export type BranchResolutionError = { error: string; code: BranchErrorCode };
export type BranchResolutionResult =
  | BranchResolutionSuccess
  | BranchResolutionError;

export type BranchAttachment = {
  gitBranch: string;
  kbBranch: string;
  kind: "exact" | "explicit_override" | "legacy_compat";
  migrationRequired: boolean;
};

export type BranchErrorCode =
  | "ENV_OVERRIDE"
  | "DETACHED_HEAD"
  | "UNBORN_BRANCH"
  | "GIT_NOT_AVAILABLE"
  | "NOT_A_GIT_REPO"
  | "AMBIGUOUS_ATTACHMENT"
  | "UNKNOWN_ERROR";

export interface BranchResolverDeps {
  execSync: typeof import("node:child_process").execSync;
}

const defaultDeps: BranchResolverDeps = { execSync: rawExecSync };

export function _setBranchResolverDepsForTests(
  deps: Partial<BranchResolverDeps>,
): void {
  // implements REQ-008
  defaultDeps.execSync = deps.execSync ?? rawExecSync;
}

// Files to exclude when copying branch snapshots (volatile artifacts)
const VOLATILE_ARTIFACTS = new Set([
  "sync-cache.json",
  "journal.log",
  "audit.log",
  "lock",
  "lockfile",
  ".lock",
]);

// File extensions to exclude
const VOLATILE_EXTENSIONS = new Set([".lock", ".tmp", ".temp", ".pid"]);

/**
 * Check if a file should be excluded from clean snapshot copy.
 */
function isVolatileArtifact(fileName: string): boolean {
  if (VOLATILE_ARTIFACTS.has(fileName)) return true;

  const ext = path.extname(fileName).toLowerCase();
  if (VOLATILE_EXTENSIONS.has(ext)) return true;

  // Journal files with timestamps: journal-*.log
  if (fileName.startsWith("journal-") && fileName.endsWith(".log")) return true;

  return false;
}

/**
 * Resolve the active branch according to ADR-012 precedence:
 * 1. KIBI_BRANCH env var (if set)
 * 2. Git active branch (from git branch --show-current)
 * 3. Diagnostic failure (no silent fallback)
 *
 * @param workspaceRoot - The workspace root directory
 * @returns BranchResolutionResult with either the branch name or an error
 */
export function resolveActiveBranch(
  workspaceRoot: string = process.cwd(),
): BranchResolutionResult {
  // implements REQ-008
  // 1. Check KIBI_BRANCH env var first (highest precedence)
  const envBranch = getBranchOverride();
  if (envBranch) {
    // Validate the env branch name
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
    const branch = defaultDeps
      .execSync("git branch --show-current", {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      })
      .trim();

    if (!branch) {
      // Empty result means detached HEAD
      return {
        error: getBranchDiagnostic(undefined, "Git is in detached HEAD state"),
        code: "DETACHED_HEAD",
      };
    }

    // Validate the branch name
    if (!isValidBranchName(branch)) {
      return {
        error: `Invalid branch name detected: '${branch}'`,
        code: "UNKNOWN_ERROR",
      };
    }

    // Git branch names are the branch identity.  Do not normalize master,
    // main, or any other branch name: the KB is branch-local state.
    return { branch };
  } catch (error) {
    // Try alternative: git rev-parse --abbrev-ref HEAD
    try {
      const branch = defaultDeps
        .execSync("git rev-parse --abbrev-ref HEAD", {
          cwd: workspaceRoot,
          encoding: "utf8",
          timeout: 5000,
          stdio: ["pipe", "pipe", "pipe"],
        })
        .trim();

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

      return { branch };
    } catch {
      // Determine specific error type
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
 * Resolve the storage namespace without treating any branch as canonical.
 * The only compatibility exception is the old master->main storage layout;
 * it is read-compatible but must be migrated before mutation.
 */
export function resolveBranchAttachment(
  workspaceRoot: string = process.cwd(),
): BranchAttachment | BranchResolutionError {
  const active = resolveActiveBranch(workspaceRoot);
  if ("error" in active) return active;
  const explicit = Boolean(getBranchOverride());
  const exactPath = path.join(workspaceRoot, ".kb", "branches", active.branch);
  const legacyPath = path.join(workspaceRoot, ".kb", "branches", "main");
  const mainGitBranch =
    !explicit && active.branch === "master"
      ? hasGitMainBranch(workspaceRoot)
      : false;
  if (
    !explicit &&
    active.branch === "master" &&
    existsSync(exactPath) &&
    existsSync(legacyPath) &&
    !mainGitBranch
  ) {
    return {
      error:
        "Ambiguous KB attachment: both .kb/branches/master and the legacy .kb/branches/main exist while Git has no main ref. Resolve the stores explicitly before continuing.",
      code: "AMBIGUOUS_ATTACHMENT",
    };
  }
  if (
    !explicit &&
    active.branch === "master" &&
    !existsSync(exactPath) &&
    existsSync(legacyPath) &&
    mainGitBranch
  ) {
    return {
      error:
        "Ambiguous KB attachment: Git has both master and main refs, but only .kb/branches/main exists. Resolve whether it is the main branch store or legacy master storage before continuing.",
      code: "AMBIGUOUS_ATTACHMENT",
    };
  }
  if (explicit || active.branch !== "master" || existsSync(exactPath)) {
    return {
      gitBranch: active.branch,
      kbBranch: active.branch,
      kind: explicit ? "explicit_override" : "exact",
      migrationRequired: false,
    };
  }

  if (!existsSync(legacyPath) || mainGitBranch) {
    return {
      gitBranch: active.branch,
      kbBranch: active.branch,
      kind: "exact",
      migrationRequired: false,
    };
  }
  return {
    gitBranch: active.branch,
    kbBranch: "main",
    kind: "legacy_compat",
    migrationRequired: true,
  };
}

function hasGitMainBranch(workspaceRoot: string): boolean {
  try {
    defaultDeps.execSync("git show-ref --verify --quiet refs/heads/main", {
      cwd: workspaceRoot,
      stdio: "ignore",
      timeout: 5000,
    });
    return true;
  } catch {
    try {
      defaultDeps.execSync(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { cwd: workspaceRoot, stdio: "ignore", timeout: 5000 },
      );
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check if the repository is in detached HEAD state.
 *
 * @param workspaceRoot - The workspace root directory
 * @returns true if in detached HEAD, false otherwise
 */
export function isDetachedHead(workspaceRoot: string = process.cwd()): boolean {
  // implements REQ-008
  try {
    const branch = defaultDeps
      .execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      })
      .trim();

    return branch === "HEAD";
  } catch {
    return true;
  }
}

/**
 * Get a detailed diagnostic message for branch resolution failures.
 *
 * @param branch - The branch that was detected (if any)
 * @param error - The error message or context
 * @returns A formatted diagnostic message
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

/**
 * Validate a branch name for safety and correctness.
 *
 * @param name - The branch name to validate
 * @returns true if valid, false otherwise
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
 * Copy a clean snapshot from source branch to target branch, excluding
 * volatile artifacts like sync-cache.json, lock files, and journal files.
 *
 * @param sourcePath - Path to the source branch KB directory
 * @param targetPath - Path to the target branch KB directory
 * @throws Error if the copy fails
 */
export function copyCleanSnapshot(
  sourcePath: string,
  targetPath: string,
): void {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source branch KB does not exist: ${sourcePath}`);
  }

  // Create target directory
  mkdirSync(targetPath, { recursive: true });

  // Recursively copy, excluding volatile artifacts
  copyDirectoryClean(sourcePath, targetPath);
}

/**
 * Recursively copy a directory, excluding volatile artifacts.
 */
function copyDirectoryClean(sourceDir: string, targetDir: string): void {
  const entries = readdirSync(sourceDir);

  for (const entry of entries) {
    // Skip volatile artifacts
    if (isVolatileArtifact(entry)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry);
    const targetPath = path.join(targetDir, entry);
    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      // Recursively copy subdirectory
      mkdirSync(targetPath, { recursive: true });
      copyDirectoryClean(sourcePath, targetPath);
    } else {
      // Copy file
      copyFileSync(sourcePath, targetPath);
    }
  }
}

/**
 * Get the list of files that would be excluded from a clean snapshot copy.
 * Useful for debugging and testing.
 *
 * @returns Array of volatile artifact patterns
 */
export function getVolatileArtifactPatterns(): string[] {
  return [
    ...Array.from(VOLATILE_ARTIFACTS),
    ...Array.from(VOLATILE_EXTENSIONS).map((ext) => `*${ext}`),
    "journal-*.log",
  ];
}

/**
 * @deprecated Branch lifecycle follows Git naturally. This helper remains for
 * callers that need informational remote-default discovery, but it never
 * invents a `main` branch.
 *
 * Resolve a remote default branch for informational display only. It must not
 * be used to attach a KB or initialize a branch. Callers that need a source
 * branch must require an explicit `--from` value.
 *
 * Unlike resolveActiveBranch, this does NOT normalize branch names.
 * Configured names are returned verbatim.
 *
 * @param cwd - The working directory to resolve the default branch
 * @param _config - Retained for source compatibility; ignored.
 * @returns BranchResolutionResult with either the branch name or an error
 */
export function resolveDefaultBranch(
  cwd: string = process.cwd(),
  _config?: { defaultBranch?: string },
): { branch: string } | { error: string; code: string } {
  // implements REQ-012
  // Try to get the remote default branch from origin/HEAD. This is only
  // informational; attachment always follows the active Git branch.
  try {
    const remoteHead = defaultDeps
      .execSync("git symbolic-ref refs/remotes/origin/HEAD", {
        cwd,
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      })
      .trim();

    // Parse refs/remotes/origin/BRANCH_NAME -> BRANCH_NAME
    const match = remoteHead.match(/^refs\/remotes\/origin\/(.+)$/);
    if (match) {
      const branch = match[1];
      if (branch && isValidBranchName(branch)) {
        return { branch };
      }
    }
  } catch {
    // origin/HEAD doesn't exist or command failed, fall through to fallback
  }

  return {
    error: "No remote default branch is configured; provide --from explicitly.",
    code: "NO_DEFAULT_BRANCH",
  };
}
