import {
  escapeAtomContent,
  normalizeEntityId,
  parseAtomList,
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
} from "../../prolog/codec.js";
import type {
  PrologEntityQueryInput,
  PrologEntityQueryResult,
  PrologPort,
  PrologSearchQueryInput,
  PrologSearchQueryResult,
} from "./runtime-types.js";

export type EntityQueryInput = {
  readonly type?: string;
  readonly id?: string;
  readonly tags?: readonly string[];
  readonly sourceFile?: string;
  /** Page size for index-backed queries; bounds each query's output. */
  readonly limit?: number;
  readonly offset?: number;
  /**
   * Proof selection only needs the contract. Omit receipt histories so a
   * campaign does not page every full test entity.
   */
  readonly projection?: "proof_contract";
};

export const VALID_ENTITY_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
] as const;

// implements REQ-002, REQ-013
export function validateEntityType(type?: string): void {
  if (type && !VALID_ENTITY_TYPES.some((candidate) => candidate === type)) {
    throw new Error(
      `Invalid type '${type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
    );
  }
}

/**
 * Proof campaign selection must not materialize every contracted test in a
 * single Prolog result. The specialized projection excludes receipt histories
 * and returns one bounded page at a time.
 */
export const PROOF_CONTRACT_PAGE_SIZE = 100;

// implements REQ-002, REQ-013
export function buildEntityGoal(input: EntityQueryInput): string {
  const { type, id, tags, sourceFile } = input;
  if (type === "test" && input.projection === "proof_contract") {
    const idTerm = id ? `some('${escapeAtomContent(id)}')` : "none";
    const limit = input.limit ?? PROOF_CONTRACT_PAGE_SIZE;
    const offset = input.offset ?? 0;
    return `kb_query_proof_contracts(${idTerm},${limit},${offset},Results)`;
  }
  if (sourceFile) {
    const safeSource = escapeAtomContent(sourceFile);
    if (type) {
      const safeType = escapeAtomContent(type);
      return `findall([Id,'${safeType}',Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, '${safeType}', Props)), Results)`;
    }
    return `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
  }
  if (id && type) {
    const safeId = escapeAtomContent(id);
    const safeType = escapeAtomContent(type);
    return `findall(['${safeId}','${safeType}',Props], kb_entity('${safeId}', '${safeType}', Props), Results)`;
  }
  if (id) {
    const safeId = escapeAtomContent(id);
    return `findall(['${safeId}',Type,Props], kb_entity('${safeId}', Type, Props), Results)`;
  }
  if (tags && tags.length > 0) {
    const tagTerms = tags.map((tag) => `'${escapeAtomContent(tag)}'`).join(",");
    if (type) {
      const safeType = escapeAtomContent(type);
      return `findall([Id,'${safeType}',Props], (member(Tag, [${tagTerms}]), kb_entities_by_tag(Tag, TagIds), member(Id, TagIds), kb_entity(Id, '${safeType}', Props)), Results)`;
    }
    return `findall([Id,Type,Props], (member(Tag, [${tagTerms}]), kb_entities_by_tag(Tag, TagIds), member(Id, TagIds), kb_entity(Id, Type, Props)), Results)`;
  }
  if (type) {
    const safeType = escapeAtomContent(type);
    if (input.limit !== undefined) {
      const offset = input.offset ?? 0;
      return `kb_query_entities('${safeType}', none, [], none, ${input.limit}, ${offset}, Results, Count)`;
    }
    return `findall([Id,'${safeType}',Props], kb_entity(Id, '${safeType}', Props), Results)`;
  }
  return "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
}

/**
 * Full test entities carry their receipt histories, which only grow. Callers
 * that must see every full entity of a type page through the indexed query so
 * no single Prolog answer can approach the bounded output capacity.
 */
const FULL_ENTITY_PAGE_SIZE = 25;

// implements REQ-002, REQ-013
export async function loadEntitiesPaged(
  prolog: Pick<PrologPort, "query">,
  type: (typeof VALID_ENTITY_TYPES)[number],
  pageSize: number = FULL_ENTITY_PAGE_SIZE,
): Promise<Record<string, unknown>[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("loadEntitiesPaged pageSize must be a positive integer");
  }
  const entities: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await loadEntities(prolog, { type, limit: pageSize, offset });
    entities.push(...page);
    if (page.length < pageSize) break;
  }
  return dedupeEntities(entities);
}

// implements REQ-002, REQ-013
export async function loadEntities(
  prolog: Pick<PrologPort, "query">,
  input: EntityQueryInput,
): Promise<Record<string, unknown>[]> {
  validateEntityType(input.type);
  const readPage = async (
    pageInput: EntityQueryInput,
  ): Promise<Record<string, unknown>[]> => {
    const queryResult = await prolog.query(buildEntityGoal(pageInput));
    if (!queryResult.success) {
      throw new Error(queryResult.error || "Query failed with unknown error");
    }
    const resultsBinding = queryResult.bindings.Results;
    const resultBinding = queryResult.bindings.Result;
    if (resultsBinding) {
      return parseListOfLists(resultsBinding).map(parseEntityFromList);
    }
    return resultBinding ? [parseEntityFromBinding(resultBinding)] : [];
  };

  let entities: Record<string, unknown>[];
  if (
    input.type === "test" &&
    input.projection === "proof_contract" &&
    input.id === undefined &&
    input.limit === undefined &&
    input.offset === undefined
  ) {
    entities = [];
    for (let offset = 0; ; offset += PROOF_CONTRACT_PAGE_SIZE) {
      const page = await readPage({
        ...input,
        limit: PROOF_CONTRACT_PAGE_SIZE,
        offset,
      });
      entities.push(...page);
      if (page.length < PROOF_CONTRACT_PAGE_SIZE) break;
    }
  } else {
    entities = await readPage(input);
  }
  if (input.tags && input.tags.length > 0) {
    const requested = new Set(input.tags.map((tag) => tag.trim()));
    entities = entities.filter((entity) => {
      const tags = entity.tags;
      return (
        Array.isArray(tags) &&
        tags.some((tag) => requested.has(String(tag).trim()))
      );
    });
  }
  return dedupeEntities(entities);
}

// implements REQ-002
export function paginateResults<T>(
  results: readonly T[],
  limit = 100,
  offset = 0,
): T[] {
  return results.slice(offset, offset + limit);
}

/**
 * Page size for index-backed search candidate fetches. Each page is one
 * Prolog query, so a fixed page size substantially bounds each response and
 * fixes the observed large-KB output overflow; it is a practical bound, not
 * a byte-size guarantee for arbitrarily large individual entity payloads.
 */
// implements REQ-kibi-operation-interface-parity, REQ-mcp-search-discovery
export const SEARCH_CANDIDATE_PAGE_SIZE = 500;

function isPrologOutputOverflow(error: unknown): boolean {
  return error instanceof Error && error.message.includes("ENOBUFS");
}

// implements REQ-kibi-operation-interface-parity, REQ-mcp-search-discovery
export async function loadSearchCandidates(
  prolog: Pick<PrologPort, "searchEntities"> &
    Partial<Pick<PrologPort, "query">>,
  input: {
    readonly query: string;
    readonly type?: string;
    readonly maxCandidates?: number;
  },
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  // Call through the port property, never via a detached local: EngineClient
  // searchEntities depends on `this` (this.command), and the PrologPort
  // contract does not promise a pre-bound method. Ports without the indexed
  // engine method run the same bounded Prolog search through `query`.
  const readPage = (
    page: PrologSearchQueryInput,
  ): Promise<PrologSearchQueryResult> => {
    if (prolog.searchEntities) return prolog.searchEntities(page, signal);
    const query = prolog.query;
    if (query === undefined) return Promise.resolve({ entities: [], count: 0 });
    return searchEntitiesViaQuery(
      { query: (goal, querySignal) => query.call(prolog, goal, querySignal) },
      page,
      signal,
    );
  };
  return readCandidatePages(readPage, input);
}

/**
 * Projected candidate rows for every entity (optionally of one type), in id
 * order, bounded by `maxCandidates`. For semantic discovery that has no
 * lexical token to pre-filter candidates.
 */
// implements REQ-kibi-operation-interface-parity, REQ-mcp-search-discovery
export async function listSearchCandidates(
  prolog: Pick<PrologPort, "query">,
  input: { readonly type?: string; readonly maxCandidates: number },
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const type = input.type ? `'${escapeAtomContent(input.type)}'` : "none";
  return readCandidatePages(
    (page) =>
      readRowsAndCount(
        prolog,
        `kb_list_search_candidates(${type}, ${page.limit}, ${page.offset}, Rows, Count)`,
        "Search candidate listing failed",
        signal,
      ),
    { query: "", maxCandidates: input.maxCandidates },
  );
}

async function readCandidatePages(
  readPage: (page: PrologSearchQueryInput) => Promise<PrologSearchQueryResult>,
  input: {
    readonly query: string;
    readonly type?: string;
    readonly maxCandidates?: number;
  },
): Promise<Record<string, unknown>[]> {
  const maxCandidates = input.maxCandidates ?? Number.POSITIVE_INFINITY;
  const candidates: Record<string, unknown>[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let pageSize = SEARCH_CANDIDATE_PAGE_SIZE;
  while (offset < total && candidates.length < maxCandidates) {
    let page: PrologSearchQueryResult;
    try {
      page = await readPage({
        query: input.query,
        ...(input.type !== undefined ? { type: input.type } : {}),
        limit: pageSize,
        offset,
      });
    } catch (error) {
      // A page of unusually large rows can still exceed the bounded Prolog
      // output. Halve the page and retry the same offset; the smaller size is
      // kept for the rest of the scan. Only a single row that overflows on its
      // own is a real failure.
      if (pageSize > 1 && isPrologOutputOverflow(error)) {
        pageSize = Math.max(1, Math.floor(pageSize / 2));
        continue;
      }
      throw error;
    }
    if (page.entities.length === 0) break;
    candidates.push(...page.entities);
    total = page.count;
    offset += page.entities.length;
  }
  return Number.isFinite(maxCandidates)
    ? candidates.slice(0, maxCandidates)
    : candidates;
}

function searchEntitiesViaQuery(
  prolog: Pick<PrologPort, "query">,
  input: PrologSearchQueryInput,
  signal?: AbortSignal,
): Promise<PrologSearchQueryResult> {
  const type = input.type ? `'${escapeAtomContent(input.type)}'` : "none";
  return readRowsAndCount(
    prolog,
    `kb_search_entities(${type}, '${escapeAtomContent(input.query)}', ${input.limit}, ${input.offset}, Rows, Count)`,
    "Indexed search candidate query failed",
    signal,
  );
}

async function readRowsAndCount(
  prolog: Pick<PrologPort, "query">,
  goal: string,
  errorLabel: string,
  signal?: AbortSignal,
): Promise<PrologEntityQueryResult> {
  const result = await prolog.query(goal, signal);
  if (!result.success) {
    // Same message as the engine client's indexed methods, so both surfaces
    // report a failure identically.
    throw new Error(result.error ?? errorLabel);
  }
  const entities = result.bindings.Rows
    ? parseListOfLists(result.bindings.Rows).map(parseEntityFromList)
    : [];
  const count = Number.parseInt(result.bindings.Count ?? "0", 10);
  return { entities, count: Number.isFinite(count) ? count : entities.length };
}

/**
 * Rows per `kb_query_entities` request. Full entities carry receipt
 * histories, so a caller-sized page (up to 100k rows) is split into bounded
 * requests and concatenated; the reported count is the total match count.
 */
export const ENTITY_QUERY_CHUNK_SIZE = 25;

// implements REQ-kibi-operation-interface-parity
export async function queryEntityChunks(
  readChunk: (
    input: PrologEntityQueryInput,
  ) => Promise<PrologEntityQueryResult>,
  input: PrologEntityQueryInput,
): Promise<PrologEntityQueryResult> {
  const entities: Record<string, unknown>[] = [];
  let count = 0;
  let first = true;
  while (first || entities.length < input.limit) {
    const chunkLimit = Math.min(
      ENTITY_QUERY_CHUNK_SIZE,
      input.limit - entities.length,
    );
    const chunk = await readChunk({
      ...input,
      limit: chunkLimit,
      offset: input.offset + entities.length,
    });
    if (first) count = chunk.count;
    first = false;
    entities.push(...chunk.entities);
    if (chunk.entities.length < chunkLimit || chunkLimit === 0) break;
  }
  return { entities, count };
}

/** Bounded `kb_query_entities` paging for ports without the engine method. */
// implements REQ-kibi-operation-interface-parity
export function queryEntitiesViaQuery(
  prolog: Pick<PrologPort, "query">,
  input: PrologEntityQueryInput,
  signal?: AbortSignal,
): Promise<PrologEntityQueryResult> {
  const atom = (value: string | undefined) =>
    value === undefined ? "none" : `'${escapeAtomContent(value)}'`;
  const tags = `[${(input.tags ?? []).map((tag) => `'${escapeAtomContent(tag)}'`).join(",")}]`;
  return queryEntityChunks(
    (chunk) =>
      readRowsAndCount(
        prolog,
        `kb_query_entities(${atom(chunk.type)}, ${atom(chunk.id)}, ${tags}, ${atom(chunk.sourceFile)}, ${chunk.limit}, ${chunk.offset}, Rows, Count)`,
        "Indexed entity query failed",
        signal,
      ),
    input,
  );
}

/** Every entity id, without materializing entity properties. */
// implements REQ-002
export async function loadEntityIds(
  prolog: Pick<PrologPort, "query">,
): Promise<string[]> {
  const result = await prolog.query("kb_entity_ids(Ids)");
  if (!result.success) {
    throw new Error(
      `Entity id enumeration failed: ${result.error ?? "Unknown error"}`,
    );
  }
  return parseAtomList(result.bindings.Ids ?? "[]").map(normalizeEntityId);
}

/**
 * Properties a projected entity row keeps: what intent ranking, result
 * summaries and the search answer layer read. Large structured properties
 * (receipt histories, proof contracts, semantic inventories, rule IR) are
 * left in the store, as for search candidate rows.
 */
// implements REQ-kibi-search-answer-layer-v2
export const ENTITY_ROW_KEYS = [
  "id",
  "title",
  "status",
  "priority",
  "severity",
  "owner",
  "tags",
  "source",
  "sourceFile",
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
  "source_line",
  "source_end_line",
  "updated_at",
  "created_at",
  "semantic_text",
  "text_ref",
  "fact_kind",
  "expects",
  "approved_by",
  "approval_ref",
] as const;

/** Upper bound on ids per batched row query, so one answer stays bounded. */
// implements REQ-kibi-search-answer-layer-v2
export const ENTITY_ROW_BATCH_LIMIT = 200;

// implements REQ-mcp-search-discovery, REQ-kibi-search-answer-layer-v2
export function entityRowsGoal(
  ids: readonly string[],
  keys: readonly string[] = ENTITY_ROW_KEYS,
): string {
  const idList = ids.map((id) => `'${escapeAtomContent(id)}'`).join(",");
  const keyList = keys.map((key) => `'${escapeAtomContent(key)}'`).join(",");
  return `findall([Id,Type,Row], (member(Id, [${idList}]), kb_entity(Id, Type, Props), findall(Key=Value, (member(Key=Value, Props), memberchk(Key, [${keyList}])), Row)), Results)`;
}

/**
 * Projected rows for several entities in one Prolog query, in place of one
 * `loadEntities({ id })` round trip per entity. Unknown ids are skipped.
 */
// implements REQ-mcp-search-discovery, REQ-kibi-search-answer-layer-v2
export async function loadEntityRows(
  prolog: Pick<PrologPort, "query">,
  ids: readonly string[],
  keys: readonly string[] = ENTITY_ROW_KEYS,
): Promise<Record<string, unknown>[]> {
  const unique = [...new Set(ids.filter((id) => id.length > 0))];
  const rows: Record<string, unknown>[] = [];
  for (let start = 0; start < unique.length; start += ENTITY_ROW_BATCH_LIMIT) {
    const batch = unique.slice(start, start + ENTITY_ROW_BATCH_LIMIT);
    const result = await prolog.query(entityRowsGoal(batch, keys));
    if (!result.success) {
      throw new Error(result.error || "Entity row query failed");
    }
    rows.push(
      ...parseListOfLists(result.bindings.Results ?? "[]").map(
        parseEntityFromList,
      ),
    );
  }
  return dedupeEntities(rows);
}

/**
 * Replace projected search candidates with complete entities, one bounded
 * query per entity. Used only for the final result page when a caller asks
 * for full entity bodies.
 */
// implements REQ-mcp-search-discovery
export async function reloadFullEntities<
  TMatch extends { readonly entity: Record<string, unknown> },
>(
  prolog: Pick<PrologPort, "query">,
  matches: readonly TMatch[],
): Promise<TMatch[]> {
  const reloaded: TMatch[] = [];
  for (const match of matches) {
    const id = String(match.entity.id ?? "");
    const type = match.entity.type;
    const [full] = id
      ? await loadEntities(prolog, {
          id,
          ...(typeof type === "string" ? { type } : {}),
        })
      : [];
    reloaded.push(full ? { ...match, entity: full } : match);
  }
  return reloaded;
}

// implements REQ-002
export function dedupeEntities(
  entities: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = `${String(entity.type ?? "")}::${String(entity.id ?? "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
