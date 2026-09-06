import { describe, expect, test } from "bun:test";
import {
  evaluateBundleGate,
  evaluateHeldOutPredicateGate,
  evaluateSkillGate,
} from "../scoring/gates";
import {
  pairedBootstrapLowerBound,
  sortedPairedDeltas,
} from "../scoring/statistics";
import {
  FAMILIES,
  bundleGateCandidateFailureWithWeakBaseline,
  cells,
  passingBundleGateMatrix,
  passingHeldOutPredicateCells,
  passingSkillMatrix,
} from "./fixtures/scoring-gates-fixtures";

describe("SkillOpt deterministic statistics", () => {
  test("uses the fixed 10,000-resample seed for paired lower bounds", () => {
    // Given
    const candidate = cells(
      16,
      () => 90,
      () => 1,
    );
    const comparator = cells(
      16,
      () => 80,
      () => 0,
    );

    // When
    const first = pairedBootstrapLowerBound(candidate, comparator);
    const second = pairedBootstrapLowerBound(candidate, comparator);

    // Then
    expect(first).toBe(10);
    expect(second).toBe(first);
  });

  test("rejects unpaired task identities instead of calculating a statistic", () => {
    // Given
    const candidate = cells(
      16,
      () => 90,
      () => 1,
    );
    const comparator = cells(
      16,
      () => 80,
      () => 0,
    ).map((cell, index) =>
      index === 0 ? { ...cell, taskId: "other-task" } : cell,
    );

    // When
    const result = pairedBootstrapLowerBound(candidate, comparator);

    // Then
    expect(result).toBeNull();
    expect(sortedPairedDeltas(candidate.slice(0, 1), comparator)).toBeNull();
    expect(
      sortedPairedDeltas(
        [
          { taskId: "a", family: "x", score: 1, hard: 1, criticalFailureCount: 0 },
          { taskId: "a", family: "x", score: 2, hard: 1, criticalFailureCount: 0 },
        ] as never,
        [
          { taskId: "a", family: "x", score: 1, hard: 1, criticalFailureCount: 0 },
          { taskId: "b", family: "x", score: 2, hard: 1, criticalFailureCount: 0 },
        ] as never,
      ),
    ).toBeNull();
  });
});

describe("SkillOpt per-skill gate", () => {
  test("passes exact Codex thresholds and emits stable family slices", () => {
    // Given
    const matrix = passingSkillMatrix();

    // When
    const verdict = evaluateSkillGate(matrix);

    // Then
    expect(verdict.outcome).toBe("pass");
    expect(verdict.adoptionEligible).toBe(true);
    expect(verdict.reasons).toEqual([]);
    expect(verdict.statistics?.candidate).toEqual({
      count: 16,
      mean: 88.875,
      hardPasses: 13,
      criticalFailures: 0,
    });
    expect(
      verdict.statistics?.familySlices.map(({ family }) => family),
    ).toEqual([...FAMILIES]);
    expect(verdict.statistics?.bootstrap).toMatchObject({
      resamples: 10_000,
      seed: 5417,
    });
  });

  test("fails a family regression even when global means are high", () => {
    // Given
    const matrix = passingSkillMatrix();
    const candidate = matrix.candidate.map((cell) =>
      cell.family === "discovery"
        ? {
            ...cell,
            score: 70,
            hard: 0 as const,
            outcome: "fail" as const,
            terminalCategory: "behavioral_failure",
          }
        : {
            ...cell,
            score: 100,
            hard: 1 as const,
            outcome: "pass" as const,
            terminalCategory: null,
          },
    );

    // When
    const verdict = evaluateSkillGate({ ...matrix, candidate });

    // Then
    expect(verdict.outcome).toBe("fail");
    expect(verdict.adoptionEligible).toBe(false);
    expect(verdict.reasons).toContain("family:discovery:mean-regression");
    expect(verdict.reasons).toContain("family:discovery:hard-pass-regression");
  });

  test("marks an ambiguous cell matrix ambiguous and blocks adoption", () => {
    // Given
    const matrix = passingSkillMatrix();
    const candidate = matrix.candidate.map((cell, index) =>
      index === 0
        ? {
            ...cell,
            score: 0,
            hard: 0 as const,
            outcome: "ambiguous" as const,
            terminalCategory: "evidence_conflict" as const,
          }
        : cell,
    );

    // When
    const verdict = evaluateSkillGate({ ...matrix, candidate });

    // Then
    expect(verdict.outcome).toBe("ambiguous");
    expect(verdict.adoptionEligible).toBe(false);
    expect(verdict.reasons).toEqual(["candidate:ambiguous-evidence"]);
  });

  test("marks incomplete matrices ambiguous instead of weakening denominators", () => {
    // Given
    const matrix = passingSkillMatrix();

    // When
    const verdict = evaluateSkillGate({
      ...matrix,
      candidate: matrix.candidate.slice(0, 15),
    });

    // Then
    expect(verdict.outcome).toBe("ambiguous");
    expect(verdict.reasons).toEqual(["matrix:expected-16-paired-tasks"]);
  });

  test("marks malformed numeric evidence ambiguous instead of passing NaN", () => {
    // Given
    const matrix = passingSkillMatrix();
    const candidate = matrix.candidate.map((cell, index) =>
      index === 0 ? { ...cell, score: Number.NaN } : cell,
    );

    // When
    const verdict = evaluateSkillGate({ ...matrix, candidate });

    // Then
    expect(verdict.outcome).toBe("ambiguous");
    expect(verdict.adoptionEligible).toBe(false);
    expect(verdict.reasons).toEqual(["matrix:malformed-cell-evidence"]);
  });

  test("keeps detailed train and development statistics available to optimization", () => {
    // Given
    const matrix = passingSkillMatrix();

    // When
    const verdict = evaluateSkillGate(matrix);

    // Then
    expect(verdict.statistics?.candidate.count).toBe(16);
    expect(verdict.statistics?.familySlices).toHaveLength(4);
    expect(verdict.reasons).toEqual([]);
  });
});

describe("held-out predicate matrix gate", () => {
  function allPredicateReplicates() {
    return passingHeldOutPredicateCells().flatMap((cell) =>
      ([1, 2, 3] as const).map((replicate) => ({ ...cell, replicate })),
    );
  }

  test("returns eligible when the complete matrix has candidate passes in every replicate", () => {
    // Given
    const cells = allPredicateReplicates();

    // When
    const verdict = evaluateHeldOutPredicateGate(cells);

    // Then
    expect(verdict).toEqual({ eligibility: "eligible" });
  });

  test("does not let a comparator behavioral miss veto an otherwise eligible candidate", () => {
    // Given
    const cells = allPredicateReplicates().map((cell, index) =>
      index === 0
        ? {
            ...cell,
            score: 0,
            hard: 0 as const,
            outcome: "fail" as const,
            terminalCategory: "behavioral_failure",
            criticalFailureCount: 1,
            predicateEvidence: {
              outcome: "fail" as const,
              caseId: cell.caseId,
              failure: "predicate-lane" as const,
            },
          }
        : cell,
    );

    // When
    const verdict = evaluateHeldOutPredicateGate(cells);

    // Then
    expect(verdict).toEqual({ eligibility: "eligible" });
    expect(JSON.stringify(verdict)).not.toContain(cells[0]?.caseId ?? "");
    expect(JSON.stringify(verdict)).not.toContain("predicate-lane");
  });

  test("returns generic ineligibility when one candidate predicate replicate fails", () => {
    const cells = allPredicateReplicates().map((cell) =>
      cell.variant === "skillopt" && cell.replicate === 1
        ? {
            ...cell,
            score: 40,
            hard: 0 as const,
            outcome: "fail" as const,
            terminalCategory: "behavioral_failure",
            criticalFailureCount: 1,
            predicateEvidence: {
              outcome: "fail" as const,
              caseId: cell.caseId,
              failure: "predicate-lane" as const,
            },
          }
        : cell,
    );

    expect(evaluateHeldOutPredicateGate(cells)).toEqual({
      eligibility: "HELD_OUT_MATRIX_INELIGIBLE",
    });
  });

  test("rejects a duplicate replicate instead of weakening the held-out denominator", () => {
    // Given
    const cells = allPredicateReplicates();
    const first = cells[0];
    if (first === undefined) throw new TypeError("expected held-out cell");
    const duplicate = { ...first, replicate: 2 as const };

    // When
    const verdict = evaluateHeldOutPredicateGate([
      duplicate,
      ...cells.slice(1),
    ]);

    // Then
    expect(verdict).toEqual({ eligibility: "HELD_OUT_MATRIX_INELIGIBLE" });
  });
});

describe("SkillOpt bundle gate", () => {
  test("passes the exact eight-task bundle thresholds", () => {
    // Given
    const matrix = passingBundleGateMatrix();

    // When
    const verdict = evaluateBundleGate(matrix);

    // Then
    expect(verdict.outcome).toBe("pass");
    expect(verdict.adoptionEligible).toBe(true);
    expect(verdict.reasons).toEqual([]);
  });

  test("rejects candidate critical failures even when numeric gates pass", () => {
    // Given
    const matrix = bundleGateCandidateFailureWithWeakBaseline();

    // When
    const verdict = evaluateBundleGate(matrix);

    // Then
    expect(verdict.outcome).toBe("fail");
    expect(verdict.adoptionEligible).toBe(false);
    expect(verdict.reasons).toContain("candidate:critical-failures");
  });
});
