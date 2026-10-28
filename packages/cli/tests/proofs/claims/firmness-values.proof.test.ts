import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { FIRMNESS_VALUES } from "../../../src/decision-firmness.js";

// implements REQ-kb-firmness-values

/**
 * The firmness values a decision may carry. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** A decision firmness shall be firm, default or exploratory. */
export async function firmnessValuesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-firmness-values",
    domain: {
      symbolId: "SYM-const-firmness-values",
      members: [...FIRMNESS_VALUES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Decision firmness values", () => {
  test("A decision firmness shall be firm, default or exploratory", async () => {
    writeCodeCertificate(await firmnessValuesCertificate());
    expect([...FIRMNESS_VALUES].sort()).toEqual([
      "default",
      "exploratory",
      "firm",
    ]);
  });
});
