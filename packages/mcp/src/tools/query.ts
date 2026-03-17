/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import type { PrologProcess } from "kibi-cli/prolog";
import {
  escapeAtomContent,
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
  parsePrologValue,
  parsePropertyList,
  splitTopLevel,
} from "kibi-cli/prolog/codec";

export interface QueryArgs {
  type?: string;
  id?: string;
  tags?: string[];
  sourceFile?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    entities: Record<string, unknown>[];
    count: number;
  };
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
 * Handle kb.query tool calls
 * Reuses query logic from CLI command
 */
export async function handleKbQuery(
  prolog: PrologProcess,
  args: QueryArgs,
): Promise<QueryResult> {
  const { type, id, tags, sourceFile, limit = 100, offset = 0 } = args;

  try {
    let results: Record<string, unknown>[] = [];

    // Validate type if provided
    if (type) {
      if (!VALID_ENTITY_TYPES.includes(type)) {
        throw new Error(
          `Invalid type '${type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
        );
      }
    }

    // Build Prolog query
    let goal: string;

    if (sourceFile) {
      const safeSource = escapeAtomContent(sourceFile);
      if (type) {
        const safeType = escapeAtomContent(type);
        goal = `findall([Id,'${safeType}',Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, '${safeType}', Props)), Results)`;
      } else {
        goal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
      }
    } else if (id && type) {
      const safeId = escapeAtomContent(id);
      const safeType = escapeAtomContent(type);
      goal = `findall(['${safeId}','${safeType}',Props], kb_entity('${safeId}', '${safeType}', Props), Results)`;
    } else if (id) {
      const safeId = escapeAtomContent(id);
      goal = `findall(['${safeId}',Type,Props], kb_entity('${safeId}', Type, Props), Results)`;
    } else if (tags && tags.length > 0) {
      // TODO: Reintroduce server-side (Prolog) tag filtering once normalization
      // issues with tag list formats are resolved, to avoid fetching all entities
      // before filtering in JS for large knowledge bases.
      if (type) {
        const safeType = escapeAtomContent(type);
        goal = `findall([Id,'${safeType}',Props], kb_entity(Id, '${safeType}', Props), Results)`;
      } else {
        goal = "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
      }
    } else if (type) {
      const safeType = escapeAtomContent(type);
      goal = `findall([Id,'${safeType}',Props], kb_entity(Id, '${safeType}', Props), Results)`;
    } else {
      goal = "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
    }

    const queryResult = await prolog.query(goal);

    if (queryResult.success) {
      if (queryResult.bindings.Results) {
        const entitiesData = parseListOfLists(queryResult.bindings.Results);

        for (const data of entitiesData) {
          const entity = parseEntityFromList(data);
          results.push(entity);
        }
      } else if (queryResult.bindings.Result) {
        const entity = parseEntityFromBinding(queryResult.bindings.Result);
        results = [entity];
      }
    } else {
      throw new Error(queryResult.error || "Query failed with unknown error");
    }

    if (tags && tags.length > 0) {
      results = dedupeEntities(
        results.filter((entity) => hasAnyTag(entity, tags)),
      );
    }

    // Apply pagination
    const paginated = results.slice(offset, offset + limit);

    // Build human-readable text with entity IDs and titles
    let text: string;
    if (results.length === 0) {
      text = `No entities found${type ? ` of type '${type}'` : ""}.`;
    } else {
      const details = paginated
        .map((e) => {
          const id = (e.id as string).replace(/^file:\/\/.*\//, "");
          const title = e.title as string;
          const status = e.status as string;
          return `${id} (${title}, status=${status})`;
        })
        .join(", ");
      text = `Found ${results.length} entities${type ? ` of type '${type}'` : ""}. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${details}`;
    }

    // Return MCP structured response
    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
      structuredContent: {
        entities: paginated,
        count: results.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Query execution failed: ${message}`);
  }
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
