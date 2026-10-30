import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ALLOWED_GRANULARITY_REASONS,
  COARSE_GRANULARITY_REASONS,
  SYMBOL_ROLES,
  TRACEABILITY_RELATIONSHIP_TYPES,
} from "../../../src/public/symbol-granularity.generated.js";
import { SYMBOL_GRANULARITY_VIOLATION } from "../../../src/operations/mutation/symbol-granularity.js";

// implements REQ-symbol-granularity-vocabulary

/**
 * The symbol roles, granularity reasons and link types of the behavioral anchor check. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** A symbol role shall be behavioral, structural, type-shape, config, module or unknown. */
export async function symbolRolesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-symbol-roles",
    domain: { symbolId: "SYM-SYMBOL_ROLES", members: [...SYMBOL_ROLES] },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** An allowed granularity reason shall be config-artifact, module-level-behavior, extractor-miss, legacy-link or test-suite. */
export async function allowedGranularityReasonsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-allowed-granularity-reasons",
    domain: {
      symbolId: "SYM-ALLOWED_GRANULARITY_REASONS",
      members: [...ALLOWED_GRANULARITY_REASONS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A coarse granularity reason shall be config-artifact, module-level-behavior, extractor-miss or test-suite. */
export async function coarseGranularityReasonsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-coarse-granularity-reasons",
    domain: {
      symbolId: "SYM-COARSE_GRANULARITY_REASONS",
      members: [...COARSE_GRANULARITY_REASONS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The granularity check shall cover implements, covered_by and executable_for links. */
export async function granularityLinkTypesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-granularity-link-types",
    domain: {
      symbolId: "SYM-TRACEABILITY_RELATIONSHIP_TYPES",
      members: [...TRACEABILITY_RELATIONSHIP_TYPES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The symbol granularity violation code shall be SYMBOL_GRANULARITY_VIOLATION. */
export function granularityViolationCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-granularity-violation-code",
    symbolId: "SYM-SYMBOL-GRANULARITY-VIOLATION",
    value: SYMBOL_GRANULARITY_VIOLATION,
  });
}

describe("Symbol roles and granularity reasons", () => {
  test("A symbol role shall be behavioral, structural, type-shape, config, module or unknown", async () => {
    writeCodeCertificate(await symbolRolesCertificate());
    expect([...SYMBOL_ROLES].sort()).toEqual([
      "behavioral",
      "config",
      "module",
      "structural",
      "type-shape",
      "unknown",
    ]);
  });

  test("An allowed granularity reason shall be config-artifact, module-level-behavior, extractor-miss, legacy-link or test-suite", async () => {
    writeCodeCertificate(await allowedGranularityReasonsCertificate());
    expect([...ALLOWED_GRANULARITY_REASONS].sort()).toEqual([
      "config-artifact",
      "extractor-miss",
      "legacy-link",
      "module-level-behavior",
      "test-suite",
    ]);
  });

  test("A coarse granularity reason shall be config-artifact, module-level-behavior, extractor-miss or test-suite", async () => {
    writeCodeCertificate(await coarseGranularityReasonsCertificate());
    expect([...COARSE_GRANULARITY_REASONS].sort()).toEqual([
      "config-artifact",
      "extractor-miss",
      "module-level-behavior",
      "test-suite",
    ]);
  });

  test("The granularity check shall cover implements, covered_by and executable_for links", async () => {
    writeCodeCertificate(await granularityLinkTypesCertificate());
    expect([...TRACEABILITY_RELATIONSHIP_TYPES].sort()).toEqual([
      "covered_by",
      "executable_for",
      "implements",
    ]);
  });

  test("The symbol granularity violation code shall be SYMBOL_GRANULARITY_VIOLATION", () => {
    writeCodeCertificate(granularityViolationCodeCertificate());
    expect(SYMBOL_GRANULARITY_VIOLATION).toBe("SYMBOL_GRANULARITY_VIOLATION");
  });
});
