import { snapshotFileContent } from "../public/operations/proof-receipt-projection.js";
import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import { fingerprint, fingerprintBytes } from "./impact-review.js";
import { IMPACT_POLICY_PATH } from "./impact-review.js";
import type { TrustedPullRequestSnapshot } from "./trusted-pr-event.js";

type TreeRow = Readonly<{
  mode: string;
  type: string;
  objectId: string;
  path: string;
}>;

function treeRows(snapshot: GitChangeSnapshot, tree: string): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const raw of snapshot
    .readGit(["ls-tree", "-r", "-z", tree])
    .toString("binary")
    .split("\0")
    .filter(Boolean)) {
    const tab = raw.indexOf("\t");
    if (tab < 0) throw new Error("Malformed Git tree listing");
    const [mode, type, objectId] = raw.slice(0, tab).split(" ");
    const path = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.from(raw.slice(tab + 1), "binary"),
    );
    if (!mode || !type || !objectId)
      throw new Error("Malformed Git tree entry");
    rows.push({ mode, type, objectId, path });
  }
  return rows;
}

function stateFingerprint(
  snapshot: GitChangeSnapshot,
  tree: string,
  include: (path: string) => boolean,
): string {
  const rows = treeRows(snapshot, tree)
    .filter((row) => include(row.path))
    .map((row) => {
      const bytes =
        row.type === "blob"
          ? snapshot.readBlobs([row.objectId]).get(row.objectId)
          : undefined;
      const receiptProjectedMarkdown =
        row.path.startsWith(".kb/") && row.path.endsWith(".md");
      const projectedBytes =
        bytes && receiptProjectedMarkdown
          ? snapshotFileContent(row.path, bytes)
          : bytes;
      return {
        path: row.path,
        mode: row.mode,
        type: row.type,
        ...(!receiptProjectedMarkdown ? { objectId: row.objectId } : {}),
        bytes:
          projectedBytes !== undefined
            ? fingerprintBytes(projectedBytes)
            : null,
      };
    });
  return fingerprint(rows);
}

function pathState(
  snapshot: GitChangeSnapshot,
  tree: string,
  path: string,
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
  const touched = new Set<string>();
  for (const file of snapshot.inventory) {
    touched.add(file.path);
    if (file.oldPath) touched.add(file.oldPath);
    if (file.copyFromPath) touched.add(file.copyFromPath);
  }
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
