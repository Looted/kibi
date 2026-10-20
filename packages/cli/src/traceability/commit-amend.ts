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
import { readFileSync } from "node:fs";
import { basename } from "node:path";

/** How far up the process tree to look for the `git commit` running a hook. */
const MAX_ANCESTORS = 8;

function processArguments(
  pid: number,
): { parent: number; argv: string[] } | null {
  try {
    if (process.platform === "linux") {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      const parent = Number(
        stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1],
      );
      const argv = readFileSync(`/proc/${pid}/cmdline`, "utf8")
        .split("\0")
        .filter(Boolean);
      return { parent, argv };
    }
    if (process.platform === "win32") return null;
    const [parent, ...argv] = execFileSync(
      "ps",
      ["-o", "ppid=,args=", "-p", String(pid)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2000 },
    )
      .trim()
      .split(/\s+/);
    return { parent: Number(parent), argv };
  } catch {
    return null;
  }
}

/**
 * Whether this process runs under `git commit --amend`. Git does not tell a
 * pre-commit hook that it is amending, so the hook's ancestors are read.
 */
function runsUnderCommitAmend(): boolean {
  let pid = process.ppid;
  for (let depth = 0; depth < MAX_ANCESTORS && pid > 1; depth += 1) {
    const info = processArguments(pid);
    if (info === null) return false;
    const [program, ...rest] = info.argv;
    if (program !== undefined && /^git(\.exe)?$/.test(basename(program)))
      return rest.includes("commit") && rest.includes("--amend");
    pid = info.parent;
  }
  return false;
}

/**
 * Whether the commit being made replaces a root commit (`git commit --amend`
 * on a branch with one commit). Such a commit has no parent either, so the
 * staged gate treats it as a first commit.
 */
// implements REQ-kibi-proposition-complete-ingestion
export function amendsRootCommit(
  workspaceRoot: string,
  headCommit: string | null,
): boolean {
  if (headCommit === null) return false;
  try {
    const parents = execFileSync(
      "git",
      ["rev-list", "--parents", "-n", "1", headCommit],
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .trim()
      .split(/\s+/);
    if (parents.length > 1) return false;
  } catch {
    return false;
  }
  return runsUnderCommitAmend();
}
