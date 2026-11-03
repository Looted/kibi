import { describe, expect, test } from "bun:test";
import { detectConditionalRule } from "../../../src/operations/semantic-advisor/conditional-rules.js";
import {
  detectSourceShape,
  detectStrictSuggestion,
} from "../../../src/operations/semantic-advisor/strict-rules.js";

const payload = {
  type: "req",
  id: "REQ-1",
  properties: { title: "REQ-1", status: "open" },
  relationships: [],
} as unknown as Parameters<typeof detectStrictSuggestion>[0];

const claim = (suggestion: unknown) =>
  (suggestion as { proposed_fact?: { properties?: unknown } } | null)
    ?.proposed_fact?.properties ?? suggestion;

describe("strict suggestions", () => {
  test("a set that must include at least some members", () => {
    expect(
      JSON.stringify(
        detectSourceShape(
          payload,
          "The plugin list must include at least alpha, beta and gamma.",
        ),
      ),
    ).toContain('"value_set":["alpha","beta","gamma"]');
    expect(
      detectSourceShape(
        payload,
        "The plugin list must include at least two things!",
      ),
    ).toBeNull();
  });

  test("patterns, exact strings and machine sets", () => {
    for (const [statement, expected] of [
      ["Invoice ids must match `INV-[0-9]+`.", '"value_string":"INV-[0-9]+"'],
      ["Invoice ids must match /INV-\\d+/.", '"value_string":"INV-\\\\d+"'],
      ["The default region must be `eu-west-1`.", '"value_string":"eu-west-1"'],
      [
        "The order transitions must be one of draft -> sent, sent → paid.",
        '"value_set":["draft->sent","sent->paid"]',
      ],
      [
        "The order final states must be one of paid or cancelled.",
        '"property_key":"terminal_states"',
      ],
    ] as const)
      expect(
        JSON.stringify(claim(detectStrictSuggestion(payload, statement))),
      ).toContain(expected);
  });
});

describe("conditional rules", () => {
  const rule = (statement: string) => {
    const match = detectConditionalRule(statement);
    if (match?.kind !== "rule") throw new Error(JSON.stringify(match));
    return match;
  };
  const exception = (statement: string) => rule(statement).ir.exceptions?.[0];

  test("reads each comparison form", () => {
    for (const [phrase, operator, value] of [
      ["greater than 5", "gt", { kind: "number", value: 5 }],
      ["above five", "gt", { kind: "number", value: 5 }],
      ["at least 2.5", "gte", { kind: "number", value: 2.5 }],
      ["10 or more", "gte", { kind: "number", value: 10 }],
      ["less than 3 days", "lt", { kind: "duration", value: 3, unit: "d" }],
      ["under 30 minutes", "lt", { kind: "duration", value: 30, unit: "m" }],
      ["at most ten", "lte", { kind: "number", value: 10 }],
      ["4 or fewer", "lte", { kind: "number", value: 4 }],
      ["not equal to -1", "neq", { kind: "number", value: -1 }],
      ["exactly 7", "eq", { kind: "number", value: 7 }],
      ["12", "eq", { kind: "number", value: 12 }],
      ["verified", "eq", { kind: "const", value: "verified", type: "string" }],
      [
        "pre-approved",
        "eq",
        { kind: "const", value: "pre_approved", type: "string" },
      ],
    ] as const) {
      expect(
        exception(`Orders may ship only when the order total is ${phrase}.`),
      ).toStrictEqual({
        kind: "compare",
        operator,
        left: {
          kind: "var",
          name: "V",
          type: value.kind === "const" ? "string" : value.kind,
        },
        right: value,
      });
    }
  });

  test("leaves conditions it cannot compare unparsed", () => {
    for (const phrase of [
      "above lots",
      "under -3 days",
      "less than 3 parsecs",
      "some",
      "big and red",
      "2 3 4",
    ]) {
      const match = detectConditionalRule(
        `Orders may ship only when the order total is ${phrase}.`,
      );
      expect(match?.kind).toBe("unparsed");
    }
  });

  test("reads an of-form subject and names unreadable actions", () => {
    expect(
      rule("Orders may ship only when the total of the cart is positive."),
    ).toMatchObject({
      subjectKey: "cart",
      propertyKey: "total",
    });
    expect(
      detectConditionalRule("Never deploy unless the build is green."),
    ).toStrictEqual({
      kind: "unparsed",
      shape: "unless",
      evidence: "Never deploy unless the build is green",
      reason:
        "The clause forbids an action unless a condition holds, but its action could not be read.",
    });
    expect(
      detectConditionalRule(
        "123 must not run unless the order total is positive.",
      ),
    ).toStrictEqual({
      kind: "unparsed",
      shape: "unless",
      evidence: "123 must not run unless the order total is positive",
      reason:
        "The conditional clause names no action that can become a rule head.",
    });
  });
});
