import { describe, expect, test } from "bun:test";
import { NEAR_RESTATEMENT_JACCARD } from "../../../src/operations/bootstrap/claim-restatement.js";
import {
  MIN_APPLICABILITY_SCORE,
  WEAK_CANDIDATE_MARGIN,
} from "../../../src/operations/modeling/predicate-applicability.js";
import {
  arithmeticCertificate,
  type CodeCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

// implements REQ-kibi-predicate-suggestion-thresholds, REQ-bootstrap-claim-restatement-threshold

/**
 * Numeric thresholds the code exports. Each certificate assumes the value the
 * code holds; Kibi reads the same export again at ingest (the contract's
 * value_source) and decides the claim's fact against it.
 */
function thresholdCertificate(
  testId: string,
  variable: string,
  value: number,
  claimed: number,
): CodeCertificate {
  return arithmeticCertificate({
    testId,
    variable,
    valueType: "real",
    assumptions: [{ operator: "eq", value }],
    claim: { operator: "eq", value: claimed },
  });
}

/** The applicability threshold is 0.62. */
export function applicabilityThresholdCertificate(): CodeCertificate {
  return thresholdCertificate(
    "TEST-proof-applicability-threshold",
    "applicability_threshold",
    MIN_APPLICABILITY_SCORE,
    0.62,
  );
}

/** The weak-candidate margin is 0.06. */
export function weakCandidateMarginCertificate(): CodeCertificate {
  return thresholdCertificate(
    "TEST-proof-weak-candidate-margin",
    "weak_candidate_margin",
    WEAK_CANDIDATE_MARGIN,
    0.06,
  );
}

/** The close restatement threshold is a Jaccard similarity of 0.8. */
export function nearRestatementJaccardCertificate(): CodeCertificate {
  return thresholdCertificate(
    "TEST-proof-near-restatement-jaccard",
    "near_restatement_jaccard",
    NEAR_RESTATEMENT_JACCARD,
    0.8,
  );
}

describe("numeric threshold claims", () => {
  test("the applicability threshold is 0.62", () => {
    writeCodeCertificate(applicabilityThresholdCertificate());
    expect(MIN_APPLICABILITY_SCORE).toBe(0.62);
  });

  test("the weak-candidate margin is 0.06", () => {
    writeCodeCertificate(weakCandidateMarginCertificate());
    expect(WEAK_CANDIDATE_MARGIN).toBe(0.06);
  });

  test("the close restatement threshold is 0.8", () => {
    writeCodeCertificate(nearRestatementJaccardCertificate());
    expect(NEAR_RESTATEMENT_JACCARD).toBe(0.8);
  });
});
