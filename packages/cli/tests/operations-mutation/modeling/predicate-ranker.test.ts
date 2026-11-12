import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { USAGE_HINTS_BY_PREDICATE } from "../../../src/operations/modeling/predicate-catalog.js";
import {
  rankSchema,
  scoreSchema,
  usageHintsForSchema,
} from "../../../src/operations/modeling/predicate-ranker.js";
import { SCENARIOS, schemaWith } from "./ranker-scenarios.js";

const GOLDEN = JSON.parse(
  readFileSync(
    join(import.meta.dir, "fixtures/predicate-ranker.golden.json"),
    "utf8",
  ),
) as Record<string, unknown>;

describe("rankSchema score components", () => {
  test("golden covers every scenario", () => {
    expect(Object.keys(GOLDEN)).toStrictEqual(SCENARIOS.map(([name]) => name));
  });

  for (const [name, overrides, text] of SCENARIOS) {
    test(name, () => {
      const schema = schemaWith(overrides);
      const ranked = rankSchema(schema, text);
      expect(ranked.components).toStrictEqual(GOLDEN[name] as never);
      expect(ranked.score).toBe(ranked.components.total);
      expect(ranked.schema).toBe(schema);
    });
  }
});

describe("scoreSchema", () => {
  test("returns the ranked total", () => {
    expect(scoreSchema(schemaWith({ keywords: ["alpha"] }), "alpha")).toBe(
      0.38,
    );
    expect(scoreSchema(schemaWith({}), "nothing")).toBe(0);
  });
});

describe("usageHintsForSchema", () => {
  test("prefers the schema's own hints", () => {
    const hints = { use_when: ["x"], do_not_use_when: [] };
    expect(
      usageHintsForSchema(
        schemaWith({
          predicate_name: "dependency_resolution_policy",
          usage_hints: hints,
        }),
      ),
    ).toBe(hints);
  });

  test("falls back to the catalog hints by predicate name", () => {
    const fallback = USAGE_HINTS_BY_PREDICATE.dependency_resolution_policy;
    expect(fallback).toBeDefined();
    expect(
      usageHintsForSchema(
        schemaWith({
          predicate_name: "dependency_resolution_policy",
          usage_hints: undefined,
        }),
      ),
    ).toBe(fallback);
  });

  test("is undefined for an unknown predicate without hints", () => {
    expect(
      usageHintsForSchema(schemaWith({ usage_hints: undefined })) as unknown,
    ).toBe(undefined);
  });
});

describe("rankSchema keyword edge cases", () => {
  test("symbol keywords match the lowercased text", () => {
    const schema = schemaWith({ keywords: ["C++"] });
    expect(rankSchema(schema, "Uses C++ code").components.keyword_hits).toBe(1);
  });

  test("a keyword without word characters never hits", () => {
    const schema = schemaWith({ keywords: ["++"] });
    expect(rankSchema(schema, "c++ code").components.keyword_hits).toBe(0);
  });

  test("a schema without usage hints has no usage evidence", () => {
    const schema = schemaWith({
      predicate_name: "zz_no_hints",
      usage_hints: undefined,
    });
    const { components } = rankSchema(schema, "Stryker was here");
    expect(components.usage_match).toBe(0);
    expect(components.negative_evidence).toBe(0);
  });
});
