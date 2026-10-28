import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { ENTITY_CONTEXT_RULES } from "../../../src/public/operations/entity-context.js";
import { CONTEXT_MISSING_TAG } from "../../../src/entity-body-context.js";
import { BODY_CONTEXT_SCHEMA_VERSION } from "../../../src/operations/migration/schema6.js";

// implements REQ-kb-entity-context-rule-ids

/**
 * The check rules, review tag and schema version of the entity body context check.
 * Kibi reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** The entity context rules shall be entity-context-missing and entity-context-acknowledged. */
export async function entityContextRulesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-entity-context-rules",
    domain: {
      symbolId: "SYM-const-entity-context-rules",
      members: [...ENTITY_CONTEXT_RULES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The context review tag shall be review:context-missing. */
export function contextMissingTagCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-context-missing-tag",
    symbolId: "SYM-const-context-missing-tag",
    value: CONTEXT_MISSING_TAG,
  });
}

/** The entity body context check shall start at KB schema version 8. */
export function bodyContextSchemaVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-body-context-schema-version",
    variable: "context_schema_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: BODY_CONTEXT_SCHEMA_VERSION }],
    claim: { operator: "eq", value: 8 },
  });
}

describe("Entity body context check rules", () => {
  test("The entity context rules shall be entity-context-missing and entity-context-acknowledged", async () => {
    writeCodeCertificate(await entityContextRulesCertificate());
    expect([...ENTITY_CONTEXT_RULES].sort()).toEqual([
      "entity-context-acknowledged",
      "entity-context-missing",
    ]);
  });

  test("The context review tag shall be review:context-missing", () => {
    writeCodeCertificate(contextMissingTagCertificate());
    expect(CONTEXT_MISSING_TAG).toBe("review:context-missing");
  });

  test("The entity body context check shall start at KB schema version 8", () => {
    writeCodeCertificate(bodyContextSchemaVersionCertificate());
    expect(BODY_CONTEXT_SCHEMA_VERSION).toBe(8);
  });
});
