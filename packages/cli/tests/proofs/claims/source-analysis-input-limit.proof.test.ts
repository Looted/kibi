import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS } from "kibi-plugin-sdk";

// implements REQ-capability-plugin-source-analysis-input-limit

/**
 * The largest source text a symbol extractor is given. Kibi reads the constant
 * itself at ingest, so the certificate is checked against the code.
 */

/** The maximum source analysis input shall be 5242880 code units. */
export function sourceAnalysisMaxInputCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-source-analysis-max-input",
    variable: "max_input_code_units",
    valueType: "int",
    assumptions: [
      { operator: "eq", value: SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS },
    ],
    claim: { operator: "eq", value: 5242880 },
  });
}

describe("Source analysis input limit", () => {
  test("The maximum source analysis input shall be 5242880 code units", () => {
    writeCodeCertificate(sourceAnalysisMaxInputCertificate());
    expect(SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS).toBe(5242880);
  });
});
