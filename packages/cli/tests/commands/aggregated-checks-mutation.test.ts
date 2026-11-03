import { describe, expect, test } from "bun:test";
import path from "node:path";
import {
  ontologyQualityOverridesGoal,
  runAggregatedChecks,
} from "../../src/commands/aggregated-checks.js";
import { resolveKbPlPath } from "../../src/prolog.js";

const goal = (ratio: string, minFacts: string) =>
  `(   predicate_property(semantic_quality:set_ontology_quality_overrides(_, _), defined)
    ->  call(semantic_quality:set_ontology_quality_overrides(${ratio}, ${minFacts}))
    ;   true
    )`;

describe("ontologyQualityOverridesGoal", () => {
  test("forwards numeric thresholds and defaults the rest", () => {
    expect(ontologyQualityOverridesGoal({})).toBe(goal("default", "default"));
    expect(
      ontologyQualityOverridesGoal({
        KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO: " 0.25 ",
        KIBI_ONTOLOGY_QUALITY_MIN_FACTS: "12",
      }),
    ).toBe(goal("0.25", "12"));
    expect(
      ontologyQualityOverridesGoal({
        KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO: "   ",
        KIBI_ONTOLOGY_QUALITY_MIN_FACTS: "lots",
      }),
    ).toBe(goal("default", "default"));
    expect(
      ontologyQualityOverridesGoal({
        KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO: "",
        KIBI_ONTOLOGY_QUALITY_MIN_FACTS: "Infinity",
      }),
    ).toBe(goal("default", "default"));
  });

  test("reads the process environment by default", () => {
    const keys = [
      "KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO",
      "KIBI_ONTOLOGY_QUALITY_MIN_FACTS",
    ] as const;
    const saved = keys.map((key) => process.env[key]);
    process.env[keys[0]] = "0.5";
    process.env[keys[1]] = "3";
    try {
      expect(ontologyQualityOverridesGoal()).toBe(goal("0.5", "3"));
    } finally {
      keys.forEach((key, index) => {
        const value = saved[index];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      });
    }
  });
});

describe("runAggregatedChecks", () => {
  test("loads checks.pl beside the core and applies the overrides first", async () => {
    const goals: string[] = [];
    await runAggregatedChecks(
      {
        query: async (text: string) => {
          goals.push(text);
          return { success: true, bindings: { JsonString: "{}" } };
        },
      },
      null,
    );
    const checks = path.join(path.dirname(resolveKbPlPath()), "checks.pl");
    expect(
      goals[0]?.startsWith(
        `(use_module('${checks.replaceAll("'", "''")}'), ${ontologyQualityOverridesGoal()}, (   `,
      ),
    ).toBe(true);
  });

  test("a failure without a message is reported as unknown", async () => {
    await expect(
      runAggregatedChecks(
        { query: async () => ({ success: false, bindings: {} }) },
        null,
      ),
    ).rejects.toThrow("Aggregated checks query failed: Unknown error");
  });
});
