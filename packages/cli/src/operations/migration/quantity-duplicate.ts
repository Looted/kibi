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
  type MigrationAction,
  migrationAction,
} from "../../public/operations/migration-plan.js";
import {
  QUANTITY_DUPLICATE_RULE,
  type QuantityPair,
  quantityDuplicatePairs,
  readQuantityInputs,
} from "../../public/operations/quantity-layer.js";

/** Migration action code of two value facts that state one quantity. */
export const QUANTITY_DUPLICATE_REVIEW_CODE = "quantity_duplicate_review";
export const QUANTITY_DUPLICATE_ACTION_PREFIX = "quantity-duplicate-";

/**
 * Pairs of value facts that state one quantity under two keys
 * (quantity-duplicate). Whether they are one quantity is a person's call:
 * writing distinct_from on its own would record a stale twin as intended.
 * Read-only.
 */
export function planQuantityDuplicateReviews(
  workspaceRoot: string,
): QuantityPair[] {
  const inputs = readQuantityInputs(workspaceRoot);
  return quantityDuplicatePairs(inputs.facts, inputs.code);
}

/** One review action per pair, listed at any schema version. */
export function quantityDuplicateActions(
  workspaceRoot: string,
): MigrationAction[] {
  return planQuantityDuplicateReviews(workspaceRoot).map(
    ({ left, right, files, signals }) =>
      migrationAction({
        id: `${QUANTITY_DUPLICATE_ACTION_PREFIX}${left.id}-${right.id}`,
        code: QUANTITY_DUPLICATE_REVIEW_CODE,
        category: "semantic",
        safety: "review",
        autoApplicable: false,
        invocation: {
          kind: "review",
          instruction: `Decide whether ${left.key} (${left.id}) and ${right.key} (${right.id}) are one quantity: if so, ground both claims on one subject_key and property_key; if not, add the other key to distinct_from on either fact.`,
        },
        affectedEntityIds: [left.id, right.id],
        affectedFiles: [left.path, right.path],
        postconditions: [
          { rule: QUANTITY_DUPLICATE_RULE, entityId: left.id, findings: 0 },
        ],
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
        evidence: {
          reason: `Value facts ${left.id} and ${right.id} both state ${left.display} under different keys, and their requirements are implemented in ${files.join(", ")}. A change to one name leaves the other stale and no rule compares them. kb_check blocks the pair (quantity-duplicate).`,
          keys: [left.key, right.key],
          claims: [left.claimText, right.claimText],
          values: [left.display, right.display],
          requirements: [left.requirements, right.requirements],
          files,
          signals,
          choice:
            "If they are one quantity, keep one subject_key.property_key and move the other claim's fact onto it, together with the facts scenarios assume on the old key, so domain-contradictions compares the values from then on. If they are different quantities that happen to share a value, add the other key to distinct_from and say in the fact's body how they differ. Kibi never writes distinct_from on its own.",
        },
      }),
  );
}

/** The upgrade note for the pairs planQuantityDuplicateReviews found. */
export function quantityDuplicateNote(count: number, dryRun: boolean): string {
  return `${dryRun ? "dry run: " : ""}Schema 19: quantity-duplicate now blocks two value facts of current requirements that state one quantity under different subject or property keys; ${count} pair(s) found. 'kibi migrate' lists each as a quantity_duplicate_review action naming both claims and values: ground both claims on one key, or add distinct_from when they are different quantities. Nothing is written.`;
}
