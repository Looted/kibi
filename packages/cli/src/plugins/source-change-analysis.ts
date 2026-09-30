import {
  type GateAnalysis,
  analysisObligation,
} from "../traceability/analysis-gate.js";
import type { StagedPath } from "../traceability/git-staged.js";
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
  const results: SourceChangeAnalysis[] = new Array(files.length);
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

/** Enforce the shared analysis gate when no impact policy accepts reviews. */
// implements REQ-source-analysis-v2
export function assertSourceAnalysisGate(
  inventory: readonly StagedPath[],
  analyses: ReadonlyMap<string, SourceChangeAnalysis>,
): void {
  for (const file of inventory) {
    const analysis = analyses.get(file.path);
    const after = analysis?.after ?? null;
    const obligation = analysisObligation(
      "after",
      gateAnalysis(after),
      file.hunkRanges,
    );
    if (obligation.kind !== "blocked" && obligation.kind !== "partial_review")
      continue;
    const detail = after?.diagnostics.map((d) => d.message).join("; ") ?? "";
    throw new Error(
      obligation.kind === "blocked"
        ? `Source analysis ${after?.status} for ${file.path}: ${detail}`
        : `Source analysis partial for ${file.path} where the staged change touches uncovered lines (${obligation.ranges.map((range) => `${range.startLine}-${range.endLine}`).join(", ")}): ${detail}`,
    );
  }
}
