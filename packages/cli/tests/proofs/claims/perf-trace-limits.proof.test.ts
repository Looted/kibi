import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  KIBI_PERF_TIMINGS_ENV,
  KIBI_PERF_TRACE_DIR_ENV,
  KIBI_PERF_TRACE_MAX_BYTES,
  KIBI_PERF_TRACE_MAX_EVENTS,
} from "../../../src/performance-trace.js";

// implements REQ-kibi-perf-trace-limits

/**
 * The environment variables that turn on Kibi performance traces and the bounds
 * of a trace. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The performance timings environment variable shall be KIBI_PERF_TIMINGS. */
export function perfTimingsEnvCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-perf-timings-env",
    symbolId: "SYM-performance-timings-env",
    value: KIBI_PERF_TIMINGS_ENV,
  });
}

/** The performance trace folder environment variable shall be KIBI_PERF_TRACE_DIR. */
export function perfTraceDirEnvCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-perf-trace-dir-env",
    symbolId: "SYM-performance-trace-dir-env",
    value: KIBI_PERF_TRACE_DIR_ENV,
  });
}

/** A performance trace shall be at most 524288 bytes. */
export function perfTraceMaxBytesCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-perf-trace-max-bytes",
    variable: "max_bytes",
    valueType: "int",
    assumptions: [{ operator: "eq", value: KIBI_PERF_TRACE_MAX_BYTES }],
    claim: { operator: "eq", value: 524288 },
  });
}

/** A performance trace shall hold at most 5000 events. */
export function perfTraceMaxEventsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-perf-trace-max-events",
    variable: "max_events",
    valueType: "int",
    assumptions: [{ operator: "eq", value: KIBI_PERF_TRACE_MAX_EVENTS }],
    claim: { operator: "eq", value: 5000 },
  });
}

describe("Performance trace settings and limits", () => {
  test("The performance timings environment variable shall be KIBI_PERF_TIMINGS", () => {
    writeCodeCertificate(perfTimingsEnvCertificate());
    expect(KIBI_PERF_TIMINGS_ENV).toBe("KIBI_PERF_TIMINGS");
  });

  test("The performance trace folder environment variable shall be KIBI_PERF_TRACE_DIR", () => {
    writeCodeCertificate(perfTraceDirEnvCertificate());
    expect(KIBI_PERF_TRACE_DIR_ENV).toBe("KIBI_PERF_TRACE_DIR");
  });

  test("A performance trace shall be at most 524288 bytes", () => {
    writeCodeCertificate(perfTraceMaxBytesCertificate());
    expect(KIBI_PERF_TRACE_MAX_BYTES).toBe(524288);
  });

  test("A performance trace shall hold at most 5000 events", () => {
    writeCodeCertificate(perfTraceMaxEventsCertificate());
    expect(KIBI_PERF_TRACE_MAX_EVENTS).toBe(5000);
  });
});
