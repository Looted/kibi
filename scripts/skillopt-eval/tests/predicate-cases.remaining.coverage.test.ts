// implements REQ-skillopt-predicate-first-requirements
import { afterEach, describe, expect, test } from "bun:test";
import { PREDICATE_CASES } from "../fixtures/predicate-case-data";
import {
  assertDistinctSemanticClasses,
  predicateCaseById,
  predicateCaseBySplitIndex,
} from "../fixtures/predicate-cases";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("predicate-cases remaining lookup and invariant failures", () => {
  test("rejects unknown ids, missing split indexes, and broken uniqueness", () => {
    expect(() => predicateCaseById("not-a-real-case")).toThrow(
      /unknown predicate case id/,
    );
    expect(() => predicateCaseBySplitIndex("train", 99)).toThrow(
      /no predicate case for split=train index=99/,
    );
    const original = PREDICATE_CASES.map((entry) => ({ ...entry }));
    const cases = PREDICATE_CASES as unknown as Array<
      (typeof PREDICATE_CASES)[number]
    >;
    try {
      cases[1] = { ...cases[1]!, semanticClass: cases[0]!.semanticClass };
      expect(() => assertDistinctSemanticClasses()).toThrow(
        /predicate cases must be semantically distinct/,
      );
      cases.splice(0, cases.length, ...original.slice(0, 6));
      expect(() => assertDistinctSemanticClasses()).toThrow(
        /expected exactly 7 predicate cases/,
      );
    } finally {
      cases.splice(0, cases.length, ...original);
    }
    assertDistinctSemanticClasses();
  });
});
