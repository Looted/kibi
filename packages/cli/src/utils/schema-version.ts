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

// Schema 8 requires body context on current entities and pins requirement
// semantic_text so context sections never change a requirement's meaning.
// Schema 9 adds decision firmness on requirements and ADRs and requires a
// "Why this changed" section on new supersedes.
// Schema 10 reads a requirement or ADR without firmness as firm unless an
// agent wrote it.
// Schema 11 checks each current requirement's evidence level against its
// floor (required_evidence, else tested when firm).
// Schema 12 requires every certificate-kind proof contract to name the
// claims it proves.
// Schema 13 derives symbol coordinates on every sync and keeps
// .kb/symbol-coordinates.yaml out of Git.
// Schema 14 adds the retired requirement status (with retired_reason) and
// blocks current facts, scenarios and tests owned only by retired
// requirements.
// Schema 15 gives a requirement a person approved (origin.approved_by) the
// tested evidence floor unless it sets required_evidence or states its
// firmness.
// Schema 16 restores subject facts as domain definitions: a subject needs a
// definition and no duplicate, and every unmodeled claim names its subjects.
// Schema 17 requires a must requirement written after the upgrade to have a
// success scenario that assumes facts on its subjects.
export const LATEST_KB_SCHEMA_VERSION = 17;

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

export function getSchemaVersionStatus(
  config?: SchemaVersionSource,
): SchemaVersionStatus {
  const latestVersion = LATEST_KB_SCHEMA_VERSION;
  // An explicit null counts as a recorded (invalid) version.
  const hasSchemaVersion = config?.schemaVersion !== undefined;
  const currentVersion = normalizeSchemaVersion(config?.schemaVersion);

  if (currentVersion === null) {
    return {
      status: hasSchemaVersion ? "invalid" : "missing",
      currentVersion: null,
      latestVersion,
      needsMigration: true,
      warning: hasSchemaVersion
        ? "KB schemaVersion is invalid; run 'kibi migrate' to plan the repair."
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
      warning: `KB schemaVersion ${currentVersion} is older than the latest version ${latestVersion}; run 'kibi migrate' to plan the upgrade.`,
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
