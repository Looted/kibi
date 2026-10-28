import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SEMANTIC_ADVISOR_VERSION } from "../../../src/operations/semantic-advisor/analyze-prose.js";

// implements REQ-semantic-advisor-version

/**
 * The version the semantic advisor stamps on its analysis. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The semantic advisor version shall be semantic-advisor-v2. */
export function semanticAdvisorVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-semantic-advisor-version",
    symbolId: "SYM-SEMANTIC_ADVISOR_VERSION",
    value: SEMANTIC_ADVISOR_VERSION,
  });
}

describe("Semantic advisor version", () => {
  test("The semantic advisor version shall be semantic-advisor-v2", () => {
    writeCodeCertificate(semanticAdvisorVersionCertificate());
    expect(SEMANTIC_ADVISOR_VERSION).toBe("semantic-advisor-v2");
  });
});
