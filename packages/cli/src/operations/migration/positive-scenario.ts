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

import { planPositiveScenarioAcknowledgement } from "../../public/operations/positive-scenario.js";
import { readKbManifest, writeKbManifest } from "../../utils/kb-manifest.js";

/** Migration action code for the schema 17 acknowledgement. */
export const POSITIVE_SCENARIO_ACKNOWLEDGE_CODE =
  "positive_scenario_acknowledge";

/**
 * Current must requirements recorded before schema 17 that the manifest does
 * not acknowledge yet. Nothing in the sources changes: the manifest only
 * records that these requirements predate must-positive-scenario. Read-only.
 */
export function planPositiveScenarioAcknowledgements(
  workspaceRoot: string,
): string[] {
  const known = new Set(
    readKbManifest(workspaceRoot)?.positiveScenarioAcknowledged,
  );
  return planPositiveScenarioAcknowledgement(workspaceRoot).filter(
    (id) => !known.has(id),
  );
}

/** The manifest list with the ids added, sorted and unique. */
export function mergePositiveScenarioAcknowledgements(
  existing: readonly string[] | undefined,
  ids: readonly string[],
): string[] {
  return [...new Set([...(existing ?? []), ...ids])].sort();
}

/**
 * Record the acknowledged requirements in the manifest; returns how many
 * were acknowledged. Without a manifest there is no schema to upgrade from,
 * so it refuses rather than report an acknowledgement it did not write.
 */
export function applyPositiveScenarioAcknowledgement(
  workspaceRoot: string,
): number {
  const ids = planPositiveScenarioAcknowledgements(workspaceRoot);
  if (ids.length === 0) return 0;
  const manifest = readKbManifest(workspaceRoot);
  if (manifest === null) {
    throw new Error(
      "Cannot acknowledge existing must requirements without .kb/manifest.json; run 'kibi migrate --yes', which writes the manifest and the acknowledgement together.",
    );
  }
  writeKbManifest(workspaceRoot, {
    ...manifest,
    positiveScenarioAcknowledged: mergePositiveScenarioAcknowledgements(
      manifest.positiveScenarioAcknowledged,
      ids,
    ),
  });
  return ids.length;
}
