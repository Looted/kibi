import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  MAX_ASPECT_CHARS,
  MAX_ASPECT_WORDS,
} from "../../../../cli/src/operations/bootstrap/requirement-claims.js";

// implements REQ-bootstrap-claim-aspect-limits

/**
 * How many words and characters a bootstrap claim aspect may hold. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A bootstrap claim aspect shall hold at most 4 words. */
export function bootstrapAspectMaxWordsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-bootstrap-aspect-max-words",
    variable: "max_aspect_words",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_ASPECT_WORDS }],
    claim: { operator: "eq", value: 4 },
  });
}

/** A bootstrap claim aspect shall hold at most 40 characters. */
export function bootstrapAspectMaxCharsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-bootstrap-aspect-max-chars",
    variable: "max_aspect_chars",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_ASPECT_CHARS }],
    claim: { operator: "eq", value: 40 },
  });
}

describe("Bootstrap claim aspect limits", () => {
  test("A bootstrap claim aspect shall hold at most 4 words", () => {
    writeCodeCertificate(bootstrapAspectMaxWordsCertificate());
    expect(MAX_ASPECT_WORDS).toBe(4);
  });

  test("A bootstrap claim aspect shall hold at most 40 characters", () => {
    writeCodeCertificate(bootstrapAspectMaxCharsCertificate());
    expect(MAX_ASPECT_CHARS).toBe(40);
  });
});
