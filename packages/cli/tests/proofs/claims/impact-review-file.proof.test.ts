import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { IMPACT_REVIEW_PATH } from "../../../src/traceability/impact-review.js";

// implements REQ-impact-review-file

/**
 * The file a content-bound impact review is written to. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The impact review file shall be .kibi/impact-review.json. */
export function impactReviewPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-impact-review-path",
    symbolId: "SYM-const-impact-review-path",
    value: IMPACT_REVIEW_PATH,
  });
}

describe("Impact review file", () => {
  test("The impact review file shall be .kibi/impact-review.json", () => {
    writeCodeCertificate(impactReviewPathCertificate());
    expect(IMPACT_REVIEW_PATH).toBe(".kibi/impact-review.json");
  });
});
