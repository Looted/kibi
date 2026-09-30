import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HostSourceAnalysisResultV2 } from "../plugins/source-analysis-service.js";
import type { SourceChangeAnalysis } from "../plugins/source-change-analysis.js";
import { snapshotFileContent } from "../public/operations/proof-receipt-projection.js";
import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import type { StagedPath } from "./git-staged.js";
import { blobBytes, treeEntry } from "./impact-git-tree.js";
import {
  type Fingerprint,
  type SideEvidence,
  assertSha256,
  fingerprint,
  fingerprintBytes,
} from "./impact-review.js";

/** Per-path, per-side evidence: projected bytes, hunks and host analysis bindings. */
// implements REQ-impact-policy-stage-e-content-bound-review
export function isKnowledgeMarkdown(path: string): boolean {
  return path.startsWith(".kb/") && path.endsWith(".md");
}

function projectedKnowledgeMarkdown(path: string, content: string): string {
  if (!isKnowledgeMarkdown(path)) return content;
  return snapshotFileContent(path, Buffer.from(content, "utf8")).toString(
    "utf8",
  );
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function isReceiptOnlyChange(file: StagedPath): boolean {
  if (
    !isKnowledgeMarkdown(file.path) ||
    file.status !== "M" ||
    file.oldPath !== undefined ||
    file.copyFromPath !== undefined ||
    file.skipReason !== undefined ||
    file.previousContent === undefined ||
    file.content === undefined
  )
    return false;
  const previousMode = file.previousMode;
  const currentMode = file.gitMode;
  if (
    (previousMode !== "100644" && previousMode !== "100755") ||
    currentMode !== previousMode
  )
    return false;
  const before = Buffer.from(file.previousContent, "utf8");
  const after = Buffer.from(file.content, "utf8");
  return (
    !before.equals(after) &&
    snapshotFileContent(file.path, before).equals(
      snapshotFileContent(file.path, after),
    )
  );
}

function normalizeHunks(
  ranges: readonly Readonly<{ start: number; end: number }>[],
  content: string | undefined,
): { start: number; end: number }[] {
  const lineCount = Math.max(1, (content ?? "").split(/\r?\n/).length);
  return ranges.map((range) => ({
    start: range.start,
    end: range.end === Number.MAX_SAFE_INTEGER ? lineCount : range.end,
  }));
}

function projectedHunks(
  beforeContent: string | undefined,
  afterContent: string | undefined,
): {
  oldHunkRanges: { start: number; end: number }[];
  hunkRanges: { start: number; end: number }[];
} {
  const temporary = mkdtempSync(join(tmpdir(), "kibi-impact-projected-diff-"));
  try {
    const beforePath = join(temporary, "before.md");
    const afterPath = join(temporary, "after.md");
    writeFileSync(beforePath, beforeContent ?? "");
    writeFileSync(afterPath, afterContent ?? "");
    let diffText = "";
    try {
      diffText = execFileSync(
        "git",
        [
          "diff",
          "--no-index",
          "--no-ext-diff",
          "--no-textconv",
          "--no-color",
          "--unified=0",
          "--",
          beforePath,
          afterPath,
        ],
        {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("status" in error) ||
        error.status !== 1
      )
        throw error;
      diffText =
        "stdout" in error && typeof error.stdout === "string"
          ? error.stdout
          : "stdout" in error && Buffer.isBuffer(error.stdout)
            ? error.stdout.toString("utf8")
            : "";
    }
    const oldHunkRanges: { start: number; end: number }[] = [];
    const hunkRanges: { start: number; end: number }[] = [];
    const regex = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/gm;
    for (const match of diffText.matchAll(regex)) {
      const oldStart = Number.parseInt(match[1] ?? "0", 10);
      const oldCount = Number.parseInt(match[2] ?? "1", 10);
      const newStart = Number.parseInt(match[3] ?? "0", 10);
      const newCount = Number.parseInt(match[4] ?? "1", 10);
      if (oldCount > 0)
        oldHunkRanges.push({
          start: oldStart,
          end: oldStart + oldCount - 1,
        });
      if (newCount > 0)
        hunkRanges.push({ start: newStart, end: newStart + newCount - 1 });
    }
    return {
      oldHunkRanges: normalizeHunks(oldHunkRanges, beforeContent),
      hunkRanges: normalizeHunks(hunkRanges, afterContent),
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function projectedPathEvidence(file: StagedPath): StagedPath {
  const previousPath = file.oldPath ?? file.copyFromPath ?? file.path;
  if (!isKnowledgeMarkdown(file.path) && !isKnowledgeMarkdown(previousPath))
    return file;
  const previousContent =
    file.previousContent === undefined
      ? undefined
      : projectedKnowledgeMarkdown(previousPath, file.previousContent);
  const content =
    file.content === undefined
      ? undefined
      : projectedKnowledgeMarkdown(file.path, file.content);
  const ranges = projectedHunks(previousContent, content);
  const { diffText: _diffText, ...projected } = file;
  return {
    ...projected,
    ...(previousContent !== undefined ? { previousContent } : {}),
    ...(content !== undefined ? { content } : {}),
    oldHunkRanges: ranges.oldHunkRanges,
    hunkRanges: ranges.hunkRanges,
  };
}

function sideAnalysisFingerprint(
  result: HostSourceAnalysisResultV2,
): Fingerprint {
  return fingerprint(result);
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function sideEvidence(
  snapshot: GitChangeSnapshot,
  tree: string,
  path: string,
  result: HostSourceAnalysisResultV2 | null,
  content: string | undefined,
): SideEvidence | null {
  const entry = treeEntry(snapshot, tree, path);
  if (!entry) return null;
  if (!["100644", "100755", "120000", "160000"].includes(entry.mode))
    throw new Error(`Unsupported Git mode ${entry.mode} for ${path}`);
  if (
    (entry.mode === "160000") !== (entry.type === "commit") ||
    (entry.mode !== "160000" && entry.type !== "blob")
  )
    throw new Error(`Git mode/object type mismatch for ${path}`);
  const bytes = blobBytes(snapshot, entry);
  const kind =
    entry.mode === "160000" || entry.type === "commit"
      ? "gitlink"
      : entry.mode === "120000"
        ? "symlink"
        : "regular";
  const projected = bytes !== undefined && isKnowledgeMarkdown(path);
  const evidenceBytes =
    bytes && projected ? snapshotFileContent(path, bytes) : bytes;
  const byteFingerprint = evidenceBytes
    ? fingerprintBytes(evidenceBytes)
    : fingerprint({
        mode: entry.mode,
        type: entry.type,
        objectId: entry.objectId,
      });
  let analysis: SideEvidence["analysis"] = null;
  if (result) {
    if (result.sourceFile !== path)
      throw new Error(`Analysis source path mismatch for ${path}`);
    if (
      content === undefined ||
      !/^[0-9a-f]{64}$/.test(result.inputFingerprint)
    )
      throw new Error(
        `Host analysis lacks a valid input fingerprint for captured path ${path}`,
      );
    if (result.providerFingerprint !== null)
      assertSha256(
        `sha256:${result.providerFingerprint}`,
        `Provider fingerprint for ${path}`,
      );
    if (
      (result.status === "partial" && result.uncoveredRanges.length === 0) ||
      (result.status === "ok" && result.uncoveredRanges.length > 0)
    )
      throw new Error(`Source analysis status/range mismatch for ${path}`);
    analysis = {
      contractVersion: result.contractVersion,
      status: result.status,
      language: result.language,
      sourceFile: result.sourceFile,
      providerId: result.providerId,
      providerStamp: result.stamp,
      providerFingerprint:
        result.providerFingerprint === null
          ? null
          : `sha256:${result.providerFingerprint}`,
      // The wrapper supplies host-validated analysis of these exact captured
      // bytes. The byteFingerprint above independently binds the Git blob; do
      // not recompute this host contract here because v2 may include the
      // classifier, explicit language hint, and normalization version.
      inputFingerprint: `sha256:${result.inputFingerprint}`,
      resultFingerprint: sideAnalysisFingerprint(result),
      diagnosticCodes: result.diagnostics.map((row) => row.code).sort(),
      uncoveredRanges: result.uncoveredRanges.map((range) => ({
        startLine: range.startLine,
        startColumn: range.startColumn,
        endLine: range.endLine,
        endColumn: range.endColumn,
        reason: range.reason,
      })),
    };
  }
  if (kind === "regular" && bytes === undefined)
    throw new Error(`Regular tree entry has no blob: ${path}`);
  return {
    mode: entry.mode,
    objectId: projected ? null : entry.objectId,
    byteFingerprint,
    kind,
    ...(projected
      ? { contentProjection: "proof_receipts_stripped" as const }
      : {}),
    analysis,
  };
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function assertAnalysisInput(
  file: StagedPath,
  change: SourceChangeAnalysis | undefined,
): void {
  if (file.analysisDepth === "metadata" || file.skipReason) return;
  if (file.previousContent !== undefined && !change?.before)
    throw new Error(`Missing before-side source analysis for ${file.path}`);
  if (file.content !== undefined && !change?.after)
    throw new Error(`Missing after-side source analysis for ${file.path}`);
  if (change && change.path !== file.path)
    throw new Error(`Analysis path mismatch for ${file.path}`);
}

// implements REQ-impact-policy-stage-e-content-bound-review
export function exactPathProjection(
  file: StagedPath,
  before: SideEvidence | null,
  after: SideEvidence | null,
): unknown {
  return {
    path: file.path,
    status: file.status,
    ...(file.oldPath === undefined ? {} : { oldPath: file.oldPath }),
    ...(file.copyFromPath === undefined
      ? {}
      : { copyFromPath: file.copyFromPath }),
    analysisDepth: file.analysisDepth,
    disposition: file.disposition,
    ...(file.skipReason === undefined ? {} : { skipReason: file.skipReason }),
    ...(file.gitMode === undefined ? {} : { gitMode: file.gitMode }),
    ...(file.previousMode === undefined
      ? {}
      : { previousMode: file.previousMode }),
    oldHunkRanges: file.oldHunkRanges ?? [],
    newHunkRanges: file.hunkRanges,
    before,
    after,
  };
}
