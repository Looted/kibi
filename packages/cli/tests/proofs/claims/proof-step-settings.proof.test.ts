import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  PROOF_TEST_REPORT_ENV,
  PROOF_TEST_REPORT_OUTCOMES,
  PROOF_TEST_REPORT_VERSION,
} from "../../../src/proof/command-test-report.js";
import { DEFAULT_PROOF_STEPS_PATH } from "../../../src/proof/step-runner.js";

// implements REQ-kibi-proof-step-settings

/**
 * Where proof steps live and how a command integration reports per-test results.
 * Kibi reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** The default proof steps file shall be proof/steps.json. */
export function defaultProofStepsPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-default-proof-steps-path",
    symbolId: "SYM-const-default-proof-steps-path",
    value: DEFAULT_PROOF_STEPS_PATH,
  });
}

/** The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT. */
export function proofTestReportEnvCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-test-report-env",
    symbolId: "SYM-const-proof-test-report-env",
    value: PROOF_TEST_REPORT_ENV,
  });
}

/** The per-test proof report version shall be kibi.proof-test-report.v1. */
export function proofTestReportVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-test-report-version",
    symbolId: "SYM-const-proof-test-report-version",
    value: PROOF_TEST_REPORT_VERSION,
  });
}

/** A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted. */
export async function proofTestReportOutcomesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-proof-test-report-outcomes",
    domain: {
      symbolId: "SYM-const-proof-test-report-outcomes",
      members: [...PROOF_TEST_REPORT_OUTCOMES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Proof step and per-test report settings", () => {
  test("The default proof steps file shall be proof/steps.json", () => {
    writeCodeCertificate(defaultProofStepsPathCertificate());
    expect(DEFAULT_PROOF_STEPS_PATH).toBe("proof/steps.json");
  });

  test("The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT", () => {
    writeCodeCertificate(proofTestReportEnvCertificate());
    expect(PROOF_TEST_REPORT_ENV).toBe("KIBI_PROOF_TEST_REPORT");
  });

  test("The per-test proof report version shall be kibi.proof-test-report.v1", () => {
    writeCodeCertificate(proofTestReportVersionCertificate());
    expect(PROOF_TEST_REPORT_VERSION).toBe("kibi.proof-test-report.v1");
  });

  test("A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted", async () => {
    writeCodeCertificate(await proofTestReportOutcomesCertificate());
    expect([...PROOF_TEST_REPORT_OUTCOMES].sort()).toEqual([
      "errored",
      "failed",
      "interrupted",
      "passed",
      "timed_out",
    ]);
  });
});
