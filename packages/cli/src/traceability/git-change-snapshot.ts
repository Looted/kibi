import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  isEntityLanePath,
  isKbKnowledgePath,
  isSymbolsManifestPath,
} from "../utils/kb-paths.js";
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
  /**
   * Staged merge commits only: paths whose staged content is taken unchanged
   * from a merged parent. They are part of `baseTree`, so the inventory
   * holds only what the merge itself wrote (its conflict resolutions and
   * edits that differ from every parent).
   */
  mergeInherited?: readonly string[];
  /**
   * Staged snapshots only: knowledge files the commit moves into the
   * canonical `.kb/` layout (for example after `kibi migrate`). `baseTree`
   * holds each source's committed content at its target path, so the
   * inventory shows only what the commit changed inside those files.
   */
  renameResolved?: ReadonlyArray<{ from: string; to: string }>;
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
      maxBuffer: GIT_EXEC_MAX_BUFFER,
      // rationale: only keeps git's stdin closed and its stderr off the
      // terminal; the captured stdout is the same either way.
      // Stryker disable next-line ArrayDeclaration
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    throw new Error(
      `git command failed: git ${args.join(" ")} -> ${(error as Error).message}`,
    );
  }
}

function gitText(root: string, args: readonly string[]): string {
  return runGit(root, args).toString("utf8").trim();
}

function readBlobs(
  root: string,
  oids: readonly string[],
): ReadonlyMap<string, Buffer> {
  if (oids.some((oid) => !/^[a-f0-9]{40,64}$/.test(oid)))
    throw new Error("Invalid snapshot object ID");
  const result = new Map<string, Buffer>();
  if (oids.length === 0) return result;
  const output = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: `${oids.join("\n")}\n`,
    maxBuffer: GIT_EXEC_MAX_BUFFER,
    // rationale: only keeps git's stderr off the terminal; the batch output
    // on stdout is the same either way.
    // Stryker disable next-line ArrayDeclaration
    stdio: ["pipe", "pipe", "pipe"],
  });
  let offset = 0;
  for (const oid of oids) {
    const newline = output.indexOf(10, offset);
    const header = output
      .subarray(offset, newline)
      .toString("ascii")
      .split(" ");
    const size = Number(header[2]);
    if (
      newline === -1 ||
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
      { cwd: root },
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

/** Parses `git diff --name-status -z` output: a status, then one or two paths. */
function parseNameStatus(input: Buffer): NameStatusEntry[] {
  const entries = input.toString("utf8").split("\0").filter(Boolean);
  const rows: NameStatusEntry[] = [];
  for (let index = 0; index < entries.length; index += 2) {
    const status = (entries[index] as string)[0] as Status;
    const path = entries[index + 1] as string;
    if (status === "R" || status === "C") {
      index += 1;
      rows.push({ status, oldPath: path, path: entries[index + 1] as string });
    } else {
      rows.push({ status, path });
    }
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
  const first = output.toString("utf8");
  if (!first) return undefined;
  const [mode, type, oid] = first.slice(0, first.indexOf("\t")).split(" ") as [
    string,
    string,
    string,
  ];
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
    normalized === ".kb/symbols.yml" ||
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
  const regex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm;
  for (const match of diffText.matchAll(regex)) {
    const oldStart = Number(match[1]);
    const oldCount = Number(match[2] ?? 1);
    const newStart = Number(match[3]);
    const newCount = Number(match[4] ?? 1);
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
  // Content that cannot be decoded counts as a single line.
  const lineCount = content?.split(/\r?\n/).length ?? 1;
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
  const paths =
    entry.oldPath === undefined ? [entry.path] : [entry.oldPath, entry.path];
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
    ...paths.map(literalPathspec),
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

    // Every listed row has an entry on at least one side.
    const gitMode = (newEntry ?? (oldEntry as TreeEntry)).mode;
    const previousMode = oldEntry?.mode;
    const modeSkip = skipReasonForMode(gitMode);
    const decodeSkip =
      (newDecoded && "skipReason" in newDecoded
        ? newDecoded.skipReason
        : undefined) ??
      (oldDecoded && "skipReason" in oldDecoded
        ? oldDecoded.skipReason
        : undefined);
    const skipReason = modeSkip ?? decodeSkip;
    const pathFields =
      row.oldPath === undefined
        ? {}
        : row.status === "R"
          ? { oldPath: row.oldPath }
          : { copyFromPath: row.oldPath };
    if (skipReason) {
      return {
        path: row.path,
        status: row.status,
        ...pathFields,
        hunkRanges,
        oldHunkRanges,
        diffText,
        gitMode,
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
      gitMode,
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
    const translated = args
      .filter((arg) => arg !== "--cached")
      .map((arg) =>
        arg.startsWith("--diff-filter=") ? "--diff-filter=ACMRTD" : arg,
      );
    // Git reads options after the revisions, so the trees follow `diff`.
    translated.splice(1, 0, baseTree, headTree);
    return runGit(root, translated);
  }

  if (args[0] === "ls-files" && args.includes("--stage")) {
    const pathArgs = args.includes("--")
      ? args.slice(args.indexOf("--") + 1)
      : [];
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
        const [mode, , oid] = row.slice(0, tab).split(" ");
        return `${mode} ${oid} 0${row.slice(tab)}`;
      });
    return Buffer.from(rows.length ? `${rows.join("\0")}\0` : "");
  }

  if (args[0] === "ls-tree" && args.includes("HEAD")) {
    return runGit(
      root,
      args.map((arg) => (arg === "HEAD" ? baseTree : arg)),
    );
  }

  if (args[0] === "rev-parse") {
    const revision = args.find((arg) => arg.startsWith("HEAD"));
    if (revision === "HEAD^{tree}") return Buffer.from(`${baseTree}\n`);
    if (revision === "HEAD" || revision === "HEAD^{commit}") {
      if (!baseCommit) {
        throw new Error("HEAD does not resolve to a commit in this snapshot");
      }
      return Buffer.from(`${baseCommit}\n`);
    }
  }

  if (args[0] === "show") {
    const spec = String(args[1]);
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

/** The commits named by MERGE_HEAD while a merge commit is being made. */
function pendingMergeParents(root: string): string[] {
  const mergeHeadPath = gitText(root, [
    "rev-parse",
    "--git-path",
    "MERGE_HEAD",
  ]);
  let text: string;
  try {
    text = readFileSync(path.resolve(root, mergeHeadPath), "utf8");
  } catch {
    return [];
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[a-f0-9]{40,64}$/.test(line));
}

/**
 * The paths that differ between two trees. The empty entry after the last
 * terminator is in every set, so it never counts as an inherited path.
 */
function changedPaths(root: string, from: string, to: string): Set<string> {
  return new Set(
    runGit(root, ["diff", "--name-only", "-z", "--no-renames", from, to])
      .toString("utf8")
      .split("\0"),
  );
}

/**
 * For a staged merge commit, the tree the merge is judged against: HEAD
 * with every path the merge takes unchanged from a merged parent replaced
 * by that staged content. Diffing it against the staged tree leaves only
 * what the merge itself wrote, so debt inherited from the merged branch is
 * not charged to the merge. Null when no merge is in progress or nothing
 * is inherited.
 */
// implements REQ-014
export function mergeResolutionBase(
  root: string,
  baseTree: string,
  headTree: string,
  parents: readonly string[],
): { baseTree: string; inherited: string[] } | null {
  const changed = changedPaths(root, baseTree, headTree);
  const inherited = new Set<string>();
  for (const parent of parents) {
    const parentTree = treeForCommit(root, parent);
    const differs = changedPaths(root, parentTree, headTree);
    for (const file of changed) {
      if (!differs.has(file)) inherited.add(file);
    }
  }
  if (inherited.size === 0) return null;
  const paths = [...inherited].sort();
  const listed = runGit(root, [
    "ls-tree",
    "-r",
    "-z",
    "--full-tree",
    headTree,
    "--",
    ...paths.map(literalPathspec),
  ])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const present = new Set<string>();
  const entries: string[] = [];
  for (const row of listed) {
    const tab = row.indexOf("\t");
    const [mode, , oid] = row.slice(0, tab).split(" ");
    const file = row.slice(tab + 1);
    present.add(file);
    entries.push(`${mode} ${oid}\t${file}`);
  }
  const zero = "0".repeat(baseTree.length);
  for (const file of paths) {
    // Deleted on the merged side and absent from the staged tree.
    if (!present.has(file)) entries.push(`0 ${zero}\t${file}`);
  }
  return {
    baseTree: writeTreeWithEntries(root, baseTree, entries, "kibi-merge-base-"),
    inherited: paths,
  };
}

/** Write `baseTree` with `--index-info` entries applied in a scratch index. */
function writeTreeWithEntries(
  root: string,
  baseTree: string,
  entries: readonly string[],
  prefix: string,
): string {
  const scratch = mkdtempSync(path.join(tmpdir(), prefix));
  const env = { ...process.env, GIT_INDEX_FILE: path.join(scratch, "index") };
  try {
    const git = (args: readonly string[], input?: string) =>
      execFileSync("git", [...args], {
        cwd: root,
        env,
        maxBuffer: GIT_EXEC_MAX_BUFFER,
        input,
        // rationale: only keeps git's stderr off the terminal.
        // Stryker disable next-line ArrayDeclaration
        stdio: ["pipe", "pipe", "ignore"],
      });
    git(["read-tree", baseTree]);
    git(["update-index", "-z", "--index-info"], `${entries.join("\0")}\0`);
    return git(["write-tree"]).toString("utf8").trim();
  } finally {
    rmSync(scratch, { recursive: true });
  }
}

function renamedPaths(
  root: string,
  from: string,
  to: string,
): Array<{ from: string; to: string }> {
  return parseNameStatus(
    runGit(root, [
      "diff",
      "--name-status",
      "-z",
      "-M",
      "--diff-filter=R",
      from,
      to,
    ]),
  ).map((row) => ({ from: row.oldPath as string, to: row.path }));
}

/**
 * True when `from -> to` moves one knowledge file from outside the canonical
 * layout into the same kind of canonical `.kb/` location: an entity lane
 * file into the same lane, or a symbols manifest / coordinates file onto the
 * canonical file of the same name (`.yml` and `.yaml` alike).
 */
function isKnowledgeRelocation(from: string, to: string): boolean {
  if (isKbKnowledgePath(from) || !isKbKnowledgePath(to)) return false;
  if (isSymbolsManifestPath(to)) {
    const stem = (file: string) =>
      path.posix.basename(file).replace(/\.ya?ml$/, "");
    return stem(from) === stem(to);
  }
  // The target is an entity lane path, `.kb/<lane>/...`.
  const lane = to.split("/")[1] as string;
  return `/${from}`.includes(`/${lane}/`);
}

/**
 * Relocations into `.kb/` that Git's similarity detection missed: a deleted
 * knowledge file and an added canonical file with the same file name, paired
 * only when the pairing is unambiguous. A small file that a migration both
 * moves and rewrites (a symbols manifest that gains a header and
 * legacy-link marks, a requirement that gains origin and tags) can fall
 * under Git's similarity threshold although it is the same file.
 */
// implements REQ-cli-migration-first-commit
function unpairedKnowledgeRelocations(
  root: string,
  baseTree: string,
  headTree: string,
  detected: ReadonlyArray<{ from: string; to: string }>,
): Array<{ from: string; to: string }> {
  const rows = parseNameStatus(
    runGit(root, [
      "diff",
      "--name-status",
      "-z",
      "--no-renames",
      "--diff-filter=AD",
      baseTree,
      headTree,
    ]),
  );
  const paired = new Set(
    detected.flatMap((rename) => [rename.from, rename.to]),
  );
  const deleted = rows
    .filter((row) => row.status === "D" && !paired.has(row.path))
    .map((row) => row.path);
  const added = rows
    .filter((row) => row.status === "A" && !paired.has(row.path))
    .map((row) => row.path);
  const candidates = (to: string) =>
    deleted.filter(
      (from) =>
        path.posix.basename(from) === path.posix.basename(to) &&
        isKnowledgeRelocation(from, to),
    );
  const relocations: Array<{ from: string; to: string }> = [];
  for (const to of added) {
    const matches = candidates(to);
    if (matches.length !== 1) continue;
    const from = matches[0] as string;
    if (added.filter((other) => candidates(other).includes(from)).length !== 1)
      continue;
    relocations.push({ from, to });
  }
  return relocations;
}

/**
 * For a staged snapshot, the tree a commit that relocates knowledge files
 * into `.kb/` is judged against: `baseTree` with each relocated file's
 * committed content placed at its new path and the old path removed.
 * Diffing it against the staged tree leaves only the edits the commit made
 * inside those files, so findings that already existed at the old path are
 * not charged to the move. Every other change, including an edit to a file
 * that was already canonical, is diffed as before. Null when nothing is
 * relocated.
 */
// implements REQ-014
export function renameResolutionBase(
  root: string,
  baseTree: string,
  headTree: string,
): { baseTree: string; renames: Array<{ from: string; to: string }> } | null {
  const zero = "0".repeat(baseTree.length);
  const renames: Array<{ from: string; to: string }> = [];
  const entries: string[] = [];
  const detected = renamedPaths(root, baseTree, headTree).filter((rename) =>
    isKnowledgeRelocation(rename.from, rename.to),
  );
  for (const rename of [
    ...detected,
    ...unpairedKnowledgeRelocations(root, baseTree, headTree, detected),
  ]) {
    // Both kinds of relocation start from a path in the base tree.
    const source = readTreeEntry(root, baseTree, rename.from) as TreeEntry;
    if (source.type !== "blob") continue;
    renames.push(rename);
    entries.push(`0 ${zero}\t${rename.from}`);
    entries.push(`${source.mode} ${source.oid}\t${rename.to}`);
  }
  if (renames.length === 0) return null;
  return {
    baseTree: writeTreeWithEntries(
      root,
      baseTree,
      entries,
      "kibi-rename-base-",
    ),
    renames: renames.sort((left, right) => left.to.localeCompare(right.to)),
  };
}

/** Capture one immutable tree from the index and inventory only Git objects. */
// implements REQ-014
export function captureStagedSnapshot(
  workspaceRoot: string,
): GitChangeSnapshot {
  const headCommit = resolveHeadCommit(workspaceRoot);
  const headTree = gitText(workspaceRoot, ["write-tree"]);
  const commitTree = treeForCommit(workspaceRoot, headCommit);
  const merge = headCommit
    ? mergeResolutionBase(
        workspaceRoot,
        commitTree,
        headTree,
        pendingMergeParents(workspaceRoot),
      )
    : null;
  const mergeTree = merge?.baseTree ?? commitTree;
  const relocation = renameResolutionBase(workspaceRoot, mergeTree, headTree);
  const baseTree = relocation?.baseTree ?? mergeTree;
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
  const snapshot = snapshotFromTrees(
    workspaceRoot,
    baseTree,
    headTree,
    headCommit,
    readGit,
    assertUnchanged,
  );
  return {
    ...snapshot,
    ...(merge ? { mergeInherited: merge.inherited } : {}),
    ...(relocation ? { renameResolved: relocation.renames } : {}),
  };
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
