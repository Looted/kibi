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

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import {
  CANONICAL_ENTITY_PATHS,
  type KbEntityPaths,
  LEGACY_DEFAULT_ENTITY_PATHS,
} from "./kb-paths.js";

/**
 * Kibi no longer has a user-editable configuration file. Entity source
 * locations live in the canonical `.kb/` namespace defined in `kb-paths.ts`,
 * and check policy is owned by Kibi's rule registry. This module retains
 * only the canonical accessors plus read-only recognition of the legacy
 * `.kb/config.json` document for migration tooling.
 */

export type { KbEntityPaths };

/** Canonical entity paths; always the same, never merged with user input. */
export const DEFAULT_CONFIG_PATHS: KbEntityPaths = CANONICAL_ENTITY_PATHS;

/**
 * Load the canonical entity paths. The result is constant: Kibi owns the
 * layout and repositories cannot relocate knowledge lanes.
 */
export function loadEntityPaths(_cwd: string = process.cwd()): KbEntityPaths {
  return CANONICAL_ENTITY_PATHS;
}

/** Legacy `.kb/config.json` path document, kept only for migration input. */
export interface LegacyKbConfigPaths {
  requirements?: string;
  scenarios?: string;
  tests?: string;
  adr?: string;
  flags?: string;
  events?: string;
  facts?: string;
  symbols?: string;
}

/** Recognized legacy `.kb/config.json` fields (migration recognition only). */
export interface LegacyKbConfig {
  paths?: LegacyKbConfigPaths;
  /** Pre-manifest top-level symbols manifest override. */
  symbolsManifest?: string;
  schemaVersion?: number | string;
  semanticAdvisorBackfill?: "pending" | "completed" | "not_applicable";
  checks?: unknown;
  defaultBranch?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pickLegacyPathValue(
  paths: Record<string, unknown>,
  key: keyof LegacyKbConfigPaths,
): string | undefined {
  const value = paths[key];
  return typeof value === "string" ? value : undefined;
}

/** Whether a legacy `.kb/config.json` exists at the workspace root. */
export function legacyConfigExists(cwd: string): boolean {
  return existsSync(path.join(cwd, ".kb", "config.json"));
}

/**
 * Read a legacy `.kb/config.json` if one exists. Malformed JSON returns
 * `kind: "malformed"` so migration can report actionable diagnostics
 * instead of silently guessing paths.
 */
export function readLegacyKbConfig(
  cwd: string,
):
  | { kind: "none" }
  | { kind: "malformed"; error: string }
  | { kind: "present"; config: LegacyKbConfig } {
  const configPath = path.join(cwd, ".kb", "config.json");
  if (!existsSync(configPath)) return { kind: "none" };
  let raw: string;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (error) {
    return {
      kind: "malformed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {
        kind: "malformed",
        error: "config.json must contain a JSON object",
      };
    }
    const paths = isRecord(parsed.paths) ? parsed.paths : undefined;
    let legacyPaths: LegacyKbConfigPaths | undefined = undefined;
    if (paths !== undefined) {
      const next: LegacyKbConfigPaths = {};
      for (const key of [
        "requirements",
        "scenarios",
        "tests",
        "adr",
        "flags",
        "events",
        "facts",
        "symbols",
      ] as const) {
        const value = pickLegacyPathValue(paths, key);
        if (value !== undefined) {
          next[key] = value;
        }
      }
      legacyPaths = Object.keys(next).length > 0 ? next : undefined;
    }
    return {
      kind: "present",
      config: {
        ...(typeof parsed.schemaVersion === "number" ||
        typeof parsed.schemaVersion === "string"
          ? { schemaVersion: parsed.schemaVersion }
          : {}),
        ...(parsed.semanticAdvisorBackfill === "pending" ||
        parsed.semanticAdvisorBackfill === "completed" ||
        parsed.semanticAdvisorBackfill === "not_applicable"
          ? { semanticAdvisorBackfill: parsed.semanticAdvisorBackfill }
          : {}),
        ...(typeof parsed.symbolsManifest === "string"
          ? { symbolsManifest: parsed.symbolsManifest }
          : {}),
        ...(typeof parsed.defaultBranch === "string"
          ? { defaultBranch: parsed.defaultBranch }
          : {}),
        ...(parsed.checks !== undefined ? { checks: parsed.checks } : {}),
        ...(legacyPaths !== undefined ? { paths: legacyPaths } : {}),
      },
    };
  } catch (error) {
    return {
      kind: "malformed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Resolve the effective legacy entity paths for migration discovery:
 * configured values win, then the historical `documentation/` defaults.
 * Glob-bearing values are preserved so migration can strip them to roots.
 */
export function resolveLegacyEntityPaths(
  config: LegacyKbConfig | undefined,
): KbEntityPaths {
  const paths = config?.paths;
  const pick = (key: keyof LegacyKbConfigPaths): string => {
    const configured = paths?.[key];
    if (typeof configured === "string" && configured.trim().length > 0) {
      return configured.trim();
    }
    return LEGACY_DEFAULT_ENTITY_PATHS[key];
  };
  const symbolsConfigured = paths?.symbols ?? config?.symbolsManifest;
  return {
    requirements: pick("requirements"),
    scenarios: pick("scenarios"),
    tests: pick("tests"),
    adr: pick("adr"),
    flags: pick("flags"),
    events: pick("events"),
    facts: pick("facts"),
    symbols:
      typeof symbolsConfigured === "string" &&
      symbolsConfigured.trim().length > 0
        ? symbolsConfigured.trim()
        : LEGACY_DEFAULT_ENTITY_PATHS.symbols,
  };
}
