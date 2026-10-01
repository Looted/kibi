import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import { isGitObjectId } from "./impact-review.js";

/** Read Git tree rows and blobs from a captured snapshot. */
// implements REQ-impact-policy-stage-e-content-bound-review
export type TreeEntry = Readonly<{
  mode: string;
  type: string;
  objectId: string;
  path: string;
}>;

function decodePath(bytes: Buffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function parseTreeRows(bytes: Buffer): TreeEntry[] {
  const rows: TreeEntry[] = [];
  for (const raw of bytes.toString("binary").split("\0").filter(Boolean)) {
    const tab = raw.indexOf("\t");
    if (tab < 0) throw new Error("Malformed Git tree listing");
    const [mode, type, objectId] = raw.slice(0, tab).split(" ");
    const path = decodePath(Buffer.from(raw.slice(tab + 1), "binary"));
    if (!mode || !type || !objectId || !isGitObjectId(objectId))
      throw new Error("Malformed Git tree entry");
    if (
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").includes("..")
    )
      throw new Error("Git snapshot path is not normalized");
    rows.push({ mode, type, objectId, path });
  }
  return rows;
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function entriesForTree(
  snapshot: GitChangeSnapshot,
  tree: string,
): TreeEntry[] {
  return parseTreeRows(snapshot.readGit(["ls-tree", "-r", "-z", tree]));
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function treeEntry(
  snapshot: GitChangeSnapshot,
  tree: string,
  path: string,
): TreeEntry | undefined {
  const output = snapshot.readGit([
    "ls-tree",
    "-z",
    tree,
    "--",
    `:(literal)${path}`,
  ]);
  return parseTreeRows(output).find((entry) => entry.path === path);
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function blobBytes(
  snapshot: GitChangeSnapshot,
  entry: TreeEntry,
): Buffer | undefined {
  if (entry.type !== "blob") return undefined;
  const bytes = snapshot.readBlobs([entry.objectId]).get(entry.objectId);
  if (!bytes)
    throw new Error(`Snapshot did not return blob bytes for ${entry.path}`);
  return bytes;
}
