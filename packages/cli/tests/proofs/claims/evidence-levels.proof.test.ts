import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { EVIDENCE_LEVELS } from "../../../src/public/evidence-levels.js";

// implements REQ-kibi-evidence-level-vocabulary

/**
 * The evidence levels Kibi reports. Kibi reads EVIDENCE_LEVELS itself at ingest
 * (domain_source), so the certificate is checked against the list in code.
 */

/** Kibi evidence levels shall be proved, tested, asserted and unverified. */
export async function evidenceLevelVocabularyCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-evidence-level-vocabulary",
    domain: {
      symbolId: "SYM-cli-evidence-levels",
      members: [...EVIDENCE_LEVELS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Kibi's evidence level vocabulary", () => {
  test("the evidence levels are proved, tested, asserted and unverified", async () => {
    writeCodeCertificate(await evidenceLevelVocabularyCertificate());
    expect([...EVIDENCE_LEVELS].sort()).toEqual([
      "asserted",
      "proved",
      "tested",
      "unverified",
    ]);
  });
});
