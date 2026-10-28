import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  KIBI_LEGACY_ENV_FILE,
  KIBI_PROJECT_ENV_FILE,
} from "../../../src/env/bootstrap.js";

// implements REQ-kibi-env-bootstrap-files

/**
 * The environment files Kibi reads at startup. Kibi reads each constant itself at
 * ingest, so the certificate is checked against the code.
 */

/** The Kibi project environment file shall be .env.kibi. */
export function envProjectFileCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-env-project-file",
    symbolId: "SYM-env-bootstrap-kibi-project-env-file",
    value: KIBI_PROJECT_ENV_FILE,
  });
}

/** The legacy Kibi environment file shall be .env. */
export function envLegacyFileCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-env-legacy-file",
    symbolId: "SYM-env-bootstrap-kibi-legacy-env-file",
    value: KIBI_LEGACY_ENV_FILE,
  });
}

describe("Kibi's environment file names", () => {
  test("The Kibi project environment file shall be .env.kibi", () => {
    writeCodeCertificate(envProjectFileCertificate());
    expect(KIBI_PROJECT_ENV_FILE).toBe(".env.kibi");
  });

  test("The legacy Kibi environment file shall be .env", () => {
    writeCodeCertificate(envLegacyFileCertificate());
    expect(KIBI_LEGACY_ENV_FILE).toBe(".env");
  });
});
