import { afterEach, describe, expect, test } from "bun:test";
import {
  evaluateBundleGate,
  evaluateSkillGate,
} from "../scoring/gates";
import { passingBundleGateMatrix, passingSkillMatrix } from "./fixtures/scoring-gates-fixtures";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

function withOutcome(
  matrix: ReturnType<typeof passingSkillMatrix>,
  lane: "baseline" | "oneShot",
) {
  return {
    ...matrix,
    [lane]: matrix[lane].map((cell, index) =>
      index === 0 ? { ...cell, outcome: "ambiguous" as const, hard: 0 } : cell,
    ),
  };
}

describe("skillopt gates remaining ambiguous variants and bundle malformation", () => {
  test("classifies baseline and one-shot ambiguous evidence", () => {
    const matrix = passingSkillMatrix();
    expect(evaluateSkillGate(withOutcome(matrix, "baseline")).reasons).toEqual([
      "baseline:ambiguous-evidence",
    ]);
    expect(evaluateSkillGate(withOutcome(matrix, "oneShot")).reasons).toEqual([
      "one-shot:ambiguous-evidence",
    ]);
  });

  test("rejects a malformed bundle-gate cell", () => {
    const matrix = passingBundleGateMatrix();
    const malformed = {
      ...matrix,
      candidate: matrix.candidate.map((cell, index) =>
        index === 0 ? { ...cell, score: Number.NaN } : cell,
      ),
    };
    expect(evaluateBundleGate(malformed).reasons).toEqual([
      "matrix:malformed-cell-evidence",
    ]);
  });
});
