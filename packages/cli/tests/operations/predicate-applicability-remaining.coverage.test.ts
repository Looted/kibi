// implements REQ-mcp-suggest-predicates
import { afterEach, describe, expect, test } from "bun:test";
import { evaluateSemanticApplicability } from "../../src/operations/modeling/predicate-applicability.js";
import type { RankedPredicateSchema } from "../../src/operations/modeling/predicate-ranker.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("predicate-applicability remaining negative usage-hint reasons", () => {
  test("records usage guidance when do_not_use_when cues match", () => {
    restores.push(isolateKibiEnv());
    const ranked: RankedPredicateSchema = {
      schema: {
        id: "SCHEMA-STATE",
        predicate_name: "state",
        title: "State",
        description: "Entity state",
        argument_names: ["subject", "value"],
        argument_types: ["atom", "atom"],
        keywords: ["state"],
        examples: ["The editor must enter draft state."],
        tags: [],
        usage_hints: {
          use_when: ["describe a mode transition"],
          do_not_use_when: ["rate limit timeout latency for sessions"],
        },
      },
      score: 0.4,
      components: {
        exact_pattern: 0,
        keyword_hits: 0,
        descriptor_overlap: 0,
        usage_match: 0,
        negative_evidence: 0,
        broad_token_penalty: 0,
        specificity_bonus: 0,
        total: 0.4,
      },
    };
    const result = evaluateSemanticApplicability(
      ranked,
      "The session timeout latency must not exceed the rate limit.",
    );
    expect(result.reasons.join(" ")).toMatch(/usage guidance/);
  });
});
