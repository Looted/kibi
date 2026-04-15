import type { PrologProcess } from "kibi-cli/prolog";
import type { SearchMatch } from "kibi-cli/search-ranking";
import { rankEntities } from "kibi-cli/search-ranking";
import { resolveWorkspaceRoot } from "../workspace.js";
import {
  loadEntities,
  paginateResults,
  validateEntityType,
} from "./entity-query.js";

export interface SearchArgs {
  query: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    results: SearchMatch[];
    count: number;
  };
}

// implements REQ-mcp-search-discovery, REQ-002
export async function handleKbSearch(
  prolog: PrologProcess,
  args: SearchArgs,
): Promise<SearchResult> {
  const { query, type, limit = 20, offset = 0 } = args;
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new Error(
      "Search execution failed: query must be a non-empty string",
    );
  }

  validateEntityType(type);

  try {
    const workspaceRoot = resolveWorkspaceRoot();
    const entities = await loadEntities(prolog, {
      ...(type !== undefined ? { type } : {}),
    });
    const matches = await rankEntities(entities, trimmedQuery, workspaceRoot);
    const paginated = paginateResults(matches, limit, offset);

    const text =
      matches.length === 0
        ? `No search results for '${trimmedQuery}'.`
        : `Found ${matches.length} search results for '${trimmedQuery}'. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${paginated
            .map((match) => `${match.entity.id} [${match.reasons.join(", ")}]`)
            .join(", ")}`;

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        results: paginated,
        count: matches.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("Search execution failed:")) {
      throw error;
    }
    throw new Error(`Search execution failed: ${message}`);
  }
}
