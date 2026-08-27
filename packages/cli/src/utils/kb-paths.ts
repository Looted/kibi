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

/**
 * Canonical Kibi project-knowledge namespace.
 *
 * Kibi owns one opinionated layout under `.kb/`. Entity source lanes, the
 * symbols manifest, relationship shards, and the lifecycle manifest are
 * Kibi-owned but Git-tracked project knowledge; branch stores and recovery
 * state are derived runtime data. Nothing in this module is user-configurable.
 */

export const KB_ROOT = ".kb";

/** Kibi-owned entity-source lanes (Git-tracked authored knowledge). */
export const ENTITY_LANES = [
  "requirements",
  "scenarios",
  "tests",
  "facts",
  "adr",
  "flags",
  "events",
] as const;

export type EntityLane = (typeof ENTITY_LANES)[number];

/** Config-key spelling used by legacy `.kb/config.json` path configuration. */
export const LEGACY_CONFIG_PATH_KEYS: Readonly<Record<EntityLane, string>> = {
  requirements: "requirements",
  scenarios: "scenarios",
  tests: "tests",
  facts: "facts",
  adr: "adr",
  flags: "flags",
  events: "events",
};

const LANE_SUFFIX = Object.fromEntries(
  ENTITY_LANES.map((lane) => [lane, `/${lane}/`]),
) as Record<EntityLane, `/${EntityLane}/`>;

export const KB_PATHS = {
  /** Repo-relative canonical lane directories under `.kb/`. */
  lanes: {
    requirements: ".kb/requirements",
    scenarios: ".kb/scenarios",
    tests: ".kb/tests",
    facts: ".kb/facts",
    adr: ".kb/adr",
    flags: ".kb/flags",
    events: ".kb/events",
  },
  symbolsManifest: ".kb/symbols.yaml",
  symbolCoordinates: ".kb/symbol-coordinates.yaml",
  manifest: ".kb/manifest.json",
  relationships: ".kb/relationships",
} as const;

/** Derived runtime trees. Authored knowledge and relationship shards stay writable. */
export const DERIVED_KB_PREFIXES = [
  ".kb/branches",
  ".kb/recovery",
  ".kb/verification",
  ".kb/briefs",
  ".kb/migrations",
] as const;

export type KbEntityPaths = Readonly<{
  requirements: string;
  scenarios: string;
  tests: string;
  adr: string;
  flags: string;
  events: string;
  facts: string;
  symbols: string;
}>;

/** Canonical, non-configurable entity source paths. */
export const CANONICAL_ENTITY_PATHS: KbEntityPaths = {
  requirements: KB_PATHS.lanes.requirements,
  scenarios: KB_PATHS.lanes.scenarios,
  tests: KB_PATHS.lanes.tests,
  adr: KB_PATHS.lanes.adr,
  flags: KB_PATHS.lanes.flags,
  events: KB_PATHS.lanes.events,
  facts: KB_PATHS.lanes.facts,
  symbols: KB_PATHS.symbolsManifest,
};

/** Legacy default entity paths (pre-canonical layout) used for migration only. */
export const LEGACY_DEFAULT_ENTITY_PATHS: KbEntityPaths = {
  requirements: "documentation/requirements",
  scenarios: "documentation/scenarios",
  tests: "documentation/tests",
  adr: "documentation/adr",
  flags: "documentation/flags",
  events: "documentation/events",
  facts: "documentation/facts",
  symbols: "documentation/symbols.yaml",
};

export function isEntityLanePath(repoRelativePath: string): boolean {
  if (!repoRelativePath.startsWith(`${KB_ROOT}/`)) return false;
  const rest = repoRelativePath.slice(KB_ROOT.length + 1);
  const segment = rest.split("/")[0] ?? "";
  return (ENTITY_LANES as readonly string[]).includes(segment);
}

export function entityLaneForPath(repoRelativePath: string): EntityLane | null {
  for (const lane of ENTITY_LANES) {
    if (repoRelativePath.includes(LANE_SUFFIX[lane])) {
      return lane;
    }
  }
  return null;
}

export function isSymbolsManifestPath(repoRelativePath: string): boolean {
  return (
    repoRelativePath === KB_PATHS.symbolsManifest ||
    repoRelativePath === KB_PATHS.symbolCoordinates
  );
}

/** True when the path is any Kibi-owned tracked knowledge artifact. */
export function isKbKnowledgePath(repoRelativePath: string): boolean {
  return (
    isEntityLanePath(repoRelativePath) ||
    isSymbolsManifestPath(repoRelativePath)
  );
}

function toPosixRepoPath(repoRelativePath: string): string {
  return repoRelativePath.replaceAll("\\", "/");
}

/** True when the path is a derived runtime tree that agents must not author. */
export function isDerivedKbPath(repoRelativePath: string): boolean {
  const posix = toPosixRepoPath(repoRelativePath);
  return DERIVED_KB_PREFIXES.some(
    (prefix) => posix === prefix || posix.startsWith(`${prefix}/`),
  );
}
