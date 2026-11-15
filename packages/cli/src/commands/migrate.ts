/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { countByType } from "../operations/migration/entity-body-context.js";
import {
  applyEntityTypeBackfill,
  planEntityTypeBackfill,
} from "../operations/migration/entity-type.js";
import {
  type InventoryRederivation,
  applySafeInventoryRederivations,
  planInventoryRederivation,
} from "../operations/migration/inventory-rederive.js";
import {
  applyOriginBackfill,
  planOriginBackfill,
} from "../operations/migration/origin-backfill.js";
import {
  type ProofContractClaimsPlan,
  claimReviewInstruction,
} from "../operations/migration/proof-contract-claims.js";
import {
  type RequirementStatusFinding,
  applyDeliveredStatusMappings,
  planRequirementStatusMappings,
} from "../operations/migration/requirement-status.js";
import {
  applySourcePathRepairs,
  findSourceRepairs,
} from "../operations/migration/source-paths.js";
import {
  applySupersededClosures,
  planSupersededClosures,
} from "../operations/migration/superseded-closure.js";
import {
  type GeneratedManifestBytes,
  coordinateRefreshFailureMessage,
  readGeneratedManifestBytes,
  refreshCoordinatesAfterMigration,
} from "../operations/migration/symbol-coordinates-refresh.js";
import {
  applySymbolLegacyLinks,
  planSymbolLegacyLinks,
} from "../operations/migration/symbol-legacy-links.js";
import type {
  MigrationAction,
  MigrationPlan,
  MigrationPlanDigest,
} from "../public/operations/migration-plan.js";
import { noteCliErrorCategory } from "../usage-telemetry.js";
import { resolveBranchAttachment } from "../utils/branch-resolver.js";
import {
  defaultKbManifest,
  readKbManifest,
  readKbManifestStatus,
  writeKbManifest,
} from "../utils/kb-manifest.js";
import { CANONICAL_ENTITY_PATHS, KB_PATHS } from "../utils/kb-paths.js";
import {
  manifestMergeDriverGaps,
  mergeDriverSetup,
} from "../utils/merge-driver-setup.js";
import {
  LATEST_KB_SCHEMA_VERSION,
  getSchemaVersionStatus,
  normalizeSchemaVersion,
} from "../utils/schema-version.js";
import { updateGitIgnore } from "./init-helpers.js";
import {
  applyLegacyStorageMigration,
  planLegacyStorageMigration,
} from "./legacy-storage-migration.js";
import {
  describePlanChange,
  findPrintedPlan,
  recordPrintedPlan,
} from "./migrate-plan-record.js";

interface MigrateOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "table";
  /** `--apply-safe [sha256]`: true, or the approved plan hash given with it. */
  applySafe?: boolean | string;
  approvedPlanHash?: string;
  approvedActionIds?: string[];
  /** `--approved-action <id>` as the CLI parser spells it; same as approvedActionIds. */
  approvedAction?: string[];
  /** List every quality and coverage backlog action, not only their counts. */
  backlog?: boolean;
  workspaceRoot?: string;
  /** Internal migration-plan executor: create only the canonical baseline manifest. */
  initializeMissingConfig?: boolean;
  /**
   * Compile the branch store after `--yes` rewrote sources (default true).
   * The plan executor passes false: its plan runs the sync as its own action.
   */
  syncStore?: boolean;
}

export interface MigrationAuditRecord {
  auditVersion: number;
  branch: string;
  manifestPath: string;
  fromVersion: number | null;
  migratedAt: string;
  semanticAdvisorBackfill: "pending" | "completed" | "not_applicable" | null;
  status: "applied";
  symbolGranularityLegacyLinks: number;
  /** Entities carrying origin {kind: migration, ref: 'kibi migrate v5->v6'}. */
  entityOriginBackfill: number;
  /** Superseded requirements this run set to status: closed. */
  supersededRequirementsClosed: number;
  /** Pre-canonical source paths this run pointed at their .kb/ file. */
  sourcePathsRewritten: number;
  /** Authored source values this run removed: they named the entity's own file or nothing. */
  sourcePathsRemoved: number;
  /** Requirements whose delivery status (implemented, done, completed) this run mapped to closed plus tag implemented. */
  legacyStatusesMapped: number;
  toVersion: number;
  /** The schema warning the KB showed before this run migrated it. */
  preMigrationWarning: string | null;
  steps: readonly string[];
}

/** What one applied `kibi migrate --yes` run changed, for plan apply results. */
export interface MigrationRunSummary {
  /** Workspace-relative path of the audit record this run wrote. */
  auditPath: string;
  audit: MigrationAuditRecord;
  /** Whether this run added the canonical derived entries to .gitignore. */
  gitignoreUpdated: boolean;
}

interface SchemaMigrationStep {
  id: string;
  from: number;
  to: number;
}

interface ResolvedBranch {
  branch: string;
  warnings: string[];
}

const MIGRATION_AUDIT_VERSION = 1;

const SCHEMA_MIGRATION_STEPS: readonly SchemaMigrationStep[] = [
  // Preserve legacy configuration while recording canonical schema metadata.
  {
    id: "config-canonical-v1",
    from: 0,
    to: 1,
  },
  // Mark provable coarse traceability links as legacy-link.
  {
    id: "symbol-granularity-v2",
    from: 1,
    to: 2,
  },
  // Record an audited compatibility no-op for schema v3.
  {
    id: "compatibility-v3",
    from: 2,
    to: 3,
  },
  // Mark semantic-advisor backfill as pending without inventing claims.
  {
    id: "semantic-backfill-v4",
    from: 3,
    to: 4,
  },
  // Move Kibi knowledge into the canonical .kb/ namespace and retire
  // .kb/config.json.
  {
    id: "canonical-storage-v5",
    from: 4,
    to: 5,
  },
  // Record origin {kind: migration} on authored entities written before schema
  // 6, close superseded requirements, and repair authored source fields (point
  // moved knowledge files at .kb/, remove redundant and dead values).
  {
    id: "entity-origin-v6",
    from: 5,
    to: 6,
  },
  // Encode legacy polarity-only property facts as eq boolean true with
  // require/forbid polarity; strict fact shapes are blocking.
  {
    id: "polarity-values-v7",
    from: 6,
    to: 7,
  },
  // Pin semantic_text on requirements that lack it (computed from the body
  // before context sections stop counting), and tag current entities without
  // body context review:context-missing; front matter only, bodies are
  // preserved.
  {
    id: "entity-body-context-v8",
    from: 7,
    to: 8,
  },
  // Accept firmness on requirements and ADRs, and acknowledge in the manifest
  // the current supersedes recorded without a 'Why this changed' section; no
  // source file is rewritten and no reason is invented.
  {
    id: "decision-firmness-v9",
    from: 8,
    to: 9,
  },
  // Read a requirement or ADR without firmness as firm unless an agent wrote
  // it, and acknowledge in the manifest the supersedes of such decisions
  // recorded before; no source file is rewritten and no firmness is written.
  {
    id: "firmness-from-origin-v10",
    from: 9,
    to: 10,
  },
  // Check every current requirement's evidence level against its floor
  // (required_evidence, else tested when firm), and record required_evidence:
  // asserted on current firm requirements that have no scenario verified by a
  // test with a proof contract; front matter only.
  {
    id: "evidence-floor-v11",
    from: 10,
    to: 11,
  },
  // Require every certificate-kind proof contract to name the requirement
  // claims it proves, and pin proves on contracts whose test reaches exactly
  // one claim the proof kind can derive an obligation for; front matter only.
  // Other contracts are listed for a person to bind.
  {
    id: "claim-bound-proofs-v12",
    from: 11,
    to: 12,
  },
  // Derive symbol coordinates on every sync instead of committing them: add
  // .kb/symbol-coordinates.yaml to .gitignore and remove it from the Git index
  // (the local file stays).
  {
    id: "derived-symbol-coordinates-v13",
    from: 12,
    to: 13,
  },
  // Accept status retired (with retired_reason) on requirements and block
  // current facts, scenarios and tests owned only by retired requirements.
  // No source is rewritten: closed requirements whose source says they were
  // retired are listed for a person to approve (req_retired_status_suggest).
  {
    id: "retired-status-v14",
    from: 13,
    to: 14,
  },
  // Give a requirement a person approved (origin.approved_by) the tested
  // floor unless it sets required_evidence or states its firmness, and record
  // required_evidence: asserted on current approved requirements without a
  // passing proof path; front matter only.
  {
    id: "approval-floor-v15",
    from: 14,
    to: 15,
  },
  // Require a definition on every subject fact, no duplicate subjects, and
  // subjects on every unmodeled claim. No source is rewritten on its own: a
  // claim's suggested subject is written only once a person approves it
  // (claim_subject_anchor_suggest); the rest is listed for review.
  {
    id: "domain-subjects-v16",
    from: 15,
    to: 16,
  },
  // Require a success scenario that assumes facts on its subjects for every
  // must requirement written from now on. The current must requirements are
  // acknowledged in the manifest; no source is rewritten.
  {
    id: "positive-scenarios-v17",
    from: 16,
    to: 17,
  },
  // related-requirement-unmodeled blocks every stored pair (a relates_to edge
  // or a shared subject) with an unmodeled rule claim until the claims are
  // modeled or a pair_reviews verdict settles the pair. A verdict is a
  // judgement Kibi never makes, so nothing is written; kibi check lists the
  // pairs.
  {
    id: "pair-reviews-v18",
    from: 17,
    to: 18,
  },
];

function migrationStepsFor(
  fromVersion: number | null,
): readonly SchemaMigrationStep[] {
  const start = Math.max(0, fromVersion ?? 0);
  return SCHEMA_MIGRATION_STEPS.filter((step) => step.from >= start);
}

function printWarning(message: string): void {
  console.log(`Warning: ${message}`);
}

function printClaimBindingReview(
  plan: ProofContractClaimsPlan,
  noStore: boolean,
  dryRun: boolean,
): void {
  const prefix = dryRun ? "dry run: " : "";
  if (noStore)
    console.log(
      `${prefix}no synced store could be read, so no proof_contract.proves was pinned; run kibi sync and rerun kibi migrate, or add proves by hand where kibi check --rules proof-contract-claims reports a contract.`,
    );
  for (const row of plan.review)
    console.log(`${prefix}${claimReviewInstruction(row)}`);
  for (const skip of plan.skipped)
    printWarning(`Cannot pin proves on ${skip.path}: ${skip.reason}.`);
}

function toRelativePath(cwd: string, filePath: string): string {
  return path.relative(cwd, filePath);
}

function resolveMigrationBranch(
  cwd: string,
): ResolvedBranch | { error: string } {
  const result = resolveBranchAttachment(cwd);

  if ("error" in result) {
    const isNonGitContext =
      result.code === "NOT_A_GIT_REPO" || result.code === "GIT_NOT_AVAILABLE";

    if (isNonGitContext) {
      return {
        error:
          "Not in a git repository; set KIBI_BRANCH explicitly for migration audit metadata.",
      };
    }

    return {
      error: `Failed to resolve active branch: ${result.error}`,
    };
  }

  if (result.migrationRequired) {
    return {
      error: `Legacy branch attachment for '${result.gitBranch}' requires 'kibi branch migrate --from ${result.kbBranch} --to ${result.gitBranch} --apply' before schema migration.`,
    };
  }
  return { branch: result.kbBranch, warnings: [] };
}

function writeJsonAtomically(filePath: string, value: unknown): void {
  writeTextAtomically(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTextAtomically(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });

  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, content);
  renameSync(tempPath, filePath);
}

export function formatSchemaVersion(
  rawSchemaVersion: unknown,
  normalized: number | null,
): string {
  if (normalized === null) {
    if (rawSchemaVersion === undefined) {
      return "missing";
    }

    return `invalid (${JSON.stringify(rawSchemaVersion)})`;
  }

  return String(normalized);
}

function buildMigrationAuditRecord(args: {
  branch: string;
  manifestPath: string;
  fromVersion: number | null;
  migratedAt: string;
  semanticAdvisorBackfill: "pending" | "completed" | "not_applicable" | null;
  symbolGranularityLegacyLinks: number;
  entityOriginBackfill: number;
  supersededRequirementsClosed: number;
  sourcePathsRewritten: number;
  sourcePathsRemoved: number;
  legacyStatusesMapped: number;
  preMigrationWarning: string | null;
  steps: readonly string[];
}): MigrationAuditRecord {
  return {
    auditVersion: MIGRATION_AUDIT_VERSION,
    branch: args.branch,
    manifestPath: args.manifestPath,
    fromVersion: args.fromVersion,
    migratedAt: args.migratedAt,
    semanticAdvisorBackfill: args.semanticAdvisorBackfill,
    status: "applied",
    symbolGranularityLegacyLinks: args.symbolGranularityLegacyLinks,
    entityOriginBackfill: args.entityOriginBackfill,
    supersededRequirementsClosed: args.supersededRequirementsClosed,
    sourcePathsRewritten: args.sourcePathsRewritten,
    sourcePathsRemoved: args.sourcePathsRemoved,
    legacyStatusesMapped: args.legacyStatusesMapped,
    toVersion: LATEST_KB_SCHEMA_VERSION,
    preMigrationWarning: args.preMigrationWarning,
    steps: args.steps,
  };
}

function normalizeSemanticAdvisorBackfill(
  value: unknown,
): "pending" | "completed" | "not_applicable" | null {
  return value === "pending" ||
    value === "completed" ||
    value === "not_applicable"
    ? value
    : null;
}

/**
 * Mark the coarse symbol links the staged granularity gate would block as
 * legacy-link. Runs at any schema version: the rule can call a link coarse
 * that an older run (or a KB that skipped the schema 2 step) left unmarked.
 */
function markLegacySymbolLinks(
  cwd: string,
  dryRun: boolean,
  manifestPath?: string,
): number {
  if (dryRun) {
    const count = planSymbolLegacyLinks(cwd, manifestPath).targets.length;
    if (count > 0)
      console.log(
        `dry run: would mark ${count} coarse symbol link(s) as legacy-link (granularity_reason), so the staged check accepts them.`,
      );
    return count;
  }
  const { marked, unmarked } = applySymbolLegacyLinks(cwd);
  if (marked.length > 0)
    console.log(
      `Marked ${marked.length} existing coarse symbol link(s) as legacy-link.`,
    );
  if (unmarked.length > 0)
    printWarning(
      `Could not mark ${unmarked.join(", ")} as legacy-link in place; add granularity_reason: legacy-link to them in ${CANONICAL_ENTITY_PATHS.symbols} by hand.`,
    );
  return marked.length;
}

/**
 * Refresh generated symbol coordinates after the migration rewrote or moved
 * .kb/symbols.yaml, so the first commit does not hit the generated-manifest
 * gate. A failure leaves the migration applied and names the manual step.
 */
async function refreshMigratedSymbolCoordinates(
  cwd: string,
  before: GeneratedManifestBytes,
): Promise<void> {
  const refresh = await refreshCoordinatesAfterMigration(cwd, before);
  if (refresh.outcome === "refreshed")
    console.log(
      "Refreshed generated symbol coordinates for the migrated .kb/symbols.yaml; stage .kb/symbols.yaml with the migration.",
    );
  else if (refresh.outcome === "failed")
    printWarning(coordinateRefreshFailureMessage(refresh.reason));
}

function describeRederivation(plan: InventoryRederivation): string {
  const { keptModeled, roleChanges, newlyUnresolved, downgradedModeled } =
    plan.summary;
  return `${plan.requirementId}: ${keptModeled} modeled claim(s) kept, ${roleChanges} role change(s), ${newlyUnresolved} claim(s) now unresolved, ${downgradedModeled} modeled claim(s) downgraded`;
}

function printManualRederivations(plans: readonly InventoryRederivation[]) {
  for (const plan of plans) {
    printWarning(
      `${plan.requirementId} (${plan.path}) no longer matches the current semantic advisor and needs a manual fix: ${plan.reasons.join("; ")}. Run 'kibi migrate --format json' for the exact repair steps.${plan.rederivableByDroppingGrounding ? ` Or approve semantic-inventory-rederive-drop-grounding-${plan.requirementId} with --apply-safe --approved-action to drop the ${plan.orphanedGrounding.length} orphaned grounding link(s).` : ""}`,
    );
  }
}

/**
 * Re-derive semantic inventories that drifted with the current advisor. Safe
 * re-derivations keep every claim whose claim_key and text still match;
 * anything else is reported for a manual fix.
 */
function rederiveDriftedInventories(
  cwd: string,
  dryRun: boolean,
): { rederived: number; manual: number } {
  if (dryRun) {
    const plans = planInventoryRederivation(cwd);
    const safe = plans.filter((candidate) => candidate.safe);
    for (const plan of safe) {
      console.log(
        `dry run: would re-derive the semantic inventory of ${describeRederivation(plan)}.`,
      );
    }
    const manual = plans.filter((candidate) => !candidate.safe);
    printManualRederivations(manual);
    return { rederived: safe.length, manual: manual.length };
  }
  const plans = planInventoryRederivation(cwd);
  const result = applySafeInventoryRederivations(cwd);
  const rederived = result.rederived
    .filter((outcome) => outcome.outcome === "rederived")
    .map((outcome) => outcome.requirementId);
  for (const plan of plans.filter((candidate) =>
    rederived.includes(candidate.requirementId),
  )) {
    console.log(
      `Re-derived the semantic inventory of ${describeRederivation(plan)}.`,
    );
  }
  printManualRederivations(result.manual);
  return { rederived: rederived.length, manual: result.manual.length };
}

type LifecycleRepairOutcome = {
  closed: number;
  rewritten: number;
  removed: number;
  manual: number;
};

const REMOVED_SOURCES_NOTE =
  "the compiled source is always the entity's own file";

/**
 * Close superseded requirements and repair authored source fields: point
 * moved knowledge files at .kb/, and remove values that name the entity's
 * own file or nothing Kibi can map. Superseded requirements and dangling
 * sources block kibi check, so this runs at any schema version.
 * Supersession cycles and source fields Kibi cannot edit safely are left for
 * a person and reported as warnings.
 */
function repairLifecycleFindings(
  cwd: string,
  dryRun: boolean,
): LifecycleRepairOutcome {
  const supersession = planSupersededClosures(cwd);
  let closed = supersession.closures.length;
  let rewritten = 0;
  let removed = 0;
  let unrepaired: Array<{ file: string; reason: string }> = [];
  if (dryRun) {
    const repairs = findSourceRepairs(cwd);
    for (const repair of repairs) {
      if (repair.refused !== undefined) {
        unrepaired.push({ file: repair.file, reason: repair.refused });
      } else if (repair.fix.kind === "rewrite") {
        rewritten += 1;
      } else {
        removed += 1;
      }
    }
    if (closed > 0) {
      console.log(
        `dry run: would close ${closed} superseded requirement(s): ${supersession.closures.map((closure) => closure.id).join(", ")}.`,
      );
    }
    if (rewritten > 0) {
      console.log(
        `dry run: would point ${rewritten} pre-canonical source or text_ref path(s) at their .kb/ files.`,
      );
    }
    if (removed > 0) {
      console.log(
        `dry run: would remove ${removed} redundant or dead source field(s); ${REMOVED_SOURCES_NOTE}.`,
      );
    }
  } else {
    const closures = applySupersededClosures(cwd);
    closed = closures.closed.length;
    if (closed > 0) {
      console.log(
        `Closed ${closed} superseded requirement(s): ${closures.closed.map((closure) => closure.id).join(", ")}.`,
      );
    }
    for (const skip of closures.skipped) {
      printWarning(`Status not set for ${skip.path}: ${skip.reason}.`);
    }
    const repairs = applySourcePathRepairs(cwd);
    rewritten = repairs.rewritten.length;
    removed = repairs.removed.length;
    unrepaired = [...repairs.skipped];
    if (rewritten > 0) {
      console.log(
        `Pointed ${rewritten} pre-canonical source or text_ref path(s) at their .kb/ files.`,
      );
    }
    if (removed > 0) {
      console.log(
        `Removed ${removed} redundant or dead source field(s); ${REMOVED_SOURCES_NOTE}.`,
      );
    }
  }
  for (const cycle of supersession.cycles) {
    printWarning(
      `Requirements ${cycle.members.join(", ")} supersede each other; decide which one is current, remove the supersedes link that points at it, and close the others.`,
    );
  }
  for (const skip of unrepaired) {
    printWarning(
      `Path field of ${skip.file} not repaired: ${skip.reason}; a person edits it by hand (kibi migrate --format json lists it as review_source_path_dangling).`,
    );
  }
  return {
    closed,
    rewritten,
    removed,
    manual: supersession.cycles.length + unrepaired.length,
  };
}

function describeDeliveredMappings(
  findings: readonly RequirementStatusFinding[],
): string {
  // The first finding of each status names the mapping for the group; a
  // missing one means the delivered default.
  const byStatus = new Map<
    string,
    { to: RequirementStatusFinding["automatic"]; ids: string[] }
  >();
  for (const finding of findings) {
    const group = byStatus.get(finding.status) ?? {
      to: finding.automatic,
      ids: [],
    };
    group.ids.push(finding.requirementId);
    byStatus.set(finding.status, group);
  }
  return [...byStatus]
    .map(
      ([status, { to, ids }]) =>
        `legacy status ${status} -> ${to?.status ?? "closed"} (tag ${to?.tag ?? "implemented"}) on ${ids.length} requirement(s): ${ids.join(", ")}`,
    )
    .join("; ");
}

/**
 * Map delivery statuses (implemented, done, completed) to closed plus the tag
 * implemented: kibi sync cannot compile them, and that is their one lossless
 * reading. Returns the requirement statuses a person still has to decide.
 */
function mapLegacyRequirementStatuses(
  cwd: string,
  dryRun: boolean,
): { mapped: number; review: RequirementStatusFinding[] } {
  const findings = planRequirementStatusMappings(cwd);
  const delivered = findings.filter((finding) => finding.automatic !== null);
  if (dryRun) {
    const review = findings.filter((finding) => finding.automatic === null);
    if (delivered.length > 0)
      console.log(
        `dry run: would map ${describeDeliveredMappings(delivered)}.`,
      );
    if (review.length > 0)
      console.log(
        `dry run: ${review.length} requirement status(es) need a person to choose the current status: ${review.map((finding) => `${finding.requirementId} (${finding.status})`).join(", ")}; kibi migrate --format json lists them as req_status_vocabulary_map.`,
      );
    return { mapped: delivered.length, review };
  }
  if (delivered.length === 0) return { mapped: 0, review: findings };
  const result = applyDeliveredStatusMappings(cwd);
  if (result.mapped.length > 0)
    console.log(`Mapped ${describeDeliveredMappings(result.mapped)}.`);
  for (const skip of result.skipped)
    printWarning(`Status not mapped for ${skip.path}: ${skip.reason}.`);
  return {
    mapped: result.mapped.length,
    review: planRequirementStatusMappings(cwd),
  };
}

/**
 * State the folder-implied type on entity files without one, so the first
 * kb_upsert on such a file changes only what it was asked to change.
 * Returns how many files were (or, on a dry run, would be) rewritten.
 */
function stateFolderImpliedTypes(cwd: string, dryRun: boolean): number {
  const plan = dryRun
    ? planEntityTypeBackfill(cwd)
    : applyEntityTypeBackfill(cwd);
  if (plan.targets.length > 0)
    console.log(
      `${dryRun ? "dry run: would state" : "Stated"} the folder-implied type on ${plan.targets.length} entity file(s) without one (${Object.entries(
        countByType(plan.targets),
      )
        .map(([type, count]) => `${count} ${type}`)
        .join(", ")}); no other line changes.`,
    );
  for (const skip of plan.skipped)
    printWarning(`Type not stated for ${skip.path}: ${skip.reason}.`);
  return plan.targets.length;
}

/**
 * Name the closed requirements whose own source says they were retired. Kibi
 * never retires a requirement on its own: each is a review action a person
 * approves by id, so this is a note, not remaining migration work.
 */
async function printRetiredStatusSuggestions(cwd: string): Promise<void> {
  const { planRetiredStatusSuggestions, REQ_RETIRED_STATUS_ACTION_PREFIX } =
    await import("../operations/migration/retired-status.js");
  const suggestions = planRetiredStatusSuggestions(cwd);
  if (suggestions.length === 0) return;
  console.log(
    `${suggestions.length} closed requirement(s) say they were retired: ${suggestions.map((suggestion) => suggestion.requirementId).join(", ")}. A closed requirement still governs; to retire one, approve ${REQ_RETIRED_STATUS_ACTION_PREFIX}<id> from kibi migrate --format json with kibi migrate --apply-safe, or set status: retired and retired_reason in the file.`,
  );
}

/**
 * Whether kibi sync would reject the migrated sources: a requirement status
 * it cannot compile, or an inventory that needs a manual fix.
 */
function syncBlocked(
  statuses: readonly RequirementStatusFinding[],
  manualInventories: number,
): boolean {
  return (
    manualInventories > 0 ||
    statuses.some((finding) => finding.extractionError !== null)
  );
}

/** The note for subject facts that get "Definition not stated" bodies. */
function notStatedNote(ids: readonly string[], dryRun: boolean): string {
  return `${dryRun ? "dry run: would record" : "Recorded"} 'Definition not stated:' as the body of ${ids.length} subject fact(s) without one (${ids.join(", ")}); no definition is invented, and a person replaces the note with one.`;
}

/**
 * Print what a `kibi migrate --yes` run left for a person, naming the
 * requirements kibi sync cannot compile first. Returns false when nothing
 * remains, so the caller may call the migration complete.
 */
function printRemainingMigrationWork(remaining: {
  statuses: readonly RequirementStatusFinding[];
  manualInventories: number;
  manualLifecycle: number;
}): boolean {
  const { statuses, manualInventories, manualLifecycle } = remaining;
  if (statuses.length === 0 && manualInventories === 0 && manualLifecycle === 0)
    return false;
  const uncompiled = statuses.filter(
    (finding) => finding.extractionError !== null,
  );
  const skipped = statuses.filter(
    (finding) => finding.extractionError === null,
  );
  const notCompiled = uncompiled.length + manualInventories;
  console.log(
    `Migration incomplete: ${notCompiled} requirement(s) are not compiled, so kb_query, kb_coverage and kb_upsert do not see them, and ${skipped.length + manualLifecycle} other item(s) need a decision.`,
  );
  for (const finding of uncompiled) {
    console.log(
      `  ${finding.requirementId} (${finding.path}): status ${finding.status} is not a status Kibi knows, so kibi sync cannot compile it (${finding.extractionError}). Set status to open, in_progress, closed or retired in the file (closed with the tag implemented for delivered work), then run kibi sync.`,
    );
  }
  if (manualInventories > 0)
    console.log(
      `  ${manualInventories} requirement inventory(ies) need the manual fix in the warnings above; kibi sync rejects them until then.`,
    );
  for (const finding of skipped) {
    console.log(
      `  ${finding.requirementId} (${finding.path}): status ${finding.status} is not a requirement status, so the proof ladder skips it. ${finding.suggestedStatus === null ? "Set status to open, in_progress, closed or retired in the file" : `Approve req-status-vocabulary-map-${finding.requirementId} (${finding.status} -> ${finding.suggestedStatus}) with kibi migrate --apply-safe, or set the status in the file`}.`,
    );
  }
  if (manualLifecycle > 0)
    console.log(
      `  ${manualLifecycle} lifecycle item(s) need a person; see the warnings above.`,
    );
  console.log(
    "Run 'kibi migrate' for the remaining actions; rerun 'kibi migrate --yes' after fixing them.",
  );
  return true;
}

/**
 * Compile the branch store from the sources `kibi migrate --yes` rewrote, as
 * `--apply-safe` does with its sync action, so the next kibi check and kibi
 * status read the migrated KB. Returns whether the store is now fresh.
 */
async function syncMigratedSources(
  cwd: string,
  options: MigrateOptions,
  blocked: boolean,
): Promise<boolean> {
  if (options.syncStore === false) return false;
  if (blocked) {
    console.log(
      "Run 'kibi sync' to recompile the rewritten sources once the items below are fixed.",
    );
    return false;
  }
  const { syncMigratedStore } = await import(
    "../operations/migration/upgrade-review.js"
  );
  const result = await syncMigratedStore(cwd);
  if (result.ok)
    console.log(
      "Recompiled the branch store from the migrated sources (kibi sync).",
    );
  else
    printWarning(
      `kibi sync did not complete after the migration (${result.reason}); run 'kibi sync' to recompile the rewritten sources.`,
    );
  return result.ok;
}

export function warnMigrationRequiredWithoutYes(): { exitCode: number } {
  printWarning("Migration required for this repository.");
  console.log("No changes applied.");
  console.log("Use --dry-run to preview or --yes to apply the migration.");
  return { exitCode: 0 };
}

export async function migrateCommand(
  options: MigrateOptions = {},
): Promise<{ exitCode: number; summary?: MigrationRunSummary }> {
  // An approval only means something to --apply-safe; anywhere else it
  // would be ignored while the command reports success.
  if (
    !applySafeRequested(options) &&
    (approvedActionIdsOf(options).length > 0 ||
      options.approvedPlanHash !== undefined)
  ) {
    noteCliErrorCategory("migrate:approval_without_apply_safe");
    console.error(
      `${approvedActionIdsOf(options).length > 0 ? "--approved-action" : "--approved-plan-hash"} only applies with --apply-safe, so nothing was applied. Review the plan with 'kibi migrate', then run: kibi migrate --apply-safe <plan hash>${approvedActionIdsOf(options).length > 0 ? ` --approved-action ${approvedActionIdsOf(options).join(",")}` : ""}`,
    );
    return { exitCode: 2 };
  }
  if (
    applySafeRequested(options) ||
    options.format === "json" ||
    (options.yes !== true && options.dryRun !== true)
  ) {
    return migratePlanCommand(options);
  }
  const cwd = path.resolve(options.workspaceRoot ?? process.cwd());
  const branchResult = resolveMigrationBranch(cwd);

  if ("error" in branchResult) {
    console.error(branchResult.error);
    return { exitCode: 1 };
  }

  const manifestStatus = readKbManifestStatus(cwd);
  const storagePlan = planLegacyStorageMigration(cwd);

  // Baseline for fresh workspaces driven by the internal plan executor. A
  // legacy layout carries its own schema generation; a baseline would claim
  // the latest one and skip every legacy step.
  if (
    options.initializeMissingConfig === true &&
    manifestStatus.state === "missing" &&
    storagePlan.moves.length === 0 &&
    storagePlan.legacyConfig === "absent"
  ) {
    writeKbManifest(cwd, defaultKbManifest());
  }

  if (
    manifestStatus.state === "missing" &&
    storagePlan.moves.length === 0 &&
    storagePlan.legacyConfig === "absent"
  ) {
    console.error(
      "Missing .kb/ lifecycle state. Run 'kibi init' to create the canonical layout before migrating.",
    );
    return { exitCode: 1 };
  }

  const { branch, warnings: branchWarnings } = branchResult;
  const currentManifest = readKbManifest(cwd);
  const legacySchemaVersion = normalizeSchemaVersion(storagePlan.schemaVersion);
  // While a legacy config is still present, its schemaVersion is the
  // generation the knowledge was written for; a manifest created beside it
  // (by an older 'kibi init') must not skip the steps in between.
  const currentVersion =
    storagePlan.legacyConfig !== "absent" && legacySchemaVersion !== null
      ? Math.min(
          currentManifest?.schemaVersion ?? legacySchemaVersion,
          legacySchemaVersion,
        )
      : (currentManifest?.schemaVersion ?? legacySchemaVersion);
  const normalizedVersion = normalizeSchemaVersion(currentVersion);
  const configStatus = getSchemaVersionStatus(
    normalizedVersion === null
      ? undefined
      : { schemaVersion: normalizedVersion },
  );
  const needsStorageMigration =
    storagePlan.moves.length > 0 ||
    storagePlan.removals.length > 0 ||
    storagePlan.legacyConfig !== "absent";
  // A missing or invalid version needs migration too.
  const needsSchemaUpgrade = configStatus.needsMigration;
  const migrationWarning =
    manifestStatus.state === "invalid" || manifestStatus.state === "future"
      ? manifestStatus.warning
      : configStatus.warning;
  // An older schema is what this command upgrades; saying "run kibi
  // migrate" here only repeats the command the user just ran.
  const warnings = [
    ...branchWarnings,
    ...(migrationWarning && configStatus.status !== "older"
      ? [migrationWarning]
      : []),
  ];
  const auditPath = path.join(cwd, ".kb", "migrations", `${branch}.json`);

  for (const warning of warnings) {
    printWarning(warning);
  }

  if (storagePlan.blockers.length > 0) {
    for (const blocker of storagePlan.blockers) {
      console.error(`Blocked: ${blocker}`);
    }
    return { exitCode: 1 };
  }

  if (configStatus.status === "newer") {
    console.error(
      `Unsupported schemaVersion ${configStatus.currentVersion}. Upgrade kibi-cli before migrating this KB.`,
    );
    return { exitCode: 1 };
  }

  // What the generated manifests held before this run, so the run refreshes
  // coordinates only when it rewrote or moved the symbols manifest.
  const generatedManifestsBefore = readGeneratedManifestBytes(cwd);

  if (!needsStorageMigration && !needsSchemaUpgrade) {
    const { planPolarityValueBackfill, applyPolarityValueBackfill } =
      await import("../operations/migration/polarity-values.js");
    const polarityCount = options.dryRun
      ? planPolarityValueBackfill(cwd).length
      : applyPolarityValueBackfill(cwd);
    const typesStated = stateFolderImpliedTypes(cwd, options.dryRun === true);
    // Delivery statuses keep requirements out of the store at any version;
    // map them before the drift check, which only sees compiled requirements.
    const statuses = mapLegacyRequirementStatuses(cwd, options.dryRun === true);
    // An advisor change can make stored inventories drift at any version,
    // and lifecycle findings block kibi check at any version.
    const drift = rederiveDriftedInventories(cwd, options.dryRun === true);
    const lifecycle = repairLifecycleFindings(cwd, options.dryRun === true);
    const legacyLinks = markLegacySymbolLinks(cwd, options.dryRun === true);
    const rewroteSources =
      polarityCount > 0 ||
      typesStated > 0 ||
      statuses.mapped > 0 ||
      legacyLinks > 0 ||
      drift.rederived > 0 ||
      lifecycle.closed > 0 ||
      lifecycle.rewritten > 0 ||
      lifecycle.removed > 0;
    if (
      rewroteSources ||
      statuses.review.length > 0 ||
      drift.manual > 0 ||
      lifecycle.manual > 0
    ) {
      if (options.dryRun !== true && rewroteSources) {
        await refreshMigratedSymbolCoordinates(cwd, generatedManifestsBefore);
        if (options.syncStore === false)
          console.log("Run 'kibi sync' to recompile the rewritten sources.");
        else
          await syncMigratedSources(
            cwd,
            options,
            syncBlocked(statuses.review, drift.manual),
          );
      }
      if (options.dryRun !== true)
        printRemainingMigrationWork({
          statuses: statuses.review,
          manualInventories: drift.manual,
          manualLifecycle: lifecycle.manual,
        });
      if (options.yes === true) updateGitIgnore(cwd);
      return { exitCode: 0 };
    }
    console.log(
      `No migration needed: the KB is already at schemaVersion ${LATEST_KB_SCHEMA_VERSION} on the canonical .kb/ layout.`,
    );

    if (existsSync(auditPath)) {
      console.log(
        `Existing migration audit metadata: ${toRelativePath(cwd, auditPath)}`,
      );
    }

    if (options.yes === true) {
      updateGitIgnore(cwd);
    }

    return { exitCode: 0 };
  }

  // A KB without a manifest or a legacy version is "missing", not
  // "invalid (null)"; a valid legacy version labels itself.
  const fromVersionLabel = formatSchemaVersion(
    manifestStatus.state === "missing" ? undefined : currentVersion,
    normalizedVersion,
  );
  const migrationSteps = migrationStepsFor(configStatus.currentVersion);
  const semanticBackfillStep = migrationSteps.some(
    (step) => step.id === "semantic-backfill-v4",
  );
  const originBackfillStep = migrationSteps.some(
    (step) => step.id === "entity-origin-v6",
  );
  const { planPolarityValueBackfill, applyPolarityValueBackfill } =
    await import("../operations/migration/polarity-values.js");
  const polarityBackfill = planPolarityValueBackfill(cwd);
  const bodyContextStep = migrationSteps.some(
    (step) => step.id === "entity-body-context-v8",
  );
  const decisionFirmnessStep = migrationSteps.some(
    (step) => step.id === "decision-firmness-v9",
  );
  const firmnessFromOriginStep = migrationSteps.some(
    (step) => step.id === "firmness-from-origin-v10",
  );
  const positiveScenarioStep = migrationSteps.some(
    (step) => step.id === "positive-scenarios-v17",
  );
  const pairReviewStep = migrationSteps.some(
    // rationale: pair-reviews-v18 is the last step, so every non-empty step list holds it and matching any step is the same until a later step exists.
    // Stryker disable next-line ConditionalExpression
    (step) => step.id === "pair-reviews-v18",
  );
  const domainSubjectsStep = migrationSteps.some(
    (step) => step.id === "domain-subjects-v16",
  );
  const {
    applySubjectDefinitionPlaceholders,
    planSubjectDefinitionPlaceholders,
  } = await import("../operations/migration/domain-subjects.js");
  const {
    domainSubjectReviewNote,
    planDomainSubjectReview,
    readUpgradeReviewFindings,
    upgradeReviewSummary,
  } = await import("../operations/migration/upgrade-review.js");
  const floorScope = {
    firm: migrationSteps.some((step) => step.id === "evidence-floor-v11"),
    approved: migrationSteps.some((step) => step.id === "approval-floor-v15"),
  };
  const evidenceFloorStep = floorScope.firm || floorScope.approved;
  const {
    applyEvidenceFloorPins,
    planEvidenceFloorPins,
    planUnapprovedAgentMusts,
    readLadderFloorVerdicts,
    unapprovedAgentMustNote,
  } = await import("../operations/migration/evidence-floor.js");
  // The agent must requirements the schema 15 rule fails once code
  // implements them: the upgrade lists them so the new findings are expected.
  const unapprovedAgentMusts = floorScope.approved
    ? planUnapprovedAgentMusts(cwd, new Date().toISOString())
    : [];
  // Read before any source rewrite: the store still holds the KB as it was,
  // and the floors are judged by the same ladder kibi check applies.
  const ladderFloors = evidenceFloorStep
    ? await readLadderFloorVerdicts(cwd)
    : null;
  const claimBindingStep = migrationSteps.some(
    (step) => step.id === "claim-bound-proofs-v12",
  );
  const {
    applyProofContractClaimPins,
    planProofContractClaimPins,
    readProofContractClaimCandidates,
  } = await import("../operations/migration/proof-contract-claims.js");
  const claimCandidates = claimBindingStep
    ? await readProofContractClaimCandidates(cwd)
    : null;
  const {
    mergeSupersedesAcknowledgements,
    planSupersedesReasonAcknowledgement,
  } = await import("../operations/migration/supersedes-reason.js");
  const {
    mergeFirmSupersedeAcknowledgements,
    planFirmSupersedeAcknowledgement,
  } = await import("../operations/migration/firm-supersede.js");
  const {
    mergePositiveScenarioAcknowledgements,
    planPositiveScenarioAcknowledgements,
  } = await import("../operations/migration/positive-scenario.js");
  const { pairReviewNote, planPairReviewCandidates } = await import(
    "../operations/migration/pair-review.js"
  );
  const {
    acknowledgedContextIds,
    applyContextMissingTags,
    applySemanticTextPins,
    countByType,
    planContextMissingTags,
    planSemanticTextPins,
  } = await import("../operations/migration/entity-body-context.js");

  if (options.dryRun) {
    if (polarityBackfill.length > 0)
      console.log(
        `dry run: would encode ${polarityBackfill.length} legacy polarity-only fact(s) as typed booleans.`,
      );
    if (bodyContextStep) {
      const pins = planSemanticTextPins(cwd);
      if (pins.targets.length > 0)
        console.log(
          `dry run: would pin semantic_text on ${pins.targets.length} requirement(s) that lack it (front matter only; bodies are preserved).`,
        );
      const tags = planContextMissingTags(cwd);
      if (tags.targets.length > 0)
        console.log(
          `dry run: would tag ${tags.targets.length} current entit(ies) without body context review:context-missing (${Object.entries(
            countByType(tags.targets),
          )
            .map(([type, count]) => `${count} ${type}`)
            .join(", ")}); no prose is written.`,
        );
      for (const skip of [...pins.skipped, ...tags.skipped])
        printWarning(`Cannot edit ${skip.path}: ${skip.reason}.`);
    }
    if (decisionFirmnessStep) {
      const unexplained = planSupersedesReasonAcknowledgement(cwd);
      if (unexplained.length > 0)
        console.log(
          `dry run: would acknowledge ${unexplained.length} supersede(s) recorded without a 'Why this changed' section (manifest only; no reason is written).`,
        );
    }
    if (firmnessFromOriginStep) {
      const firmEdges = planFirmSupersedeAcknowledgement(cwd);
      if (firmEdges.length > 0)
        console.log(
          `dry run: would acknowledge ${firmEdges.length} supersede(s) of decisions that read as firm from schema 10 (manifest only; no firmness is written).`,
        );
    }
    if (positiveScenarioStep) {
      const musts = planPositiveScenarioAcknowledgements(cwd);
      if (musts.length > 0)
        console.log(
          `dry run: would acknowledge ${musts.length} current must requirement(s) recorded before schema 17, which need no positive scenario (manifest only; no scenario is written).`,
        );
    }
    const notStated = domainSubjectsStep
      ? planSubjectDefinitionPlaceholders(cwd)
      : [];
    if (notStated.length > 0)
      console.log(
        notStatedNote(
          notStated.map((row) => row.id),
          true,
        ),
      );
    const subjectReview = domainSubjectReviewNote(
      planDomainSubjectReview(cwd, new Set(notStated.map((row) => row.id))),
      true,
    );
    if (subjectReview !== null) console.log(subjectReview);
    if (pairReviewStep) {
      const candidates = planPairReviewCandidates(cwd);
      if (candidates.length > 0)
        console.log(pairReviewNote(candidates.length, true));
    }
    if (evidenceFloorStep) {
      const floors = planEvidenceFloorPins(cwd, ladderFloors, floorScope);
      if (floors.targets.length > 0)
        console.log(
          `dry run: would record required_evidence: asserted on ${floors.targets.length} current firm or approved requirement(s) whose evidence is below tested (front matter only).`,
        );
      if (floors.kept.length > 0)
        console.log(
          floors.decidedBy === "ladder"
            ? `dry run: ${floors.kept.length} firm or approved requirement(s) keep the tested floor (${floors.kept.join(", ")}); the evidence ladder on the synced store accepts each, or needs only kibi prove re-run.`
            : `dry run: ${floors.kept.length} firm or approved requirement(s) keep the tested floor (${floors.kept.join(", ")}) because their latest end-to-end receipt passed; no synced store could be read, so other proof gaps were not judged. Run kibi sync and rerun the dry run for the ladder's verdict.`,
        );
      for (const skip of floors.skipped)
        printWarning(`Cannot edit ${skip.path}: ${skip.reason}.`);
    }
    if (unapprovedAgentMusts.length > 0)
      console.log(unapprovedAgentMustNote(unapprovedAgentMusts, true));
    if (claimBindingStep) {
      const claims = planProofContractClaimPins(cwd, claimCandidates);
      if (claims.targets.length > 0)
        console.log(
          `dry run: would pin proof_contract.proves on ${claims.targets.length} certificate test(s) whose test reaches exactly one provable claim (${claims.targets.map((target) => target.id).join(", ")}); front matter only.`,
        );
      printClaimBindingReview(claims, claimCandidates === null, true);
    }
    // Every pending schema migration ends with the derived-coordinates step.
    if (migrationSteps.length > 0) {
      const { isCoordinateArtifactTracked } = await import(
        "../operations/migration/untrack-symbol-coordinates.js"
      );
      if (isCoordinateArtifactTracked(cwd) === true)
        console.log(
          `dry run: would remove ${KB_PATHS.symbolCoordinates} from the Git index and gitignore it; sync derives symbol coordinates from schema 13.`,
        );
    }
    if (storagePlan.moves.length > 0) {
      console.log(
        `dry run: would move ${storagePlan.moves.length} legacy knowledge file(s) into .kb/:`,
      );
      for (const move of storagePlan.moves) {
        console.log(`  ${move.from} -> ${move.to}`);
      }
    }
    if (storagePlan.removals.length > 0) {
      console.log(
        `dry run: would remove ${storagePlan.removals.length} legacy cop(ies) identical to their .kb/ file:`,
      );
      for (const removal of storagePlan.removals) {
        console.log(`  ${removal.path} (same as ${removal.duplicateOf})`);
      }
    }
    if (storagePlan.legacyConfig !== "absent") {
      console.log(
        "dry run: would retire legacy .kb/config.json after moving knowledge into .kb/.",
      );
    }
    console.log(
      `dry run: would set schemaVersion from ${fromVersionLabel} to ${LATEST_KB_SCHEMA_VERSION} in .kb/manifest.json.`,
    );
    markLegacySymbolLinks(
      cwd,
      true,
      storagePlan.moves.find(
        (move) => move.to === CANONICAL_ENTITY_PATHS.symbols,
      )?.from,
    );
    if (originBackfillStep) {
      const backfill = planOriginBackfill(cwd);
      if (backfill.targets.length > 0) {
        console.log(
          `dry run: would record origin {kind: migration} on ${backfill.targets.length} authored entit(ies) without one.`,
        );
      }
    }
    stateFolderImpliedTypes(cwd, true);
    mapLegacyRequirementStatuses(cwd, true);
    rederiveDriftedInventories(cwd, true);
    repairLifecycleFindings(cwd, true);
    await printRetiredStatusSuggestions(cwd);
    console.log(
      `dry run: would write migration audit metadata to ${toRelativePath(cwd, auditPath)}.`,
    );
    console.log("Re-run with --yes to apply these changes.");
    return { exitCode: 0 };
  }

  // One-way storage cutover first: files must reach the canonical layout
  // before the manifest records the new schema generation.
  if (needsStorageMigration) {
    const storageResult = applyLegacyStorageMigration(cwd, storagePlan);
    if (storageResult.movedFiles.length > 0) {
      console.log(
        `Moved ${storageResult.movedFiles.length} knowledge file(s) into the canonical .kb/ layout.`,
      );
      const untracked = storageResult.untrackedMovedFiles.length;
      if (untracked > 0)
        printWarning(
          `${untracked} moved file(s) are not tracked by Git yet. Kibi recorded a pending-source receipt for each, so kibi sync compiles them now; stage them before you commit (git add .kb, plus the removals under the legacy folders). Each receipt retires once Git tracks its file.`,
        );
    }
    if (storageResult.removedFiles.length > 0) {
      console.log(
        `Removed ${storageResult.removedFiles.length} legacy cop(ies) identical to their .kb/ file: ${storageResult.removedFiles.join(", ")}.`,
      );
    }
    if (storageResult.retiredLegacyConfig) {
      console.log("Retired legacy .kb/config.json.");
    }
  }

  const legacyLinksMarked = markLegacySymbolLinks(cwd, false);
  const semanticAdvisorBackfill =
    normalizeSemanticAdvisorBackfill(
      readKbManifest(cwd)?.semanticAdvisorBackfill,
    ) ??
    normalizeSemanticAdvisorBackfill(storagePlan.semanticAdvisorBackfill) ??
    (semanticBackfillStep || needsStorageMigration
      ? "pending"
      : "not_applicable");

  const migratedAt = new Date().toISOString();
  stateFolderImpliedTypes(cwd, false);
  const polarityValuesRewritten = applyPolarityValueBackfill(cwd);
  if (polarityValuesRewritten > 0)
    console.log(
      `Encoded ${polarityValuesRewritten} legacy polarity-only fact(s) as typed booleans.`,
    );
  // Pin before tagging: the pin reads the body as the old derivation did, and
  // tagging then judges context against the statement-only derivation.
  let contextPlan: ReturnType<typeof planContextMissingTags> | null = null;
  if (bodyContextStep) {
    const semanticTextPinned = applySemanticTextPins(cwd);
    if (semanticTextPinned > 0)
      console.log(
        `Pinned semantic_text on ${semanticTextPinned} requirement(s) that lacked it.`,
      );
    contextPlan = planContextMissingTags(cwd);
    const contextTagged = applyContextMissingTags(cwd);
    if (contextTagged > 0)
      console.log(
        `Tagged ${contextTagged} current entit(ies) without body context review:context-missing (${Object.entries(
          countByType(contextPlan.targets),
        )
          .map(([type, count]) => `${count} ${type}`)
          .join(", ")}); no prose was written.`,
      );
    for (const skip of contextPlan.skipped)
      printWarning(`Cannot tag ${skip.path}: ${skip.reason}.`);
  }
  // Source rewrites run before the manifest records the new schema, so an
  // interrupted run is retried by the next 'kibi migrate --yes'; both are
  // idempotent.
  const originBackfill = originBackfillStep
    ? applyOriginBackfill(cwd, migratedAt)
    : { written: [], skipped: [], previouslyStamped: 0 };
  const statuses = mapLegacyRequirementStatuses(cwd, false);
  const drift = rederiveDriftedInventories(cwd, false);
  const lifecycle = repairLifecycleFindings(cwd, false);
  const supersedesUnexplained = decisionFirmnessStep
    ? planSupersedesReasonAcknowledgement(cwd)
    : [];
  const firmSupersedes = firmnessFromOriginStep
    ? planFirmSupersedeAcknowledgement(cwd)
    : [];
  const positiveScenarioMusts = positiveScenarioStep
    ? planPositiveScenarioAcknowledgements(cwd)
    : [];
  const evidenceFloorPlan = evidenceFloorStep
    ? planEvidenceFloorPins(cwd, ladderFloors, floorScope)
    : null;
  const evidenceFloorsPinned = evidenceFloorStep
    ? applyEvidenceFloorPins(cwd, ladderFloors, floorScope)
    : 0;
  const claimPins = claimBindingStep
    ? applyProofContractClaimPins(cwd, claimCandidates)
    : null;
  const notStated = domainSubjectsStep
    ? applySubjectDefinitionPlaceholders(cwd)
    : { written: [], skipped: [] };

  const existingManifest = readKbManifest(cwd) ?? defaultKbManifest();
  writeKbManifest(cwd, {
    ...existingManifest,
    schemaVersion: LATEST_KB_SCHEMA_VERSION,
    semanticAdvisorBackfill,
    ...(contextPlan !== null
      ? {
          contextAcknowledged: [
            ...new Set([
              ...(existingManifest.contextAcknowledged ?? []),
              ...acknowledgedContextIds(contextPlan),
            ]),
          ].sort(),
        }
      : {}),
    ...(supersedesUnexplained.length > 0
      ? {
          supersedesReasonAcknowledged: mergeSupersedesAcknowledgements(
            existingManifest.supersedesReasonAcknowledged,
            supersedesUnexplained,
          ),
        }
      : {}),
    ...(firmSupersedes.length > 0
      ? {
          firmSupersedeAcknowledged: mergeFirmSupersedeAcknowledgements(
            existingManifest.firmSupersedeAcknowledged,
            firmSupersedes,
          ),
        }
      : {}),
    ...(positiveScenarioMusts.length > 0
      ? {
          positiveScenarioAcknowledged: mergePositiveScenarioAcknowledgements(
            existingManifest.positiveScenarioAcknowledged,
            positiveScenarioMusts,
          ),
        }
      : {}),
  });
  if (supersedesUnexplained.length > 0)
    console.log(
      `Acknowledged ${supersedesUnexplained.length} supersede(s) recorded without a 'Why this changed' section; new supersedes must explain themselves.`,
    );
  if (firmSupersedes.length > 0)
    console.log(
      `Acknowledged ${firmSupersedes.length} supersede(s) of decisions without firmness that read as firm from schema 10; a new replacement of such a decision must be firm.`,
    );
  if (positiveScenarioMusts.length > 0)
    console.log(
      `Acknowledged ${positiveScenarioMusts.length} current must requirement(s) recorded before schema 17; a new must requirement needs a success scenario that assumes facts on its subjects.`,
    );
  const pairReviewCandidates = pairReviewStep
    ? planPairReviewCandidates(cwd)
    : [];
  if (notStated.written.length > 0)
    console.log(
      notStatedNote(
        notStated.written.map((row) => row.id),
        false,
      ),
    );
  for (const skip of notStated.skipped)
    printWarning(
      `Cannot record 'Definition not stated' on ${skip.path}: ${skip.reason}.`,
    );
  const subjectReview = planDomainSubjectReview(cwd);
  const subjectReviewNote = domainSubjectReviewNote(subjectReview, false);
  if (subjectReviewNote !== null) console.log(subjectReviewNote);
  if (pairReviewCandidates.length > 0)
    console.log(pairReviewNote(pairReviewCandidates.length, false));
  if (evidenceFloorsPinned > 0)
    console.log(
      `Recorded required_evidence: asserted on ${evidenceFloorsPinned} current firm or approved requirement(s) whose evidence is below tested; raise it to tested once the requirement has an end-to-end proof.`,
    );
  if (evidenceFloorPlan !== null) {
    const kept = evidenceFloorPlan.kept.length;
    if (kept > 0)
      console.log(
        evidenceFloorPlan.decidedBy === "ladder"
          ? `${kept} firm or approved requirement(s) keep the tested floor; the evidence ladder accepts each, or needs only kibi prove re-run (kibi check --fresh-evidence lists those).`
          : `${kept} firm or approved requirement(s) keep the tested floor because their latest end-to-end receipt passed; no synced store could be read, so run kibi sync and kibi check --rules evidence-floor to list any whose proof has other gaps (kibi proof explain <id> names them).`,
      );
    for (const skip of evidenceFloorPlan.skipped)
      printWarning(
        `Cannot record required_evidence on ${skip.path}: ${skip.reason}.`,
      );
  }
  if (unapprovedAgentMusts.length > 0)
    console.log(unapprovedAgentMustNote(unapprovedAgentMusts, false));
  if (claimPins !== null) {
    if (claimPins.targets.length > 0)
      console.log(
        `Pinned proof_contract.proves on ${claimPins.targets.length} certificate test(s) (${claimPins.targets.map((target) => target.id).join(", ")}); run kibi prove for them so their receipts bind the claim.`,
      );
    printClaimBindingReview(claimPins, claimCandidates === null, false);
  }

  await refreshMigratedSymbolCoordinates(cwd, generatedManifestsBefore);

  const auditRecord = buildMigrationAuditRecord({
    branch,
    manifestPath: KB_MANIFEST_RELATIVE,
    fromVersion: configStatus.currentVersion,
    migratedAt,
    semanticAdvisorBackfill,
    symbolGranularityLegacyLinks: legacyLinksMarked,
    entityOriginBackfill:
      originBackfill.written.length + originBackfill.previouslyStamped,
    supersededRequirementsClosed: lifecycle.closed,
    sourcePathsRewritten: lifecycle.rewritten,
    sourcePathsRemoved: lifecycle.removed,
    legacyStatusesMapped: statuses.mapped,
    preMigrationWarning: migrationWarning,
    steps: migrationSteps.map((step) => step.id),
  });
  writeJsonAtomically(auditPath, auditRecord);

  console.log(
    `Migrated the KB to schemaVersion ${LATEST_KB_SCHEMA_VERSION} on the canonical .kb/ layout (was ${fromVersionLabel}).`,
  );
  if (semanticAdvisorBackfill === "pending") {
    console.log(
      `Marked semantic advisor backfill as pending in ${KB_MANIFEST_RELATIVE}.`,
    );
  }
  if (originBackfill.written.length > 0) {
    console.log(
      `Recorded origin {kind: migration} on ${originBackfill.written.length} authored entit(ies).`,
    );
  }
  for (const skip of originBackfill.skipped) {
    printWarning(`Origin not recorded for ${skip.path}: ${skip.reason}.`);
  }
  console.log(
    `Wrote migration audit metadata to ${toRelativePath(cwd, auditPath)}.`,
  );
  await printRetiredStatusSuggestions(cwd);
  const mergeDriverGaps = manifestMergeDriverGaps(cwd);
  if (mergeDriverGaps !== null && mergeDriverGaps.length > 0) {
    console.log(
      `Tip: kibi merge-driver resolves .kb/symbols.yaml merges by record id, but it is not wired up (${mergeDriverGaps.join("; ")}). ${mergeDriverSetup(cwd, mergeDriverGaps)}`,
    );
  }
  const gitignoreUpdated = updateGitIgnore(cwd);
  // Every pending schema migration ends with the derived-coordinates step.
  if (migrationSteps.length > 0) {
    const { untrackCoordinateArtifact } = await import(
      "../operations/migration/untrack-symbol-coordinates.js"
    );
    const untrack = untrackCoordinateArtifact(cwd);
    if (untrack.outcome === "untracked")
      console.log(
        `Removed ${KB_PATHS.symbolCoordinates} from the Git index (the local file stays); commit the removal with the migration. Sync derives symbol coordinates from now on.`,
      );
    else if (untrack.outcome === "failed")
      printWarning(
        `Could not remove ${KB_PATHS.symbolCoordinates} from the Git index (${untrack.reason}); run git rm --cached ${KB_PATHS.symbolCoordinates} before the next commit.`,
      );
  }
  const synced = await syncMigratedSources(
    cwd,
    options,
    syncBlocked(statuses.review, drift.manual),
  );
  const incomplete = printRemainingMigrationWork({
    statuses: statuses.review,
    manualInventories: drift.manual,
    manualLifecycle: lifecycle.manual,
  });
  const reviewLeft = upgradeReviewSummary(
    synced ? await readUpgradeReviewFindings(cwd) : null,
    subjectReview,
    pairReviewCandidates.length,
  );
  if (reviewLeft !== null) console.log(reviewLeft);
  else if (!incomplete)
    console.log(
      "Migration complete. Future 'kibi migrate' runs will be a no-op.",
    );

  return {
    exitCode: 0,
    summary: {
      auditPath: toRelativePath(cwd, auditPath),
      audit: auditRecord,
      gitignoreUpdated,
    },
  };
}

/**
 * One line naming what an applied migration run changed, read from the audit
 * record it wrote: a count of zero shows a pass that had nothing left to do
 * (for example legacy links an earlier plan action already marked).
 */
export function describeMigrationRun(summary: MigrationRunSummary): string {
  const { audit } = summary;
  return `Migrated schema ${audit.fromVersion ?? "none"} -> ${audit.toVersion} (audit ${summary.auditPath}): legacy-link marks ${audit.symbolGranularityLegacyLinks}, origin backfill ${audit.entityOriginBackfill}, superseded requirements closed ${audit.supersededRequirementsClosed}, source paths rewritten ${audit.sourcePathsRewritten}, source paths removed ${audit.sourcePathsRemoved}, legacy statuses mapped ${audit.legacyStatusesMapped}; .gitignore ${summary.gitignoreUpdated ? "updated" : "unchanged"}.`;
}

const KB_MANIFEST_RELATIVE = ".kb/manifest.json";

async function buildWorkspaceMigrationPlan(
  workspaceRoot = process.cwd(),
): Promise<MigrationPlan> {
  const [
    { createCliRuntime },
    { executeOperation },
    { statusSpec },
    { checkSpec },
    { coverageSpec },
    {
      buildMigrationPlan,
      mergeMigrationPlans,
      migrationAction,
      withoutActionCodes,
    },
    {
      ORIGIN_SCHEMA_VERSION,
      buildSchema6MigrationFragment,
      migrationSyncAction,
    },
    { SOURCE_PLANNED_LIFECYCLE_CODES },
  ] = await Promise.all([
    import("../runtime/cli-runtime.js"),
    import("../public/operations/runtime-types.js"),
    import("../public/operations/specs/discovery.js"),
    import("../public/operations/specs/check.js"),
    import("../public/operations/specs/reporting.js"),
    import("../public/operations/migration-plan.js"),
    import("../operations/migration/schema6.js"),
    import("../public/operations/schema6-check-actions.js"),
  ]);
  const runtime = createCliRuntime({ workspaceRoot });
  const statusResult = await executeOperation(runtime, statusSpec, {});
  const status = statusResult.structuredContent;
  const plans: MigrationPlan[] = [];
  if (status?.migrationPlan !== undefined) plans.push(status.migrationPlan);

  // Source-derived schema 6 actions: re-derive drifted inventories, backfill
  // origin and list exceptions that exempt nothing. They rewrite authored
  // sources, so the schema upgrade (which performs them too) depends on them
  // and one sync recompiles the result.
  const currentSchemaVersion =
    status?.schemaStatus?.currentVersion ??
    readKbManifest(workspaceRoot)?.schemaVersion ??
    null;
  const { APPROVAL_FLOOR_SCHEMA_VERSION } = await import(
    "../public/operations/evidence-floor.js"
  );
  const { readLadderFloorVerdicts } = await import(
    "../operations/migration/evidence-floor.js"
  );
  const { CLAIM_BINDING_SCHEMA_VERSION } = await import(
    "../public/operations/proof-contract-claims.js"
  );
  const { readProofContractClaimCandidates } = await import(
    "../operations/migration/proof-contract-claims.js"
  );
  const fragment = buildSchema6MigrationFragment({
    workspaceRoot,
    currentSchemaVersion,
    // Number(null) is 0: a KB without a version is below every schema.
    ladderFloors:
      Number(currentSchemaVersion) < APPROVAL_FLOOR_SCHEMA_VERSION
        ? await readLadderFloorVerdicts(workspaceRoot)
        : null,
    claimCandidates:
      Number(currentSchemaVersion) < CLAIM_BINDING_SCHEMA_VERSION
        ? await readProofContractClaimCandidates(workspaceRoot)
        : null,
  });
  const fragmentActions = [...fragment.actions];
  // rationale: every use of statusActions looks actions up by id, safety or dependency, which no placeholder entry has.
  // Stryker disable next-line ArrayDeclaration
  const statusActions = status?.migrationPlan?.actions ?? [];
  const schemaUpgrade = statusActions.find(
    (action) => action.id === "schema-config-upgrade",
  );
  if (schemaUpgrade !== undefined) {
    fragmentActions.push(
      migrationAction({
        ...schemaUpgrade,
        dependsOn: [
          ...schemaUpgrade.dependsOn,
          ...fragment.sourceRewriteActionIds,
        ],
      }),
    );
  }
  const unsafeDrift = fragment.actions.some(
    (action) => action.code === "semantic_inventory_review",
  );
  // With no source rewrites, a status compile or resync that already runs
  // after the schema upgrade recompiles the migrated KB; a second sync would
  // only make this plan differ from the kb_status plan.
  const statusSyncAfterUpgrade = statusActions.some(
    (action) =>
      action.safety === "automatic" &&
      action.dependsOn.includes("schema-config-upgrade") &&
      action.invocation.kind === "cli" &&
      action.invocation.command_argv.join(" ") === "kibi sync",
  );
  if (
    !unsafeDrift &&
    (fragment.sourceRewriteActionIds.length > 0 ||
      (schemaUpgrade !== undefined && !statusSyncAfterUpgrade))
  ) {
    fragmentActions.push(
      migrationSyncAction([
        ...fragment.sourceRewriteActionIds,
        ...statusActions
          .filter((action) => action.safety === "automatic")
          .map((action) => action.id),
      ]),
    );
  }

  // A check needs a compiled store: a never-synced store reports every
  // authored relationship as missing. A schema 5 store compiles the same
  // facts as schema 6, so its check findings are planned before the upgrade.
  const checkable =
    status !== undefined &&
    status.branchStore?.state === "healthy" &&
    (status.schemaStatus?.needsMigration !== true ||
      Number(currentSchemaVersion) >= ORIGIN_SCHEMA_VERSION - 1) &&
    status.branchAttachment?.kind === "exact";
  const storeSynced = status?.snapshotId !== "missing";
  if (checkable && storeSynced) {
    const checkResult = await executeOperation(runtime, checkSpec, {});
    if (checkResult.structuredContent?.migrationPlan !== undefined) {
      // Lifecycle repairs, their sync and requirement status mappings are
      // planned above from authored sources, which may be newer than the
      // compiled store.
      plans.push(
        withoutActionCodes(
          checkResult.structuredContent.migrationPlan,
          new Set([
            ...SOURCE_PLANNED_LIFECYCLE_CODES,
            "check_req-status-vocabulary",
          ]),
        ),
      );
    }
    const coverageInputs = [
      { by: "req" as const, limit: 10_000, offset: 0 },
      { by: "symbol" as const, limit: 10_000, offset: 0 },
    ];
    for (const input of coverageInputs) {
      const coverageResult = await executeOperation(
        runtime,
        coverageSpec,
        input,
      );
      if (coverageResult.structuredContent?.migrationPlan !== undefined) {
        plans.push(coverageResult.structuredContent.migrationPlan);
      }
    }
  }
  // Inline implements comments are no longer read; list the ones left in
  // tracked source files so their links move into the manifest.
  const { findInlineImplementsComments, inlineImplementsReviewAction } =
    await import("../operations/migration/inline-implements-comments.js");
  const inlineReview = inlineImplementsReviewAction(
    findInlineImplementsComments(workspaceRoot),
  );
  if (inlineReview !== null) {
    plans.push(
      buildMigrationPlan({
        evaluatedDomains: ["symbol"],
        actions: [migrationAction(inlineReview)],
      }),
    );
  }
  const skippedCheck = checkable && !storeSynced;
  if (
    fragmentActions.length > 0 ||
    fragment.diagnostics.length > 0 ||
    skippedCheck
  ) {
    plans.push(
      buildMigrationPlan({
        evaluatedDomains: ["schema", "semantic"],
        incompleteDomains: skippedCheck ? ["quality"] : [],
        actions: fragmentActions,
        diagnostics: [
          ...fragment.diagnostics,
          ...(skippedCheck
            ? [
                "kibi check did not run because this branch has never been synced; apply the plan (or run kibi sync) and rerun kibi migrate for quality actions.",
              ]
            : []),
        ],
      }),
    );
  }
  if (plans.length === 0) {
    return buildMigrationPlan({
      evaluatedDomains: ["package", "branch", "storage", "schema"],
      incompleteDomains: ["status"],
      diagnostics: [
        "Unable to assemble downstream migration domains from the current workspace state.",
      ],
    });
  }
  return orderStoreSyncAfterSourceRewrites(
    { buildMigrationPlan, migrationAction },
    mergeMigrationPlans(plans),
    fragment.sourceRewriteActionIds,
    fragment.actions
      .filter((action) => action.code === "semantic_inventory_review")
      .map((action) => action.id),
  );
}

/** Status actions that run 'kibi sync' over the authored sources. */
const STORE_SYNC_ACTION_IDS = new Set([
  "branch-store-compile",
  "freshness-resync",
]);

/**
 * A sync compiles the authored sources, so it must run after the source
 * rewrites that make them ingestible. While a requirement still needs a
 * manual inventory review the sync would fail on it, so it waits on that
 * review just as the migration sync does.
 */
function orderStoreSyncAfterSourceRewrites(
  builders: Pick<
    typeof import("../public/operations/migration-plan.js"),
    "buildMigrationPlan" | "migrationAction"
  >,
  plan: MigrationPlan,
  rewriteActionIds: readonly string[],
  reviewActionIds: readonly string[],
): MigrationPlan {
  // Rebuilding a plan whose actions did not change gives the same plan.
  const actions = plan.actions.map((action) => {
    if (!STORE_SYNC_ACTION_IDS.has(action.id) || action.state !== "ready")
      return action;
    if (reviewActionIds.length > 0)
      return builders.migrationAction({
        ...action,
        state: "blocked",
        autoApplicable: false,
        evidence: {
          ...action.evidence,
          blockedBy: [...reviewActionIds],
          reason:
            "kibi sync rejects a requirement until its semantic inventory review is fixed; rerun kibi migrate afterwards.",
        },
      });
    return builders.migrationAction({
      ...action,
      dependsOn: [...action.dependsOn, ...rewriteActionIds],
    });
  });
  return builders.buildMigrationPlan({
    expected: plan.expected,
    evaluatedDomains: plan.scope.evaluatedDomains,
    incompleteDomains: plan.scope.incompleteDomains,
    actions,
    diagnostics: plan.diagnostics,
  });
}

/**
 * The action ids approved on the command line. The CLI parser stores
 * `--approved-action` as `approvedAction`; in-process callers pass
 * `approvedActionIds`. Either spelling limits `--apply-safe` to those ids.
 */
function approvedActionIdsOf(options: MigrateOptions): string[] {
  const ids = [
    ...(options.approvedActionIds ?? []),
    ...(options.approvedAction ?? []),
  ]
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return [...new Set(ids)];
}

/**
 * The table rendering of an apply result; --format json prints it whole.
 * The remaining plan is printed as `kibi migrate` would print it (and
 * recorded the same way), so its hash is one --apply-safe accepts.
 */
async function printApplySummary(
  content: unknown,
  workspaceRoot: string,
): Promise<void> {
  if (content === null || typeof content !== "object") return;
  const result = content as {
    outcome?: string;
    actionResults?: readonly {
      actionId: string;
      outcome: string;
      detail: string;
    }[];
    remainingPlan?: MigrationPlanDigest;
  };
  if (result.outcome !== undefined) console.log(`Outcome: ${result.outcome}`);
  for (const action of result.actionResults ?? []) {
    console.log(`- ${action.outcome} ${action.actionId}: ${action.detail}`);
  }
  if (result.remainingPlan !== undefined) {
    // The apply result's digest hashes the plan the operation rebuilt, which
    // is not the plan kibi migrate builds; print and record the latter.
    const plan = await buildWorkspaceMigrationPlan(workspaceRoot);
    const ready = plan.actions.filter(
      (action) => action.state === "ready" && action.autoApplicable,
    ).length;
    const backlog = plan.actions.filter(isBacklogAction).length;
    console.log(
      `Remaining plan ${plan.planHash}: ${plan.status}; actions: ${plan.actions.length} (${plan.actions.length - backlog} migration, ${backlog} quality backlog); automatic-ready: ${ready}`,
    );
    recordPrintedPlan(workspaceRoot, plan);
    if (ready > 0)
      console.log(
        `Apply its ${ready} ready automatic action(s): ${applyPlanCommand(plan.planHash)}`,
      );
  }
  console.log(
    "Run 'kibi migrate' for the remaining actions, or add --format json for the full result.",
  );
}

/** True for `--apply-safe`, with or without the hash it may carry. */
function applySafeRequested(options: MigrateOptions): boolean {
  return (
    options.applySafe === true ||
    (typeof options.applySafe === "string" && options.applySafe !== "")
  );
}

/** The exact command that applies the plan with this hash. */
export function applyPlanCommand(planHash: string): string {
  return `kibi migrate --apply-safe ${planHash}`;
}

/**
 * Why an approved hash is not the current plan's: what changed since that
 * plan was printed here, when Kibi recorded it, and the command for the
 * current plan.
 */
export function planChangedMessage(
  workspaceRoot: string,
  approvedPlanHash: string,
  plan: MigrationPlan,
): string {
  const printed = findPrintedPlan(workspaceRoot, approvedPlanHash);
  const apply = `Review the current plan with 'kibi migrate', then apply it with: ${applyPlanCommand(plan.planHash)}`;
  if (!printed)
    return [
      `${approvedPlanHash} is not the current migration plan; its hash is now ${plan.planHash}. Kibi has no record of printing ${approvedPlanHash} here, so it cannot say what changed. Nothing was applied.`,
      apply,
    ].join("\n");
  const changes = describePlanChange(printed, plan);
  return [
    `The migration plan changed since ${approvedPlanHash} was printed (${printed.printedAt}); its hash is now ${plan.planHash}. Nothing was applied.`,
    ...(changes.length > 0
      ? ["What changed:", ...changes.map((change) => `- ${change}`)]
      : ["Its actions and inputs are the same; only their details changed."]),
    apply,
  ].join("\n");
}

async function migratePlanCommand(
  options: MigrateOptions,
): Promise<{ exitCode: number }> {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  const plan = await buildWorkspaceMigrationPlan(workspaceRoot);
  const applySafe = applySafeRequested(options);
  // `--yes` with JSON output applies every ready automatic action of the plan
  // it would otherwise only print; `--dry-run` still only prints it. Only
  // JSON output brings `--yes` here without `--apply-safe`.
  const approveWholePlan =
    !applySafe && options.yes === true && options.dryRun !== true;
  if (applySafe || approveWholePlan) {
    const inlineHash =
      typeof options.applySafe === "string" ? options.applySafe : undefined;
    if (
      inlineHash !== undefined &&
      options.approvedPlanHash !== undefined &&
      inlineHash !== options.approvedPlanHash
    ) {
      noteCliErrorCategory("migrate:approved_plan_hash_conflict");
      console.error(
        `--apply-safe ${inlineHash} and --approved-plan-hash ${options.approvedPlanHash} name different plans; give one hash. The current plan applies with: ${applyPlanCommand(plan.planHash)}`,
      );
      return { exitCode: 2 };
    }
    const approvedPlanHash = approveWholePlan
      ? plan.planHash
      : (inlineHash ?? options.approvedPlanHash);
    if (!approvedPlanHash) {
      noteCliErrorCategory("migrate:approved_plan_hash_missing");
      console.error(
        `--apply-safe needs the hash of the plan you reviewed. Review the plan with 'kibi migrate', then apply its current hash: ${applyPlanCommand(plan.planHash)}`,
      );
      return { exitCode: 2 };
    }
    if (approvedPlanHash !== plan.planHash) {
      noteCliErrorCategory("migrate:plan_hash_changed");
      console.error(planChangedMessage(workspaceRoot, approvedPlanHash, plan));
      return { exitCode: 2 };
    }
    const explicitActionIds = approveWholePlan
      ? []
      : approvedActionIdsOf(options);
    const approvedActionIds =
      explicitActionIds.length > 0
        ? explicitActionIds
        : plan.actions
            .filter(
              (action) => action.state === "ready" && action.autoApplicable,
            )
            .map((action) => action.id);
    if (approvedActionIds.length === 0) {
      console.log("No approved automatic migration actions are ready.");
      return { exitCode: 0 };
    }
    const [
      { createCliRuntime },
      { executeOperation },
      { applyPlanSpec },
      { withConsoleOnStderr },
    ] = await Promise.all([
      import("../runtime/cli-runtime.js"),
      import("../public/operations/runtime-types.js"),
      import("../public/operations/specs/planning.js"),
      import("../cli-json-command.js"),
    ]);
    const execute = () =>
      executeOperation(createCliRuntime({ workspaceRoot }), applyPlanSpec, {
        plan,
        approvedPlanHash,
        approvedActionIds,
      });
    // The actions reuse commands that print progress; keep stdout to the
    // JSON result.
    const result =
      options.format === "json"
        ? await withConsoleOnStderr(execute)
        : await execute();
    if (options.format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.content[0]?.text ?? "Migration applied.");
      await printApplySummary(result.structuredContent, workspaceRoot);
    }
    const outcome = result.structuredContent?.outcome;
    if (outcome !== "applied") noteCliErrorCategory(`migrate:${outcome}`);
    return {
      exitCode: outcome === "applied" ? 0 : 1,
    };
  }
  if (options.format === "json") {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    printPlanText(plan, options.backlog === true);
  }
  if (options.dryRun !== true) recordPrintedPlan(workspaceRoot, plan);
  return { exitCode: 0 };
}

/**
 * Review findings `kibi check` and `kb_status` report at any schema version:
 * quality and coverage work, not steps of the migration. A plan lists them
 * so one approval flow covers both, but they never make a migration
 * incomplete.
 */
export function isBacklogAction(
  action: Pick<MigrationAction, "code">,
): boolean {
  return (
    action.code.startsWith("quality_") ||
    action.code.startsWith("coverage_") ||
    (action.code.startsWith("review_") &&
      !MIGRATION_REVIEW_CODES.has(action.code))
  );
}

/**
 * INLINE_IMPLEMENTS_REVIEW_CODE of the inline-implements-comments module,
 * which this command loads only when it scans for the comments.
 */
const INLINE_IMPLEMENTS_COMMENT_REVIEW = "review_inline_implements_comment";

/** Review actions that belong to the schema or storage migration itself. */
const MIGRATION_REVIEW_CODES: ReadonlySet<string> = new Set([
  "review_source_path_dangling",
  "review_supersession_cycle",
  // Left behind by the upgrade that stopped reading the comments, and it
  // changes what the staged check accepts, so it is not hidden in a count.
  INLINE_IMPLEMENTS_COMMENT_REVIEW,
]);

function printPlanText(plan: MigrationPlan, listBacklog: boolean): void {
  const migration = plan.actions.filter((action) => !isBacklogAction(action));
  const backlog = plan.actions.filter(isBacklogAction);
  const automaticReady = migration.filter(
    (action) => action.state === "ready" && action.autoApplicable,
  ).length;
  console.log(`Migration plan ${plan.planHash}`);
  console.log(
    migration.length === 0
      ? "Migration: complete; no migration actions remain."
      : `Migration: ${migration.length} action(s); automatic-ready: ${automaticReady}`,
  );
  for (const action of migration) {
    console.log(
      `- ${action.state} ${action.safety} ${action.code}: ${action.id}`,
    );
    if (
      action.code === INLINE_IMPLEMENTS_COMMENT_REVIEW &&
      action.invocation.kind === "review"
    )
      console.log(`  ${action.invocation.instruction}`);
  }
  if (backlog.length > 0) {
    console.log(
      `Quality backlog (not part of the migration): ${backlog.length} review item(s) that kibi check and kb_status also report.`,
    );
    if (listBacklog) {
      for (const action of backlog) {
        console.log(
          `- ${action.state} ${action.safety} ${action.code}: ${action.id}`,
        );
      }
    } else {
      const counts = new Map<string, number>();
      for (const action of backlog) {
        counts.set(action.code, (counts.get(action.code) ?? 0) + 1);
      }
      for (const [code, count] of [...counts].sort(
        ([leftCode, left], [rightCode, right]) =>
          right - left || leftCode.localeCompare(rightCode),
      )) {
        console.log(`  ${count} ${code}`);
      }
      console.log("  List each item with --backlog.");
    }
  }
  console.log(
    `Plan status: ${plan.status} (covers both sections: ${plan.actions.length} action(s) in all, the actionCount of --format json). Use --format json for structured actions.`,
  );
  if (automaticReady > 0)
    console.log(
      `Apply the ${automaticReady} ready automatic action(s) of this plan: ${applyPlanCommand(plan.planHash)}`,
    );
}
