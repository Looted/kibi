// implements REQ-mcp-semantic-advisor-preflight
import { afterEach, describe, expect, test } from "bun:test";
import {
  detectCountStrictSuggestion,
  numberToken,
  whenParsedNumber,
} from "../../src/operations/semantic-advisor/strict-count-rules.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const payload = {
  type: "req",
  id: "REQ-COUNT-REMAINING",
  properties: { title: "Count remaining", status: "open", source: "test.md" },
};

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("strict count remaining cap-at branches", () => {
  test("models cap-at prose with and without an explicit property", () => {
    restores.push(isolateKibiEnv());
    const withProperty = detectCountStrictSuggestion(
      payload,
      "The editor caps at zoom 3.",
    );
    expect(withProperty).toMatchObject({
      kind: "strict_property",
      claim: {
        operator: "lte",
        value_int: 3,
        property_key: "zoom_cap",
      },
    });

    const withoutProperty = detectCountStrictSuggestion(
      payload,
      "The session caps at five.",
    );
    expect(withoutProperty).toMatchObject({
      kind: "strict_property",
      claim: {
        operator: "lte",
        value_int: 5,
        property_key: "count",
      },
    });

    const wordZero = detectCountStrictSuggestion(
      payload,
      "The pool capped at zero.",
    );
    expect(wordZero?.claim).toMatchObject({ value_int: 0, operator: "lte" });

    expect(numberToken("eleven")).toBeNull();
    expect(numberToken("3")).toBe(3);
    expect(detectCountStrictSuggestion(payload, "hello world")).toBeNull();
    expect(whenParsedNumber(null, (value) => value + 1)).toBeNull();
    expect(whenParsedNumber(4, (value) => value * 2)).toBe(8);
  });
});
