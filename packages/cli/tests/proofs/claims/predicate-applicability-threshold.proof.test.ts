import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { STRONG_APPLICABILITY_SCORE } from "../../../src/operations/modeling/predicate-applicability.js";

// implements REQ-predicate-applicability-threshold

/**
 * The score at which a predicate suggestion counts as a strong match. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** A strong predicate applicability score shall be 0.8. */
export function strongApplicabilityScoreCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-strong-applicability-score",
    variable: "strong_score",
    valueType: "real",
    assumptions: [{ operator: "eq", value: STRONG_APPLICABILITY_SCORE }],
    claim: { operator: "eq", value: 0.8 },
  });
}

describe("Strong predicate applicability score", () => {
  test("A strong predicate applicability score shall be 0.8", () => {
    writeCodeCertificate(strongApplicabilityScoreCertificate());
    expect(STRONG_APPLICABILITY_SCORE).toBe(0.8);
  });
});
