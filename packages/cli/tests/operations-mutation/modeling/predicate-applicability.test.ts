import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MIN_APPLICABILITY_SCORE,
  STRONG_APPLICABILITY_SCORE,
  WEAK_CANDIDATE_MARGIN,
  evaluateSemanticApplicability,
} from "../../../src/operations/modeling/predicate-applicability.js";
import { SCENARIOS, rankedFor } from "./applicability-scenarios.js";

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(import.meta.dir, "fixtures", name), "utf8"));

describe("applicability thresholds", () => {
  test("are pinned", () => {
    expect(MIN_APPLICABILITY_SCORE).toBe(0.62);
    expect(STRONG_APPLICABILITY_SCORE).toBe(0.8);
    expect(WEAK_CANDIDATE_MARGIN).toBe(0.06);
  });
});

describe("evaluateSemanticApplicability scenarios", () => {
  const golden = fixture(
    "predicate-applicability-scenarios.golden.json",
  ) as Record<string, unknown>;

  test("golden covers every scenario", () => {
    expect(Object.keys(golden)).toStrictEqual(SCENARIOS.map((s) => s.name));
  });

  for (const scenario of SCENARIOS) {
    test(scenario.name, () => {
      const options =
        scenario.explicitSchema === undefined
          ? undefined
          : { explicitSchema: scenario.explicitSchema };
      expect(
        evaluateSemanticApplicability(
          rankedFor(scenario) as never,
          scenario.text,
          options,
        ) as unknown,
      ).toStrictEqual(golden[scenario.name]);
    });
  }
});

describe("evaluateSemanticApplicability intent cues", () => {
  // Every intent rule (and one unknown schema) against sentences that sit on
  // each cue pattern's boundaries: [eligible, score, ...reasons] per rule.
  const { names, cases } = fixture(
    "predicate-applicability-cues.golden.json",
  ) as { names: string[]; cases: { text: string; results: unknown[] }[] };

  for (const [index, { text, results }] of cases.entries()) {
    test(`cue sentence ${index}: ${JSON.stringify(text)}`, () => {
      const actual: unknown[] = names.map((predicate_name) => {
        const result = evaluateSemanticApplicability(
          rankedFor({
            name: predicate_name,
            text,
            schema: { predicate_name },
          }),
          text,
        );
        return [
          result.eligible ? 1 : 0,
          result.applicabilityScore,
          ...result.reasons,
        ];
      });
      expect(actual).toStrictEqual(results);
    });
  }
});
