import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  LOOKUP_BEFORE_EDIT_OPERATIONS,
  TELEMETRY_ACCEPTANCE_VERSION,
} from "../../../src/public/telemetry-acceptance.js";
import { TELEMETRY_REMEDIATION_VERSION } from "../../../src/public/telemetry-remediation.js";

// implements REQ-kibi-telemetry-versions

/**
 * The versions of the telemetry acceptance and remediation reports and the operations that count as a lookup before an edit. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The telemetry acceptance version shall be kibi.telemetry-acceptance.v1. */
export function telemetryAcceptanceVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-telemetry-acceptance-version",
    symbolId: "SYM-reqcompiler-telemetry-acceptance-version",
    value: TELEMETRY_ACCEPTANCE_VERSION,
  });
}

/** The telemetry remediation version shall be kibi.telemetry-remediation.v1. */
export function telemetryRemediationVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-telemetry-remediation-version",
    symbolId: "SYM-reqcompiler-remediation-version",
    value: TELEMETRY_REMEDIATION_VERSION,
  });
}

/** A lookup before an edit shall be kb_query or kb_search. */
export async function lookupBeforeEditOperationsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-lookup-before-edit-operations",
    domain: {
      symbolId: "SYM-const-lookup-before-edit-operations",
      members: [...LOOKUP_BEFORE_EDIT_OPERATIONS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Telemetry acceptance versions and lookup operations", () => {
  test("The telemetry acceptance version shall be kibi.telemetry-acceptance.v1", () => {
    writeCodeCertificate(telemetryAcceptanceVersionCertificate());
    expect(TELEMETRY_ACCEPTANCE_VERSION).toBe("kibi.telemetry-acceptance.v1");
  });

  test("The telemetry remediation version shall be kibi.telemetry-remediation.v1", () => {
    writeCodeCertificate(telemetryRemediationVersionCertificate());
    expect(TELEMETRY_REMEDIATION_VERSION).toBe("kibi.telemetry-remediation.v1");
  });

  test("A lookup before an edit shall be kb_query or kb_search", async () => {
    writeCodeCertificate(await lookupBeforeEditOperationsCertificate());
    expect([...LOOKUP_BEFORE_EDIT_OPERATIONS].sort()).toEqual([
      "kb_query",
      "kb_search",
    ]);
  });
});
