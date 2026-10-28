import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ENTITY_ORIGIN_KINDS,
  SCHEMA6_MIGRATION_ORIGIN_REF,
} from "../../../src/public/entity-origin.js";
import { ORIGIN_REVIEW_RULES } from "../../../src/public/operations/origin-review.js";

// implements REQ-kibi-entity-origin-vocabulary

/**
 * The origin kinds, the migration origin reference and the origin review rules.
 * Kibi reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** An entity origin kind shall be human, agent, migration or import. */
export async function entityOriginKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-entity-origin-kinds",
    domain: {
      symbolId: "SYM-const-entity-origin-kinds",
      members: [...ENTITY_ORIGIN_KINDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The schema 6 migration origin reference shall be kibi migrate v5->v6. */
export function schema6MigrationOriginRefCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-schema6-migration-origin-ref",
    symbolId: "SYM-const-schema6-migration-origin-ref",
    value: SCHEMA6_MIGRATION_ORIGIN_REF,
  });
}

/** The origin review rules shall be exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved and requirement-rationale-missing. */
export async function originReviewRulesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-origin-review-rules",
    domain: {
      symbolId: "SYM-const-origin-review-rules",
      members: [...ORIGIN_REVIEW_RULES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Entity origin kinds and review rules", () => {
  test("An entity origin kind shall be human, agent, migration or import", async () => {
    writeCodeCertificate(await entityOriginKindsCertificate());
    expect([...ENTITY_ORIGIN_KINDS].sort()).toEqual([
      "agent",
      "human",
      "import",
      "migration",
    ]);
  });

  test("The schema 6 migration origin reference shall be kibi migrate v5->v6", () => {
    writeCodeCertificate(schema6MigrationOriginRefCertificate());
    expect(SCHEMA6_MIGRATION_ORIGIN_REF).toBe("kibi migrate v5->v6");
  });

  test("The origin review rules shall be exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved and requirement-rationale-missing", async () => {
    writeCodeCertificate(await originReviewRulesCertificate());
    expect([...ORIGIN_REVIEW_RULES].sort()).toEqual([
      "agent-requirement-unapproved",
      "exception-approval-self-attested",
      "exception-unapproved",
      "requirement-rationale-missing",
    ]);
  });
});
