import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { PROVENANCE_STUB_TAG } from "../../../../cli/src/provenance-stub.js";

// implements REQ-bootstrap-provenance-stub-tag

/**
 * The tag a bootstrap provenance stub carries. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A bootstrap provenance stub shall be tagged bootstrap:provenance-stub. */
export function provenanceStubTagCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-provenance-stub-tag",
    symbolId: "SYM-const-provenance-stub-tag",
    value: PROVENANCE_STUB_TAG,
  });
}

describe("Bootstrap provenance stub tag", () => {
  test("A bootstrap provenance stub shall be tagged bootstrap:provenance-stub", () => {
    writeCodeCertificate(provenanceStubTagCertificate());
    expect(PROVENANCE_STUB_TAG).toBe("bootstrap:provenance-stub");
  });
});
