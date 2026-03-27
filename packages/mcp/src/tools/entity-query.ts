import type { PrologProcess } from "kibi-cli/prolog";
import {
  escapeAtomContent,
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
} from "kibi-cli/prolog/codec";

export interface EntityQueryArgs {
  type?: string;
  id?: string;
  tags?: string[];
  sourceFile?: string;
}

export const VALID_ENTITY_TYPES = [
  // implements REQ-002
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
];

// implements REQ-002, REQ-013
export function validateEntityType(type?: string): void {
  if (type && !VALID_ENTITY_TYPES.includes(type)) {
    throw new Error(
      `Invalid type '${type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
    );
  }
}

// implements REQ-002, REQ-013
export function buildEntityGoal(args: EntityQueryArgs): string {
  const { type, id, tags, sourceFile } = args;

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
    if (type) {
      const safeType = escapeAtomContent(type);
      return `findall([Id,'${safeType}',Props], kb_entity(Id, '${safeType}', Props), Results)`;
    }
    return "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
  }

  if (type) {
    const safeType = escapeAtomContent(type);
    return `findall([Id,'${safeType}',Props], kb_entity(Id, '${safeType}', Props), Results)`;
  }

  return "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
}

// implements REQ-002, REQ-013
export async function loadEntities(
  prolog: PrologProcess,
  args: EntityQueryArgs,
): Promise<Record<string, unknown>[]> {
  validateEntityType(args.type);

  const goal = buildEntityGoal(args);
  const queryResult = await prolog.query(goal);
  let results: Record<string, unknown>[] = [];

  if (!queryResult.success) {
    throw new Error(queryResult.error || "Query failed with unknown error");
  }

  if (queryResult.bindings.Results) {
    const entitiesData = parseListOfLists(queryResult.bindings.Results);
    for (const data of entitiesData) {
      results.push(parseEntityFromList(data));
    }
  } else if (queryResult.bindings.Result) {
    results = [parseEntityFromBinding(queryResult.bindings.Result)];
  }

  if (args.tags && args.tags.length > 0) {
    const requestedTags = args.tags;
    results = dedupeEntities(
      results.filter((entity) => hasAnyTag(entity, requestedTags)),
    );
  }

  return dedupeEntities(results);
}

// implements REQ-002
export function paginateResults<T>(results: T[], limit = 100, offset = 0): T[] {
  return results.slice(offset, offset + limit);
}

function hasAnyTag(
  entity: Record<string, unknown>,
  requestedTags: string[],
): boolean {
  const expected = new Set(requestedTags.map(normalizeTagValue));
  const rawTags = entity.tags;
  if (!Array.isArray(rawTags) || rawTags.length === 0) {
    return false;
  }

  for (const tag of rawTags) {
    if (expected.has(normalizeTagValue(tag))) {
      return true;
    }
  }

  return false;
}

function normalizeTagValue(tag: unknown): string {
  return String(tag).trim();
}

// implements REQ-002
export function dedupeEntities(
  entities: Record<string, unknown>[],
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const deduped: Record<string, unknown>[] = [];

  for (const entity of entities) {
    const id = String(entity.id ?? "");
    const type = String(entity.type ?? "");
    const key = `${type}::${id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entity);
  }

  return deduped;
}
