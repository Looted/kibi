import { describe, expect, test } from "bun:test";
import {
  type PredicateRule,
  commaList,
  detectPredicateRules,
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
} from "../../../src/operations/semantic-advisor/predicate-rule.js";
import * as shared from "../../../src/operations/semantic-advisor/shared.js";

const predicateOf = (
  suggestion: ReturnType<typeof detectPredicateRules>,
): { predicate_name: string; polarity: string } | undefined =>
  suggestion && "predicate" in suggestion ? suggestion.predicate : undefined;

const payload = {
  id: "REQ-a",
  properties: { title: "Users can export reports" },
};

const exportRule: PredicateRule = {
  pattern: /(?<actor>\w+) can export (?<object>\w+)/,
  name: "can_export",
  args: (groups) => [String(groups.actor), String(groups.object)],
  rationale: "export permission",
};

describe("detectPredicateRules", () => {
  test("re-exports the shared normalizers", () => {
    expect(normalizeKey).toBe(shared.normalizeKey);
    expect(normalizePredicateToken).toBe(shared.normalizePredicateToken);
    expect(normalizeSubjectKey).toBe(shared.normalizeSubjectKey);
    expect(singularize).toBe(shared.singularize);
  });

  test("returns null when no rule matches", () => {
    expect(
      detectPredicateRules(payload, "nothing here", [exportRule]),
    ).toBeNull();
    expect(
      detectPredicateRules(payload, "Users can export reports", []),
    ).toBeNull();
  });

  test("skips a rule whose accepts guard refuses the statement", () => {
    const refused: PredicateRule = {
      ...exportRule,
      name: "refused",
      accepts: () => false,
    };
    const accepted: PredicateRule = {
      ...exportRule,
      name: "accepted",
      accepts: (s) => s.startsWith("Users"),
    };
    const result = detectPredicateRules(payload, "Users can export reports", [
      refused,
      accepted,
    ]);
    expect(predicateOf(result)?.predicate_name).toBe("accepted");
  });

  test("skips a match without named groups", () => {
    const ungrouped: PredicateRule = {
      ...exportRule,
      name: "ungrouped",
      pattern: /can export/,
    };
    const result = detectPredicateRules(payload, "Users can export reports", [
      ungrouped,
      exportRule,
    ]);
    expect(predicateOf(result)?.predicate_name).toBe("can_export");
  });

  test("builds the suggestion from the first match with its polarity", () => {
    const deny: PredicateRule = { ...exportRule, polarity: "deny" };
    expect(
      detectPredicateRules(payload, "So Users can export reports now", [deny]),
    ).toStrictEqual(
      shared.predicateSuggestion(
        payload,
        "Users can export reports",
        "can_export",
        ["Users", "reports"],
        "export permission",
        "deny",
      ),
    );
    expect(
      predicateOf(
        detectPredicateRules(payload, "Users can export reports", [exportRule]),
      )?.polarity,
    ).toBe("assert");
  });
});

describe("commaList", () => {
  test("splits on commas and the word and, normalizing each part", () => {
    expect(commaList("Admins, Power Users and guests")).toBe(
      "admins,power_users,guests",
    );
    expect(commaList("A AND B")).toBe("a,b");
    expect(commaList("brand, ,x")).toBe("brand,x");
    expect(commaList("android")).toBe("android");
  });

  test("accepts a custom separator", () => {
    expect(commaList("a|b , c", /\|/)).toBe("a,b_c");
  });
});
