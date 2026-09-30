/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
  type ClaimComparisonJudgment,
  type CompareClaimsInput,
  type CompareClaimsResult,
  NEW_SUBJECT_CHOICE,
  type RankSubjectsInput,
  type RankSubjectsResult,
  type SubjectCandidate,
  type SubjectRankingDecision,
  type VocabularyAlignmentV1,
} from "kibi-plugin-sdk";
import { singularize } from "../ontology/normalize.js";

/** Minimum builtin score for reusing an existing subject instead of a new one. */
// implements REQ-kibi-vocabulary-alignment-capability
export const BUILTIN_SUBJECT_REUSE_THRESHOLD = 0.4;

/** Conservative token-similarity bar for flagging a possible duplicate claim. */
// implements REQ-kibi-vocabulary-alignment-capability
export const BUILTIN_CLAIM_SIMILARITY_THRESHOLD = 0.75;

/** One existing subject fact as read from the KB. */
// implements REQ-kibi-vocabulary-alignment-capability
export type SubjectVocabularyEntry = Readonly<{
  subjectKey: string;
  title?: string;
  factId?: string;
  requirements?: readonly Readonly<{ id: string; title?: string }>[];
}>;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "may",
  "must",
  "of",
  "on",
  "or",
  "shall",
  "should",
  "so",
  "than",
  "that",
  "the",
  "their",
  "then",
  "this",
  "to",
  "was",
  "when",
  "which",
  "while",
  "will",
  "with",
]);

const NEGATIONS = new Set(["not", "never", "no", "without", "forbid"]);

/**
 * Deterministic content tokens: lowercase alphanumeric words, stopwords
 * removed, simple plural folding. Dots and underscores split subject keys.
 */
// implements REQ-kibi-vocabulary-alignment-capability
export function vocabularyTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token))
    .map((token) => singularize(token));
}

function tokenSet(text: string): Set<string> {
  return new Set(vocabularyTokens(text));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

type WeightFn = (token: string) => number;

/** Weight of clause tokens the subject does not explain (Tversky beta). */
const UNEXPLAINED_CLAUSE_WEIGHT = 0.2;

/**
 * IDF-weighted Tversky index between the clause and one target token set.
 * Target tokens the clause misses count fully; clause tokens the target does
 * not explain count lightly, because a subject names a component rather than
 * the whole clause. A specific subject that matches more of the clause
 * therefore beats a short generic one that happens to be fully covered.
 */
function weightedMatch(
  clause: ReadonlySet<string>,
  target: ReadonlySet<string>,
  weight: WeightFn,
): number {
  let matched = 0;
  let missedTarget = 0;
  for (const token of target) {
    const w = weight(token);
    if (clause.has(token)) matched += w;
    else missedTarget += w;
  }
  if (matched === 0) return 0;
  let unexplainedClause = 0;
  for (const token of clause) {
    if (!target.has(token)) unexplainedClause += weight(token);
  }
  return (
    matched /
    (matched + missedTarget + UNEXPLAINED_CLAUSE_WEIGHT * unexplainedClause)
  );
}

/**
 * Rank existing subjects for one clause. Score = 0.5 * subject-key match +
 * 0.3 * subject-title match + 0.2 * best constraining-requirement-title match,
 * where a match is the IDF-weighted Tversky index over the vocabulary (tokens shared
 * by every subject, such as a product name, weigh little).
 * Ties break by subject key, so the ranking is fully deterministic.
 */
// implements REQ-kibi-vocabulary-alignment-capability
export function rankSubjectCandidates(
  clauseText: string,
  vocabulary: readonly SubjectVocabularyEntry[],
  options: Readonly<{ limit?: number }> = {},
): SubjectCandidate[] {
  const clause = tokenSet(clauseText);
  if (clause.size === 0 || vocabulary.length === 0) return [];
  const documents = vocabulary.map((entry) => ({
    entry,
    key: tokenSet(entry.subjectKey),
    title: tokenSet(entry.title ?? ""),
    requirements: (entry.requirements ?? []).map((requirement) =>
      tokenSet(requirement.title ?? ""),
    ),
  }));
  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    const tokens = new Set([
      ...document.key,
      ...document.title,
      ...document.requirements.flatMap((set) => [...set]),
    ]);
    for (const token of tokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const weight: WeightFn = (token) =>
    Math.log(1 + documents.length / (documentFrequency.get(token) ?? 1));

  const candidates = documents.map((document): SubjectCandidate => {
    const keyScore = weightedMatch(clause, document.key, weight);
    const titleScore = weightedMatch(clause, document.title, weight);
    const requirementScore = Math.max(
      0,
      ...document.requirements.map((set) => weightedMatch(clause, set, weight)),
    );
    const requirementTitles = (document.entry.requirements ?? [])
      .map((requirement) => requirement.title)
      .filter((title): title is string => typeof title === "string");
    return {
      subjectKey: document.entry.subjectKey,
      score: round3(0.5 * keyScore + 0.3 * titleScore + 0.2 * requirementScore),
      ...(document.entry.title !== undefined
        ? { title: document.entry.title }
        : {}),
      ...(requirementTitles.length > 0 ? { requirementTitles } : {}),
    };
  });
  return candidates
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.subjectKey.localeCompare(right.subjectKey),
    )
    .slice(0, options.limit ?? 5);
}

/**
 * Quantities as written: number plus the unit symbol that follows it, with the
 * unit's case preserved (3 MB and 3 Mb are different quantities).
 */
function quantities(text: string): string[] {
  return [...text.matchAll(/(\d+(?:\.\d+)?)\s*([A-Za-z%]+)?/g)]
    .map((match) => `${Number(match[1])}|${match[2] ?? ""}`)
    .sort();
}

/**
 * Dice similarity over content tokens. Claims whose negation differs are never
 * similar ("must expire" vs "must not expire"), and neither are claims whose
 * quantities differ ("15 minutes" vs "60 minutes"): token overlap cannot tell
 * which of two different bounds is meant, so the builtin stays conservative and
 * leaves unit-converted paraphrases to Prolog canonicalization or a provider.
 */
// implements REQ-kibi-vocabulary-alignment-capability
export function claimSimilarity(left: string, right: string): number {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (a.size === 0 || b.size === 0) return 0;
  if (quantities(left).join(" ") !== quantities(right).join(" ")) return 0;
  const negatedA = [...a].some((token) => NEGATIONS.has(token));
  const negatedB = [...b].some((token) => NEGATIONS.has(token));
  if (negatedA !== negatedB) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return round3((2 * shared) / (a.size + b.size));
}

function normalizedKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\\/]+/g, ".")
    .replace(/[^a-z0-9.]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/\.+/g, ".")
    .replace(/(^[._]+|[._]+$)/g, "");
}

// implements REQ-kibi-vocabulary-alignment-capability
export function builtinSubjectDecision(
  clause: RankSubjectsInput["clauses"][number],
): SubjectRankingDecision {
  const proposed =
    clause.proposedSubjectKey !== undefined
      ? normalizedKey(clause.proposedSubjectKey)
      : undefined;
  const exact = clause.candidates.find(
    (candidate) => candidate.subjectKey === proposed,
  );
  if (exact) {
    return {
      claimKey: clause.claimKey,
      choice: exact.subjectKey,
      confidence: 1,
    };
  }
  const best = clause.candidates[0];
  if (best && best.score >= BUILTIN_SUBJECT_REUSE_THRESHOLD) {
    return {
      claimKey: clause.claimKey,
      choice: best.subjectKey,
      confidence: best.score,
    };
  }
  return {
    claimKey: clause.claimKey,
    choice: NEW_SUBJECT_CHOICE,
    confidence: round3(1 - (best?.score ?? 0)),
  };
}

/** Deterministic, offline vocabulary-alignment provider. */
// implements REQ-kibi-vocabulary-alignment-capability
export class BuiltinVocabularyAlignment implements VocabularyAlignmentV1 {
  readonly id = "kibi-plugin-builtin.vocabulary-alignment";

  rankSubjects(input: RankSubjectsInput): RankSubjectsResult {
    return { decisions: input.clauses.map(builtinSubjectDecision) };
  }

  compareClaims(input: CompareClaimsInput): CompareClaimsResult {
    const judgments: ClaimComparisonJudgment[] = input.pairs.map((pair) => {
      const similarity = claimSimilarity(
        pair.left.claimText,
        pair.right.claimText,
      );
      return {
        pairKey: pair.pairKey,
        sameObligation: similarity >= BUILTIN_CLAIM_SIMILARITY_THRESHOLD,
        confidence: similarity,
      };
    });
    return { judgments };
  }
}

// implements REQ-kibi-vocabulary-alignment-capability
export function createBuiltinVocabularyAlignment(): BuiltinVocabularyAlignment {
  return new BuiltinVocabularyAlignment();
}
