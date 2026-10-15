import { rankIntentEntities } from "../../intent-search.js";
import {
  MAX_REVIEW_CANDIDATES,
  REVIEW_CANDIDATE_MIN_SCORE,
} from "../planning/conflict-review.js";
import type { ExistingRequirement } from "./claim-restatement.js";
import type { Candidate } from "./types.js";

/**
 * A planned intent claim is checked for contradictions only against current
 * requirements that have a logical representation. For each planned claim,
 * name the current requirements on the same topic that have none, so the
 * reviewer compares them before approval instead of reading the plan as
 * consistent: the diagnostic names both, and the candidate's evidence gains
 * `review_against:<id>` for each. Ranking is the intent search kb_search uses,
 * over the unmodeled requirements only.
 */
// implements REQ-kibi-contradiction-review-candidates
export async function withConflictReviewSignals(
  candidates: readonly Candidate[],
  requirements: readonly ExistingRequirement[],
  workspaceRoot: string,
): Promise<{ candidates: Candidate[]; diagnostics: string[] }> {
  const unmodeled = requirements
    .filter((requirement) => requirement.modeled === false)
    .map((requirement) => ({
      id: requirement.id,
      type: "req",
      title: requirement.title,
      semantic_text: requirement.semanticText,
    }));
  if (unmodeled.length === 0)
    return { candidates: [...candidates], diagnostics: [] };
  const titles = new Map(
    requirements.map((requirement) => [requirement.id, requirement.title]),
  );
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
    const ranked = await rankIntentEntities(
      unmodeled,
      {
        query: candidate.title,
        type: "req",
        minScore: REVIEW_CANDIDATE_MIN_SCORE,
      },
      workspaceRoot,
    );
    const related = ranked.matches
      .slice(0, MAX_REVIEW_CANDIDATES)
      .map((match) => String(match.entity.id ?? ""))
      .filter(Boolean);
    if (related.length === 0) {
      reviewed.push(candidate);
      continue;
    }
    const citation =
      candidate.evidence
        .find((entry) => entry.startsWith("intent_claim:"))
        ?.slice("intent_claim:".length) ?? candidate.sourcePath;
    diagnostics.push(
      `conflict-review: Intent claim at ${citation} ("${candidate.title}") was not checked for contradictions against current requirement ${related.map((id) => `${id} ("${titles.get(id) ?? ""}")`).join(", ")}, which has no logical representation. Compare them before approval: on a contradiction show both to the human, then drop the claim or keep it and supersede the requirement after apply; record a conflict the human has not decided as a review:conflict observation fact.`,
    );
    reviewed.push({
      ...candidate,
      evidence: [
        ...candidate.evidence,
        ...related.map((id) => `review_against:${id}`),
      ],
    });
  }
  return { candidates: reviewed, diagnostics };
}
