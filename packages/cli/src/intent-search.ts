import path from "node:path";

import { bodySnippetLine } from "./entity-body-context.js";
import {
  type NegativePathFacts,
  type NegativePathMarker,
  negativePathMarker,
  queryNegativePathFacts,
} from "./negative-path-facts.js";
import { escapeAtom, normalizeEntityId, parseTriples } from "./prolog/codec.js";
import { isProvenanceStub } from "./provenance-stub.js";
import {
  type VALID_ENTITY_TYPES,
  listSearchCandidates,
  loadEntityRows,
  loadSearchCandidates,
} from "./public/operations/discovery-entities.js";
import type { PrologPort } from "./public/operations/runtime-types.js";
import type { SearchMatch } from "./search-ranking.js";
import { loadMarkdownBodySync } from "./search-ranking.js";
import {
  type SearchTokenCache,
  openSearchTokenCache,
  tokenSourceHash,
} from "./search-token-cache.js";

export type IntentSearchFacetName =
  | "actors"
  | "actions"
  | "objects"
  | "constraints"
  | "aliases";

export type IntentSearchFacets = Readonly<
  Partial<Record<IntentSearchFacetName, readonly string[]>>
>;

export type SourceLocation = Readonly<{
  path: string;
  line?: number;
  column?: number;
  symbol?: string;
}>;

export type IntentSearchOptions = Readonly<{
  query: string;
  type?: (typeof VALID_ENTITY_TYPES)[number] | string;
  semanticFacets?: IntentSearchFacets;
  sourceLocations?: readonly SourceLocation[];
  minScore?: number;
}>;

export type IntentSourceMatch = Readonly<{
  path: string;
  symbolId?: string;
  distance?: number;
}>;

export type IntentGraphPath = Readonly<{
  from: string;
  relationships: readonly string[];
  to: string;
}>;

export type IntentSearchEvidence = Readonly<{
  normalizedScore: number;
  matchedFacets: readonly string[];
  sourceMatches: readonly IntentSourceMatch[];
  graphPaths: readonly IntentGraphPath[];
  abstentionEligible: boolean;
}>;

export type IntentSearchMatch = SearchMatch & {
  readonly evidence: IntentSearchEvidence;
  /**
   * Set on a negative-path fact: it describes a situation that must not
   * happen, so its title does not state something true.
   */
  readonly negativePath?: NegativePathMarker;
};

export type IntentSearchAnalysis = Readonly<{
  rankingMode: "intent-v1";
  candidateCount: number;
  acceptedCount: number;
  topScore: number | null;
  topTwoMargin: number | null;
  /**
   * Margin between the top match and the best match it is not linked to in
   * the traceability graph. A requirement and its own scenario, facts or
   * tests tie without competing, so `ambiguous` reads this margin, not
   * `topTwoMargin`.
   */
  topRivalMargin: number | null;
  abstained: boolean;
  ambiguous: boolean;
}>;

export type IntentSearchResult = Readonly<{
  matches: readonly IntentSearchMatch[];
  analysis: IntentSearchAnalysis;
}>;

type GraphEdge = Readonly<{
  relationship: string;
  from: string;
  to: string;
}>;

const GRAPH_RELATIONSHIPS = [
  "implements",
  "covered_by",
  "executable_for",
  "specified_by",
  "verified_by",
  "validates",
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
  "supersedes",
] as const;

const FACET_NAMES: readonly IntentSearchFacetName[] = [
  "actors",
  "actions",
  "objects",
  "constraints",
  "aliases",
];

// Function words and question scaffolding carry no domain signal. Without
// them, "how should kibi handle a detached HEAD?" scores on "detached" and
// "head" rather than on how many entities mention "should". The frame of the
// questions kb_search invites ("what governs X?", "what must stay true when
// X?") is scaffolding too: entries are stemmed forms, so "govern" also drops
// "governs", "governing" and "governed".
const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "before",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "each",
  "for",
  "from",
  "govern",
  "happen",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "me",
  "must",
  "my",
  "of",
  "on",
  "or",
  "other",
  "our",
  "should",
  "so",
  "stay",
  "tell",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "true",
  "us",
  "was",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

// Statuses whose entities no longer govern. They stay findable but rank
// below current entities and are labelled in the match reasons.
export const NON_GOVERNING_STATUSES = new Set([
  "superseded",
  "deprecated",
  "rejected",
  "retired",
  "obsolete",
  "archived",
]);
const NON_GOVERNING_FACTOR = 0.5;
// A closed requirement with no known successor may be done and still hold,
// or retired with nothing to replace it; it ranks below a current
// requirement that matches as well, but stays above weaker ones.
export const CLOSED_REQUIREMENT_FACTOR = 0.75;

/** True for a requirement whose status is `closed`. */
export function isClosedRequirement(entity: Record<string, unknown>): boolean {
  return (
    entity.type === "req" &&
    String(entity.status).trim().toLowerCase() === "closed"
  );
}
// A bootstrap provenance stub states no claim: it is demoted and, whatever
// its score, sorted after every match that is not a stub.
const PROVENANCE_STUB_FACTOR = 0.25;
const AMBIGUOUS_MARGIN = 0.05;

// rationale: an entry that is not an edge names no entity, so it adds no
// graph evidence, supersession or link and cannot change a ranking.
// Stryker disable next-line ArrayDeclaration
const NO_GRAPH_EDGES: readonly GraphEdge[] = [];

const MAX_CANDIDATES = 10_000;
const MAX_GRAPH_SEEDS = 5;
const MAX_GRAPH_EDGES = 2_000;

// A code identifier names its words without spaces ("canExport",
// "toggleViewMode"). An entity keeps it whole and also reads it word by
// word; a question reads it word by word only, so the identifier does not
// weigh twice. A question about a helper then meets the requirement that
// uses its words.
const CAMEL_IDENTIFIER = /[A-Za-z0-9]*[a-z0-9][A-Z][A-Za-z0-9]*/g;
function splitIdentifier(identifier: string): string {
  return identifier.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}
function expandIdentifiers(value: string): string {
  return value.replace(
    CAMEL_IDENTIFIER,
    (identifier) => `${identifier} ${splitIdentifier(identifier)}`,
  );
}

// A workspace file path written in the question: at least one directory
// and a file extension ("src/app/auth.service.ts"), not a URL.
const QUESTION_PATH =
  /(?<![\w:/.-])(?:\.{1,2}\/)?(?:[\w@~+-][\w@.~+-]*\/)+[\w@~+-][\w@.~+-]*\.[A-Za-z0-9]{1,8}(?![\w/])/g;

/** Workspace file paths the question names in its text, in order, once each. */
export function questionPaths(query: string): string[] {
  return [
    ...new Set(
      [...query.matchAll(QUESTION_PATH)].map((match) =>
        match[0].replace(/^\.\//, ""),
      ),
    ),
  ];
}

/**
 * The question's topic text: identifiers expanded, and file paths removed,
 * both the ones it passes as `sourceLocations` and the ones written in the
 * question. A path's words ("src", "services", "ts") are not the topic and
 * would only dilute the words that are; `sourceLocations` is how a path
 * reaches the search as source evidence.
 */
export function topicText(
  query: string,
  locations: readonly SourceLocation[] = [],
): string {
  let topic = query.replace(QUESTION_PATH, " ");
  for (const location of locations) {
    const located = location.path.replace(/^\.\//, "");
    if (located.length > 0) topic = topic.split(located).join(" ");
  }
  return topic.replace(CAMEL_IDENTIFIER, splitIdentifier);
}

const CODE_SPAN = /`([^`\n]+)`/g;
const CODE_SPAN_WEIGHT = 2;

/** Tokens of the question's backticked code spans (`canExport(user)`). */
function codeSpanTokens(topic: string): Set<string> {
  return new Set(
    [...topic.matchAll(CODE_SPAN)].flatMap((match) =>
      tokens(match[1] as string),
    ),
  );
}

export function normalize(value: string): string {
  // Runs of separators split into empty words, which the filter drops.
  return expandIdentifiers(value)
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) =>
      token.length > 4 &&
      token.endsWith("s") &&
      !token.endsWith("ss") &&
      !token.endsWith("ies")
        ? token.slice(0, -1)
        : token,
    )
    .map(stem)
    .join(" ");
}

// A deliberately small suffix stripper so a question's verb meets the
// entity's noun ("contradict" / "contradiction" / "contradictory",
// "detached" / "detach", "applied" / "applies" / "apply"). Short tokens are
// left alone.
const STEM_SUFFIXES = ["ation", "ion", "ing", "ory", "ed"] as const;
const Y_SUFFIX = /(?<=[^aeiou])i(?:es|ed)$/;
function stem(token: string): string {
  if (token.length < 6 || /\d/.test(token)) return token;
  if (Y_SUFFIX.test(token)) return token.replace(Y_SUFFIX, "y");
  let stemmed = token;
  for (const suffix of STEM_SUFFIXES) {
    if (stemmed.endsWith(suffix) && stemmed.length - suffix.length >= 4) {
      stemmed = stemmed.slice(0, -suffix.length);
      break;
    }
  }
  return stemmed.length > 4 && stemmed.endsWith("e")
    ? stemmed.slice(0, -1)
    : stemmed;
}

// Stop words as normalize leaves them ("before" becomes "befor"), so a
// stemmed stop word is dropped too.
const STOP_TOKENS = new Set(
  Array.from(STOP_WORDS).flatMap((word) => [word, normalize(word)]),
);

function tokens(value: string): readonly string[] {
  return Array.from(
    new Set(
      normalize(value)
        .split(" ")
        .filter((token) => token.length > 0 && !STOP_TOKENS.has(token)),
    ),
  );
}

/** The signal tokens intent ranking compares (stop words dropped, stemmed). */
export function intentTokens(value: string): readonly string[] {
  return tokens(value);
}

// Clause boundaries an agent writes when it packs several questions into one
// query: "user roles: how many can a user have, support role".
// A run of separators, or a full stop that ends the query, leaves an empty
// clause, which has too few tokens to count.
const CLAUSE_SEPARATOR = /[;:,!?\n]|\.(?=\s)|\s[-\u2013\u2014]\s/;
const MIN_CLAUSE_TOKENS = 2;

/**
 * The token sets of a compound query's clauses, or none for a single clause.
 * A clause needs two signal tokens: one word alone matches too broadly to
 * stand in for the question.
 */
export function queryClauses(query: string): readonly (readonly string[])[] {
  const clauses = query
    .split(CLAUSE_SEPARATOR)
    .map((clause) => tokens(clause))
    .filter((clause) => clause.length >= MIN_CLAUSE_TOKENS);
  return clauses.length > 1 ? clauses : [];
}

function stringValues(value: unknown): readonly string[] {
  // Blank strings add no tokens; facetValues drops them.
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function entityText(entity: Record<string, unknown>): string {
  const fields = [
    entity.title,
    entity.id,
    entity.type,
    entity.source,
    entity.sourceFile,
    entity.semantic_text,
    entity.text_ref,
    ...stringValues(entity.tags),
  ];
  return fields
    .filter((field): field is string => typeof field === "string")
    .join(" ");
}

/** The entity's source file without its fragment, or null without one. */
function entitySourcePath(entity: Record<string, unknown>): string | null {
  const sourceFile = entity.sourceFile;
  const source =
    typeof sourceFile === "string" && sourceFile.trim()
      ? sourceFile
      : entity.source;
  return typeof source === "string"
    ? (source.split("#", 1)[0] as string).trim()
    : null;
}

function sourcePathMatches(
  entityPath: string | null,
  requestedPath: string,
): boolean {
  if (!entityPath) return false;
  const normalizePath = (value: string) =>
    value.replaceAll("\\", "/").replace(/^\.\//, "");
  const left = normalizePath(entityPath);
  const right = normalizePath(requestedPath);
  return (
    left === right || left.endsWith(`/${right}`) || right.endsWith(`/${left}`)
  );
}

function numberField(
  entity: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = entity[key];
    // Number.isFinite is false for anything but a finite number.
    if (Number.isFinite(value)) return value as number;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  return null;
}

export function sourceMatches(
  entity: Record<string, unknown>,
  locations: readonly SourceLocation[],
): IntentSourceMatch[] {
  const entityPath = entitySourcePath(entity);
  const title = typeof entity.title === "string" ? normalize(entity.title) : "";
  const matches: IntentSourceMatch[] = [];

  for (const location of locations) {
    if (!sourcePathMatches(entityPath, location.path)) continue;
    // No requested symbol (or no title) is contained in any title.
    const requestedSymbol = normalize(location.symbol ?? "");
    const symbolMatches =
      title.includes(requestedSymbol) || requestedSymbol.includes(title);
    if (!symbolMatches) continue;

    const startLine = numberField(entity, "sourceLine", "source_line");
    // A requested line matches only an entity with a start line, so a
    // matched line is always a coordinate match.
    const lineMatches =
      location.line === undefined ||
      (startLine !== null &&
        location.line >= startLine &&
        location.line <=
          (numberField(entity, "sourceEndLine", "source_end_line") ??
            startLine));
    if (!lineMatches) continue;

    const exactSymbol = requestedSymbol.length > 0 && title === requestedSymbol;
    matches.push({
      path: location.path,
      ...(typeof entity.id === "string" ? { symbolId: entity.id } : {}),
      distance: exactSymbol ? 0 : location.line === undefined ? 2 : 1,
    });
  }
  return matches;
}

export function facetValues(facets: IntentSearchFacets | undefined): Array<{
  name: IntentSearchFacetName;
  value: string;
}> {
  const result: Array<{ name: IntentSearchFacetName; value: string }> = [];
  for (const name of FACET_NAMES) {
    for (const value of stringValues(facets?.[name])) {
      if (value.trim()) result.push({ name, value });
    }
  }
  return result;
}

/** An entity's tokens per field, computed once per entity and body. */
type EntityTokens = Readonly<{
  body: string | null;
  title: ReadonlySet<string>;
  metadata: ReadonlySet<string>;
  bodyTokens: ReadonlySet<string>;
  /** Every distinct token, for document frequency. */
  document: readonly string[];
}>;

// Both ranking passes of a search score the same candidate objects, and
// tokenizing them is most of the ranking cost on a large KB, so each entity is
// tokenized once. Keyed weakly by the entity object, so nothing outlives the
// search that loaded it.
const ENTITY_TOKENS = new WeakMap<Record<string, unknown>, EntityTokens>();

// The tokenizer a cached entry was built with: the code of every function
// that decides an entity's tokens, so a change to any of them starts a fresh
// cache instead of reusing tokens the new code would not produce.
/** The code and stop tokens that decide an entity's tokens. */
export function tokenizerSources(): string[] {
  return [
    ...[
      normalize,
      stem,
      tokens,
      expandIdentifiers,
      splitIdentifier,
      entityText,
      stringValues,
      metadataText,
      computeEntityTokens,
    ].map(String),
    ...STOP_TOKENS,
  ];
}

let tokenizerFingerprint: string | undefined;
export function tokenizer(): string {
  tokenizerFingerprint ??= tokenSourceHash(tokenizerSources());
  return tokenizerFingerprint;
}

const TOKEN_CACHES = new Map<string, SearchTokenCache>();
export function tokenCache(workspaceRoot: string): SearchTokenCache {
  let cache = TOKEN_CACHES.get(workspaceRoot);
  if (cache === undefined) {
    cache = openSearchTokenCache(workspaceRoot, tokenizer());
    TOKEN_CACHES.set(workspaceRoot, cache);
  }
  return cache;
}

function metadataText(entity: Record<string, unknown>): string {
  return [
    entity.id,
    entity.type,
    entity.source,
    entity.sourceFile,
    entity.semantic_text,
    entity.text_ref,
    ...stringValues(entity.tags),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function computeEntityTokens(
  entity: Record<string, unknown>,
  body: string | null,
): Omit<EntityTokens, "body"> {
  const title = normalize(String(entity.title ?? ""));
  const metadata = normalize(metadataText(entity));
  return {
    title: new Set(tokens(title)),
    metadata: new Set(tokens(metadata)),
    bodyTokens: new Set(tokens(normalize(body ?? ""))),
    document: tokens(`${entityText(entity)} ${body ?? ""}`),
  };
}

export function entityTokens(
  entity: Record<string, unknown>,
  body: string | null,
  cache?: SearchTokenCache,
): EntityTokens {
  const cached = ENTITY_TOKENS.get(entity);
  if (cached !== undefined && cached.body === body) return cached;
  let computed: EntityTokens;
  if (cache === undefined) {
    computed = { body, ...computeEntityTokens(entity, body) };
  } else {
    const key = `${String(entity.type ?? "")}::${String(entity.id ?? "")}`;
    const hash = tokenSourceHash([
      String(entity.title ?? ""),
      metadataText(entity),
      entityText(entity),
      body ?? "",
    ]);
    const stored = cache.get(key, hash);
    if (stored !== undefined) {
      computed = {
        body,
        title: new Set(stored.title),
        metadata: new Set(stored.metadata),
        bodyTokens: new Set(stored.bodyTokens),
        document: stored.document,
      };
    } else {
      computed = { body, ...computeEntityTokens(entity, body) };
      cache.set(key, hash, {
        title: [...computed.title],
        metadata: [...computed.metadata],
        bodyTokens: [...computed.bodyTokens],
        document: computed.document,
      });
    }
  }
  ENTITY_TOKENS.set(entity, computed);
  return computed;
}

export function scoreEntity(
  entity: Record<string, unknown>,
  queryTokens: readonly string[],
  facets: readonly { name: IntentSearchFacetName; value: string }[],
  sourceEvidence: readonly IntentSourceMatch[],
  graphEvidence: readonly IntentGraphPath[],
  documentFrequency: ReadonlyMap<string, number>,
  documentCount: number,
  body: string | null,
  superseded = false,
  provenanceStub = false,
  emphasis: ReadonlySet<string> = new Set(),
): { score: number; reasons: string[]; matchedFacets: string[] } {
  const {
    title: titleTokens,
    metadata: metadataTokens,
    bodyTokens,
  } = entityTokens(entity, body);
  const allSignalTokens = Array.from(new Set(queryTokens));
  // BM25-style inverse document frequency over title, metadata and body:
  // a token most entities contain (a project name, "requirement") adds
  // almost nothing, and the score is the share of the query's total
  // discriminating weight this entity matches.
  // Half of the lexical score is where the matched weight sits (title over
  // metadata over body); the other half is how much of the query's
  // discriminating weight the entity covers at all, so an entity matching
  // the rare terms in its body outranks one matching a common term in its
  // title.
  let placed = 0;
  let covered = 0;
  let total = 0;
  for (const token of allSignalTokens) {
    const frequency = documentFrequency.get(token) ?? 0;
    // A word the question writes as code (`canExport(user)`) names what it
    // is about, so it weighs twice as much as the words around it.
    const idf =
      Math.log(1 + (documentCount - frequency + 0.5) / (frequency + 0.5)) *
      (emphasis.has(token) ? CODE_SPAN_WEIGHT : 1);
    const fieldWeight = titleTokens.has(token)
      ? 1
      : metadataTokens.has(token)
        ? 0.65
        : bodyTokens.has(token)
          ? 0.5
          : 0;
    placed += idf * fieldWeight;
    if (fieldWeight > 0) covered += idf;
    total += idf;
  }
  const lexicalScore =
    total > 0 ? Math.min(1, (placed / total + covered / total) / 2) : 0;

  const matchedFacets: string[] = [];
  let facetScore = 0;
  for (const facet of facets) {
    // A facet without tokens matches nothing.
    const facetTokens = tokens(facet.value);
    const matches = facetTokens.filter(
      (token) =>
        titleTokens.has(token) ||
        metadataTokens.has(token) ||
        bodyTokens.has(token),
    ).length;
    if (matches > 0) {
      matchedFacets.push(`${facet.name}:${facet.value}`);
      facetScore += matches / facetTokens.length;
    }
  }
  facetScore = Math.min(1, facetScore / Math.max(1, facets.length));

  const sourceScore = sourceEvidence.length > 0 ? 1 : 0;
  const graphScore = Math.min(1, graphEvidence.length / 2);
  const status = String(entity.status).trim().toLowerCase();
  const nonGoverning = NON_GOVERNING_STATUSES.has(status) || superseded;
  const closed = !nonGoverning && isClosedRequirement(entity);
  const score =
    Math.min(
      1,
      lexicalScore * 0.58 +
        facetScore * 0.17 +
        sourceScore * 0.2 +
        graphScore * 0.05,
    ) *
    (nonGoverning ? NON_GOVERNING_FACTOR : 1) *
    (closed ? CLOSED_REQUIREMENT_FACTOR : 1) *
    (provenanceStub ? PROVENANCE_STUB_FACTOR : 1);
  const reasons: string[] = [];
  if (nonGoverning)
    reasons.push(superseded ? "demoted: superseded" : `demoted: ${status}`);
  if (closed) reasons.push("demoted: closed");
  if (provenanceStub) reasons.push("demoted: provenance stub");
  if (lexicalScore > 0) reasons.push("intent token match");
  if (matchedFacets.length > 0) reasons.push("semantic facet match");
  if (sourceEvidence.length > 0) reasons.push("source location match");
  if (graphEvidence.length > 0) reasons.push("traceability graph match");
  // Without a body there are no body tokens.
  if (queryTokens.some((token) => bodyTokens.has(token))) {
    reasons.push("markdown body match");
  }
  return { score, reasons, matchedFacets };
}

function buildDocumentFrequency(
  entities: readonly Record<string, unknown>[],
  bodies: ReadonlyMap<Record<string, unknown>, string | null>,
  cache: SearchTokenCache,
): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const entity of entities) {
    const seen = entityTokens(
      entity,
      bodies.get(entity) ?? null,
      cache,
    ).document;
    for (const token of seen)
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  return frequency;
}

/** Markdown bodies already read in this search, keyed by entity source. */
export type MarkdownBodyCache = Map<string, string | null>;

// Bodies are read one after another: a search reads thousands of small
// files, and synchronous reads of those finish many times sooner than
// batches of asynchronous ones.
export function readBodies(
  entities: readonly Record<string, unknown>[],
  workspaceRoot: string,
  cache: MarkdownBodyCache,
): Map<Record<string, unknown>, string | null> {
  return new Map(
    entities.map((entity) => {
      const source = entity.source;
      if (typeof source !== "string") return [entity, null];
      if (!cache.has(source))
        cache.set(source, loadMarkdownBodySync(source, workspaceRoot));
      return [entity, cache.get(source) ?? null];
    }),
  );
}

export async function rankIntentEntities(
  entities: readonly Record<string, unknown>[],
  options: IntentSearchOptions,
  workspaceRoot: string,
  graphEdges: readonly GraphEdge[] = NO_GRAPH_EDGES,
  bodyCache: MarkdownBodyCache = new Map(),
  // implements REQ-kibi-negative-path-facts-marked
  negativePathFacts: NegativePathFacts = new Map(),
): Promise<IntentSearchResult> {
  const query = topicText(options.query, options.sourceLocations);
  const queryTokens = tokens(query);
  const facets = facetValues(options.semanticFacets);
  const facetTokens = facets.flatMap((facet) => tokens(facet.value));
  const allTokens = Array.from(new Set([...queryTokens, ...facetTokens]));
  // Each clause of a compound question is also scored on its own, so the
  // words of one clause do not dilute a match on another.
  const clauseTokenSets = queryClauses(query).map((clause) =>
    Array.from(new Set([...clause, ...facetTokens])),
  );
  const emphasis = codeSpanTokens(query);
  const bodies = readBodies(entities, workspaceRoot, bodyCache);
  const cache = tokenCache(workspaceRoot);
  const documentFrequency = buildDocumentFrequency(entities, bodies, cache);
  cache.save();
  const supersededIds = new Set(
    graphEdges
      .filter((edge) => edge.relationship === "supersedes")
      .map((edge) => edge.to),
  );
  const ranked: IntentSearchMatch[] = [];
  const minScore = options.minScore ?? 0.18;
  const graphByEntity = new Map<string, IntentGraphPath[]>();
  for (const edge of graphEdges) {
    const pathValue: IntentGraphPath = {
      from: edge.from,
      relationships: [edge.relationship],
      to: edge.to,
    };
    const fromPaths = graphByEntity.get(edge.from) ?? [];
    fromPaths.push(pathValue);
    graphByEntity.set(edge.from, fromPaths);
    const toPaths = graphByEntity.get(edge.to) ?? [];
    toPaths.push(pathValue);
    graphByEntity.set(edge.to, toPaths);
  }

  const inheritedSource = inheritedSourceMatches(
    entities,
    options.sourceLocations ?? [],
    graphEdges,
  );

  for (const entity of entities) {
    const entityId = String(entity.id ?? "");
    const ownSource = sourceMatches(entity, options.sourceLocations ?? []);
    const sourceEvidence =
      ownSource.length > 0
        ? ownSource
        : (inheritedSource.get(entityId) ?? ownSource);
    // Keep evidence useful for agents and bounded for transport. The score is
    // already capped; unbounded parallel paths only add noise to receipts.
    const graphEvidence = (graphByEntity.get(entityId) ?? []).slice(0, 8);
    const body = bodies.get(entity) ?? null;
    const score = (signalTokens: readonly string[]) =>
      scoreEntity(
        entity,
        signalTokens,
        facets,
        sourceEvidence,
        graphEvidence,
        documentFrequency,
        entities.length,
        body,
        supersededIds.has(entityId),
        isProvenanceStub(entity),
        emphasis,
      );
    let scored = score(allTokens);
    for (const signalTokens of clauseTokenSets) {
      const candidate = score(signalTokens);
      if (candidate.score > scored.score) scored = candidate;
    }
    if (scored.score < minScore) continue;
    const snippet =
      body === null
        ? undefined
        : bodySnippetLine(String(entity.type), body, entity);
    // Inherited source evidence says so, instead of claiming the entity
    // itself sits at the location.
    const reasons = scored.reasons.map((reason) =>
      reason === "source location match" && ownSource.length === 0
        ? "implemented at the source location"
        : reason,
    );
    const guards = negativePathFacts.get(String(entity.id ?? ""));
    ranked.push({
      entity,
      score: scored.score,
      reasons: Array.from(new Set(reasons)),
      ...(snippet !== undefined ? { snippet } : {}),
      ...(guards !== undefined
        ? { negativePath: negativePathMarker(guards) }
        : {}),
      evidence: {
        normalizedScore: scored.score,
        matchedFacets: scored.matchedFacets,
        sourceMatches: sourceEvidence,
        graphPaths: graphEvidence,
        // Accepted, but within 0.05 of the threshold: a weak match the
        // caller should confirm before relying on it.
        abstentionEligible: scored.score < minScore + AMBIGUOUS_MARGIN,
      },
    });
  }
  const rankScore = negativePathRankScores(ranked);
  ranked.sort((left, right) => {
    const stubOrder =
      Number(isProvenanceStub(left.entity)) -
      Number(isProvenanceStub(right.entity));
    if (stubOrder !== 0) return stubOrder;
    const leftScore = rankScore.get(left) ?? left.score;
    const rightScore = rankScore.get(right) ?? right.score;
    if (rightScore !== leftScore) return rightScore - leftScore;
    // At the same rank a negative-path fact follows what it guards.
    const negativeOrder =
      Number(left.negativePath !== undefined) -
      Number(right.negativePath !== undefined);
    if (negativeOrder !== 0) return negativeOrder;
    if (right.score !== left.score) return right.score - left.score;
    const typeOrder = String(left.entity.type ?? "").localeCompare(
      String(right.entity.type ?? ""),
    );
    if (typeOrder !== 0) return typeOrder;
    return String(left.entity.id ?? "").localeCompare(
      String(right.entity.id ?? ""),
    );
  });
  const [first, second] = ranked;
  let topScore: number | null = null;
  let topTwoMargin: number | null = null;
  let topRivalMargin: number | null = null;
  if (first !== undefined) {
    topScore = first.score;
    if (second !== undefined) topTwoMargin = first.score - second.score;
    const rival = rivalOf(first, ranked, graphEdges);
    if (rival !== undefined) topRivalMargin = first.score - rival.score;
  }
  return {
    matches: ranked,
    analysis: {
      rankingMode: "intent-v1",
      candidateCount: entities.length,
      acceptedCount: ranked.length,
      topScore,
      topTwoMargin,
      topRivalMargin,
      abstained: ranked.length === 0,
      // Two leading rival matches this close are not a confident single
      // answer.
      ambiguous: topRivalMargin !== null && topRivalMargin < AMBIGUOUS_MARGIN,
    },
  };
}

/**
 * The score a negative-path fact is ranked by: never above the best match
 * among the requirements it guards, so it follows that requirement instead
 * of leading the results. A fact whose guards did not match keeps its own
 * score and is still marked. Other matches rank by their own score.
 */
// implements REQ-kibi-negative-path-facts-marked
function negativePathRankScores(
  ranked: readonly IntentSearchMatch[],
): Map<IntentSearchMatch, number> {
  const scoreById = new Map<string, number>();
  for (const match of ranked) {
    const id = String(match.entity.id ?? "");
    scoreById.set(id, Math.max(scoreById.get(id) ?? 0, match.score));
  }
  const scores = new Map<IntentSearchMatch, number>();
  for (const match of ranked) {
    const guards = match.negativePath?.guards ?? [];
    const guardScores = guards.flatMap((id) => {
      const score = scoreById.get(id);
      return score === undefined ? [] : [score];
    });
    if (guardScores.length > 0)
      scores.set(match, Math.min(match.score, Math.max(...guardScores)));
  }
  return scores;
}

/**
 * A requirement and its own scenario, facts or tests score alike on the
 * same words without being rival answers: the rival is the best match the
 * top match is not linked to.
 */
function rivalOf(
  top: IntentSearchMatch,
  ranked: readonly IntentSearchMatch[],
  graphEdges: readonly GraphEdge[],
): IntentSearchMatch | undefined {
  const topId = String(top.entity.id ?? "");
  const linkedToTop = new Set<string>();
  for (const edge of graphEdges) {
    if (edge.from === topId) linkedToTop.add(edge.to);
    if (edge.to === topId) linkedToTop.add(edge.from);
  }
  // A negative-path fact is the failure side of the requirements it guards,
  // not a rival answer to them.
  return ranked
    .slice(1)
    .find(
      (match) =>
        !linkedToTop.has(String(match.entity.id ?? "")) &&
        !match.negativePath?.guards.includes(topId),
    );
}

/**
 * Source evidence a requirement inherits from the symbols that implement it:
 * a changed file's symbols are source matches, and the requirements they
 * `implements` are what that file is for, even when the question shares no
 * word with them. Each inherited match names the implementing symbol.
 */
export function inheritedSourceMatches(
  entities: readonly Record<string, unknown>[],
  locations: readonly SourceLocation[],
  graphEdges: readonly GraphEdge[],
): Map<string, IntentSourceMatch[]> {
  const inherited = new Map<string, IntentSourceMatch[]>();
  // A symbol without matches passes on an empty list, which is no evidence.
  const matchedSymbols = new Map<string, IntentSourceMatch[]>();
  for (const entity of entities) {
    if (entity.type !== "symbol") continue;
    matchedSymbols.set(
      String(entity.id ?? ""),
      sourceMatches(entity, locations),
    );
  }
  for (const edge of graphEdges) {
    if (edge.relationship !== "implements") continue;
    const matches = matchedSymbols.get(edge.from);
    if (matches === undefined) continue;
    const rows = inherited.get(edge.to) ?? [];
    for (const match of matches)
      rows.push({ path: match.path, symbolId: edge.from, distance: 3 });
    inherited.set(edge.to, rows);
  }
  return inherited;
}

/** The edge query for `seedIds`; both depths read the same direct edges. */
export function graphGoal(seedIds: readonly string[], _depth: 1 | 2): string {
  const ids = seedIds.map((id) => `'${escapeAtom(id)}'`).join(",");
  const relationships = GRAPH_RELATIONSHIPS.join(",");
  return `kb_relationship_edges([${relationships}], [${ids}], Edges)`;
}

export async function queryGraphEdges(
  prolog: Pick<PrologPort, "query">,
  seedIds: readonly string[],
): Promise<GraphEdge[]> {
  if (seedIds.length === 0) return [];
  const result = await prolog.query(graphGoal(seedIds, 1));
  if (!result.success) return [];
  // A missing binding reads as "undefined", which is no list.
  return parseTriples(String(result.bindings.Edges))
    .slice(0, MAX_GRAPH_EDGES)
    .map(([relationship, from, to]) => ({
      relationship,
      from: normalizeEntityId(from),
      to: normalizeEntityId(to),
    }));
}

export async function loadIntentCandidates(
  prolog: PrologPort,
  options: IntentSearchOptions,
): Promise<Record<string, unknown>[]> {
  const terms = [
    topicText(options.query, options.sourceLocations),
    ...facetValues(options.semanticFacets).map((facet) => facet.value),
  ].filter((term, index, all) => term.trim() && all.indexOf(term) === index);
  const candidates = new Map<string, Record<string, unknown>>();

  const addCandidates = (entities: readonly Record<string, unknown>[]) => {
    for (const entity of entities) {
      const key = `${String(entity.type ?? "")}::${String(entity.id ?? "")}`;
      if (!candidates.has(key) && candidates.size >= MAX_CANDIDATES) break;
      candidates.set(key, { ...entity });
    }
  };

  // Source-located candidates are projected rows too, read through the
  // same source filter kb_query_entities applies, so a file with many
  // receipt-bearing tests does not ship their complete payloads.
  const sourceLocations = options.sourceLocations ?? [];
  for (const location of sourceLocations) {
    if (candidates.size >= MAX_CANDIDATES) break;
    addCandidates(
      await listSearchCandidates(prolog, {
        ...(options.type !== undefined ? { type: options.type } : {}),
        sourceFile: location.path,
        maxCandidates: MAX_CANDIDATES - candidates.size,
      }),
    );
  }

  // Lexical candidates are projected rows (no receipt histories or other
  // large structured properties); ports without the engine method run the
  // same bounded Prolog search through `query`.
  for (const term of terms) {
    if (candidates.size >= MAX_CANDIDATES) break;
    const page = await loadSearchCandidates(prolog, {
      query: term,
      ...(options.type !== undefined ? { type: options.type } : {}),
      maxCandidates: MAX_CANDIDATES - candidates.size,
    });
    addCandidates(page);
  }

  if (!prolog.searchEntities && sourceLocations.length === 0) {
    addCandidates(
      await listSearchCandidates(prolog, {
        ...(options.type !== undefined ? { type: options.type } : {}),
        maxCandidates: MAX_CANDIDATES,
      }),
    );
  }

  // An unfamiliar host-agent alias may not exist in the lexical index at all.
  // For small facet-bearing corpora, scan the bounded entity set so a zero
  // lexical hit does not turn a valid semantic query into a false abstention.
  // Source-located searches stay on their source-indexed candidate set.
  if (
    prolog.searchEntities &&
    sourceLocations.length === 0 &&
    facetValues(options.semanticFacets).length > 0 &&
    candidates.size < 20
  ) {
    addCandidates(
      await listSearchCandidates(prolog, {
        ...(options.type !== undefined ? { type: options.type } : {}),
        maxCandidates: MAX_CANDIDATES,
      }),
    );
  }
  // addCandidates never grows the map past MAX_CANDIDATES.
  return Array.from(candidates.values());
}

export async function executeIntentSearch(
  options: IntentSearchOptions,
  prolog: PrologPort,
  workspaceRoot: string,
  /** Receives the candidate rows and bodies the ranking read, for reuse. */
  onCorpus?: (
    entities: readonly Record<string, unknown>[],
    bodies: MarkdownBodyCache,
  ) => void,
): Promise<IntentSearchResult> {
  const candidates = await loadIntentCandidates(prolog, options);
  // Both ranking passes read the same Markdown bodies; read each file once.
  const bodies: MarkdownBodyCache = new Map();
  onCorpus?.(candidates, bodies);
  const firstPass = await rankIntentEntities(
    candidates,
    options,
    workspaceRoot,
    NO_GRAPH_EDGES,
    bodies,
  );
  const sourceSeeds = firstPass.matches
    .filter((match) => match.evidence.sourceMatches.length > 0)
    .map((match) => String(match.entity.id ?? ""));
  const seeds = Array.from(
    new Set([
      ...(sourceSeeds.length > 0
        ? sourceSeeds
        : firstPass.matches.map((match) => String(match.entity.id ?? ""))),
    ]),
  ).slice(0, MAX_GRAPH_SEEDS);
  const graphEdges = await queryGraphEdges(prolog, seeds);
  const knownIds = new Set(
    candidates.map(
      (entity) => `${String(entity.type ?? "")}::${String(entity.id ?? "")}`,
    ),
  );
  const relatedIds = Array.from(
    new Set(graphEdges.flatMap((edge) => [edge.from, edge.to])),
  ).filter((id) => !seeds.includes(id));
  // One batched query of projected rows for the graph neighbours, rather
  // than one engine round trip per neighbour.
  const related = await loadEntityRows(
    prolog,
    relatedIds.slice(0, MAX_GRAPH_SEEDS * 4),
  );
  for (const entity of related) {
    const key = `${String(entity.type ?? "")}::${String(entity.id ?? "")}`;
    if (!knownIds.has(key)) {
      knownIds.add(key);
      candidates.push(entity);
    }
  }
  // Only facts the ranking can accept are asked about: the first pass's
  // matches and the graph neighbours added for the second.
  const negativePathFacts = await queryNegativePathFacts(
    prolog,
    [...firstPass.matches.map((match) => match.entity), ...related]
      .filter((entity) => entity.type === "fact")
      .map((entity) => String(entity.id ?? "")),
  );
  return rankIntentEntities(
    candidates,
    options,
    workspaceRoot,
    graphEdges,
    bodies,
    negativePathFacts,
  );
}

export function validateIntentSearchInput(input: IntentSearchOptions): void {
  if (!input.query.trim())
    throw new Error(
      "Search execution failed: query must be a non-empty string",
    );
  if (
    input.minScore !== undefined &&
    (!Number.isFinite(input.minScore) ||
      input.minScore < 0 ||
      input.minScore > 1)
  ) {
    throw new Error(
      "Search execution failed: minScore must be between 0 and 1",
    );
  }
  for (const location of input.sourceLocations ?? []) {
    if (
      !location.path.trim() ||
      path.isAbsolute(location.path) ||
      location.path.split("/").includes("..")
    ) {
      throw new Error(
        "Search execution failed: sourceLocations.path must be workspace-relative",
      );
    }
    if (
      location.line !== undefined &&
      (!Number.isInteger(location.line) || location.line < 1)
    ) {
      throw new Error(
        "Search execution failed: sourceLocations.line must be a positive integer",
      );
    }
    if (
      location.column !== undefined &&
      (!Number.isInteger(location.column) || location.column < 1)
    ) {
      throw new Error(
        "Search execution failed: sourceLocations.column must be a positive integer",
      );
    }
  }
}
