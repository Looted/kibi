import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SIGNOFF_FENCES } from "../../../src/signoff/model.js";

// implements REQ-kibi-signoff-fences

/**
 * The fence info strings host renderers look for in a signoff view. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The signoff summary fence shall be kibi-signoff. */
export function signoffSummaryFenceCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-summary-fence",
    symbolId: "SYM-cli-signoff-model-signoff-fences",
    value: SIGNOFF_FENCES.summary,
  });
}

/** The signoff questions fence shall be kibi-questions. */
export function signoffQuestionsFenceCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-questions-fence",
    symbolId: "SYM-cli-signoff-model-signoff-fences",
    value: SIGNOFF_FENCES.questions,
  });
}

describe("Signoff fence names", () => {
  test("The signoff summary fence shall be kibi-signoff", () => {
    writeCodeCertificate(signoffSummaryFenceCertificate());
    expect(SIGNOFF_FENCES.summary).toBe("kibi-signoff");
  });

  test("The signoff questions fence shall be kibi-questions", () => {
    writeCodeCertificate(signoffQuestionsFenceCertificate());
    expect(SIGNOFF_FENCES.questions).toBe("kibi-questions");
  });
});
