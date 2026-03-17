/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type { PrologProcess } from "../prolog.js";
import {
  escapeAtom,
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
} from "../prolog/codec.js";

export interface QueryFilters {
  type?: string;
  id?: string;
  tags?: string[];
  sourceFile?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  entities: Array<Record<string, unknown>>;
  totalCount: number;
}

export const VALID_ENTITY_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
];

/**
 * Build a Prolog query goal from filters.
 */
export function buildEntityQueryGoal(filters: QueryFilters): string {
  const { type, id, sourceFile, tags } = filters;

  if (sourceFile) {
    const safeSource = escapeAtom(sourceFile);
    if (type) {
      const safeType = escapeAtom(type);
      return `findall([Id,'${safeType}',Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, '${safeType}', Props)), Results)`;
    }
    return `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
  }

  if (id && type) {
    const safeId = escapeAtom(id);
    const safeType = escapeAtom(type);
    return `findall(['${safeId}','${safeType}',Props], kb_entity('${safeId}', '${safeType}', Props), Results)`;
  }

  if (id) {
    const safeId = escapeAtom(id);
    return `findall(['${safeId}',Type,Props], kb_entity('${safeId}', Type, Props), Results)`;
  }

  if (tags && tags.length > 0) {
    if (type) {
      const safeType = escapeAtom(type);
      return `findall([Id,'${safeType}',Props], kb_entity(Id, '${safeType}', Props), Results)`;
    }
    return "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
  }

  if (type) {
    const safeType = escapeAtom(type);
    return `findall([Id,'${safeType}',Props], kb_entity(Id, '${safeType}', Props), Results)`;
  }

  return "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
}

/**
 * Execute a filtered entity query against the KB.
 */
export async function queryEntities(
  prolog: PrologProcess,
  filters: QueryFilters,
): Promise<QueryResult> {
  const { tags, limit = 100, offset = 0 } = filters;

  const goal = buildEntityQueryGoal(filters);
  const queryResult = await prolog.query(goal);

  let entities: Array<Record<string, unknown>> = [];

  if (queryResult.success) {
    if (queryResult.bindings.Results) {
      const entitiesData = parseListOfLists(queryResult.bindings.Results);

      for (const data of entitiesData) {
        const entity = parseEntityFromList(data);
        entities.push(entity);
      }
    } else if (queryResult.bindings.Result) {
      const entity = parseEntityFromBinding(queryResult.bindings.Result);
      entities = [entity];
    }
  } else {
    throw new Error(queryResult.error || "Query failed with unknown error");
  }

  // Apply tag filtering client-side if specified
  if (tags && tags.length > 0) {
    entities = dedupeEntities(
      entities.filter((entity) => hasAnyTag(entity, tags)),
    );
  }

  const totalCount = entities.length;
  const paginated = entities.slice(offset, offset + limit);

  return { entities: paginated, totalCount };
}

/**
 * Validate entity type.
 */
export function validateEntityType(type: string): boolean {
  return VALID_ENTITY_TYPES.includes(type);
}

/**
 * Get validation error message for invalid type.
 */
export function getInvalidTypeError(type: string): string {
  return `Invalid type '${type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`;
}

/**
 * Build human-readable summary text for query results.
 */
export function buildQuerySummaryText(
  result: QueryResult,
  filters: QueryFilters,
): string {
  const { entities, totalCount } = result;
  const { type, offset, limit } = filters;

  if (totalCount === 0) {
    return `No entities found${type ? ` of type '${type}'` : ""}.`;
  }

  const details = entities
    .map((e) => {
      const id = String(e.id || "").replace(/^file:\/\/.*\//, "");
      const title = String(e.title || "");
      const status = String(e.status || "");
      return `${id} (${title}, status=${status})`;
    })
    .join(", ");

  return `Found ${totalCount} entities${type ? ` of type '${type}'` : ""}. Showing ${entities.length} (offset ${offset}, limit ${limit}): ${details}`;
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

function dedupeEntities(
  entities: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const deduped: Array<Record<string, unknown>> = [];

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
