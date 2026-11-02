import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  CERTIFICATE_PROOF_KINDS,
  PROOF_KINDS,
} from "../../../../cli/src/public/proof-protocol.js";
import { SOURCE_READERS } from "../../../../cli/src/public/proof-sources.js";
import { CLAIM_BINDING_VERDICTS } from "../../../../cli/src/public/proof-receipt.js";

// implements REQ-kibi-proof-vocabulary

/**
 * The proof kinds a contract may declare, the kinds Kibi re-checks with a certificate, the readers a source proof may use and the verdicts a claim binding can get. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. */
export async function proofContractKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-proof-contract-kinds",
    domain: { symbolId: "SYM-proof-kinds", members: [...PROOF_KINDS] },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source. */
export async function certificateProofKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-certificate-proof-kinds",
    domain: {
      symbolId: "SYM-const-certificate-proof-kinds",
      members: [...CERTIFICATE_PROOF_KINDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A source proof reader shall be json, yaml, glob, openapi, references, schema, routes, validator or prolog. */
export async function sourceProofReadersCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-source-proof-readers",
    domain: {
      symbolId: "SYM-const-source-readers",
      members: [...SOURCE_READERS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A claim binding verdict shall be derived, attested or rejected. */
export async function claimBindingVerdictsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-claim-binding-verdicts",
    domain: {
      symbolId: "SYM-claim-binding-verdicts",
      members: [...CLAIM_BINDING_VERDICTS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Proof kinds, source readers and binding verdicts", () => {
  test("A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source", async () => {
    writeCodeCertificate(await proofContractKindsCertificate());
    expect([...PROOF_KINDS].sort()).toEqual([
      "arithmetic",
      "e2e",
      "example",
      "exhaustive",
      "property",
      "regex",
      "rule",
      "smt",
      "source",
      "state_machine",
      "typecheck",
    ]);
  });

  test("A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source", async () => {
    writeCodeCertificate(await certificateProofKindsCertificate());
    expect([...CERTIFICATE_PROOF_KINDS].sort()).toEqual([
      "arithmetic",
      "exhaustive",
      "regex",
      "rule",
      "smt",
      "source",
      "state_machine",
      "typecheck",
    ]);
  });

  test("A source proof reader shall be json, yaml, glob, openapi, references, schema, routes, validator or prolog", async () => {
    writeCodeCertificate(await sourceProofReadersCertificate());
    expect([...SOURCE_READERS].sort()).toEqual([
      "glob",
      "json",
      "openapi",
      "prolog",
      "references",
      "routes",
      "schema",
      "validator",
      "yaml",
    ]);
  });

  test("A claim binding verdict shall be derived, attested or rejected", async () => {
    writeCodeCertificate(await claimBindingVerdictsCertificate());
    expect([...CLAIM_BINDING_VERDICTS].sort()).toEqual([
      "attested",
      "derived",
      "rejected",
    ]);
  });
});
