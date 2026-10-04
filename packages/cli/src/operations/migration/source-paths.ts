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

import { existsSync } from "node:fs";
import path from "node:path";
import { ENTITY_LANES, KB_PATHS, KB_ROOT } from "../../utils/kb-paths.js";
import {
  listLaneMarkdownFiles,
  readText,
  readTopLevelField,
  sliceFrontmatter,
  withTopLevelField,
  withoutTopLevelField,
  writeFileAtomically,
} from "./kb-sources.js";

/**
 * The authored `source` frontmatter field is dead data. The compiled
 * `source` is always the entity's own file: the Markdown extractor ignores
 * the field, and Kibi never writes it. Values written before the canonical
 * `.kb/` layout still name knowledge files by their old path: under the
 * retired `documentation/` tree, or relative to the knowledge root
 * (`requirements/REQ-x.md`). This module finds the values that resolve to
 * nothing (the `source-path-dangling` check) and every value `kibi migrate`
 * repairs: a moved file is rewritten to its `.kb/` path, and a value that
 * names the entity's own file or nothing Kibi can map is removed. A value
 * naming another existing workspace path, an entity id or an http(s) URL is
 * provenance and stays.
 */

/** One authored `source` value and the entity file that carries it. */
export type AuthoredSourceRef = Readonly<{
  entityId: string;
  /** Workspace-relative, `/`-separated path of the entity's own file. */
  file: string;
  value: unknown;
}>;

export type AuthoredSourceScan = Readonly<{
  refs: readonly AuthoredSourceRef[];
  /** Ids of every authored entity, symbols included. */
  entityIds: ReadonlySet<string>;
}>;

// implements REQ-core-validation-rules, REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SourceResolution =
  | Readonly<{ kind: "missing" | "path" | "entity" | "url" }>
  /** Names the entity's own file; `resolves` is false when that spelling names no existing path. */
  | Readonly<{ kind: "self"; resolves: boolean }>
  | Readonly<{ kind: "dangling"; rewrite?: string }>;

/** Why `kibi migrate` removes an authored `source` value. */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SourceRemovalReason = "self" | "dangling";

/** The edit `kibi migrate` makes to one authored `source` value. */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SourceFix =
  | Readonly<{ kind: "rewrite"; to: string }>
  | Readonly<{ kind: "remove"; reason: SourceRemovalReason }>;

/** One authored `source` value that is redundant or resolves to nothing. */
// implements REQ-core-validation-rules, REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SourceRepair = AuthoredSourceRef &
  Readonly<{
    /** Names no existing path, entity id or URL: `source-path-dangling` blocks it. */
    dangling: boolean;
    fix: SourceFix;
    /** Why the value cannot be edited safely; a person must edit it. */
    refused?: string;
  }>;

const URL_PATTERN = /^https?:\/\/\S+$/i;
const LEGACY_ROOT = "documentation/";
const SYMBOL_ID_LINE = /^[ \t]*-?[ \t]*id[ \t]*:[ \t]*(.+?)[ \t]*$/gm;
const SOURCE_EDIT_REFUSED =
  "the source field spans several lines, or editing it would change other frontmatter fields";

function scalarText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function unquote(value: string): string {
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

/** An authored value as plain text, the form plans record and compare. */
// implements REQ-core-validation-rules, REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export function shownSourceValue(value: unknown): string {
  return typeof value === "string" ? value : (JSON.stringify(value) ?? "");
}

/**
 * Read every authored entity's `source` field and id in one pass over the
 * canonical lanes, plus the symbol ids of the symbols manifest. Only the id
 * and source lines are parsed. Read-only.
 */
// implements REQ-core-validation-rules, REQ-cli-schema-migration, REQ-kibi-kb-lifecycle-integrity
export function scanAuthoredSources(workspaceRoot: string): AuthoredSourceScan {
  const refs: AuthoredSourceRef[] = [];
  const entityIds = new Set<string>();
  for (const file of listLaneMarkdownFiles(workspaceRoot)) {
    const content = readText(file.absolutePath);
    if (content === null) continue;
    const slice = sliceFrontmatter(content);
    if (slice === null) continue;
    const id =
      scalarText(readTopLevelField(slice.text, "id")) ||
      path.basename(file.relativePath, ".md");
    entityIds.add(id);
    const value = readTopLevelField(slice.text, "source");
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    refs.push({ entityId: id, file: file.relativePath, value });
  }
  const symbols = readText(path.join(workspaceRoot, KB_PATHS.symbolsManifest));
  if (symbols !== null) {
    for (const match of symbols.matchAll(SYMBOL_ID_LINE)) {
      const id = unquote(match[1] ?? "");
      if (id !== "") entityIds.add(id);
    }
  }
  return { refs, entityIds };
}

const LEGACY_LANE_ROOTS = new Set<string>([...ENTITY_LANES, "symbols.yaml"]);

/**
 * Resolve one authored `source` value: an existing workspace path (any
 * `#anchor` suffix ignored), an existing entity id or an http(s) URL. With
 * the entity's own `file`, a value naming that file (canonical or
 * pre-canonical spelling, `./` and `#anchor` ignored, compared
 * case-insensitively) resolves to `self`. A dangling
 * `documentation/<lane>/...` or `<lane>/...` value carries the
 * `.kb/<lane>/...` rewrite when that file exists.
 */
// implements REQ-core-validation-rules, REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export function resolveAuthoredSource(
  value: unknown,
  context: Readonly<{
    workspaceRoot: string;
    entityIds: ReadonlySet<string>;
    exists: (relativePath: string) => boolean;
    /** Workspace-relative path of the entity's own file. */
    file?: string;
  }>,
): SourceResolution {
  if (value === undefined || value === null) return { kind: "missing" };
  const text = scalarText(value);
  if (text === undefined) return { kind: "dangling" };
  if (text === "") return { kind: "missing" };
  if (URL_PATTERN.test(text)) return { kind: "url" };
  if (context.entityIds.has(text)) return { kind: "entity" };
  const hash = text.indexOf("#");
  const anchor = hash >= 0 ? text.slice(hash) : "";
  const relative = (hash >= 0 ? text.slice(0, hash) : text)
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
  const own = context.file?.toLowerCase();
  const exists = relative !== "" && context.exists(relative);
  if (own !== undefined && relative.toLowerCase() === own) {
    return { kind: "self", resolves: exists };
  }
  // Another existing file is provenance, even when its path would map onto
  // the entity's own file under .kb/.
  if (exists) return { kind: "path" };
  const lower = relative.toLowerCase();
  const legacy = lower.startsWith(LEGACY_ROOT)
    ? lower.slice(LEGACY_ROOT.length)
    : lower;
  if (own !== undefined && `${KB_ROOT}/${legacy}` === own) {
    return { kind: "self", resolves: false };
  }
  const rest = relative.startsWith(LEGACY_ROOT)
    ? relative.slice(LEGACY_ROOT.length)
    : relative;
  const lane = rest.split("/")[0] ?? "";
  const target = `${KB_ROOT}/${rest}`;
  if (LEGACY_LANE_ROOTS.has(lane) && context.exists(target)) {
    return { kind: "dangling", rewrite: `${target}${anchor}` };
  }
  return { kind: "dangling" };
}

/** A memoized existence test confined to the workspace. */
export function workspacePathExists(
  workspaceRoot: string,
): (relativePath: string) => boolean {
  const root = path.resolve(workspaceRoot);
  const cache = new Map<string, boolean>();
  return (relativePath) => {
    const cached = cache.get(relativePath);
    if (cached !== undefined) return cached;
    const absolute = path.resolve(root, relativePath);
    const fromRoot = path.relative(root, absolute);
    const exists =
      !fromRoot.startsWith("..") &&
      !path.isAbsolute(fromRoot) &&
      existsSync(absolute);
    cache.set(relativePath, exists);
    return exists;
  };
}

function repairFor(
  ref: AuthoredSourceRef,
  resolution: SourceResolution,
): SourceRepair | undefined {
  if (resolution.kind === "self") {
    return {
      ...ref,
      dangling: !resolution.resolves,
      fix: { kind: "remove", reason: "self" },
    };
  }
  if (resolution.kind !== "dangling") return undefined;
  return {
    ...ref,
    dangling: true,
    fix:
      resolution.rewrite !== undefined
        ? { kind: "rewrite", to: resolution.rewrite }
        : { kind: "remove", reason: "dangling" },
  };
}

function editedContent(content: string, fix: SourceFix): string | null {
  return fix.kind === "rewrite"
    ? withTopLevelField(content, "source", fix.to)
    : withoutTopLevelField(content, "source");
}

/** Every repairable source value, sorted by entity id. Read-only. */
function classifySources(workspaceRoot: string): SourceRepair[] {
  const scan = scanAuthoredSources(workspaceRoot);
  const exists = workspacePathExists(workspaceRoot);
  const repairs: SourceRepair[] = [];
  for (const ref of scan.refs) {
    const repair = repairFor(
      ref,
      resolveAuthoredSource(ref.value, {
        workspaceRoot,
        entityIds: scan.entityIds,
        exists,
        file: ref.file,
      }),
    );
    if (repair !== undefined) repairs.push(repair);
  }
  return repairs.sort(
    (left, right) =>
      left.entityId.localeCompare(right.entityId) ||
      left.file.localeCompare(right.file),
  );
}

/** Mark the repairs whose edit would not read back as exactly that change. */
function withEditability(
  workspaceRoot: string,
  repairs: readonly SourceRepair[],
): SourceRepair[] {
  return repairs.map((repair) => {
    const content = readText(path.join(workspaceRoot, repair.file));
    if (content !== null && editedContent(content, repair.fix) !== null) {
      return repair;
    }
    return {
      ...repair,
      refused:
        content === null
          ? "the entity file cannot be read"
          : SOURCE_EDIT_REFUSED,
    };
  });
}

/**
 * Every authored `source` value that resolves to nothing, sorted by entity
 * id, with the fix `kibi migrate` makes and, when the edit is not safe, why.
 * Each path is checked once per call. Read-only.
 */
// implements REQ-core-validation-rules, REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export function findDanglingSources(workspaceRoot: string): SourceRepair[] {
  return withEditability(
    workspaceRoot,
    classifySources(workspaceRoot).filter((repair) => repair.dangling),
  );
}

/**
 * Every authored `source` value `kibi migrate` rewrites or removes: the
 * dangling ones plus existing values that name the entity's own file.
 * Read-only.
 */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export function findSourceRepairs(workspaceRoot: string): SourceRepair[] {
  return withEditability(workspaceRoot, classifySources(workspaceRoot));
}

export type SourcePathRewrite = Readonly<{
  entityId: string;
  file: string;
  from: string;
  to: string;
}>;

// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SourcePathRemoval = Readonly<{
  entityId: string;
  file: string;
  from: string;
  reason: SourceRemovalReason;
}>;

// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type PlannedSourcePathRepairs = Readonly<{
  rewrites: readonly SourcePathRewrite[];
  removals: readonly SourcePathRemoval[];
}>;

// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SourcePathRepairResult = Readonly<{
  rewritten: readonly SourcePathRewrite[];
  removed: readonly SourcePathRemoval[];
  skipped: readonly Readonly<{ file: string; reason: string }>[];
}>;

type PlannedRepair = SourcePathRewrite | SourcePathRemoval;

function plannedRepair(repair: SourceRepair): PlannedRepair {
  const base = {
    entityId: repair.entityId,
    file: repair.file,
    from: shownSourceValue(repair.value),
  };
  return repair.fix.kind === "rewrite"
    ? { ...base, to: repair.fix.to }
    : { ...base, reason: repair.fix.reason };
}

/**
 * The rewrite and removal records a migration plan lists for these repairs.
 * Repairs Kibi cannot edit safely are left out; they need a person.
 */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export function plannedSourcePathRepairs(
  repairs: readonly SourceRepair[],
): PlannedSourcePathRepairs {
  const rewrites: SourcePathRewrite[] = [];
  const removals: SourcePathRemoval[] = [];
  for (const repair of repairs) {
    if (repair.refused !== undefined) continue;
    const planned = plannedRepair(repair);
    if ("to" in planned) rewrites.push(planned);
    else removals.push(planned);
  }
  return { rewrites, removals };
}

function samePlannedRepair(left: PlannedRepair, right: PlannedRepair): boolean {
  if (left.entityId !== right.entityId || left.from !== right.from) {
    return false;
  }
  if ("to" in left) return "to" in right && left.to === right.to;
  return "reason" in right && left.reason === right.reason;
}

/**
 * Repair each redundant or dead `source` value, editing only its line: a
 * moved knowledge file is rewritten to its `.kb/` path, and a value naming
 * the entity's own file or nothing Kibi can map is removed. With `planned`,
 * only those repairs are applied, and only while the value still reads as
 * planned. A value that cannot be edited safely is skipped with a reason.
 * Idempotent: a repaired value is not found again.
 */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export function applySourcePathRepairs(
  workspaceRoot: string,
  planned?: PlannedSourcePathRepairs,
): SourcePathRepairResult {
  const wanted =
    planned === undefined
      ? undefined
      : new Map<string, PlannedRepair>(
          [...planned.rewrites, ...planned.removals].map((repair) => [
            repair.file,
            repair,
          ]),
        );
  const rewritten: SourcePathRewrite[] = [];
  const removed: SourcePathRemoval[] = [];
  const skipped: Array<{ file: string; reason: string }> = [];
  for (const repair of classifySources(workspaceRoot)) {
    const current = plannedRepair(repair);
    if (wanted !== undefined) {
      const plan = wanted.get(repair.file);
      if (plan === undefined) continue;
      if (!samePlannedRepair(plan, current)) {
        skipped.push({
          file: repair.file,
          reason: "source changed since planning",
        });
        continue;
      }
    }
    const absolute = path.join(workspaceRoot, repair.file);
    const content = readText(absolute);
    const next = content === null ? null : editedContent(content, repair.fix);
    if (next === null) {
      skipped.push({ file: repair.file, reason: SOURCE_EDIT_REFUSED });
      continue;
    }
    writeFileAtomically(absolute, next);
    if ("to" in current) rewritten.push(current);
    else removed.push(current);
  }
  return { rewritten, removed, skipped };
}
