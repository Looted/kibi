import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { PROOF_RECEIPT_MAX_AGE_SECONDS } from "../../../src/public/proof-receipt.js";

// implements REQ-kibi-proof-receipt-max-age

/**
 * How long a proof receipt counts as fresh. Kibi reads PROOF_RECEIPT_MAX_AGE_SECONDS
 * itself at ingest (value_source), so the certificate is checked against the code.
 */

/** The maximum proof receipt age shall be 604800 seconds. */
export function proofReceiptMaxAgeCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-proof-receipt-max-age",
    variable: "max_receipt_age_seconds",
    valueType: "int",
    assumptions: [{ operator: "eq", value: PROOF_RECEIPT_MAX_AGE_SECONDS }],
    claim: { operator: "eq", value: 604800 },
  });
}

describe("A proof receipt stays fresh for 604800 seconds", () => {
  test("a proof receipt is fresh for seven days", () => {
    writeCodeCertificate(proofReceiptMaxAgeCertificate());
    expect(PROOF_RECEIPT_MAX_AGE_SECONDS).toBe(604800);
  });
});
