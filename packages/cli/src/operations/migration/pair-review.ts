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
  authoredSupersededIds,
  isCurrentAuthoredEntity,
  listContextAuthoredEntities,
} from "../../public/operations/entity-context.js";

/** Inventory statuses of a claim no fact grounds. */
const UNMODELED_STATUSES = new Set(["missing", "ontology_gap", "ambiguous"]);

/** Roles whose unmodeled claims state or scope a rule. */
const RULE_ROLES = new Set([
  "normative",
  "condition",
  "exception",
  "definition",
]);

function hasUnmodeledRuleClaim(inventory: unknown): boolean {
  if (!Array.isArray(inventory)) return false;
  return inventory.some((entry) => {
    if (entry === null || typeof entry !== "object") return false;
    const { status, role } = entry as { status?: unknown; role?: unknown };
    if (typeof status !== "string" || !UNMODELED_STATUSES.has(status))
      return false;
    return status === "missing" || RULE_ROLES.has(String(role));
  });
}

/**
 * Current requirements with an unmodeled rule claim, the ones schema 18's
 * related-requirement-unmodeled can report once they pair with another
 * current requirement. Whether two requirements pair, and whether a verdict
 * settles them, needs the synced store and a person's judgement, so the
 * upgrade only counts them and writes nothing. Read-only.
 */
export function planPairReviewCandidates(workspaceRoot: string): string[] {
  const entities = listContextAuthoredEntities(workspaceRoot);
  const superseded = authoredSupersededIds(workspaceRoot, entities);
  return entities
    .filter(
      (entity) =>
        entity.type === "req" &&
        isCurrentAuthoredEntity(entity, superseded) &&
        hasUnmodeledRuleClaim(entity.data.semantic_inventory),
    )
    .map((entity) => entity.id)
    .sort();
}

/** The upgrade note for the requirements planPairReviewCandidates found. */
export function pairReviewNote(count: number, dryRun: boolean): string {
  return `${dryRun ? "dry run: " : ""}Schema 18: related-requirement-unmodeled now blocks a current requirement whose unmodeled rule claims pair with another current requirement through a relates_to edge or a shared subject; ${count} current requirement(s) have such claims. Run kibi check to list the pairs, then model the claims or record a pair_reviews verdict on each pair (a person approves an agent's verdict on a must or firm requirement). Nothing is written.`;
}
