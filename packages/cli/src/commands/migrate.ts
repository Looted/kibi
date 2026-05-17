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
import { resolveActiveBranch } from "../utils/branch-resolver.js";
import type { KbConfig } from "../utils/config.js";
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
  toVersion: number;
  warning: string | null;
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

function resolveMigrationBranch(cwd: string): ResolvedBranch | { error: string } {
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

    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
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
  mkdirSync(path.dirname(filePath), { recursive: true });

  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

function formatSchemaVersion(rawSchemaVersion: unknown, normalized: number | null): string {
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
  warning: string | null;
}): MigrationAuditRecord {
  return {
    auditVersion: MIGRATION_AUDIT_VERSION,
    branch: args.branch,
    configPath: args.configPath,
    fromVersion: args.fromVersion,
    migratedAt: args.migratedAt,
    status: "applied",
    toVersion: LATEST_KB_SCHEMA_VERSION,
    warning: args.warning,
  };
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
  const warnings = [...branchWarnings, ...(migrationWarning ? [migrationWarning] : [])];
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

  const fromVersionLabel = formatSchemaVersion(rawSchemaVersion, normalizedVersion);

  if (options.dryRun) {
    console.log(
      `dry run: would migrate ${configPathRelative} schemaVersion from ${fromVersionLabel} to ${LATEST_KB_SCHEMA_VERSION}.`,
    );
    console.log(
      `dry run: would write migration audit metadata to ${auditPathRelative}.`,
    );
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
      warning: migrationWarning,
    }),
  );

  console.log(
    `Migrated ${configPathRelative} schemaVersion from ${fromVersionLabel} to ${LATEST_KB_SCHEMA_VERSION}.`,
  );
  console.log(`Wrote migration audit metadata to ${auditPathRelative}.`);
  console.log("Migration complete. Future 'kibi migrate' runs will be a no-op.");

  return { exitCode: 0 };
}
