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
 * The one answer to "what is this workspace's version control?". Callers do
 * not probe Git themselves: they attach a store through the branch resolver,
 * list authored sources through the source inventory, and guard a feature
 * that reads Git with the Git boundary (git-boundary.ts).
 */

import { existsSync } from "node:fs";
import type { NoGitReason } from "kibi-agent-core/version-control";
import {
  type GitRepositoryContext,
  resolveGitRepository,
} from "../utils/git-repository-context.js";

export type { NoGitReason } from "kibi-agent-core/version-control";

/** Why a workspace that has, or may have, a repository cannot be attached. */
export type VcsUnresolvedCode =
  /** A `.git` entry exists, and Git cannot run. */
  | "GIT_NOT_AVAILABLE"
  /** Git refused the repository: ownership, permissions, a timeout. */
  | "GIT_REPOSITORY_UNREADABLE"
  /** A bare repository, and anything else. */
  | "BRANCH_UNRESOLVED";

export type GitVcs = {
  readonly kind: "git";
  readonly repository: GitRepositoryContext;
};

export type WorkspaceVcs =
  | GitVcs
  | { readonly kind: "none"; readonly reason: NoGitReason }
  | {
      readonly kind: "unresolved";
      readonly code: VcsUnresolvedCode;
      readonly reason: string;
    };

const GIT_MISSING_WITH_MARKER = /^Git is unavailable, but a \.git entry/;

/**
 * Classify the workspace. Only Git's own absence answer (or a missing Git),
 * with no `.git` entry at or above the root, is "none": a repository Git
 * cannot read never becomes a workspace without Git. Not cached, so a
 * long-lived server notices a later `git init`.
 */
export function probeWorkspaceVcs(workspaceRoot: string): WorkspaceVcs {
  // Git cannot run in a directory that does not exist, which would read as
  // "Git is not installed": a mistyped workspace must not get a store.
  if (!existsSync(workspaceRoot)) {
    return {
      kind: "unresolved",
      code: "BRANCH_UNRESOLVED",
      reason: `The workspace directory ${workspaceRoot} does not exist.`,
    };
  }
  const resolution = resolveGitRepository(workspaceRoot);
  switch (resolution.status) {
    case "ok":
      return { kind: "git", repository: resolution.context };
    case "not-a-repository":
      return { kind: "none", reason: "not_a_repository" };
    case "git-unavailable":
      return { kind: "none", reason: "git_unavailable" };
    case "git-refused":
      return {
        kind: "unresolved",
        code: GIT_MISSING_WITH_MARKER.test(resolution.reason)
          ? "GIT_NOT_AVAILABLE"
          : "GIT_REPOSITORY_UNREADABLE",
        reason: resolution.reason,
      };
    default:
      return {
        kind: "unresolved",
        code: "BRANCH_UNRESOLVED",
        reason: resolution.reason,
      };
  }
}

/** A Kibi feature that reads Git and has nothing to work on without it. */
export type GitFeature =
  | "commit_gate"
  | "generated_check"
  | "check_diff"
  | "git_hooks"
  | "impact_review"
  | "change_signoff"
  | "branch_stores"
  | "branch_gc";

type GitFeatureRefusal = {
  /** What the feature reads from Git, completing "it ...". */
  readonly reads: string;
  /** What to run instead without Git, or null when nothing stands in. */
  readonly alternative: string | null;
};

const GIT_FEATURES: Readonly<Record<GitFeature, GitFeatureRefusal>> = {
  commit_gate: {
    reads: "checks the staged snapshot of a commit",
    alternative:
      "Run `kibi check` to check the knowledge base as it is on disk.",
  },
  generated_check: {
    reads: "compares generated manifests with the staged snapshot",
    alternative:
      "Run `kibi sync` to regenerate them and `kibi check` to check the knowledge base.",
  },
  check_diff: {
    reads: "compares the commits of a pull request",
    alternative: "Run `kibi check` to check the whole knowledge base.",
  },
  git_hooks: {
    reads: "installs hooks that Git runs on commit and checkout",
    alternative: "Finish each change with `kibi check` instead.",
  },
  impact_review: {
    reads: "reviews the staged snapshot or selected commits",
    alternative: "Run `kibi check` to check the knowledge base.",
  },
  change_signoff: {
    reads: "lists the requirements a Git change adds or affects",
    alternative:
      "Run `kibi signoff --questions` for the decisions waiting for the person.",
  },
  branch_stores: {
    reads: "keeps one knowledge store per Git branch",
    alternative:
      "Without Git there is one store; `kibi branch recover` rebuilds it.",
  },
  branch_gc: {
    reads: "removes the stores of branches Git no longer has",
    alternative: null,
  },
};

/** The refusal text of a Git-only feature in a workspace without Git. */
export function gitRequiredMessage(
  feature: GitFeature,
  operation: string,
): string {
  const { reads, alternative } = GIT_FEATURES[feature];
  return [
    `${operation} needs a Git repository: it ${reads}, and this directory has none.`,
    ...(alternative === null ? [] : [alternative]),
    "To turn it on, run `git init`, then `kibi init`.",
  ].join(" ");
}
