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
import { load as parseYAML } from "js-yaml";
import type { MigrationPlan } from "../public/operations/migration-plan.js";
import { extractSymbolsFromStagedFile } from "../traceability/symbol-extract.js";
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

interface SymbolRecord {
  id?: unknown;
  title?: unknown;
  sourceFile?: unknown;
  links?: unknown;
  relationships?: unknown;
  granularity_reason?: unknown;
  [key: string]: unknown;
}

interface SymbolsManifestDocument {
  symbols?: unknown;
  [key: string]: unknown;
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

const TRACEABILITY_RELATIONSHIP_TYPES = new Set([
  "implements",
  "covered_by",
  "executable_for",
]);

function hasTraceabilityRelationship(symbol: SymbolRecord): boolean {
  if (Array.isArray(symbol.links) && symbol.links.length > 0) {
    return true;
  }

  if (!Array.isArray(symbol.relationships)) {
    return false;
  }

  return symbol.relationships.some((relationship) => {
    if (
      relationship === null ||
      typeof relationship !== "object" ||
      Array.isArray(relationship)
    ) {
      return false;
    }

    const type = (relationship as { type?: unknown }).type;
    return (
      typeof type === "string" && TRACEABILITY_RELATIONSHIP_TYPES.has(type)
    );
  });
}

function getGranularNames(cwd: string, sourceFile: string): Set<string> {
  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.join(cwd, sourceFile);
  if (!existsSync(absolutePath)) {
    return new Set();
  }

  const symbols = extractSymbolsFromStagedFile({
    path: sourceFile,
    status: "M",
    hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
    content: readFileSync(absolutePath, "utf8"),
  });

  return new Set(symbols.map((symbol) => symbol.name));
}

function addLegacyReasonsToManifestText(
  content: string,
  symbolIds: Set<string>,
): string {
  if (symbolIds.size === 0) return content;

  const lines = content.split("\n");
  const output: string[] = [];
  let activeId: string | null = null;
  let activeHasReason = false;
  let activePropertyIndent = "";

  const flushLegacyReason = (): void => {
    if (
      activeId !== null &&
      symbolIds.has(activeId) &&
      !activeHasReason &&
      activePropertyIndent.length > 0
    ) {
      output.push(`${activePropertyIndent}granularity_reason: legacy-link`);
      activeHasReason = true;
    }
  };

  for (const line of lines) {
    const idMatch = line.match(/^(\s*)-\s+id:\s+(.+)\s*$/);
    if (idMatch) {
      flushLegacyReason();
      activeId = idMatch[2]?.trim() ?? null;
      activeHasReason = false;
      activePropertyIndent = `${idMatch[1] ?? ""}  `;
    }

    if (activeId !== null && /^\s+granularity_reason:\s+/.test(line)) {
      activeHasReason = true;
    }

    if (
      activeId !== null &&
      symbolIds.has(activeId) &&
      !activeHasReason &&
      /^\s+status:\s+/.test(line)
    ) {
      const indent = line.match(/^\s*/)?.[0] ?? "";
      output.push(`${indent}granularity_reason: legacy-link`);
      activeHasReason = true;
    }

    output.push(line);
  }

  flushLegacyReason();

  return output.join("\n");
}

function migrateSymbolGranularity(options: {
  cwd: string;
  dryRun: boolean;
  manifestPath?: string;
}): { count: number; manifestPath: string | null } {
  const manifestPath =
    options.manifestPath ??
    path.join(options.cwd, CANONICAL_ENTITY_PATHS.symbols);
  if (!existsSync(manifestPath)) {
    return { count: 0, manifestPath };
  }

  const manifestContent = readFileSync(manifestPath, "utf8");
  const parsed = parseYAML(manifestContent) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { count: 0, manifestPath };
  }

  const manifest = parsed as SymbolsManifestDocument;
  if (!Array.isArray(manifest.symbols)) {
    return { count: 0, manifestPath };
  }

  let count = 0;
  const migratedSymbolIds = new Set<string>();
  const granularNamesByFile = new Map<string, Set<string>>();

  for (const symbol of manifest.symbols) {
    if (
      symbol === null ||
      typeof symbol !== "object" ||
      Array.isArray(symbol)
    ) {
      continue;
    }

    const record = symbol as SymbolRecord;
    if (typeof record.sourceFile !== "string") continue;
    if (typeof record.title !== "string") continue;
    if (typeof record.id !== "string") continue;
    if (record.granularity_reason !== undefined) continue;
    if (!hasTraceabilityRelationship(record)) continue;

    let granularNames = granularNamesByFile.get(record.sourceFile);
    if (granularNames === undefined) {
      granularNames = getGranularNames(options.cwd, record.sourceFile);
      granularNamesByFile.set(record.sourceFile, granularNames);
    }

    if (granularNames.size === 0 || granularNames.has(record.title)) {
      continue;
    }

    count += 1;
    if (!options.dryRun) {
      record.granularity_reason = "legacy-link";
      migratedSymbolIds.add(record.id);
    }
  }

  if (count > 0 && !options.dryRun) {
    writeTextAtomically(
      manifestPath,
      addLegacyReasonsToManifestText(manifestContent, migratedSymbolIds),
    );
  }

  return { count, manifestPath };
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

  // Baseline for fresh workspaces driven by the internal plan executor.
  if (
    options.initializeMissingConfig === true &&
    manifestStatus.state === "missing"
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
  const currentVersion = currentManifest?.schemaVersion ?? legacySchemaVersion;
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
  const symbolGranularityStep = migrationSteps.some(
    (step) => step.id === "symbol-granularity-v2",
  );
  const semanticBackfillStep = migrationSteps.some(
    (step) => step.id === "semantic-backfill-v4",
  );

  if (options.dryRun) {
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
    if (symbolGranularityStep) {
      const symbolsSource =
        storagePlan.moves.find(
          (move) => move.to === CANONICAL_ENTITY_PATHS.symbols,
        )?.from ?? CANONICAL_ENTITY_PATHS.symbols;
      const preview = migrateSymbolGranularity({
        cwd,
        dryRun: true,
        manifestPath: path.join(cwd, symbolsSource),
      });
      if (preview.count > 0) {
        console.log(
          `dry run: would mark ${preview.count} legacy coarse symbol link(s) as legacy-link.`,
        );
      }
    }
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
    }
    if (storageResult.retiredLegacyConfig) {
      console.log("Retired legacy .kb/config.json.");
    }
  }

  const symbolGranularityMigration = migrateSymbolGranularity({
    cwd,
    dryRun: !symbolGranularityStep || options.dryRun || !options.yes,
  });
  const semanticAdvisorBackfill =
    normalizeSemanticAdvisorBackfill(
      readKbManifest(cwd)?.semanticAdvisorBackfill,
    ) ??
    normalizeSemanticAdvisorBackfill(storagePlan.semanticAdvisorBackfill) ??
    (semanticBackfillStep || needsStorageMigration
      ? "pending"
      : "not_applicable");

  const existingManifest = readKbManifest(cwd) ?? defaultKbManifest();
  writeKbManifest(cwd, {
    ...existingManifest,
    schemaVersion: LATEST_KB_SCHEMA_VERSION,
    semanticAdvisorBackfill,
  });
  const migratedAt = new Date().toISOString();

  writeJsonAtomically(
    auditPath,
    buildMigrationAuditRecord({
      branch,
      manifestPath: KB_MANIFEST_RELATIVE,
      fromVersion: configStatus.currentVersion,
      migratedAt,
      semanticAdvisorBackfill,
      symbolGranularityLegacyLinks: symbolGranularityMigration.count,
      warning: migrationWarning,
      steps: migrationSteps.map((step) => step.id),
    }),
  );

  console.log(
    `Migrated the KB to schemaVersion ${LATEST_KB_SCHEMA_VERSION} on the canonical .kb/ layout (was ${fromVersionLabel}).`,
  );
  if (symbolGranularityMigration.count > 0) {
    console.log(
      `Marked ${symbolGranularityMigration.count} existing coarse symbol link(s) as legacy-link.`,
    );
  }
  if (semanticAdvisorBackfill === "pending") {
    console.log(
      `Marked semantic advisor backfill as pending in ${KB_MANIFEST_RELATIVE}.`,
    );
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

async function buildWorkspaceMigrationPlan(
  workspaceRoot = process.cwd(),
): Promise<MigrationPlan> {
  const [
    { createCliRuntime },
    { executeOperation },
    { statusSpec },
    { checkSpec },
    { coverageSpec },
    { mergeMigrationPlans },
  ] = await Promise.all([
    import("../runtime/cli-runtime.js"),
    import("../public/operations/runtime-types.js"),
    import("../public/operations/specs/discovery.js"),
    import("../public/operations/specs/check.js"),
    import("../public/operations/specs/reporting.js"),
    import("../public/operations/migration-plan.js"),
  ]);
  const runtime = createCliRuntime({ workspaceRoot });
  const statusResult = await executeOperation(runtime, statusSpec, {});
  const status = statusResult.structuredContent;
  const plans: MigrationPlan[] = [];
  if (status?.migrationPlan !== undefined) plans.push(status.migrationPlan);
  const storeHealthy = status?.branchStore?.state === "healthy";
  const schemaCurrent = status?.schemaStatus?.needsMigration !== true;
  if (
    storeHealthy &&
    schemaCurrent &&
    status?.branchAttachment?.kind === "exact"
  ) {
    const checkResult = await executeOperation(runtime, checkSpec, {});
    if (checkResult.structuredContent?.migrationPlan !== undefined) {
      plans.push(checkResult.structuredContent.migrationPlan);
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
  if (plans.length === 0) {
    const { buildMigrationPlan } = await import(
      "../public/operations/migration-plan.js"
    );
    return buildMigrationPlan({
      evaluatedDomains: ["package", "branch", "storage", "schema"],
      incompleteDomains: ["status"],
      diagnostics: [
        "Unable to assemble downstream migration domains from the current workspace state.",
      ],
    });
  }
  return mergeMigrationPlans(plans);
}

async function migratePlanCommand(
  options: MigrateOptions,
): Promise<{ exitCode: number }> {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  const plan = await buildWorkspaceMigrationPlan(workspaceRoot);
  if (options.applySafe === true) {
    if (!options.approvedPlanHash) {
      console.error("--apply-safe requires --approved-plan-hash <sha256>.");
      return { exitCode: 2 };
    }
    if (options.approvedPlanHash !== plan.planHash) {
      console.error(
        "Migration plan changed; regenerate the plan and approve its current hash.",
      );
      return { exitCode: 2 };
    }
    const approvedActionIds =
      options.approvedActionIds && options.approvedActionIds.length > 0
        ? options.approvedActionIds
        : plan.actions
            .filter(
              (action) => action.state === "ready" && action.autoApplicable,
            )
            .map((action) => action.id);
    if (approvedActionIds.length === 0) {
      console.log("No approved automatic migration actions are ready.");
      return { exitCode: 0 };
    }
    const [{ createCliRuntime }, { executeOperation }, { applyPlanSpec }] =
      await Promise.all([
        import("../runtime/cli-runtime.js"),
        import("../public/operations/runtime-types.js"),
        import("../public/operations/specs/planning.js"),
      ]);
    const result = await executeOperation(
      createCliRuntime({ workspaceRoot }),
      applyPlanSpec,
      { plan, approvedPlanHash: options.approvedPlanHash, approvedActionIds },
    );
    if (options.format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.content[0]?.text ?? "Migration applied.");
      console.log(JSON.stringify(result.structuredContent, null, 2));
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
