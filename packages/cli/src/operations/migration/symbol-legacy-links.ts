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

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { load as parseYAML } from "js-yaml";
import { createTsMorphSourceAnalysisProvider } from "../../extractors/symbols-ts.js";
import {
  coarseLinkBehavioralNames,
  isTraceabilityRelationshipType,
} from "../../public/symbol-granularity.js";
import {
  type ExtractSymbolsOptions,
  extractSymbolsFromStagedFile,
} from "../../traceability/symbol-extract.js";
import { KB_PATHS } from "../../utils/kb-paths.js";
import { writeFileAtomically } from "./kb-sources.js";

/**
 * Mark the coarse traceability links of a symbols manifest
 * `granularity_reason: legacy-link`.
 *
 * A link is coarse by the staged granularity gate's own rule
 * (`coarseLinkBehavioralNames`): the source declares behavioral symbols
 * narrower than the manifest symbol, so `kibi check --staged` would block the
 * first commit that touches it. The pass is idempotent and independent of
 * the schema version: it marks whatever the current rule calls coarse and
 * has no reason yet, and a second run finds nothing.
 */

/** Automatic migration action code of the legacy-link pass. */
// implements REQ-cli-schema-migration
export const SYMBOL_LEGACY_LINK_MARK_CODE = "symbol_legacy_link_mark";
// implements REQ-cli-schema-migration
export const SYMBOL_LEGACY_LINK_MARK_ACTION_ID = "symbol-legacy-link-mark";

/** One coarse link the pass marks. */
// implements REQ-cli-schema-migration
export type LegacyLinkTarget = Readonly<{
  id: string;
  title: string;
  sourceFile: string;
  /** The narrower behavioral symbols that make the link coarse. */
  granularSymbols: readonly string[];
}>;

// implements REQ-cli-schema-migration
export type LegacyLinkPlan = Readonly<{
  /** Workspace-relative manifest path. */
  manifestPath: string;
  /** SHA-256 of the manifest bytes the plan was read from; null when absent. */
  manifestHash: string | null;
  targets: readonly LegacyLinkTarget[];
}>;

type SymbolRecord = Record<string, unknown>;

function isRecord(value: unknown): value is SymbolRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function linkType(link: unknown): unknown {
  // A bare string link compiles as `implements`; a typed link keeps its type.
  if (typeof link === "string") return "implements";
  return isRecord(link) ? link.type : undefined;
}

/** True when the record compiles at least one traceability relationship. */
function hasTraceabilityRelationship(record: SymbolRecord): boolean {
  const links = Array.isArray(record.links) ? record.links : [];
  const relationships = Array.isArray(record.relationships)
    ? record.relationships
    : [];
  return [
    ...links.map(linkType),
    ...relationships.map((relationship) =>
      isRecord(relationship) ? relationship.type : undefined,
    ),
  ].some(isTraceabilityRelationshipType);
}

type SourceAnalyzer = NonNullable<ExtractSymbolsOptions["analyzeText"]>;

/**
 * The analyzer the staged gate uses (the built-in ts-morph provider), built
 * once per pass: a provider per file would rebuild the TypeScript project for
 * every source the manifest names.
 */
function sharedAnalyzer(): SourceAnalyzer {
  let provider: ReturnType<typeof createTsMorphSourceAnalysisProvider> | null =
    null;
  return (filePath, content) => {
    provider ??= createTsMorphSourceAnalysisProvider();
    return provider.supportsFile(filePath)
      ? provider.analyzeText(filePath, content)
      : null;
  };
}

function sourceSymbols(
  workspaceRoot: string,
  sourceFile: string,
  analyzeText: SourceAnalyzer,
) {
  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.join(workspaceRoot, sourceFile);
  if (!existsSync(absolutePath)) return [];
  try {
    return extractSymbolsFromStagedFile(
      {
        path: sourceFile,
        status: "M",
        hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
        content: readFileSync(absolutePath, "utf8"),
      },
      undefined,
      { analyzeText },
    );
  } catch {
    return [];
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `title` is an exported function, variable (not a class
 * expression), interface, type or enum declaration of the source file
 * and no class of that name exists. The extractor then reports `title`
 * itself and no `title.*` member, so nothing is narrower and the link is not
 * coarse: the full analysis reaches the same answer, only much slower, and a
 * manifest names hundreds of such functions.
 */
function declaresMemberlessSymbol(
  workspaceRoot: string,
  sourceFile: string,
  title: string,
  cache: Map<string, string | null>,
): boolean {
  if (!/^[A-Za-z_$][\w$]*$/.test(title)) return false;
  let content = cache.get(sourceFile);
  if (content === undefined) {
    try {
      content = readFileSync(path.resolve(workspaceRoot, sourceFile), "utf8");
    } catch {
      content = null;
    }
    cache.set(sourceFile, content);
  }
  if (content === null) return false;
  const name = escapeRegExp(title);
  if (new RegExp(`\\bclass\\s+${name}\\b`).test(content)) return false;
  return [
    `^export\\s+(?:default\\s+)?(?:async\\s+)?function\\s*\\*?\\s*${name}\\s*[(<]`,
    `^export\\s+(?:declare\\s+)?(?:interface|type|enum|const\\s+enum)\\s+${name}\\b`,
    // A variable, unless its initializer is a class expression (members).
    `^export\\s+(?:const|let|var)\\s+${name}\\s*(?::[^=\\n]*)?=\\s*(?!class\\b)\\S`,
  ].some((pattern) => new RegExp(pattern, "m").test(content));
}

function digest(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * The coarse links of `manifestPath` (default `.kb/symbols.yaml`) that carry
 * no granularity_reason yet. Read-only.
 */
// implements REQ-cli-schema-migration, REQ-symbol-behavioral-anchors
export function planSymbolLegacyLinks(
  workspaceRoot: string,
  manifestPath: string = KB_PATHS.symbolsManifest,
): LegacyLinkPlan {
  const absolute = path.resolve(workspaceRoot, manifestPath);
  let content: string;
  try {
    content = readFileSync(absolute, "utf8");
  } catch {
    return { manifestPath, manifestHash: null, targets: [] };
  }
  const empty = { manifestPath, manifestHash: digest(content), targets: [] };
  let parsed: unknown;
  try {
    parsed = parseYAML(content);
  } catch {
    // A malformed manifest fails sync with its own diagnostic.
    return empty;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.symbols)) return empty;

  const targets: LegacyLinkTarget[] = [];
  const symbolsByFile = new Map<string, ReturnType<typeof sourceSymbols>>();
  const analyzeText = sharedAnalyzer();
  const sourceText = new Map<string, string | null>();
  for (const record of parsed.symbols) {
    if (!isRecord(record)) continue;
    if (
      typeof record.id !== "string" ||
      typeof record.title !== "string" ||
      typeof record.sourceFile !== "string"
    )
      continue;
    if (record.granularity_reason !== undefined) continue;
    if (!hasTraceabilityRelationship(record)) continue;
    if (
      declaresMemberlessSymbol(
        workspaceRoot,
        record.sourceFile,
        record.title,
        sourceText,
      )
    )
      continue;
    let symbols = symbolsByFile.get(record.sourceFile);
    if (symbols === undefined) {
      symbols = sourceSymbols(workspaceRoot, record.sourceFile, analyzeText);
      symbolsByFile.set(record.sourceFile, symbols);
    }
    const granularSymbols = coarseLinkBehavioralNames(record.title, symbols);
    if (granularSymbols.length === 0) continue;
    targets.push({
      id: record.id,
      title: record.title,
      sourceFile: record.sourceFile,
      granularSymbols,
    });
  }
  return { manifestPath, manifestHash: digest(content), targets };
}

function unquoted(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    (trimmed.startsWith('"') || trimmed.startsWith("'")) &&
    trimmed.endsWith(trimmed[0] ?? "")
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Insert `granularity_reason: legacy-link` into each listed symbol entry,
 * leaving every other byte of the manifest as it was.
 */
function withLegacyReasons(content: string, symbolIds: Set<string>): string {
  const lines = content.split("\n");
  const output: string[] = [];
  let activeId: string | null = null;
  let activeHasReason = false;
  let activePropertyIndent = "";

  const flushLegacyReason = (): void => {
    if (
      activeId !== null &&
      symbolIds.has(activeId) &&
      !activeHasReason &&
      activePropertyIndent.length > 0
    ) {
      output.push(`${activePropertyIndent}granularity_reason: legacy-link`);
      activeHasReason = true;
    }
  };

  for (const line of lines) {
    const idMatch = line.match(/^(\s*)-\s+id:\s+(.+?)\s*$/);
    if (idMatch) {
      flushLegacyReason();
      activeId = unquoted(idMatch[2] ?? "");
      activeHasReason = false;
      activePropertyIndent = `${idMatch[1] ?? ""}  `;
    }

    if (activeId !== null && /^\s+granularity_reason:\s+/.test(line)) {
      activeHasReason = true;
    }

    if (
      activeId !== null &&
      symbolIds.has(activeId) &&
      !activeHasReason &&
      /^\s+status:\s+/.test(line)
    ) {
      const indent = line.match(/^\s*/)?.[0] ?? "";
      output.push(`${indent}granularity_reason: legacy-link`);
      activeHasReason = true;
    }

    output.push(line);
  }

  flushLegacyReason();
  return output.join("\n");
}

/**
 * Mark the coarse links found by `planSymbolLegacyLinks`. With
 * `expectedHash` (a migration plan's evidence), the manifest must still hold
 * the bytes the plan was read from; a manifest whose planned links are all
 * marked already is left alone, so the pass is idempotent. Returns the ids
 * marked, and the planned ones that could not be marked in place (an entry
 * whose `id` is not its first key, for example).
 */
// implements REQ-cli-schema-migration, REQ-symbol-behavioral-anchors
export function applySymbolLegacyLinks(
  workspaceRoot: string,
  options: {
    manifestPath?: string;
    expectedHash?: string;
    expectedIds?: readonly string[];
  } = {},
): { marked: string[]; unmarked: string[] } {
  const plan = planSymbolLegacyLinks(
    workspaceRoot,
    options.manifestPath ?? KB_PATHS.symbolsManifest,
  );
  if (plan.targets.length === 0) return { marked: [], unmarked: [] };
  if (
    options.expectedHash !== undefined &&
    plan.manifestHash !== options.expectedHash
  ) {
    throw new Error(
      `${plan.manifestPath} changed since planning; rerun kibi migrate and approve the new plan.`,
    );
  }
  const ids = new Set(
    plan.targets
      .map((target) => target.id)
      .filter(
        (id) =>
          options.expectedIds === undefined || options.expectedIds.includes(id),
      ),
  );
  if (ids.size === 0) return { marked: [], unmarked: [] };
  const absolute = path.resolve(workspaceRoot, plan.manifestPath);
  const content = readFileSync(absolute, "utf8");
  const next = withLegacyReasons(content, ids);
  const marked = markedIds(content, next, ids);
  if (marked === null)
    throw new Error(
      `${plan.manifestPath}: legacy-link reasons could not be added without changing other symbol fields; add granularity_reason: legacy-link by hand.`,
    );
  if (marked.length > 0) writeFileAtomically(absolute, next);
  return {
    marked,
    unmarked: [...ids].filter((id) => !marked.includes(id)).sort(),
  };
}

/**
 * The ids whose only change between `before` and `after` is a new
 * `granularity_reason: legacy-link`, or null when anything else changed.
 */
function markedIds(
  before: string,
  after: string,
  ids: ReadonlySet<string>,
): string[] | null {
  try {
    const previous = parseYAML(before) as { symbols?: unknown };
    const next = parseYAML(after) as { symbols?: unknown };
    if (
      !Array.isArray(previous.symbols) ||
      !Array.isArray(next.symbols) ||
      previous.symbols.length !== next.symbols.length
    )
      return null;
    const marked: string[] = [];
    for (const [index, entry] of next.symbols.entries()) {
      const old = previous.symbols[index];
      if (!isRecord(entry) || !isRecord(old)) {
        if (!isDeepStrictEqual(entry, old)) return null;
        continue;
      }
      const { granularity_reason: reason, ...rest } = entry;
      const { granularity_reason: oldReason, ...oldRest } = old;
      if (!isDeepStrictEqual(rest, oldRest)) return null;
      if (reason === oldReason) continue;
      if (
        reason !== "legacy-link" ||
        oldReason !== undefined ||
        typeof entry.id !== "string" ||
        !ids.has(entry.id)
      )
        return null;
      marked.push(entry.id);
    }
    return marked.sort();
  } catch {
    return null;
  }
}
