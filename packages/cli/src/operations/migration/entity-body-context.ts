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

import { isDeepStrictEqual } from "node:util";
import { load as loadYaml } from "js-yaml";
import {
  CONTEXT_MISSING_TAG,
  assessContext,
  isContextAcknowledged,
} from "../../entity-body-context.js";
import { legacyRequirementSemanticText } from "../../extractors/markdown.js";
import {
  authoredSupersededIds,
  contextEntityOf,
  isCurrentAuthoredEntity,
  listContextAuthoredEntities,
  readAuthoredEntity,
} from "../../public/operations/entity-context.js";
import { readKbManifest, writeKbManifest } from "../../utils/kb-manifest.js";
import {
  listLaneMarkdownFiles,
  readText,
  sliceFrontmatter,
  withTopLevelField,
  writeFileAtomically,
} from "./kb-sources.js";

/** Schema 8: pin the checked meaning of requirements that never stated one. */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export const SEMANTIC_TEXT_PIN_CODE = "semantic_text_pin";
/** Schema 8: acknowledge current entities that lack body context. */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export const CONTEXT_MISSING_TAG_CODE = "context_missing_tag";

/** One authored file the schema 8 migration rewrites (front matter only). */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export type BodyContextTarget = Readonly<{
  id: string;
  type: string;
  path: string;
  before: string;
  after: string;
}>;

// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export type BodyContextPlan = Readonly<{
  targets: readonly BodyContextTarget[];
  /** Files Kibi cannot edit safely, with the reason. */
  skipped: readonly Readonly<{ id: string; path: string; reason: string }>[];
  /** Context-less entities that already carried the tag before migration. */
  alreadyTagged?: readonly string[];
}>;

/**
 * Ids the schema 8 migration acknowledges: every context-less entity it tags
 * plus those that already carried the tag. Recorded in the manifest, which is
 * the only thing that makes the tag honored by `entity-context-missing`.
 */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export function acknowledgedContextIds(plan: BodyContextPlan): string[] {
  return [
    ...new Set([
      ...plan.targets.map((target) => target.id),
      ...(plan.alreadyTagged ?? []),
    ]),
  ].sort();
}

/**
 * Requirements without a front-matter `semantic_text`, pinned to the value
 * the pre-schema-8 derivation produces from the body (context sections
 * included), so claim spans and hashes do not move when the extractor stops
 * reading context sections. Read-only.
 */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export function planSemanticTextPins(workspaceRoot: string): BodyContextPlan {
  const targets: BodyContextTarget[] = [];
  const skipped: { id: string; path: string; reason: string }[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, ["requirements"])) {
    const before = readText(file.absolutePath);
    if (before === null) continue;
    const entity = readAuthoredEntity(before, file.relativePath);
    if (entity === null || entity.type !== "req") continue;
    const pinned = entity.data.semantic_text;
    if (typeof pinned === "string" && pinned.trim() !== "") continue;
    const derived = legacyRequirementSemanticText(entity.body);
    if (derived === "") continue;
    const after = withTopLevelField(before, "semantic_text", derived);
    if (after === null) {
      skipped.push({
        id: entity.id,
        path: file.relativePath,
        reason: "semantic_text could not be edited safely",
      });
      continue;
    }
    targets.push({
      id: entity.id,
      type: entity.type,
      path: file.relativePath,
      before,
      after,
    });
  }
  return { targets, skipped };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Add one tag to a document's front matter, leaving every other byte
 * unchanged. Handles an absent key, a one-line flow list and a block list of
 * plain items; returns null for anything else or when the edit would not read
 * back as exactly that one added tag.
 */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export function withAddedTag(content: string, tag: string): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  let before: unknown;
  try {
    before = loadYaml(slice.text);
  } catch {
    return null;
  }
  if (!isRecord(before)) return null;
  const existing = before.tags;
  if (existing !== undefined && existing !== null && !Array.isArray(existing))
    return null;
  const eol = slice.eol;
  const lines = slice.text.split(/\r?\n/);
  // The text ends with a line break, so the last element is empty.
  const body = lines.slice(0, -1);
  const keyIndex = body.findIndex((line) => /^tags[ \t]*:/.test(line));
  let next: string[];
  if (keyIndex < 0) {
    next = [...body, "tags:", `  - ${tag}`];
  } else {
    const line = body[keyIndex] ?? "";
    const rest = line.slice(line.indexOf(":") + 1).trim();
    if (rest.startsWith("[") && rest.endsWith("]")) {
      const inner = rest.slice(1, -1).trim();
      const edited = `${line.slice(0, line.indexOf(":") + 1)} [${inner === "" ? tag : `${inner}, ${tag}`}]`;
      next = [...body.slice(0, keyIndex), edited, ...body.slice(keyIndex + 1)];
    } else if (rest === "" || rest === "null" || rest === "~") {
      let end = keyIndex + 1;
      let indent = "  ";
      while (end < body.length) {
        const item = /^([ \t]*)-[ \t]+\S/.exec(body[end] ?? "");
        if (item === null) break;
        if (end === keyIndex + 1) indent = item[1] ?? "";
        end += 1;
      }
      const head =
        rest === "" ? line : `${line.slice(0, line.indexOf(":") + 1)}`;
      next = [
        ...body.slice(0, keyIndex),
        head,
        ...body.slice(keyIndex + 1, end),
        `${indent}- ${tag}`,
        ...body.slice(end),
      ];
    } else {
      return null;
    }
  }
  const text = `${next.join(eol)}${eol}`;
  try {
    const after = loadYaml(text);
    if (!isRecord(after)) return null;
    const { tags: beforeTags, ...beforeRest } = before;
    const { tags: afterTags, ...afterRest } = after;
    const expected = [...(Array.isArray(beforeTags) ? beforeTags : []), tag];
    if (
      !isDeepStrictEqual(afterTags, expected) ||
      !isDeepStrictEqual(beforeRest, afterRest)
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return `${slice.prefix}${text}${slice.suffix}`;
}

/**
 * Current requirements, scenarios, tests, ADRs and observation facts whose
 * body fails the context check and that are not yet tagged, to be tagged
 * `review:context-missing`. No prose is written: the tag only acknowledges the
 * gap. Read-only.
 */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export function planContextMissingTags(workspaceRoot: string): BodyContextPlan {
  const entities = listContextAuthoredEntities(workspaceRoot);
  const superseded = authoredSupersededIds(workspaceRoot, entities);
  const targets: BodyContextTarget[] = [];
  const skipped: { id: string; path: string; reason: string }[] = [];
  const alreadyTagged: string[] = [];
  for (const entity of entities) {
    if (!isCurrentAuthoredEntity(entity, superseded)) continue;
    const view = contextEntityOf(entity);
    if (assessContext(entity.type, entity.body, view).ok) continue;
    if (isContextAcknowledged(view.tags)) {
      alreadyTagged.push(entity.id);
      continue;
    }
    const before = readText(`${workspaceRoot}/${entity.path}`);
    if (before === null) continue;
    const after = withAddedTag(before, CONTEXT_MISSING_TAG);
    if (after === null) {
      skipped.push({
        id: entity.id,
        path: entity.path,
        reason: "tags could not be edited safely",
      });
      continue;
    }
    targets.push({
      id: entity.id,
      type: entity.type,
      path: entity.path,
      before,
      after,
    });
  }
  return { targets, skipped, alreadyTagged };
}

/** Count targets by entity type, sorted by type. */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export function countByType(
  targets: readonly Pick<BodyContextTarget, "type">[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const target of targets) {
    counts[target.type] = (counts[target.type] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function applyPlan(workspaceRoot: string, plan: BodyContextPlan): number {
  for (const target of plan.targets) {
    writeFileAtomically(`${workspaceRoot}/${target.path}`, target.after);
  }
  return plan.targets.length;
}

/** Pin semantic_text, then return how many requirements were rewritten. */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export function applySemanticTextPins(workspaceRoot: string): number {
  return applyPlan(workspaceRoot, planSemanticTextPins(workspaceRoot));
}

/** Tag entities that lack context, then return how many were rewritten. */
// implements REQ-kb-entity-body-context, REQ-cli-schema-migration
export function applyContextMissingTags(workspaceRoot: string): number {
  const plan = planContextMissingTags(workspaceRoot);
  const count = applyPlan(workspaceRoot, plan);
  recordContextAcknowledged(workspaceRoot, acknowledgedContextIds(plan));
  return count;
}

/**
 * Record the acknowledged ids in the manifest. The tag alone is never honored
 * by `entity-context-missing`; the manifest is what the migration vouches with.
 */
function recordContextAcknowledged(
  workspaceRoot: string,
  ids: readonly string[],
): void {
  if (ids.length === 0) return;
  const manifest = readKbManifest(workspaceRoot);
  if (manifest === null) return;
  writeKbManifest(workspaceRoot, {
    ...manifest,
    contextAcknowledged: [
      ...new Set([...(manifest.contextAcknowledged ?? []), ...ids]),
    ].sort(),
  });
}
