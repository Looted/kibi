import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { NON_GOVERNING_STATUSES } from "../../../src/intent-search.js";

// implements REQ-search-non-governing-statuses

/**
 * The statuses that mark a search match as no longer governing. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A non-governing search status shall be superseded, deprecated, rejected, retired, obsolete or archived. */
export async function searchNonGoverningStatusesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-search-non-governing-statuses",
    domain: {
      symbolId: "SYM-const-search-non-governing-statuses",
      members: [...NON_GOVERNING_STATUSES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Non-governing search statuses", () => {
  test("A non-governing search status shall be superseded, deprecated, rejected, retired, obsolete or archived", async () => {
    writeCodeCertificate(await searchNonGoverningStatusesCertificate());
    expect([...NON_GOVERNING_STATUSES].sort()).toEqual([
      "archived",
      "deprecated",
      "obsolete",
      "rejected",
      "retired",
      "superseded",
    ]);
  });
});
