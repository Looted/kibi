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
import { accessSync, constants, lstatSync } from "node:fs";
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
  | {
      status: "git-refused";
      /** First Git diagnostic (or fs detail) explaining the refusal. */
      reason: string;
    }
  | { status: "unsupported"; reason: string };

// `git rev-parse --path-format=absolute` requires git 2.31 (2021-03). Older
// git returns cwd-relative paths for --git-dir/--git-common-dir/--git-path,
// which are resolved against the caller's cwd below.
const PATH_FORMAT_MINIMUM = { major: 2, minor: 31 };

// Git's generic absence answer also covers directories it cannot read (an
// unreadable `.git` yields the same "not a git repository" fatal). Only an
// explicit absence diagnostic may classify a directory as standalone.
const NOT_A_REPOSITORY_RE = /not a (git )?repository/i;

interface GitInvocation {
  /** Trimmed stdout when git exited successfully. */
  output: string | null;
  /** First stderr line when git failed, else null. */
  failure: string | null;
}

function runGitChecked(cwd: string, args: string[]): GitInvocation {
  try {
    return {
      output: execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10_000,
        maxBuffer: 1024 * 1024,
      }).trim(),
      failure: null,
    };
  } catch (error) {
    const stderr = (error as { stderr?: string | Buffer }).stderr;
    const text = typeof stderr === "string" ? stderr : stderr?.toString("utf8");
    const firstLine =
      text?.split("\n").map((line) => line.trim()).find(Boolean) ?? null;
    return { output: null, failure: firstLine };
  }
}

function runGit(cwd: string, args: string[]): string | null {
  return runGitChecked(cwd, args).output;
}

/**
 * Decide whether a failed repository probe means the directory genuinely has
 * no repository (standalone fallback is allowed) or Git refused for an
 * operational reason (dubious ownership, access, timeouts, anything
 * unrecognized) where callers must refuse before writing.
 */
function classifyGitFailure(
  failure: string | null,
): "not-a-repository" | "refused" {
  if (failure !== null && NOT_A_REPOSITORY_RE.test(failure)) {
    return "not-a-repository";
  }
  return "refused";
}

/**
 * Disambiguate Git's generic "not a git repository" answer: an existing but
 * unreadable `.git` entry (restricted permissions, broken ownership checks
 * upstream) produces that same fatal, and treating it as "no repository"
 * would send callers down the standalone path. Walk from the start directory
 * upward and report the first `.git` entry that exists but cannot be read;
 * null means every level is either absent or readable, so Git's answer stands.
 */
function findUnreadableGitEntry(start: string): string | null {
  let current = path.resolve(start);
  for (;;) {
    const entry = path.join(current, ".git");
    let stat: ReturnType<typeof lstatSync> | null = null;
    try {
      stat = lstatSync(entry);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EACCES" || code === "EPERM") return entry;
      // ENOENT and friends: no entry at this level; keep walking.
    }
    if (stat) {
      try {
        accessSync(entry, stat.isDirectory() ? constants.R_OK | constants.X_OK : constants.R_OK);
        if (stat.isDirectory()) accessSync(path.join(entry, "HEAD"), constants.R_OK);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EACCES" || code === "EPERM") return entry;
      }
      return null;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
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
 * Kibi must not touch (bare repositories) and directories where Git refused
 * operationally (dubious ownership, unreadable `.git`, access failures) — the
 * last must never be mistaken for "no repository", because that would send
 * callers into standalone workspace writes.
 *
 * implements REQ-git-hook-effective-install
 */
export function resolveGitRepository(
  cwd: string = process.cwd(),
): GitRepositoryResolution {
  const versionProbe = runGitChecked(cwd, ["--version"]);
  if (versionProbe.output === null) return { status: "git-unavailable" };

  const toplevel = runGitChecked(cwd, ["rev-parse", "--show-toplevel"]);
  if (toplevel.output === null) {
    // A bare repository has no working tree (--show-toplevel fails) but is
    // still a repository; treat it as unsupported instead of "no repository"
    // so callers refuse to write workspace state into it.
    const gitDirProbe = runGitChecked(cwd, ["rev-parse", "--git-dir"]);
    if (gitDirProbe.output !== null) {
      return {
        status: "unsupported",
        reason: "Bare repository: no working tree to attach Kibi to.",
      };
    }
    if (classifyGitFailure(toplevel.failure) === "not-a-repository") {
      // Git's absence answer also fires for `.git` entries it cannot read;
      // surface that as a refusal instead of a standalone directory.
      const unreadable = findUnreadableGitEntry(cwd);
      if (unreadable !== null) {
        return {
          status: "git-refused",
          reason: `Git reported no repository, but ${unreadable} exists and cannot be read by this process (${
            toplevel.failure ?? "git produced no diagnostic output"
          }); refusing to guess.`,
        };
      }
      return { status: "not-a-repository" };
    }
    return {
      status: "git-refused",
      reason: `Git refused to inspect this directory: ${
        toplevel.failure ?? gitDirProbe.failure ?? "git produced no diagnostic output"
      }`,
    };
  }

  const version = parseGitVersion(versionProbe.output);
  const absolute =
    version !== null &&
    (version.major > PATH_FORMAT_MINIMUM.major ||
      (version.major === PATH_FORMAT_MINIMUM.major &&
        version.minor >= PATH_FORMAT_MINIMUM.minor));

  const formatArgs = absolute ? ["--path-format=absolute"] : [];
  const gitDirRaw = runGitChecked(cwd, ["rev-parse", ...formatArgs, "--git-dir"]);
  const commonGitDirRaw = runGitChecked(cwd, [
    "rev-parse",
    ...formatArgs,
    "--git-common-dir",
  ]);
  const hooksDirRaw = runGitChecked(cwd, [
    "rev-parse",
    ...formatArgs,
    "--git-path",
    "hooks",
  ]);
  if (
    gitDirRaw.output === null ||
    commonGitDirRaw.output === null ||
    hooksDirRaw.output === null
  ) {
    const detail =
      gitDirRaw.failure ??
      commonGitDirRaw.failure ??
      hooksDirRaw.failure ??
      "git produced no diagnostic output";
    return {
      status: "git-refused",
      reason: `Git refused to report its directory layout for this repository: ${detail}`,
    };
  }

  // Without --path-format the outputs above are relative to cwd (or absolute
  // for linked-worktree git dirs); normalize everything against cwd.
  const worktreeRoot = toplevel.output as string;
  const gitDir = resolveAgainstCwd(gitDirRaw.output as string, cwd);
  const commonGitDir = resolveAgainstCwd(commonGitDirRaw.output as string, cwd);
  const effectiveHooksDir = resolveAgainstCwd(hooksDirRaw.output as string, cwd);

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
