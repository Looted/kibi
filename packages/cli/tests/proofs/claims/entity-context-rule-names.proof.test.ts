import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ENTITY_CONTEXT_ACKNOWLEDGED_RULE,
  ENTITY_CONTEXT_MISSING_RULE,
} from "../../../../cli/src/public/operations/entity-context.js";

// implements REQ-kb-entity-context-rule-names

/**
 * The names kibi check reports missing and acknowledged entity context under. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** An entity without a context body shall be reported as entity-context-missing. */
export function ruleEntityContextMissingCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rule-entity-context-missing",
    symbolId: "SYM-const-entity-context-missing-rule",
    value: ENTITY_CONTEXT_MISSING_RULE,
  });
}

/** An acknowledged missing context shall be reported as entity-context-acknowledged. */
export function ruleEntityContextAcknowledgedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rule-entity-context-acknowledged",
    symbolId: "SYM-const-entity-context-acknowledged-rule",
    value: ENTITY_CONTEXT_ACKNOWLEDGED_RULE,
  });
}

describe("Entity context check rule names", () => {
  test("An entity without a context body shall be reported as entity-context-missing", () => {
    writeCodeCertificate(ruleEntityContextMissingCertificate());
    expect(ENTITY_CONTEXT_MISSING_RULE).toBe("entity-context-missing");
  });

  test("An acknowledged missing context shall be reported as entity-context-acknowledged", () => {
    writeCodeCertificate(ruleEntityContextAcknowledgedCertificate());
    expect(ENTITY_CONTEXT_ACKNOWLEDGED_RULE).toBe(
      "entity-context-acknowledged",
    );
  });
});
