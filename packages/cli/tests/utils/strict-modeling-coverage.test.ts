// implements REQ-014
import { describe, expect, test } from "bun:test";
import {
  type SemanticClaim,
  buildStableRequirementIds,
  buildStrictWriteSet,
  modelRequirementClaims,
  normalizePropertyKey,
  normalizeSubjectKey,
} from "../../src/utils/strict-modeling.js";

function claim(
  overrides: Partial<SemanticClaim> = {},
): SemanticClaim {
  return {
    source: ".kb/requirements/sample.md",
    subjectKey: "Widget.State",
    propertyKey: "enabled",
    operator: "eq",
    value: true,
    confidence: 0.95,
    provenance: ".kb/requirements/sample.md#L1",
    ...overrides,
  };
}

describe("strict-modeling leftover operators and guards", () => {
  test("normalize keys reject empty values and collapse punctuation", () => {
    expect(normalizeSubjectKey("A/B\\\\C...")).toBe("a.b.c");
    expect(normalizePropertyKey("  Foo--Bar  ")).toBe("foo_bar");
    expect(() => normalizeSubjectKey("...")).toThrow(/subjectKey/);
    expect(() => normalizePropertyKey("!!!")).toThrow(/propertyKey/);
  });

  test("buildStableRequirementIds and write sets cover operators and types", () => {
    expect(() =>
      buildStableRequirementIds(claim({ source: "!!!" })),
    ).toThrow(/source must normalize/);
    expect(buildStableRequirementIds(claim({ value: "  " })).normalizedValue).toBe(
      "empty",
    );
    expect(() =>
      buildStrictWriteSet({ claim: claim(), statement: "   " }),
    ).toThrow(/non-empty prose/);
    expect(() =>
      buildStrictWriteSet({
        claim: claim({ provenance: "   ", source: "   " }),
        statement: "ok",
      }),
    ).toThrow(/source must normalize/);

    const nan = buildStrictWriteSet({
      claim: claim({ confidence: Number.NaN }),
      statement: "A widget must stay enabled.",
    });
    expect(nan.isStrict).toBe(false);
    expect(nan.confidence).toBe(0);

    const medium = buildStrictWriteSet({
      claim: claim({ confidence: 0.82, operator: "neq", value: "off" }),
      statement: "State must not be off.",
    });
    expect(medium.isStrict).toBe(true);
    if (medium.isStrict) {
      expect(medium.req.properties.tags).toEqual(
        expect.arrayContaining(["confidence-band:medium"]),
      );
      expect(medium.propertyFact.properties).toMatchObject({
        operator: "neq",
        value_type: "string",
        value_string: "off",
      });
    }

    const gte = buildStrictWriteSet({
      claim: claim({ operator: "gte", value: 1.5, confidence: 0.99 }),
      statement: "Count must be at least 1.5.",
    });
    if (gte.isStrict) {
      expect(gte.propertyFact.properties.title).toContain(">=");
      expect(gte.propertyFact.properties.value_type).toBe("number");
    }

    const lte = buildStrictWriteSet({
      claim: claim({ operator: "lte", value: 3, confidence: 0.99 }),
      statement: "Count must be at most 3.",
    });
    if (lte.isStrict) {
      expect(lte.propertyFact.properties.title).toContain("<=");
    }

    const boolOp = buildStrictWriteSet({
      claim: claim({ operator: "bool", value: "true", confidence: 0.99 }),
      statement: "Flag must be true.",
    });
    if (boolOp.isStrict) {
      expect(boolOp.propertyFact.properties).toMatchObject({
        operator: "eq",
        value_type: "bool",
        value_bool: true,
      });
    }
    expect(() =>
      buildStrictWriteSet({
        claim: claim({ operator: "bool", value: "maybe" }),
        statement: "Flag must be boolean.",
      }),
    ).toThrow(/Boolean claims/);

    const polarityTrue = buildStrictWriteSet({
      claim: claim({ operator: "polarity", value: true, confidence: 0.99 }),
      statement: "Polarity require.",
    });
    if (polarityTrue.isStrict) {
      expect(polarityTrue.propertyFact.properties.polarity).toBe("require");
    }
    const polarityForbid = buildStrictWriteSet({
      claim: claim({ operator: "polarity", value: "forbid", confidence: 0.99 }),
      statement: "Polarity forbid.",
    });
    if (polarityForbid.isStrict) {
      expect(polarityForbid.propertyFact.properties.polarity).toBe("forbid");
    }
    expect(() =>
      buildStrictWriteSet({
        claim: claim({ operator: "polarity", value: "maybe" }),
        statement: "Polarity invalid.",
      }),
    ).toThrow(/Polarity claims/);

    const boolFalse = buildStrictWriteSet({
      claim: claim({ operator: "bool", value: false, confidence: 0.99 }),
      statement: "Flag false.",
    });
    if (boolFalse.isStrict) {
      expect(boolFalse.propertyFact.properties.value_bool).toBe(false);
    }
    const boolStringFalse = buildStrictWriteSet({
      claim: claim({ operator: "bool", value: "false", confidence: 0.99 }),
      statement: "Flag string false.",
    });
    if (boolStringFalse.isStrict) {
      expect(boolStringFalse.propertyFact.properties.value_bool).toBe(false);
    }

    const modeled = modelRequirementClaims([
      { claim: claim({ confidence: 0.4 }), statement: "Low." },
      { claim: claim({ confidence: 0.4 }), statement: "Low again." },
      { claim: claim({ confidence: 0.99, value: 9 }), statement: "High." },
    ]);
    expect(modeled.length).toBe(2);
  });
});
