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

import {
  NO_GIT_UNAVAILABLE_FEATURES,
  type NoGitReason,
  noGitAdvisory,
} from "kibi-agent-core/version-control";
import {
  type BranchAttachment,
  NO_GIT_KB_BRANCH,
} from "../utils/branch-resolver.js";
import { takeNoGitAdoption } from "./no-git-adoption.js";

export const NO_GIT_REPOSITORY_CODE = "no_git_repository";
export const NO_GIT_STORE_ADOPTED_CODE = "no_git_store_adopted";

/**
 * Operations whose answer the missing repository changes, so they carry the
 * advisory every time: status says what the situation is, and check runs
 * without its commit-scoped rules.
 */
const ADVISED_OPERATIONS: ReadonlySet<string> = new Set([
  "kb_status",
  "kb_check",
]);

export type NoGitRepositoryDiagnostic = {
  readonly code: typeof NO_GIT_REPOSITORY_CODE;
  readonly severity: "warning";
  readonly message: string;
  readonly detail: {
    readonly versionControl: "none";
    readonly reason: NoGitReason;
    readonly kbBranch: string;
    readonly storePath: string;
    readonly unavailable: readonly string[];
    readonly alternative: "kibi check";
    readonly suggestion: "git init && kibi init";
  };
};

/** The advisory diagnostic for an attachment outside Git, else undefined. */
export function noGitRepositoryDiagnostic(
  attachment: BranchAttachment | undefined,
): NoGitRepositoryDiagnostic | undefined {
  const noGit = attachment?.noGit;
  if (noGit === undefined) return undefined;
  return {
    code: NO_GIT_REPOSITORY_CODE,
    severity: "warning",
    message: noGit.notice,
    detail: {
      versionControl: "none",
      reason: noGit.reason,
      kbBranch: (attachment as BranchAttachment).kbBranch,
      storePath: (attachment as BranchAttachment).storePath,
      unavailable: NO_GIT_UNAVAILABLE_FEATURES,
      alternative: "kibi check",
      suggestion: "git init && kibi init",
    },
  };
}

/**
 * The advisory for a result whose operation attached no store of its own
 * (status resolves the attachment itself and reports it as
 * `versionControl`), rebuilt from that detail; undefined for a Git workspace.
 */
export function noGitDiagnosticOfResult(
  data: unknown,
): NoGitRepositoryDiagnostic | undefined {
  const detail = (
    data as { versionControl?: NoGitRepositoryDiagnostic["detail"] } | null
  )?.versionControl;
  if (detail?.versionControl !== "none") return undefined;
  return {
    code: NO_GIT_REPOSITORY_CODE,
    severity: "warning",
    message: noGitAdvisory(
      detail.reason,
      detail.kbBranch === NO_GIT_KB_BRANCH ? undefined : detail.kbBranch,
    ),
    detail,
  };
}

/** Whether an operation's result always carries the no-Git advisory. */
export function alwaysAdvisesNoGit(operation: string): boolean {
  return ADVISED_OPERATIONS.has(operation);
}

export type NoGitStoreAdoptedDiagnostic = {
  readonly code: typeof NO_GIT_STORE_ADOPTED_CODE;
  readonly severity: "info";
  readonly message: string;
  readonly detail: {
    readonly branch: string;
    readonly files: number;
    readonly retiredStorePath: string;
    readonly next: "kibi init";
  };
};

/**
 * The adoption this process performed since the last result reported one,
 * as a diagnostic, once; undefined when there is none.
 */
export function noGitStoreAdoptedDiagnostic():
  | NoGitStoreAdoptedDiagnostic
  | undefined {
  const adoption = takeNoGitAdoption();
  if (adoption === null) return undefined;
  return {
    code: NO_GIT_STORE_ADOPTED_CODE,
    severity: "info",
    message: adoption.notice,
    detail: {
      branch: adoption.branch,
      files: adoption.files,
      retiredStorePath: adoption.retiredStorePath,
      next: "kibi init",
    },
  };
}
