import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { STAGED_FILE_COVERAGE_RESULT_VERSION } from "../../../src/traceability/staged-file-coverage.js";

// implements REQ-staged-file-coverage-version

/**
 * The version of the staged file coverage result. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The staged file coverage result version shall be kibi.staged-file-coverage.v1. */
export function stagedFileCoverageVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-staged-file-coverage-version",
    symbolId: "SYM-staged-file-coverage-version",
    value: STAGED_FILE_COVERAGE_RESULT_VERSION,
  });
}

describe("Staged file coverage result version", () => {
  test("The staged file coverage result version shall be kibi.staged-file-coverage.v1", () => {
    writeCodeCertificate(stagedFileCoverageVersionCertificate());
    expect(STAGED_FILE_COVERAGE_RESULT_VERSION).toBe(
      "kibi.staged-file-coverage.v1",
    );
  });
});
