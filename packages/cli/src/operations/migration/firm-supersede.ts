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
  implicitFirmSupersedes,
  listDecisionEntities,
} from "../../public/operations/decision-firmness.js";
import { readKbManifest, writeKbManifest } from "../../utils/kb-manifest.js";

/** Migration action code for the schema 10 acknowledgement. */
// implements REQ-kb-decision-firmness-from-origin, REQ-cli-schema-migration
export const FIRM_SUPERSEDE_ACKNOWLEDGE_CODE = "firm_supersede_acknowledge";

/**
 * Supersede edges recorded before schema 10 that replace a decision which
 * now reads as firm from its origin, by a decision that is not firm, and
 * that the manifest does not acknowledge yet. Nothing in the sources
 * changes: the manifest only records that these supersedes predate the
 * rule. Read-only.
 */
// implements REQ-kb-decision-firmness-from-origin, REQ-cli-schema-migration
export function planFirmSupersedeAcknowledgement(
  workspaceRoot: string,
): string[] {
  const entities = listDecisionEntities(workspaceRoot);
  const known = new Set(
    readKbManifest(workspaceRoot)?.firmSupersedeAcknowledged ?? [],
  );
  return implicitFirmSupersedes(
    entities,
    authoredSupersedes(workspaceRoot, entities),
  ).filter((edge) => !known.has(edge));
}

/** The manifest list with the edges added, sorted and unique. */
// implements REQ-kb-decision-firmness-from-origin
export function mergeFirmSupersedeAcknowledgements(
  existing: readonly string[] | undefined,
  edges: readonly string[],
): string[] {
  return [...new Set([...(existing ?? []), ...edges])].sort();
}

/**
 * Record the acknowledged edges in the manifest; returns how many edges
 * were acknowledged. Without a manifest there is no schema to upgrade from,
 * so it refuses rather than report an acknowledgement it did not write.
 */
// implements REQ-kb-decision-firmness-from-origin, REQ-cli-schema-migration
export function applyFirmSupersedeAcknowledgement(
  workspaceRoot: string,
): number {
  const edges = planFirmSupersedeAcknowledgement(workspaceRoot);
  if (edges.length === 0) return 0;
  const manifest = readKbManifest(workspaceRoot);
  if (manifest === null) {
    throw new Error(
      "Cannot acknowledge existing supersedes without .kb/manifest.json; run 'kibi migrate --yes', which writes the manifest and the acknowledgement together.",
    );
  }
  writeKbManifest(workspaceRoot, {
    ...manifest,
    firmSupersedeAcknowledged: mergeFirmSupersedeAcknowledgements(
      manifest.firmSupersedeAcknowledged,
      edges,
    ),
  });
  return edges.length;
}
