import { describe, expect, test } from "bun:test";

import { BUILT_IN_PREDICATE_SCHEMAS } from "../../src/operations/modeling/predicate-catalog.js";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";

async function topPredicate(text: string): Promise<string | undefined> {
  const result = await handleKbSuggestPredicates(null, { text });
  const { candidates } = result.structuredContent as {
    candidates?: { predicate_name?: string }[];
  };
  return candidates?.[0]?.predicate_name;
}

// executable_for TEST-ui-pattern-vocabulary
describe("UI pattern vocabulary", () => {
  test("the built-in catalog carries the four UI predicates with their arguments", () => {
    const byName = new Map(
      BUILT_IN_PREDICATE_SCHEMAS.map((schema) => [
        schema.predicate_name,
        schema,
      ]),
    );
    expect(byName.get("ui_pattern")?.argument_names).toEqual([
      "subject",
      "pattern",
    ]);
    expect(byName.get("same_pattern")?.argument_names).toEqual([
      "subject",
      "variant",
      "other_variant",
    ]);
    expect(byName.get("pattern_marker")?.argument_names).toEqual([
      "subject",
      "marker",
    ]);
    expect(byName.get("ui_container")?.argument_names).toEqual([
      "subject",
      "size",
      "overflow",
    ]);
  });

  test("predicate suggestions route UI design prose to the UI predicates", async () => {
    expect(
      await topPredicate(
        "The activity feed must be displayed as a line-and-dots timeline.",
      ),
    ).toBe("ui_pattern");
    expect(
      await topPredicate(
        "The editor view and the read-only view must use the same pattern for the activity feed.",
      ),
    ).toBe("same_pattern");
    expect(
      await topPredicate(
        "Every line-and-dots timeline must contain the timeline-dot marker class.",
      ),
    ).toBe("pattern_marker");
    expect(
      await topPredicate(
        "The review panel must sit in a half-page container with a scrollbar.",
      ),
    ).toBe("ui_container");
  });

  test("a developer coding standard still routes to coding_standard_rule", async () => {
    expect(await topPredicate("Derived state must use computed signals.")).toBe(
      "coding_standard_rule",
    );
  });
});
