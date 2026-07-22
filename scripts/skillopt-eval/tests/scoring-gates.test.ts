import { describe, expect, test } from "bun:test";
import {
  type GateCell,
  evaluateBundleGate,
  evaluateSkillGate,
} from "../scoring/gates";
import { pairedBootstrapLowerBound } from "../scoring/statistics";

const FAMILIES = ["discovery", "mutation", "quality", "resilience"] as const;

function cells(
  count: number,
  scoreAt: (index: number) => number,
  hardAt: (index: number) => 0 | 1,
): readonly GateCell[] {
  return Array.from({ length: count }, (_, index) => {
    const hard = hardAt(index);
    return {
      taskId: `task-${String(index + 1).padStart(2, "0")}`,
      family: FAMILIES[index % FAMILIES.length] ?? "discovery",
      score: scoreAt(index),
      hard,
      outcome: hard === 1 ? ("pass" as const) : ("fail" as const),
      terminalCategory: hard === 1 ? null : "behavioral_failure",
      criticalFailureCount: 0,
    };
  });
}

function passingSkillMatrix() {
  return {
    candidate: cells(
      16,
      (index) => (index < 13 ? 90 : 84),
      (index) => (index < 13 ? 1 : 0),
    ),
    baseline: cells(
      16,
      (index) => (index < 11 ? 85 : 70),
      (index) => (index < 11 ? 1 : 0),
    ),
    oneShot: cells(
      16,
      (index) => (index < 12 ? 85 : 80),
      (index) => (index < 12 ? 1 : 0),
    ),
  } as const;
}

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
});

describe("SkillOpt bundle gate", () => {
  test("passes the exact eight-task bundle thresholds", () => {
    // Given
    const matrix = {
      candidate: cells(
        8,
        () => 88,
        () => 1,
      ),
      baseline: cells(
        8,
        () => 84,
        () => 0,
      ),
      oneShot: cells(
        8,
        () => 85,
        () => 1,
      ),
    };

    // When
    const verdict = evaluateBundleGate(matrix);

    // Then
    expect(verdict.outcome).toBe("pass");
    expect(verdict.adoptionEligible).toBe(true);
    expect(verdict.reasons).toEqual([]);
  });

  test("rejects candidate critical failures even when numeric gates pass", () => {
    // Given
    const candidate = cells(
      8,
      () => 90,
      () => 1,
    ).map((cell, index) =>
      index === 0
        ? {
            ...cell,
            score: 84,
            hard: 0 as const,
            outcome: "fail" as const,
            terminalCategory: "behavioral_failure",
            criticalFailureCount: 1,
          }
        : cell,
    );
    const matrix = {
      candidate,
      baseline: cells(
        8,
        () => 80,
        () => 0,
      ),
      oneShot: cells(
        8,
        () => 85,
        () => 1,
      ),
    };

    // When
    const verdict = evaluateBundleGate(matrix);

    // Then
    expect(verdict.outcome).toBe("fail");
    expect(verdict.adoptionEligible).toBe(false);
    expect(verdict.reasons).toContain("candidate:critical-failures");
  });
});
