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
  CLAIM_SUBJECT_ANCHOR_REVIEW_CODE,
  CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE,
  SUBJECT_DEFINITION_REVIEW_CODE,
  SUBJECT_DUPLICATE_REVIEW_CODE,
  SUBJECT_HIERARCHY_REVIEW_CODE,
} from "./domain-subjects.js";
import { domainSubjectActions } from "./schema6.js";

/**
 * What a schema upgrade leaves for a person: the review work of the domain
 * subject layer, and the blocking kibi check findings once the store holds the
 * migrated sources. Kibi writes none of it on its own.
 */

/** Domain subject review work planned from the authored sources. */
export type DomainSubjectReview = Readonly<{
  /** Claims with one clear, defined subject a person approves by id. */
  anchorSuggestions: number;
  /** Claims a person anchors by hand: no match, a tie or a weak match. */
  anchorReviews: number;
  /** Subject facts whose body is not a definition. */
  definitions: number;
  /** Pairs of subject facts that read as one. */
  duplicates: number;
  /** Subjects that name themselves or loop through part_of or kind_of. */
  hierarchy: number;
}>;

/** Count the domain subject review actions `kibi migrate` lists. Read-only. */
export function planDomainSubjectReview(
  workspaceRoot: string,
  filledBySchemaUpgrade: ReadonlySet<string> = new Set(),
): DomainSubjectReview {
  const counts = new Map<string, number>();
  for (const action of domainSubjectActions(
    workspaceRoot,
    filledBySchemaUpgrade,
  ))
    counts.set(action.code, (counts.get(action.code) ?? 0) + 1);
  return {
    anchorSuggestions: counts.get(CLAIM_SUBJECT_ANCHOR_SUGGEST_CODE) ?? 0,
    anchorReviews: counts.get(CLAIM_SUBJECT_ANCHOR_REVIEW_CODE) ?? 0,
    definitions: counts.get(SUBJECT_DEFINITION_REVIEW_CODE) ?? 0,
    duplicates: counts.get(SUBJECT_DUPLICATE_REVIEW_CODE) ?? 0,
    hierarchy: counts.get(SUBJECT_HIERARCHY_REVIEW_CODE) ?? 0,
  };
}

/** Whether any domain subject review work remains. */
export function hasDomainSubjectReview(review: DomainSubjectReview): boolean {
  return (
    review.anchorSuggestions +
      review.anchorReviews +
      review.definitions +
      review.duplicates +
      review.hierarchy >
    0
  );
}

/**
 * The upgrade note for the domain subject review, or null when there is
 * none. It names the counts and the action codes `kibi migrate` lists them
 * under, so every claim-subject-missing, subject-definition-missing and
 * subject-duplicate finding kibi check reports afterwards is accounted for.
 */
export function domainSubjectReviewNote(
  review: DomainSubjectReview,
  dryRun: boolean,
): string | null {
  if (!hasDomainSubjectReview(review)) return null;
  const parts: string[] = [];
  const claims = review.anchorSuggestions + review.anchorReviews;
  if (claims > 0)
    parts.push(
      `${claims} unmodeled claim(s) name no subject (claim-subject-missing): ${review.anchorSuggestions} with a suggested subject a person approves by id (claim_subject_anchor_suggest), ${review.anchorReviews} for a person to anchor by hand (claim_subject_anchor_review)`,
    );
  if (review.definitions > 0)
    parts.push(
      `${review.definitions} subject fact(s) need a definition as their body (subject-definition-missing; subject_definition_review)`,
    );
  if (review.duplicates > 0)
    parts.push(
      `${review.duplicates} pair(s) of subject facts read as one subject (subject-duplicate; subject_duplicate_review)`,
    );
  if (review.hierarchy > 0)
    parts.push(
      `${review.hierarchy} subject hierarchy problem(s): a subject names itself, or subjects sit under each other through part_of, kind_of or dotted keys (subject-hierarchy-invalid; subject_hierarchy_review)`,
    );
  return `${dryRun ? "dry run: " : ""}Schema 16 review: ${parts.join("; ")}. Kibi writes none of these on its own; 'kibi migrate' lists each action, and kibi check blocks them until they are fixed.`;
}

/**
 * Compile the branch store from the migrated sources, as the plan's
 * migration-sync action does, so the next kibi check reads them.
 */
export async function syncMigratedStore(
  workspaceRoot: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const { syncCommand } = await import("../../commands/sync.js");
    const result = await syncCommand({ workspaceRoot, quiet: true });
    if (result.success) return { ok: true };
    return {
      ok: false,
      reason:
        result.failures.map((failure) => failure.message).join("; ") ||
        "kibi sync reported a failure",
    };
  } catch (error) {
    return { ok: false, reason: (error as Error).message.split("\n")[0] ?? "" };
  }
}

/**
 * Blocking findings of a plain `kibi check` on the synced store, counted by
 * rule, or null when the check cannot run. The whole check runs, not only the
 * rules schemas 15-18 added: the closing line states the count `kibi check`
 * reports, including agent-requirement-unapproved-implemented and any other
 * rule that blocks after the upgrade.
 */
export async function readUpgradeReviewFindings(
  workspaceRoot: string,
): Promise<Map<string, number> | null> {
  try {
    const [{ createCliRuntime }, { executeOperation }, { checkSpec }] =
      await Promise.all([
        import("../../runtime/cli-runtime.js"),
        import("../../public/operations/runtime-types.js"),
        import("../../public/operations/specs/check.js"),
      ]);
    const result = await executeOperation(
      createCliRuntime({ workspaceRoot }),
      checkSpec,
      {},
    );
    const violations = result.structuredContent?.violations;
    if (violations === undefined) return null;
    const counts = new Map<string, number>();
    for (const violation of violations)
      counts.set(violation.rule, (counts.get(violation.rule) ?? 0) + 1);
    return counts;
  } catch {
    return null;
  }
}

/** "3 claim-subject-missing, 1 subject-definition-missing", largest first. */
export function describeFindingCounts(
  counts: ReadonlyMap<string, number>,
): string {
  return [...counts]
    .sort(
      ([leftRule, left], [rightRule, right]) =>
        right - left || leftRule.localeCompare(rightRule),
    )
    .map(([rule, count]) => `${count} ${rule}`)
    .join(", ");
}

const NEXT_STEPS =
  "Run 'kibi migrate' to list the review actions; approve a suggested subject with 'kibi migrate --apply-safe <plan hash> --approved-action <id>', write definitions, subjects and pair_reviews verdicts by hand, then run kibi check.";

/**
 * The closing line of an applied upgrade that left review work, or null when
 * none remains. `findings` is null when the synced store could not be
 * checked; the source-planned domain review then stands in for it.
 */
export function upgradeReviewSummary(
  findings: ReadonlyMap<string, number> | null,
  review: DomainSubjectReview,
  pairCandidates: number,
): string | null {
  if (findings !== null) {
    const total = [...findings.values()].reduce((sum, count) => sum + count, 0);
    if (total === 0) return null;
    return `Schema upgrade applied, but review work remains: kibi check reports ${total} blocking finding(s) the upgrade does not fix (${describeFindingCounts(findings)}). Run kibi check to list them. For the subject and pair review work, ${NEXT_STEPS.charAt(0).toLowerCase()}${NEXT_STEPS.slice(1)}`;
  }
  if (!hasDomainSubjectReview(review) && pairCandidates === 0) return null;
  return `Schema upgrade applied, but review work remains: the domain subject review above${pairCandidates > 0 ? ` and the related-requirement-unmodeled pairs of ${pairCandidates} requirement(s)` : ""}. Run kibi sync, then kibi check to list the findings. ${NEXT_STEPS}`;
}
