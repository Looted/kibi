import {
  escapeAtomContent,
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
} from "../../prolog/codec.js";
import type { PrologPort } from "./runtime-types.js";

export type EntityQueryInput = {
  readonly type?: string;
  readonly id?: string;
  readonly tags?: readonly string[];
  readonly sourceFile?: string;
  /** Page size for index-backed queries; bounds each query's output. */
  readonly limit?: number;
  readonly offset?: number;
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

// implements REQ-002, REQ-013
export function buildEntityGoal(input: EntityQueryInput): string {
  const { type, id, tags, sourceFile } = input;
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

// implements REQ-002, REQ-013
export async function loadEntities(
  prolog: Pick<PrologPort, "query">,
  input: EntityQueryInput,
): Promise<Record<string, unknown>[]> {
  validateEntityType(input.type);
  const queryResult = await prolog.query(buildEntityGoal(input));
  if (!queryResult.success) {
    throw new Error(queryResult.error || "Query failed with unknown error");
  }

  let entities: Record<string, unknown>[] = [];
  const resultsBinding = queryResult.bindings.Results;
  const resultBinding = queryResult.bindings.Result;
  if (resultsBinding) {
    entities = parseListOfLists(resultsBinding).map(parseEntityFromList);
  } else if (resultBinding) {
    entities = [parseEntityFromBinding(resultBinding)];
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

// implements REQ-kibi-operation-interface-parity, REQ-mcp-search-discovery
export async function loadSearchCandidates(
  prolog: Pick<PrologPort, "searchEntities">,
  input: {
    readonly query: string;
    readonly type?: string;
    readonly maxCandidates?: number;
  },
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const maxCandidates = input.maxCandidates ?? Number.POSITIVE_INFINITY;
  const candidates: Record<string, unknown>[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total && candidates.length < maxCandidates) {
    // Call through the port property, never via a detached local: EngineClient
    // searchEntities depends on `this` (this.command), and the PrologPort
    // contract does not promise a pre-bound method.
    const page = await prolog.searchEntities?.(
      {
        query: input.query,
        ...(input.type !== undefined ? { type: input.type } : {}),
        limit: SEARCH_CANDIDATE_PAGE_SIZE,
        offset,
      },
      signal,
    );
    if (!page || page.entities.length === 0) break;
    candidates.push(...page.entities);
    total = page.count;
    offset += page.entities.length;
  }
  return Number.isFinite(maxCandidates)
    ? candidates.slice(0, maxCandidates)
    : candidates;
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
