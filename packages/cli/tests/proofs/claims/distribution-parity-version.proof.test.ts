import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { DISTRIBUTION_PARITY_VERSION } from "../../../src/public/distribution-parity.js";

// implements REQ-kibi-distribution-parity-version

/**
 * The version of the distribution parity matrix. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The distribution parity version shall be kibi.distribution-parity.v1. */
export function distributionParityVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-distribution-parity-version",
    symbolId: "SYM-reqcompiler-parity-version",
    value: DISTRIBUTION_PARITY_VERSION,
  });
}

describe("Distribution parity matrix version", () => {
  test("The distribution parity version shall be kibi.distribution-parity.v1", () => {
    writeCodeCertificate(distributionParityVersionCertificate());
    expect(DISTRIBUTION_PARITY_VERSION).toBe("kibi.distribution-parity.v1");
  });
});
