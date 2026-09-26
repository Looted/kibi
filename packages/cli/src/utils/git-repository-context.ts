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

import { execFileSync } from "node:child_process";
import * as path from "node:path";

export interface GitRepositoryContext {
  /** Root of the current working tree (the worktree, when linked). */
  worktreeRoot: string;
  /** Absolute Git directory of the current worktree. */
  gitDir: string;
  /** Absolute repository-common Git directory (shared across worktrees). */
  commonGitDir: string;
  /** Absolute hooks directory Git will actually execute (honors core.hooksPath). */
  effectiveHooksDir: string;
  isLinkedWorktree: boolean;
  /**
   * Primary checkout root, only when it can be validated as a real checkout
   * (`git -C <candidate> rev-parse --show-toplevel` resolves to the
   * candidate). Null for bare repositories, separate-git-dir layouts, and any
   * candidate that is not itself a working tree.
   */
  primaryWorktreeRoot: string | null;
  /** Raw core.hooksPath value when configured, else null. */
  hooksPathConfig: string | null;
  /** Config origin line (from --show-origin) for the configured hooksPath. */
  hooksPathOrigin: string | null;
}

export type GitRepositoryResolution =
  | { status: "ok"; context: GitRepositoryContext }
  | { status: "not-a-repository" }
  | { status: "git-unavailable" }
  | { status: "unsupported"; reason: string };

// `git rev-parse --path-format=absolute` requires git 2.31 (2021-03). Older
// git returns cwd-relative paths for --git-dir/--git-common-dir/--git-path,
// which are resolved against the caller's cwd below.
const PATH_FORMAT_MINIMUM = { major: 2, minor: 31 };

function runGit(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

function parseGitVersion(versionOutput: string): {
  major: number;
  minor: number;
} | null {
  const match = /^git version (\d+)\.(\d+)(\.\d+)?/.exec(versionOutput);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

function resolveAgainstCwd(candidate: string, cwd: string): string {
  return path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
}

/**
 * Resolve the effective Git repository context for `cwd` by asking Git
 * instead of assuming `<cwd>/.git`. The result distinguishes "no repository"
 * (callers may fall back to standalone-workspace behavior) from repositories
 * Kibi must not touch (bare repositories, unreadable contexts), so an
 * operational Git error can never trigger workspace writes.
 *
 * implements REQ-git-hook-effective-install
 */
export function resolveGitRepository(
  cwd: string = process.cwd(),
): GitRepositoryResolution {
  const gitAvailable = runGit(cwd, ["--version"]) !== null;
  if (!gitAvailable) return { status: "git-unavailable" };

  const worktreeRoot = runGit(cwd, ["rev-parse", "--show-toplevel"]);
  if (!worktreeRoot) {
    // A bare repository has no working tree (--show-toplevel fails) but is
    // still a repository; treat it as unsupported instead of "no repository"
    // so callers refuse to write workspace state into it.
    const gitDirProbe = runGit(cwd, ["rev-parse", "--git-dir"]);
    if (gitDirProbe) {
      return {
        status: "unsupported",
        reason: "Bare repository: no working tree to attach Kibi to.",
      };
    }
    return { status: "not-a-repository" };
  }

  const version = parseGitVersion(runGit(cwd, ["--version"]) ?? "");
  const absolute =
    version !== null &&
    (version.major > PATH_FORMAT_MINIMUM.major ||
      (version.major === PATH_FORMAT_MINIMUM.major &&
        version.minor >= PATH_FORMAT_MINIMUM.minor));

  const formatArgs = absolute ? ["--path-format=absolute"] : [];
  const gitDirRaw = runGit(cwd, ["rev-parse", ...formatArgs, "--git-dir"]);
  const commonGitDirRaw = runGit(cwd, [
    "rev-parse",
    ...formatArgs,
    "--git-common-dir",
  ]);
  const hooksDirRaw = runGit(cwd, [
    "rev-parse",
    ...formatArgs,
    "--git-path",
    "hooks",
  ]);
  if (!gitDirRaw || !commonGitDirRaw || !hooksDirRaw) {
    return {
      status: "unsupported",
      reason: "Git refused to report its directory layout for this repository.",
    };
  }

  // Without --path-format the outputs above are relative to cwd (or absolute
  // for linked-worktree git dirs); normalize everything against cwd.
  const gitDir = resolveAgainstCwd(gitDirRaw, cwd);
  const commonGitDir = resolveAgainstCwd(commonGitDirRaw, cwd);
  const effectiveHooksDir = resolveAgainstCwd(hooksDirRaw, cwd);

  const originLine = runGit(cwd, [
    "config",
    "--show-origin",
    "--get",
    "core.hooksPath",
  ]);
  let hooksPathConfig: string | null = null;
  let hooksPathOrigin: string | null = null;
  if (originLine) {
    const separator = originLine.lastIndexOf("\t");
    if (separator >= 0) {
      hooksPathOrigin = originLine.slice(0, separator).trim();
      hooksPathConfig = originLine.slice(separator + 1).trim();
    } else {
      hooksPathConfig = originLine.trim();
    }
  }

  const isLinkedWorktree = gitDir !== commonGitDir;
  let primaryWorktreeRoot: string | null = null;
  if (path.basename(commonGitDir) === ".git") {
    const candidate = path.dirname(commonGitDir);
    // Validate the candidate as a real checkout: a linked worktree of a bare
    // repository also has commonDir `<bare>/.git`, and dirname of that is the
    // bare holder directory, not a checkout.
    const candidateToplevel = runGit(candidate, [
      "rev-parse",
      "--show-toplevel",
    ]);
    if (candidateToplevel === candidate) {
      primaryWorktreeRoot = candidate;
    }
  }

  return {
    status: "ok",
    context: {
      worktreeRoot,
      gitDir,
      commonGitDir,
      effectiveHooksDir,
      isLinkedWorktree,
      primaryWorktreeRoot,
      hooksPathConfig,
      hooksPathOrigin,
    },
  };
}
