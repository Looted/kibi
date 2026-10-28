import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { DEFAULT_TELEMETRY_ACCEPTANCE_POLICY as POLICY } from "../../../src/public/telemetry-acceptance.js";

// implements REQ-kibi-telemetry-acceptance-thresholds

/**
 * The default telemetry acceptance policy's limits. Each certificate assumes
 * the value one field of DEFAULT_TELEMETRY_ACCEPTANCE_POLICY holds; Kibi reads
 * the same field again at ingest (a dotted value_source) and decides the
 * claim's fact against it.
 */
function limitCertificate(
  testId: string,
  variable: string,
  value: number,
  claimed: number,
): CodeCertificate {
  return arithmeticCertificate({
    testId,
    variable,
    valueType: "int",
    assumptions: [{ operator: "eq", value }],
    claim: { operator: "eq", value: claimed },
  });
}

/** The telemetry acceptance report shall read at most 200 usage events. */
export function telemetryEventLimitCertificate(): CodeCertificate {
  return limitCertificate(
    "TEST-proof-telemetry-event-limit",
    "event_limit",
    POLICY.eventLimit,
    200,
  );
}

/** The maximum telemetry evidence age shall be 604800 seconds. */
export function telemetryEvidenceAgeCertificate(): CodeCertificate {
  return limitCertificate(
    "TEST-proof-telemetry-evidence-age",
    "max_evidence_age_seconds",
    POLICY.maxEvidenceAgeSeconds,
    604800,
  );
}

/** The maximum validation preflight age shall be 3600 seconds. */
export function telemetryPreflightAgeCertificate(): CodeCertificate {
  return limitCertificate(
    "TEST-proof-telemetry-preflight-age",
    "preflight_max_age_seconds",
    POLICY.preflightMaxAgeSeconds,
    3600,
  );
}

/** The maximum semantic-advisor age shall be 86400 seconds. */
export function telemetryAdvisorAgeCertificate(): CodeCertificate {
  return limitCertificate(
    "TEST-proof-telemetry-advisor-age",
    "advisor_max_age_seconds",
    POLICY.advisorMaxAgeSeconds,
    86400,
  );
}

/** The repeated mutation failure threshold shall be 3 failed upserts. */
export function telemetryRetryThresholdCertificate(): CodeCertificate {
  return limitCertificate(
    "TEST-proof-telemetry-retry-threshold",
    "repeated_mutation_failure_threshold",
    POLICY.repeatedMutationFailureThreshold,
    3,
  );
}

describe("telemetry acceptance limits", () => {
  test("the report reads at most 200 usage events", () => {
    writeCodeCertificate(telemetryEventLimitCertificate());
    expect(POLICY.eventLimit).toBe(200);
  });

  test("the evidence age limit is seven days", () => {
    writeCodeCertificate(telemetryEvidenceAgeCertificate());
    expect(POLICY.maxEvidenceAgeSeconds).toBe(604800);
  });

  test("the validation preflight window is one hour", () => {
    writeCodeCertificate(telemetryPreflightAgeCertificate());
    expect(POLICY.preflightMaxAgeSeconds).toBe(3600);
  });

  test("the semantic-advisor window is 24 hours", () => {
    writeCodeCertificate(telemetryAdvisorAgeCertificate());
    expect(POLICY.advisorMaxAgeSeconds).toBe(86400);
  });

  test("three failed upserts fail the retry-discipline metric", () => {
    writeCodeCertificate(telemetryRetryThresholdCertificate());
    expect(POLICY.repeatedMutationFailureThreshold).toBe(3);
  });
});
