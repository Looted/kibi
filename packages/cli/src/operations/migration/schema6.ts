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
  type ExtractedRelationship,
  extractFromMarkdown,
} from "../../extractors/markdown.js";
import {
  type MigrationAction,
  migrationAction,
} from "../../public/operations/migration-plan.js";
import {
  CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID,
  CLOSE_SUPERSEDED_REQUIREMENTS_CODE,
  MIGRATION_SYNC_ACTION_ID,
  MIGRATION_SYNC_CODE,
  SOURCE_PATH_REWRITE_ACTION_ID,
  SOURCE_PATH_REWRITE_CODE,
  closeSupersededRequirementsActionInput,
  exceptionUnapprovedActionInput,
  migrationSyncActionInput,
  sourcePathReviewActionInput,
  sourcePathRewriteActionInput,
  supersessionCycleReviewActionInput,
} from "../../public/operations/schema6-check-actions.js";
import { readAllShards } from "../../relationships/shards.js";
import {
  type InventoryRederivation,
  applyInventoryRederivation,
  planInventoryRederivation,
} from "./inventory-rederive.js";
import { listLaneMarkdownFiles } from "./kb-sources.js";
import { applyOriginBackfill, planOriginBackfill } from "./origin-backfill.js";
import {
  type SourcePathRewrite,
  applySourcePathRewrites,
  findDanglingSources,
} from "./source-paths.js";
import {
  applySupersededClosures,
  planSupersededClosures,
} from "./superseded-closure.js";

/** The KB schema generation that introduced entity `origin`. */
export const ORIGIN_SCHEMA_VERSION = 6;

/** Automatic: re-derive a drifted inventory with the current advisor. */
export const SEMANTIC_INVENTORY_REDERIVE_CODE = "semantic_inventory_rederive";
/** Review: a drifted inventory Kibi cannot re-derive safely. */
export const SEMANTIC_INVENTORY_REVIEW_CODE = "semantic_inventory_review";
/** Automatic: stamp `origin: {kind: migration}` on authored entities. */
export const ENTITY_ORIGIN_BACKFILL_CODE = "entity_origin_backfill";
export const ENTITY_ORIGIN_BACKFILL_ACTION_ID = "entity-origin-backfill";
export {
  CLOSE_SUPERSEDED_REQUIREMENTS_CODE,
  MIGRATION_SYNC_ACTION_ID,
  MIGRATION_SYNC_CODE,
  SOURCE_PATH_REWRITE_CODE,
};

const CURRENT_REQUIREMENT_STATUSES = new Set([
  "open",
  "in_progress",
  "closed",
  "active",
  "approved",
]);

function rederiveAction(plan: InventoryRederivation): MigrationAction {
  const changed = plan.changes.filter((change) => change.change !== "kept");
  return migrationAction({
    id: `semantic-inventory-rederive-${plan.requirementId}`,
    code: SEMANTIC_INVENTORY_REDERIVE_CODE,
    category: "semantic",
    safety: "automatic",
    autoApplicable: true,
    invocation: { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
    affectedEntityIds: [plan.requirementId],
    affectedFiles: [plan.path],
    postconditions: [
      {
        check: "proposition-complete-ingestion",
        entityId: plan.requirementId,
        errors: 0,
      },
    ],
    evidence: {
      reason:
        "The stored semantic inventory no longer matches the current semantic advisor, so kibi sync rejects this requirement.",
      ingestionErrors: plan.errors,
      summary: plan.summary,
      changes: changed,
      contractHash: plan.contractHash,
      rule: "Claims whose claim_key and claim_text still match keep their status and grounding; new or changed claims are unresolved, never modeled.",
    },
  });
}

function reviewAction(plan: InventoryRederivation): MigrationAction {
  return migrationAction({
    id: `semantic-inventory-review-${plan.requirementId}`,
    code: SEMANTIC_INVENTORY_REVIEW_CODE,
    category: "semantic",
    safety: "review",
    invocation: {
      kind: "review",
      instruction: `${plan.requirementId} (${plan.path}) no longer matches the current semantic advisor and cannot be re-derived automatically: ${plan.reasons.join("; ")}. Fix it by hand: run \`kibi model --input -\` with {"mode":"analyze","payload":{"type":"req","id":"${plan.requirementId}","properties":<the requirement's current properties>}} to get the current inventory; re-ground or remove each listed grounding link (kb_delete with the relationship) so modeled claims and requires_* links match one to one; kb_upsert the requirement with the returned semantic_inventory, logic_claims and semantic_source_hash (keep modeled only for claims that still have a grounding fact with the same claim_key); then run kibi sync.`,
    },
    affectedEntityIds: [plan.requirementId],
    affectedFiles: [plan.path],
    dispositionRequired: true,
    allowedDispositions: ["fixed", "deferred"],
    evidence: {
      ingestionErrors: plan.errors,
      reasons: plan.reasons,
      summary: plan.summary,
      changes: plan.changes.filter((change) => change.change !== "kept"),
    },
  });
}

type SourceRequirement = {
  id: string;
  status: string;
  approvedBy: string;
  source: string;
};

/**
 * Exceptions without approved_by, read from authored sources so the list is
 * available before the KB compiles.
 */
// implements REQ-kibi-scenario-feasibility, REQ-cli-schema-migration
export function unapprovedExceptionsFromSources(
  workspaceRoot: string,
): Array<{ exceptionId: string; exempts: string[]; source: string }> {
  const requirements = new Map<string, SourceRequirement>();
  const relationships: ExtractedRelationship[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, ["requirements"])) {
    try {
      const result = extractFromMarkdown(file.absolutePath);
      requirements.set(result.entity.id, {
        id: result.entity.id,
        status: result.entity.status,
        approvedBy: (result.entity.approved_by ?? "").trim(),
        source: file.relativePath,
      });
      relationships.push(...result.relationships);
    } catch {
      // Unreadable requirements fail sync with their own diagnostic.
    }
  }
  try {
    relationships.push(...readAllShards(path.join(workspaceRoot, ".kb")));
  } catch {
    // Malformed shards fail sync with their own diagnostic.
  }
  const superseded = new Set(
    relationships
      .filter((relationship) => relationship.type === "supersedes")
      .map((relationship) => relationship.to),
  );
  const exempts = new Map<string, Set<string>>();
  for (const relationship of relationships) {
    if (relationship.type !== "exempts") continue;
    const bases = exempts.get(relationship.from) ?? new Set<string>();
    bases.add(relationship.to);
    exempts.set(relationship.from, bases);
  }
  return [...exempts.entries()]
    .flatMap(([exceptionId, bases]) => {
      const requirement = requirements.get(exceptionId);
      if (
        requirement === undefined ||
        requirement.approvedBy !== "" ||
        !CURRENT_REQUIREMENT_STATUSES.has(requirement.status) ||
        superseded.has(exceptionId)
      ) {
        return [];
      }
      return [
        {
          exceptionId,
          exempts: [...bases].sort(),
          source: requirement.source,
        },
      ];
    })
    .sort((left, right) => left.exceptionId.localeCompare(right.exceptionId));
}

export type Schema6MigrationFragment = Readonly<{
  actions: readonly MigrationAction[];
  /** Automatic actions that rewrite authored sources. */
  sourceRewriteActionIds: readonly string[];
  diagnostics: readonly string[];
}>;

/**
 * Source-derived migration actions: inventory re-derivation whenever an
 * advisor change makes stored inventories drift and the lifecycle repairs
 * (superseded requirements to close, dangling source paths) at any schema
 * version, and, for a KB older than schema 6, the origin backfill plus the
 * exceptions that stop exempting anything. Read-only.
 */
// implements REQ-cli-schema-migration, REQ-agent-guided-migration-orchestration, REQ-kibi-proposition-complete-ingestion
export function buildSchema6MigrationFragment(input: {
  workspaceRoot: string;
  currentSchemaVersion: number | null;
}): Schema6MigrationFragment {
  const actions: MigrationAction[] = [];
  const sourceRewriteActionIds: string[] = [];
  const diagnostics: string[] = [];
  const drift = planInventoryRederivation(input.workspaceRoot);
  for (const plan of drift) {
    const action = plan.safe ? rederiveAction(plan) : reviewAction(plan);
    actions.push(action);
    if (plan.safe) sourceRewriteActionIds.push(action.id);
  }
  if (drift.some((plan) => !plan.safe)) {
    diagnostics.push(
      `${drift.filter((plan) => !plan.safe).length} requirement inventory(ies) need a manual fix before kibi sync succeeds; see the semantic_inventory_review actions.`,
    );
  }
  // A missing or invalid version upgrades through every step, schema 6's
  // backfill included, so it is planned here too.
  const preOrigin =
    input.currentSchemaVersion === null ||
    input.currentSchemaVersion < ORIGIN_SCHEMA_VERSION;
  if (preOrigin) {
    const backfill = planOriginBackfill(input.workspaceRoot);
    if (backfill.targets.length > 0) {
      const byType: Record<string, number> = {};
      for (const target of backfill.targets) {
        byType[target.type || "unknown"] =
          (byType[target.type || "unknown"] ?? 0) + 1;
      }
      actions.push(
        migrationAction({
          id: ENTITY_ORIGIN_BACKFILL_ACTION_ID,
          code: ENTITY_ORIGIN_BACKFILL_CODE,
          category: "schema",
          safety: "automatic",
          autoApplicable: true,
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          affectedFiles: [".kb/"],
          postconditions: [{ entitiesWithoutOrigin: 0 }],
          evidence: {
            reason:
              "Schema 6 records who authored each entity. Entities written before it get origin {kind: migration, ref: 'kibi migrate v5->v6', recorded_at}; the frontmatter is otherwise unchanged.",
            count: backfill.targets.length,
            byType,
            entityIds: backfill.targets.map((target) => target.id),
            skipped: backfill.skipped,
            ...(input.currentSchemaVersion === null ||
            input.currentSchemaVersion < 5
              ? {
                  note: "Knowledge the schema upgrade moves into .kb/ is stamped when it moves.",
                }
              : {}),
          },
        }),
      );
      sourceRewriteActionIds.push(ENTITY_ORIGIN_BACKFILL_ACTION_ID);
    }
    for (const exception of unapprovedExceptionsFromSources(
      input.workspaceRoot,
    )) {
      actions.push(migrationAction(exceptionUnapprovedActionInput(exception)));
    }
  }
  // Blocking lifecycle findings with a mechanical fix are planned at any
  // schema version: they block kibi check until they are resolved.
  const lifecycle = buildLifecycleRepairActions(input.workspaceRoot);
  actions.push(...lifecycle.actions);
  sourceRewriteActionIds.push(...lifecycle.sourceRewriteActionIds);
  return { actions, sourceRewriteActionIds, diagnostics };
}

/**
 * Actions for the superseded-requirement-open and source-path-dangling
 * findings in authored sources: close superseded requirements and rewrite
 * retired documentation/ sources automatically; one review per supersession
 * cycle and per source Kibi cannot map. Read-only.
 */
// implements REQ-cli-schema-migration, REQ-core-validation-rules
export function buildLifecycleRepairActions(workspaceRoot: string): {
  actions: MigrationAction[];
  sourceRewriteActionIds: string[];
} {
  const actions: MigrationAction[] = [];
  const sourceRewriteActionIds: string[] = [];
  const supersession = planSupersededClosures(workspaceRoot);
  if (supersession.closures.length > 0) {
    actions.push(
      migrationAction(
        closeSupersededRequirementsActionInput(supersession.closures),
      ),
    );
    sourceRewriteActionIds.push(CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID);
  }
  for (const cycle of supersession.cycles) {
    actions.push(migrationAction(supersessionCycleReviewActionInput(cycle)));
  }
  const dangling = findDanglingSources(workspaceRoot);
  const rewrites: SourcePathRewrite[] = [];
  for (const source of dangling) {
    if (source.rewrite !== undefined && typeof source.value === "string") {
      rewrites.push({
        entityId: source.entityId,
        file: source.file,
        from: source.value,
        to: source.rewrite,
      });
    } else {
      actions.push(migrationAction(sourcePathReviewActionInput(source)));
    }
  }
  if (rewrites.length > 0) {
    actions.push(migrationAction(sourcePathRewriteActionInput(rewrites)));
    sourceRewriteActionIds.push(SOURCE_PATH_REWRITE_ACTION_ID);
  }
  return { actions, sourceRewriteActionIds };
}

/** The sync that recompiles sources rewritten by earlier actions. */
export function migrationSyncAction(
  dependsOn: readonly string[],
): MigrationAction {
  return migrationAction(migrationSyncActionInput(dependsOn));
}

function plannedRewrites(action: MigrationAction): SourcePathRewrite[] {
  const rewrites = action.evidence.rewrites;
  if (!Array.isArray(rewrites)) return [];
  return rewrites.flatMap((raw) => {
    if (raw === null || typeof raw !== "object") return [];
    const { entityId, file, from, to } = raw as Record<string, unknown>;
    return typeof entityId === "string" &&
      typeof file === "string" &&
      typeof from === "string" &&
      typeof to === "string"
      ? [{ entityId, file, from, to }]
      : [];
  });
}

type ApplyContext = Readonly<{
  workspaceRoot: string;
  clock: () => Date;
}>;

/** Execute one automatic action produced by this module. */
// implements REQ-cli-schema-migration, REQ-agent-guided-migration-orchestration
export async function applySchema6MigrationAction(
  action: MigrationAction,
  context: ApplyContext,
): Promise<void> {
  switch (action.code) {
    case SEMANTIC_INVENTORY_REDERIVE_CODE: {
      const requirementId = action.affectedEntityIds[0];
      if (requirementId === undefined)
        throw new Error("Inventory re-derivation names no requirement.");
      const contractHash =
        typeof action.evidence.contractHash === "string"
          ? action.evidence.contractHash
          : undefined;
      applyInventoryRederivation(
        context.workspaceRoot,
        requirementId,
        contractHash,
      );
      return;
    }
    case ENTITY_ORIGIN_BACKFILL_CODE:
      applyOriginBackfill(context.workspaceRoot, context.clock().toISOString());
      return;
    case CLOSE_SUPERSEDED_REQUIREMENTS_CODE: {
      const result = applySupersededClosures(
        context.workspaceRoot,
        new Set(action.affectedEntityIds),
      );
      if (result.skipped.length > 0)
        throw new Error(
          `Could not close ${result.skipped.map((skip) => `${skip.path} (${skip.reason})`).join(", ")}; set status: closed by hand.`,
        );
      return;
    }
    case SOURCE_PATH_REWRITE_CODE: {
      const result = applySourcePathRewrites(
        context.workspaceRoot,
        plannedRewrites(action),
      );
      if (result.skipped.length > 0)
        throw new Error(
          `Could not rewrite the source of ${result.skipped.map((skip) => `${skip.file} (${skip.reason})`).join(", ")}; rerun kibi migrate and approve the new plan.`,
        );
      return;
    }
    case MIGRATION_SYNC_CODE: {
      const { syncCommand } = await import("../../commands/sync.js");
      const result = await syncCommand({
        workspaceRoot: context.workspaceRoot,
      });
      if (!result.success)
        throw new Error(
          "kibi sync did not complete after the migration rewrote sources; run kibi sync to see why.",
        );
      return;
    }
    default:
      throw new Error(
        `Migration action '${action.code}' has no schema 6 executor.`,
      );
  }
}

export const SCHEMA6_AUTOMATIC_CODES: ReadonlySet<string> = new Set([
  SEMANTIC_INVENTORY_REDERIVE_CODE,
  ENTITY_ORIGIN_BACKFILL_CODE,
  CLOSE_SUPERSEDED_REQUIREMENTS_CODE,
  SOURCE_PATH_REWRITE_CODE,
  MIGRATION_SYNC_CODE,
]);
