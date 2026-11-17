import { describe, expect, test } from "bun:test";
import { MAX_RELATED_REQUIREMENTS } from "../../../src/operations/mutation/capture.js";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

/**
 * A requirement kb_upsert shall list at most 5 related current requirements.
 * Kibi reads MAX_RELATED_REQUIREMENTS itself at ingest, so the certificate is
 * checked against the code.
 */
export function relatedRequirementsCapCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-kb-upsert-related-requirements-cap",
    variable: "related_current_requirements_listed_max",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_RELATED_REQUIREMENTS }],
    claim: { operator: "lte", value: 5 },
  });
}

describe("Cap on related requirements in a requirement write", () => {
  test("A requirement kb_upsert lists at most 5 related current requirements", () => {
    writeCodeCertificate(relatedRequirementsCapCertificate());
    expect(MAX_RELATED_REQUIREMENTS).toBeLessThanOrEqual(5);
  });
});
