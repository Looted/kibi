import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { MINIMUM_SWIPL_MAJOR } from "../../../src/prolog/swipl-resolver.js";

// implements REQ-prolog-swipl-minimum-version

/**
 * The oldest SWI-Prolog major version Kibi accepts from PATH. Kibi reads
 * MINIMUM_SWIPL_MAJOR itself at ingest, so the certificate is checked against the code.
 */

/** The minimum SWI-Prolog major version shall be 9. */
export function swiplMinimumMajorCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-swipl-minimum-major",
    variable: "minimum_swipl_major",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MINIMUM_SWIPL_MAJOR }],
    claim: { operator: "eq", value: 9 },
  });
}

describe("Kibi accepts SWI-Prolog 9 or newer", () => {
  test("The minimum SWI-Prolog major version shall be 9", () => {
    writeCodeCertificate(swiplMinimumMajorCertificate());
    expect(MINIMUM_SWIPL_MAJOR).toBe(9);
  });
});
