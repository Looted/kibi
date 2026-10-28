import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SEARCH_ANSWER_LIMITS } from "../../../src/search-answer.js";

// implements REQ-kibi-search-answer-limits

/**
 * The bounds of a kb_search answer. Kibi reads each field of SEARCH_ANSWER_LIMITS
 * itself at ingest (a dotted value_source), so the certificate is checked against the code.
 */

/** A search answer shall be at most 16384 bytes. */
export function searchAnswerMaxBytesCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-answer-max-bytes",
    variable: "max_bytes",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_ANSWER_LIMITS.maxBytes }],
    claim: { operator: "eq", value: 16384 },
  });
}

/** A search answer shall load at most 70 entity rows. */
export function searchAnswerEntityLoadsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-answer-entity-loads",
    variable: "entity_loads",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_ANSWER_LIMITS.entityLoads }],
    claim: { operator: "eq", value: 70 },
  });
}

/** A search answer shall list at most 5 governing requirements. */
export function searchAnswerGoverningCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-answer-governing",
    variable: "governing",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_ANSWER_LIMITS.governing }],
    claim: { operator: "eq", value: 5 },
  });
}

/** A search answer shall list at most 8 linked facts per governing requirement. */
export function searchAnswerFactsPerRequirementCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-answer-facts-per-requirement",
    variable: "facts_per_requirement",
    valueType: "int",
    assumptions: [
      { operator: "eq", value: SEARCH_ANSWER_LIMITS.factsPerRequirement },
    ],
    claim: { operator: "eq", value: 8 },
  });
}

/** A search answer shall keep at most 280 characters of an ADR decision excerpt. */
export function searchAnswerExcerptCharsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-answer-excerpt-chars",
    variable: "excerpt_chars",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_ANSWER_LIMITS.excerptChars }],
    claim: { operator: "eq", value: 280 },
  });
}

describe("Search answer size limits", () => {
  test("A search answer shall be at most 16384 bytes", () => {
    writeCodeCertificate(searchAnswerMaxBytesCertificate());
    expect(SEARCH_ANSWER_LIMITS.maxBytes).toBe(16384);
  });

  test("A search answer shall load at most 70 entity rows", () => {
    writeCodeCertificate(searchAnswerEntityLoadsCertificate());
    expect(SEARCH_ANSWER_LIMITS.entityLoads).toBe(70);
  });

  test("A search answer shall list at most 5 governing requirements", () => {
    writeCodeCertificate(searchAnswerGoverningCertificate());
    expect(SEARCH_ANSWER_LIMITS.governing).toBe(5);
  });

  test("A search answer shall list at most 8 linked facts per governing requirement", () => {
    writeCodeCertificate(searchAnswerFactsPerRequirementCertificate());
    expect(SEARCH_ANSWER_LIMITS.factsPerRequirement).toBe(8);
  });

  test("A search answer shall keep at most 280 characters of an ADR decision excerpt", () => {
    writeCodeCertificate(searchAnswerExcerptCharsCertificate());
    expect(SEARCH_ANSWER_LIMITS.excerptChars).toBe(280);
  });
});
