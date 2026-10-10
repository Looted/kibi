// implements REQ-mcp-suggest-predicates, REQ-mcp-semantic-advisor-preflight
import { describe, expect, test } from "bun:test";
import { singularize as modelingSingularize } from "../../src/operations/modeling/predicate-utils.js";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";
import { singularize as advisorSingularize } from "../../src/operations/semantic-advisor/shared.js";

async function suggest(text: string) {
  const result = await handleKbSuggestPredicates(null, {
    text,
    includeExistingSchemas: false,
  });
  return result.structuredContent;
}

describe("permission_rule accepts common action verbs after the modal", () => {
  test("the kibi-usage fact-lanes deny example yields a permission_rule candidate", async () => {
    const data = await suggest("Suspended users must not publish articles.");
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(data.candidates[0]).toMatchObject({
      predicate_name: "permission_rule",
      predicate_args: ["suspended_user", "publish", "articles", "deny"],
      polarity: "deny",
      eligibility: "eligible",
      binding_status: "complete",
    });
  });

  test("an allow statement with approve is a permission_rule candidate", async () => {
    const data = await suggest("Only editors may approve drafts.");
    expect(data.recommendedAction).not.toBe("record_ontology_gap");
    expect(data.candidates[0]).toMatchObject({
      predicate_name: "permission_rule",
      eligibility: "eligible",
    });
  });

  test("a quota phrased with must not stays out of permission_rule", async () => {
    const data = await suggest("Uploads must not exceed 10 MB.");
    expect(
      data.candidates.some(
        (candidate) =>
          candidate.predicate_name === "permission_rule" &&
          candidate.eligibility === "eligible",
      ),
    ).toBe(false);
  });
});

describe("singularize handles -es and -ies plurals", () => {
  for (const [name, singularize] of [
    ["modeling", modelingSingularize],
    ["semantic advisor", advisorSingularize],
  ] as const) {
    test(`${name}: -ches, -shes, -sses and -xes drop "es"; -ies becomes "y"`, () => {
      expect(singularize("coaches")).toBe("coach");
      expect(singularize("branches")).toBe("branch");
      expect(singularize("wishes")).toBe("wish");
      expect(singularize("classes")).toBe("class");
      expect(singularize("boxes")).toBe("box");
      expect(singularize("policies")).toBe("policy");
      expect(singularize("widgets")).toBe("widget");
    });

    test(`${name}: singular words ending in s are kept`, () => {
      expect(singularize("status")).toBe("status");
      expect(singularize("access")).toBe("access");
      expect(singularize("analysis")).toBe("analysis");
      expect(singularize("bus")).toBe("bus");
      expect(singularize("results")).toBe("results");
    });
  }

  test("changes stays a scope token for predicate modeling only", () => {
    expect(modelingSingularize("changes")).toBe("changes");
    expect(advisorSingularize("changes")).toBe("change");
  });
});
