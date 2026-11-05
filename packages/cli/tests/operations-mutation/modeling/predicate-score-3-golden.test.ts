import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreExactPredicates3 } from "../../../src/operations/modeling/predicate-score-3.js";
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
    join(import.meta.dir, "fixtures/predicate-score-3.golden.json"),
    "utf8",
  ),
) as Golden;

describe("scoreExactPredicates3 golden sentences", () => {
  test("golden pins every predicate including an unknown one", () => {
    expect(golden.names.at(-1)).toBe("zz_none");
    expect(golden.names).toHaveLength(10);
  });

  for (const [index, { text, scores }] of golden.cases.entries()) {
    test(`case ${index}: ${JSON.stringify(text)}`, () => {
      const actual = golden.names.map((predicate_name) =>
        scoreExactPredicates3(
          { predicate_name } as PredicateSchemaCandidate,
          text,
        ),
      );
      expect(actual).toStrictEqual(scores);
    });
  }
});
