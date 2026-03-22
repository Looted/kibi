import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { PrologProcess } from "kibi-cli/prolog";
import {
  loadEntities,
  paginateResults,
  validateEntityType,
} from "./entity-query.js";
import { resolveWorkspaceRoot } from "../workspace.js";

export interface SearchArgs {
  query: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface SearchMatch {
  entity: Record<string, unknown>;
  score: number;
  reasons: string[];
  snippet?: string;
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
    throw new Error("Search execution failed: query must be a non-empty string");
  }

  validateEntityType(type);

  try {
    const workspaceRoot = resolveWorkspaceRoot();
    const entities = await loadEntities(prolog, { type });
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
  const reasons: string[] = [];
  let score = 0;

  const id = String(entity.id ?? "");
  const title = String(entity.title ?? "");
  const type = String(entity.type ?? "");
  const source = String(entity.source ?? "");
  const owner = String(entity.owner ?? "");
  const priority = String(entity.priority ?? "");
  const severity = String(entity.severity ?? "");
  const tags = Array.isArray(entity.tags)
    ? entity.tags.map((tag) => String(tag))
    : [];

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

  const metadataFields = [type, source, owner, priority, severity];
  const metadataMatched = metadataFields.some((field) => normalize(field).includes(normalizedQuery));
  if (metadataMatched) {
    score += 20;
    reasons.push("metadata match");
  }

  const matchingTags = tags.filter((tag) => normalize(tag).includes(normalizedQuery));
  if (matchingTags.length > 0) {
    score += 30;
    reasons.push("tag match");
  }

  const titleTokenMatches = countTokenMatches(normalizedTitle, tokens);
  if (titleTokenMatches > 0) {
    score += titleTokenMatches * 8;
    reasons.push("title token coverage");
  }

  const bodyText = await loadMarkdownBody(source, workspaceRoot);
  let snippet: string | undefined;
  if (bodyText) {
    const normalizedBody = normalize(bodyText);
    if (normalizedBody.includes(normalizedQuery)) {
      score += 15;
      reasons.push("markdown body match");
      snippet = buildSnippet(bodyText, query);
    } else {
      const bodyTokenMatches = countTokenMatches(normalizedBody, tokens);
      if (bodyTokenMatches > 0) {
        score += bodyTokenMatches * 3;
        reasons.push("markdown body token coverage");
        snippet = buildSnippet(bodyText, query);
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

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function countTokenMatches(haystack: string, tokens: string[]): number {
  return tokens.filter((token) => haystack.includes(token)).length;
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

  const filePath = path.isAbsolute(normalizedSource)
    ? normalizedSource
    : path.join(workspaceRoot, normalizedSource);

  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    return matter(fileContent).content;
  } catch {
    return null;
  }
}

function buildSnippet(bodyText: string, query: string): string | undefined {
  const lines = bodyText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const normalizedQuery = normalize(query);
  const matchedLine =
    lines.find((line) => normalize(line).includes(normalizedQuery)) ?? lines[0];

  if (!matchedLine) {
    return undefined;
  }

  return matchedLine.length > 160 ? `${matchedLine.slice(0, 157)}...` : matchedLine;
}
