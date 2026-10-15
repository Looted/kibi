import { intentTokens } from "../../intent-search.js";
import {
  escapeAtomContent,
  parseListOfLists,
  parsePrologValue,
} from "../../prolog/codec.js";
import { loadEntityRows } from "../../public/operations/discovery-entities.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";

/**
 * Relationships that give a requirement a logical representation the
 * contradiction checker can compare. A requirement with none of them is prose
 * only: no witness can ever name it.
 */
const LOGICAL_RELATIONSHIPS = [
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
] as const;

/**
 * Relevance floor for a related requirement, below the kb_search default
 * (0.18): a missed contradiction costs more than one extra comparison, and a
 * requirement sharing half the intent's terms in other words ("label length
 * is limited" against "label length must be at most 200") scores about 0.13.
 * The candidate cap bounds the noise.
 */
// implements REQ-kibi-contradiction-review-candidates
export const REVIEW_CANDIDATE_MIN_SCORE = 0.1;

/** At most this many related requirements are put up for review. */
// implements REQ-kibi-contradiction-review-candidates
export const MAX_REVIEW_CANDIDATES = 5;

/** The longest requirement statement a review candidate quotes. */
const MAX_STATEMENT_LENGTH = 600;

// implements REQ-kibi-contradiction-review-candidates
export type ConflictReviewVerdict = "conflict" | "no_conflict";

/** The agent's judgement of one review candidate, sent back on recompile. */
// implements REQ-kibi-contradiction-review-candidates
export type ConflictReviewDecision = Readonly<{
  requirementId: string;
  verdict: ConflictReviewVerdict;
  note?: string;
}>;

/**
 * A current requirement the contradiction checker could not compare with the
 * intent, which the agent must compare itself.
 */
// implements REQ-kibi-contradiction-review-candidates
export type ConflictReviewCandidate = Readonly<{
  requirementId: string;
  title: string;
  /** The sentence of the requirement that shares the most terms with the intent. */
  sentence: string;
  /** The requirement's checked statement (semantic text, else title), bounded. */
  statement: string;
  /** Discovery score; 0 for a requirement only the agent's review named. */
  score: number;
  /** Whether the requirement has a logical representation of its own. */
  modeled: boolean;
  review: "pending" | ConflictReviewVerdict;
  note?: string;
}>;

/** Why the contradiction check could not decide, with the ids involved. */
// implements REQ-kibi-contradiction-review-candidates
export type UncheckedReason = Readonly<{
  reason: "unmodeled_target" | "unmodeled_related" | "analysis_unavailable";
  /** Claim keys for unmodeled_target, requirement ids for unmodeled_related. */
  ids: readonly string[];
}>;

/** One current requirement as review reads it. */
// implements REQ-kibi-contradiction-review-candidates
export type ReviewRequirement = Readonly<{
  id: string;
  title: string;
  semanticText: string;
  modeled: boolean;
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The current requirements among `ids`, each with whether it has a logical
 * representation. Ids that are not current requirements (superseded,
 * deprecated or unknown) are left out.
 */
// implements REQ-kibi-contradiction-review-candidates
export async function loadReviewRequirements(
  prolog: Pick<PrologPort, "query">,
  ids: readonly string[],
): Promise<Map<string, ReviewRequirement>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const found = new Map<string, ReviewRequirement>();
  if (unique.length === 0) return found;
  const idList = unique.map((id) => `'${escapeAtomContent(id)}'`).join(",");
  const result = await prolog.query(
    `findall([R,M], (member(R, [${idList}]), kb:current_req(R), (once((member(T, [${LOGICAL_RELATIONSHIPS.join(",")}]), kb_relationship(T, R, _))) -> M = modeled ; M = unmodeled)), Rows)`,
  );
  if (!result.success) return found;
  const modeled = new Map(
    parseListOfLists(result.bindings.Rows ?? "[]").map(([id, flag]) => [
      atom(id),
      atom(flag) === "modeled",
    ]),
  );
  const rows = await loadEntityRows(
    prolog,
    [...modeled.keys()],
    ["id", "title", "semantic_text"],
  );
  for (const row of rows) {
    const id = text(row.id);
    if (!modeled.has(id)) continue;
    found.set(id, {
      id,
      title: text(row.title),
      semanticText: text(row.semantic_text),
      modeled: modeled.get(id) === true,
    });
  }
  return found;
}

function atom(value: string | undefined): string {
  return String(parsePrologValue(value ?? "")).replace(/^['"]|['"]$/g, "");
}

function sentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/**
 * The sentence of a requirement most likely to bear on the intent: the one
 * sharing the most intent terms, the first on a tie, the title when the
 * requirement has no prose.
 */
// implements REQ-kibi-contradiction-review-candidates
export function reviewSentence(
  intent: string,
  requirement: Pick<ReviewRequirement, "title" | "semanticText">,
): string {
  const units = sentences(requirement.semanticText);
  if (units.length === 0) return requirement.title;
  const wanted = new Set(intentTokens(intent));
  let best = units[0] ?? requirement.title;
  let bestShared = -1;
  for (const unit of units) {
    const shared = intentTokens(unit).filter((token) =>
      wanted.has(token),
    ).length;
    if (shared > bestShared) {
      best = unit;
      bestShared = shared;
    }
  }
  return best;
}

function bounded(value: string): string {
  return value.length > MAX_STATEMENT_LENGTH
    ? `${value.slice(0, MAX_STATEMENT_LENGTH - 1).trimEnd()}…`
    : value;
}

// implements REQ-kibi-contradiction-review-candidates
export function reviewCandidate(
  intent: string,
  requirement: ReviewRequirement,
  score: number,
  decision: ConflictReviewDecision | undefined,
): ConflictReviewCandidate {
  return {
    requirementId: requirement.id,
    title: requirement.title,
    sentence: reviewSentence(intent, requirement),
    statement: bounded(requirement.semanticText || requirement.title),
    score: Math.round(score * 1000) / 1000,
    modeled: requirement.modeled,
    review: decision?.verdict ?? "pending",
    ...(decision?.note ? { note: decision.note } : {}),
  };
}

/**
 * What the agent does next while the contradiction outcome is not decided:
 * resolve a conflict it found, compare the candidates still pending, or model
 * the claims Kibi could not check.
 */
// implements REQ-kibi-contradiction-review-candidates
export function reviewNextAction(
  candidates: readonly ConflictReviewCandidate[],
  unmodeledClaims: readonly string[],
): string | undefined {
  const ids = (review: ConflictReviewCandidate["review"]) =>
    candidates
      .filter((candidate) => candidate.review === review)
      .map((candidate) => candidate.requirementId);
  const conflicts = ids("conflict");
  if (conflicts.length > 0)
    return `You judged that the intent contradicts ${conflicts.join(", ")}. Ask the human which rule holds, then supersede or change the conflicting requirement, or change the intent, and compile again. Record a conflict the human has not decided yet as a review:conflict observation fact.`;
  const pending = ids("pending");
  if (pending.length > 0)
    return `Kibi could not compare this intent with ${pending.join(", ")} logically. Read each reviewCandidates entry (its statement and sentence) and decide whether the intent contradicts it, then call kb_compile_intent again with the same arguments plus conflictReviews: [{requirementId, verdict: "conflict" | "no_conflict", note}] for each.`;
  if (unmodeledClaims.length > 0)
    return `Kibi could not check claim ${unmodeledClaims.join(", ")} for contradictions because it has no logical model: model it with kb_model (mode requirement or predicates) and compile again. Until then no conflict is confirmed, only reviewed.`;
  return undefined;
}
