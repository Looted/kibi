import { describe, expect, test } from "bun:test";
import { SEARCH_HINTS_MAX_LIMIT } from "kibi-plugin-sdk";
import {
  DECISION_CARD_LIMIT,
  MEANING_LIST_LIMIT,
  MEANING_WEIGHT,
  WEAK_COVERAGE,
} from "../../../src/decision-search.js";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

/**
 * The limits of decision search. Each certificate assumes the value one
 * constant holds; Kibi reads the same constant again at ingest and decides
 * the claim's fact against it.
 */

/** Search shall list at most 7 decisions related by meaning. */
export function meaningListLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-meaning-list-limit",
    variable: "max_meaning_decisions",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MEANING_LIST_LIMIT }],
    claim: { operator: "lte", value: 7 },
  });
}

/** A kibi.search-hints.v1 request shall score at most 50000 entities. */
export function meaningScoreLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-meaning-score-limit",
    variable: "max_scored_entities",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_HINTS_MAX_LIMIT }],
    claim: { operator: "lte", value: 50_000 },
  });
}

/** The meaning ranking shall weigh 0.5 against the word ranking. */
export function meaningWeightCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-meaning-weight",
    variable: "meaning_weight",
    valueType: "real",
    assumptions: [{ operator: "eq", value: MEANING_WEIGHT }],
    claim: { operator: "eq", value: 0.5 },
  });
}

/** The kb_search default card count shall be 5. */
export function decisionCardLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-decision-card-limit",
    variable: "default_decision_cards",
    valueType: "int",
    assumptions: [{ operator: "eq", value: DECISION_CARD_LIMIT }],
    claim: { operator: "eq", value: 5 },
  });
}

/** A card shall govern a question only when it covers at least half its weight. */
export function weakCoverageCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-governing-coverage",
    variable: "governing_coverage",
    valueType: "real",
    assumptions: [{ operator: "eq", value: WEAK_COVERAGE }],
    claim: { operator: "eq", value: 0.5 },
  });
}

describe("decision search limits", () => {
  test("at most 7 decisions are listed as related by meaning", () => {
    writeCodeCertificate(meaningListLimitCertificate());
    expect(MEANING_LIST_LIMIT).toBe(7);
  });

  test("a provider scores at most 50000 entities", () => {
    writeCodeCertificate(meaningScoreLimitCertificate());
    expect(SEARCH_HINTS_MAX_LIMIT).toBe(50_000);
  });

  test("the meaning ranking weighs half the word ranking", () => {
    writeCodeCertificate(meaningWeightCertificate());
    expect(MEANING_WEIGHT).toBe(0.5);
  });

  test("a search returns at most 5 cards by default", () => {
    writeCodeCertificate(decisionCardLimitCertificate());
    expect(DECISION_CARD_LIMIT).toBe(5);
  });

  test("a card governs only from half the question's weight", () => {
    writeCodeCertificate(weakCoverageCertificate());
    expect(WEAK_COVERAGE).toBe(0.5);
  });
});
