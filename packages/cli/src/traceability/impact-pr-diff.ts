import { snapshotFileContent } from "../public/operations/proof-receipt-projection.js";
import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import { blobBytes, entriesForTree } from "./impact-git-tree.js";
import { fingerprint, fingerprintBytes } from "./impact-review.js";
import { IMPACT_POLICY_PATH } from "./impact-review.js";
import type { TrustedPullRequestSnapshot } from "./trusted-pr-event.js";

function stateFingerprint(
  snapshot: GitChangeSnapshot,
  tree: string,
  include: (path: string) => boolean,
): string {
  const rows = entriesForTree(snapshot, tree)
    .filter((row) => include(row.path))
    .map((row) => {
      // A blob compares by its bytes, with proof receipts stripped from .kb/
      // Markdown; blobBytes is undefined for a gitlink, which compares by its
      // object id.
      const bytes = blobBytes(snapshot, row);
      return {
        path: row.path,
        mode: row.mode,
        type: row.type,
        state:
          bytes === undefined
            ? row.objectId
            : fingerprintBytes(
                row.path.startsWith(".kb/")
                  ? snapshotFileContent(row.path, bytes)
                  : bytes,
              ),
      };
    });
  return fingerprint(rows);
}

function pathState(
  snapshot: GitChangeSnapshot,
  tree: string,
  path: string | undefined,
): string {
  return stateFingerprint(snapshot, tree, (candidate) => candidate === path);
}

/** Require a merge-base snapshot that still reflects the protected target state. */
export function assertTrustedPullRequestBaseline(
  snapshot: GitChangeSnapshot,
  event: TrustedPullRequestSnapshot,
): void {
  if (
    snapshot.baseTree !== event.mergeBaseTree ||
    snapshot.headTree !== event.headTree
  )
    throw new Error("Diff snapshot does not match the verified PR event trees");
  const stableTargetState = (path: string) =>
    path === ".kb" ||
    path.startsWith(".kb/") ||
    path === ".kibi" ||
    path.startsWith(".kibi/") ||
    [
      "package.json",
      "bun.lock",
      "bun.lockb",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
    ].includes(path);
  if (
    stateFingerprint(snapshot, event.targetTree, stableTargetState) !==
    stateFingerprint(snapshot, event.mergeBaseTree, stableTargetState)
  )
    throw new Error(
      "Protected target knowledge, policy or provider configuration advanced; rebase and refresh the impact review",
    );
  if (snapshot.inventory.some((file) => file.path === IMPACT_POLICY_PATH))
    throw new Error(
      "Impact policy changes must be merged to the protected target separately before reviewed changes",
    );
  // An absent old path or copy source matches no tree row, so it compares
  // equal on both sides.
  const touched = new Set(
    snapshot.inventory.flatMap((file) => [
      file.path,
      file.oldPath,
      file.copyFromPath,
    ]),
  );
  for (const path of touched) {
    if (
      pathState(snapshot, event.targetTree, path) !==
      pathState(snapshot, event.mergeBaseTree, path)
    )
      throw new Error(
        `Protected target changed a reviewed path (${path}); rebase and refresh the impact review`,
      );
  }
}
