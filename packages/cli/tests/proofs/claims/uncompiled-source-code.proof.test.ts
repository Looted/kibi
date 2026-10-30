import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SOURCE_EXTRACTION_FAILED } from "../../../src/commands/sync/cache.js";

// implements REQ-uncompiled-source-code

/**
 * The code sync gives a source file it could not extract. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The failed source extraction code shall be source_extraction_failed. */
export function sourceExtractionFailedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-source-extraction-failed",
    symbolId: "SYM-sync-source-extraction-failed-code",
    value: SOURCE_EXTRACTION_FAILED,
  });
}

describe("Failed source extraction code", () => {
  test("The failed source extraction code shall be source_extraction_failed", () => {
    writeCodeCertificate(sourceExtractionFailedCertificate());
    expect(SOURCE_EXTRACTION_FAILED).toBe("source_extraction_failed");
  });
});
