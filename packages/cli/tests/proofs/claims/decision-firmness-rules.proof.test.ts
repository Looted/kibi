import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { DECISION_FIRMNESS_RULES } from "../../../src/public/operations/decision-firmness.js";
import { DEFAULT_FIRMNESS } from "../../../src/decision-firmness.js";
import { DECISION_FIRMNESS_SCHEMA_VERSION } from "../../../src/operations/migration/schema6.js";

// implements REQ-kb-decision-firmness-rule-ids

/**
 * The check rules, default firmness value and schema version of decision firmness.
 * Kibi reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** The decision firmness rules shall be decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing and supersedes-reason-acknowledged. */
export async function decisionFirmnessRulesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-decision-firmness-rules",
    domain: {
      symbolId: "SYM-decision-firmness-rules",
      members: [...DECISION_FIRMNESS_RULES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The default decision firmness shall be default. */
export function defaultFirmnessCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-default-firmness",
    symbolId: "SYM-const-default-firmness",
    value: DEFAULT_FIRMNESS,
  });
}

/** Decision firmness shall start at KB schema version 9. */
export function decisionFirmnessSchemaVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-decision-firmness-schema-version",
    variable: "firmness_schema_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: DECISION_FIRMNESS_SCHEMA_VERSION }],
    claim: { operator: "eq", value: 9 },
  });
}

describe("Decision firmness check rules", () => {
  test("The decision firmness rules shall be decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing and supersedes-reason-acknowledged", async () => {
    writeCodeCertificate(await decisionFirmnessRulesCertificate());
    expect([...DECISION_FIRMNESS_RULES].sort()).toEqual([
      "decision-firm-edited",
      "decision-firm-superseded",
      "decision-firm-unreferenced",
      "supersedes-reason-acknowledged",
      "supersedes-reason-missing",
    ]);
  });

  test("The default decision firmness shall be default", () => {
    writeCodeCertificate(defaultFirmnessCertificate());
    expect(DEFAULT_FIRMNESS).toBe("default");
  });

  test("Decision firmness shall start at KB schema version 9", () => {
    writeCodeCertificate(decisionFirmnessSchemaVersionCertificate());
    expect(DECISION_FIRMNESS_SCHEMA_VERSION).toBe(9);
  });
});
