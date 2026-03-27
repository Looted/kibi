import type { PrologProcess } from "../prolog.js";
import { VALID_ENTITY_TYPES, queryEntities } from "../query/service.js";
import { rankEntities } from "../search-ranking.js";
import type { SearchMatch } from "../search-ranking.js";
import {
  printDiscoveryResult,
  withAttachedBranchProlog,
} from "./discovery-shared.js";

interface SearchOptions {
  type?: string;
  format?: "json" | "table";
  limit?: string;
  offset?: string;
}

// implements REQ-mcp-search-discovery, REQ-003
export async function searchCommand(
  query: string | undefined,
  options: SearchOptions,
): Promise<void> {
  if (!query?.trim()) {
    console.error("Error: search query is required");
    process.exitCode = 1;
    return;
  }

  if (options.type && !VALID_ENTITY_TYPES.includes(options.type)) {
    console.error(
      `Error: invalid type '${options.type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  await withAttachedBranchProlog(async (prolog) => {
    const limit = Number.parseInt(options.limit || "20", 10);
    const offset = Number.parseInt(options.offset || "0", 10);
    const result = await executeSearch(
      prolog,
      query,
      options.type,
      limit,
      offset,
    );
    printDiscoveryResult(
      options.format,
      result,
      buildSearchText(query, result),
    );
  });
}

async function executeSearch(
  prolog: PrologProcess,
  query: string,
  type: string | undefined,
  limit: number,
  offset: number,
): Promise<{ results: SearchMatch[]; count: number }> {
  const entitiesResult = await queryEntities(prolog, {
    type,
    limit: 100000,
    offset: 0,
  });

  const matches = await rankEntities(
    entitiesResult.entities,
    query,
    process.cwd(),
  );
  const paginated = matches.slice(offset, offset + limit);
  return { results: paginated, count: matches.length };
}

function buildSearchText(
  query: string,
  result: { results: SearchMatch[]; count: number },
): string {
  if (result.count === 0) {
    return `No search results for '${query}'.`;
  }

  return `Found ${result.count} search results for '${query}'. Showing ${result.results.length}: ${result.results.map((match) => match.entity.id).join(", ")}`;
}
