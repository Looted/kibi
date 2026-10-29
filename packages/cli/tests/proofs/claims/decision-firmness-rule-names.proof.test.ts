import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  DECISION_FIRM_EDITED_RULE,
  DECISION_FIRM_SUPERSEDED_RULE,
  DECISION_FIRM_UNREFERENCED_RULE,
  SUPERSEDES_REASON_MISSING_RULE,
} from "../../../../cli/src/public/operations/decision-firmness.js";

// implements REQ-kb-decision-firmness-rule-names

/**
 * The names kibi check reports decision firmness findings under. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** An unreferenced firm decision shall be reported as decision-firm-unreferenced. */
export function ruleDecisionFirmUnreferencedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rule-decision-firm-unreferenced",
    symbolId: "SYM-decision-firmness-firm-unreferenced-rule",
    value: DECISION_FIRM_UNREFERENCED_RULE,
  });
}

/** A superseded firm decision shall be reported as decision-firm-superseded. */
export function ruleDecisionFirmSupersededCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rule-decision-firm-superseded",
    symbolId: "SYM-decision-firmness-firm-superseded-rule",
    value: DECISION_FIRM_SUPERSEDED_RULE,
  });
}

/** An edited firm decision shall be reported as decision-firm-edited. */
export function ruleDecisionFirmEditedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rule-decision-firm-edited",
    symbolId: "SYM-decision-firmness-decision-firm-edited-rule",
    value: DECISION_FIRM_EDITED_RULE,
  });
}

/** A supersedes link without a reason shall be reported as supersedes-reason-missing. */
export function ruleSupersedesReasonMissingCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rule-supersedes-reason-missing",
    symbolId: "SYM-decision-firmness-supersedes-reason-missing-rule",
    value: SUPERSEDES_REASON_MISSING_RULE,
  });
}

describe("Decision firmness check rule names", () => {
  test("An unreferenced firm decision shall be reported as decision-firm-unreferenced", () => {
    writeCodeCertificate(ruleDecisionFirmUnreferencedCertificate());
    expect(DECISION_FIRM_UNREFERENCED_RULE).toBe("decision-firm-unreferenced");
  });

  test("A superseded firm decision shall be reported as decision-firm-superseded", () => {
    writeCodeCertificate(ruleDecisionFirmSupersededCertificate());
    expect(DECISION_FIRM_SUPERSEDED_RULE).toBe("decision-firm-superseded");
  });

  test("An edited firm decision shall be reported as decision-firm-edited", () => {
    writeCodeCertificate(ruleDecisionFirmEditedCertificate());
    expect(DECISION_FIRM_EDITED_RULE).toBe("decision-firm-edited");
  });

  test("A supersedes link without a reason shall be reported as supersedes-reason-missing", () => {
    writeCodeCertificate(ruleSupersedesReasonMissingCertificate());
    expect(SUPERSEDES_REASON_MISSING_RULE).toBe("supersedes-reason-missing");
  });
});
