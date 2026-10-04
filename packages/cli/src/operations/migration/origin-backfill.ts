/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import { inferTypeFromPath } from "../../extractors/markdown.js";
import {
  type EntityOrigin,
  SCHEMA6_MIGRATION_ORIGIN_REF,
  normalizeEntityOrigin,
} from "../../public/entity-origin.js";
import {
  listLaneMarkdownFiles,
  readText,
  sliceFrontmatter,
  writeFileAtomically,
} from "./kb-sources.js";

/** One authored entity the v5 -> v6 migration stamps with an origin. */
export type OriginBackfillTarget = Readonly<{
  id: string;
  type: string;
  path: string;
}>;

export type OriginBackfillSkip = Readonly<{ path: string; reason: string }>;

export type OriginBackfillPlan = Readonly<{
  targets: readonly OriginBackfillTarget[];
  /** Files Kibi cannot stamp safely; sync reports most of them anyway. */
  skipped: readonly OriginBackfillSkip[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

type Candidate =
  | { kind: "target"; target: OriginBackfillTarget; content: string }
  | { kind: "skip"; skip: OriginBackfillSkip }
  | { kind: "has_origin"; migrated: boolean };

function inspect(
  workspaceRoot: string,
  absolutePath: string,
  relativePath: string,
): Candidate {
  const content = readText(absolutePath);
  if (content === null) {
    return { kind: "skip", skip: { path: relativePath, reason: "unreadable" } };
  }
  const slice = sliceFrontmatter(content);
  if (slice === null) {
    return {
      kind: "skip",
      skip: { path: relativePath, reason: "no closed YAML frontmatter" },
    };
  }
  let data: unknown;
  try {
    data = loadYaml(slice.text);
  } catch (error) {
    return {
      kind: "skip",
      skip: {
        path: relativePath,
        reason: `frontmatter does not parse: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
  if (!isRecord(data) || typeof data.title !== "string") {
    return {
      kind: "skip",
      skip: { path: relativePath, reason: "frontmatter has no title" },
    };
  }
  if (data.origin !== undefined) {
    const origin = normalizeEntityOrigin(data.origin);
    return {
      kind: "has_origin",
      migrated:
        "origin" in origin &&
        origin.origin.kind === "migration" &&
        origin.origin.ref === SCHEMA6_MIGRATION_ORIGIN_REF,
    };
  }
  const id =
    typeof data.id === "string" && data.id.trim() !== ""
      ? data.id.trim()
      : path.basename(relativePath, ".md");
  const type =
    typeof data.type === "string"
      ? data.type
      : (inferTypeFromPath(path.join(workspaceRoot, relativePath)) ?? "");
  return { kind: "target", target: { id, type, path: relativePath }, content };
}

/** Authored Markdown entities that carry no origin yet. Read-only. */
// implements REQ-cli-schema-migration, REQ-004
export function planOriginBackfill(workspaceRoot: string): OriginBackfillPlan {
  const targets: OriginBackfillTarget[] = [];
  const skipped: OriginBackfillSkip[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot)) {
    const candidate = inspect(
      workspaceRoot,
      file.absolutePath,
      file.relativePath,
    );
    if (candidate.kind === "target") targets.push(candidate.target);
    else if (candidate.kind === "skip") skipped.push(candidate.skip);
  }
  return { targets, skipped };
}

/** The origin recorded on entities the v5 -> v6 migration backfills. */
export function migrationOrigin(recordedAt: string): EntityOrigin {
  return {
    kind: "migration",
    ref: SCHEMA6_MIGRATION_ORIGIN_REF,
    recorded_at: recordedAt,
  };
}

/**
 * Append `origin` as the last frontmatter key of one document, leaving every
 * other byte unchanged, and confirm the frontmatter reads back with the same
 * fields plus that origin. Returns null when the edit would not read back.
 */
// implements REQ-cli-schema-migration
export function withBackfilledOrigin(
  content: string,
  origin: EntityOrigin,
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  const block = dumpYaml({ origin }, { lineWidth: -1, noRefs: true })
    .split("\n")
    .join(slice.eol);
  const text = `${slice.text}${block}`;
  try {
    const before = loadYaml(slice.text);
    const after = loadYaml(text);
    if (!isRecord(before) || !isRecord(after)) return null;
    const { origin: readBack, ...rest } = after;
    const normalized = normalizeEntityOrigin(readBack);
    if (
      !("origin" in normalized) ||
      !isDeepStrictEqual(normalized.origin, origin) ||
      !isDeepStrictEqual(rest, before)
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return `${slice.prefix}${text}${slice.suffix}`;
}

export type OriginBackfillResult = Readonly<{
  written: readonly OriginBackfillTarget[];
  skipped: readonly OriginBackfillSkip[];
  /** Entities an earlier run (or plan action) already stamped. */
  previouslyStamped: number;
}>;

/**
 * Stamp `origin: {kind: migration, ref, recorded_at}` on every authored
 * Markdown entity without an origin. Idempotent: entities that already carry
 * an origin, including ones stamped by an earlier run, are left alone.
 */
// implements REQ-cli-schema-migration, REQ-004
export function applyOriginBackfill(
  workspaceRoot: string,
  recordedAt: string,
): OriginBackfillResult {
  const origin = migrationOrigin(recordedAt);
  const written: OriginBackfillTarget[] = [];
  const skipped: OriginBackfillSkip[] = [];
  let previouslyStamped = 0;
  for (const file of listLaneMarkdownFiles(workspaceRoot)) {
    const candidate = inspect(
      workspaceRoot,
      file.absolutePath,
      file.relativePath,
    );
    if (candidate.kind === "has_origin") {
      if (candidate.migrated) previouslyStamped += 1;
      continue;
    }
    if (candidate.kind === "skip") {
      skipped.push(candidate.skip);
      continue;
    }
    const next = withBackfilledOrigin(candidate.content, origin);
    if (next === null) {
      skipped.push({
        path: file.relativePath,
        reason: "origin could not be appended without changing other fields",
      });
      continue;
    }
    writeFileAtomically(file.absolutePath, next);
    written.push(candidate.target);
  }
  return { written, skipped, previouslyStamped };
}
