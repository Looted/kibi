import type { HunkRange } from "./git-staged.js";

/**
 * Diagnostics that make the whole parse unreliable rather than one region.
 * A deleted brace can surface as a syntax error far from the edited lines, so
 * these never narrow to the changed hunks and never accept a residual review.
 */
const NON_LOCAL_ANALYSIS_MARKER =
  /(?:syntax|parse|timeout|timed[\s_-]*out|integrity|checksum|failed|failure|error|input[\s_-]*limit)/i;

type LineRange = Readonly<{ startLine: number; endLine: number }>;

// implements REQ-source-analysis-v2
export type GateAnalysis<Range extends LineRange> = Readonly<{
  status: "ok" | "partial" | "unsupported" | "failed";
  diagnosticCodes: readonly string[];
  uncoveredRanges: readonly (Range & Readonly<{ reason: string }>)[];
}>;

/** What one side of a changed file needs before it can pass. */
type AnalysisObligation<Range extends LineRange> =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "blocked"; reason: string }>
  | Readonly<{ kind: "unsupported_review" }>
  | Readonly<{ kind: "partial_review"; ranges: readonly Range[] }>;

function hasNonLocalAnalysisGap(analysis: GateAnalysis<LineRange>): boolean {
  return NON_LOCAL_ANALYSIS_MARKER.test(
    [
      ...analysis.diagnosticCodes,
      ...analysis.uncoveredRanges.map((range) => range.reason),
    ].join("\n"),
  );
}

/** Uncovered ranges that overlap a changed line of the after side. */
function rangesTouchingHunks<Range extends LineRange>(
  ranges: readonly Range[],
  hunks: readonly HunkRange[],
): Range[] {
  return ranges.filter((range) =>
    hunks.some(
      (hunk) => range.startLine <= hunk.end && hunk.start <= range.endLine,
    ),
  );
}

/**
 * The single rule for when incomplete source analysis blocks a change.
 *
 * - The before side is historical and cannot be corrected by the author, so it
 *   is informational and never blocks or needs review.
 * - On the after side, failed analysis and non-local gaps (syntax, parse,
 *   timeout, integrity) always block.
 * - A local gap (a macro, decorator or other declared limitation) matters only
 *   where it overlaps the changed lines; elsewhere the file was already in that
 *   state and this change did not touch it.
 * - Unsupported after-side analysis needs one whole-file review.
 */
// implements REQ-source-analysis-v2
export function analysisObligation<Range extends LineRange>(
  side: "before" | "after",
  analysis: GateAnalysis<Range> | null | undefined,
  newHunkRanges: readonly HunkRange[],
): AnalysisObligation<Range> {
  if (side === "before" || !analysis || analysis.status === "ok")
    return { kind: "none" };
  if (analysis.status === "failed")
    return { kind: "blocked", reason: "source analysis failed" };
  if (analysis.status === "unsupported") return { kind: "unsupported_review" };
  if (analysis.uncoveredRanges.length === 0)
    return {
      kind: "blocked",
      reason: "partial analysis did not report which ranges it left uncovered",
    };
  if (hasNonLocalAnalysisGap(analysis))
    return {
      kind: "blocked",
      reason:
        "a parser, syntax, timeout or integrity diagnostic affects the whole file",
    };
  const ranges = rangesTouchingHunks(analysis.uncoveredRanges, newHunkRanges);
  return ranges.length === 0
    ? { kind: "none" }
    : { kind: "partial_review", ranges };
}
