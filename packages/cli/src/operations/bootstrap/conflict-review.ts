import { rankIntentEntities } from "../../intent-search.js";
import {
  MAX_REVIEW_CANDIDATES,
  REVIEW_CANDIDATE_MIN_SCORE,
} from "../planning/conflict-review.js";
import type { ExistingRequirement } from "./claim-restatement.js";
import type { Candidate, SourceOnlySignal } from "./types.js";

/** Evidence a claim gains for each requirement it must be compared with. */
const REVIEW_AGAINST = "review_against:";

/** Whether a candidate or signal names requirements to compare it with. */
// implements REQ-kibi-contradiction-review-candidates, REQ-bootstrap-authoring-claim-review
export function needsConflictReview(row: {
  readonly evidence: readonly string[];
}): boolean {
  return row.evidence.some((entry) => entry.startsWith(REVIEW_AGAINST));
}

function claimCitation(evidence: readonly string[], fallback: string): string {
  return (
    evidence
      .find((entry) => entry.startsWith("intent_claim:"))
      ?.slice("intent_claim:".length) ?? fallback
  );
}

/**
 * Intent claims are checked for contradictions only against current
 * requirements that have a logical representation. For each claim, name the
 * current requirements on the same topic that have none, so the reviewer
 * compares them instead of reading the plan as consistent: the diagnostic
 * names both, and the claim's evidence gains `review_against:<id>` for each.
 * A planned claim is compared before approval; a claim left for authoring
 * (a source-only signal) is compared when it is compiled with
 * kb_compile_intent, which takes the verdicts through conflictReviews.
 * Ranking is the intent search kb_search uses, over the unmodeled
 * requirements only.
 */
// implements REQ-kibi-contradiction-review-candidates, REQ-bootstrap-authoring-claim-review
export async function withConflictReviewSignals(
  candidates: readonly Candidate[],
  requirements: readonly ExistingRequirement[],
  workspaceRoot: string,
  signals: readonly SourceOnlySignal[] = [],
): Promise<{
  candidates: Candidate[];
  signals: SourceOnlySignal[];
  diagnostics: string[];
}> {
  const unmodeled = requirements
    .filter((requirement) => requirement.modeled === false)
    .map((requirement) => ({
      id: requirement.id,
      type: "req",
      title: requirement.title,
      semantic_text: requirement.semanticText,
    }));
  if (unmodeled.length === 0)
    return {
      candidates: [...candidates],
      signals: [...signals],
      diagnostics: [],
    };
  const titles = new Map(
    requirements.map((requirement) => [requirement.id, requirement.title]),
  );
  const related = async (query: string): Promise<string[]> => {
    const ranked = await rankIntentEntities(
      unmodeled,
      { query, type: "req", minScore: REVIEW_CANDIDATE_MIN_SCORE },
      workspaceRoot,
    );
    return ranked.matches
      .slice(0, MAX_REVIEW_CANDIDATES)
      .map((match) => String(match.entity.id ?? ""))
      .filter(Boolean);
  };
  const named = (ids: readonly string[]) =>
    ids.map((id) => `${id} ("${titles.get(id) ?? ""}")`).join(", ");
  const diagnostics: string[] = [];
  const reviewed: Candidate[] = [];
  for (const candidate of candidates) {
    if (
      candidate.sourceKind !== "intent_claim" ||
      candidate.entityType !== "req"
    ) {
      reviewed.push(candidate);
      continue;
    }
    const ids = await related(candidate.title);
    if (ids.length === 0) {
      reviewed.push(candidate);
      continue;
    }
    diagnostics.push(
      `conflict-review: Intent claim at ${claimCitation(candidate.evidence, candidate.sourcePath)} ("${candidate.title}") was not checked for contradictions against current requirement ${named(ids)}, which has no logical representation. Compare them before approval: on a contradiction show both to the human, then drop the claim or keep it and supersede the requirement after apply; record a conflict the human has not decided as a review:conflict observation fact.`,
    );
    reviewed.push({
      ...candidate,
      evidence: [
        ...candidate.evidence,
        ...ids.map((id) => REVIEW_AGAINST + id),
      ],
    });
  }
  const reviewedSignals: SourceOnlySignal[] = [];
  for (const signal of signals) {
    if (signal.kind !== "req" || signal.claimStatement === undefined) {
      reviewedSignals.push(signal);
      continue;
    }
    const ids = await related(signal.claimStatement);
    if (ids.length === 0) {
      reviewedSignals.push(signal);
      continue;
    }
    diagnostics.push(
      `conflict-review: Intent claim at ${claimCitation(signal.evidence, signal.sourcePath)} ("${signal.claimStatement}") needs authoring and was not checked for contradictions against current requirement ${named(ids)}, which has no logical representation. When you compile the claim with kb_compile_intent, compare it with them and report each verdict through conflictReviews; on a contradiction show both to the human before writing.`,
    );
    reviewedSignals.push({
      ...signal,
      evidence: [...signal.evidence, ...ids.map((id) => REVIEW_AGAINST + id)],
    });
  }
  return { candidates: reviewed, signals: reviewedSignals, diagnostics };
}
