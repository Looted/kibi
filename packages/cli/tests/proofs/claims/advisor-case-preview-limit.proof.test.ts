import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { CASE_LIMIT } from "../../../src/operations/semantic-advisor/case-preview.js";

// implements REQ-advisor-case-preview-limit

/**
 * How many edge cases the semantic advisor preview lists for one fact. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A semantic advisor case preview shall list at most 12 cases for one fact. */
export function advisorCasePreviewLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-advisor-case-preview-limit",
    variable: "case_limit",
    valueType: "int",
    assumptions: [{ operator: "eq", value: CASE_LIMIT }],
    claim: { operator: "eq", value: 12 },
  });
}

describe("Semantic advisor case preview limit", () => {
  test("A semantic advisor case preview shall list at most 12 cases for one fact", () => {
    writeCodeCertificate(advisorCasePreviewLimitCertificate());
    expect(CASE_LIMIT).toBe(12);
  });
});
