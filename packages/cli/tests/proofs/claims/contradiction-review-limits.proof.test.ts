import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  MAX_REVIEW_CANDIDATES,
  REVIEW_CANDIDATE_MIN_SCORE,
} from "../../../src/operations/planning/conflict-review.js";

// implements REQ-kibi-contradiction-review-limits

/**
 * How many contradiction review candidates compile-intent lists and how similar
 * they must be. Kibi reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** The minimum contradiction review candidate score shall be 0.1. */
export function reviewCandidateMinScoreCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-review-candidate-min-score",
    variable: "min_candidate_score",
    valueType: "real",
    assumptions: [{ operator: "eq", value: REVIEW_CANDIDATE_MIN_SCORE }],
    claim: { operator: "eq", value: 0.1 },
  });
}

/** Contradiction review shall list at most 5 candidates. */
export function maxReviewCandidatesCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-max-review-candidates",
    variable: "max_candidates",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_REVIEW_CANDIDATES }],
    claim: { operator: "eq", value: 5 },
  });
}

describe("Contradiction review candidate limits", () => {
  test("The minimum contradiction review candidate score shall be 0.1", () => {
    writeCodeCertificate(reviewCandidateMinScoreCertificate());
    expect(REVIEW_CANDIDATE_MIN_SCORE).toBe(0.1);
  });

  test("Contradiction review shall list at most 5 candidates", () => {
    writeCodeCertificate(maxReviewCandidatesCertificate());
    expect(MAX_REVIEW_CANDIDATES).toBe(5);
  });
});
