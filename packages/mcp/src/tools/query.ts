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
  VALID_ENTITY_TYPES,
  loadEntities,
  paginateResults,
} from "./entity-query.js";

export { VALID_ENTITY_TYPES } from "./entity-query.js";

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
    const results = await loadEntities(prolog, { type, id, tags, sourceFile });
    const paginated = paginateResults(results, limit, offset);

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
