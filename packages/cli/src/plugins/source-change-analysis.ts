import {
  type GateAnalysis,
  afterAnalysisObligation,
} from "../traceability/analysis-gate.js";
import type { StagedPath } from "../traceability/git-staged.js";
import { partialAnalysisSymbolsUsable } from "../traceability/symbol-extract.js";
import type {
  HostSourceAnalysisResultV2,
  SourceAnalysisService,
} from "./source-analysis-service.js";

// implements REQ-014
export interface SourceChangeAnalysis {
  path: string;
  before: HostSourceAnalysisResultV2 | null;
  after: HostSourceAnalysisResultV2 | null;
}

/** Files analyzed at once; pooled providers bound their own worker count. */
const SOURCE_ANALYSIS_CONCURRENCY = 4;

/** Analyze both versions without changing the complete inventory or assigning proof. */
// implements REQ-014
export async function analyzeSourceChanges(
  inventory: readonly StagedPath[],
  service: SourceAnalysisService,
): Promise<Map<string, SourceChangeAnalysis>> {
  const files = inventory.filter(
    (file) => file.analysisDepth !== "metadata" && !file.skipReason,
  );
  const results: SourceChangeAnalysis[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < files.length) {
      const index = next++;
      const file = files[index] as StagedPath;
      const [before, after] = await Promise.all([
        file.previousContent === undefined
          ? null
          : service.analyzeTextV2(
              file.oldPath ?? file.copyFromPath ?? file.path,
              file.previousContent,
            ),
        file.content === undefined
          ? null
          : service.analyzeTextV2(file.path, file.content),
      ]);
      results[index] = { path: file.path, before, after };
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(SOURCE_ANALYSIS_CONCURRENCY, files.length) },
      worker,
    ),
  );
  // Map order follows the inventory, independent of completion order.
  return new Map(results.map((change) => [change.path, change]));
}

/** Adapt a host result to the shared analysis gate. */
// implements REQ-source-analysis-v2
export function gateAnalysis(
  result: HostSourceAnalysisResultV2 | null,
): GateAnalysis<HostSourceAnalysisResultV2["uncoveredRanges"][number]> | null {
  return result
    ? {
        status: result.status,
        diagnosticCodes: result.diagnostics.map((item) => item.code),
        uncoveredRanges: result.uncoveredRanges,
      }
    : null;
}

/** Staged lines of a partially analyzed file that need a file-level review. */
// implements REQ-source-analysis-v2
export interface PartialAnalysisReview {
  path: string;
  /** Staged lines inside the gaps and outside every placed declaration. */
  lines: { startLine: number; endLine: number }[];
  ranges: { startLine: number; endLine: number; reason: string }[];
  detail: string;
}

/**
 * The after-side gaps a staged change touches outside every declaration the
 * analyzer placed. A changed line inside a placed declaration is validated
 * against that symbol instead.
 */
// implements REQ-source-analysis-v2
export function partialAnalysisReviews(
  inventory: readonly StagedPath[],
  analyses: ReadonlyMap<string, SourceChangeAnalysis>,
): PartialAnalysisReview[] {
  const reviews: PartialAnalysisReview[] = [];
  for (const file of inventory) {
    const analysis = analyses.get(file.path)?.after ?? null;
    const obligation = afterAnalysisObligation(
      gateAnalysis(analysis),
      file.hunkRanges,
    );
    if (obligation.kind !== "partial_review") continue;
    // Only a present analysis can ask for a partial review.
    const after = analysis as HostSourceAnalysisResultV2;
    const usable = partialAnalysisSymbolsUsable(after);
    // Declarations count only when the analysis placed them reliably.
    const placed = after.symbols.filter(() => usable);
    const outside = obligation.ranges.map((range) => ({
      range,
      lines: file.hunkRanges.flatMap((hunk) =>
        uncoveredLines(
          Math.max(range.startLine, hunk.start),
          Math.min(range.endLine, hunk.end),
          placed,
        ),
      ),
    }));
    const touched = outside.filter((entry) => entry.lines.length > 0);
    if (touched.length === 0) continue;
    const ranges = touched.map((entry) => entry.range);
    const lines = mergeLineRanges(
      touched.flatMap((entry) =>
        entry.lines.map((line) => ({ startLine: line, endLine: line })),
      ),
    );
    const detail = [
      ...new Set(
        after.diagnostics
          .filter((item) => {
            const at = item.range;
            return (
              at === undefined ||
              ranges.some(
                (range) =>
                  at.startLine <= range.endLine &&
                  range.startLine <= at.endLine,
              )
            );
          })
          .map((item) => item.message),
      ),
    ].join(" ");
    reviews.push({
      path: file.path,
      lines,
      ranges: ranges.map((range) => ({
        startLine: range.startLine,
        endLine: range.endLine,
        reason: range.reason,
      })),
      detail:
        detail || [...new Set(ranges.map((range) => range.reason))].join(", "),
    });
  }
  return reviews;
}

type LineSpan = { startLine: number; endLine: number };

/** The lines of [start, end] that no span contains, ascending. */
function uncoveredLines(
  start: number,
  end: number,
  spans: readonly LineSpan[],
): number[] {
  const out: number[] = [];
  for (let line = start; line <= end; line++)
    if (!spans.some((span) => span.startLine <= line && line <= span.endLine))
      out.push(line);
  return out;
}

function mergeLineRanges(ranges: readonly LineSpan[]): LineSpan[] {
  const sorted = [...ranges].sort((a, b) => a.startLine - b.startLine);
  const merged: LineSpan[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range.startLine <= last.endLine + 1)
      last.endLine = Math.max(last.endLine, range.endLine);
    else merged.push({ ...range });
  }
  return merged;
}

/**
 * Enforce the shared analysis gate when no impact policy accepts reviews:
 * failed analysis and non-local gaps block; a local gap is left to
 * {@link partialAnalysisReviews}.
 */
// implements REQ-source-analysis-v2
export function assertSourceAnalysisGate(
  inventory: readonly StagedPath[],
  analyses: ReadonlyMap<string, SourceChangeAnalysis>,
): void {
  for (const file of inventory) {
    const analysis = analyses.get(file.path)?.after ?? null;
    const obligation = afterAnalysisObligation(
      gateAnalysis(analysis),
      file.hunkRanges,
    );
    if (obligation.kind !== "blocked") continue;
    // Only a present analysis can block.
    const after = analysis as HostSourceAnalysisResultV2;
    const detail = after.diagnostics.map((d) => d.message).join("; ");
    throw new Error(
      `Source analysis ${after.status} for ${file.path}: ${detail}`,
    );
  }
}
