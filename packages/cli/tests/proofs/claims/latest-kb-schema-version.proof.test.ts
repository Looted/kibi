import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../../src/utils/schema-version.js";

/**
 * The knowledge base schema version this Kibi writes and migrates to. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The latest knowledge base schema version shall be 15. */
export function latestKbSchemaVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-latest-kb-schema-version",
    variable: "latest_schema_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: LATEST_KB_SCHEMA_VERSION }],
    claim: { operator: "eq", value: 15 },
  });
}

describe("Latest knowledge base schema version", () => {
  test("The latest knowledge base schema version shall be 15", () => {
    writeCodeCertificate(latestKbSchemaVersionCertificate());
    expect(LATEST_KB_SCHEMA_VERSION).toBe(15);
  });
});
