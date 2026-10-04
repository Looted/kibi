import path from "node:path";

import { escapeAtom, normalizeEntityId, parseTriples } from "./prolog/codec.js";
import {
  SEARCH_CANDIDATE_PAGE_SIZE,
  type VALID_ENTITY_TYPES,
  listSearchCandidates,
  loadEntities,
  loadEntityRows,
  loadSearchCandidates,
} from "./public/operations/discovery-entities.js";
import type { PrologPort } from "./public/operations/runtime-types.js";
import type { SearchMatch } from "./search-ranking.js";
import { loadMarkdownBody } from "./search-ranking.js";

// implements REQ-kibi-intent-aware-source-discovery
export type IntentSearchFacetName =
  | "actors"
  | "actions"
  | "objects"
  | "constraints"
  | "aliases";

// implements REQ-kibi-intent-aware-source-discovery
export type IntentSearchFacets = Readonly<
  Partial<Record<IntentSearchFacetName, readonly string[]>>
>;

// implements REQ-kibi-intent-aware-source-discovery
export type SourceLocation = Readonly<{
  path: string;
  line?: number;
  column?: number;
  symbol?: string;
}>;

// implements REQ-kibi-intent-aware-source-discovery
export type IntentSearchOptions = Readonly<{
  query: string;
  type?: (typeof VALID_ENTITY_TYPES)[number] | string;
  semanticFacets?: IntentSearchFacets;
  sourceLocations?: readonly SourceLocation[];
  minScore?: number;
}>;

// implements REQ-kibi-intent-aware-source-discovery
export type IntentSourceMatch = Readonly<{
  path: string;
  symbolId?: string;
  distance?: number;
}>;

// implements REQ-kibi-intent-aware-source-discovery
export type IntentGraphPath = Readonly<{
  from: string;
  relationships: readonly string[];
  to: string;
}>;

// implements REQ-kibi-intent-aware-source-discovery
export type IntentSearchEvidence = Readonly<{
  normalizedScore: number;
  matchedFacets: readonly string[];
  sourceMatches: readonly IntentSourceMatch[];
  graphPaths: readonly IntentGraphPath[];
  abstentionEligible: boolean;
}>;

// implements REQ-kibi-intent-aware-source-discovery
export type IntentSearchMatch = SearchMatch & {
  readonly evidence: IntentSearchEvidence;
};

// implements REQ-kibi-intent-aware-source-discovery
export type IntentSearchAnalysis = Readonly<{
  rankingMode: "intent-v1";
  candidateCount: number;
  acceptedCount: number;
  topScore: number | null;
  topTwoMargin: number | null;
  abstained: boolean;
  ambiguous: boolean;
}>;

// implements REQ-kibi-intent-aware-source-discovery
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
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "govern",
  "happen",
  "happens",
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
const NON_GOVERNING_STATUSES = new Set([
  "superseded",
  "deprecated",
  "rejected",
  "retired",
  "obsolete",
  "archived",
]);
const NON_GOVERNING_FACTOR = 0.5;
const AMBIGUOUS_MARGIN = 0.05;

const MAX_CANDIDATES = 10_000;
const MAX_GRAPH_SEEDS = 5;
const MAX_GRAPH_EDGES = 2_000;

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) =>
      token.length > 4 && token.endsWith("s") && !token.endsWith("ss")
        ? token.slice(0, -1)
        : token,
    )
    .map(stem)
    .join(" ");
}

// A deliberately small suffix stripper so a question's verb meets the
// entity's noun ("contradict" / "contradiction" / "contradictory",
// "detached" / "detach"). Short tokens are left alone.
const STEM_SUFFIXES = ["ation", "ion", "ing", "ory", "ed"] as const;
function stem(token: string): string {
  if (token.length < 6 || /\d/.test(token)) return token;
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

function tokens(value: string): readonly string[] {
  return Array.from(
    new Set(
      normalize(value)
        .split(" ")
        .filter((token) => token.length > 0 && !STOP_WORDS.has(token)),
    ),
  );
}

function stringValues(value: unknown): readonly string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
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

function entitySourcePath(entity: Record<string, unknown>): string | null {
  const sourceFile = entity.sourceFile;
  if (typeof sourceFile === "string" && sourceFile.trim()) {
    return sourceFile.split("#", 1)[0]?.trim() ?? null;
  }
  const source = entity.source;
  if (typeof source !== "string" || !source.trim()) return null;
  return source.split("#", 1)[0]?.trim() ?? null;
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
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  return null;
}

function sourceMatches(
  entity: Record<string, unknown>,
  locations: readonly SourceLocation[],
): IntentSourceMatch[] {
  if (locations.length === 0) return [];
  const entityPath = entitySourcePath(entity);
  const title = typeof entity.title === "string" ? normalize(entity.title) : "";
  const matches: IntentSourceMatch[] = [];

  for (const location of locations) {
    if (!sourcePathMatches(entityPath, location.path)) continue;
    const requestedSymbol = location.symbol ? normalize(location.symbol) : "";
    const symbolMatches =
      requestedSymbol.length === 0 ||
      title === requestedSymbol ||
      title.includes(requestedSymbol) ||
      requestedSymbol.includes(title);
    if (!symbolMatches) continue;

    const startLine = numberField(entity, "sourceLine", "source_line");
    const endLine =
      numberField(entity, "sourceEndLine", "source_end_line") ?? startLine;
    const lineMatches =
      location.line === undefined ||
      (startLine !== null &&
        endLine !== null &&
        location.line >= startLine &&
        location.line <= endLine);
    if (!lineMatches) continue;

    const exactSymbol = requestedSymbol.length > 0 && title === requestedSymbol;
    const coordinate = location.line !== undefined && startLine !== null;
    matches.push({
      path: location.path,
      ...(typeof entity.id === "string" ? { symbolId: entity.id } : {}),
      ...(exactSymbol
        ? { distance: 0 }
        : coordinate
          ? { distance: 1 }
          : { distance: 2 }),
    });
  }
  return matches;
}

function facetValues(facets: IntentSearchFacets | undefined): Array<{
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

// implements REQ-kibi-intent-aware-source-discovery
function entityTokens(
  entity: Record<string, unknown>,
  body: string | null,
): EntityTokens {
  const cached = ENTITY_TOKENS.get(entity);
  if (cached !== undefined && cached.body === body) return cached;
  const title = normalize(String(entity.title ?? ""));
  const metadata = normalize(
    [
      entity.id,
      entity.type,
      entity.source,
      entity.sourceFile,
      entity.semantic_text,
      entity.text_ref,
      ...stringValues(entity.tags),
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" "),
  );
  const computed: EntityTokens = {
    body,
    title: new Set(tokens(title)),
    metadata: new Set(tokens(metadata)),
    bodyTokens: new Set(tokens(normalize(body ?? ""))),
    document: tokens(`${entityText(entity)} ${body ?? ""}`),
  };
  ENTITY_TOKENS.set(entity, computed);
  return computed;
}

function scoreEntity(
  entity: Record<string, unknown>,
  queryTokens: readonly string[],
  facets: readonly { name: IntentSearchFacetName; value: string }[],
  sourceEvidence: readonly IntentSourceMatch[],
  graphEvidence: readonly IntentGraphPath[],
  documentFrequency: ReadonlyMap<string, number>,
  documentCount: number,
  body: string | null,
  superseded = false,
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
    const idf = Math.log(
      1 + (documentCount - frequency + 0.5) / (frequency + 0.5),
    );
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
    const facetTokens = tokens(facet.value);
    if (facetTokens.length === 0) continue;
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
  const graphScore =
    graphEvidence.length > 0 ? Math.min(1, graphEvidence.length / 2) : 0;
  const status = String(entity.status ?? "")
    .trim()
    .toLowerCase();
  const nonGoverning = NON_GOVERNING_STATUSES.has(status) || superseded;
  const score =
    Math.min(
      1,
      lexicalScore * 0.58 +
        facetScore * 0.17 +
        sourceScore * 0.2 +
        graphScore * 0.05,
    ) * (nonGoverning ? NON_GOVERNING_FACTOR : 1);
  const reasons: string[] = [];
  if (nonGoverning)
    reasons.push(superseded ? "demoted: superseded" : `demoted: ${status}`);
  if (lexicalScore > 0) reasons.push("intent token match");
  if (matchedFacets.length > 0) reasons.push("semantic facet match");
  if (sourceEvidence.length > 0) reasons.push("source location match");
  if (graphEvidence.length > 0) reasons.push("traceability graph match");
  if (
    body &&
    bodyTokens.size > 0 &&
    queryTokens.some((token) => bodyTokens.has(token))
  ) {
    reasons.push("markdown body match");
  }
  return { score, reasons, matchedFacets };
}

function buildDocumentFrequency(
  entities: readonly Record<string, unknown>[],
  bodies: ReadonlyMap<Record<string, unknown>, string | null>,
): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const entity of entities) {
    const seen = entityTokens(entity, bodies.get(entity) ?? null).document;
    for (const token of seen)
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  return frequency;
}

/** Markdown bodies already read in this search, keyed by entity source. */
export type MarkdownBodyCache = Map<string, string | null>;

/** Files read at once, well under common open-file limits. */
const BODY_READ_CONCURRENCY = 32;

// implements REQ-kibi-intent-aware-source-discovery
async function readBodies(
  entities: readonly Record<string, unknown>[],
  workspaceRoot: string,
  cache: MarkdownBodyCache,
): Promise<Map<Record<string, unknown>, string | null>> {
  const missing = [
    ...new Set(entities.map((entity) => String(entity.source ?? ""))),
  ].filter((source) => !cache.has(source));
  for (let start = 0; start < missing.length; start += BODY_READ_CONCURRENCY) {
    const batch = missing.slice(start, start + BODY_READ_CONCURRENCY);
    const loaded = await Promise.all(
      batch.map((source) => loadMarkdownBody(source, workspaceRoot)),
    );
    batch.forEach((source, index) => cache.set(source, loaded[index] ?? null));
  }
  return new Map(
    entities.map((entity) => [
      entity,
      cache.get(String(entity.source ?? "")) ?? null,
    ]),
  );
}

// implements REQ-kibi-intent-aware-source-discovery
export async function rankIntentEntities(
  entities: readonly Record<string, unknown>[],
  options: IntentSearchOptions,
  workspaceRoot: string,
  graphEdges: readonly GraphEdge[] = [],
  bodyCache: MarkdownBodyCache = new Map(),
): Promise<IntentSearchResult> {
  const queryTokens = tokens(options.query);
  const facets = facetValues(options.semanticFacets);
  const allTokens = Array.from(
    new Set([
      ...queryTokens,
      ...facets.flatMap((facet) => tokens(facet.value)),
    ]),
  );
  const bodies = await readBodies(entities, workspaceRoot, bodyCache);
  const documentFrequency = buildDocumentFrequency(entities, bodies);
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

  for (const entity of entities) {
    const sourceEvidence = sourceMatches(entity, options.sourceLocations ?? []);
    const entityId = String(entity.id ?? "");
    // Keep evidence useful for agents and bounded for transport. The score is
    // already capped; unbounded parallel paths only add noise to receipts.
    const graphEvidence = (graphByEntity.get(entityId) ?? []).slice(0, 8);
    const body = bodies.get(entity) ?? null;
    const scored = scoreEntity(
      entity,
      allTokens,
      facets,
      sourceEvidence,
      graphEvidence,
      documentFrequency,
      entities.length,
      body,
      supersededIds.has(entityId),
    );
    if (scored.score < minScore) continue;
    const snippet = body
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    ranked.push({
      entity,
      score: scored.score,
      reasons: Array.from(new Set(scored.reasons)),
      ...(snippet !== undefined ? { snippet } : {}),
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
  ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    const typeOrder = String(left.entity.type ?? "").localeCompare(
      String(right.entity.type ?? ""),
    );
    if (typeOrder !== 0) return typeOrder;
    return String(left.entity.id ?? "").localeCompare(
      String(right.entity.id ?? ""),
    );
  });
  const topScore = ranked[0]?.score ?? null;
  const first = ranked[0];
  const second = ranked[1];
  const topTwoMargin =
    first !== undefined && second !== undefined
      ? first.score - second.score
      : null;
  return {
    matches: ranked,
    analysis: {
      rankingMode: "intent-v1",
      candidateCount: entities.length,
      acceptedCount: ranked.length,
      topScore,
      topTwoMargin,
      abstained: ranked.length === 0,
      // Two leading matches this close are not a confident single answer.
      ambiguous: topTwoMargin !== null && topTwoMargin < AMBIGUOUS_MARGIN,
    },
  };
}

export function graphGoal(seedIds: readonly string[], depth: 1 | 2): string {
  const ids = seedIds.map((id) => `'${escapeAtom(id)}'`).join(",");
  const relationships = GRAPH_RELATIONSHIPS.join(",");
  if (depth === 1) {
    return `findall([Rel,From,To], (member(Rel, [${relationships}]), kb_relationship(Rel, From, To), (member(From, [${ids}]); member(To, [${ids}]))), Edges)`;
  }
  return `findall([Rel,From,To], (member(Rel, [${relationships}]), kb_relationship(Rel, From, To), (member(From, [${ids}]); member(To, [${ids}]))), Edges)`;
}

async function queryGraphEdges(
  prolog: Pick<PrologPort, "query">,
  seedIds: readonly string[],
): Promise<GraphEdge[]> {
  if (seedIds.length === 0) return [];
  const result = await prolog.query(graphGoal(seedIds, 1));
  if (!result.success) return [];
  return parseTriples(result.bindings.Edges ?? "[]")
    .slice(0, MAX_GRAPH_EDGES)
    .map(([relationship, from, to]) => ({
      relationship,
      from: normalizeEntityId(from),
      to: normalizeEntityId(to),
    }));
}

async function loadIntentCandidates(
  prolog: PrologPort,
  options: IntentSearchOptions,
): Promise<Record<string, unknown>[]> {
  const terms = [
    options.query,
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

  const sourceLocations = options.sourceLocations ?? [];
  if (sourceLocations.length > 0 && prolog.queryEntities) {
    for (const location of sourceLocations) {
      if (candidates.size >= MAX_CANDIDATES) break;
      let offset = 0;
      let total = Number.POSITIVE_INFINITY;
      while (offset < total && candidates.size < MAX_CANDIDATES) {
        const limit = Math.min(
          SEARCH_CANDIDATE_PAGE_SIZE,
          MAX_CANDIDATES - candidates.size,
        );
        const page = await prolog.queryEntities({
          ...(options.type !== undefined ? { type: options.type } : {}),
          sourceFile: location.path,
          limit,
          offset,
        });
        if (page.entities.length === 0) break;
        addCandidates(page.entities);
        total = page.count;
        offset += page.entities.length;
      }
    }
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
  } else if (sourceLocations.length > 0 && !prolog.queryEntities) {
    for (const location of sourceLocations) {
      if (candidates.size >= MAX_CANDIDATES) break;
      addCandidates(
        await loadEntities(prolog, {
          ...(options.type !== undefined ? { type: options.type } : {}),
          sourceFile: location.path,
        }),
      );
    }
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
  return Array.from(candidates.values()).slice(0, MAX_CANDIDATES);
}

// implements REQ-kibi-intent-aware-source-discovery
export async function executeIntentSearch(
  options: IntentSearchOptions,
  prolog: PrologPort,
  workspaceRoot: string,
): Promise<IntentSearchResult> {
  const candidates = await loadIntentCandidates(prolog, options);
  // Both ranking passes read the same Markdown bodies; read each file once.
  const bodies: MarkdownBodyCache = new Map();
  const firstPass = await rankIntentEntities(
    candidates,
    options,
    workspaceRoot,
    [],
    bodies,
  );
  const sourceSeeds = firstPass.matches
    .filter((match) => match.evidence.sourceMatches.length > 0)
    .map((match) => String(match.entity.id ?? ""));
  const seeds = Array.from(
    new Set([
      ...(sourceSeeds.length > 0
        ? sourceSeeds
        : firstPass.matches
            .map((match) => String(match.entity.id ?? ""))
            .slice(0, MAX_GRAPH_SEEDS)),
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
  return rankIntentEntities(
    candidates,
    options,
    workspaceRoot,
    graphEdges,
    bodies,
  );
}

// implements REQ-kibi-intent-aware-source-discovery
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
