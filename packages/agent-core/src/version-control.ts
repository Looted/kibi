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
 * What every Kibi surface (CLI, MCP server, host hooks) says about a
 * workspace that is not inside a Git repository, and the one rule for
 * finding a repository marker. Kibi works there on one knowledge store; the
 * texts below say what is off and how to turn it on, so an agent can act on
 * them with nobody present.
 */

import { lstatSync } from "node:fs";
import * as path from "node:path";

/** Why a workspace has no Git repository. */
export type NoGitReason = "not_a_repository" | "git_unavailable";

/**
 * Directories Git itself never searches past (GIT_CEILING_DIRECTORIES, a
 * path-delimited list). Empty entries are ignored, as Git does.
 */
function ceilingDirectories(env: NodeJS.ProcessEnv): Set<string> {
  return new Set(
    (env.GIT_CEILING_DIRECTORIES ?? "")
      .split(path.delimiter)
      .filter((entry) => entry.length > 0)
      .map((entry) => path.resolve(entry)),
  );
}

/**
 * The nearest `.git` entry (file, directory or symlink) at or above `start`,
 * or null. The walk stops below a ceiling directory, as Git's own discovery
 * does, so a workspace Git treats as outside any repository is not reported
 * as holding one. An entry that cannot even be inspected (EACCES, ELOOP)
 * counts as present: callers must then refuse instead of guessing.
 */
export function findRepositoryMarker(
  start: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const ceilings = ceilingDirectories(env);
  let current = path.resolve(start);
  for (;;) {
    const entry = path.join(current, ".git");
    try {
      lstatSync(entry);
      return entry;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") return entry;
    }
    const parent = path.dirname(current);
    if (parent === current || ceilings.has(parent)) return null;
    current = parent;
  }
}

/** The Git features that are off in a workspace without a repository. */
export const NO_GIT_UNAVAILABLE_FEATURES = [
  "commit_gate",
  "git_hooks",
  "impact_review",
  "check_diff",
  "branch_stores",
  "merge_driver",
  "branch_gc",
] as const;

/**
 * The advisory for a workspace without Git. `kibiBranch` is the KIBI_BRANCH
 * value when one names the store.
 */
export function noGitAdvisory(
  reason: NoGitReason,
  kibiBranch?: string,
): string {
  const opening =
    reason === "git_unavailable"
      ? "Git is not installed (or not on PATH) and this directory has no repository: Kibi is working without version control."
      : "No Git repository: Kibi is working without version control in this directory.";
  const recommendation =
    reason === "git_unavailable"
      ? "Recommended: install Git, run `git init`, then `kibi init`; the knowledge recorded here carries over."
      : "Recommended: run `git init`, then `kibi init`; the knowledge recorded here carries over.";
  const sentences = [
    opening,
    "Search, query, record, upsert, check and sync work on one knowledge store.",
    "Off until there is a repository: the commit gate (`kibi check --staged`), Git hooks, impact review and per-branch knowledge.",
    recommendation,
    "Until then, finish a change with `kibi check`.",
  ];
  if (kibiBranch !== undefined)
    sentences.push(
      `KIBI_BRANCH=${kibiBranch} selects this store only in processes that set it; unset it to use this directory's own store.`,
    );
  return sentences.join(" ");
}

/** The notice of a first Kibi call after `git init` adopted the knowledge. */
export function noGitAdoptionNotice(branch: string, files: number): string {
  return `Git repository found: the knowledge recorded without Git now belongs to branch '${branch}' (${files} ${files === 1 ? "file" : "files"}). Run \`kibi init\` to install the Git hooks and refresh the agent instructions, then commit .kb/.`;
}
