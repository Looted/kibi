/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import {
  type DecisionCard,
  type RetrievalIndex,
  type RetrievalResult,
  buildRetrievalIndex,
  retrieve,
} from "kibi-agent-core/retrieval";
import type { SearchHintsEntity } from "kibi-plugin-sdk";

import {
  type CorpusEdge,
  type CorpusEntity,
  loadDecisionCorpus,
} from "./decision-corpus.js";
import { tokenSourceHash } from "./search-token-cache.js";

/**
 * Decision search: kb_search's ranking of requirements and ADRs. The words
 * of the question are ranked over every decision's title, statement, facts
 * and implementing symbols (agent-core's retriever), the meaning ranking of
 * an embedding provider is fused in when one is installed, and the answer
 * is five one-line decision cards plus a short list of decisions related by
 * meaning.
 */

/** Cards a search returns by default. */
export const DECISION_CARD_LIMIT = 5;
/** Decisions shown as related by meaning beside the cards, at most. */
export const MEANING_LIST_LIMIT = 7;
/**
 * Minimum similarity a meaning hit needs to appear in the related-by-meaning
 * list or produce meaning-only cards. Keeps stop-word and punctuation queries
 * from filling the list with unrelated decisions.
 */
export const MIN_MEANING_SCORE = 0.22;
/**
 * Minimum coverage gap between the top two governing requirements for the
 * top one to be named without treating the list as close candidates.
 */
const CLEAR_COVERAGE_MARGIN = 0.15;
/**
 * When two governing requirements have similar coverage, the second must stay
 * below this share of the first's score for the first to count as a clear win.
 */
const CLOSE_SCORE_RATIO = 0.85;
const NON_CURRENT_STATUS = new Set([
  "superseded",
  "deprecated",
  "rejected",
  "retired",
  "obsolete",
  "archived",
  "closed",
]);
/**
 * A card that covers less than this share of the question's weight is not
 * named as governing it, and an answer none of whose cards reaches it is
 * weak: the cards stay as the nearest decisions, but no requirement is said
 * to govern. On Kibi's own gold questions every question the KB cannot
 * answer stays below 0.4.
 */
export const WEAK_COVERAGE = 0.5;
/**
 * Weight of the meaning ranking against the word ranking. At full weight
 * close paraphrases pushed exact word matches out of the top three on
 * Kibi's own gold questions; at half weight they keep their place and the
 * user-language questions of the Papra replay rank as well as at full weight.
 */
export const MEANING_WEIGHT = 0.5;
/** A folded decision's seed score, as a share of its card's. */
const FOLDED_SEED_SHARE = 0.9;
/** Text an embedding provider sees per entity: title, statement, body. */
const VECTOR_TEXT_CHARS = 2000;
/**
 * Relationships from a decision to the entities whose meaning it is credited
 * with: its scenarios, tests and facts carry the user's wording more often
 * than its own title. The facts its scenarios assume are credited too.
 */
const MEANING_LINKS = new Set([
  "specified_by",
  "verified_by",
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);

export type MeaningScores = ReadonlyMap<string, number>;

/** Scores entities by meaning; undefined when no provider answered. */
export type MeaningRanker = (
  query: string,
  entities: readonly SearchHintsEntity[],
) => Promise<MeaningScores | undefined>;

export type DecisionSearchInput = Readonly<{
  query: string;
  /** Decision types to return; both when unset. */
  types?: readonly ("req" | "adr")[];
  /** Workspace-relative files the question is about. */
  paths?: readonly string[];
  limit?: number;
  offset?: number;
  meaning?: MeaningRanker;
}>;

export type MeaningItem = Readonly<{
  id: string;
  title: string;
  score: number;
}>;

/**
 * A decision that covers enough of the question to be asked whether it
 * governs it: a card, or a decision folded into a card. Seeds are scored by
 * their card's rank, a folded decision a little below its card.
 */
export type AnswerSeed = Readonly<{
  id: string;
  type: "req" | "adr";
  title: string;
  status: string;
  score: number;
  /** The card this decision was folded into, when it is not one itself. */
  foldedInto?: string;
  reasons: readonly string[];
}>;

export type DecisionSearchResult = Readonly<{
  /** The cards of the requested page. */
  cards: readonly DecisionCard[];
  retrieval: RetrievalResult;
  /** Decisions related by meaning that are not already a card. */
  meaning: readonly MeaningItem[];
  /** Whether a meaning ranking was fused in. */
  fused: boolean;
  /** The decisions that cover enough of the question to govern it. */
  seeds: readonly AnswerSeed[];
  /** No card covers enough of the question to govern it. */
  weak: boolean;
  /** Top governing requirements are close and should be confirmed as candidates. */
  ambiguous: boolean;
  /** Corpus supersession map (superseded id -> superseding id). */
  supersededBy: Readonly<Record<string, string>>;
  /** Corpus source path per entity id (for stale-store reporting). */
  sources: Readonly<Record<string, string>>;
  /** Decisions in the corpus. */
  decisionCount: number;
}>;

type Prepared = Readonly<{
  signature: string;
  index: RetrievalIndex;
  /** Entities whose meaning is asked of a provider, decisions first. */
  vectorEntities: readonly SearchHintsEntity[];
  /** For each card position, the entity ids it is credited with. */
  credited: readonly (readonly string[])[];
}>;

const prepared = new Map<string, Prepared>();

function vectorText(entity: CorpusEntity): string {
  return [entity.title, entity.semantic_text, entity.body]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join("\n")
    .slice(0, VECTOR_TEXT_CHARS);
}

function prepare(
  workspaceRoot: string,
  entities: readonly CorpusEntity[],
  edges: readonly CorpusEdge[],
  signature: string,
): Prepared {
  const key = path.resolve(workspaceRoot);
  const memo = prepared.get(key);
  if (memo?.signature === signature) return memo;
  const index = buildRetrievalIndex(entities, edges, {
    fileExists: (file) => existsSync(path.join(workspaceRoot, file)),
  });
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const position = new Map(index.cards.map((card, at) => [card.id, at]));
  const credited: string[][] = index.cards.map((card) => [card.id]);
  const scenarioOwners = new Map<string, number[]>();
  for (const edge of edges) {
    if (!MEANING_LINKS.has(edge.relationship) || !byId.has(edge.to)) continue;
    const at = position.get(edge.from);
    if (at === undefined) continue;
    credited[at]?.push(edge.to);
    if (edge.relationship === "specified_by")
      scenarioOwners.set(edge.to, [...(scenarioOwners.get(edge.to) ?? []), at]);
  }
  // A fact a decision's scenario assumes, such as the forbidden situation of
  // a rejecting scenario, is credited to the decision too: a hit on it shows
  // the decision it guards.
  for (const edge of edges) {
    if (edge.relationship !== "assumes" || !byId.has(edge.to)) continue;
    for (const at of scenarioOwners.get(edge.from) ?? [])
      credited[at]?.push(edge.to);
  }
  const ids = [...new Set(credited.flat())];
  const vectorEntities = ids.map((id): SearchHintsEntity => {
    const entity = byId.get(id) as CorpusEntity;
    const text = vectorText(entity);
    return {
      id,
      type: entity.type,
      title: entity.title,
      text,
      hash: tokenSourceHash([text]),
    };
  });
  const result: Prepared = {
    signature,
    index,
    vectorEntities,
    credited: credited.map((list) => [...new Set(list)]),
  };
  prepared.set(key, result);
  return result;
}

/**
 * A decision's meaning score: the mean of the two best scores among its own
 * text and the scenarios, tests and facts it links, so one close entity
 * counts and two agreeing ones count more.
 */
export function creditedScore(scores: readonly number[]): number {
  const best = [...scores].sort((a, b) => b - a);
  const first = best[0] ?? 0;
  return (first + (best[1] ?? first)) / 2;
}

export async function searchDecisions(
  workspaceRoot: string,
  input: DecisionSearchInput,
): Promise<DecisionSearchResult> {
  const corpus = loadDecisionCorpus(workspaceRoot);
  const { index, vectorEntities, credited } = prepare(
    workspaceRoot,
    corpus.entities,
    corpus.edges,
    corpus.signature,
  );
  const limit = input.limit ?? DECISION_CARD_LIMIT;
  const offset = input.offset ?? 0;
  const scores =
    input.meaning && vectorEntities.length > 0
      ? await input.meaning(input.query, vectorEntities)
      : undefined;
  const meaningScores = scores
    ? credited.map((ids) => creditedScore(ids.map((id) => scores.get(id) ?? 0)))
    : undefined;
  // The ranking is fused with each decision's own similarity; scores below
  // MIN_MEANING_SCORE are dropped so unrelated queries never manufacture
  // meaning-only cards.
  const vectorScores = scores
    ? index.cards.map((card) => {
        const raw = scores.get(card.id) ?? 0;
        return raw >= MIN_MEANING_SCORE ? raw : 0;
      })
    : undefined;
  const retrieval = retrieve(index, {
    text: input.query,
    ...(input.paths && input.paths.length > 0 ? { paths: input.paths } : {}),
    limit: offset + limit,
    ...(vectorScores ? { vectorScores, vectorWeight: MEANING_WEIGHT } : {}),
    ...(input.types ? { types: input.types } : {}),
  });
  const cards = retrieval.cards.slice(offset, offset + limit);
  const shown = new Set(
    retrieval.cards.flatMap((card) => [card.id, ...card.folded]),
  );
  const types = new Set(input.types ?? ["req", "adr"]);
  const meaning: MeaningItem[] = meaningScores
    ? index.cards
        .map((card, at) => ({ card, score: meaningScores[at] ?? 0 }))
        .filter(
          ({ card, score }) =>
            score >= MIN_MEANING_SCORE &&
            types.has(card.type) &&
            card.scope !== "other" &&
            card.supersededBy === undefined &&
            !shown.has(card.id),
        )
        .sort((a, b) => b.score - a.score || (a.card.id < b.card.id ? -1 : 1))
        .slice(0, MEANING_LIST_LIMIT)
        .map(({ card, score }) => ({
          id: card.id,
          title: card.title,
          score: Math.round(score * 1000) / 1000,
        }))
    : [];
  const byId = new Map(index.cards.map((card) => [card.id, card]));
  const supersededBy: Record<string, string> = {};
  for (const card of index.cards) {
    if (card.supersededBy !== undefined)
      supersededBy[card.id] = card.supersededBy;
  }
  const sources: Record<string, string> = {};
  for (const entity of corpus.entities) {
    if (typeof entity.source === "string" && entity.source !== "")
      sources[entity.id] = entity.source;
  }
  const seeds: AnswerSeed[] = [];
  const governingCards: DecisionCard[] = [];
  retrieval.cards.forEach((card, rank) => {
    const score = 1 / (rank + 1);
    if (card.coverage < WEAK_COVERAGE) return;
    if (
      card.type === "req" &&
      !NON_CURRENT_STATUS.has(card.status) &&
      supersededBy[card.id] === undefined
    )
      governingCards.push(card);
    seeds.push({
      id: card.id,
      type: card.type,
      title: card.title,
      status: card.status,
      score,
      reasons: card.evidence,
    });
    for (const id of card.folded) {
      const folded = byId.get(id);
      if (folded)
        seeds.push({
          id,
          type: folded.type,
          title: folded.title,
          status: folded.status,
          score: score * FOLDED_SEED_SHARE,
          foldedInto: card.id,
          reasons: [`folded into ${card.id}`],
        });
    }
  });
  const [topGov, secondGov] = governingCards;
  const ambiguous =
    topGov !== undefined &&
    secondGov !== undefined &&
    topGov.coverage - secondGov.coverage < CLEAR_COVERAGE_MARGIN &&
    topGov.score > 0 &&
    secondGov.score / topGov.score >= CLOSE_SCORE_RATIO;
  return {
    cards,
    retrieval,
    meaning,
    fused: vectorScores !== undefined,
    seeds: offset === 0 ? seeds : [],
    weak: seeds.length === 0,
    ambiguous,
    supersededBy,
    sources,
    decisionCount: index.cards.length,
  };
}
