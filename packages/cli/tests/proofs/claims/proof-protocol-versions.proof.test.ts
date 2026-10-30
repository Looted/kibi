import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  PROOF_CONTRACT_VERSION,
  PROOF_INTEGRATION_VERSION,
  PROOF_RECEIPT_VERSION,
  PROOF_RUN_OUTCOMES,
  PROOF_RUN_VERSION,
} from "../../../src/public/proof-protocol.js";

// implements REQ-kibi-proof-protocol-versions

/**
 * The version strings and run outcomes of Kibi's proof protocol. Kibi reads each
 * constant itself at ingest, so the certificate is checked against the code.
 */

/** The proof contract version shall be kibi.proof-contract.v1. */
export function proofContractVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-contract-version",
    symbolId: "SYM-proof-contract-version",
    value: PROOF_CONTRACT_VERSION,
  });
}

/** The proof receipt version shall be kibi.proof-receipt.v2. */
export function proofReceiptVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-receipt-version",
    symbolId: "SYM-proof-receipt-version",
    value: PROOF_RECEIPT_VERSION,
  });
}

/** The proof run version shall be kibi.proof-run.v1. */
export function proofRunVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-run-version",
    symbolId: "SYM-proof-run-version",
    value: PROOF_RUN_VERSION,
  });
}

/** The proof integration version shall be kibi.proof-integration.v1. */
export function proofIntegrationVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-integration-version",
    symbolId: "SYM-proof-integration-version",
    value: PROOF_INTEGRATION_VERSION,
  });
}

/** A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results. */
export async function proofRunOutcomesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-proof-run-outcomes",
    domain: {
      symbolId: "SYM-proof-run-outcomes",
      members: [...PROOF_RUN_OUTCOMES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Proof protocol versions and run outcomes", () => {
  test("The proof contract version shall be kibi.proof-contract.v1", () => {
    writeCodeCertificate(proofContractVersionCertificate());
    expect(PROOF_CONTRACT_VERSION).toBe("kibi.proof-contract.v1");
  });

  test("The proof receipt version shall be kibi.proof-receipt.v2", () => {
    writeCodeCertificate(proofReceiptVersionCertificate());
    expect(PROOF_RECEIPT_VERSION).toBe("kibi.proof-receipt.v2");
  });

  test("The proof run version shall be kibi.proof-run.v1", () => {
    writeCodeCertificate(proofRunVersionCertificate());
    expect(PROOF_RUN_VERSION).toBe("kibi.proof-run.v1");
  });

  test("The proof integration version shall be kibi.proof-integration.v1", () => {
    writeCodeCertificate(proofIntegrationVersionCertificate());
    expect(PROOF_INTEGRATION_VERSION).toBe("kibi.proof-integration.v1");
  });

  test("A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results", async () => {
    writeCodeCertificate(await proofRunOutcomesCertificate());
    expect([...PROOF_RUN_OUTCOMES].sort()).toEqual([
      "cancelled",
      "errored",
      "failed",
      "interrupted",
      "no_results",
      "passed",
      "timed_out",
    ]);
  });
});
