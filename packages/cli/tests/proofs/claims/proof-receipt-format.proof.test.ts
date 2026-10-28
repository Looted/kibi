import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  PROOF_RECEIPT_V1_VERSION,
  PROOF_RECEIPT_VERSIONS,
} from "../../../src/public/proof-protocol.js";
import { FINGERPRINT_COMPONENT_NAMES } from "../../../src/public/proof-fingerprint.js";
import { PROVE_PROGRESS_FILE } from "../../../src/commands/prove.js";
import { PROOF_INTEGRATION_CONFIGURE } from "../../../src/proof/integration-plan.js";

// implements REQ-kibi-proof-receipt-format

/**
 * The receipt versions Kibi reads, the parts of an execution fingerprint, the prove progress file and the integration setup step. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The first proof receipt version shall be kibi.proof-receipt.v1. */
export function receiptV1VersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-receipt-v1-version",
    symbolId: "SYM-const-proof-receipt-v1-version",
    value: PROOF_RECEIPT_V1_VERSION,
  });
}

/** A readable proof receipt version shall be kibi.proof-receipt.v1 or kibi.proof-receipt.v2. */
export async function receiptVersionsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-receipt-versions",
    domain: {
      symbolId: "SYM-const-proof-receipt-versions",
      members: [...PROOF_RECEIPT_VERSIONS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** An execution fingerprint part shall be contract, integration, command, bindings or producer. */
export async function fingerprintPartNamesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-fingerprint-part-names",
    domain: {
      symbolId: "SYM-fingerprint-component-names",
      members: [...FINGERPRINT_COMPONENT_NAMES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The prove progress file shall be prove-progress.json. */
export function proveProgressFileCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-prove-progress-file",
    symbolId: "SYM-const-prove-progress-file",
    value: PROVE_PROGRESS_FILE,
  });
}

/** The proof integration setup step shall be proof_integration_configure. */
export function integrationConfigureStepCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-integration-configure-step",
    symbolId: "SYM-const-proof-integration-configure",
    value: PROOF_INTEGRATION_CONFIGURE,
  });
}

describe("Proof receipt versions and fingerprint parts", () => {
  test("The first proof receipt version shall be kibi.proof-receipt.v1", () => {
    writeCodeCertificate(receiptV1VersionCertificate());
    expect(PROOF_RECEIPT_V1_VERSION).toBe("kibi.proof-receipt.v1");
  });

  test("A readable proof receipt version shall be kibi.proof-receipt.v1 or kibi.proof-receipt.v2", async () => {
    writeCodeCertificate(await receiptVersionsCertificate());
    expect([...PROOF_RECEIPT_VERSIONS].sort()).toEqual([
      "kibi.proof-receipt.v1",
      "kibi.proof-receipt.v2",
    ]);
  });

  test("An execution fingerprint part shall be contract, integration, command, bindings or producer", async () => {
    writeCodeCertificate(await fingerprintPartNamesCertificate());
    expect([...FINGERPRINT_COMPONENT_NAMES].sort()).toEqual([
      "bindings",
      "command",
      "contract",
      "integration",
      "producer",
    ]);
  });

  test("The prove progress file shall be prove-progress.json", () => {
    writeCodeCertificate(proveProgressFileCertificate());
    expect(PROVE_PROGRESS_FILE).toBe("prove-progress.json");
  });

  test("The proof integration setup step shall be proof_integration_configure", () => {
    writeCodeCertificate(integrationConfigureStepCertificate());
    expect(PROOF_INTEGRATION_CONFIGURE).toBe("proof_integration_configure");
  });
});
