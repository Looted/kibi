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
 * Git never clones `.git/hooks`, so a fresh clone of a Kibi repository has
 * the knowledge base but no commit gate. Every host's session start checks
 * the checkout it opens and tells the agent, once, how to install the hooks.
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/** Config files of the hook managers `kibi init` leaves the hooks to. */
const HOOK_MANAGER_FILES = [
  "lefthook.yml",
  "lefthook.yaml",
  ".lefthook.yml",
  ".lefthook.yaml",
  "lefthook.json",
  ".husky",
  ".pre-commit-config.yaml",
];

function git(workspaceRoot: string, args: readonly string[]): string | null {
  const result = spawnSync("git", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    timeout: 2000,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

/** True when the repository's pre-commit hook runs Kibi's staged check. */
// implements REQ-kibi-fresh-clone-setup
export function hasKibiPreCommitGate(workspaceRoot: string): boolean {
  // A successful rev-parse always prints the path (honoring core.hooksPath).
  const resolved = git(workspaceRoot, [
    "rev-parse",
    "--git-path",
    "hooks/pre-commit",
  ]);
  const hookPath =
    resolved !== null
      ? path.resolve(workspaceRoot, resolved)
      : path.join(workspaceRoot, ".git", "hooks", "pre-commit");
  try {
    return /kibi[^\n]*\bcheck\b/i.test(String(fs.readFileSync(hookPath)));
  } catch {
    // No hook file.
  }
  return false;
}

/**
 * Whether this checkout is missing Kibi's hooks in a way `kibi hooks install`
 * fixes. A hook manager (lefthook, husky, pre-commit) or a configured
 * core.hooksPath owns the hooks instead; `kibi doctor` checks those, so they
 * get no note here. Outside a Git work tree there are no hooks to install.
 */
// implements REQ-kibi-fresh-clone-setup
export function kibiHooksMissing(workspaceRoot: string): boolean {
  if (!fs.existsSync(path.join(workspaceRoot, ".kb", "manifest.json")))
    return false;
  if (git(workspaceRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true")
    return false;
  if (git(workspaceRoot, ["config", "--get", "core.hooksPath"]) !== null)
    return false;
  if (
    HOOK_MANAGER_FILES.some((file) =>
      fs.existsSync(path.join(workspaceRoot, file)),
    )
  )
    return false;
  return !hasKibiPreCommitGate(workspaceRoot);
}

// implements REQ-kibi-fresh-clone-setup
export const MISSING_HOOKS_NOTE =
  "Kibi git hooks are not installed in this checkout (a clone never carries .git/hooks), so commits skip `kibi check --staged` and a branch switch does not recompile the KB. Install them with `npx --no-install kibi hooks install` (or the project's package-manager runner), or by installing the project's dependencies when its prepare script runs it.";

/** The session-start line for a checkout without Kibi's hooks, or null. */
// implements REQ-kibi-fresh-clone-setup
export function missingHooksNote(workspaceRoot: string): string | null {
  return kibiHooksMissing(workspaceRoot) ? MISSING_HOOKS_NOTE : null;
}
