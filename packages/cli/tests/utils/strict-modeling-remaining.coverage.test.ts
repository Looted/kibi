// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import {
  type SemanticClaim,
  buildStrictWriteSet,
  modelRequirementClaims,
} from "../../src/utils/strict-modeling.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.ts";

let restoreEnv: (() => void) | undefined;

afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
});

function claim(overrides: Partial<SemanticClaim> = {}): SemanticClaim {
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

describe("strict-modeling remaining typed-value and clamp branches", () => {
  test("clamps confidence, integer numbers, boolean eq values, and polarity false", () => {
    restoreEnv = isolateKibiEnv();

    const high = buildStrictWriteSet({
      claim: claim({ confidence: 1.7, operator: "eq", value: true }),
      statement: "Enabled must stay true.",
    });
    expect(high.confidence).toBe(1);
    if (high.isStrict) {
      expect(high.propertyFact.properties).toMatchObject({
        value_type: "bool",
        value_bool: true,
      });
    }

    const low = buildStrictWriteSet({
      claim: claim({ confidence: -4, operator: "gte", value: 3 }),
      statement: "Negative confidence becomes observation.",
    });
    expect(low.isStrict).toBe(false);
    expect(low.confidence).toBe(0);

    const infinite = buildStrictWriteSet({
      claim: claim({ confidence: Number.POSITIVE_INFINITY, value: 8 }),
      statement: "Infinity confidence is not finite.",
    });
    expect(infinite.isStrict).toBe(false);

    const integer = buildStrictWriteSet({
      claim: claim({ operator: "lte", value: 4, confidence: 0.99 }),
      statement: "Count must be at most 4.",
    });
    if (integer.isStrict) {
      expect(integer.propertyFact.properties).toMatchObject({
        value_type: "int",
        value_int: 4,
      });
      expect(String(integer.propertyFact.properties.title)).toContain("<=");
    }

    const polarityFalse = buildStrictWriteSet({
      claim: claim({ operator: "polarity", value: false, confidence: 0.99 }),
      statement: "Polarity forbid from boolean false.",
    });
    if (polarityFalse.isStrict) {
      expect(polarityFalse.propertyFact.properties.polarity).toBe("forbid");
      expect(String(polarityFalse.propertyFact.properties.title)).toContain(
        "forbid",
      );
    }

    const polarityRequire = buildStrictWriteSet({
      claim: claim({
        operator: "polarity",
        value: "require",
        confidence: 0.99,
        subjectKey: "a..b__c",
        propertyKey: "foo--bar",
      }),
      statement: "Polarity require from string.",
    });
    if (polarityRequire.isStrict) {
      expect(polarityRequire.propertyFact.properties.polarity).toBe("require");
      expect(polarityRequire.subjectFact.properties.title).toBe("A B C");
    }

    const modeled = modelRequirementClaims([
      { claim: claim({ value: 1 }), statement: "One." },
      { claim: claim({ value: 1 }), statement: "One again." },
      { claim: claim({ value: 2 }), statement: "Two." },
    ]);
    expect(modeled).toHaveLength(2);
  });
});
