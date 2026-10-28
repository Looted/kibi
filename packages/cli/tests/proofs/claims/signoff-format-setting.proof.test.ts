import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SIGNOFF_FORMAT_ENV } from "../../../src/commands/signoff.js";

// implements REQ-kibi-signoff-format-setting

/**
 * The environment variable that picks the kibi signoff output format. Kibi reads
 * the constant itself at ingest, so the certificate is checked against the code.
 */

/** The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT. */
export function signoffFormatEnvCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-format-env",
    symbolId: "SYM-cli-signoff-signoff-format-env",
    value: SIGNOFF_FORMAT_ENV,
  });
}

describe("Kibi signoff format environment variable", () => {
  test("The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT", () => {
    writeCodeCertificate(signoffFormatEnvCertificate());
    expect(SIGNOFF_FORMAT_ENV).toBe("KIBI_SIGNOFF_FORMAT");
  });
});
