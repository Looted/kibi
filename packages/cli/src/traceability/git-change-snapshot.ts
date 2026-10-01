import { execFileSync, spawnSync } from "node:child_process";
import { isEntityLanePath, isSymbolsManifestPath } from "../utils/kb-paths.js";
import type {
  HunkRange,
  StagedAnalysisDepth,
  StagedDisposition,
  StagedPath,
  Status,
} from "./git-staged.js";

const GIT_EXEC_MAX_BUFFER = 64 * 1024 * 1024;

// implements REQ-source-analysis-v2
export type SnapshotGitReader = (args: readonly string[]) => Buffer;

// implements REQ-source-analysis-v2
export interface GitChangeSnapshot {
  /** Tree at the captured base commit, or the canonical empty tree when unborn. */
  baseTree: string;
  /** The single tree written from the captured index (staged snapshots). */
  headTree: string;
  /** Captured base commit, or null for an unborn repository. */
  headCommit: string | null;
  /** Run a Git command against immutable captured trees/blobs. */
  readGit(args: readonly string[]): Buffer;
  /** Read immutable object IDs in one process; no working-tree reads. */
  readBlobs(oids: readonly string[]): ReadonlyMap<string, Buffer>;
  /** Reject a changed HEAD or index tree after staged analysis. */
  assertUnchanged(): void;
  inventory: StagedPath[];
}

interface TreeEntry {
  mode: string;
  type: string;
  oid: string;
}

interface NameStatusEntry {
  status: Status;
  oldPath?: string;
  path: string;
}

type DecodedText =
  | { content: string }
  | { skipReason: "binary" | "unsupported_encoding" };

function runGit(root: string, args: readonly string[]): Buffer {
  try {
    return execFileSync("git", [...args], {
      cwd: root,
      encoding: "buffer",
      maxBuffer: GIT_EXEC_MAX_BUFFER,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`git command failed: git ${args.join(" ")} -> ${detail}`);
  }
}

function gitText(root: string, args: readonly string[]): string {
  return runGit(root, args).toString("utf8").trim();
}

function readBlobs(
  root: string,
  oids: readonly string[],
): ReadonlyMap<string, Buffer> {
  const unique = [...new Set(oids)];
  if (unique.some((oid) => !/^[a-f0-9]{40,64}$/.test(oid)))
    throw new Error("Invalid snapshot object ID");
  const result = new Map<string, Buffer>();
  if (unique.length === 0) return result;
  const output = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: `${unique.join("\n")}\n`,
    maxBuffer: GIT_EXEC_MAX_BUFFER,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let offset = 0;
  for (const oid of unique) {
    const newline = output.indexOf(10, offset);
    const header = output
      .subarray(offset, newline)
      .toString("ascii")
      .split(" ");
    const size = Number(header[2]);
    if (
      newline < 0 ||
      header[0] !== oid ||
      header[1] !== "blob" ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      newline + 1 + size >= output.length
    )
      throw new Error(`Invalid snapshot blob response: ${oid}`);
    const start = newline + 1;
    if (output[start + size] !== 10)
      throw new Error(`Invalid snapshot blob delimiter: ${oid}`);
    result.set(oid, output.subarray(start, start + size));
    offset = start + size + 1;
  }
  if (offset !== output.length)
    throw new Error("Unexpected trailing snapshot blob data");
  return result;
}

function resolveHeadCommit(root: string): string | null {
  try {
    return gitText(root, ["rev-parse", "--verify", "HEAD^{commit}"]);
  } catch (headError) {
    const ref = gitText(root, ["symbolic-ref", "-q", "HEAD"]);
    const presence = spawnSync(
      "git",
      ["show-ref", "--verify", "--quiet", ref],
      { cwd: root, stdio: "ignore" },
    );
    // Only a missing ref is unborn. A present ref pointing to a missing or
    // non-commit object is corruption, not an empty repository.
    if (presence.status === 1) return null;
    throw headError;
  }
}

function emptyTreeOid(root: string): string {
  return gitText(root, ["hash-object", "-t", "tree", "--stdin"]);
}

function treeForCommit(root: string, commit: string | null): string {
  return commit
    ? gitText(root, ["rev-parse", "--verify", `${commit}^{tree}`])
    : emptyTreeOid(root);
}

function parseNameStatus(input: Buffer): NameStatusEntry[] {
  const entries = input.toString("utf8").split("\0").filter(Boolean);
  const rows: NameStatusEntry[] = [];
  for (let index = 0; index < entries.length; ) {
    const token = entries[index] ?? "";
    const tab = token.indexOf("\t");
    const statusToken = tab >= 0 ? token.slice(0, tab) : token;
    const inlinePath = tab >= 0 ? token.slice(tab + 1) : undefined;
    const status = (statusToken[0] ?? "M") as Status;
    const renamed = status === "R" || status === "C";
    const firstPath = inlinePath ?? entries[index + 1] ?? "";
    const oldPath = renamed ? firstPath : undefined;
    const path = renamed ? (entries[index + 2] ?? "") : (firstPath ?? "");
    rows.push({ status, ...(oldPath !== undefined ? { oldPath } : {}), path });
    index += inlinePath !== undefined ? 1 : renamed ? 3 : 2;
  }
  return rows;
}

function literalPathspec(path: string): string {
  return `:(literal)${path}`;
}

function readTreeEntry(
  root: string,
  tree: string,
  path: string,
): TreeEntry | undefined {
  const output = runGit(root, [
    "ls-tree",
    "-r",
    "-z",
    tree,
    "--",
    literalPathspec(path),
  ]);
  const first = output.toString("utf8").split("\0")[0];
  if (!first) return undefined;
  const tab = first.indexOf("\t");
  if (tab < 0) return undefined;
  const [mode, type, oid] = first.slice(0, tab).split(" ");
  if (!mode || !type || !oid) return undefined;
  return { mode, type, oid };
}

function readBlob(
  root: string,
  entry: TreeEntry | undefined,
): Buffer | undefined {
  if (!entry || entry.type !== "blob") return undefined;
  return runGit(root, ["cat-file", "blob", entry.oid]);
}

function decodeText(buffer: Buffer): DecodedText {
  if (buffer.includes(0)) return { skipReason: "binary" };
  try {
    return {
      content: new TextDecoder("utf-8", { fatal: true }).decode(buffer),
    };
  } catch {
    return { skipReason: "unsupported_encoding" };
  }
}

function hasSupportedExt(path: string): boolean {
  return /\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(path);
}

function isMetadataPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const relationshipShard =
    normalized.startsWith(".kb/relationships/") &&
    (normalized.endsWith(".yaml") || normalized.endsWith(".yml"));
  return (
    (normalized.endsWith(".md") && isEntityLanePath(normalized)) ||
    relationshipShard ||
    normalized === ".kb/manifest.json" ||
    normalized === ".kb/symbols.yaml" ||
    normalized === ".kb/symbols.yml" ||
    normalized === ".kb/symbol-coordinates.yaml" ||
    isSymbolsManifestPath(normalized)
  );
}

function analysisFor(path: string, deleted: boolean): StagedAnalysisDepth {
  if (deleted) return "file";
  if (hasSupportedExt(path)) return "symbol";
  if (isMetadataPath(path)) return "metadata";
  return "file";
}

function parseHunkSides(diffText: string): {
  oldHunkRanges: HunkRange[];
  hunkRanges: HunkRange[];
} {
  const oldHunkRanges: HunkRange[] = [];
  const hunkRanges: HunkRange[] = [];
  const regex = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/gm;
  for (const match of diffText.matchAll(regex)) {
    const oldStart = Number.parseInt(match[1] ?? "0", 10);
    const oldCount = match[2] ? Number.parseInt(match[2], 10) : 1;
    const newStart = Number.parseInt(match[3] ?? "0", 10);
    const newCount = match[4] ? Number.parseInt(match[4], 10) : 1;
    if (oldCount > 0) {
      oldHunkRanges.push({ start: oldStart, end: oldStart + oldCount - 1 });
    }
    if (newCount > 0) {
      hunkRanges.push({ start: newStart, end: newStart + newCount - 1 });
    }
  }
  return { oldHunkRanges, hunkRanges };
}

function normalizeRanges(
  ranges: HunkRange[],
  content: string | undefined,
): void {
  const lineCount = Math.max(1, (content ?? "").split(/\r?\n/).length);
  for (const range of ranges) {
    if (range.end === Number.MAX_SAFE_INTEGER) range.end = lineCount;
  }
}

function diffForPath(
  root: string,
  baseTree: string,
  headTree: string,
  entry: NameStatusEntry,
): string {
  const paths = new Set(
    [entry.oldPath, entry.path].filter(
      (path): path is string => path !== undefined,
    ),
  );
  return runGit(root, [
    "diff",
    "--no-ext-diff",
    "--no-color",
    "-U0",
    "-M",
    "-C",
    "--find-copies-harder",
    baseTree,
    headTree,
    "--",
    ...[...paths].map(literalPathspec),
  ]).toString("utf8");
}

function skipReasonForMode(mode: string | undefined): StagedPath["skipReason"] {
  if (mode === "120000") return "symlink";
  if (mode === "160000") return "submodule";
  return undefined;
}

function buildInventory(
  root: string,
  baseTree: string,
  headTree: string,
): StagedPath[] {
  const rows = parseNameStatus(
    runGit(root, [
      "diff",
      "--name-status",
      "-z",
      "-M",
      "-C",
      "--find-copies-harder",
      "--diff-filter=ACMRTD",
      baseTree,
      headTree,
    ]),
  );

  return rows.map((row): StagedPath => {
    const previousPath = row.oldPath ?? row.path;
    const oldEntry = readTreeEntry(root, baseTree, previousPath);
    const newEntry = readTreeEntry(root, headTree, row.path);
    const oldBlob = readBlob(root, oldEntry);
    const newBlob = readBlob(root, newEntry);
    const oldDecoded = oldBlob ? decodeText(oldBlob) : undefined;
    const newDecoded = newBlob ? decodeText(newBlob) : undefined;
    const diffText = diffForPath(root, baseTree, headTree, row);
    const { oldHunkRanges, hunkRanges } = parseHunkSides(diffText);
    const oldContent =
      oldDecoded && "content" in oldDecoded ? oldDecoded.content : undefined;
    const newContent =
      newDecoded && "content" in newDecoded ? newDecoded.content : undefined;
    const oldIsPresent = oldEntry !== undefined;
    const newIsPresent = newEntry !== undefined;

    if (!oldIsPresent && newIsPresent && hunkRanges.length === 0) {
      hunkRanges.push({ start: 1, end: Number.MAX_SAFE_INTEGER });
    }
    if (oldIsPresent && !newIsPresent && oldHunkRanges.length === 0) {
      oldHunkRanges.push({ start: 1, end: Number.MAX_SAFE_INTEGER });
    }
    normalizeRanges(hunkRanges, newContent);
    normalizeRanges(oldHunkRanges, oldContent);

    const gitMode = newEntry?.mode ?? oldEntry?.mode;
    const previousMode = oldEntry?.mode;
    const modeSkip = skipReasonForMode(
      newEntry?.mode ?? (!newIsPresent ? oldEntry?.mode : undefined),
    );
    const decodeSkip =
      (newDecoded && "skipReason" in newDecoded
        ? newDecoded.skipReason
        : undefined) ??
      (oldDecoded && "skipReason" in oldDecoded
        ? oldDecoded.skipReason
        : undefined);
    const skipReason = modeSkip ?? decodeSkip;
    const pathFields = {
      ...(row.status === "R" && row.oldPath !== undefined
        ? { oldPath: row.oldPath }
        : {}),
      ...(row.status === "C" && row.oldPath !== undefined
        ? { copyFromPath: row.oldPath }
        : {}),
    };
    if (skipReason) {
      return {
        path: row.path,
        status: row.status,
        ...pathFields,
        hunkRanges,
        oldHunkRanges,
        diffText,
        ...(gitMode !== undefined ? { gitMode } : {}),
        ...(previousMode !== undefined ? { previousMode } : {}),
        ...(oldContent !== undefined ? { previousContent: oldContent } : {}),
        analysisDepth: "none",
        disposition: "skipped",
        skipReason,
      };
    }

    const deleted = !newIsPresent;
    const analysisDepth = analysisFor(row.path, deleted);
    const disposition: StagedDisposition =
      analysisDepth === "file" ? "advisory" : "checked";
    return {
      path: row.path,
      status: row.status,
      ...pathFields,
      hunkRanges,
      oldHunkRanges,
      diffText,
      ...(newContent !== undefined ? { content: newContent } : {}),
      ...(oldContent !== undefined ? { previousContent: oldContent } : {}),
      ...(gitMode !== undefined ? { gitMode } : {}),
      ...(previousMode !== undefined ? { previousMode } : {}),
      analysisDepth,
      disposition,
    };
  });
}

function translateReadGit(
  root: string,
  args: readonly string[],
  baseTree: string,
  headTree: string,
  baseCommit: string | null,
): Buffer {
  if (args[0] === "diff" && args.includes("--cached")) {
    const translated = args.filter((arg) => arg !== "--cached");
    const filterIndex = translated.findIndex((arg) =>
      arg.startsWith("--diff-filter="),
    );
    if (filterIndex >= 0) translated[filterIndex] = "--diff-filter=ACMRTD";
    const separator = translated.indexOf("--");
    const insertion = separator < 0 ? translated.length : separator;
    translated.splice(insertion, 0, baseTree, headTree);
    return runGit(root, translated);
  }

  if (args[0] === "ls-files" && args.includes("--stage")) {
    const separator = args.indexOf("--");
    const pathArgs = separator >= 0 ? args.slice(separator + 1) : [];
    const output = runGit(root, [
      "ls-tree",
      "-r",
      "-z",
      headTree,
      ...(pathArgs.length ? ["--", ...pathArgs] : []),
    ]);
    const rows = output
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((row) => {
        const tab = row.indexOf("\t");
        if (tab < 0) return row;
        const [mode, _type, oid] = row.slice(0, tab).split(" ");
        return `${mode ?? ""} ${oid ?? ""} 0${row.slice(tab)}`;
      });
    return Buffer.from(rows.length ? `${rows.join("\0")}\0` : "");
  }

  if (args[0] === "ls-tree" && args.includes("HEAD")) {
    return runGit(
      root,
      args.map((arg) => (arg === "HEAD" ? baseTree : arg)),
    );
  }

  if (args[0] === "rev-parse" && args.some((arg) => arg.startsWith("HEAD"))) {
    const revision = args.find((arg) => arg.startsWith("HEAD")) ?? "HEAD";
    if (revision === "HEAD^{tree}") return Buffer.from(`${baseTree}\n`);
    if (revision === "HEAD" || revision === "HEAD^{commit}") {
      if (!baseCommit) {
        throw new Error("HEAD does not resolve to a commit in this snapshot");
      }
      return Buffer.from(`${baseCommit}\n`);
    }
  }

  if (args[0] === "show") {
    const spec = args[1] ?? "";
    if (spec.startsWith(":")) {
      return runGit(root, ["show", `${headTree}:${spec.slice(1)}`]);
    }
    if (spec.startsWith("HEAD:")) {
      return runGit(root, [
        "show",
        `${baseTree}:${spec.slice("HEAD:".length)}`,
      ]);
    }
  }

  return runGit(root, args);
}

function snapshotFromTrees(
  root: string,
  baseTree: string,
  headTree: string,
  headCommit: string | null,
  readGit: (args: readonly string[]) => Buffer,
  assertUnchanged: () => void,
): GitChangeSnapshot {
  return {
    baseTree,
    headTree,
    headCommit,
    readGit,
    readBlobs: (oids) => readBlobs(root, oids),
    assertUnchanged,
    inventory: buildInventory(root, baseTree, headTree),
  };
}

/** Capture one immutable tree from the index and inventory only Git objects. */
// implements REQ-014
export function captureStagedSnapshot(
  workspaceRoot: string,
): GitChangeSnapshot {
  const headCommit = resolveHeadCommit(workspaceRoot);
  const baseTree = treeForCommit(workspaceRoot, headCommit);
  const headTree = gitText(workspaceRoot, ["write-tree"]);
  const readGit = (args: readonly string[]) =>
    translateReadGit(workspaceRoot, args, baseTree, headTree, headCommit);
  const assertUnchanged = () => {
    const currentHead = resolveHeadCommit(workspaceRoot);
    const currentIndexTree = gitText(workspaceRoot, ["write-tree"]);
    if (currentHead !== headCommit || currentIndexTree !== headTree) {
      throw new Error(
        "Git index or HEAD changed during staged analysis; retry the operation",
      );
    }
  };
  return snapshotFromTrees(
    workspaceRoot,
    baseTree,
    headTree,
    headCommit,
    readGit,
    assertUnchanged,
  );
}

/**
 * Capture changes between explicit revisions. The caller chooses `base`; for
 * merge-impact analysis this is commonly the merge base computed with
 * `git merge-base target head`. This helper resolves each input once and does
 * not silently choose a merge base of its own.
 */
// implements REQ-014
export function captureDiffSnapshot(
  workspaceRoot: string,
  base: string,
  head: string,
): GitChangeSnapshot {
  const baseCommit = gitText(workspaceRoot, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${base}^{commit}`,
  ]);
  const headCommit = gitText(workspaceRoot, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${head}^{commit}`,
  ]);
  const baseTree = treeForCommit(workspaceRoot, baseCommit);
  const headTree = treeForCommit(workspaceRoot, headCommit);
  const readGit = (args: readonly string[]) =>
    translateReadGit(workspaceRoot, args, baseTree, headTree, baseCommit);
  return snapshotFromTrees(
    workspaceRoot,
    baseTree,
    headTree,
    baseCommit,
    readGit,
    () => undefined,
  );
}
