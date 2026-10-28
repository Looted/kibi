import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  IMPACT_EVALUATOR_VERSION,
  IMPACT_POLICY_PATH,
  IMPACT_POLICY_VERSION,
  IMPACT_REVIEW_VERSION,
} from "../../../src/traceability/impact-review.js";

// implements REQ-impact-review-identifiers

/**
 * The versions and policy file path of a content-bound impact review. Kibi reads
 * every constant itself at ingest, so the certificate is checked against the code.
 */

/** The impact policy file shall be .kibi/impact-policy.json. */
export function impactPolicyPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-impact-policy-path",
    symbolId: "SYM-impact-stage-e-impact-policy-path",
    value: IMPACT_POLICY_PATH,
  });
}

/** The impact policy version shall be kibi.impact-policy.v1. */
export function impactPolicyVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-impact-policy-version",
    symbolId: "SYM-impact-stage-e-impact-policy-version",
    value: IMPACT_POLICY_VERSION,
  });
}

/** The impact review version shall be kibi.impact-review.v1. */
export function impactReviewVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-impact-review-version",
    symbolId: "SYM-impact-stage-e-impact-review-version",
    value: IMPACT_REVIEW_VERSION,
  });
}

/** The impact evaluator version shall be kibi.impact-evaluator.v1. */
export function impactEvaluatorVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-impact-evaluator-version",
    symbolId: "SYM-impact-stage-e-impact-evaluator-version",
    value: IMPACT_EVALUATOR_VERSION,
  });
}

describe("Impact review versions and policy path", () => {
  test("The impact policy file shall be .kibi/impact-policy.json", () => {
    writeCodeCertificate(impactPolicyPathCertificate());
    expect(IMPACT_POLICY_PATH).toBe(".kibi/impact-policy.json");
  });

  test("The impact policy version shall be kibi.impact-policy.v1", () => {
    writeCodeCertificate(impactPolicyVersionCertificate());
    expect(IMPACT_POLICY_VERSION).toBe("kibi.impact-policy.v1");
  });

  test("The impact review version shall be kibi.impact-review.v1", () => {
    writeCodeCertificate(impactReviewVersionCertificate());
    expect(IMPACT_REVIEW_VERSION).toBe("kibi.impact-review.v1");
  });

  test("The impact evaluator version shall be kibi.impact-evaluator.v1", () => {
    writeCodeCertificate(impactEvaluatorVersionCertificate());
    expect(IMPACT_EVALUATOR_VERSION).toBe("kibi.impact-evaluator.v1");
  });
});
