import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { FIRMNESS_FROM_ORIGIN_SCHEMA_VERSION } from "../../../src/public/operations/decision-firmness.js";

// implements REQ-kb-firmness-origin-schema

/**
 * The KB schema version from which firmness is read from a decision's origin. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** Firmness shall be read from origin starting with KB schema version 10. */
export function firmnessOriginSchemaVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-firmness-origin-schema-version",
    variable: "origin_schema_version",
    valueType: "int",
    assumptions: [
      { operator: "eq", value: FIRMNESS_FROM_ORIGIN_SCHEMA_VERSION },
    ],
    claim: { operator: "eq", value: 10 },
  });
}

describe("Firmness from origin schema version", () => {
  test("Firmness shall be read from origin starting with KB schema version 10", () => {
    writeCodeCertificate(firmnessOriginSchemaVersionCertificate());
    expect(FIRMNESS_FROM_ORIGIN_SCHEMA_VERSION).toBe(10);
  });
});
