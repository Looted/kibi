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

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
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
  applySourcePathRepairs,
  findSourceRepairs,
} from "../operations/migration/source-paths.js";
import {
  applySupersededClosures,
  planSupersededClosures,
} from "../operations/migration/superseded-closure.js";
import {
  applySymbolLegacyLinks,
  planSymbolLegacyLinks,
} from "../operations/migration/symbol-legacy-links.js";
import type { MigrationPlan } from "../public/operations/migration-plan.js";
import { resolveBranchAttachment } from "../utils/branch-resolver.js";
import {
  defaultKbManifest,
  readKbManifest,
  readKbManifestStatus,
  writeKbManifest,
} from "../utils/kb-manifest.js";
import { CANONICAL_ENTITY_PATHS } from "../utils/kb-paths.js";
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

interface MigrateOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "table";
  applySafe?: boolean;
  approvedPlanHash?: string;
  approvedActionIds?: string[];
  /** `--approved-action <id>` as the CLI parser spells it; same as approvedActionIds. */
  approvedAction?: string[];
  workspaceRoot?: string;
  /** Internal migration-plan executor: create only the canonical baseline manifest. */
  initializeMissingConfig?: boolean;
}

interface MigrationAuditRecord {
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
  toVersion: number;
  warning: string | null;
  steps: readonly string[];
}

interface SchemaMigrationStep {
  id: string;
  from: number;
  to: number;
  description: string;
}

interface ResolvedBranch {
  branch: string;
  warnings: string[];
}

const MIGRATION_AUDIT_VERSION = 1;

const SCHEMA_MIGRATION_STEPS: readonly SchemaMigrationStep[] = [
  {
    id: "config-canonical-v1",
    from: 0,
    to: 1,
    description:
      "Preserve legacy configuration while recording canonical schema metadata.",
  },
  {
    id: "symbol-granularity-v2",
    from: 1,
    to: 2,
    description: "Mark provable coarse traceability links as legacy-link.",
  },
  {
    id: "compatibility-v3",
    from: 2,
    to: 3,
    description: "Record an audited compatibility no-op for schema v3.",
  },
  {
    id: "semantic-backfill-v4",
    from: 3,
    to: 4,
    description:
      "Mark semantic-advisor backfill as pending without inventing claims.",
  },
  {
    id: "canonical-storage-v5",
    from: 4,
    to: 5,
    description:
      "Move Kibi knowledge into the canonical .kb/ namespace and retire .kb/config.json.",
  },
  {
    id: "entity-origin-v6",
    from: 5,
    to: 6,
    description:
      "Record origin {kind: migration} on authored entities written before schema 6, close superseded requirements, and repair authored source fields (point moved knowledge files at .kb/, remove redundant and dead values).",
  },
  {
    id: "polarity-values-v7",
    from: 6,
    to: 7,
    description:
      "Encode legacy polarity-only property facts as eq boolean true with require/forbid polarity; strict fact shapes are blocking.",
  },
  {
    id: "entity-body-context-v8",
    from: 7,
    to: 8,
    description:
      "Pin semantic_text on requirements that lack it (computed from the body before context sections stop counting), and tag current entities without body context review:context-missing; front matter only, bodies are preserved.",
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

function toRelativePath(cwd: string, filePath: string): string {
  const relativePath = path.relative(cwd, filePath);
  return relativePath.length > 0 ? relativePath : path.basename(filePath);
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
  writeFileSync(tempPath, content, "utf8");
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
  warning: string | null;
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
    toVersion: LATEST_KB_SCHEMA_VERSION,
    warning: args.warning,
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
// implements REQ-cli-schema-migration, REQ-symbol-behavioral-anchors
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
// implements REQ-cli-schema-migration, REQ-kibi-proposition-complete-ingestion
function rederiveDriftedInventories(
  cwd: string,
  dryRun: boolean,
): { rederived: string[]; manual: number } {
  if (dryRun) {
    const plans = planInventoryRederivation(cwd);
    for (const plan of plans.filter((candidate) => candidate.safe)) {
      console.log(
        `dry run: would re-derive the semantic inventory of ${describeRederivation(plan)}.`,
      );
    }
    const manual = plans.filter((candidate) => !candidate.safe);
    printManualRederivations(manual);
    return {
      rederived: plans
        .filter((candidate) => candidate.safe)
        .map((candidate) => candidate.requirementId),
      manual: manual.length,
    };
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
  return { rederived, manual: result.manual.length };
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
// implements REQ-cli-schema-migration, REQ-core-validation-rules, REQ-kibi-schema6-migration
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
        `dry run: would point ${rewritten} pre-canonical source path(s) at their .kb/ files.`,
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
        `Pointed ${rewritten} pre-canonical source path(s) at their .kb/ files.`,
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
      `Source field of ${skip.file} not repaired: ${skip.reason}; a person edits it by hand (kibi migrate --format json lists it as review_source_path_dangling).`,
    );
  }
  return {
    closed,
    rewritten,
    removed,
    manual: supersession.cycles.length + unrepaired.length,
  };
}

export function warnMigrationRequiredWithoutYes(): { exitCode: number } {
  printWarning("Migration required for this repository.");
  console.log("No changes applied.");
  console.log("Use --dry-run to preview or --yes to apply the migration.");
  return { exitCode: 0 };
}

// implements REQ-003
export async function migrateCommand(
  options: MigrateOptions = {},
): Promise<{ exitCode: number }> {
  if (
    options.applySafe === true ||
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
    storagePlan.moves.length > 0 || storagePlan.legacyConfig !== "absent";
  const needsSchemaUpgrade =
    configStatus.needsMigration || normalizedVersion === null;
  const migrationWarning =
    manifestStatus.state === "invalid" || manifestStatus.state === "future"
      ? manifestStatus.warning
      : configStatus.warning;
  const warnings = [
    ...branchWarnings,
    ...(migrationWarning ? [migrationWarning] : []),
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

  if (
    configStatus.currentVersion !== null &&
    configStatus.currentVersion > configStatus.latestVersion
  ) {
    console.error(
      `Unsupported schemaVersion ${configStatus.currentVersion}. Upgrade kibi-cli before migrating this KB.`,
    );
    return { exitCode: 1 };
  }

  if (!needsStorageMigration && !needsSchemaUpgrade) {
    const { planPolarityValueBackfill, applyPolarityValueBackfill } =
      await import("../operations/migration/polarity-values.js");
    const polarityCount = options.dryRun
      ? planPolarityValueBackfill(cwd).length
      : applyPolarityValueBackfill(cwd);
    // An advisor change can make stored inventories drift at any version,
    // and lifecycle findings block kibi check at any version.
    const drift = rederiveDriftedInventories(cwd, options.dryRun === true);
    const lifecycle = repairLifecycleFindings(cwd, options.dryRun === true);
    const legacyLinks = markLegacySymbolLinks(cwd, options.dryRun === true);
    const rewroteSources =
      polarityCount > 0 ||
      legacyLinks > 0 ||
      drift.rederived.length > 0 ||
      lifecycle.closed > 0 ||
      lifecycle.rewritten > 0 ||
      lifecycle.removed > 0;
    if (rewroteSources || drift.manual > 0 || lifecycle.manual > 0) {
      if (options.dryRun !== true && rewroteSources) {
        console.log("Run 'kibi sync' to recompile the rewritten sources.");
      }
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

  const fromVersionLabel = formatSchemaVersion(
    currentVersion,
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
    if (storagePlan.moves.length > 0) {
      console.log(
        `dry run: would move ${storagePlan.moves.length} legacy knowledge file(s) into .kb/:`,
      );
      for (const move of storagePlan.moves) {
        console.log(`  ${move.from} -> ${move.to}`);
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
    rederiveDriftedInventories(cwd, true);
    repairLifecycleFindings(cwd, true);
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
      const untracked = untrackedFiles(cwd, storageResult.movedFiles);
      if (untracked > 0)
        printWarning(
          `${untracked} moved file(s) are not tracked by Git yet, and kibi sync compiles only tracked sources: until you stage them (git add .kb, plus the removals under the legacy folders) the KB compiles without them and plans report them as missing.`,
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
  const polarityValuesRewritten = applyPolarityValueBackfill(cwd);
  if (polarityValuesRewritten > 0)
    console.log(
      `Encoded ${polarityValuesRewritten} legacy polarity-only fact(s) as typed booleans.`,
    );
  // Pin before tagging: the pin reads the body as the old derivation did, and
  // tagging then judges context against the statement-only derivation.
  const semanticTextPinned = bodyContextStep ? applySemanticTextPins(cwd) : 0;
  if (semanticTextPinned > 0)
    console.log(
      `Pinned semantic_text on ${semanticTextPinned} requirement(s) that lacked it.`,
    );
  const contextPlan = bodyContextStep ? planContextMissingTags(cwd) : null;
  const contextTagged = bodyContextStep ? applyContextMissingTags(cwd) : 0;
  if (contextPlan !== null && contextTagged > 0)
    console.log(
      `Tagged ${contextTagged} current entit(ies) without body context review:context-missing (${Object.entries(
        countByType(contextPlan.targets),
      )
        .map(([type, count]) => `${count} ${type}`)
        .join(", ")}); no prose was written.`,
    );
  for (const skip of contextPlan?.skipped ?? [])
    printWarning(`Cannot tag ${skip.path}: ${skip.reason}.`);
  // Source rewrites run before the manifest records the new schema, so an
  // interrupted run is retried by the next 'kibi migrate --yes'; both are
  // idempotent.
  const originBackfill = originBackfillStep
    ? applyOriginBackfill(cwd, migratedAt)
    : { written: [], skipped: [], previouslyStamped: 0 };
  rederiveDriftedInventories(cwd, false);
  const lifecycle = repairLifecycleFindings(cwd, false);

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
  });

  writeJsonAtomically(
    auditPath,
    buildMigrationAuditRecord({
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
      warning: migrationWarning,
      steps: migrationSteps.map((step) => step.id),
    }),
  );

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
  console.log(
    "Migration complete. Future 'kibi migrate' runs will be a no-op.",
  );
  updateGitIgnore(cwd);

  return { exitCode: 0 };
}

const KB_MANIFEST_RELATIVE = ".kb/manifest.json";

// implements REQ-agent-guided-migration-orchestration, REQ-cli-schema-migration
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
  const fragment = buildSchema6MigrationFragment({
    workspaceRoot,
    currentSchemaVersion,
  });
  const fragmentActions = [...fragment.actions];
  const statusActions = status?.migrationPlan?.actions ?? [];
  const schemaUpgrade = statusActions.find(
    (action) => action.id === "schema-config-upgrade",
  );
  if (
    schemaUpgrade !== undefined &&
    fragment.sourceRewriteActionIds.length > 0
  ) {
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
  if (
    !unsafeDrift &&
    (fragment.sourceRewriteActionIds.length > 0 || schemaUpgrade !== undefined)
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
  const storeHealthy = status?.branchStore?.state === "healthy";
  const schemaCheckable =
    status?.schemaStatus?.needsMigration !== true ||
    (currentSchemaVersion !== null &&
      currentSchemaVersion >= ORIGIN_SCHEMA_VERSION - 1);
  const storeSynced = status?.snapshotId !== "missing";
  const checkable =
    storeHealthy &&
    schemaCheckable &&
    status?.branchAttachment?.kind === "exact";
  if (checkable && storeSynced) {
    const checkResult = await executeOperation(runtime, checkSpec, {});
    if (checkResult.structuredContent?.migrationPlan !== undefined) {
      // Lifecycle repairs and their sync are planned above from authored
      // sources, which may be newer than the compiled store.
      plans.push(
        withoutActionCodes(
          checkResult.structuredContent.migrationPlan,
          SOURCE_PLANNED_LIFECYCLE_CODES,
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
  const skippedCheck = checkable && !storeSynced;
  if (
    fragmentActions.length > 0 ||
    fragment.diagnostics.length > 0 ||
    skippedCheck
  ) {
    plans.push(
      buildMigrationPlan({
        ...(status?.migrationPlan !== undefined
          ? { expected: status.migrationPlan.expected }
          : {}),
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
// implements REQ-cli-schema-migration
function orderStoreSyncAfterSourceRewrites(
  builders: Pick<
    typeof import("../public/operations/migration-plan.js"),
    "buildMigrationPlan" | "migrationAction"
  >,
  plan: MigrationPlan,
  rewriteActionIds: readonly string[],
  reviewActionIds: readonly string[],
): MigrationPlan {
  const affected = plan.actions.some(
    (action) =>
      STORE_SYNC_ACTION_IDS.has(action.id) && action.state === "ready",
  );
  if (
    !affected ||
    (rewriteActionIds.length === 0 && reviewActionIds.length === 0)
  )
    return plan;
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
// implements REQ-cli-schema-migration
function approvedActionIdsOf(options: MigrateOptions): string[] {
  const ids = [
    ...(options.approvedActionIds ?? []),
    ...(options.approvedAction ?? []),
  ]
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return [...new Set(ids)];
}

/** How many of `files` Git does not track; 0 outside a repository. */
// implements REQ-cli-schema-migration
function untrackedFiles(cwd: string, files: readonly string[]): number {
  let tracked: Set<string>;
  try {
    tracked = new Set(
      execFileSync("git", ["-C", cwd, "ls-files", "-z", "--", ".kb"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10_000,
      })
        .split("\0")
        .filter((file) => file.length > 0),
    );
  } catch {
    return 0;
  }
  return files.filter((file) => !tracked.has(file)).length;
}

/** The table rendering of an apply result; --format json prints it whole. */
// implements REQ-cli-schema-migration
function printApplySummary(content: unknown): void {
  if (content === null || typeof content !== "object") return;
  const result = content as {
    outcome?: string;
    actionResults?: readonly {
      actionId: string;
      outcome: string;
      detail: string;
    }[];
    remainingPlan?: MigrationPlan;
  };
  if (result.outcome !== undefined) console.log(`Outcome: ${result.outcome}`);
  for (const action of result.actionResults ?? []) {
    console.log(`- ${action.outcome} ${action.actionId}: ${action.detail}`);
  }
  const remaining = result.remainingPlan;
  if (remaining !== undefined) {
    const ready = remaining.actions.filter(
      (action) => action.state === "ready" && action.autoApplicable,
    ).length;
    console.log(
      `Remaining plan ${remaining.planHash}: ${remaining.status}; actions: ${remaining.summary.actionCount}; automatic-ready: ${ready}`,
    );
  }
  console.log(
    "Run 'kibi migrate' for the remaining actions, or add --format json for the full result.",
  );
}

async function migratePlanCommand(
  options: MigrateOptions,
): Promise<{ exitCode: number }> {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  const plan = await buildWorkspaceMigrationPlan(workspaceRoot);
  // `--yes` with JSON output applies every ready automatic action of the plan
  // it would otherwise only print; `--dry-run` still only prints it.
  const approveWholePlan =
    options.applySafe !== true &&
    options.yes === true &&
    options.dryRun !== true &&
    options.format === "json";
  if (options.applySafe === true || approveWholePlan) {
    const approvedPlanHash = approveWholePlan
      ? plan.planHash
      : options.approvedPlanHash;
    if (!approvedPlanHash) {
      console.error("--apply-safe requires --approved-plan-hash <sha256>.");
      return { exitCode: 2 };
    }
    if (approvedPlanHash !== plan.planHash) {
      console.error(
        "Migration plan changed; regenerate the plan and approve its current hash.",
      );
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
      printApplySummary(result.structuredContent);
    }
    return {
      exitCode: result.structuredContent?.outcome === "applied" ? 0 : 1,
    };
  }
  if (options.format === "json") {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(`Migration plan ${plan.planHash}`);
    console.log(
      `Status: ${plan.status}; actions: ${plan.summary.actionCount}; automatic-ready: ${plan.actions.filter((action) => action.state === "ready" && action.autoApplicable).length}`,
    );
    for (const action of plan.actions) {
      console.log(
        `- ${action.state} ${action.safety} ${action.code}: ${action.id}`,
      );
    }
    console.log(
      "Use --format json for structured actions, or --apply-safe with the approved plan hash.",
    );
  }
  return { exitCode: 0 };
}
