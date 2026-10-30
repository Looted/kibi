import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { DERIVED_KB_PREFIXES, KB_ROOT } from "../../../src/utils/kb-paths.js";
import { KB_MANIFEST_VERSION } from "../../../src/utils/kb-manifest.js";

// implements REQ-cli-kb-layout-paths

/**
 * The KB folder, its derived subfolders and its manifest version. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The KB folder shall be .kb. */
export function kbRootCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-kb-root",
    symbolId: "SYM-canonical-KB_ROOT",
    value: KB_ROOT,
  });
}

/** The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations. */
export async function derivedKbPrefixesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-derived-kb-prefixes",
    domain: {
      symbolId: "SYM-canonical-DERIVED_KB_PREFIXES",
      members: [...DERIVED_KB_PREFIXES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The KB manifest version shall be 1. */
export function kbManifestVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-kb-manifest-version",
    variable: "manifest_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: KB_MANIFEST_VERSION }],
    claim: { operator: "eq", value: 1 },
  });
}

describe("KB folder layout", () => {
  test("The KB folder shall be .kb", () => {
    writeCodeCertificate(kbRootCertificate());
    expect(KB_ROOT).toBe(".kb");
  });

  test("The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations", async () => {
    writeCodeCertificate(await derivedKbPrefixesCertificate());
    expect([...DERIVED_KB_PREFIXES].sort()).toEqual([
      ".kb/branches",
      ".kb/briefs",
      ".kb/migrations",
      ".kb/proof/runs",
      ".kb/recovery",
    ]);
  });

  test("The KB manifest version shall be 1", () => {
    writeCodeCertificate(kbManifestVersionCertificate());
    expect(KB_MANIFEST_VERSION).toBe(1);
  });
});
