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

/** The process and command access the amend check needs; tests replace it. */
// implements REQ-kibi-proposition-complete-ingestion
export type AmendProbe = Readonly<{
  platform: NodeJS.Platform;
  parentPid: number;
  readFile: (filePath: string) => string;
  /** Run a command and return its stdout; throws when it fails. */
  run: (
    command: string,
    args: readonly string[],
    options: { cwd?: string; timeout?: number },
  ) => string;
}>;

/** The real process table and commands. */
// implements REQ-kibi-proposition-complete-ingestion
export const SYSTEM_AMEND_PROBE: AmendProbe = {
  platform: process.platform,
  parentPid: process.ppid,
  readFile: (filePath) => readFileSync(filePath, "utf8"),
  run: (command, args, options) =>
    execFileSync(command, [...args], {
      ...options,
      encoding: "utf8",
      // rationale: stdin and stderr are never read, so whether they are
      // ignored or piped cannot be observed.
      // Stryker disable next-line ArrayDeclaration,StringLiteral
      stdio: ["ignore", "pipe", "ignore"],
    }),
};

function processArguments(
  probe: AmendProbe,
  pid: number,
): { parent: number; argv: string[] } | null {
  try {
    if (probe.platform === "linux") {
      const stat = probe.readFile(`/proc/${pid}/stat`);
      const parent = Number(
        stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1],
      );
      // The trailing NUL leaves an empty last argument, which is neither git,
      // commit nor --amend.
      const argv = probe.readFile(`/proc/${pid}/cmdline`).split("\0");
      return { parent, argv };
    }
    if (probe.platform === "win32") return null;
    const [parent, ...argv] = probe
      .run("ps", ["-o", "ppid=,args=", "-p", String(pid)], { timeout: 2000 })
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
function runsUnderCommitAmend(probe: AmendProbe): boolean {
  let pid = probe.parentPid;
  for (let depth = 0; depth < MAX_ANCESTORS && pid > 1; depth += 1) {
    const info = processArguments(probe, pid);
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
  probe: AmendProbe = SYSTEM_AMEND_PROBE,
): boolean {
  if (headCommit === null) return false;
  try {
    // "<commit> <parent>..." names a parent after the first separator.
    const line = probe
      .run("git", ["rev-list", "--parents", "-n", "1", headCommit], {
        cwd: workspaceRoot,
      })
      .trim();
    if (/\s/.test(line)) return false;
  } catch {
    return false;
  }
  return runsUnderCommitAmend(probe);
}
