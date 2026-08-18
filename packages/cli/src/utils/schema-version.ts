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

// implements REQ-003
export const LATEST_KB_SCHEMA_VERSION = 5;

export interface SchemaVersionStatus {
  status: "missing" | "invalid" | "older" | "current" | "newer";
  currentVersion: number | null;
  latestVersion: number;
  needsMigration: boolean;
  warning: string | null;
}

export type SchemaVersionSource =
  | { schemaVersion: number | string | null | undefined }
  | null
  | undefined;

// implements REQ-003
export function normalizeSchemaVersion(
  schemaVersion: number | string | null | undefined,
): number | null {
  if (schemaVersion === undefined || schemaVersion === null) {
    return null;
  }

  if (typeof schemaVersion === "number") {
    return Number.isInteger(schemaVersion) ? schemaVersion : null;
  }

  const trimmed = schemaVersion.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

// implements REQ-003
export function getSchemaVersionStatus(
  config?: SchemaVersionSource,
): SchemaVersionStatus {
  const latestVersion = LATEST_KB_SCHEMA_VERSION;
  const hasSchemaVersion =
    config !== null &&
    config !== undefined &&
    "schemaVersion" in config &&
    config.schemaVersion !== undefined;
  const currentVersion = normalizeSchemaVersion(config?.schemaVersion);

  if (currentVersion === null) {
    return {
      status: hasSchemaVersion ? "invalid" : "missing",
      currentVersion: null,
      latestVersion,
      needsMigration: true,
      warning: hasSchemaVersion
        ? "KB schemaVersion is invalid and should be migrated."
        : "KB schemaVersion is missing; the repository should be initialized or migrated.",
    };
  }

  if (currentVersion > latestVersion) {
    return {
      status: "newer",
      currentVersion,
      latestVersion,
      needsMigration: false,
      warning: `KB schemaVersion ${currentVersion} is newer than the latest supported version ${latestVersion}.`,
    };
  }

  if (currentVersion < latestVersion) {
    return {
      status: "older",
      currentVersion,
      latestVersion,
      needsMigration: true,
      warning: `KB schemaVersion ${currentVersion} is older than the latest version ${latestVersion} and should be migrated.`,
    };
  }

  return {
    status: "current",
    currentVersion,
    latestVersion,
    needsMigration: false,
    warning: null,
  };
}
