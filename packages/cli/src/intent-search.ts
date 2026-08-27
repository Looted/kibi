import path from "node:path";

import { escapeAtom, parseTriples } from "./prolog/codec.js";
import {
  type VALID_ENTITY_TYPES,
  loadEntities,
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
] as const;

const FACET_NAMES: readonly IntentSearchFacetName[] = [
  "actors",
  "actions",
  "objects",
  "constraints",
  "aliases",
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "be",
  "by",
  "for",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

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
    .join(" ");
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

function scoreEntity(
  entity: Record<string, unknown>,
  queryTokens: readonly string[],
  facets: readonly { name: IntentSearchFacetName; value: string }[],
  sourceEvidence: readonly IntentSourceMatch[],
  graphEvidence: readonly IntentGraphPath[],
  documentFrequency: ReadonlyMap<string, number>,
  documentCount: number,
  body: string | null,
): { score: number; reasons: string[]; matchedFacets: string[] } {
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
  const bodyText = normalize(body ?? "");
  const titleTokens = new Set(tokens(title));
  const metadataTokens = new Set(tokens(metadata));
  const bodyTokens = new Set(tokens(bodyText));
  const allSignalTokens = Array.from(new Set(queryTokens));
  const lexical = allSignalTokens.reduce((sum, token) => {
    const frequency = documentFrequency.get(token) ?? 0;
    const idf = Math.log(1 + (documentCount + 1) / (frequency + 1));
    const fieldWeight = titleTokens.has(token)
      ? 3
      : metadataTokens.has(token)
        ? 1.5
        : bodyTokens.has(token)
          ? 0.75
          : 0;
    return sum + idf * fieldWeight;
  }, 0);
  const lexicalMax = Math.max(1, allSignalTokens.length * 4);
  const lexicalScore = Math.min(1, lexical / lexicalMax);

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
  const score = Math.min(
    1,
    lexicalScore * 0.58 +
      facetScore * 0.17 +
      sourceScore * 0.2 +
      graphScore * 0.05,
  );
  const reasons: string[] = [];
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
): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const entity of entities) {
    const seen = new Set(tokens(entityText(entity)));
    for (const token of seen)
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  return frequency;
}

// implements REQ-kibi-intent-aware-source-discovery
export async function rankIntentEntities(
  entities: readonly Record<string, unknown>[],
  options: IntentSearchOptions,
  workspaceRoot: string,
  graphEdges: readonly GraphEdge[] = [],
): Promise<IntentSearchResult> {
  const queryTokens = tokens(options.query);
  const facets = facetValues(options.semanticFacets);
  const allTokens = Array.from(
    new Set([
      ...queryTokens,
      ...facets.flatMap((facet) => tokens(facet.value)),
    ]),
  );
  const documentFrequency = buildDocumentFrequency(entities);
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
    const body = await loadMarkdownBody(
      String(entity.source ?? ""),
      workspaceRoot,
    );
    const scored = scoreEntity(
      entity,
      allTokens,
      facets,
      sourceEvidence,
      graphEvidence,
      documentFrequency,
      entities.length,
      body,
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
        abstentionEligible: scored.score < minScore,
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
    },
  };
}

function graphGoal(seedIds: readonly string[], depth: 1 | 2): string {
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
    .map(([relationship, from, to]) => ({ relationship, from, to }));
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
  if (
    prolog.searchEntities &&
    (options.sourceLocations === undefined ||
      options.sourceLocations.length === 0)
  ) {
    for (const term of terms) {
      const page = await prolog.searchEntities({
        query: term,
        ...(options.type !== undefined ? { type: options.type } : {}),
        limit: MAX_CANDIDATES,
        offset: 0,
      });
      for (const entity of page.entities) {
        candidates.set(
          `${String(entity.type ?? "")}::${String(entity.id ?? "")}`,
          { ...entity },
        );
      }
    }
    // An unfamiliar host-agent alias may not exist in the lexical index at
    // all. For small facet-bearing corpora, scan the bounded entity set so a
    // zero lexical hit does not turn a valid semantic query into a false
    // abstention. Large repositories remain index-bounded.
    if (
      facetValues(options.semanticFacets).length > 0 &&
      candidates.size < 20
    ) {
      const all = await loadEntities(
        prolog,
        options.type ? { type: options.type } : {},
      );
      for (const entity of all.slice(0, MAX_CANDIDATES)) {
        candidates.set(
          `${String(entity.type ?? "")}::${String(entity.id ?? "")}`,
          entity,
        );
      }
    }
  } else {
    const all = await loadEntities(
      prolog,
      options.type ? { type: options.type } : {},
    );
    for (const entity of all) {
      candidates.set(
        `${String(entity.type ?? "")}::${String(entity.id ?? "")}`,
        entity,
      );
    }
  }
  if (candidates.size > MAX_CANDIDATES) {
    return Array.from(candidates.values()).slice(0, MAX_CANDIDATES);
  }
  return Array.from(candidates.values());
}

// implements REQ-kibi-intent-aware-source-discovery
export async function executeIntentSearch(
  options: IntentSearchOptions,
  prolog: PrologPort,
  workspaceRoot: string,
): Promise<IntentSearchResult> {
  const candidates = await loadIntentCandidates(prolog, options);
  const firstPass = await rankIntentEntities(
    candidates,
    options,
    workspaceRoot,
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
  for (const id of relatedIds.slice(0, MAX_GRAPH_SEEDS * 4)) {
    const related = await loadEntities(prolog, { id });
    for (const entity of related) {
      const key = `${String(entity.type ?? "")}::${String(entity.id ?? "")}`;
      if (!knownIds.has(key)) {
        knownIds.add(key);
        candidates.push(entity);
      }
    }
  }
  return rankIntentEntities(candidates, options, workspaceRoot, graphEdges);
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
