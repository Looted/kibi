import { describe, expect, test } from "bun:test";
import { SEARCH_HINTS_MAX_LIMIT } from "kibi-plugin-sdk";
import { SEARCH_HINTS_OFFER_REQUIREMENTS } from "../../../src/operations/bootstrap/plugin-offers.js";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  SEARCH_HINT_LIMIT,
  SEARCH_HINT_WEAK_SCORE,
} from "../../../src/search-hints.js";

// implements REQ-kibi-search-hints-limits

/**
 * The search hints limits. Each certificate assumes the value one constant
 * holds; Kibi reads the same constant again at ingest and decides the
 * claim's fact against it.
 */

/** The search hints weak top score shall be 0.44. */
export function searchHintWeakScoreCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-hint-weak-score",
    variable: "weak_top_score",
    valueType: "real",
    assumptions: [{ operator: "eq", value: SEARCH_HINT_WEAK_SCORE }],
    claim: { operator: "eq", value: 0.44 },
  });
}

/** The search hints host shall show at most 10 hints. */
export function searchHintShownLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-hint-shown-limit",
    variable: "max_shown_hints",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_HINT_LIMIT }],
    claim: { operator: "lte", value: 10 },
  });
}

/** A kibi.search-hints.v1 result shall hold at most 20 hints. */
export function searchHintsResultLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-hints-result-limit",
    variable: "max_result_hints",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_HINTS_MAX_LIMIT }],
    claim: { operator: "lte", value: 20 },
  });
}

/** The bootstrap plan shall offer search hints from 50 requirement documents. */
export function searchHintsOfferCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-hints-offer-requirements",
    variable: "offer_min_requirements",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_HINTS_OFFER_REQUIREMENTS }],
    claim: { operator: "eq", value: 50 },
  });
}

describe("search hints limits", () => {
  test("a top score below 0.44 is weak", () => {
    writeCodeCertificate(searchHintWeakScoreCertificate());
    expect(SEARCH_HINT_WEAK_SCORE).toBe(0.44);
  });

  test("at most 10 hints are shown", () => {
    writeCodeCertificate(searchHintShownLimitCertificate());
    expect(SEARCH_HINT_LIMIT).toBe(10);
  });

  test("a provider result holds at most 20 hints", () => {
    writeCodeCertificate(searchHintsResultLimitCertificate());
    expect(SEARCH_HINTS_MAX_LIMIT).toBe(20);
  });

  test("bootstrap offers search hints from 50 requirement documents", () => {
    writeCodeCertificate(searchHintsOfferCertificate());
    expect(SEARCH_HINTS_OFFER_REQUIREMENTS).toBe(50);
  });
});
