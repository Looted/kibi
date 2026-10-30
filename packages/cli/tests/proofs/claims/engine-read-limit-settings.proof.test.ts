import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ENGINE_READ_INFERENCE_LIMIT_ENV,
  ENGINE_READ_TIME_LIMIT_CAP_MS,
  ENGINE_READ_TIME_LIMIT_ENV,
  QUERY_LIMIT_EXCEEDED_CODE,
} from "../../../src/engine-limits.js";

// implements REQ-core-engine-read-limit-settings

/**
 * The names and cap of the engine read limits. Kibi reads each constant itself
 * at ingest, so every certificate is checked against the code.
 */

/** The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS. */
export function engineReadTimeLimitEnvCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-engine-read-time-limit-env",
    symbolId: "SYM-engine-limits-read-time-limit-env",
    value: ENGINE_READ_TIME_LIMIT_ENV,
  });
}

/** The engine read inference limit environment variable shall be KIBI_ENGINE_READ_INFERENCE_LIMIT. */
export function engineReadInferenceLimitEnvCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-engine-read-inference-limit-env",
    symbolId: "SYM-engine-limits-read-inference-limit-env",
    value: ENGINE_READ_INFERENCE_LIMIT_ENV,
  });
}

/** The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED. */
export function engineQueryLimitCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-engine-query-limit-code",
    symbolId: "SYM-engine-limits-query-limit-exceeded-code",
    value: QUERY_LIMIT_EXCEEDED_CODE,
  });
}

/** The engine read time limit cap shall be 115000 milliseconds. */
export function engineReadTimeLimitCapCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-engine-read-time-limit-cap",
    variable: "read_time_limit_cap_ms",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ENGINE_READ_TIME_LIMIT_CAP_MS }],
    claim: { operator: "eq", value: 115000 },
  });
}

describe("Engine read limit settings", () => {
  test("The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS", () => {
    writeCodeCertificate(engineReadTimeLimitEnvCertificate());
    expect(ENGINE_READ_TIME_LIMIT_ENV).toBe("KIBI_ENGINE_READ_TIME_LIMIT_MS");
  });

  test("The engine read inference limit environment variable shall be KIBI_ENGINE_READ_INFERENCE_LIMIT", () => {
    writeCodeCertificate(engineReadInferenceLimitEnvCertificate());
    expect(ENGINE_READ_INFERENCE_LIMIT_ENV).toBe(
      "KIBI_ENGINE_READ_INFERENCE_LIMIT",
    );
  });

  test("The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED", () => {
    writeCodeCertificate(engineQueryLimitCodeCertificate());
    expect(QUERY_LIMIT_EXCEEDED_CODE).toBe("QUERY_LIMIT_EXCEEDED");
  });

  test("The engine read time limit cap shall be 115000 milliseconds", () => {
    writeCodeCertificate(engineReadTimeLimitCapCertificate());
    expect(ENGINE_READ_TIME_LIMIT_CAP_MS).toBe(115000);
  });
});
