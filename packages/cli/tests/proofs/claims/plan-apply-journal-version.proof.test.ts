import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { PLAN_APPLY_JOURNAL_VERSION } from "../../../src/operations/mutation/plan-apply-journal.js";

// implements REQ-kibi-plan-apply-journal-version

/**
 * The version of the journal an applied plan writes. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The plan apply journal version shall be kibi.plan-apply-journal.v1. */
export function planApplyJournalVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-plan-apply-journal-version",
    symbolId: "SYM-const-plan-apply-journal-version",
    value: PLAN_APPLY_JOURNAL_VERSION,
  });
}

describe("Plan apply journal version", () => {
  test("The plan apply journal version shall be kibi.plan-apply-journal.v1", () => {
    writeCodeCertificate(planApplyJournalVersionCertificate());
    expect(PLAN_APPLY_JOURNAL_VERSION).toBe("kibi.plan-apply-journal.v1");
  });
});
