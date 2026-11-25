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

import { detectHookManager } from "../../commands/hook-managers.js";
import {
  isRepositoryManagedHooksDir,
  managedHookTemplatesDigest,
  outdatedManagedHooks,
  refreshManagedHooks,
} from "../../commands/init-helpers.js";
import type { MigrationActionInput } from "../../public/operations/schema6-check-actions.js";
import { resolveGitRepository } from "../../utils/git-repository-context.js";

/** Automatic: kibi-managed hook sections differ from this CLI's template. */
export const MANAGED_HOOKS_REFRESH_CODE = "managed_hook_sections_outdated";
export const MANAGED_HOOKS_REFRESH_ACTION_ID = "git-hooks-refresh";

export type OutdatedManagedHooks = Readonly<{
  hooksDir: string;
  hooks: readonly string[];
  templateDigest: string;
}>;

/**
 * The kibi-managed hook sections of this checkout that differ from the
 * template this CLI installs, compared by content rather than by version, so
 * a development build that changed the template under an unchanged version
 * is still detected. Null when there is nothing Kibi may refresh: outside a
 * Git work tree, where a hook manager owns the hooks, where the hooks
 * directory resolves outside the repository, or when every section is
 * current. An unreadable hook counts as nothing to refresh; `kibi doctor`
 * reports it.
 */
export function findOutdatedManagedHooks(
  workspaceRoot: string,
): OutdatedManagedHooks | null {
  const resolution = resolveGitRepository(workspaceRoot);
  if (resolution.status !== "ok") return null;
  const context = resolution.context;
  if (
    detectHookManager(
      context.worktreeRoot,
      context.effectiveHooksDir,
      context.hooksPathConfig,
    ) !== null ||
    !isRepositoryManagedHooksDir(context)
  )
    return null;
  let hooks: string[];
  try {
    hooks = outdatedManagedHooks(context.effectiveHooksDir);
  } catch {
    return null;
  }
  if (hooks.length === 0) return null;
  return {
    hooksDir: context.effectiveHooksDir,
    hooks,
    templateDigest: managedHookTemplatesDigest(),
  };
}

/** The automatic plan action that refreshes outdated kibi-managed hooks. */
export function managedHooksRefreshAction(
  outdated: OutdatedManagedHooks,
): MigrationActionInput {
  return {
    id: MANAGED_HOOKS_REFRESH_ACTION_ID,
    code: MANAGED_HOOKS_REFRESH_CODE,
    category: "hooks",
    safety: "automatic",
    autoApplicable: true,
    invocation: { kind: "cli", command_argv: ["kibi", "hooks", "install"] },
    evidence: {
      hooks: outdated.hooks,
      templateDigest: outdated.templateDigest,
    },
  };
}

/**
 * Rewrites the outdated kibi-managed sections, keeping user-authored lines
 * around them. Returns the hooks it refreshed and the ones it had to leave
 * (a symlinked hook, for example).
 */
export function refreshOutdatedManagedHooks(outdated: OutdatedManagedHooks): {
  refreshed: string[];
  skipped: string[];
} {
  const results = refreshManagedHooks(outdated.hooksDir, outdated.hooks);
  return {
    refreshed: results
      .filter((entry) => entry.result === "updated")
      .map((entry) => entry.hook),
    skipped: results
      .filter((entry) => entry.result !== "updated")
      .map((entry) => entry.hook),
  };
}
