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
  authoredSupersedes,
  listDecisionEntities,
  supersedeAcknowledgements,
  unexplainedSupersedes,
} from "../../public/operations/decision-firmness.js";
import { readKbManifest, writeKbManifest } from "../../utils/kb-manifest.js";

/** Migration action code for the schema 9 acknowledgement. */
// implements REQ-kb-decision-firmness, REQ-cli-schema-migration
export const SUPERSEDES_REASON_ACKNOWLEDGE_CODE =
  "supersedes_reason_acknowledge";

/** One superseding decision the migration acknowledges. */
// implements REQ-kb-decision-firmness
export type SupersedesReasonTarget = Readonly<{
  id: string;
  type: string;
  path: string;
  /** The supersede edges to acknowledge, as the manifest records them. */
  edges: readonly string[];
}>;

/**
 * Superseding requirements and ADRs without a "Why this changed" section
 * whose supersede edges the manifest does not acknowledge yet, retired ones
 * included. Nothing in the sources changes: no reason is written, the
 * manifest only records that these edges predate the rule. Read-only.
 */
// implements REQ-kb-decision-firmness, REQ-cli-schema-migration
export function planSupersedesReasonAcknowledgement(
  workspaceRoot: string,
): SupersedesReasonTarget[] {
  const entities = listDecisionEntities(workspaceRoot);
  const known = new Set(
    readKbManifest(workspaceRoot)?.supersedesReasonAcknowledged ?? [],
  );
  const edges = authoredSupersedes(workspaceRoot, entities);
  return unexplainedSupersedes(entities, edges)
    .map((entity) => ({
      id: entity.id,
      type: entity.type,
      path: entity.path,
      edges: supersedeAcknowledgements(entity.id, edges).filter(
        (edge) => !known.has(edge),
      ),
    }))
    .filter((target) => target.edges.length > 0);
}

/** The manifest list with the targets' edges added, sorted and unique. */
// implements REQ-kb-decision-firmness
export function mergeSupersedesAcknowledgements(
  existing: readonly string[] | undefined,
  targets: readonly SupersedesReasonTarget[],
): string[] {
  return [
    ...new Set([...(existing ?? []), ...targets.flatMap((t) => t.edges)]),
  ].sort();
}

/**
 * Record the acknowledged edges in the manifest; returns how many entities
 * were acknowledged. Without a manifest there is no schema to upgrade from,
 * so it refuses rather than report an acknowledgement it did not write.
 */
// implements REQ-kb-decision-firmness, REQ-cli-schema-migration
export function applySupersedesReasonAcknowledgement(
  workspaceRoot: string,
): number {
  const targets = planSupersedesReasonAcknowledgement(workspaceRoot);
  if (targets.length === 0) return 0;
  const manifest = readKbManifest(workspaceRoot);
  if (manifest === null) {
    throw new Error(
      "Cannot acknowledge existing supersedes without .kb/manifest.json; run 'kibi migrate --yes', which writes the manifest and the acknowledgement together.",
    );
  }
  writeKbManifest(workspaceRoot, {
    ...manifest,
    supersedesReasonAcknowledged: mergeSupersedesAcknowledgements(
      manifest.supersedesReasonAcknowledged,
      targets,
    ),
  });
  return targets.length;
}
