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

import type { OperationEffect } from "../public/operations/types.js";
import {
  type BranchAttachment,
  type BranchResolutionError,
  detachedHeadWriteRefusal,
  resolveBranchAttachment,
  resolveReadBranchAttachment,
} from "../utils/branch-resolver.js";

/** Envelope diagnostic code reported while a detached snapshot is attached. */
export const DETACHED_HEAD_READ_ONLY_CODE = "detached_head_read_only";

export type DetachedReadOnlyDiagnostic = {
  readonly code: typeof DETACHED_HEAD_READ_ONLY_CODE;
  readonly severity: "warning";
  readonly message: string;
  readonly detail: {
    readonly head: string;
    readonly branchesAtHead: readonly string[];
    readonly kbBranch: string;
    readonly storePath: string;
    readonly writes: "refused";
  };
};

/** True when an operation declares a KB or workspace write. */
export function declaresWriteEffect(
  effects: readonly OperationEffect[] | readonly string[],
): boolean {
  return effects.some(
    (effect) => effect === "kb-write" || effect === "workspace-write",
  );
}

/**
 * Compile (or incrementally refresh) the read-only snapshot of a detached
 * checkout. The snapshot store is a cache of the checkout's tracked sources:
 * refreshing it never touches a branch KB or an authored file.
 */
// implements REQ-branch-store-recovery-v3
export async function refreshDetachedSnapshot(
  workspaceRoot: string,
  attachment: BranchAttachment,
): Promise<void> {
  const { syncCommand } = await import("../commands/sync.js");
  try {
    await syncCommand({
      workspaceRoot,
      detachedSnapshot: attachment,
      quiet: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to compile the read-only snapshot for this detached HEAD: ${message}`,
    );
  }
}

/**
 * Resolve the branch attachment an operation may use.
 *
 * Writes keep the exact-branch contract and receive an actionable refusal on
 * a detached HEAD. Reads on a detached HEAD that no single branch points at
 * attach a freshly compiled read-only snapshot of the checkout.
 */
// implements REQ-branch-store-recovery-v3
export async function resolveOperationAttachment(
  workspaceRoot: string,
  spec: { readonly name: string; readonly effects: readonly OperationEffect[] },
): Promise<BranchAttachment | BranchResolutionError> {
  if (declaresWriteEffect(spec.effects)) {
    const attachment = resolveBranchAttachment(workspaceRoot);
    if ("error" in attachment && attachment.code === "DETACHED_HEAD") {
      return {
        error: detachedHeadWriteRefusal(spec.name, workspaceRoot),
        code: "DETACHED_HEAD",
      };
    }
    return attachment;
  }
  const attachment = resolveReadBranchAttachment(workspaceRoot);
  if (
    !("error" in attachment) &&
    attachment.readOnly !== undefined &&
    spec.effects.includes("kb-read")
  ) {
    await refreshDetachedSnapshot(workspaceRoot, attachment);
  }
  return attachment;
}

/** The envelope diagnostic for an operation answered from a snapshot. */
export function detachedReadOnlyDiagnostic(
  attachment: BranchAttachment | undefined,
): DetachedReadOnlyDiagnostic | undefined {
  const readOnly = attachment?.readOnly;
  if (attachment === undefined || readOnly === undefined) return undefined;
  return {
    code: DETACHED_HEAD_READ_ONLY_CODE,
    severity: "warning",
    message: readOnly.notice,
    detail: {
      head: readOnly.head,
      branchesAtHead: readOnly.branchesAtHead,
      kbBranch: attachment.kbBranch,
      storePath: attachment.storePath,
      writes: "refused",
    },
  };
}
