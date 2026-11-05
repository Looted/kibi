import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreExactPredicates2 } from "../../../src/operations/modeling/predicate-score-2.js";
import type { PredicateSchemaCandidate } from "../../../src/operations/modeling/predicate-types.js";

/**
 * Each case pins the score of one sentence for every predicate the scorer
 * knows (plus an unknown one). The sentences include line-break, spacing and
 * one-letter variants so every boundary of each sentence pattern is pinned.
 */
type Golden = {
  names: string[];
  cases: { text: string; scores: (number | null)[] }[];
};

const golden = JSON.parse(
  readFileSync(
    join(import.meta.dir, "fixtures/predicate-score-2.golden.json"),
    "utf8",
  ),
) as Golden;

describe("scoreExactPredicates2", () => {
  test("golden pins every predicate including an unknown one", () => {
    expect(golden.names.at(-1)).toBe("zz_none");
    expect(golden.names).toHaveLength(18);
  });

  for (const [index, { text, scores }] of golden.cases.entries()) {
    test(`case ${index}: ${JSON.stringify(text)}`, () => {
      const actual = golden.names.map((predicate_name) =>
        scoreExactPredicates2(
          { predicate_name } as PredicateSchemaCandidate,
          text,
        ),
      );
      expect(actual).toStrictEqual(scores);
    });
  }
});

describe("coding_standard_rule sentence boundaries", () => {
  const score = (text: string) =>
    scoreExactPredicates2(
      { predicate_name: "coding_standard_rule" } as PredicateSchemaCandidate,
      text,
    );
  const cases: [string, number][] = [
    ["Code must use signals", 0.98],
    ["\nCode must use signals.", 0],
    ["Code must use signals.\nlater", 0],
    ["Code\n\nmust use signals.", 0.98],
    ["Code must\n\nuse signals.", 0.98],
    ["Code must use\n\nsignals.", 0.98],
  ];
  for (const [text, expected] of cases) {
    test(JSON.stringify(text), () => {
      expect(score(text)).toBe(expected);
    });
  }
});
