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

import { findRepositoryMarker } from "kibi-agent-core/version-control";
import { GitRequired } from "../cli-errors.js";
import { noteCliErrorCategory } from "../usage-telemetry.js";
import {
  type GitFeature,
  gitRequiredMessage,
  probeWorkspaceVcs,
} from "./workspace-vcs.js";

/**
 * The boundary of a text-mode CLI command that reads Git. Outside any Git
 * repository it prints the GIT_REQUIRED refusal (with the Git-free
 * alternative), notes the category for telemetry and returns exit code 1;
 * otherwise it returns null and the command runs as before. A repository Git
 * cannot read is left to the command, which reports its own cause.
 */
function outsideGit(workspaceRoot: string): boolean {
  // A `.git` entry settles it without spawning Git: a commit or checkout
  // hook pays nothing for this boundary.
  if (findRepositoryMarker(workspaceRoot) !== null) return false;
  return probeWorkspaceVcs(workspaceRoot).kind === "none";
}

/**
 * The boundary of an operation that reads Git: outside any Git repository it
 * throws GIT_REQUIRED (an OperationError, not retryable) naming the Git-free
 * alternative. A repository Git cannot read is left to the operation.
 */
export function assertGitWorkspace(
  workspaceRoot: string,
  feature: GitFeature,
  operation: string,
): void {
  if (outsideGit(workspaceRoot))
    throw new GitRequired(gitRequiredMessage(feature, operation));
}

export function refuseWithoutGit(
  workspaceRoot: string,
  feature: GitFeature,
  operation: string,
): { readonly exitCode: 1 } | null {
  if (!outsideGit(workspaceRoot)) return null;
  noteCliErrorCategory("GIT_REQUIRED");
  console.error(
    `Error [GIT_REQUIRED]: ${gitRequiredMessage(feature, operation)}`,
  );
  return { exitCode: 1 };
}
