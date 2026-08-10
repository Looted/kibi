import type { KbConfig } from "./config.js";

// implements REQ-003
export const LATEST_KB_SCHEMA_VERSION = 4;

export interface SchemaVersionStatus {
  status: "missing" | "invalid" | "older" | "current" | "newer";
  currentVersion: number | null;
  latestVersion: number;
  needsMigration: boolean;
  warning: string | null;
}

type SchemaVersionConfig = Pick<KbConfig, "schemaVersion"> | null | undefined;

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
  config?: SchemaVersionConfig,
): SchemaVersionStatus {
  const latestVersion = LATEST_KB_SCHEMA_VERSION;
  const hasSchemaVersion =
    config !== null && config !== undefined && "schemaVersion" in config;
  const currentVersion = normalizeSchemaVersion(config?.schemaVersion);

  if (currentVersion === null) {
    return {
      status: hasSchemaVersion ? "invalid" : "missing",
      currentVersion: null,
      latestVersion,
      needsMigration: true,
      warning: hasSchemaVersion
        ? "KB config schemaVersion is invalid and should be migrated."
        : "KB config schemaVersion is missing; legacy config should be migrated.",
    };
  }

  if (currentVersion > latestVersion) {
    return {
      status: "newer",
      currentVersion,
      latestVersion,
      needsMigration: false,
      warning: `KB config schemaVersion ${currentVersion} is newer than the latest supported version ${latestVersion}.`,
    };
  }

  if (currentVersion < latestVersion) {
    return {
      status: "older",
      currentVersion,
      latestVersion,
      needsMigration: true,
      warning: `KB config schemaVersion ${currentVersion} is older than the latest version ${latestVersion} and should be migrated.`,
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
