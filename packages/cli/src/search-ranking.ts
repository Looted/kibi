import fs from "node:fs/promises";
import path from "node:path";

export interface SearchMatch {
  entity: Record<string, unknown>;
  score: number;
  reasons: string[];
  snippet?: string;
}

interface SearchTextForms {
  normalized: string;
  compact: string;
}

interface SearchQueryContext {
  phrase: SearchTextForms;
  signalTokens: string[];
  rawTrimmedQuery: string;
}

const SEARCH_STOP_WORDS = new Set([
  "to",
  "in",
  "out",
  "log",
  "logged",
  "unable",
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "not",
]);

// implements REQ-mcp-search-discovery, REQ-002, REQ-003
export async function rankEntities(
  entities: Record<string, unknown>[],
  query: string,
  workspaceRoot: string,
): Promise<SearchMatch[]> {
  const queryContext = buildSearchQueryContext(query);
  if (!queryContext.rawTrimmedQuery || queryContext.signalTokens.length === 0) {
    return [];
  }

  const matches: SearchMatch[] = [];

  for (const entity of entities) {
    const match = await rankEntity(entity, queryContext, workspaceRoot);
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
    return String(left.entity.id ?? "").localeCompare(
      String(right.entity.id ?? ""),
    );
  });

  return matches;
}

// implements REQ-mcp-search-discovery
async function rankEntity(
  entity: Record<string, unknown>,
  queryContext: SearchQueryContext,
  workspaceRoot: string,
): Promise<SearchMatch | null> {
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

  const titleForms = buildSearchTextForms(title);
  const idForms = buildSearchTextForms(id);

  if (isExactSearchMatch(titleForms, queryContext.phrase)) {
    score += 100;
    reasons.push("exact title match");
  } else if (isPhraseSearchMatch(titleForms, queryContext.phrase)) {
    score += 60;
    reasons.push("title phrase match");
  }

  if (isExactSearchMatch(idForms, queryContext.phrase)) {
    score += 90;
    reasons.push("exact ID match");
  } else if (isPhraseSearchMatch(idForms, queryContext.phrase)) {
    score += 55;
    reasons.push("ID match");
  }

  const metadataFields = [type, source, owner, priority, severity];
  const metadataMatched = metadataFields.some((field) =>
    isPhraseSearchMatch(buildSearchTextForms(field), queryContext.phrase),
  );
  if (metadataMatched) {
    score += 20;
    reasons.push("metadata match");
  }

  const matchingTags = tags.filter((tag) =>
    isPhraseSearchMatch(buildSearchTextForms(tag), queryContext.phrase),
  );
  if (matchingTags.length > 0) {
    score += 30;
    reasons.push("tag match");
  }

  const titleTokenMatches = countTokenMatches(titleForms, queryContext.signalTokens);
  if (titleTokenMatches > 0) {
    score += titleTokenMatches * 8;
    reasons.push("title token coverage");
  }

  const bodyText =
    (await loadMarkdownBody(source, workspaceRoot)) ??
    getInlineBodyText(entity);
  let snippet: string | undefined;
  if (bodyText) {
    const bodyForms = buildSearchTextForms(bodyText);
    if (isPhraseSearchMatch(bodyForms, queryContext.phrase)) {
      score += 15;
      reasons.push("markdown body match");
      snippet = buildSnippet(bodyText, queryContext.phrase);
    } else {
      const bodyTokenMatches = countTokenMatches(
        bodyForms,
        queryContext.signalTokens,
      );
      if (bodyTokenMatches > 0) {
        score += bodyTokenMatches * 3;
        reasons.push("markdown body token coverage");
        snippet = buildSnippet(bodyText, queryContext.phrase);
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
    ...(snippet !== undefined ? { snippet } : {}),
  };
}

export async function loadMarkdownBody(
  // implements REQ-007, REQ-mcp-search-discovery
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

  // Resolve to absolute path; relative paths are resolved against workspaceRoot.
  const resolved = path.resolve(
    path.isAbsolute(normalizedSource)
      ? normalizedSource
      : path.join(workspaceRoot, normalizedSource),
  );

  // Reject paths that escape the workspace root to prevent path traversal.
  const normalizedRoot = path.resolve(workspaceRoot);
  if (!resolved.startsWith(normalizedRoot + path.sep)) {
    return null;
  }

  try {
    const fileContent = await fs.readFile(resolved, "utf8");
    return stripFrontmatter(fileContent);
  } catch {
    return null;
  }
}

// implements REQ-mcp-search-discovery
function stripFrontmatter(content: string): string {
  const trimmedContent = content.trimStart();
  if (!trimmedContent.startsWith("---")) {
    return content;
  }

  const openingDelimiter = /^---[^\S\r\n]*(?:\r?\n|$)/.exec(trimmedContent);
  if (!openingDelimiter) {
    return content;
  }

  const closingDelimiter = /(?:\r?\n)---[^\S\r\n]*(?:\r?\n|$)/g;
  closingDelimiter.lastIndex = openingDelimiter[0].length;

  const match = closingDelimiter.exec(trimmedContent);
  if (!match) {
    return content;
  }

  return trimmedContent.slice(match.index + match[0].length);
}

// implements REQ-mcp-search-discovery
function buildSearchQueryContext(query: string): SearchQueryContext {
  return {
    phrase: buildSearchTextForms(query),
    signalTokens: tokenizeSignalTerms(query),
    rawTrimmedQuery: query.trim(),
  };
}

// implements REQ-mcp-search-discovery
function buildSearchTextForms(value: string): SearchTextForms {
  const normalized = normalizeSearchText(value);
  return {
    normalized,
    compact: normalized.replace(/\s+/g, ""),
  };
}

// implements REQ-mcp-search-discovery
function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeSimplePlural)
    .join(" ");
}

// implements REQ-mcp-search-discovery
function tokenizeSignalTerms(value: string): string[] {
  return Array.from(
    new Set(
      normalizeSearchText(value)
        .split(/\s+/)
        .filter((token) => token && !SEARCH_STOP_WORDS.has(token)),
    ),
  );
}

// implements REQ-mcp-search-discovery
function singularizeSimplePlural(token: string): string {
  if (
    token.length <= 4 ||
    !token.endsWith("s") ||
    token.endsWith("ss") ||
    token.endsWith("us") ||
    token.endsWith("is")
  ) {
    return token;
  }

  return token.slice(0, -1);
}

// implements REQ-mcp-search-discovery
function isExactSearchMatch(
  haystack: SearchTextForms,
  needle: SearchTextForms,
): boolean {
  return (
    haystack.normalized === needle.normalized ||
    (needle.compact !== "" && haystack.compact === needle.compact)
  );
}

// implements REQ-mcp-search-discovery
function isPhraseSearchMatch(
  haystack: SearchTextForms,
  needle: SearchTextForms,
): boolean {
  return (
    haystack.normalized.includes(needle.normalized) ||
    (needle.compact !== "" && haystack.compact.includes(needle.compact))
  );
}

// implements REQ-mcp-search-discovery
function countTokenMatches(haystack: SearchTextForms, tokens: string[]): number {
  return tokens.filter(
    (token) =>
      haystack.normalized.includes(token) || haystack.compact.includes(token),
  ).length;
}

// implements REQ-mcp-search-discovery
function getInlineBodyText(entity: Record<string, unknown>): string | null {
  const candidates = [
    entity.body,
    entity.markdownBody,
    entity.markdown_body,
    entity.content,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate;
    }
  }

  return null;
}

// implements REQ-mcp-search-discovery
function buildSnippet(
  bodyText: string,
  queryForms: SearchTextForms,
): string | undefined {
  const lines = bodyText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matchedLine =
    lines.find((line) =>
      isPhraseSearchMatch(buildSearchTextForms(line), queryForms),
    ) ?? lines[0];

  if (!matchedLine) {
    return undefined;
  }

  return matchedLine.length > 160
    ? `${matchedLine.slice(0, 157)}...`
    : matchedLine;
}
