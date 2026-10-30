import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { EXTERNAL_SEARCH_HINTS_OPERATIONS } from "../../../src/plugins/external-allowlist.js";

// implements REQ-search-hints-host-operations

/**
 * The operations that may call an external search-hints provider. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** An operation that may call an external search hints provider shall be kb_search. */
export async function searchHintsHostOperationsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-search-hints-host-operations",
    domain: {
      symbolId: "SYM-const-external-search-hints-operations",
      members: [...EXTERNAL_SEARCH_HINTS_OPERATIONS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Operations that may ask for search hints", () => {
  test("An operation that may call an external search hints provider shall be kb_search", async () => {
    writeCodeCertificate(await searchHintsHostOperationsCertificate());
    expect([...EXTERNAL_SEARCH_HINTS_OPERATIONS].sort()).toEqual(["kb_search"]);
  });
});
