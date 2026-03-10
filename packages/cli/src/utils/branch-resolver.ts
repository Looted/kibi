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

import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import * as path from "node:path";

export type BranchResolutionSuccess = { branch: string };
export type BranchResolutionError = { error: string; code: BranchErrorCode };
export type BranchResolutionResult =
  | BranchResolutionSuccess
  | BranchResolutionError;

export type BranchErrorCode =
  | "ENV_OVERRIDE"
  | "DETACHED_HEAD"
  | "UNBORN_BRANCH"
  | "GIT_NOT_AVAILABLE"
  | "NOT_A_GIT_REPO"
  | "UNKNOWN_ERROR";

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
  // 1. Check KIBI_BRANCH env var first (highest precedence)
  const envBranch = process.env.KIBI_BRANCH?.trim();
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
    const branch = execSync("git branch --show-current", {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

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

      // Normalize 'master' to 'main' for consistency
      const normalizedBranch = branch === "master" ? "main" : branch;

      return { branch: normalizedBranch };
    } catch (fallbackError) {
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
 * Check if the repository is in detached HEAD state.
 *
 * @param workspaceRoot - The workspace root directory
 * @returns true if in detached HEAD, false otherwise
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
 * Resolve the default branch using the following precedence:
 * 1. Configured defaultBranch from config (if set and valid)
 * 2. Git remote HEAD (refs/remotes/origin/HEAD)
 * 3. Fallback to "main"
 *
 * Unlike resolveActiveBranch, this does NOT normalize branch names.
 * Configured names are returned verbatim.
 *
 * @param cwd - The working directory to resolve the default branch
 * @param config - Optional config with defaultBranch
 * @returns BranchResolutionResult with either the branch name or an error
 */
export function resolveDefaultBranch(
  cwd: string = process.cwd(),
  config?: { defaultBranch?: string },
): { branch: string } | { error: string; code: string } {
  // 1. Check config.defaultBranch first (highest precedence)
  const configuredBranch = config?.defaultBranch?.trim();
  if (configuredBranch) {
    if (!isValidBranchName(configuredBranch)) {
      return {
        error: `Invalid defaultBranch configured in .kb/config.json: '${configuredBranch}'`,
        code: "INVALID_CONFIG",
      };
    }
    // Return configured branch verbatim (no normalization)
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

    // Parse refs/remotes/origin/BRANCH_NAME -> BRANCH_NAME
    const match = remoteHead.match(/^refs\/remotes\/origin\/(.+)$/);
    if (match) {
      const branch = match[1];
      if (isValidBranchName(branch)) {
        return { branch };
      }
    }
  } catch {
    // origin/HEAD doesn't exist or command failed, fall through to fallback
  }

  // 3. Final fallback to "main"
  return { branch: "main" };
}
