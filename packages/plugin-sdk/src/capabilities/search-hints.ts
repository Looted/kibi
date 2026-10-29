/**
 * kibi.search-hints.v1 — meaning-based suggestions for a weak search answer.
 *
 * When `kb_search` ranks a question lexically and the answer is weak, the
 * host asks a provider which current entities the question is probably
 * about. The host sends the entities it already loaded (never file paths),
 * so a provider sees exactly the active branch store, and renders the hints
 * itself. Hints are advice for the agent's next question: they never enter
 * search results, the governing answer or any check.
 */

/** Most hints a host may request in one call. */
// implements REQ-capability-search-hints-v1
export const SEARCH_HINTS_MAX_LIMIT = 20 as const;

// implements REQ-capability-search-hints-v1
export interface SearchHintsEntity {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  /** Title, statement and body text, already capped by the host. */
  readonly text: string;
  /** Host content hash of `text`; providers key derived data by it. */
  readonly hash: string;
}

// implements REQ-capability-search-hints-v1
export interface SearchHintsInput {
  readonly query: string;
  /** 1..SEARCH_HINTS_MAX_LIMIT. */
  readonly limit: number;
  readonly entities: readonly SearchHintsEntity[];
  /** Host-owned directory where a provider may cache derived data. */
  readonly cacheDirectory: string;
}

// implements REQ-capability-search-hints-v1
export interface SearchHint {
  /** One of the input entity ids. */
  readonly id: string;
  /** Relevance in [0, 1]; higher is closer to the question. */
  readonly score: number;
}

// implements REQ-capability-search-hints-v1
export interface SearchHintsResult {
  readonly hints: readonly SearchHint[];
}

// implements REQ-capability-search-hints-v1
export interface SearchHintsV1 {
  readonly id: string;
  /** Provider model id copied onto provenance stamps. */
  readonly model: string;
  hint(input: SearchHintsInput): SearchHintsResult | Promise<SearchHintsResult>;
}
