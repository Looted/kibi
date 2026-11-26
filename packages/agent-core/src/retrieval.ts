/**
 * Decision retrieval: one function that finds the decisions (requirements and
 * ADRs) relevant to what an agent asks, reads or changes.
 *
 * It runs without Prolog or the CLI, so hooks, the MCP server, `kb_check` and
 * the CLI can all call it. `buildRetrievalIndex` turns the KB's entities and
 * relationships into decision cards and a word index; the index is plain JSON,
 * so sync can write it once and every caller reads it. `retrieve` answers a
 * context (question words, files in play, an edit) with a short list of cards.
 *
 * The answer is discovery, never proof: a weak or empty answer says which
 * words nothing covered and which decisions were nearest, not that nothing
 * governs.
 *
 * Stages, in order:
 * 1. Scope. Each decision is in this workspace's scope (linked to a file here,
 *    or from a knowledge source whose decisions are linked here), unscoped (no
 *    evidence either way, such as a freshly recorded rule), or in another scope
 *    (linked only to files that are not here, or from a source none of whose
 *    decisions is linked here). Candidates come from the first two; the third
 *    is reported as a count.
 * 2. Candidates. A field-weighted word ranking over the cards (title,
 *    statement, the facts and symbols each decision owns), and optionally a
 *    vector ranking, fused by rank.
 * 3. Rerank. Status, nearness to the files in play, ownership of the edited
 *    symbol. Unscoped decisions keep a floor so a missing link does not bury
 *    them.
 * 4. Collapse. A superseded decision folds into its successor; a near-identical
 *    decision folds under the one ranked above it unless either is firm or they
 *    differ in polarity.
 */

import { isStopToken, signalTokens, words } from "./retrieval-tokens.js";

export type RetrievalEntity = Readonly<Record<string, unknown>> & {
  readonly id: string;
  readonly type: string;
};

export type RetrievalEdge = Readonly<{
  relationship: string;
  from: string;
  to: string;
}>;

export type RetrievalScope = "in" | "unscoped" | "distant" | "other";

export type DecisionCardData = Readonly<{
  id: string;
  type: "req" | "adr";
  title: string;
  /** The decision's statement, cut to a few hundred characters. */
  statement: string;
  status: string;
  firm: boolean;
  /** Files of the symbols that implement the decision. */
  files: readonly string[];
  /** Titles of the symbols that implement the decision. */
  symbols: readonly string[];
  /** The decision that replaces this one, when it is superseded. */
  supersededBy?: string;
  scope: RetrievalScope;
  /** Why the scope was given, for the card's evidence. */
  scopeReason: string;
}>;

type Posting = readonly [card: number, weight: number];

export type RetrievalIndex = Readonly<{
  format: typeof INDEX_FORMAT;
  cards: readonly DecisionCardData[];
  /** Token to the cards that contain it with the token's field weight. */
  postings: Readonly<Record<string, readonly Posting[]>>;
  /**
   * Token to the card positions that hold it in their governing text (title,
   * id, statement without rationale/context sections, decision, and facts).
   * Used for governing coverage so rationale-only words do not make a
   * requirement govern a question.
   */
  governingPostings?: Readonly<Record<string, readonly number[]>>;
  /** Each card's field-weighted length, for length normalization. */
  lengths: readonly number[];
  averageLength: number;
}>;

export const INDEX_FORMAT = "kibi-agent-core.retrieval-index.v1";

// Field weights, fixed before measuring: a title says what the decision is
// about; its identifier, owned facts and implementing symbols are strong
// evidence; tags and body text are context.
const FIELD_WEIGHTS = {
  title: 3,
  id: 2,
  facts: 1.5,
  symbols: 1.5,
  statement: 1,
  tags: 1,
} as const;

const FACT_LINKS = new Set([
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);
const DECISION_TYPES = new Set(["req", "adr"]);
const NON_GOVERNING = new Set([
  "superseded",
  "deprecated",
  "rejected",
  "retired",
  "obsolete",
  "archived",
]);
const SOURCE_TAG = "knowledge-source:";
// Tags that say how an entity was recorded rather than what it is about.
const BOOKKEEPING_TAG = /^(?:bootstrap|knowledge-source:|lane:|review:)/;

/** A knowledge source is this workspace's when this many of its decisions are linked here. */
const SOURCE_IN_SCOPE_LINKS = 2;
/** A source with this many decisions and none linked here is about something else. */
const SOURCE_OTHER_MIN_DECISIONS = 3;

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.filter((item) => typeof item === "string").join(" ");
  return "";
}

function tagsOf(entity: RetrievalEntity): string[] {
  return Array.isArray(entity.tags) ? entity.tags.map(String) : [];
}

function fileWords(file: string): string {
  // The last two path segments name the module; the extension does not.
  return file
    .split("/")
    .slice(-2)
    .join(" ")
    .replace(/\.[a-z0-9]+$/i, "");
}

export type BuildRetrievalIndexOptions = Readonly<{
  /** True when a workspace-relative file exists here. Defaults to every file. */
  fileExists?: (file: string) => boolean;
}>;

/** Build decision cards and their word index from the KB's rows. */
export function buildRetrievalIndex(
  entities: readonly RetrievalEntity[],
  edges: readonly RetrievalEdge[],
  options: BuildRetrievalIndexOptions = {},
): RetrievalIndex {
  const fileExists = options.fileExists ?? (() => true);
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const factsOf = new Map<string, RetrievalEntity[]>();
  const symbolsOf = new Map<string, RetrievalEntity[]>();
  const successorOf = new Map<string, string>();
  for (const edge of edges) {
    if (FACT_LINKS.has(edge.relationship)) {
      const fact = byId.get(edge.to);
      if (fact) push(factsOf, edge.from, fact);
    } else if (edge.relationship === "implements") {
      const symbol = byId.get(edge.from);
      if (symbol) push(symbolsOf, edge.to, symbol);
    } else if (edge.relationship === "supersedes") {
      successorOf.set(edge.to, edge.from);
    }
  }

  const decisions = entities.filter((entity) =>
    DECISION_TYPES.has(entity.type),
  );
  const filesOf = (entity: RetrievalEntity) => [
    ...new Set(
      (symbolsOf.get(entity.id) ?? [])
        .map((symbol) => text(symbol.sourceFile))
        .filter(Boolean),
    ),
  ];
  const linkedHere = (entity: RetrievalEntity) =>
    filesOf(entity).some((file) => fileExists(file));

  // Knowledge sources: how many decisions each has and how many are linked here.
  const sourceStats = new Map<string, { decisions: number; here: number }>();
  for (const decision of decisions) {
    const source = tagsOf(decision).find((tag) => tag.startsWith(SOURCE_TAG));
    if (!source) continue;
    const stats = sourceStats.get(source) ?? { decisions: 0, here: 0 };
    stats.decisions += 1;
    if (linkedHere(decision)) stats.here += 1;
    sourceStats.set(source, stats);
  }
  const anyLinkHere = decisions.some(linkedHere);

  const cards: DecisionCardData[] = [];
  const fieldsOf: Array<Record<keyof typeof FIELD_WEIGHTS, string>> = [];
  const governingTextOf: string[] = [];
  for (const decision of decisions) {
    const files = filesOf(decision);
    const source = tagsOf(decision).find((tag) => tag.startsWith(SOURCE_TAG));
    const stats = source ? sourceStats.get(source) : undefined;
    let scope: RetrievalScope = "unscoped";
    let scopeReason = "no scope evidence";
    if (files.some((file) => fileExists(file))) {
      scope = "in";
      scopeReason = "linked to code here";
    } else if (stats && stats.here >= SOURCE_IN_SCOPE_LINKS) {
      scope = "in";
      scopeReason = `from ${source}, whose decisions are linked here`;
    } else if (files.length > 0) {
      scope = "other";
      scopeReason = "linked only to files that are not here";
    } else if (
      anyLinkHere &&
      stats &&
      stats.here === 0 &&
      stats.decisions >= SOURCE_OTHER_MIN_DECISIONS
    ) {
      scope = "distant";
      scopeReason = `from ${source}, none of whose decisions is linked here`;
    }
    const symbols = symbolsOf.get(decision.id) ?? [];
    const facts = factsOf.get(decision.id) ?? [];
    const successor = successorOf.get(decision.id);
    const factsText = facts
      .map((fact) =>
        [
          fact.title,
          fact.subject_key,
          fact.canonical_key,
          fact.property_key,
          fact.claim_text,
          fact.body,
        ]
          .map(text)
          .join(" "),
      )
      .join(" ");
    const governingStatement =
      text(decision.semantic_text).trim() ||
      stripRationaleSections(text(decision.body));
    cards.push({
      id: decision.id,
      type: decision.type as "req" | "adr",
      title: text(decision.title) || decision.id,
      statement: statementOf(decision),
      status: text(decision.status).trim().toLowerCase(),
      firm: text(decision.firmness).trim().toLowerCase() === "firm",
      files,
      symbols: [...new Set(symbols.map((symbol) => text(symbol.title)))],
      ...(successor !== undefined ? { supersededBy: successor } : {}),
      scope,
      scopeReason,
    });
    const strippedId = decision.id.replace(/^(?:REQ|ADR)-/, "");
    fieldsOf.push({
      title: text(decision.title),
      id: strippedId,
      statement: [
        text(decision.semantic_text),
        text(decision.body),
        text(decision.decision),
      ].join(" "),
      facts: factsText,
      symbols: symbols
        .map(
          (symbol) =>
            `${text(symbol.title)} ${fileWords(text(symbol.sourceFile))}`,
        )
        .join(" "),
      tags: tagsOf(decision)
        .filter((tag) => !BOOKKEEPING_TAG.test(tag))
        .join(" "),
    });
    governingTextOf.push(
      [
        text(decision.title),
        strippedId,
        governingStatement,
        text(decision.decision),
        factsText,
      ].join(" "),
    );
  }

  const postings: Record<string, Posting[]> = {};
  const governingPostings: Record<string, number[]> = {};
  const lengths: number[] = [];
  fieldsOf.forEach((fields, card) => {
    const weights = new Map<string, number>();
    let length = 0;
    for (const field of Object.keys(FIELD_WEIGHTS) as Array<
      keyof typeof FIELD_WEIGHTS
    >) {
      const weight = FIELD_WEIGHTS[field];
      for (const token of words(fields[field])) {
        if (isStopToken(token)) continue;
        weights.set(token, (weights.get(token) ?? 0) + weight);
        length += weight;
      }
    }
    lengths.push(length);
    for (const [token, weight] of weights) {
      const list = postings[token];
      if (list) list.push([card, weight]);
      else postings[token] = [[card, weight]];
    }
    const governingTokens = new Set<string>();
    for (const token of words(governingTextOf[card] ?? "")) {
      if (!isStopToken(token)) governingTokens.add(token);
    }
    for (const token of governingTokens) {
      const list = governingPostings[token];
      if (list) list.push(card);
      else governingPostings[token] = [card];
    }
  });
  const averageLength =
    lengths.length === 0
      ? 0
      : lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
  return {
    format: INDEX_FORMAT,
    cards,
    postings,
    governingPostings,
    lengths,
    averageLength,
  };
}

const STATEMENT_CHARS = 240;
const PROHIBITION =
  /\b(?:must\s+not|never|forbidden|prohibited|cannot|shall\s+not|do\s+not)\b/i;
const RATIONALE_HEADING =
  /^\s{0,3}(#{1,6})\s+(?:rationale|why|context|background|notes|evidence)\b/i;

/** Strip Markdown sections whose heading names rationale or background context. */
function stripRationaleSections(body: string): string {
  const kept: string[] = [];
  let skippingLevel = 0;
  let fenced = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      if (skippingLevel === 0) kept.push(line);
      continue;
    }
    if (!fenced) {
      const heading = /^\s{0,3}(#{1,6})\s+/.exec(line);
      if (heading) {
        const level = (heading[1] as string).length;
        if (RATIONALE_HEADING.test(line)) {
          skippingLevel = level;
          continue;
        }
        if (skippingLevel > 0 && level <= skippingLevel) skippingLevel = 0;
      }
    }
    if (skippingLevel === 0) kept.push(line);
  }
  return kept.join("\n");
}

/**
 * Cut prose to `maxChars` while keeping a trailing prohibition clause
 * ("must never ...", "must not ...") when the head alone would drop it.
 */
function clipPreservingProhibition(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  if (maxChars <= 1) return "…".slice(0, maxChars);
  const head = value.slice(0, maxChars - 1);
  if (!PROHIBITION.test(head)) {
    const tailMatch = PROHIBITION.exec(value.slice(maxChars - 1));
    if (tailMatch) {
      const hitAt = maxChars - 1 + tailMatch.index;
      const beforeHit = value.slice(0, hitAt);
      const boundary = Math.max(
        beforeHit.lastIndexOf(". "),
        beforeHit.lastIndexOf("; "),
        beforeHit.lastIndexOf(", "),
      );
      const clauseStart = boundary >= 0 ? boundary + 2 : hitAt;
      const clause = value.slice(clauseStart).trim();
      const separator = " … ";
      const minHead = Math.min(48, Math.floor(maxChars / 3));
      const clauseBudget = maxChars - minHead - separator.length;
      if (clauseBudget >= 24) {
        const keptClause =
          clause.length > clauseBudget
            ? `${clause.slice(0, clauseBudget - 1).trimEnd()}…`
            : clause;
        const headBudget = maxChars - keptClause.length - separator.length;
        if (headBudget >= 12) {
          const keptHead = value.slice(0, headBudget).trimEnd();
          return `${keptHead}${separator}${keptClause}`;
        }
      }
    }
  }
  return `${head}…`;
}

function statementOf(entity: RetrievalEntity): string {
  const statement =
    text(entity.semantic_text).trim() ||
    stripRationaleSections(text(entity.body)).replace(/^#.*$/gm, "").trim() ||
    text(entity.body).replace(/^#.*$/gm, "").trim();
  return clipPreservingProhibition(statement, STATEMENT_CHARS);
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const rows = map.get(key);
  if (rows) rows.push(value);
  else map.set(key, [value]);
}

export type RetrievalEdit = Readonly<{
  path: string;
  old: string;
  new: string;
}>;

export type RetrievalContext = Readonly<{
  /** The agent's question or search words. */
  text?: string;
  /** The user's request, when it is known; weaker evidence than the edit. */
  request?: string;
  /** Workspace-relative files in play (read, named, edited). */
  paths?: readonly string[];
  /** Symbols in play (the symbol an edit lands in, a symbol read). */
  symbols?: readonly string[];
  /** The edits about to be made or the working-tree diff, per file. */
  edits?: readonly RetrievalEdit[];
  /** Cards to return (default 5). */
  limit?: number;
  /**
   * Similarity of each card to the question from another retriever
   * (embeddings), by card position. It is fused with the word ranking by rank.
   */
  vectorScores?: readonly number[];
  /** Weight of the similarity ranking against the word ranking (default 1). */
  vectorWeight?: number;
  /** Only decisions of these types are returned (default: both). */
  types?: readonly DecisionCardData["type"][];
}>;

export type DecisionCard = Readonly<{
  id: string;
  type: "req" | "adr";
  title: string;
  statement: string;
  status: string;
  firm: boolean;
  scope: Exclude<RetrievalScope, "other">;
  score: number;
  /** Share of the question's weight this card's words cover, 0 to 1. */
  coverage: number;
  /** Why the card is here, in short phrases. */
  evidence: readonly string[];
  /** Near-identical or replaced decisions shown through this card. */
  folded: readonly string[];
}>;

export type RetrievalResult = Readonly<{
  cards: readonly DecisionCard[];
  /** Every ranked decision id, best first, before the limit (for evaluation). */
  ranking: readonly string[];
  /** Matching decisions in other scopes, shown as a count, best first. */
  otherScopes: Readonly<{ count: number; ids: readonly string[] }>;
  /** Signal words of the question that no returned card contains. */
  uncoveredTerms: readonly string[];
  /** Share of the question's weight the best card covers, 0 to 1. */
  coverage: number;
}>;

const RRF_K = 60;
const DEFAULT_LIMIT = 5;
const BM25_K1 = 1.2;
const BM25_B = 0.6;
/** An unscoped decision keeps this share of its score: a floor, not a filter. */
const UNSCOPED_FACTOR = 0.85;
/**
 * A decision from a knowledge source none of whose decisions is linked here is
 * probably about something else. It stays a candidate, demoted, so a source
 * nobody linked yet is not hidden.
 */
const DISTANT_FACTOR = 0.5;
const CLOSED_FACTOR = 0.75;
const NON_GOVERNING_FACTOR = 0.5;
const NEAR_FILE_BOOST = 0.5;
const NEAR_DIRECTORY_BOOST = 0.25;
const EDITED_SYMBOL_BOOST = 1;
/** The best match on relevance alone is shown at this rank or higher. */
const RELEVANCE_SLOT = 2;
/** Rankings fused: each list contributes at most this many candidates. */
const MAX_LIST = 300;
/** Near-identical titles share at least this share of their signal words. */
const DUPLICATE_SIMILARITY = 0.8;
/** Only the leading rows fold look-alikes: deeper rows are never shown. */
const COLLAPSE_WINDOW = 20;
const NEGATION = new Set(["not", "no", "never", "without", "cannot"]);

type Scored = Map<number, number>;

function bm25(
  index: RetrievalIndex,
  tokens: readonly string[],
): { scores: Scored; idf: Map<string, number> } {
  const scores: Scored = new Map();
  const idf = new Map<string, number>();
  const n = index.cards.length;
  for (const token of tokens) {
    const postings = index.postings[token];
    const frequency = postings?.length ?? 0;
    const weight = Math.log(1 + (n - frequency + 0.5) / (frequency + 0.5));
    idf.set(token, weight);
    if (!postings) continue;
    for (const [card, tf] of postings) {
      const norm =
        1 -
        BM25_B +
        BM25_B * ((index.lengths[card] ?? 0) / (index.averageLength || 1));
      scores.set(
        card,
        (scores.get(card) ?? 0) + (weight * tf) / (tf + BM25_K1 * norm),
      );
    }
  }
  return { scores, idf };
}

function order(
  index: RetrievalIndex,
  scores: Iterable<readonly [number, number]>,
): number[] {
  return [...scores]
    .map(([card, score]) => {
      const scope = index.cards[card]?.scope;
      return [
        card,
        scope === "other"
          ? 0
          : scope === "distant"
            ? score * DISTANT_FACTOR
            : score,
      ] as const;
    })
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([card]) => card)
    .slice(0, MAX_LIST);
}

function fuse(
  lists: readonly (readonly number[])[],
  weights: ReadonlyMap<readonly number[], number> = new Map(),
): Scored {
  const fused: Scored = new Map();
  for (const list of lists) {
    const weight = weights.get(list) ?? 1;
    list.forEach((card, rank) => {
      fused.set(card, (fused.get(card) ?? 0) + weight / (RRF_K + rank + 1));
    });
  }
  return fused;
}

function editText(edits: readonly RetrievalEdit[]): string {
  return edits.map((edit) => `${edit.old}\n${edit.new}`).join("\n");
}

function directory(file: string): string {
  const slash = file.lastIndexOf("/");
  return slash < 0 ? "" : file.slice(0, slash);
}

function similarity(left: readonly string[], right: readonly string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

function negated(title: string): boolean {
  return title
    .toLowerCase()
    .split(/[^a-z']+/)
    .some((word) => NEGATION.has(word) || word.endsWith("n't"));
}

/** Find the decisions relevant to `context`. */
export function retrieve(
  index: RetrievalIndex,
  context: RetrievalContext,
): RetrievalResult {
  const limit = context.limit ?? DEFAULT_LIMIT;
  const edits = context.edits ?? [];
  const paths = [
    ...new Set([...(context.paths ?? []), ...edits.map((edit) => edit.path)]),
  ];
  const editedFiles = new Set(edits.map((edit) => edit.path));
  const nearFiles = new Set(paths);
  const nearDirectories = new Set(paths.map(directory));
  const editedSymbols = new Set(context.symbols ?? []);
  if (edits.length > 0) {
    // An edit lands in the symbols its text names, of the edited files.
    const changed = editText(edits);
    for (const card of index.cards) {
      if (!card.files.some((file) => editedFiles.has(file))) continue;
      for (const symbol of card.symbols)
        if (symbol && changed.includes(symbol)) editedSymbols.add(symbol);
    }
  }

  const questionTokens = signalTokens(context.text ?? "");
  const lists: number[][] = [];
  let questionScores: Scored = new Map();
  let questionIdf = new Map<string, number>();
  if (questionTokens.length > 0) {
    const ranked = bm25(index, questionTokens);
    questionScores = ranked.scores;
    questionIdf = ranked.idf;
    lists.push(order(index, questionScores));
  }
  const weights = new Map<readonly number[], number>();
  if (context.vectorScores) {
    const list = order(index, context.vectorScores.entries());
    weights.set(list, context.vectorWeight ?? 1);
    lists.push(list);
  }
  if (edits.length > 0) {
    lists.push(order(index, bm25(index, signalTokens(editText(edits))).scores));
  }
  if (context.request?.trim()) {
    lists.push(order(index, bm25(index, signalTokens(context.request)).scores));
  }
  // The decisions that own an edited symbol are candidates even when no word
  // matched.
  const owners: number[] = [];
  index.cards.forEach((card, position) => {
    if (
      card.scope !== "other" &&
      card.scope !== "distant" &&
      card.symbols.some((symbol) => editedSymbols.has(symbol)) &&
      card.files.some((file) => nearFiles.has(file))
    )
      owners.push(position);
  });
  const relevanceLists = [...lists];
  if (owners.length > 0) lists.push(owners);

  const fused = fuse(lists, weights);
  const types = new Set(context.types ?? ["req", "adr"]);
  const scored: Array<{ card: number; score: number; evidence: string[] }> = [];
  for (const [position, base] of fused) {
    const card = index.cards[position] as DecisionCardData;
    if (!types.has(card.type)) continue;
    const evidence: string[] = [];
    let score = base;
    if (card.scope === "unscoped") score *= UNSCOPED_FACTOR;
    else if (card.scope === "distant") score *= DISTANT_FACTOR;
    else evidence.push(card.scopeReason);
    if (NON_GOVERNING.has(card.status) || card.supersededBy) {
      score *= NON_GOVERNING_FACTOR;
      evidence.push(card.supersededBy ? "superseded" : card.status);
    } else if (card.status === "closed") {
      score *= CLOSED_FACTOR;
      evidence.push("closed");
    }
    let boost = 0;
    const nearFile = card.files.find((file) => nearFiles.has(file));
    if (nearFile) {
      boost = NEAR_FILE_BOOST;
      evidence.push(`linked to ${nearFile}`);
    } else if (
      card.files.some((file) => nearDirectories.has(directory(file)))
    ) {
      boost = NEAR_DIRECTORY_BOOST;
      evidence.push("linked near the files in play");
    }
    const symbol = card.symbols.find((name) => editedSymbols.has(name));
    if (symbol && nearFile) {
      boost += EDITED_SYMBOL_BOOST;
      evidence.push(`owns ${symbol}`);
    }
    scored.push({ card: position, score: score * (1 + boost), evidence });
  }
  const byScore = (
    a: { card: number; score: number },
    b: { card: number; score: number },
  ) =>
    b.score - a.score ||
    compare(
      (index.cards[a.card] as DecisionCardData).id,
      (index.cards[b.card] as DecisionCardData).id,
    );
  // The best match on relevance alone, before nearness and ownership boosts,
  // keeps a place near the top: a decision nobody linked to the file is not
  // pushed down by the decisions that are linked to it.
  const relevance = [...fuse(relevanceLists, weights)]
    .map(([card, score]) => ({ card, score }))
    .sort(byScore)[0];
  scored.sort(byScore);
  if (relevance) {
    const at = scored.findIndex((entry) => entry.card === relevance.card);
    if (at >= RELEVANCE_SLOT) {
      const [entry] = scored.splice(at, 1);
      if (entry) {
        entry.evidence.push("best match on its words");
        scored.splice(RELEVANCE_SLOT - 1, 0, entry);
      }
    }
  }

  // Collapse: replaced decisions into their successor, near-identical ones
  // under the card above them. A firm decision, or one of opposite polarity,
  // is never folded.
  const shown: Array<{
    card: number;
    score: number;
    evidence: string[];
    folded: string[];
    tokens: string[];
  }> = [];
  const shownById = new Map<string, (typeof shown)[number]>();
  const scoredIds = new Set(
    scored.map((entry) => (index.cards[entry.card] as DecisionCardData).id),
  );
  const replaced: Array<{ id: string; head: string }> = [];
  for (const entry of scored) {
    const card = index.cards[entry.card] as DecisionCardData;
    const head = card.supersededBy
      ? chainHead(index, card.supersededBy)
      : undefined;
    if (head !== undefined && scoredIds.has(head)) {
      replaced.push({ id: card.id, head });
      continue;
    }
    const tokens = signalTokens(card.title);
    const twin = card.firm
      ? undefined
      : shown.slice(0, COLLAPSE_WINDOW).find((other) => {
          const otherCard = index.cards[other.card] as DecisionCardData;
          return (
            !otherCard.firm &&
            negated(otherCard.title) === negated(card.title) &&
            similarity(other.tokens, tokens) >= DUPLICATE_SIMILARITY
          );
        });
    if (twin) {
      twin.folded.push(card.id);
      continue;
    }
    const row = { ...entry, folded: [], tokens };
    shown.push(row);
    shownById.set(card.id, row);
  }

  for (const { id, head } of replaced) {
    const row =
      shownById.get(head) ?? shown.find((entry) => entry.folded.includes(head));
    row?.folded.push(id);
  }

  const total = [...questionIdf.values()].reduce((sum, w) => sum + w, 0);
  const tokenInGoverning = (token: string, position: number): boolean =>
    index.governingPostings !== undefined
      ? (index.governingPostings[token]?.includes(position) ?? false)
      : (index.postings[token]?.some(([card]) => card === position) ?? false);
  const coverageOf = (position: number) =>
    total > 0
      ? questionTokens
          .filter((token) => tokenInGoverning(token, position))
          .reduce((sum, token) => sum + (questionIdf.get(token) ?? 0), 0) /
        total
      : 0;
  const cards: DecisionCard[] = shown.slice(0, limit).map((entry) => {
    const card = index.cards[entry.card] as DecisionCardData;
    return {
      id: card.id,
      type: card.type,
      title: card.title,
      statement: card.statement,
      status: card.status,
      firm: card.firm,
      scope: card.scope as Exclude<RetrievalScope, "other">,
      score: entry.score,
      coverage: coverageOf(entry.card),
      evidence: entry.evidence,
      folded: entry.folded,
    };
  });

  // Other scopes: what would have matched the question outside the scope.
  const other = [...questionScores]
    .filter(([position]) => {
      const card = index.cards[position];
      return card?.scope === "other" && types.has(card.type);
    })
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([position]) => (index.cards[position] as DecisionCardData).id);

  const covered = new Set<string>();
  for (const entry of shown.slice(0, limit)) {
    for (const token of questionTokens) {
      const postings = index.postings[token];
      if (postings?.some(([card]) => card === entry.card)) covered.add(token);
    }
  }
  const bestCovered = cards.reduce(
    (max, card) => Math.max(max, card.coverage),
    0,
  );

  return {
    cards,
    ranking: shown.map(
      (entry) => (index.cards[entry.card] as DecisionCardData).id,
    ),
    otherScopes: { count: other.length, ids: other.slice(0, 3) },
    uncoveredTerms: questionTokens.filter((token) => !covered.has(token)),
    coverage: bestCovered,
  };
}

/**
 * Share of the question's weight that decision `id`'s governing words cover,
 * 0 to 1; 0 for a decision the index does not hold.
 */
export function decisionCoverage(
  index: RetrievalIndex,
  text: string,
  id: string,
): number {
  const position = index.cards.findIndex((card) => card.id === id);
  const tokens = signalTokens(text);
  if (position < 0 || tokens.length === 0) return 0;
  const { idf } = bm25(index, tokens);
  const total = [...idf.values()].reduce((sum, w) => sum + w, 0);
  const covered = tokens
    .filter((token) =>
      index.governingPostings !== undefined
        ? (index.governingPostings[token]?.includes(position) ?? false)
        : (index.postings[token]?.some(([card]) => card === position) ?? false),
    )
    .reduce((sum, token) => sum + (idf.get(token) ?? 0), 0);
  return covered / total;
}

const MAX_CHAIN = 32;

/** The current end of a supersession chain starting at `id`. */
function chainHead(index: RetrievalIndex, id: string): string {
  const byId = cardsById(index);
  let head = id;
  for (let step = 0; step < MAX_CHAIN; step += 1) {
    const next = byId.get(head)?.supersededBy;
    if (next === undefined) break;
    head = next;
  }
  return head;
}

const CARDS_BY_ID = new WeakMap<
  RetrievalIndex,
  Map<string, DecisionCardData>
>();
function cardsById(index: RetrievalIndex): Map<string, DecisionCardData> {
  let map = CARDS_BY_ID.get(index);
  if (!map) {
    map = new Map(index.cards.map((card) => [card.id, card]));
    CARDS_BY_ID.set(index, map);
  }
  return map;
}

// Card ids are distinct, so two cards never compare equal.
function compare(left: string, right: string): number {
  return left < right ? -1 : 1;
}

/** Characters of a card line, at most. */
const CARD_LINE_CHARS = 300;

/**
 * One line per card: id, firmness, non-current status, title, the statement
 * when it says more than the title, and the strongest evidence. Hooks and
 * compact answers show this.
 */
export function formatCardLine(card: DecisionCard): string {
  const statusTag =
    NON_GOVERNING.has(card.status) || card.status === "closed"
      ? card.status
      : card.evidence.includes("superseded")
        ? "superseded"
        : "";
  const head = `${card.id}${card.firm ? " [firm]" : ""}${statusTag ? ` [${statusTag}]` : ""}: ${card.title}`;
  const statement = card.statement.trim();
  const hasStatement =
    statement !== "" && !card.title.includes(statement.slice(0, 40));
  const evidence = card.evidence[0];
  let suffix = "";
  if (evidence) suffix += ` (${evidence})`;
  if (card.folded.length > 0) suffix += ` +${card.folded.length} similar`;
  const full = `${head}${hasStatement ? ` — ${statement}` : ""}${suffix}`;
  if (full.length <= CARD_LINE_CHARS) return full;
  if (hasStatement) {
    const budget = CARD_LINE_CHARS - head.length - 3 - suffix.length;
    if (budget >= 24) {
      return `${head} — ${clipPreservingProhibition(statement, budget)}${suffix}`;
    }
    const noSuffixBudget = CARD_LINE_CHARS - head.length - 3;
    if (noSuffixBudget >= 24) {
      return `${head} — ${clipPreservingProhibition(statement, noSuffixBudget)}`;
    }
  }
  return `${full.slice(0, CARD_LINE_CHARS - 1)}…`;
}
