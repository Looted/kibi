import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  MAX_SOURCE_ANALYSIS_TIMING_BYTES,
  MAX_SOURCE_ANALYSIS_TIMING_EVENTS,
} from "../../../../plugin-treesitter/src/performance-timing.js";

// implements REQ-source-analysis-timing-limits

/**
 * How many timing events and bytes the tree-sitter plugin keeps per source analysis. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A source analysis shall keep at most 5000 timing events. */
export function sourceTimingMaxEventsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-source-timing-max-events",
    variable: "max_timing_events",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_SOURCE_ANALYSIS_TIMING_EVENTS }],
    claim: { operator: "eq", value: 5000 },
  });
}

/** A source analysis timing trace shall keep at most 524288 bytes. */
export function sourceTimingMaxBytesCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-source-timing-max-bytes",
    variable: "max_timing_bytes",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_SOURCE_ANALYSIS_TIMING_BYTES }],
    claim: { operator: "eq", value: 524288 },
  });
}

describe("Source analysis timing trace limits", () => {
  test("A source analysis shall keep at most 5000 timing events", () => {
    writeCodeCertificate(sourceTimingMaxEventsCertificate());
    expect(MAX_SOURCE_ANALYSIS_TIMING_EVENTS).toBe(5000);
  });

  test("A source analysis timing trace shall keep at most 524288 bytes", () => {
    writeCodeCertificate(sourceTimingMaxBytesCertificate());
    expect(MAX_SOURCE_ANALYSIS_TIMING_BYTES).toBe(524288);
  });
});
