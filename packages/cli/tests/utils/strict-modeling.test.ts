/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
  type SemanticClaim,
  buildStableRequirementIds,
  buildStrictWriteSet,
  modelRequirementClaims,
  normalizePropertyKey,
  normalizeSubjectKey,
  normalizeTextRef,
} from "../../src/utils/strict-modeling.js";

const CUSTOMER_RETENTION_STATEMENT =
  "Customer data must be retained for 7 years.";

const CUSTOMER_RETENTION_CLAIM: SemanticClaim = {
  source: ".kb/requirements/customer-retention.md",
  subjectKey: "Customer.Data",
  propertyKey: "Retention Years",
  operator: "eq",
  value: 7,
  confidence: 0.92,
  provenance: ".kb/requirements/customer-retention.md#L1",
};

describe("strict-modeling", () => {
  test("stores a strict bound as a typed number", () => {
    const writeSet = buildStrictWriteSet({
      claim: {
        ...CUSTOMER_RETENTION_CLAIM,
        subjectKey: "checkout.cart",
        propertyKey: "final payable total",
        operator: "gt",
        value: "0",
      },
      statement:
        "Checkout may be initiated only when the cart's final payable total is greater than zero.",
    });
    if (!writeSet.isStrict) throw new Error("Expected strict write set");
    expect(writeSet.propertyFact.properties).toMatchObject({
      operator: "gt",
      value_type: "int",
      value_int: 0,
    });
    expect(writeSet.propertyFact.properties.title).toContain("> 0");
  });

  test("normalizes subject and property keys into deterministic canonical forms", () => {
    expect(normalizeSubjectKey(" Customer.Data Retention ")).toBe(
      "customer.data_retention",
    );
    expect(normalizePropertyKey("Retention Years")).toBe("retention_years");
  });

  test("builds stable deterministic ids from a semantic claim", () => {
    const idsA = buildStableRequirementIds(CUSTOMER_RETENTION_CLAIM);
    const idsB = buildStableRequirementIds({ ...CUSTOMER_RETENTION_CLAIM });

    expect(idsA).toEqual(idsB);
    expect(idsA.stableKey).toBe(
      "kb-requirements-customer-retention-md:customer.data:retention_years:eq:7",
    );
    expect(idsA.reqId).toMatch(/^REQ-AUTO-[A-F0-9]{16}$/);
    expect(idsA.subjectFactId).toMatch(/^FACT-SUBJECT-[A-F0-9]{16}$/);
    expect(idsA.propertyFactId).toMatch(/^FACT-PROP-[A-F0-9]{16}$/);
    expect(idsA.observationFactId).toMatch(/^FACT-OBS-[A-F0-9]{16}$/);
  });

  test("emits one strict req, one subject fact, one property fact, and two typed relationships", () => {
    const writeSet = buildStrictWriteSet({
      claim: CUSTOMER_RETENTION_CLAIM,
      statement: CUSTOMER_RETENTION_STATEMENT,
    });

    expect(writeSet.isStrict).toBe(true);
    expect(writeSet.confidence).toBe(0.92);

    if (!writeSet.isStrict) {
      throw new Error("Expected strict write set");
    }

    expect(writeSet.req.type).toBe("req");
    expect(writeSet.subjectFact.type).toBe("fact");
    expect(writeSet.propertyFact.type).toBe("fact");
    expect(writeSet.relationships).toHaveLength(2);

    expect(writeSet.req.properties).toMatchObject({
      id: writeSet.req.id,
      title: CUSTOMER_RETENTION_STATEMENT,
      status: "open",
      source: `.kb/requirements/${writeSet.req.id}.md`,
      text_ref: CUSTOMER_RETENTION_CLAIM.provenance,
    });
    expect(writeSet.req.properties.tags).toEqual(
      expect.arrayContaining([
        "strict-modeling",
        "lane:strict",
        "confidence:0.92",
        "confidence-band:high",
        "provenance:kb-requirements-customer-retention-md-l1",
      ]),
    );

    expect(writeSet.subjectFact.properties).toMatchObject({
      id: writeSet.subjectFact.id,
      fact_kind: "subject",
      subject_key: "customer.data",
      canonical_key: "customer.data",
      source: `.kb/facts/${writeSet.subjectFact.id}.md`,
    });
    expect(writeSet.propertyFact.properties).toMatchObject({
      id: writeSet.propertyFact.id,
      fact_kind: "property_value",
      subject_key: "customer.data",
      property_key: "retention_years",
      operator: "eq",
      value_type: "int",
      value_int: 7,
      canonical_key:
        "kb-requirements-customer-retention-md:customer.data:retention_years:eq:7",
      source: `.kb/facts/${writeSet.propertyFact.id}.md`,
    });

    expect(writeSet.relationships).toEqual(
      expect.arrayContaining([
        {
          type: "constrains",
          from: writeSet.req.id,
          to: writeSet.subjectFact.id,
          source: CUSTOMER_RETENTION_CLAIM.source,
          confidence: 0.92,
        },
        {
          type: "requires_property",
          from: writeSet.req.id,
          to: writeSet.propertyFact.id,
          source: CUSTOMER_RETENTION_CLAIM.source,
          confidence: 0.92,
        },
      ]),
    );

    const relationshipKeys = new Set(
      writeSet.relationships.map(
        (relationship) =>
          `${relationship.type}:${relationship.from}:${relationship.to}`,
      ),
    );
    expect(relationshipKeys.size).toBe(writeSet.relationships.length);
  });

  test("keeps strict ids stable and deduplicates identical claims", () => {
    const firstWriteSet = buildStrictWriteSet({
      claim: CUSTOMER_RETENTION_CLAIM,
      statement: CUSTOMER_RETENTION_STATEMENT,
    });
    const secondWriteSet = buildStrictWriteSet({
      claim: CUSTOMER_RETENTION_CLAIM,
      statement: CUSTOMER_RETENTION_STATEMENT,
    });

    expect(firstWriteSet).toEqual(secondWriteSet);

    const modeled = modelRequirementClaims([
      {
        claim: CUSTOMER_RETENTION_CLAIM,
        statement: CUSTOMER_RETENTION_STATEMENT,
      },
      {
        claim: CUSTOMER_RETENTION_CLAIM,
        statement: CUSTOMER_RETENTION_STATEMENT,
      },
    ]);

    expect(modeled).toHaveLength(1);
    expect(modeled[0]).toEqual(firstWriteSet);
  });

  test("a named requirement id replaces the minted REQ-AUTO id and keeps the claim ids", () => {
    const minted = buildStrictWriteSet({
      claim: CUSTOMER_RETENTION_CLAIM,
      statement: CUSTOMER_RETENTION_STATEMENT,
    });
    const named = buildStrictWriteSet({
      claim: CUSTOMER_RETENTION_CLAIM,
      statement: CUSTOMER_RETENTION_STATEMENT,
      requirementId: "REQ-customer-data-retention",
    });
    if (!minted.isStrict || !named.isStrict) throw new Error("expected strict");
    expect(named.req.id).toBe("REQ-customer-data-retention");
    expect(named.req.properties.id).toBe("REQ-customer-data-retention");
    expect(named.req.properties.source).toBe(
      ".kb/requirements/REQ-customer-data-retention.md",
    );
    expect(
      named.relationships.map((relationship) => relationship.from),
    ).toEqual(["REQ-customer-data-retention", "REQ-customer-data-retention"]);
    // Fact ids, subject_key and the claim stay derived from the claim.
    expect(named.subjectFact).toEqual(minted.subjectFact);
    expect(named.propertyFact).toEqual(minted.propertyFact);
  });

  test("downgrades low-confidence claims into a single observation artifact", () => {
    const writeSet = buildStrictWriteSet({
      claim: {
        ...CUSTOMER_RETENTION_CLAIM,
        confidence: 0.42,
      },
      statement: CUSTOMER_RETENTION_STATEMENT,
    });

    expect(writeSet.isStrict).toBe(false);
    expect(writeSet.confidence).toBe(0.42);
    if (writeSet.isStrict) {
      throw new Error("Expected observation write set");
    }
    expect(
      (writeSet as unknown as Record<string, unknown>).req,
    ).toBeUndefined();
    expect(
      (writeSet as unknown as Record<string, unknown>).subjectFact,
    ).toBeUndefined();
    expect(
      (writeSet as unknown as Record<string, unknown>).propertyFact,
    ).toBeUndefined();
    expect(
      (writeSet as unknown as Record<string, unknown>).relationships,
    ).toHaveLength(0);

    expect(writeSet.observationFact.type).toBe("fact");
    expect(writeSet.observationFact.properties).toMatchObject({
      id: writeSet.observationFact.id,
      title: CUSTOMER_RETENTION_STATEMENT,
      status: "active",
      fact_kind: "observation",
      source: `.kb/facts/${writeSet.observationFact.id}.md`,
      text_ref: CUSTOMER_RETENTION_CLAIM.provenance,
      subject_key: "customer.data",
      property_key: "retention_years",
      canonical_key:
        "kb-requirements-customer-retention-md:customer.data:retention_years:eq:7",
    });
    expect(writeSet.observationFact.properties.tags).toEqual(
      expect.arrayContaining([
        "strict-modeling",
        "lane:observation",
        "review:required",
        "confidence:0.42",
        "confidence-band:low",
      ]),
    );
  });
});

import { isolateKibiEnv } from "../helpers/in-process-workspace.js";
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

describe("strict-modeling leftover operators and guards", () => {
  test("normalize keys reject empty values and collapse punctuation", () => {
    expect(normalizeSubjectKey("A/B\\\\C...")).toBe("a.b.c");
    expect(normalizePropertyKey("  Foo--Bar  ")).toBe("foo_bar");
    expect(() => normalizeSubjectKey("...")).toThrow(/subjectKey/);
    expect(() => normalizePropertyKey("!!!")).toThrow(/propertyKey/);
  });

  test("buildStableRequirementIds and write sets cover operators and types", () => {
    expect(() => buildStableRequirementIds(claim({ source: "!!!" }))).toThrow(
      /source must normalize/,
    );
    expect(
      buildStableRequirementIds(claim({ value: "  " })).normalizedValue,
    ).toBe("empty");
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

let restoreEnv: (() => void) | undefined;
afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
});
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
    expect(() => normalizeTextRef("  ", "  ")).toThrow(
      "Strict modeling requires claim provenance or source",
    );
    expect(normalizeTextRef("  ", "src.md")).toBe("src.md");
    expect(normalizeTextRef("prov.md", "src.md")).toBe("prov.md");
  });
});
