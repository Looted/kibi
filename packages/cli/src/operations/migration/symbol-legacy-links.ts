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
import { readFileSync } from "node:fs";
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
  type ExtractedSymbol,
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

/**
 * True for a YAML value whose fields can be read: anything but null. A
 * scalar or a list has none of the fields read here, like a record without
 * them.
 */
function isRecord(value: unknown): value is SymbolRecord {
  return value != null;
}

function linkType(link: unknown): unknown {
  // A bare string link compiles as `implements`; a typed link keeps its type.
  if (typeof link === "string") return "implements";
  return isRecord(link) ? link.type : undefined;
}

const listOf = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

/** True when the record compiles at least one traceability relationship. */
function hasTraceabilityRelationship(record: SymbolRecord): boolean {
  const links = listOf(record.links);
  const relationships = listOf(record.relationships);
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

/** The source text; empty when it cannot be read, so it declares nothing. */
function readSource(workspaceRoot: string, sourceFile: string): string {
  // rationale: any other text without declarations gives the same answer.
  // Stryker disable next-line StringLiteral
  let content = "";
  try {
    content = readFileSync(path.resolve(workspaceRoot, sourceFile), "utf8");
  } catch {
    // An unreadable source declares nothing.
  }
  return content;
}

/** The symbols the staged gate reads from a whole source file. */
function sourceSymbols(
  sourceFile: string,
  content: string,
  analyzeText: SourceAnalyzer,
): ExtractedSymbol[] {
  try {
    // As a new file, so every symbol counts. rationale: the status and hunks
    // only filter symbols by changed lines, and all of them are in scope.
    // Stryker disable StringLiteral,ArrayDeclaration
    const staged = {
      path: sourceFile,
      status: "A" as const,
      hunkRanges: [],
      content,
    };
    // Stryker restore StringLiteral,ArrayDeclaration
    return extractSymbolsFromStagedFile(staged, undefined, { analyzeText });
  } catch {
    return [];
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `title` is an exported function, variable (not a class
 * expression), interface, type or enum declaration of `content`
 * and no class of that name exists. The extractor then reports `title`
 * itself and no `title.*` member, so nothing is narrower and the link is not
 * coarse: the full analysis reaches the same answer, only much slower, and a
 * manifest names hundreds of such functions.
 */
function declaresMemberlessSymbol(content: string, title: string): boolean {
  if (!/^[A-Za-z_$][\w$]*$/.test(title)) return false;
  const name = escapeRegExp(title);
  if (new RegExp(`\\bclass\\s+${name}\\b`).test(content)) return false;
  return [
    `^export\\s+(?:default\\s+)?(?:async\\s+)?function\\s*\\*?\\s*${name}\\s*[(<]`,
    `^export\\s+(?:declare\\s+)?(?:interface|type|enum|const\\s+enum)\\s+${name}\\b`,
    // A variable, unless its initializer is a class expression (members).
    `^export\\s+(?:const|let|var)\\s+${name}\\s*(?::[^=\\n]*)?=\\s*(?!class\\b)\\S`,
  ].some((pattern) => new RegExp(pattern, "m").test(content));
}

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
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
  let bytes: Buffer;
  try {
    bytes = readFileSync(absolute);
  } catch {
    return { manifestPath, manifestHash: null, targets: [] };
  }
  const empty = { manifestPath, manifestHash: digest(bytes), targets: [] };
  let parsed: unknown;
  try {
    parsed = parseYAML(bytes.toString());
  } catch {
    // A malformed manifest fails sync with its own diagnostic.
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.symbols)) return empty;

  const targets: LegacyLinkTarget[] = [];
  const sources = new Map<
    string,
    { content: string; symbols?: ExtractedSymbol[] }
  >();
  const analyzeText = sharedAnalyzer();
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
    let source = sources.get(record.sourceFile);
    if (source === undefined) {
      source = { content: readSource(workspaceRoot, record.sourceFile) };
      sources.set(record.sourceFile, source);
    }
    if (declaresMemberlessSymbol(source.content, record.title)) continue;
    source.symbols ??= sourceSymbols(
      record.sourceFile,
      source.content,
      analyzeText,
    );
    const granularSymbols = coarseLinkBehavioralNames(
      record.title,
      source.symbols,
    );
    if (granularSymbols.length === 0) continue;
    targets.push({
      id: record.id,
      title: record.title,
      sourceFile: record.sourceFile,
      granularSymbols,
    });
  }
  return { ...empty, targets };
}

/**
 * A YAML scalar's text without its quotes; `value` is already trimmed. A
 * quoted scalar ends with its quote unless a comment follows, and then the
 * text matches no id either way.
 */
function unquoted(value: string): string {
  const quote = value[0];
  return quote === '"' || quote === "'" ? value.slice(1, -1) : value;
}

/**
 * Insert `granularity_reason: legacy-link` into each listed symbol entry,
 * leaving every other byte of the manifest as it was.
 */
function withLegacyReasons(content: string, symbolIds: Set<string>): string {
  const output: string[] = [];
  // The property indent of the current entry while it is listed and has no
  // reason yet; null otherwise.
  let pending: string | null = null;
  const addReason = (): void => {
    if (pending !== null)
      output.push(`${pending}granularity_reason: legacy-link`);
    pending = null;
  };

  // The final newline stays last, after a reason added to the last entry.
  const trailing = content.endsWith("\n");
  const lines = (trailing ? content.slice(0, -1) : content).split("\n");
  for (const line of lines) {
    const idMatch = line.match(/^(\s*)-\s+id:\s+(.+?)\s*$/);
    if (idMatch) {
      addReason();
      const [, indent, id] = idMatch as unknown as [string, string, string];
      pending = symbolIds.has(unquoted(id)) ? `${indent}  ` : null;
    }
    if (/^\s+granularity_reason:\s/.test(line)) pending = null;
    const status = pending === null ? null : line.match(/^(\s+)status:\s/);
    if (status) {
      pending = status[1] as string;
      addReason();
    }
    output.push(line);
  }

  addReason();
  return `${output.join("\n")}${trailing ? "\n" : ""}`;
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
    const previous = (parseYAML(before) as { symbols: unknown[] }).symbols;
    const next = (parseYAML(after) as { symbols: unknown[] }).symbols;
    const marked: string[] = [];
    const unmarked = next.map((entry, index) => {
      if (
        !isRecord(entry) ||
        entry.granularity_reason !== "legacy-link" ||
        (previous[index] as SymbolRecord).granularity_reason !== undefined ||
        !ids.has(entry.id as string)
      )
        return entry;
      marked.push(entry.id as string);
      const { granularity_reason: _reason, ...rest } = entry;
      return rest;
    });
    return isDeepStrictEqual(unmarked, previous) ? marked.sort() : null;
  } catch {
    return null;
  }
}
