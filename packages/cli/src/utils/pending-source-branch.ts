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

import { resolveActiveBranch } from "./branch-resolver.js";

/**
 * The branch a pending-source receipt is written on, or undefined when the
 * workspace has no resolvable branch (outside Git, or a detached HEAD no
 * branch points at). Such a receipt names no branch and is checked on every
 * branch, as every receipt was before receipts recorded one.
 */
export function pendingReceiptBranch(
  workspaceRoot: string,
): string | undefined {
  const resolved = resolveActiveBranch(workspaceRoot);
  return "branch" in resolved ? resolved.branch : undefined;
}

/**
 * Decides, per receipt, whether it belongs to the active branch. Receipts
 * live in one workspace folder that a git checkout does not change. An
 * untracked file stays in the working tree across a checkout, so its receipt
 * binds it on every branch; but a file committed on the branch that wrote the
 * receipt is absent elsewhere, and there sync leaves the receipt alone
 * instead of failing. The active branch is resolved once, on the first
 * receipt that names a branch.
 */
export function pendingReceiptScope(
  workspaceRoot: string,
): (receipt: unknown) => boolean {
  let active: { branch: string | undefined } | undefined;
  return (receipt) => {
    const recorded = (receipt as { branch?: unknown } | null)?.branch;
    if (typeof recorded !== "string") return true;
    active ??= { branch: pendingReceiptBranch(workspaceRoot) };
    return active.branch === undefined || active.branch === recorded;
  };
}
