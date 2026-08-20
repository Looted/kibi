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

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { KB_PATHS } from "./kb-paths.js";
import { LATEST_KB_SCHEMA_VERSION } from "./schema-version.js";

/**
 * Kibi-owned repository lifecycle manifest (`.kb/manifest.json`).
 *
 * Replaces the former user-facing `.kb/config.json`. Every field is
 * Kibi-managed: users never configure paths or enforcement policy. The
 * manifest carries only Kibi lifecycle metadata (schema version, migration
 * and semantic-backfill state).
 */

export const KB_MANIFEST_VERSION = 1;

export type SemanticAdvisorBackfill =
  | "pending"
  | "completed"
  | "not_applicable";

export interface KbManifest {
  /** Manifest payload schema, used to validate future formats safely. */
  manifestVersion: number;
  /** KB entity/relationship schema generation this repository uses. */
  schemaVersion: number;
  /** Retroactive semantic-advisor backfill review state. */
  semanticAdvisorBackfill: SemanticAdvisorBackfill;
}

export function defaultKbManifest(): KbManifest {
  return {
    manifestVersion: KB_MANIFEST_VERSION,
    schemaVersion: LATEST_KB_SCHEMA_VERSION,
    semanticAdvisorBackfill: "not_applicable",
  };
}

export type KbManifestStatus =
  | { state: "ok"; manifest: KbManifest; manifestHash: string | null }
  | {
      state: "missing" | "invalid" | "future";
      manifest: null;
      manifestHash: string | null;
      warning: string;
    };

function manifestPathFor(workspaceRoot: string): string {
  return path.join(workspaceRoot, KB_PATHS.manifest);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validate a parsed manifest document. Unknown fields are ignored so future
 * Kibi versions can add metadata without breaking older readers, but the
 * declared manifestVersion must not exceed what this build understands.
 */
function validateManifest(parsed: unknown): KbManifest | null {
  if (!isRecord(parsed)) return null;
  const rawVersion = parsed.manifestVersion;
  const manifestVersion =
    typeof rawVersion === "number" && Number.isInteger(rawVersion)
      ? rawVersion
      : null;
  if (manifestVersion === null) return null;
  if (manifestVersion > KB_MANIFEST_VERSION) return null;
  const schemaVersion = parsed.schemaVersion;
  if (
    typeof schemaVersion !== "number" ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    return null;
  }
  const backfill = parsed.semanticAdvisorBackfill;
  if (
    backfill !== "pending" &&
    backfill !== "completed" &&
    backfill !== "not_applicable"
  ) {
    return null;
  }
  return {
    manifestVersion,
    schemaVersion,
    semanticAdvisorBackfill: backfill,
  };
}

export function readKbManifestStatus(
  workspaceRoot: string,
): KbManifestStatus {
  const manifestPath = manifestPathFor(workspaceRoot);
  if (!existsSync(manifestPath)) {
    return {
      state: "missing",
      manifest: null,
      manifestHash: null,
      warning:
        "Kibi lifecycle manifest is missing; run 'kibi init' or 'kibi migrate' to create it.",
    };
  }
  let contents: string;
  try {
    contents = readFileSync(manifestPath, "utf8");
  } catch {
    return {
      state: "invalid",
      manifest: null,
      manifestHash: null,
      warning: `Kibi lifecycle manifest at ${KB_PATHS.manifest} is unreadable; re-run 'kibi init'.`,
    };
  }
  const manifestHash = createHash("sha256").update(contents).digest("hex");
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return {
      state: "invalid",
      manifest: null,
      manifestHash,
      warning: `Kibi lifecycle manifest at ${KB_PATHS.manifest} is not valid JSON; re-run 'kibi init'.`,
    };
  }
  const manifest = validateManifest(parsed);
  if (manifest === null) {
    const rawVersion = isRecord(parsed) ? parsed.manifestVersion : undefined;
    if (
      typeof rawVersion === "number" &&
      Number.isInteger(rawVersion) &&
      rawVersion > KB_MANIFEST_VERSION
    ) {
      return {
        state: "future",
        manifest: null,
        manifestHash,
        warning: `Kibi lifecycle manifest version ${rawVersion} is newer than this build supports (${KB_MANIFEST_VERSION}); upgrade kibi.`,
      };
    }
    return {
      state: "invalid",
      manifest: null,
      manifestHash,
      warning: `Kibi lifecycle manifest at ${KB_PATHS.manifest} is malformed; re-run 'kibi init' or 'kibi migrate'.`,
    };
  }
  return { state: "ok", manifest, manifestHash };
}

export function readKbManifest(
  workspaceRoot: string,
): KbManifest | null {
  const status = readKbManifestStatus(workspaceRoot);
  return status.state === "ok" ? status.manifest : null;
}

/** Read the manifest, tolerating missing/corrupt state with Kibi defaults. */
export function readKbManifestOrDefault(workspaceRoot: string): KbManifest {
  return readKbManifest(workspaceRoot) ?? defaultKbManifest();
}

function writeAtomically(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, content, "utf8");
  renameSync(tempPath, filePath);
}

export function writeKbManifest(
  workspaceRoot: string,
  manifest: KbManifest,
): string {
  const filePath = manifestPathFor(workspaceRoot);
  writeAtomically(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
  return filePath;
}
