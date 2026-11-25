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

/**
 * Which files are authored input. In a Git repository that is what Git
 * tracks, plus files a pending-source receipt vouches for. Outside any
 * repository nothing but presence vouches for bytes, so every file on disk is
 * input and no receipt is written or compared. Git is asked first and the
 * workspace is classified only when Git fails, so a repository pays nothing
 * extra.
 */

import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import fg from "fast-glob";
import { probeWorkspaceVcs } from "./workspace-vcs.js";

const execFileAsync = promisify(execFile);

export type AuthoredSources =
  /** Git tracks `tracked` (posix, workspace-relative); receipts add the rest. */
  | { readonly kind: "git"; readonly tracked: ReadonlySet<string> }
  /** No repository: every file on disk is input, and receipts do not apply. */
  | { readonly kind: "disk" };

const LS_FILES_BUFFER = 64 * 1024 * 1024;

function lsFilesArgs(root: string, pathspec: readonly string[]): string[] {
  return ["-C", root, "ls-files", "--cached", "-z", "--", ...pathspec];
}

function trackedFrom(output: string): Set<string> {
  // Git lists paths with forward slashes on every platform, each ended by a
  // NUL, so the text after the last one names no file.
  return new Set(output.split("\0").slice(0, -1));
}

/** Git's failure stands unless the workspace has no repository at all. */
function withoutRepository(root: string, error: unknown): AuthoredSources {
  if (probeWorkspaceVcs(root).kind === "none") return { kind: "disk" };
  throw error;
}

/** The authored sources under `pathspec` (default: the whole workspace). */
export async function authoredSources(
  root: string,
  pathspec: readonly string[] = [],
): Promise<AuthoredSources> {
  try {
    const result = await execFileAsync("git", lsFilesArgs(root, pathspec), {
      maxBuffer: LS_FILES_BUFFER,
    });
    return { kind: "git", tracked: trackedFrom(result.stdout) };
  } catch (error) {
    return withoutRepository(root, error);
  }
}

/** {@link authoredSources}, synchronously. */
export function authoredSourcesSync(
  root: string,
  pathspec: readonly string[] = [],
): AuthoredSources {
  try {
    const output = execFileSync("git", lsFilesArgs(root, pathspec), {
      maxBuffer: LS_FILES_BUFFER,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { kind: "git", tracked: trackedFrom(output.toString("utf8")) };
  } catch (error) {
    return withoutRepository(root, error);
  }
}

/** Every file under `.kb/` on disk, as posix workspace-relative paths. */
export function kbFilesOnDisk(root: string): string[] {
  return fg.sync(".kb/**", { cwd: root, dot: true, onlyFiles: true }).sort();
}
