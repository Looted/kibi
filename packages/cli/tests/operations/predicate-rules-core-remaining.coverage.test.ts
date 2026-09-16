// implements REQ-mcp-semantic-advisor-preflight
import { afterEach, describe, expect, test } from "bun:test";
import { detectPredicateRules } from "../../src/operations/semantic-advisor/predicate-rule.js";
import { CORE_PREDICATE_RULES } from "../../src/operations/semantic-advisor/predicate-rules-core.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const payload = {
  type: "req",
  id: "REQ-CORE-REMAINING",
  properties: { title: "Core remaining", status: "open", source: "test.md" },
};

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("core predicate rule remaining args branches", () => {
  test("invokes every remaining core args mapper", () => {
    restores.push(isolateKibiEnv());
    const statements = [
      "The save button must stay disabled until the form is valid.",
      "The token must be refreshed before the session expires.",
      "When the queue is empty, the worker must sleep.",
      "the importer must skip rows unless the schema matches.",
      "Incoming edits saved in the same slot must merge into the current draft instead of creating duplicates.",
      "The client must retry up to 3 times.",
      "The pager must escalate to oncall after 15 minutes.",
      "The API availability must be at least 99.9 percent monthly.",
      "The edge availability must be at least 99.95 % daily.",
      "The billing service must notify finance by email.",
    ];
    for (const statement of statements) {
      expect(
        detectPredicateRules(payload, statement, CORE_PREDICATE_RULES)?.kind,
      ).toBe("predicate");
    }
  });
});
