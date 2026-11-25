/**
 * kibi.search-hints.v1 — meaning-based similarity for kb_search.
 *
 * On every search the host sends the question and the texts of the
 * decisions and of the scenarios, tests and facts they link (never file
 * paths), and the provider scores each of them by similarity to the
 * question. The host fuses those scores with its word ranking and shows the
 * closest decisions; a provider never enters a check.
 */

/** Most entities a host may ask a provider to score in one call. */
export const SEARCH_HINTS_MAX_LIMIT = 50_000 as const;

export interface SearchHintsEntity {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  /** Title, statement and body text, already capped by the host. */
  readonly text: string;
  /** Host content hash of `text`; providers key derived data by it. */
  readonly hash: string;
}

export interface SearchHintsInput {
  readonly query: string;
  /** 1..SEARCH_HINTS_MAX_LIMIT. */
  readonly limit: number;
  readonly entities: readonly SearchHintsEntity[];
  /** Host-owned directory where a provider may cache derived data. */
  readonly cacheDirectory: string;
}

export interface SearchHint {
  /** One of the input entity ids. */
  readonly id: string;
  /** Relevance in [0, 1]; higher is closer to the question. */
  readonly score: number;
}

export interface SearchHintsResult {
  readonly hints: readonly SearchHint[];
}

export interface SearchHintsV1 {
  readonly id: string;
  /** Provider model id copied onto provenance stamps. */
  readonly model: string;
  hint(input: SearchHintsInput): SearchHintsResult | Promise<SearchHintsResult>;
}
