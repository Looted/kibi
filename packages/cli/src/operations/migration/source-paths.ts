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
  writeFileAtomically,
} from "./kb-sources.js";

/**
 * The authored `source` frontmatter field names where an entity came from: a
 * workspace document, another entity, or a URL. It is provenance, distinct
 * from the compiled `source` (the entity's own file). Values written before
 * the canonical `.kb/` layout still name knowledge files by their old path:
 * under the retired `documentation/` tree, or relative to the knowledge root
 * (`requirements/REQ-x.md`). This module finds values that resolve to nothing
 * and the ones that map mechanically onto the file under `.kb/`.
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

export type SourceResolution =
  | Readonly<{ kind: "missing" | "path" | "entity" | "url" }>
  | Readonly<{ kind: "dangling"; rewrite?: string }>;

/** One `source` value that resolves to nothing. */
export type DanglingSource = AuthoredSourceRef &
  Readonly<{
    /** The moved `.kb/` file the value maps onto, when it exists. */
    rewrite?: string;
  }>;

const URL_PATTERN = /^https?:\/\/\S+$/i;
const LEGACY_ROOT = "documentation/";
const SYMBOL_ID_LINE = /^[ \t]*-?[ \t]*id[ \t]*:[ \t]*(.+?)[ \t]*$/gm;

function scalarText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function unquote(value: string): string {
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

/**
 * Read every authored entity's `source` field and id in one pass over the
 * canonical lanes, plus the symbol ids of the symbols manifest. Only the id
 * and source lines are parsed. Read-only.
 */
// implements REQ-core-validation-rules, REQ-cli-schema-migration
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
 * `#anchor` suffix ignored), an existing entity id or an http(s) URL. A
 * dangling `documentation/<lane>/...` or `<lane>/...` value carries the
 * `.kb/<lane>/...` rewrite when that file exists.
 */
// implements REQ-core-validation-rules, REQ-cli-schema-migration
export function resolveAuthoredSource(
  value: unknown,
  context: Readonly<{
    workspaceRoot: string;
    entityIds: ReadonlySet<string>;
    exists: (relativePath: string) => boolean;
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
  if (relative !== "" && context.exists(relative)) return { kind: "path" };
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

/**
 * Every authored `source` value that resolves to nothing, sorted by entity
 * id. Each path is checked once per call. Read-only.
 */
// implements REQ-core-validation-rules, REQ-cli-schema-migration
export function findDanglingSources(workspaceRoot: string): DanglingSource[] {
  const scan = scanAuthoredSources(workspaceRoot);
  const context = {
    workspaceRoot,
    entityIds: scan.entityIds,
    exists: workspacePathExists(workspaceRoot),
  };
  const dangling: DanglingSource[] = [];
  for (const ref of scan.refs) {
    const resolution = resolveAuthoredSource(ref.value, context);
    if (resolution.kind !== "dangling") continue;
    dangling.push(
      resolution.rewrite !== undefined
        ? { ...ref, rewrite: resolution.rewrite }
        : ref,
    );
  }
  return dangling.sort(
    (left, right) =>
      left.entityId.localeCompare(right.entityId) ||
      left.file.localeCompare(right.file),
  );
}

export type SourcePathRewrite = Readonly<{
  entityId: string;
  file: string;
  from: string;
  to: string;
}>;

export type SourcePathRewriteResult = Readonly<{
  written: readonly SourcePathRewrite[];
  skipped: readonly Readonly<{ file: string; reason: string }>[];
}>;

/**
 * Rewrite each dangling `documentation/<lane>/...` or `<lane>/...` source to
 * the `.kb/<lane>/...` file it names, editing only the `source` line. With `planned`, only
 * those rewrites are applied, and only while the value still reads as planned.
 * Idempotent: a rewritten value resolves and is not found again.
 */
// implements REQ-cli-schema-migration
export function applySourcePathRewrites(
  workspaceRoot: string,
  planned?: readonly SourcePathRewrite[],
): SourcePathRewriteResult {
  const wanted =
    planned === undefined
      ? undefined
      : new Map(planned.map((rewrite) => [rewrite.file, rewrite]));
  const written: SourcePathRewrite[] = [];
  const skipped: Array<{ file: string; reason: string }> = [];
  for (const source of findDanglingSources(workspaceRoot)) {
    if (source.rewrite === undefined || typeof source.value !== "string") {
      continue;
    }
    const rewrite: SourcePathRewrite = {
      entityId: source.entityId,
      file: source.file,
      from: source.value,
      to: source.rewrite,
    };
    if (wanted !== undefined) {
      const plan = wanted.get(source.file);
      if (plan === undefined) continue;
      if (plan.from !== rewrite.from || plan.to !== rewrite.to) {
        skipped.push({
          file: source.file,
          reason: "source changed since planning",
        });
        continue;
      }
    }
    const absolute = path.join(workspaceRoot, source.file);
    const content = readText(absolute);
    const next =
      content === null
        ? null
        : withTopLevelField(content, "source", rewrite.to);
    if (next === null) {
      skipped.push({
        file: source.file,
        reason: "source could not be rewritten without changing other fields",
      });
      continue;
    }
    writeFileAtomically(absolute, next);
    written.push(rewrite);
  }
  return { written, skipped };
}
