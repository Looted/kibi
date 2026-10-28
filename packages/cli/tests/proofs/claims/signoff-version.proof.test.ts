import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SIGNOFF_VERSION } from "../../../src/signoff/model.js";

// implements REQ-kibi-signoff-version

/**
 * The version string of a Kibi signoff document. Kibi reads the constant itself
 * at ingest, so the certificate is checked against the code.
 */

/** The Kibi signoff version shall be kibi.signoff.v1. */
export function signoffVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-version",
    symbolId: "SYM-cli-signoff-model-signoff-version",
    value: SIGNOFF_VERSION,
  });
}

describe("Kibi signoff document version", () => {
  test("The Kibi signoff version shall be kibi.signoff.v1", () => {
    writeCodeCertificate(signoffVersionCertificate());
    expect(SIGNOFF_VERSION).toBe("kibi.signoff.v1");
  });
});
