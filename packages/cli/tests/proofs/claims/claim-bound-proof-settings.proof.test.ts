import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { PROOF_RECEIPT_OUTCOMES } from "../../../src/public/proof-receipt.js";
import {
  CLAIM_BINDING_SCHEMA_VERSION,
  PROOF_CONTRACT_CLAIMS_RULE,
} from "../../../src/public/operations/proof-contract-claims.js";

// implements REQ-kibi-claim-bound-proof-settings

/**
 * The receipt outcomes, schema version and check rule of claim-bound proofs. Kibi
 * reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted. */
export async function proofReceiptOutcomesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-proof-receipt-outcomes",
    domain: {
      symbolId: "SYM-proof-receipt-outcomes",
      members: [...PROOF_RECEIPT_OUTCOMES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** Claim-bound proofs shall start at KB schema version 12. */
export function claimBindingSchemaVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-claim-binding-schema-version",
    variable: "claim_binding_schema_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: CLAIM_BINDING_SCHEMA_VERSION }],
    claim: { operator: "eq", value: 12 },
  });
}

/** The proof contract claims check rule shall be proof-contract-claims. */
export function proofContractClaimsRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-contract-claims-rule",
    symbolId: "SYM-const-proof-contract-claims-rule",
    value: PROOF_CONTRACT_CLAIMS_RULE,
  });
}

describe("Claim-bound proof receipts and rule", () => {
  test("A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted", async () => {
    writeCodeCertificate(await proofReceiptOutcomesCertificate());
    expect([...PROOF_RECEIPT_OUTCOMES].sort()).toEqual([
      "cancelled",
      "errored",
      "failed",
      "interrupted",
      "passed",
      "skipped",
      "timed_out",
    ]);
  });

  test("Claim-bound proofs shall start at KB schema version 12", () => {
    writeCodeCertificate(claimBindingSchemaVersionCertificate());
    expect(CLAIM_BINDING_SCHEMA_VERSION).toBe(12);
  });

  test("The proof contract claims check rule shall be proof-contract-claims", () => {
    writeCodeCertificate(proofContractClaimsRuleCertificate());
    expect(PROOF_CONTRACT_CLAIMS_RULE).toBe("proof-contract-claims");
  });
});
