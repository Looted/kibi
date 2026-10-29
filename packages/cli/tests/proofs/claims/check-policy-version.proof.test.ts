import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { CHECK_POLICY_CONTRACT_VERSION } from "../../../../plugin-sdk/src/capabilities/check-policy.js";

// implements REQ-capability-check-policy-version

/**
 * The contract version a check policy plugin declares. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A check policy plugin contract shall be kibi.check-policy.v1. */
export function checkPolicyContractVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-check-policy-contract-version",
    symbolId: "SYM-const-check-policy-contract-version",
    value: CHECK_POLICY_CONTRACT_VERSION,
  });
}

describe("Check policy contract version", () => {
  test("A check policy plugin contract shall be kibi.check-policy.v1", () => {
    writeCodeCertificate(checkPolicyContractVersionCertificate());
    expect(CHECK_POLICY_CONTRACT_VERSION).toBe("kibi.check-policy.v1");
  });
});
