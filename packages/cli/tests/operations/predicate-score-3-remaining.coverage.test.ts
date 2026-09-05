// implements REQ-mcp-suggest-predicates
import { describe, expect, test } from "bun:test";

import { scoreExactPredicates3 } from "../../src/operations/modeling/predicate-score-3.js";
import type { PredicateSchemaCandidate } from "../../src/operations/modeling/predicate-types.js";

function schema(predicate_name: string): PredicateSchemaCandidate {
  return {
    id: predicate_name,
    predicate_name,
    title: predicate_name,
    description: predicate_name,
    argument_names: ["subject"],
    argument_types: ["atom"],
    keywords: [],
    examples: [],
    tags: [],
  };
}

describe("scoreExactPredicates3 remaining exact lanes", () => {
  test("returns 0 or 0.98 for every named rule including miss and hit prose", () => {
    expect(
      scoreExactPredicates3(
        schema("visual_layout_rule"),
        "The sidebar must remain visually aligned with the canvas.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates3(schema("visual_layout_rule"), "plain")).toBe(0);

    expect(
      scoreExactPredicates3(
        schema("enforcement_location_rule"),
        "The check must be enforced at the compiler boundary.",
      ),
    ).toBe(0.98);
    expect(
      scoreExactPredicates3(schema("enforcement_location_rule"), "plain"),
    ).toBe(0);

    expect(
      scoreExactPredicates3(
        schema("reconciliation_rule"),
        "On save, the overlay must reconcile hashes and clear stale facts.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates3(schema("reconciliation_rule"), "plain")).toBe(0);

    expect(
      scoreExactPredicates3(
        schema("throttle_policy_rule"),
        "The writer must be throttled for burst uploads.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates3(schema("throttle_policy_rule"), "plain")).toBe(0);

    expect(
      scoreExactPredicates3(
        schema("temporal_order"),
        "The daemon initializes after the store is ready.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates3(schema("temporal_order"), "plain")).toBeNull();

    expect(
      scoreExactPredicates3(
        schema("state_transition"),
        "When login succeeds, the session transitions from anonymous to active.",
      ),
    ).toBe(0.98);
    expect(scoreExactPredicates3(schema("state_transition"), "plain")).toBe(0);

    expect(
      scoreExactPredicates3(
        schema("conditional_behavior"),
        "If a user submits a form, it stores the draft.",
      ),
    ).toBe(0.98);

    expect(
      scoreExactPredicates3(
        schema("commit_action"),
        "The editor must autosave the buffer.",
      ),
    ).toBe(0.98);
  });
});
