/**
 * kibi.vocabulary-alignment.v1 — modeling-time vocabulary convergence advice.
 *
 * Two operations help equivalent prose land on the same logical terms:
 *
 * - `rankSubjects` chooses, for each clause, the best existing subject key from
 *   host-ranked candidates, or `new_subject` when none fits.
 * - `compareClaims` judges whether two claim texts that share a subject (or a
 *   predicate name) but have different signatures state the same obligation.
 *
 * Results are advice for the modeling plan and for human/agent review. They
 * never decide check outcomes: `kb_check` stays deterministic and offline, and
 * Prolog checks remain the only pass/fail authority.
 */

/** Choice value meaning "none of the candidates; declare a new subject". */
export const NEW_SUBJECT_CHOICE = "new_subject" as const;

export interface SubjectCandidate {
  readonly subjectKey: string;
  /** Deterministic builtin score in [0, 1]; higher is a better match. */
  readonly score: number;
  readonly title?: string;
  /** Titles of current requirements that already constrain this subject. */
  readonly requirementTitles?: readonly string[];
}

export interface SubjectRankingClause {
  readonly claimKey: string;
  readonly text: string;
  /** Subject key the host would use if no existing subject is chosen. */
  readonly proposedSubjectKey?: string;
  /** Builtin-ranked candidates, best first. */
  readonly candidates: readonly SubjectCandidate[];
}

export interface RankSubjectsInput {
  readonly clauses: readonly SubjectRankingClause[];
}

export interface SubjectRankingDecision {
  readonly claimKey: string;
  /** One of the clause candidates' subjectKey values, or `new_subject`. */
  readonly choice: string;
  readonly confidence: number;
}

export interface RankSubjectsResult {
  readonly decisions: readonly SubjectRankingDecision[];
}

export interface ComparedClaim {
  readonly claimText: string;
  /** Canonical logical signature text, when the claim is already grounded. */
  readonly signature?: string;
  readonly factId?: string;
}

export interface ClaimComparisonPair {
  readonly pairKey: string;
  /** Shared subject key or predicate name that made the pair comparable. */
  readonly sharedKey: string;
  readonly left: ComparedClaim;
  readonly right: ComparedClaim;
}

export interface CompareClaimsInput {
  readonly pairs: readonly ClaimComparisonPair[];
}

export interface ClaimComparisonJudgment {
  readonly pairKey: string;
  /** Candidate verdict only: true means "review as a possible duplicate". */
  readonly sameObligation: boolean;
  readonly confidence: number;
}

export interface CompareClaimsResult {
  readonly judgments: readonly ClaimComparisonJudgment[];
}

export interface VocabularyAlignmentV1 {
  readonly id: string;
  /** Optional provider model id copied onto provenance stamps. */
  readonly model?: string;
  rankSubjects(
    input: RankSubjectsInput,
  ): RankSubjectsResult | Promise<RankSubjectsResult>;
  compareClaims(
    input: CompareClaimsInput,
  ): CompareClaimsResult | Promise<CompareClaimsResult>;
}
