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

import { describe, expect, test } from "bun:test";
import {
  type SemanticClaim,
  buildStableRequirementIds,
  buildStrictWriteSet,
  modelRequirementClaims,
  normalizePropertyKey,
  normalizeSubjectKey,
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
