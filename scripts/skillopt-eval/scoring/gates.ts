import {
  BOOTSTRAP_RESAMPLES,
  BOOTSTRAP_SEED,
  type CellSummary,
  pairedBootstrapLowerBound,
  summarizeCells,
} from "./statistics";

export type GateCell = Readonly<{
  taskId: string;
  family: string;
  score: number;
  hard: 0 | 1;
  outcome: "pass" | "fail" | "ambiguous";
  terminalCategory: string | null;
  criticalFailureCount: number;
}>;

type GateMatrix = Readonly<{
  candidate: readonly GateCell[];
  baseline: readonly GateCell[];
  oneShot: readonly GateCell[];
}>;

type FamilySlice = Readonly<{
  family: string;
  candidate: CellSummary;
  baseline: CellSummary;
  oneShot: CellSummary;
}>;

type GateStatistics = Readonly<{
  candidate: CellSummary;
  baseline: CellSummary;
  oneShot: CellSummary;
  meanDelta: Readonly<{ baseline: number; oneShot: number }>;
  hardPassDelta: Readonly<{ baseline: number; oneShot: number }>;
  bootstrap: Readonly<{
    resamples: number;
    seed: number;
    baselineLowerBound: number;
    oneShotLowerBound: number;
  }>;
  familySlices: readonly FamilySlice[];
}>;

export type GateVerdict = Readonly<{
  outcome: "pass" | "fail" | "ambiguous";
  adoptionEligible: boolean;
  reasons: readonly string[];
  statistics?: GateStatistics;
}>;

function validPairedMatrix(matrix: GateMatrix, expectedCount: number): boolean {
  const taskKeys = (cells: readonly GateCell[]) =>
    cells
      .map((cell) => `${cell.taskId}\u0000${cell.family}`)
      .sort()
      .join("\u0001");
  return (
    matrix.candidate.length === expectedCount &&
    matrix.baseline.length === expectedCount &&
    matrix.oneShot.length === expectedCount &&
    new Set(matrix.candidate.map((cell) => cell.taskId)).size ===
      expectedCount &&
    taskKeys(matrix.candidate) === taskKeys(matrix.baseline) &&
    taskKeys(matrix.candidate) === taskKeys(matrix.oneShot)
  );
}

function hasMalformedCell(matrix: GateMatrix): boolean {
  return [matrix.candidate, matrix.baseline, matrix.oneShot].some((cells) =>
    cells.some(
      (cell) =>
        cell.taskId.length === 0 ||
        cell.family.length === 0 ||
        !Number.isFinite(cell.score) ||
        cell.score < 0 ||
        cell.score > 100 ||
        !Number.isInteger(cell.criticalFailureCount) ||
        cell.criticalFailureCount < 0 ||
        (cell.hard === 1 &&
          (cell.score < 85 ||
            cell.criticalFailureCount > 0 ||
            cell.outcome !== "pass")) ||
        (cell.hard === 0 && cell.outcome === "pass"),
    ),
  );
}

function ambiguousVariant(matrix: GateMatrix): string | null {
  if (matrix.candidate.some((cell) => cell.outcome === "ambiguous")) {
    return "candidate:ambiguous-evidence";
  }
  if (matrix.baseline.some((cell) => cell.outcome === "ambiguous")) {
    return "baseline:ambiguous-evidence";
  }
  if (matrix.oneShot.some((cell) => cell.outcome === "ambiguous")) {
    return "one-shot:ambiguous-evidence";
  }
  return null;
}

function familySlices(matrix: GateMatrix): readonly FamilySlice[] {
  return [...new Set(matrix.candidate.map((cell) => cell.family))]
    .sort()
    .map((family) => ({
      family,
      candidate: summarizeCells(
        matrix.candidate.filter((cell) => cell.family === family),
      ),
      baseline: summarizeCells(
        matrix.baseline.filter((cell) => cell.family === family),
      ),
      oneShot: summarizeCells(
        matrix.oneShot.filter((cell) => cell.family === family),
      ),
    }));
}

function statistics(matrix: GateMatrix): GateStatistics | null {
  const candidate = summarizeCells(matrix.candidate);
  const baseline = summarizeCells(matrix.baseline);
  const oneShot = summarizeCells(matrix.oneShot);
  const baselineLowerBound = pairedBootstrapLowerBound(
    matrix.candidate,
    matrix.baseline,
  );
  const oneShotLowerBound = pairedBootstrapLowerBound(
    matrix.candidate,
    matrix.oneShot,
  );
  if (baselineLowerBound === null || oneShotLowerBound === null) return null;
  return {
    candidate,
    baseline,
    oneShot,
    meanDelta: {
      baseline: candidate.mean - baseline.mean,
      oneShot: candidate.mean - oneShot.mean,
    },
    hardPassDelta: {
      baseline: candidate.hardPasses - baseline.hardPasses,
      oneShot: candidate.hardPasses - oneShot.hardPasses,
    },
    bootstrap: {
      resamples: BOOTSTRAP_RESAMPLES,
      seed: BOOTSTRAP_SEED,
      baselineLowerBound,
      oneShotLowerBound,
    },
    familySlices: familySlices(matrix),
  };
}

function ambiguous(reason: string): GateVerdict {
  return {
    outcome: "ambiguous",
    adoptionEligible: false,
    reasons: [reason],
  };
}

export function evaluateSkillGate(matrix: GateMatrix): GateVerdict {
  if (!validPairedMatrix(matrix, 16)) {
    return ambiguous("matrix:expected-16-paired-tasks");
  }
  if (hasMalformedCell(matrix)) {
    return ambiguous("matrix:malformed-cell-evidence");
  }
  const ambiguousReason = ambiguousVariant(matrix);
  if (ambiguousReason !== null) return ambiguous(ambiguousReason);
  const result = statistics(matrix);
  if (result === null) return ambiguous("matrix:unpaired-bootstrap-input");

  const reasons: string[] = [];
  if (result.candidate.mean < 85) reasons.push("candidate:mean-below-85");
  if (result.candidate.hardPasses < 13)
    reasons.push("candidate:hard-passes-below-13");
  if (result.meanDelta.baseline < 8)
    reasons.push("candidate:baseline-mean-delta-below-8");
  if (result.meanDelta.oneShot < 5)
    reasons.push("candidate:one-shot-mean-delta-below-5");
  if (result.hardPassDelta.baseline < 2)
    reasons.push("candidate:baseline-hard-delta-below-2");
  if (result.hardPassDelta.oneShot < 1)
    reasons.push("candidate:one-shot-hard-delta-below-1");
  if (result.bootstrap.baselineLowerBound <= 0)
    reasons.push("candidate:baseline-bootstrap-not-positive");
  if (result.bootstrap.oneShotLowerBound <= 0)
    reasons.push("candidate:one-shot-bootstrap-not-positive");
  for (const slice of result.familySlices) {
    const strongerMean = Math.max(slice.baseline.mean, slice.oneShot.mean);
    const strongerHard = Math.max(
      slice.baseline.hardPasses,
      slice.oneShot.hardPasses,
    );
    if (slice.candidate.mean < strongerMean - 3)
      reasons.push(`family:${slice.family}:mean-regression`);
    if (slice.candidate.hardPasses < strongerHard - 1)
      reasons.push(`family:${slice.family}:hard-pass-regression`);
  }
  return {
    outcome: reasons.length === 0 ? "pass" : "fail",
    adoptionEligible: reasons.length === 0,
    reasons,
    statistics: result,
  };
}

export function evaluateBundleGate(matrix: GateMatrix): GateVerdict {
  if (!validPairedMatrix(matrix, 8)) {
    return ambiguous("matrix:expected-8-paired-tasks");
  }
  if (hasMalformedCell(matrix)) {
    return ambiguous("matrix:malformed-cell-evidence");
  }
  const ambiguousReason = ambiguousVariant(matrix);
  if (ambiguousReason !== null) return ambiguous(ambiguousReason);
  const result = statistics(matrix);
  if (result === null) return ambiguous("matrix:unpaired-bootstrap-input");
  const reasons: string[] = [];
  if (result.candidate.mean < 85) reasons.push("candidate:mean-below-85");
  if (result.candidate.hardPasses < 7)
    reasons.push("candidate:hard-passes-below-7");
  if (result.meanDelta.baseline < 3)
    reasons.push("candidate:baseline-mean-delta-below-3");
  if (result.meanDelta.oneShot < 3)
    reasons.push("candidate:one-shot-mean-delta-below-3");
  if (result.hardPassDelta.baseline < 0)
    reasons.push("candidate:baseline-hard-pass-loss");
  if (result.hardPassDelta.oneShot < 0)
    reasons.push("candidate:one-shot-hard-pass-loss");
  if (result.candidate.criticalFailures > 0)
    reasons.push("candidate:critical-failures");
  return {
    outcome: reasons.length === 0 ? "pass" : "fail",
    adoptionEligible: reasons.length === 0,
    reasons,
    statistics: result,
  };
}
