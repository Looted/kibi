import {
  RESTATEMENT_JACCARD,
  tokenSetJaccard,
} from "../../entity-body-context.js";

/** A current requirement a declared intent claim may restate. */
// implements REQ-bootstrap-claim-restatement
export type ExistingRequirement = {
  readonly id: string;
  readonly title: string;
  readonly semanticText: string;
  /** Whether it has a logical representation; unknown when not loaded. */
  readonly modeled?: boolean;
};

/**
 * Token-set Jaccard at or above which a claim that is not an exact
 * restatement is still flagged for review: the same threshold the
 * entity-context check uses to call a context section a restatement of the
 * title. Below it a claim is planned with no signal.
 */
// implements REQ-bootstrap-claim-restatement
export const NEAR_RESTATEMENT_JACCARD = RESTATEMENT_JACCARD;

// implements REQ-bootstrap-claim-restatement
export type RestatementMatch = {
  /** exact: the normalized texts are equal; near: overlap at the threshold. */
  readonly kind: "exact" | "near";
  readonly requirementId: string;
  /** The requirement field the claim matched. */
  readonly field: "title" | "semantic_text";
  /** Token-set Jaccard of the closest pair, rounded to two decimals. */
  readonly score: number;
};

/**
 * Case, whitespace and punctuation do not change what a sentence says, so
 * they do not count when a claim is compared with a requirement.
 */
// implements REQ-bootstrap-claim-restatement
export function normalizeRestatementText(text: string): string {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]/u)
    .filter((token) => token !== "")
    .join(" ");
}

/**
 * The whole prose and each of its sentences. Whitespace and empty pieces
 * never change a normalized comparison or a token-set score, so the pieces
 * are not trimmed or filtered.
 */
function proseUnits(text: string): readonly string[] {
  return [text, ...text.split(/(?<=[.!?])\s|\n/)];
}

function references(requirement: ExistingRequirement): readonly {
  readonly field: RestatementMatch["field"];
  readonly text: string;
}[] {
  return [
    { field: "title" as const, text: requirement.title },
    ...proseUnits(requirement.semanticText).map((text) => ({
      field: "semantic_text" as const,
      text,
    })),
  ];
}

/**
 * The current requirement a claim restates, if any. A claim restates a
 * requirement exactly when its statement or excerpt, normalized, equals the
 * requirement's title, its semantic text or one sentence of it; only that
 * counts as already in the KB. A pair at or above NEAR_RESTATEMENT_JACCARD is
 * a near restatement: a review signal, never a reason to drop the claim.
 * Requirements are compared in id order, so the answer is deterministic.
 */
// implements REQ-bootstrap-claim-restatement
export function findRestatement(
  claimTexts: readonly (string | undefined)[],
  requirements: readonly ExistingRequirement[],
): RestatementMatch | null {
  const texts = claimTexts
    .filter((text): text is string => typeof text === "string")
    .map((text) => ({ text, normalized: normalizeRestatementText(text) }))
    // An empty claim would equal an empty reference.
    .filter((text) => text.normalized !== "");
  // A stable sort only asks whether a pair is out of order, so equal ids
  // keep their input order without a separate 0 result.
  const ordered = [...requirements].sort((left, right) =>
    left.id < right.id ? -1 : 1,
  );
  let near: RestatementMatch | null = null;
  let nearScore = 0;
  for (const requirement of ordered) {
    for (const reference of references(requirement)) {
      const normalized = normalizeRestatementText(reference.text);
      for (const claim of texts) {
        if (claim.normalized === normalized)
          return {
            kind: "exact",
            requirementId: requirement.id,
            field: reference.field,
            score: 1,
          };
        const score = tokenSetJaccard(claim.text, reference.text);
        if (score >= NEAR_RESTATEMENT_JACCARD && score > nearScore) {
          nearScore = score;
          near = {
            kind: "near",
            requirementId: requirement.id,
            field: reference.field,
            score: Math.round(score * 100) / 100,
          };
        }
      }
    }
  }
  return near;
}
