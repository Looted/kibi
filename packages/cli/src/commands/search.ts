import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { PrologProcess } from "../prolog.js";
import {
  VALID_ENTITY_TYPES,
  queryEntities,
} from "../query/service.js";
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

interface SearchMatch {
  entity: Record<string, unknown>;
  score: number;
  reasons: string[];
  snippet?: string;
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
    const result = await executeSearch(prolog, query, options.type, limit, offset);
    printDiscoveryResult(options.format, result, buildSearchText(query, result));
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

  const matches = await rankEntities(entitiesResult.entities, query, process.cwd());
  const paginated = matches.slice(offset, offset + limit);
  return { results: paginated, count: matches.length };
}

async function rankEntities(
  entities: Record<string, unknown>[],
  query: string,
  workspaceRoot: string,
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];

  for (const entity of entities) {
    const match = await rankEntity(entity, query, workspaceRoot);
    if (match) {
      matches.push(match);
    }
  }

  matches.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    const leftType = String(left.entity.type ?? "");
    const rightType = String(right.entity.type ?? "");
    if (leftType !== rightType) {
      return leftType.localeCompare(rightType);
    }
    return String(left.entity.id ?? "").localeCompare(String(right.entity.id ?? ""));
  });

  return matches;
}

async function rankEntity(
  entity: Record<string, unknown>,
  query: string,
  workspaceRoot: string,
): Promise<SearchMatch | null> {
  const normalizedQuery = normalize(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const id = String(entity.id ?? "");
  const title = String(entity.title ?? "");
  const source = String(entity.source ?? "");
  const type = String(entity.type ?? "");
  const owner = String(entity.owner ?? "");
  const priority = String(entity.priority ?? "");
  const severity = String(entity.severity ?? "");
  const tags = Array.isArray(entity.tags)
    ? entity.tags.map((tag) => String(tag))
    : [];

  let score = 0;
  const reasons: string[] = [];

  const normalizedTitle = normalize(title);
  const normalizedId = normalize(id);
  if (normalizedTitle === normalizedQuery) {
    score += 100;
    reasons.push("exact title match");
  } else if (normalizedTitle.includes(normalizedQuery)) {
    score += 60;
    reasons.push("title phrase match");
  }

  if (normalizedId === normalizedQuery) {
    score += 90;
    reasons.push("exact ID match");
  } else if (normalizedId.includes(normalizedQuery)) {
    score += 55;
    reasons.push("ID match");
  }

  if (tags.some((tag) => normalize(tag).includes(normalizedQuery))) {
    score += 30;
    reasons.push("tag match");
  }

  const metadataFields = [type, source, owner, priority, severity];
  if (metadataFields.some((field) => normalize(field).includes(normalizedQuery))) {
    score += 20;
    reasons.push("metadata match");
  }

  const titleTokenMatches = tokens.filter((token) => normalizedTitle.includes(token)).length;
  if (titleTokenMatches > 0) {
    score += titleTokenMatches * 8;
    reasons.push("title token coverage");
  }

  const body = await loadMarkdownBody(source, workspaceRoot);
  let snippet: string | undefined;
  if (body) {
    const normalizedBody = normalize(body);
    if (normalizedBody.includes(normalizedQuery)) {
      score += 15;
      reasons.push("markdown body match");
      snippet = firstSnippet(body);
    } else {
      const bodyTokenMatches = tokens.filter((token) => normalizedBody.includes(token)).length;
      if (bodyTokenMatches > 0) {
        score += bodyTokenMatches * 3;
        reasons.push("markdown body token coverage");
        snippet = firstSnippet(body);
      }
    }
  }

  if (score === 0) {
    return null;
  }

  return {
    entity,
    score,
    reasons: Array.from(new Set(reasons)),
    snippet,
  };
}

async function loadMarkdownBody(
  source: string,
  workspaceRoot: string,
): Promise<string | null> {
  if (!source) {
    return null;
  }

  const normalizedSource = source.split("#", 1)[0]?.trim() ?? "";
  if (!normalizedSource.endsWith(".md")) {
    return null;
  }

  const fullPath = path.isAbsolute(normalizedSource)
    ? normalizedSource
    : path.join(workspaceRoot, normalizedSource);

  try {
    const content = await fs.readFile(fullPath, "utf8");
    return matter(content).content;
  } catch {
    return null;
  }
}

function firstSnippet(body: string): string | undefined {
  const line = body
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find(Boolean);
  return line || undefined;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
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
