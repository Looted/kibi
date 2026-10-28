import { describe, expect, test } from "bun:test";
import { JEV_DEFAULT_MODEL, JEV_MAX_TIMEOUT_MS } from "kibi-plugin-jev";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

// implements REQ-capability-plugin-jev-defaults

/**
 * The Jev plugin's defaults. Kibi reads JEV_DEFAULT_MODEL (pattern_source)
 * and JEV_MAX_TIMEOUT_MS (value_source) from the plugin source at ingest, so
 * each certificate is checked against the code, not the values here.
 */

/** The Jev model must default to jev-latest. */
export function jevDefaultModelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-jev-default-model",
    symbolId: "SYM-cap-plugin-jev-default-model",
    value: JEV_DEFAULT_MODEL,
  });
}

/** The maximum Jev timeout shall be 120000 milliseconds. */
export function jevMaxTimeoutCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-jev-max-timeout",
    variable: "max_timeout_ms",
    valueType: "int",
    assumptions: [{ operator: "eq", value: JEV_MAX_TIMEOUT_MS }],
    claim: { operator: "eq", value: 120000 },
  });
}

describe("the Jev plugin defaults", () => {
  test("the Jev model defaults to jev-latest", () => {
    writeCodeCertificate(jevDefaultModelCertificate());
    expect(JEV_DEFAULT_MODEL).toBe("jev-latest");
  });

  test("the maximum Jev timeout is 120000 milliseconds", () => {
    writeCodeCertificate(jevMaxTimeoutCertificate());
    expect(JEV_MAX_TIMEOUT_MS).toBe(120000);
  });
});
