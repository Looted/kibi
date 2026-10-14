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
import { extractFromMarkdown } from "../../extractors/markdown.js";
import { withAddedTag } from "./entity-body-context.js";
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
 * legacy one means is usually a semantic choice, so the mapping is only
 * suggested; the latent drift is computed as if the suggestion were applied.
 * Delivery vocabulary (`implemented`, `done`, `completed`) has one lossless
 * reading, `closed` plus the tag `implemented`, and is mapped automatically:
 * those statuses are outside the entity schema, so `kibi sync` cannot
 * compile such a requirement at all until it is mapped.
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

/** The tag that keeps a delivered legacy requirement's meaning once closed. */
// implements REQ-cli-schema-migration
export const DELIVERED_REQUIREMENT_TAG = "implemented";

/**
 * Legacy delivery statuses and their one lossless current reading: `closed`
 * with the tag `implemented`, which kb.pl reads as a delivered requirement
 * that still owes coverage. `kibi migrate` applies these without review.
 */
// implements REQ-cli-schema-migration
export const DELIVERED_REQUIREMENT_STATUS: Readonly<
  Record<string, Readonly<{ status: string; tag: string }>>
> = {
  implemented: { status: "closed", tag: DELIVERED_REQUIREMENT_TAG },
  done: { status: "closed", tag: DELIVERED_REQUIREMENT_TAG },
  completed: { status: "closed", tag: DELIVERED_REQUIREMENT_TAG },
};

/** One requirement whose status is outside the vocabulary. */
// implements REQ-cli-schema-migration
export type RequirementStatusFinding = Readonly<{
  requirementId: string;
  path: string;
  status: string;
  /** The suggested current status; null when Kibi has no suggestion. */
  suggestedStatus: string | null;
  /**
   * The lossless mapping `kibi migrate` applies without review (delivery
   * vocabulary); null when the target status is a person's choice.
   */
  automatic: Readonly<{ status: string; tag: string }> | null;
  /**
   * Why `kibi sync` cannot compile the requirement as authored (for example
   * a status outside the entity schema); null when it compiles.
   */
  extractionError: string | null;
  /** Inventory drift the requirement shows once it has the suggested status. */
  latentDrift: InventoryRederivation | null;
}>;

function extractionErrorOf(absolutePath: string): string | null {
  try {
    extractFromMarkdown(absolutePath);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

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
    const automatic = DELIVERED_REQUIREMENT_STATUS[status] ?? null;
    const suggestedStatus =
      automatic?.status ?? SUGGESTED_REQUIREMENT_STATUS[status] ?? null;
    findings.push({
      requirementId,
      path: file.relativePath,
      status,
      suggestedStatus,
      automatic,
      extractionError: extractionErrorOf(file.absolutePath),
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

function hasTag(content: string, tag: string): boolean {
  const slice = sliceFrontmatter(content);
  const tags =
    slice === null ? undefined : readTopLevelField(slice.text, "tags");
  return Array.isArray(tags) && tags.includes(tag);
}

/**
 * Set the status of one requirement from `from` to `to`, replacing only its
 * `status` line, and add `tag` when given and missing. Refuses when the
 * authored status is no longer `from`.
 */
// implements REQ-cli-schema-migration
export function applyRequirementStatusMapping(
  workspaceRoot: string,
  relativePath: string,
  from: string,
  to: string,
  tag?: string,
): void {
  const absolute = path.join(workspaceRoot, relativePath);
  const content = readText(absolute);
  if (content === null || statusOf(content) !== from)
    throw new Error(
      `${relativePath} no longer has status ${from}; rerun kibi migrate and approve the new plan.`,
    );
  const mapped = withTopLevelField(content, "status", to);
  const next =
    mapped === null || tag === undefined || hasTag(mapped, tag)
      ? mapped
      : withAddedTag(mapped, tag);
  if (next === null)
    throw new Error(
      `${relativePath}: status could not be set to ${to}${tag === undefined ? "" : ` with tag ${tag}`} without changing other frontmatter fields; set it by hand.`,
    );
  writeFileAtomically(absolute, next);
}

/** What mapping the delivery statuses changed, and what it could not edit. */
// implements REQ-cli-schema-migration
export type DeliveredStatusMappingResult = Readonly<{
  mapped: readonly RequirementStatusFinding[];
  skipped: readonly Readonly<{ path: string; reason: string }>[];
}>;

/**
 * Map every requirement whose status is delivery vocabulary to `closed` with
 * the tag `implemented`, front matter only. With `only`, maps just those
 * requirement ids (a plan action applies what it planned). Idempotent.
 */
// implements REQ-cli-schema-migration
export function applyDeliveredStatusMappings(
  workspaceRoot: string,
  only?: ReadonlySet<string>,
): DeliveredStatusMappingResult {
  const mapped: RequirementStatusFinding[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  for (const finding of planRequirementStatusMappings(workspaceRoot)) {
    if (finding.automatic === null) continue;
    if (only !== undefined && !only.has(finding.requirementId)) continue;
    try {
      applyRequirementStatusMapping(
        workspaceRoot,
        finding.path,
        finding.status,
        finding.automatic.status,
        finding.automatic.tag,
      );
      mapped.push(finding);
    } catch (error) {
      skipped.push({
        path: finding.path,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { mapped, skipped };
}
