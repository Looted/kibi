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

import path from "node:path";
import {
  type InventoryRederivation,
  planInventoryRederivation,
} from "./inventory-rederive.js";
import {
  listLaneMarkdownFiles,
  readText,
  readTopLevelField,
  sliceFrontmatter,
  withTopLevelField,
  writeFileAtomically,
} from "./kb-sources.js";

/**
 * Requirement statuses outside the current vocabulary (`req-status-vocabulary`).
 *
 * A requirement with ADR vocabulary such as `status: accepted` compiles, but
 * it is not a current requirement: the proof ladder skips it and the
 * ingestion boundary does not validate its semantic inventory, so inventory
 * drift stays hidden until someone maps the status. Which current status a
 * legacy one means is a semantic choice, so the mapping is only suggested;
 * the latent drift is computed as if the suggestion were applied.
 */

/** Statuses `kibi check` accepts on a requirement (canonical and legacy). */
const REQUIREMENT_STATUSES = new Set([
  "open",
  "in_progress",
  "closed",
  "active",
  "approved",
]);

/**
 * Suggested current status for ADR or lifecycle vocabulary found on
 * requirements: decided or still-proposed intent stays `open`; retired
 * intent is `closed`.
 */
// implements REQ-cli-schema-migration
export const SUGGESTED_REQUIREMENT_STATUS: Readonly<Record<string, string>> = {
  accepted: "open",
  proposed: "open",
  draft: "open",
  deprecated: "closed",
  superseded: "closed",
  rejected: "closed",
};

/** One requirement whose status is outside the vocabulary. */
// implements REQ-cli-schema-migration
export type RequirementStatusFinding = Readonly<{
  requirementId: string;
  path: string;
  status: string;
  /** The suggested current status; null when Kibi has no suggestion. */
  suggestedStatus: string | null;
  /** Inventory drift the requirement shows once it has the suggested status. */
  latentDrift: InventoryRederivation | null;
}>;

function statusOf(content: string): unknown {
  const slice = sliceFrontmatter(content);
  return slice === null ? undefined : readTopLevelField(slice.text, "status");
}

function idOf(content: string): unknown {
  const slice = sliceFrontmatter(content);
  return slice === null ? undefined : readTopLevelField(slice.text, "id");
}

/** Every requirement whose authored status is outside the vocabulary. */
// implements REQ-cli-schema-migration
export function planRequirementStatusMappings(
  workspaceRoot: string,
): RequirementStatusFinding[] {
  const findings: RequirementStatusFinding[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, ["requirements"])) {
    const content = readText(file.absolutePath);
    if (content === null) continue;
    const status = statusOf(content);
    if (typeof status !== "string" || REQUIREMENT_STATUSES.has(status))
      continue;
    const id = idOf(content);
    const requirementId =
      typeof id === "string" && id.length > 0
        ? id
        : path.basename(file.relativePath, ".md");
    const suggestedStatus = SUGGESTED_REQUIREMENT_STATUS[status] ?? null;
    findings.push({
      requirementId,
      path: file.relativePath,
      status,
      suggestedStatus,
      latentDrift:
        suggestedStatus === null
          ? null
          : (planInventoryRederivation(workspaceRoot, requirementId, {
              status: suggestedStatus,
            }).find((plan) => plan.requirementId === requirementId) ?? null),
    });
  }
  return findings.sort((left, right) =>
    left.requirementId.localeCompare(right.requirementId),
  );
}

/**
 * Set the status of one requirement from `from` to `to`, replacing only its
 * `status` line. Refuses when the authored status is no longer `from`.
 */
// implements REQ-cli-schema-migration
export function applyRequirementStatusMapping(
  workspaceRoot: string,
  relativePath: string,
  from: string,
  to: string,
): void {
  const absolute = path.join(workspaceRoot, relativePath);
  const content = readText(absolute);
  if (content === null || statusOf(content) !== from)
    throw new Error(
      `${relativePath} no longer has status ${from}; rerun kibi migrate and approve the new plan.`,
    );
  const next = withTopLevelField(content, "status", to);
  if (next === null)
    throw new Error(
      `${relativePath}: status could not be set to ${to} without changing other frontmatter fields; set it by hand.`,
    );
  writeFileAtomically(absolute, next);
}
