import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SYMBOL_COORDINATES_FORMAT_VERSION } from "../../../src/extractors/symbol-coordinates.js";
import { GENERATED_SYMBOL_FIELDS } from "../../../src/operations/mutation/source-authoring.js";

// implements REQ-generated-coordinate-settings

/**
 * The derived coordinate fields of a symbol and their file format version. Kibi
 * reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt. */
export async function generatedSymbolFieldsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-generated-symbol-fields",
    domain: {
      symbolId: "SYM-GENERATED_SYMBOL_FIELDS",
      members: [...GENERATED_SYMBOL_FIELDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The symbol coordinates format version shall be 2. */
export function symbolCoordinatesFormatVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-symbol-coordinates-format-version",
    variable: "format_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SYMBOL_COORDINATES_FORMAT_VERSION }],
    claim: { operator: "eq", value: 2 },
  });
}

describe("Generated symbol coordinate format", () => {
  test("The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt", async () => {
    writeCodeCertificate(await generatedSymbolFieldsCertificate());
    expect([...GENERATED_SYMBOL_FIELDS].sort()).toEqual([
      "coordinatesGeneratedAt",
      "sourceColumn",
      "sourceEndColumn",
      "sourceEndLine",
      "sourceLine",
    ]);
  });

  test("The symbol coordinates format version shall be 2", () => {
    writeCodeCertificate(symbolCoordinatesFormatVersionCertificate());
    expect(SYMBOL_COORDINATES_FORMAT_VERSION).toBe(2);
  });
});
