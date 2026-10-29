import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { BOOTSTRAP_PROVIDER_ORDER } from "../../../src/operations/bootstrap/types.js";

// implements REQ-kibi-bootstrap-evidence-providers

/**
 * The evidence providers a bootstrap plan reads from. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A bootstrap evidence provider shall be typed_kibi_docs, generic_repo_docs, repo_metadata, repo_layout, test_topology or source_symbols. */
export async function bootstrapProvidersCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-bootstrap-providers",
    domain: {
      symbolId:
        "SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-bootstrap-provider-order",
      members: [...BOOTSTRAP_PROVIDER_ORDER],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Bootstrap evidence providers", () => {
  test("A bootstrap evidence provider shall be typed_kibi_docs, generic_repo_docs, repo_metadata, repo_layout, test_topology or source_symbols", async () => {
    writeCodeCertificate(await bootstrapProvidersCertificate());
    expect([...BOOTSTRAP_PROVIDER_ORDER].sort()).toEqual([
      "generic_repo_docs",
      "repo_layout",
      "repo_metadata",
      "source_symbols",
      "test_topology",
      "typed_kibi_docs",
    ]);
  });
});
