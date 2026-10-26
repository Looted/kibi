import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  failedCalls,
  ruleCertificate,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import {
  PROOF_KINDS,
  isCertificateProofKind,
} from "../../src/public/proof-protocol.js";

// implements REQ-kibi-non-numeric-proof-kinds

/**
 * Rule, state_machine and regex are certificate proof kinds: the rule
 * certificate records isCertificateProofKind decided for every proof kind,
 * which Kibi re-evaluates from proof-protocol.ts and checks against the set
 * fact naming the three kinds.
 */
async function nonNumericProofKindsCertificate(): Promise<CodeCertificate> {
  return ruleCertificate({
    testId: "TEST-kibi-non-numeric-proof-kinds-rule",
    domains: {
      proof_kind: { symbolId: "SYM-proof-kinds", members: PROOF_KINDS },
    },
    predicates: {
      certificate_proof_kind: {
        symbolId: "SYM-is-certificate-proof-kind",
        argTypes: ["proof_kind"],
        decide: isCertificateProofKind,
      },
    },
  });
}

describe("non-numeric proof kinds, proved by a rule certificate", () => {
  test("rule, state_machine and regex are certificate proof kinds", async () => {
    const certificate = await nonNumericProofKindsCertificate();
    writeCodeCertificate(certificate);
    expect(failedCalls(certificate)).toEqual([]);
    for (const kind of ["rule", "state_machine", "regex"] as const)
      expect(isCertificateProofKind(kind)).toBe(true);
  });
});
