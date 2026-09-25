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
   * Primary checkout root when it can be derived unambiguously, i.e. when the
   * common Git directory is `<primary>/.git`. Null for bare repositories and
   * separate-git-dir layouts where dirname(commonGitDir) is not a checkout.
   */
  primaryWorktreeRoot: string | null;
  /** Raw core.hooksPath value when configured, else null. */
  hooksPathConfig: string | null;
  /** Config origin line (from --show-origin) for the configured hooksPath. */
  hooksPathOrigin: string | null;
}

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
 * instead of assuming `<cwd>/.git`. Returns null when `cwd` is not inside a
 * Git repository or Git is unavailable; callers decide how to report that.
 *
 * implements REQ-git-hook-effective-install
 */
export function resolveGitRepositoryContext(
  cwd: string = process.cwd(),
): GitRepositoryContext | null {
  const worktreeRoot = runGit(cwd, ["rev-parse", "--show-toplevel"]);
  if (!worktreeRoot) return null;

  const version = parseGitVersion(runGit(cwd, ["--version"]) ?? "");
  const absolute = version !== null &&
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
  if (!gitDirRaw || !commonGitDirRaw || !hooksDirRaw) return null;

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
  const primaryWorktreeRoot =
    path.basename(commonGitDir) === ".git" ? path.dirname(commonGitDir) : null;

  return {
    worktreeRoot,
    gitDir,
    commonGitDir,
    effectiveHooksDir,
    isLinkedWorktree,
    primaryWorktreeRoot,
    hooksPathConfig,
    hooksPathOrigin,
  };
}
