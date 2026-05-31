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
import { extractSymbolsFromStagedFile } from "../traceability/symbol-extract.js";
import { resolveActiveBranch } from "../utils/branch-resolver.js";
import type { KbConfig } from "../utils/config.js";
import { DEFAULT_CONFIG } from "../utils/config.js";
import {
  LATEST_KB_SCHEMA_VERSION,
  getSchemaVersionStatus,
  normalizeSchemaVersion,
} from "../utils/schema-version.js";

interface MigrateOptions {
  dryRun?: boolean;
  yes?: boolean;
}

interface RawKbConfigDocument extends Partial<KbConfig> {
  [key: string]: unknown;
}

interface MigrationAuditRecord {
  auditVersion: number;
  branch: string;
  configPath: string;
  fromVersion: number | null;
  migratedAt: string;
  status: "applied";
  symbolGranularityLegacyLinks: number;
  toVersion: number;
  warning: string | null;
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
  const result = resolveActiveBranch(cwd);

  if ("error" in result) {
    const isNonGitContext =
      result.code === "NOT_A_GIT_REPO" || result.code === "GIT_NOT_AVAILABLE";

    if (isNonGitContext) {
      return {
        branch: "main",
        warnings: [
          "Not in a git repository; using 'main' for migration audit metadata.",
        ],
      };
    }

    return {
      error: `Failed to resolve active branch: ${result.error}`,
    };
  }

  return {
    branch: result.branch,
    warnings: [],
  };
}

function loadRawConfigDocument(
  cwd: string,
): { config: RawKbConfigDocument; configPath: string } | { error: string } {
  const kbDir = path.join(cwd, ".kb");
  const configPath = path.join(kbDir, "config.json");

  if (!existsSync(kbDir)) {
    return {
      error: "Missing .kb/ directory. Run 'kibi init' before 'kibi migrate'.",
    };
  }

  if (!existsSync(configPath)) {
    return {
      error:
        "Missing .kb/config.json. Run 'kibi init' to create a baseline config before migrating.",
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;

    if (
      parsed === null ||
      Array.isArray(parsed) ||
      typeof parsed !== "object"
    ) {
      return {
        error:
          ".kb/config.json must contain a JSON object. Fix the file and retry 'kibi migrate'.",
      };
    }

    return {
      config: parsed as RawKbConfigDocument,
      configPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: `Invalid .kb/config.json: ${message}. Fix the JSON or re-run 'kibi init'.`,
    };
  }
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

function formatSchemaVersion(
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
  configPath: string;
  fromVersion: number | null;
  migratedAt: string;
  symbolGranularityLegacyLinks: number;
  warning: string | null;
}): MigrationAuditRecord {
  return {
    auditVersion: MIGRATION_AUDIT_VERSION,
    branch: args.branch,
    configPath: args.configPath,
    fromVersion: args.fromVersion,
    migratedAt: args.migratedAt,
    status: "applied",
    symbolGranularityLegacyLinks: args.symbolGranularityLegacyLinks,
    toVersion: LATEST_KB_SCHEMA_VERSION,
    warning: args.warning,
  };
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
  config: RawKbConfigDocument;
  dryRun: boolean;
}): { count: number; manifestPath: string | null } {
  const configuredSymbolsPath =
    options.config.paths?.symbols ?? DEFAULT_CONFIG.paths.symbols;
  if (typeof configuredSymbolsPath !== "string") {
    return { count: 0, manifestPath: null };
  }

  const manifestPath = path.isAbsolute(configuredSymbolsPath)
    ? configuredSymbolsPath
    : path.join(options.cwd, configuredSymbolsPath);
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

// implements REQ-003
export async function migrateCommand(
  options: MigrateOptions = {},
): Promise<{ exitCode: number }> {
  const cwd = process.cwd();
  const branchResult = resolveMigrationBranch(cwd);

  if ("error" in branchResult) {
    console.error(branchResult.error);
    return { exitCode: 1 };
  }

  const configResult = loadRawConfigDocument(cwd);

  if ("error" in configResult) {
    console.error(configResult.error);
    return { exitCode: 1 };
  }

  const { branch, warnings: branchWarnings } = branchResult;
  const { config, configPath } = configResult;
  const configStatus = getSchemaVersionStatus(config);
  const normalizedVersion = normalizeSchemaVersion(config.schemaVersion);
  const rawSchemaVersion = config.schemaVersion;
  const needsCanonicalSchemaWrite =
    normalizedVersion === LATEST_KB_SCHEMA_VERSION &&
    rawSchemaVersion !== undefined &&
    rawSchemaVersion !== LATEST_KB_SCHEMA_VERSION;
  const migrationWarning = needsCanonicalSchemaWrite
    ? "KB config schemaVersion should be normalized to the latest numeric version."
    : configStatus.warning;
  const warnings = [
    ...branchWarnings,
    ...(migrationWarning ? [migrationWarning] : []),
  ];
  const auditPath = path.join(cwd, ".kb", "migrations", `${branch}.json`);
  const configPathRelative = toRelativePath(cwd, configPath);
  const auditPathRelative = toRelativePath(cwd, auditPath);

  for (const warning of warnings) {
    printWarning(warning);
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

  if (!configStatus.needsMigration && !needsCanonicalSchemaWrite) {
    console.log(
      `No migration needed: ${configPathRelative} is already at schemaVersion ${LATEST_KB_SCHEMA_VERSION}.`,
    );

    if (existsSync(auditPath)) {
      console.log(`Existing migration audit metadata: ${auditPathRelative}`);
    }

    return { exitCode: 0 };
  }

  const fromVersionLabel = formatSchemaVersion(
    rawSchemaVersion,
    normalizedVersion,
  );
  const symbolGranularityMigration = migrateSymbolGranularity({
    cwd,
    config,
    dryRun: options.dryRun || !options.yes,
  });

  if (options.dryRun) {
    console.log(
      `dry run: would migrate ${configPathRelative} schemaVersion from ${fromVersionLabel} to ${LATEST_KB_SCHEMA_VERSION}.`,
    );
    console.log(
      `dry run: would write migration audit metadata to ${auditPathRelative}.`,
    );
    if (symbolGranularityMigration.count > 0) {
      console.log(
        `dry run: would mark ${symbolGranularityMigration.count} legacy coarse symbol link(s) in ${toRelativePath(cwd, symbolGranularityMigration.manifestPath ?? "symbols.yaml")}.`,
      );
    }
    console.log("Re-run with --yes to apply these changes.");
    return { exitCode: 0 };
  }

  if (!options.yes) {
    printWarning(`Migration required for ${configPathRelative}.`);
    console.log("No changes applied.");
    console.log("Use --dry-run to preview or --yes to apply the migration.");
    return { exitCode: 0 };
  }

  const nextConfig: RawKbConfigDocument = {
    ...config,
    schemaVersion: LATEST_KB_SCHEMA_VERSION,
  };
  const migratedAt = new Date().toISOString();

  writeJsonAtomically(configPath, nextConfig);
  writeJsonAtomically(
    auditPath,
    buildMigrationAuditRecord({
      branch,
      configPath: configPathRelative,
      fromVersion: configStatus.currentVersion,
      migratedAt,
      symbolGranularityLegacyLinks: symbolGranularityMigration.count,
      warning: migrationWarning,
    }),
  );

  console.log(
    `Migrated ${configPathRelative} schemaVersion from ${fromVersionLabel} to ${LATEST_KB_SCHEMA_VERSION}.`,
  );
  if (symbolGranularityMigration.count > 0) {
    console.log(
      `Marked ${symbolGranularityMigration.count} existing coarse symbol link(s) as legacy-link.`,
    );
  }
  console.log(`Wrote migration audit metadata to ${auditPathRelative}.`);
  console.log(
    "Migration complete. Future 'kibi migrate' runs will be a no-op.",
  );

  return { exitCode: 0 };
}
