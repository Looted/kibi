// implements REQ-mcp-semantic-advisor-preflight
import { afterEach, describe, expect, test } from "bun:test";
import { detectPredicateRules } from "../../src/operations/semantic-advisor/predicate-rule.js";
import { PRODUCT_TAIL_PREDICATE_RULES } from "../../src/operations/semantic-advisor/predicate-rules-product-tail.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const payload = {
  type: "req",
  id: "REQ-TAIL-REMAINING",
  properties: { title: "Tail remaining", status: "open", source: "test.md" },
};

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("product-tail predicate rule remaining args branches", () => {
  test("invokes every remaining product-tail args mapper", () => {
    restores.push(isolateKibiEnv());
    const statements = [
      "The feed must be throttled for high frequency clients.",
      "The renderer initializes after the gpu is ready.",
      "When the user saves, the document transitions from draft to published.",
      "There must be at most one editor per session per workspace.",
      "The workflow terminal states are done, failed and cancelled.",
      "API requests must be rate limited to 10 requests per second.",
      "Only admins can publish articles.",
    ];
    for (const statement of statements) {
      expect(
        detectPredicateRules(
          payload,
          statement,
          PRODUCT_TAIL_PREDICATE_RULES,
        )?.kind,
      ).toBe("predicate");
    }
  });
});
