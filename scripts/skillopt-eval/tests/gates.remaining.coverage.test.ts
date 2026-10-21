import { afterEach, describe, expect, test } from "bun:test";
import { evaluateSkillGate } from "../scoring/gates";
import { passingSkillMatrix } from "./fixtures/scoring-gates-fixtures";

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

describe("skillopt gates remaining ambiguous variants", () => {
  test("classifies baseline and one-shot ambiguous evidence", () => {
    const matrix = passingSkillMatrix();
    expect(evaluateSkillGate(withOutcome(matrix, "baseline")).reasons).toEqual([
      "baseline:ambiguous-evidence",
    ]);
    expect(evaluateSkillGate(withOutcome(matrix, "oneShot")).reasons).toEqual([
      "one-shot:ambiguous-evidence",
    ]);
  });
});
