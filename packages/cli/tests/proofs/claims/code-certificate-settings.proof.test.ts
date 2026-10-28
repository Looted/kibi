import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { CODE_CERTIFICATE_VERSION } from "../../../src/public/proof-protocol.js";
import { PROOF_CERTIFICATES_ENV } from "../../../src/public/proof-certificates.js";
import { REFERENCE_EXTRACTS } from "../../../src/public/proof-sources.js";
import { MAX_TABLE_ROWS } from "../../../src/operations/proof/code-models.js";

// implements REQ-kibi-code-certificate-settings

/**
 * The version of a code certificate, the variable that turns certificates on, the reference extracts a source proof may read and the table row bound. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The code certificate version shall be kibi.code-certificate.v1. */
export function codeCertificateVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-code-certificate-version",
    symbolId: "SYM-const-code-certificate-version",
    value: CODE_CERTIFICATE_VERSION,
  });
}

/** The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES. */
export function proofCertificatesEnvCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-certificates-env",
    symbolId: "SYM-const-proof-certificates-env",
    value: PROOF_CERTIFICATES_ENV,
  });
}

/** A reference extract shall be env, imports, calls, string_args, thrown or property. */
export async function referenceExtractsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-reference-extracts",
    domain: {
      symbolId: "SYM-const-reference-extracts",
      members: [...REFERENCE_EXTRACTS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A proof table model shall hold at most 100000 rows. */
export function maxTableRowsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-max-table-rows",
    variable: "max_table_rows",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_TABLE_ROWS }],
    claim: { operator: "eq", value: 100000 },
  });
}

describe("Code certificate version, extracts and limits", () => {
  test("The code certificate version shall be kibi.code-certificate.v1", () => {
    writeCodeCertificate(codeCertificateVersionCertificate());
    expect(CODE_CERTIFICATE_VERSION).toBe("kibi.code-certificate.v1");
  });

  test("The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES", () => {
    writeCodeCertificate(proofCertificatesEnvCertificate());
    expect(PROOF_CERTIFICATES_ENV).toBe("KIBI_PROOF_CERTIFICATES");
  });

  test("A reference extract shall be env, imports, calls, string_args, thrown or property", async () => {
    writeCodeCertificate(await referenceExtractsCertificate());
    expect([...REFERENCE_EXTRACTS].sort()).toEqual([
      "calls",
      "env",
      "imports",
      "property",
      "string_args",
      "thrown",
    ]);
  });

  test("A proof table model shall hold at most 100000 rows", () => {
    writeCodeCertificate(maxTableRowsCertificate());
    expect(MAX_TABLE_ROWS).toBe(100000);
  });
});
