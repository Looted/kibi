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
import { FIRMNESS_FROM_ORIGIN_SCHEMA_VERSION } from "../../public/operations/decision-firmness.js";
import { EVIDENCE_FLOOR_SCHEMA_VERSION } from "../../public/operations/evidence-floor.js";
import {
  type MigrationAction,
  migrationAction,
} from "../../public/operations/migration-plan.js";
import { CLAIM_BINDING_SCHEMA_VERSION } from "../../public/operations/proof-contract-claims.js";
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
import { KB_PATHS } from "../../utils/kb-paths.js";
import {
  CONTEXT_MISSING_TAG_CODE,
  SEMANTIC_TEXT_PIN_CODE,
  applyContextMissingTags,
  applySemanticTextPins,
  countByType,
  planContextMissingTags,
  planSemanticTextPins,
} from "./entity-body-context.js";
import {
  ENTITY_TYPE_BACKFILL_ACTION_ID,
  ENTITY_TYPE_BACKFILL_CODE,
  applyEntityTypeBackfill,
  planEntityTypeBackfill,
} from "./entity-type.js";
import {
  EVIDENCE_FLOOR_PIN_CODE,
  type LadderFloorVerdicts,
  applyEvidenceFloorPins,
  planEvidenceFloorPins,
} from "./evidence-floor.js";
import {
  FIRM_SUPERSEDE_ACKNOWLEDGE_CODE,
  applyFirmSupersedeAcknowledgement,
  planFirmSupersedeAcknowledgement,
} from "./firm-supersede.js";
import {
  type InventoryRederivation,
  applyInventoryRederivation,
  applyInventoryRederivationDroppingGrounding,
  planInventoryRederivation,
} from "./inventory-rederive.js";
import { listLaneMarkdownFiles } from "./kb-sources.js";
import { applyOriginBackfill, planOriginBackfill } from "./origin-backfill.js";
import {
  POLARITY_VALUE_BACKFILL_CODE,
  applyPolarityValueBackfill,
  planPolarityValueBackfill,
} from "./polarity-values.js";
import {
  type ClaimCandidateRow,
  PROOF_CONTRACT_CLAIMS_PIN_CODE,
  PROOF_CONTRACT_CLAIMS_REVIEW_CODE,
  claimReviewInstruction,
  planProofContractClaimPins,
} from "./proof-contract-claims.js";
import {
  DELIVERED_REQUIREMENT_TAG,
  type RequirementStatusFinding,
  applyDeliveredStatusMappings,
  applyRequirementStatusMapping,
  planRequirementStatusMappings,
} from "./requirement-status.js";
import {
  type PlannedSourcePathRepairs,
  type SourcePathRemoval,
  type SourcePathRewrite,
  applySourcePathRepairs,
  findSourceRepairs,
  plannedSourcePathRepairs,
} from "./source-paths.js";
import {
  applySupersededClosures,
  planSupersededClosures,
} from "./superseded-closure.js";
import {
  SUPERSEDES_REASON_ACKNOWLEDGE_CODE,
  applySupersedesReasonAcknowledgement,
  planSupersedesReasonAcknowledgement,
} from "./supersedes-reason.js";
import {
  coordinateRefreshFailureMessage,
  readGeneratedManifestBytes,
  refreshCoordinatesAfterMigration,
} from "./symbol-coordinates-refresh.js";
import {
  SYMBOL_LEGACY_LINK_MARK_ACTION_ID,
  SYMBOL_LEGACY_LINK_MARK_CODE,
  applySymbolLegacyLinks,
  planSymbolLegacyLinks,
} from "./symbol-legacy-links.js";

/** The KB schema generation that introduced entity `origin`. */
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
export const ORIGIN_SCHEMA_VERSION = 6;

/** The KB schema generation that requires body context on current entities. */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export const BODY_CONTEXT_SCHEMA_VERSION = 8;

/** The KB schema generation that adds decision firmness. */
// implements REQ-kb-decision-firmness, REQ-cli-schema-migration
export const DECISION_FIRMNESS_SCHEMA_VERSION = 9;

/** Automatic: re-derive a drifted inventory with the current advisor. */
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
export const SEMANTIC_INVENTORY_REDERIVE_CODE = "semantic_inventory_rederive";
/** Review: a drifted inventory Kibi cannot re-derive safely. */
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
export const SEMANTIC_INVENTORY_REVIEW_CODE = "semantic_inventory_review";
/**
 * Review, applied only when approved by id: re-derive a drifted inventory and
 * drop the grounding links that no longer ground a modeled claim.
 */
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
export const SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE =
  "semantic_inventory_rederive_drop_grounding";
/** Review, applied only when approved by id: map a legacy requirement status. */
// implements REQ-cli-schema-migration
export const REQ_STATUS_VOCABULARY_MAP_CODE = "req_status_vocabulary_map";
/** Automatic: map delivery statuses to `closed` plus the tag `implemented`. */
// implements REQ-cli-schema-migration
export const REQ_STATUS_DELIVERED_MAP_CODE = "req_status_delivered_map";
// implements REQ-cli-schema-migration
export const REQ_STATUS_DELIVERED_MAP_ACTION_ID = "req-status-delivered-map";
/** Automatic: stamp `origin: {kind: migration}` on authored entities. */
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
export const ENTITY_ORIGIN_BACKFILL_CODE = "entity_origin_backfill";
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
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

/**
 * A re-derivation that only applies after a status mapping a person must
 * approve: it is a review action that depends on that mapping, so approving
 * both runs them in order and `--apply-safe` alone runs neither.
 */
type AfterStatusMapping = Readonly<{ actionId: string; status: string }>;

function rederiveAction(
  plan: InventoryRederivation,
  after?: AfterStatusMapping,
): MigrationAction {
  const changed = plan.changes.filter((change) => change.change !== "kept");
  const id = `semantic-inventory-rederive-${plan.requirementId}`;
  return migrationAction({
    id,
    code: SEMANTIC_INVENTORY_REDERIVE_CODE,
    category: "semantic",
    ...(after === undefined
      ? {
          safety: "automatic" as const,
          autoApplicable: true,
          invocation: {
            kind: "cli" as const,
            command_argv: ["kibi", "migrate", "--yes"],
          },
        }
      : {
          safety: "review" as const,
          autoApplicable: false,
          invocation: {
            kind: "cli" as const,
            command_argv: approvalArgv([after.actionId, id]),
          },
          dependsOn: [after.actionId],
          dispositionRequired: true,
          allowedDispositions: ["fixed" as const, "deferred" as const],
        }),
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
      ...(after === undefined
        ? {}
        : {
            afterStatus: after.status,
            note: `This drift shows once the requirement has status ${after.status}; approve it together with ${after.actionId}.`,
          }),
    },
  });
}

function approvalArgv(ids: readonly string[]): string[] {
  return [
    "kibi",
    "migrate",
    "--apply-safe",
    ...ids.flatMap((id) => ["--approved-action", id]),
  ];
}

function reviewAction(plan: InventoryRederivation): MigrationAction {
  return migrationAction({
    id: `semantic-inventory-review-${plan.requirementId}`,
    code: SEMANTIC_INVENTORY_REVIEW_CODE,
    category: "semantic",
    safety: "review",
    invocation: {
      kind: "review",
      instruction: `${plan.requirementId} (${plan.path}) no longer matches the current semantic advisor and cannot be re-derived automatically: ${plan.reasons.join("; ")}. Fix it in ${plan.path} itself: kibi sync rejects this requirement, so store-backed tools (kb_upsert, kb_delete) cannot see it until it compiles. In its front matter, write the re-derived contract from this action's evidence.contract (semantic_inventory, logic_claims, semantic_source_hash and their version fields), then make modeled claims and requires_* links match one to one: re-ground or remove each listed grounding link, and keep a claim modeled only while a grounding fact with the same claim_key remains. Run kibi sync to confirm.${plan.rederivableByDroppingGrounding ? ` Or approve semantic-inventory-rederive-drop-grounding-${plan.requirementId}, which writes that contract and removes exactly the listed orphaned grounding links.` : ""} To see how the advisor reads the prose, run \`kibi model --input -\` with {"mode":"analyze","type":"req","id":"${plan.requirementId}","text":<the requirement's semantic_text, or its statement when it has none>}.`,
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
      contract: plan.contract,
      contractHash: plan.contractHash,
    },
  });
}

/**
 * The explicit alternative to a manual inventory fix: write the re-derived
 * contract and remove the orphaned grounding links from the requirement's
 * front matter. It drops modeled logic, so it is a review action that
 * `--apply-safe` never selects on its own; approving its id runs it.
 */
function dropGroundingAction(
  plan: InventoryRederivation,
  after?: AfterStatusMapping,
): MigrationAction {
  const id = `semantic-inventory-rederive-drop-grounding-${plan.requirementId}`;
  const drops = plan.orphanedGrounding.map(({ type, target, claimKey }) => ({
    type,
    target,
    claimKey,
  }));
  return migrationAction({
    id,
    code: SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE,
    category: "semantic",
    safety: "review",
    autoApplicable: false,
    invocation: {
      kind: "cli",
      command_argv: approvalArgv(
        after === undefined ? [id] : [after.actionId, id],
      ),
    },
    dependsOn: after === undefined ? [] : [after.actionId],
    affectedEntityIds: [plan.requirementId],
    affectedFiles: [plan.path],
    postconditions: [
      {
        check: "proposition-complete-ingestion",
        entityId: plan.requirementId,
        errors: 0,
      },
    ],
    dispositionRequired: true,
    allowedDispositions: ["fixed", "deferred"],
    evidence: {
      reason: `Re-derive the semantic inventory of ${plan.requirementId} and drop the ${drops.length} grounding link(s) that no longer ground a modeled claim, so kibi sync accepts it. The modeled logic those links carried is removed from the requirement (the facts themselves stay); re-ground the claims later with kibi model if they still matter.`,
      approve: `kibi migrate --apply-safe --approved-plan-hash <this plan's planHash>${after === undefined ? "" : ` --approved-action ${after.actionId}`} --approved-action ${id}`,
      ...(after === undefined ? {} : { afterStatus: after.status }),
      droppedGrounding: drops,
      summary: plan.summary,
      changes: plan.changes.filter((change) => change.change !== "kept"),
      contract: plan.contract,
      contractHash: plan.contractHash,
      ...(after === undefined
        ? { alternativeTo: `semantic-inventory-review-${plan.requirementId}` }
        : {}),
    },
  });
}

/** The grounding links an approved drop-grounding action lists. */
function plannedDrops(
  action: MigrationAction,
): Array<{ type: string; target: string }> {
  return plannedRecords(action.evidence.droppedGrounding).flatMap(
    ({ type, target }) =>
      typeof type === "string" && typeof target === "string"
        ? [{ type, target }]
        : [],
  );
}

/**
 * The automatic action for requirements whose status is delivery vocabulary
 * (`implemented`, `done`, `completed`): sync cannot compile them, and their
 * one lossless reading is `closed` plus the tag `implemented`.
 */
function deliveredStatusAction(
  findings: readonly RequirementStatusFinding[],
): MigrationAction {
  return migrationAction({
    id: REQ_STATUS_DELIVERED_MAP_ACTION_ID,
    code: REQ_STATUS_DELIVERED_MAP_CODE,
    category: "schema",
    safety: "automatic",
    autoApplicable: true,
    invocation: { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
    affectedEntityIds: findings.map((finding) => finding.requirementId),
    affectedFiles: findings.map((finding) => finding.path),
    postconditions: [{ rule: "req-status-vocabulary", findings: 0 }],
    evidence: {
      reason:
        "Delivery statuses are outside the entity schema, so kibi sync cannot compile these requirements and every store-backed tool misses them. Each becomes status closed with the tag implemented, which Kibi reads as a delivered requirement that still owes coverage; only the status line and the tags change.",
      count: findings.length,
      mappings: findings.map((finding) => ({
        requirementId: finding.requirementId,
        path: finding.path,
        from: finding.status,
        to: finding.automatic?.status ?? "closed",
        tag: finding.automatic?.tag ?? DELIVERED_REQUIREMENT_TAG,
      })),
    },
  });
}

/**
 * Requirements whose status is outside the vocabulary. Delivery vocabulary
 * gets one automatic action (see deliveredStatusAction). Every other status
 * gets one review action (the target status is a semantic choice) carrying
 * the suggested mapping and the inventory drift the requirement shows once
 * mapped. With a suggestion it is executable when approved by id; the
 * re-derivation of the latent drift depends on it.
 */
// implements REQ-cli-schema-migration, REQ-kibi-proposition-complete-ingestion
export function requirementStatusActions(
  workspaceRoot: string,
): MigrationAction[] {
  const actions: MigrationAction[] = [];
  const findings = planRequirementStatusMappings(workspaceRoot);
  const delivered = findings.filter((finding) => finding.automatic !== null);
  if (delivered.length > 0) actions.push(deliveredStatusAction(delivered));
  for (const finding of findings) {
    if (finding.automatic !== null) continue;
    const id = `req-status-vocabulary-map-${finding.requirementId}`;
    const drift = finding.latentDrift;
    const target = finding.suggestedStatus;
    actions.push(
      migrationAction({
        id,
        code: REQ_STATUS_VOCABULARY_MAP_CODE,
        category: "schema",
        safety: "review",
        autoApplicable: false,
        invocation:
          target === null
            ? {
                kind: "review",
                instruction:
                  finding.extractionError === null
                    ? `${finding.requirementId} (${finding.path}) has status ${finding.status}, which is not a requirement status, so it is skipped by the proof ladder and its semantic inventory is never validated. Set status to open, in_progress or closed (legacy: active, approved) in the file, or use proof_exempt to park it, then rerun kibi migrate.`
                    : `${finding.requirementId} (${finding.path}) has status ${finding.status}, which is not a status Kibi knows, so kibi sync cannot compile it (${finding.extractionError}) and kb_query, kb_coverage and kb_upsert do not see it. Set status to open, in_progress or closed in the file (closed with the tag implemented for delivered work), then run kibi sync and rerun kibi migrate.`,
              }
            : { kind: "cli", command_argv: approvalArgv([id]) },
        affectedEntityIds: [finding.requirementId],
        affectedFiles: [finding.path],
        postconditions: [{ rule: "req-status-vocabulary", findings: 0 }],
        dispositionRequired: true,
        allowedDispositions: ["fixed", "deferred"],
        evidence: {
          reason:
            finding.extractionError === null
              ? `Status ${finding.status} is ADR or lifecycle vocabulary, not a requirement status: the requirement is skipped by the proof ladder and kibi sync never validates its semantic inventory.`
              : `Status ${finding.status} is outside the entity schema, so kibi sync cannot compile the requirement at all.`,
          status: finding.status,
          suggestedStatus: target,
          ...(finding.extractionError === null
            ? {}
            : { extractionError: finding.extractionError }),
          ...(target === null
            ? {}
            : {
                mapping: `${finding.status} -> ${target}`,
                approve: `kibi migrate --apply-safe --approved-plan-hash <this plan's planHash> --approved-action ${id}`,
                choice:
                  "The target status is a semantic choice; to pick another one, set it in the file by hand instead of approving this action.",
              }),
          latentDrift:
            drift === null
              ? null
              : {
                  ingestionErrors: drift.errors,
                  safe: drift.safe,
                  reasons: drift.reasons,
                  summary: drift.summary,
                  contractHash: drift.contractHash,
                  orphanedGrounding: drift.orphanedGrounding,
                  ...(drift.safe
                    ? {
                        rederiveAction: `semantic-inventory-rederive-${finding.requirementId}`,
                      }
                    : drift.rederivableByDroppingGrounding
                      ? {
                          rederiveAction: `semantic-inventory-rederive-drop-grounding-${finding.requirementId}`,
                        }
                      : {
                          note: "After the mapping, kibi sync rejects this requirement until its inventory is fixed by hand; rerun kibi migrate for the semantic_inventory_review action.",
                        }),
                },
        },
      }),
    );
    if (target === null || drift === null) continue;
    const after = { actionId: id, status: target };
    if (drift.safe) actions.push(rederiveAction(drift, after));
    else if (drift.rederivableByDroppingGrounding)
      actions.push(dropGroundingAction(drift, after));
  }
  return actions;
}

/** The status mapping an approved req_status_vocabulary_map action lists. */
function plannedStatusMapping(action: MigrationAction): {
  path: string;
  from: string;
  to: string;
} {
  const path = action.affectedFiles[0];
  const from = action.evidence.status;
  const to = action.evidence.suggestedStatus;
  if (path === undefined || typeof from !== "string" || typeof to !== "string")
    throw new Error(
      "Requirement status mapping names no file or target status; set the status by hand.",
    );
  return { path, from, to };
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
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
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

// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
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
  /** The evidence ladder's floor verdicts on the synced store, when read. */
  ladderFloors?: LadderFloorVerdicts | null;
  /** Claim candidates of certificate contracts without proves, when read. */
  claimCandidates?: readonly ClaimCandidateRow[] | null;
}): Schema6MigrationFragment {
  const actions: MigrationAction[] = [];
  const sourceRewriteActionIds: string[] = [];
  const diagnostics: string[] = [];
  const polarityTargets = planPolarityValueBackfill(input.workspaceRoot);
  if (polarityTargets.length > 0) {
    const id = "polarity-value-backfill";
    sourceRewriteActionIds.push(id);
    actions.push(
      migrationAction({
        id,
        code: POLARITY_VALUE_BACKFILL_CODE,
        category: "schema",
        safety: "automatic",
        autoApplicable: true,
        invocation: { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
        affectedEntityIds: polarityTargets.map((row) => row.id),
        affectedFiles: polarityTargets.map((row) => row.path),
        postconditions: [{ rule: "strict-fact-shape", findings: 0 }],
        evidence: {
          count: polarityTargets.length,
          encoding: { operator: "eq", value_type: "bool", value_bool: true },
          preserves: "IDs, polarity and authored body",
        },
      }),
    );
  }
  // Entity files that take their type from the folder get it stated at any
  // schema version, so the first kb_upsert on one adds no type line.
  const typeBackfill = planEntityTypeBackfill(input.workspaceRoot);
  if (typeBackfill.targets.length > 0) {
    sourceRewriteActionIds.push(ENTITY_TYPE_BACKFILL_ACTION_ID);
    actions.push(
      migrationAction({
        id: ENTITY_TYPE_BACKFILL_ACTION_ID,
        code: ENTITY_TYPE_BACKFILL_CODE,
        category: "schema",
        safety: "automatic",
        autoApplicable: true,
        invocation: { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
        affectedEntityIds: typeBackfill.targets.map((row) => row.id),
        affectedFiles: typeBackfill.targets.map((row) => row.path),
        postconditions: [{ entitiesWithoutType: 0 }],
        evidence: {
          reason:
            "These entity files take their type from the folder. Every Kibi write states type in front matter, so the first kb_upsert on one would add a type line the change did not ask for. Each gets the folder-implied type as its last front matter key, the type kibi sync already reads.",
          count: typeBackfill.targets.length,
          byType: countByType(typeBackfill.targets),
          skipped: typeBackfill.skipped,
          preserves: "every other front matter key and the body bytes",
        },
      }),
    );
  }
  // Schema 8: pin the checked meaning, then acknowledge missing context. A
  // missing or invalid version upgrades through every step, so it is planned.
  if (
    input.currentSchemaVersion === null ||
    input.currentSchemaVersion < BODY_CONTEXT_SCHEMA_VERSION
  ) {
    const pins = planSemanticTextPins(input.workspaceRoot);
    if (pins.targets.length > 0) {
      const id = "semantic-text-pin";
      sourceRewriteActionIds.push(id);
      actions.push(
        migrationAction({
          id,
          code: SEMANTIC_TEXT_PIN_CODE,
          category: "schema",
          safety: "automatic",
          autoApplicable: true,
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          affectedEntityIds: pins.targets.map((row) => row.id),
          affectedFiles: pins.targets.map((row) => row.path),
          postconditions: [{ requirementsWithoutSemanticText: 0 }],
          evidence: {
            reason:
              "Schema 8 stops reading context sections (Context, Rationale, Why, Background, Source, Notes, Evidence) as part of a requirement's meaning. Requirements that never stated semantic_text get the value the old derivation produced, so claim spans and hashes do not move.",
            count: pins.targets.length,
            preserves: "every other front matter key and the body bytes",
          },
        }),
      );
    }
    const tags = planContextMissingTags(input.workspaceRoot);
    if (tags.targets.length > 0) {
      const id = "context-missing-tag";
      sourceRewriteActionIds.push(id);
      actions.push(
        migrationAction({
          id,
          code: CONTEXT_MISSING_TAG_CODE,
          category: "schema",
          safety: "automatic",
          autoApplicable: true,
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          dependsOn: pins.targets.length > 0 ? ["semantic-text-pin"] : [],
          affectedEntityIds: tags.targets.map((row) => row.id),
          affectedFiles: tags.targets.map((row) => row.path),
          postconditions: [{ rule: "entity-context-missing", findings: 0 }],
          evidence: {
            reason:
              "Schema 8 blocks current requirements, scenarios, tests, ADRs and observation facts whose body states no context. Existing ones are tagged review:context-missing (acknowledged legacy, counted by entity-context-acknowledged); no prose is written and no reason is invented.",
            count: tags.targets.length,
            byType: countByType(tags.targets),
            preserves: "every other front matter key and the body bytes",
          },
        }),
      );
    }
  }
  // Schema 9: acknowledge supersedes recorded before they had to explain
  // themselves. Manifest only; no source changes and no reason is written.
  if (
    input.currentSchemaVersion === null ||
    input.currentSchemaVersion < DECISION_FIRMNESS_SCHEMA_VERSION
  ) {
    const unexplained = planSupersedesReasonAcknowledgement(
      input.workspaceRoot,
    );
    if (unexplained.length > 0) {
      const id = "supersedes-reason-acknowledge";
      // Not a source rewrite, but the schema upgrade and the store sync
      // must wait for it like one: the bumped schema blocks without it.
      sourceRewriteActionIds.push(id);
      actions.push(
        migrationAction({
          id,
          code: SUPERSEDES_REASON_ACKNOWLEDGE_CODE,
          category: "schema",
          safety: "automatic",
          autoApplicable: true,
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          affectedEntityIds: unexplained.map((row) => row.id),
          affectedFiles: [".kb/manifest.json"],
          postconditions: [{ rule: "supersedes-reason-missing", findings: 0 }],
          evidence: {
            reason:
              "Schema 9 blocks a current requirement or ADR that supersedes another without a 'Why this changed' section. Existing ones are acknowledged in the manifest (counted by supersedes-reason-acknowledged); no reason is invented.",
            count: unexplained.length,
            byType: countByType(unexplained),
            preserves: "every authored source file",
          },
        }),
      );
    }
  }
  // Schema 10: a decision without firmness that an agent did not write now
  // reads as firm. Acknowledge supersedes of such decisions recorded before
  // that, so history does not block; new ones must come from a person.
  if (
    input.currentSchemaVersion === null ||
    input.currentSchemaVersion < FIRMNESS_FROM_ORIGIN_SCHEMA_VERSION
  ) {
    const edges = planFirmSupersedeAcknowledgement(input.workspaceRoot);
    if (edges.length > 0) {
      const id = "firm-supersede-acknowledge";
      // Manifest only, but the bumped schema blocks without it.
      sourceRewriteActionIds.push(id);
      actions.push(
        migrationAction({
          id,
          code: FIRM_SUPERSEDE_ACKNOWLEDGE_CODE,
          category: "schema",
          safety: "automatic",
          autoApplicable: true,
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          affectedEntityIds: [
            ...new Set(edges.map((edge) => edge.split(" -> ")[0] ?? edge)),
          ].sort(),
          affectedFiles: [".kb/manifest.json"],
          postconditions: [{ rule: "decision-firm-superseded", findings: 0 }],
          evidence: {
            reason:
              "Schema 10 reads a requirement or ADR without firmness as firm unless an agent wrote it, and blocks a replacement of a firm decision that is not itself firm. Supersedes recorded before that are acknowledged in the manifest; no firmness is written.",
            count: edges.length,
            edges,
            preserves: "every authored source file",
          },
        }),
      );
    }
  }
  // Schema 11: a firm requirement needs tested evidence. Record an asserted
  // floor on current firm requirements without a passing proof path, so the
  // upgraded knowledge base passes evidence-floor.
  if (
    input.currentSchemaVersion === null ||
    input.currentSchemaVersion < EVIDENCE_FLOOR_SCHEMA_VERSION
  ) {
    const floors = planEvidenceFloorPins(
      input.workspaceRoot,
      input.ladderFloors,
    );
    if (floors.targets.length > 0) {
      const id = "evidence-floor-pin";
      sourceRewriteActionIds.push(id);
      actions.push(
        migrationAction({
          id,
          code: EVIDENCE_FLOOR_PIN_CODE,
          category: "schema",
          safety: "automatic",
          autoApplicable: true,
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          affectedEntityIds: floors.targets.map((row) => row.id),
          affectedFiles: floors.targets.map((row) => row.path),
          postconditions: [{ rule: "evidence-floor", findings: 0 }],
          evidence: {
            reason:
              "Schema 11 fails a current requirement whose evidence is below its floor, and a firm requirement without required_evidence needs tested evidence. These firm requirements are below tested (judged by the evidence ladder on the synced store when one could be read, else by their latest end-to-end receipt), so each records required_evidence: asserted in its front matter, where a reviewer can raise it once a proof exists.",
            count: floors.targets.length,
            skipped: floors.skipped,
            preserves: "every other front matter key and the body bytes",
          },
        }),
      );
    }
  }
  // Schema 12: a certificate contract names the claims it proves. Pin proves
  // where the test reaches one provable claim; list the rest for review.
  if (
    (input.currentSchemaVersion === null ||
      input.currentSchemaVersion < CLAIM_BINDING_SCHEMA_VERSION) &&
    input.claimCandidates
  ) {
    const claims = planProofContractClaimPins(
      input.workspaceRoot,
      input.claimCandidates,
    );
    if (claims.targets.length > 0) {
      const id = "proof-contract-claims-pin";
      sourceRewriteActionIds.push(id);
      actions.push(
        migrationAction({
          id,
          code: PROOF_CONTRACT_CLAIMS_PIN_CODE,
          category: "schema",
          safety: "automatic",
          autoApplicable: true,
          invocation: {
            kind: "cli",
            command_argv: ["kibi", "migrate", "--yes"],
          },
          affectedEntityIds: claims.targets.map((row) => row.id),
          affectedFiles: claims.targets.map((row) => row.path),
          evidence: {
            reason:
              "Schema 12 requires every certificate-kind proof contract to name the claims it proves. Each of these tests reaches exactly one claim its proof kind can derive an obligation for, so the migration writes it to proof_contract.proves. The contract changes, so run kibi prove for these tests afterwards.",
            count: claims.targets.length,
            skipped: claims.skipped,
            preserves: "every other front matter key and the body bytes",
          },
        }),
      );
    }
    for (const row of claims.review)
      actions.push(
        migrationAction({
          id: `proof-contract-claims-review-${row.id}`,
          code: PROOF_CONTRACT_CLAIMS_REVIEW_CODE,
          category: "semantic",
          safety: "review",
          invocation: {
            kind: "review",
            instruction: claimReviewInstruction(row),
          },
          affectedEntityIds: [row.id],
          affectedFiles: [row.path],
          postconditions: [
            { rule: "proof-contract-claims", entityId: row.id, findings: 0 },
          ],
          dispositionRequired: true,
          allowedDispositions: ["fixed", "deferred"],
          evidence: { kind: row.kind, candidates: row.candidates },
        }),
      );
  }
  const drift = planInventoryRederivation(input.workspaceRoot);
  for (const plan of drift) {
    const action = plan.safe ? rederiveAction(plan) : reviewAction(plan);
    actions.push(action);
    if (plan.safe) sourceRewriteActionIds.push(action.id);
    if (!plan.safe && plan.rederivableByDroppingGrounding)
      actions.push(dropGroundingAction(plan));
  }
  // Requirements with a status outside the vocabulary: delivery statuses are
  // mapped automatically; any other mapping is a review, and its latent drift
  // is re-derived only after an approved mapping.
  const statusActions = requirementStatusActions(input.workspaceRoot);
  actions.push(...statusActions);
  if (
    statusActions.some(
      (action) => action.id === REQ_STATUS_DELIVERED_MAP_ACTION_ID,
    )
  )
    sourceRewriteActionIds.push(REQ_STATUS_DELIVERED_MAP_ACTION_ID);
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
  // Coarse symbol links the staged gate would block are marked at any schema
  // version, by the gate's own rule.
  const legacyLinks = symbolLegacyLinkAction(input.workspaceRoot);
  if (legacyLinks !== null) {
    actions.push(legacyLinks);
    sourceRewriteActionIds.push(legacyLinks.id);
  }
  return { actions, sourceRewriteActionIds, diagnostics };
}

/**
 * Actions for the superseded-requirement-open and source-path-dangling
 * findings in authored sources: close superseded requirements, and rewrite
 * moved or remove redundant and dead source values, automatically; one
 * review per supersession cycle and per source value Kibi cannot edit
 * safely. Read-only.
 */
// implements REQ-cli-schema-migration, REQ-core-validation-rules, REQ-kibi-schema6-migration
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
  const repairs = findSourceRepairs(workspaceRoot);
  for (const repair of repairs) {
    if (repair.refused === undefined) continue;
    actions.push(
      migrationAction(
        sourcePathReviewActionInput({
          entityId: repair.entityId,
          ...(repair.field === "text_ref"
            ? { field: "text_ref" as const }
            : {}),
          value: repair.value,
          file: repair.file,
          reason: repair.refused,
          ...(repair.fix.kind === "rewrite" ? { rewrite: repair.fix.to } : {}),
        }),
      ),
    );
  }
  const planned = plannedSourcePathRepairs(repairs);
  if (planned.rewrites.length > 0 || planned.removals.length > 0) {
    actions.push(migrationAction(sourcePathRewriteActionInput(planned)));
    sourceRewriteActionIds.push(SOURCE_PATH_REWRITE_ACTION_ID);
  }
  return { actions, sourceRewriteActionIds };
}

/**
 * The automatic legacy-link pass over `.kb/symbols.yaml`, bound to the
 * manifest bytes it was planned from; null when no link needs a mark.
 */
// implements REQ-cli-schema-migration, REQ-symbol-behavioral-anchors
export function symbolLegacyLinkAction(
  workspaceRoot: string,
): MigrationAction | null {
  const plan = planSymbolLegacyLinks(workspaceRoot);
  if (plan.targets.length === 0) return null;
  return migrationAction({
    id: SYMBOL_LEGACY_LINK_MARK_ACTION_ID,
    code: SYMBOL_LEGACY_LINK_MARK_CODE,
    category: "symbol",
    safety: "automatic",
    autoApplicable: true,
    invocation: { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
    affectedEntityIds: plan.targets.map((target) => target.id),
    // A mark changes the record's coordinate identity, so the action also
    // regenerates the coordinate artifact.
    affectedFiles: [plan.manifestPath, KB_PATHS.symbolCoordinates],
    postconditions: [{ rule: "symbol_granularity_violation", findings: 0 }],
    evidence: {
      reason:
        "These symbols link a source file coarsely while it declares narrower behavioral symbols, so the staged check (kibi check --staged) blocks the next commit that touches them. Each gets granularity_reason: legacy-link (accepted legacy granularity); no link moves and no other field changes.",
      count: plan.targets.length,
      manifestHash: plan.manifestHash,
      symbols: plan.targets,
    },
  });
}

/** The sync that recompiles sources rewritten by earlier actions. */
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
export function migrationSyncAction(
  dependsOn: readonly string[],
): MigrationAction {
  return migrationAction(migrationSyncActionInput(dependsOn));
}

function plannedRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (raw): raw is Record<string, unknown> =>
      raw !== null && typeof raw === "object" && !Array.isArray(raw),
  );
}

/** The rewrites and removals an approved source_path_rewrite action lists. */
// implements REQ-kibi-schema6-migration
function plannedRepairs(action: MigrationAction): PlannedSourcePathRepairs {
  const rewrites: SourcePathRewrite[] = [];
  for (const { entityId, file, field, from, to } of plannedRecords(
    action.evidence.rewrites,
  )) {
    if (
      typeof entityId === "string" &&
      typeof file === "string" &&
      typeof from === "string" &&
      typeof to === "string"
    ) {
      rewrites.push({
        entityId,
        file,
        ...(field === "text_ref" ? { field } : {}),
        from,
        to,
      });
    }
  }
  const removals: SourcePathRemoval[] = [];
  for (const { entityId, file, from, reason } of plannedRecords(
    action.evidence.removals,
  )) {
    if (
      typeof entityId === "string" &&
      typeof file === "string" &&
      typeof from === "string" &&
      (reason === "self" || reason === "dangling")
    ) {
      removals.push({ entityId, file, from, reason });
    }
  }
  return { rewrites, removals };
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
    case POLARITY_VALUE_BACKFILL_CODE: {
      applyPolarityValueBackfill(context.workspaceRoot);
      return;
    }
    case ENTITY_TYPE_BACKFILL_CODE: {
      const result = applyEntityTypeBackfill(context.workspaceRoot);
      if (result.skipped.length > 0)
        throw new Error(
          `Could not state the type of ${result.skipped.map((skip) => `${skip.path} (${skip.reason})`).join(", ")}; add the type line by hand.`,
        );
      return;
    }
    case SEMANTIC_TEXT_PIN_CODE: {
      applySemanticTextPins(context.workspaceRoot);
      return;
    }
    case CONTEXT_MISSING_TAG_CODE: {
      applyContextMissingTags(context.workspaceRoot);
      return;
    }
    case SUPERSEDES_REASON_ACKNOWLEDGE_CODE: {
      applySupersedesReasonAcknowledgement(context.workspaceRoot);
      return;
    }
    case FIRM_SUPERSEDE_ACKNOWLEDGE_CODE: {
      applyFirmSupersedeAcknowledgement(context.workspaceRoot);
      return;
    }
    case EVIDENCE_FLOOR_PIN_CODE: {
      // The plan decided the pins with the evidence ladder; apply the same
      // set even though source rewrites before it may have left the store
      // behind the authored files.
      applyEvidenceFloorPins(
        context.workspaceRoot,
        new Map(
          (action.affectedEntityIds ?? []).map((id) => [id, "below"] as const),
        ),
      );
      return;
    }
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
    case REQ_STATUS_VOCABULARY_MAP_CODE: {
      const mapping = plannedStatusMapping(action);
      applyRequirementStatusMapping(
        context.workspaceRoot,
        mapping.path,
        mapping.from,
        mapping.to,
      );
      return;
    }
    case REQ_STATUS_DELIVERED_MAP_CODE: {
      const result = applyDeliveredStatusMappings(
        context.workspaceRoot,
        new Set(action.affectedEntityIds),
      );
      if (result.skipped.length > 0)
        throw new Error(
          `Could not map the status of ${result.skipped.map((skip) => `${skip.path} (${skip.reason})`).join(", ")}; set status: closed and add the tag implemented by hand.`,
        );
      return;
    }
    case SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE: {
      const requirementId = action.affectedEntityIds[0];
      const contractHash = action.evidence.contractHash;
      if (requirementId === undefined || typeof contractHash !== "string")
        throw new Error(
          "Inventory re-derivation names no requirement or contract hash.",
        );
      applyInventoryRederivationDroppingGrounding(
        context.workspaceRoot,
        requirementId,
        contractHash,
        plannedDrops(action),
      );
      return;
    }
    case ENTITY_ORIGIN_BACKFILL_CODE:
      applyOriginBackfill(context.workspaceRoot, context.clock().toISOString());
      return;
    case SYMBOL_LEGACY_LINK_MARK_CODE: {
      const before = readGeneratedManifestBytes(context.workspaceRoot);
      const result = applySymbolLegacyLinks(context.workspaceRoot, {
        ...(typeof action.evidence.manifestHash === "string"
          ? { expectedHash: action.evidence.manifestHash }
          : {}),
        expectedIds: action.affectedEntityIds,
      });
      if (result.unmarked.length > 0)
        throw new Error(
          `Could not mark ${result.unmarked.join(", ")} as legacy-link in place; add granularity_reason: legacy-link to them by hand.`,
        );
      // A legacy-link mark changes the record's coordinate identity; keep
      // the generated artifact current so the next commit carries no drift.
      const refresh = await refreshCoordinatesAfterMigration(
        context.workspaceRoot,
        before,
      );
      if (refresh.outcome === "failed")
        console.warn(
          `Warning: ${coordinateRefreshFailureMessage(refresh.reason)}`,
        );
      return;
    }
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
      const result = applySourcePathRepairs(
        context.workspaceRoot,
        plannedRepairs(action),
      );
      if (result.skipped.length > 0)
        throw new Error(
          `Could not repair the source of ${result.skipped.map((skip) => `${skip.file} (${skip.reason})`).join(", ")}; rerun kibi migrate and approve the new plan.`,
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

/**
 * Review actions Kibi can execute, but only when a person approves them by
 * id (`--approved-action`): `--apply-safe` selects automatic actions alone.
 */
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration, REQ-agent-guided-migration-orchestration
export const SCHEMA6_APPROVABLE_REVIEW_CODES: ReadonlySet<string> = new Set([
  SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE,
  REQ_STATUS_VOCABULARY_MAP_CODE,
  // A re-derivation that waits on an approved status mapping.
  SEMANTIC_INVENTORY_REDERIVE_CODE,
]);

// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
export const SCHEMA6_AUTOMATIC_CODES: ReadonlySet<string> = new Set([
  POLARITY_VALUE_BACKFILL_CODE,
  ENTITY_TYPE_BACKFILL_CODE,
  SEMANTIC_TEXT_PIN_CODE,
  CONTEXT_MISSING_TAG_CODE,
  SUPERSEDES_REASON_ACKNOWLEDGE_CODE,
  FIRM_SUPERSEDE_ACKNOWLEDGE_CODE,
  EVIDENCE_FLOOR_PIN_CODE,
  SEMANTIC_INVENTORY_REDERIVE_CODE,
  REQ_STATUS_DELIVERED_MAP_CODE,
  ENTITY_ORIGIN_BACKFILL_CODE,
  CLOSE_SUPERSEDED_REQUIREMENTS_CODE,
  SOURCE_PATH_REWRITE_CODE,
  SYMBOL_LEGACY_LINK_MARK_CODE,
  MIGRATION_SYNC_CODE,
]);
