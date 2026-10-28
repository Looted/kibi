import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  EVIDENCE_FLOOR_RULE,
  EVIDENCE_FLOOR_SCHEMA_VERSION,
} from "../../../src/public/operations/evidence-floor.js";
import {
  AGENT_REQUIREMENT_UNAPPROVED_RULE,
  EXCEPTION_APPROVAL_SELF_ATTESTED_RULE,
  EXCEPTION_UNAPPROVED_RULE,
  REQUIREMENT_RATIONALE_MISSING_RULE,
} from "../../../src/public/operations/origin-review.js";
import {
  POLICY_MARKERS_RULE,
  POLICY_OWNERSHIP_RULE,
} from "../../../src/public/operations/check-policy-rules.js";
import { SYMBOL_GRANULARITY_RULE } from "../../../src/public/operations/symbol-granularity-check.js";
import { SUPERSEDES_REASON_ACKNOWLEDGED_RULE } from "../../../src/public/operations/decision-firmness.js";
import { SCOPED_CHECK_OMITTED_ID } from "../../../src/public/operations/check-helpers.js";

// implements REQ-kibi-check-rule-names

/**
 * The rule names kb_check reports its findings under. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The evidence floor check rule shall be evidence-floor. */
export function evidenceFloorRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-evidence-floor-rule",
    symbolId: "SYM-const-evidence-floor-rule",
    value: EVIDENCE_FLOOR_RULE,
  });
}

/** Evidence floors shall start at KB schema version 11. */
export function evidenceFloorSchemaVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-evidence-floor-schema-version",
    variable: "evidence_floor_schema",
    valueType: "int",
    assumptions: [{ operator: "eq", value: EVIDENCE_FLOOR_SCHEMA_VERSION }],
    claim: { operator: "eq", value: 11 },
  });
}

/** The unapproved agent requirement rule shall be agent-requirement-unapproved. */
export function agentRequirementUnapprovedRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-agent-requirement-unapproved-rule",
    symbolId: "SYM-const-agent-requirement-unapproved-rule",
    value: AGENT_REQUIREMENT_UNAPPROVED_RULE,
  });
}

/** The unapproved exception rule shall be exception-unapproved. */
export function exceptionUnapprovedRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-exception-unapproved-rule",
    symbolId: "SYM-const-exception-unapproved-rule",
    value: EXCEPTION_UNAPPROVED_RULE,
  });
}

/** The self-attested exception approval rule shall be exception-approval-self-attested. */
export function exceptionSelfAttestedRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-exception-self-attested-rule",
    symbolId: "SYM-const-exception-approval-self-attested-rule",
    value: EXCEPTION_APPROVAL_SELF_ATTESTED_RULE,
  });
}

/** The missing requirement rationale rule shall be requirement-rationale-missing. */
export function rationaleMissingRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rationale-missing-rule",
    symbolId: "SYM-const-requirement-rationale-missing-rule",
    value: REQUIREMENT_RATIONALE_MISSING_RULE,
  });
}

/** The policy markers rule shall be policy-markers. */
export function policyMarkersRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-policy-markers-rule",
    symbolId: "SYM-const-policy-markers-rule",
    value: POLICY_MARKERS_RULE,
  });
}

/** The policy ownership rule shall be policy-ownership. */
export function policyOwnershipRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-policy-ownership-rule",
    symbolId: "SYM-const-policy-ownership-rule",
    value: POLICY_OWNERSHIP_RULE,
  });
}

/** The symbol granularity rule shall be symbol-granularity. */
export function symbolGranularityRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-symbol-granularity-rule",
    symbolId: "SYM-const-symbol-granularity-rule",
    value: SYMBOL_GRANULARITY_RULE,
  });
}

/** The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged. */
export function supersedesAcknowledgedRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-supersedes-acknowledged-rule",
    symbolId: "SYM-decision-firmness-supersedes-reason-acknowledged-rule",
    value: SUPERSEDES_REASON_ACKNOWLEDGED_RULE,
  });
}

/** The scoped check omission note id shall be scoped_check_omitted_quality. */
export function scopedCheckOmittedIdCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-scoped-check-omitted-id",
    symbolId: "SYM-const-scoped-check-omitted-id",
    value: SCOPED_CHECK_OMITTED_ID,
  });
}

describe("kb_check rule names", () => {
  test("The evidence floor check rule shall be evidence-floor", () => {
    writeCodeCertificate(evidenceFloorRuleCertificate());
    expect(EVIDENCE_FLOOR_RULE).toBe("evidence-floor");
  });

  test("Evidence floors shall start at KB schema version 11", () => {
    writeCodeCertificate(evidenceFloorSchemaVersionCertificate());
    expect(EVIDENCE_FLOOR_SCHEMA_VERSION).toBe(11);
  });

  test("The unapproved agent requirement rule shall be agent-requirement-unapproved", () => {
    writeCodeCertificate(agentRequirementUnapprovedRuleCertificate());
    expect(AGENT_REQUIREMENT_UNAPPROVED_RULE).toBe(
      "agent-requirement-unapproved",
    );
  });

  test("The unapproved exception rule shall be exception-unapproved", () => {
    writeCodeCertificate(exceptionUnapprovedRuleCertificate());
    expect(EXCEPTION_UNAPPROVED_RULE).toBe("exception-unapproved");
  });

  test("The self-attested exception approval rule shall be exception-approval-self-attested", () => {
    writeCodeCertificate(exceptionSelfAttestedRuleCertificate());
    expect(EXCEPTION_APPROVAL_SELF_ATTESTED_RULE).toBe(
      "exception-approval-self-attested",
    );
  });

  test("The missing requirement rationale rule shall be requirement-rationale-missing", () => {
    writeCodeCertificate(rationaleMissingRuleCertificate());
    expect(REQUIREMENT_RATIONALE_MISSING_RULE).toBe(
      "requirement-rationale-missing",
    );
  });

  test("The policy markers rule shall be policy-markers", () => {
    writeCodeCertificate(policyMarkersRuleCertificate());
    expect(POLICY_MARKERS_RULE).toBe("policy-markers");
  });

  test("The policy ownership rule shall be policy-ownership", () => {
    writeCodeCertificate(policyOwnershipRuleCertificate());
    expect(POLICY_OWNERSHIP_RULE).toBe("policy-ownership");
  });

  test("The symbol granularity rule shall be symbol-granularity", () => {
    writeCodeCertificate(symbolGranularityRuleCertificate());
    expect(SYMBOL_GRANULARITY_RULE).toBe("symbol-granularity");
  });

  test("The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged", () => {
    writeCodeCertificate(supersedesAcknowledgedRuleCertificate());
    expect(SUPERSEDES_REASON_ACKNOWLEDGED_RULE).toBe(
      "supersedes-reason-acknowledged",
    );
  });

  test("The scoped check omission note id shall be scoped_check_omitted_quality", () => {
    writeCodeCertificate(scopedCheckOmittedIdCertificate());
    expect(SCOPED_CHECK_OMITTED_ID).toBe("scoped_check_omitted_quality");
  });
});
