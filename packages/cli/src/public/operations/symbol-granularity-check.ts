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

import { readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import type { ExtractionResult } from "../../extractors/markdown.js";
import { createMaintenanceSourceAnalysisService } from "../../plugins/maintenance-source-analysis.js";
import {
  normalizeEntityId,
  parseEntityFromList,
  parseListOfLists,
  parseTriples,
} from "../../prolog/codec.js";
import {
  type ExtractedSymbol,
  extractSymbolsFromStagedFileAsync,
} from "../../traceability/symbol-extract.js";
import type { Violation } from "../../utils/rule-registry.js";
import { createSymbolGranularityDiagnostics } from "../impact/diagnostics.js";
import { createImpactManifestLookup } from "../impact/manifest.js";
import { normalizeSourceFile } from "../impact/source-changes.js";
import {
  getBehavioralSymbolNames,
  isAllowedGranularityReason,
  isCoarseGranularityReason,
  isTraceabilityRelationshipType,
} from "../symbol-granularity.js";
import type { PrologPort } from "./runtime-types.js";

/**
 * Full-check form of the staged gate's `symbol_granularity_violation`: a
 * symbol with traceability relationships must not link its source file
 * coarsely while narrower behavioral symbols are available, unless it carries
 * an allowed granularity_reason.
 */
// implements REQ-cli-check, REQ-cli-staged-impact-enforcement
export const SYMBOL_GRANULARITY_RULE = "symbol-granularity";

/**
 * A symbol whose title the source extractor does not produce for its file
 * (a private class member, a removed or renamed declaration) can never get
 * refreshed coordinates, and the staged gate reports it as stale manifest
 * evidence whenever the file is touched. Documented coarse records are exempt.
 */
// implements REQ-cli-check, REQ-generated-coordinate-persistence
export const SYMBOL_TITLE_UNEXTRACTED_RULE = "symbol-title-unextracted";

const SYMBOL_ROWS_QUERY =
  "findall([Id,symbol,Fields], (kb_entity(Id, symbol, Props), include([Key=_]>>memberchk(Key, [title,status,source,sourceFile,granularity_reason]), Props, Fields)), Rows)";
const SYMBOL_RELATIONSHIPS_QUERY =
  "findall([From,To,Type], (member(Type, [implements,covered_by,executable_for]), kb_relationship(Type, From, To), kb_entity(From, symbol, _)), Rels)";

function stringField(
  entity: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = entity[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// implements REQ-cli-check
async function loadSymbolResults(
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
): Promise<ExtractionResult[]> {
  const rows = await prolog.query(SYMBOL_ROWS_QUERY);
  if (!rows.success) {
    throw new Error(
      `symbol-granularity symbol projection failed: ${rows.error ?? "unknown error"}`,
    );
  }
  const rels = await prolog.query(SYMBOL_RELATIONSHIPS_QUERY);
  if (!rels.success) {
    throw new Error(
      `symbol-granularity relationship projection failed: ${rels.error ?? "unknown error"}`,
    );
  }

  const relationships = new Map<string, ExtractionResult["relationships"]>();
  for (const [rawFrom, rawTo, type] of parseTriples(
    rels.bindings.Rels ?? "[]",
  )) {
    const from = normalizeEntityId(rawFrom);
    const current = relationships.get(from) ?? [];
    current.push({ from, to: normalizeEntityId(rawTo), type });
    relationships.set(from, current);
  }

  const results: ExtractionResult[] = [];
  for (const row of parseListOfLists(rows.bindings.Rows ?? "[]")) {
    const entity = parseEntityFromList(row);
    const id = stringField(entity, "id");
    const sourceFile = stringField(entity, "sourceFile");
    if (id === undefined || sourceFile === undefined) continue;
    const granularityReason = stringField(entity, "granularity_reason");
    results.push({
      entity: {
        id,
        type: "symbol",
        title: stringField(entity, "title") ?? "",
        status: stringField(entity, "status") ?? "",
        created_at: "",
        updated_at: "",
        source: stringField(entity, "source") ?? "",
        ...(granularityReason !== undefined
          ? { granularity_reason: granularityReason }
          : {}),
      },
      relationships: relationships.get(id) ?? [],
      sourceFile: normalizeSourceFile(workspaceRoot, sourceFile),
    });
  }
  return results;
}

/**
 * The symbols the staged gate would judge: they carry a traceability
 * relationship and no allowed granularity_reason. Other symbols are exempt,
 * so their source files need no analysis.
 */
// implements REQ-cli-check
function granularityCandidates(
  results: readonly ExtractionResult[],
): ExtractionResult[] {
  return results.filter(
    (result) =>
      result.relationships.some((relationship) =>
        isTraceabilityRelationshipType(relationship.type),
      ) && !isAllowedGranularityReason(result.entity.granularity_reason),
  );
}

function readRegularFile(absolutePath: string): string | null {
  try {
    if (!statSync(absolutePath).isFile()) return null;
    return readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
}

type FileAnalysis = Readonly<{
  /** Every declaration as the staged gate names it (manifest locators). */
  symbols: readonly ExtractedSymbol[];
  /** Titles a manifest record may use for a declaration of this file. */
  titles: ReadonlySet<string>;
}>;

/**
 * Titles that name an extracted declaration: its qualified locator, or its
 * bare name while that name is unique in the file. This is the title set the
 * staged gate's symbols-manifest freshness check accepts.
 */
// implements REQ-cli-check, REQ-cli-staged-impact-enforcement
function extractedTitles(
  symbols: readonly { name: string; qualifiedName?: string }[],
): Set<string> {
  const titles = new Set<string>();
  for (const symbol of symbols) {
    titles.add(symbol.qualifiedName ?? symbol.name);
    if (symbols.filter((other) => other.name === symbol.name).length === 1)
      titles.add(symbol.name);
  }
  return titles;
}

// implements REQ-cli-check
async function analyzeFiles(
  files: readonly string[],
  results: readonly ExtractionResult[],
  workspaceRoot: string,
): Promise<Map<string, FileAnalysis>> {
  const manifestLookup = createImpactManifestLookup(results);
  const service = createMaintenanceSourceAnalysisService(workspaceRoot);
  const analyses = new Map<string, FileAnalysis>();
  for (const file of files) {
    const content = readRegularFile(path.resolve(workspaceRoot, file));
    if (content === null) continue;
    try {
      const analysis = await service.analyzeTextV2(file, content);
      // Only a complete parser-backed analysis decides; the staged gate
      // reports an incomplete one itself when the file is touched.
      if (analysis.status !== "ok") continue;
      const symbols = await extractSymbolsFromStagedFileAsync(
        {
          path: file,
          status: "M",
          content,
          hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
        },
        manifestLookup,
        { analyzeText: async () => analysis },
      );
      analyses.set(file, {
        symbols,
        titles: extractedTitles(analysis.symbols),
      });
    } catch {
      // An analysis failure cannot decide anything for this file.
    }
  }
  return analyses;
}

// implements REQ-cli-check
function granularityViolations(
  candidates: readonly ExtractionResult[],
  analyses: ReadonlyMap<string, FileAnalysis>,
  workspaceRoot: string,
): Violation[] {
  const sourceSymbolsByFile = new Map<string, readonly ExtractedSymbol[]>();
  for (const [file, analysis] of analyses)
    sourceSymbolsByFile.set(file, analysis.symbols);
  return createSymbolGranularityDiagnostics({
    manifestResults: candidates.filter(
      (result) =>
        result.sourceFile !== undefined && analyses.has(result.sourceFile),
    ),
    symbolsByFile: new Map(),
    sourceSymbolsByFile,
    workspaceRoot,
  }).map((diagnostic) => ({
    rule: SYMBOL_GRANULARITY_RULE,
    entityId: diagnostic.entityId ?? "",
    description: diagnostic.message,
    suggestion: diagnostic.suggestion,
    ...(diagnostic.source !== undefined ? { source: diagnostic.source } : {}),
    evidence: {
      diagnosticId: diagnostic.id,
      ...(diagnostic.evidence ?? {}),
    },
  }));
}

// implements REQ-cli-check, REQ-generated-coordinate-persistence
function unextractedTitleViolations(
  results: readonly ExtractionResult[],
  analyses: ReadonlyMap<string, FileAnalysis>,
): Violation[] {
  const violations: Violation[] = [];
  for (const result of results) {
    if (isCoarseGranularityReason(result.entity.granularity_reason)) continue;
    const file = result.sourceFile;
    const analysis = file === undefined ? undefined : analyses.get(file);
    if (file === undefined || analysis === undefined) continue;
    if (analysis.titles.has(result.entity.title)) continue;
    const owners = getBehavioralSymbolNames([...analysis.symbols]);
    violations.push({
      rule: SYMBOL_TITLE_UNEXTRACTED_RULE,
      entityId: result.entity.id,
      description: `Symbol ${result.entity.id} names '${result.entity.title}', which the source extractor does not produce for ${file} (private class members and removed or renamed declarations are not tracked). Coordinate refresh can never bind it, and kibi check --staged reports it as evidence without a matching symbol whenever ${file} is touched.`,
      suggestion: `Re-point the symbol to the public declaration that owns the behavior${owners.length > 0 ? ` (one of: ${owners.join(", ")})` : ""} by changing its title, or remove the symbol; give it a coarse granularity_reason only when it intentionally covers the whole file. Then run kibi sync --refresh-symbol-coordinates.`,
      ...(result.entity.source ? { source: result.entity.source } : {}),
      evidence: {
        sourceFile: file,
        title: result.entity.title,
      },
    });
  }
  return violations;
}

/**
 * The symbol rules that compare the KB with its source files:
 * `symbol-granularity` (the staged gate's granularity predicate, evaluated
 * for every symbol against its whole working-tree file, every declaration a
 * candidate as if the file were fully staged) and `symbol-title-unextracted`
 * (a non-coarse symbol whose title the extractor does not produce). A file
 * the source analyzers cannot fully analyze is skipped.
 */
// implements REQ-cli-check, REQ-cli-staged-impact-enforcement
export async function collectSymbolSourceViolations(
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
  rules: ReadonlySet<string>,
): Promise<Violation[]> {
  const granularity = rules.has(SYMBOL_GRANULARITY_RULE);
  const unextracted = rules.has(SYMBOL_TITLE_UNEXTRACTED_RULE);
  if (!granularity && !unextracted) return [];
  const results = await loadSymbolResults(prolog, workspaceRoot);
  const candidates = granularity ? granularityCandidates(results) : [];
  const judged = unextracted
    ? results.filter(
        (result) =>
          !isCoarseGranularityReason(result.entity.granularity_reason),
      )
    : [];
  const files = [
    ...new Set(
      [...candidates, ...judged].map((result) => result.sourceFile ?? ""),
    ),
  ]
    .filter((file) => file.length > 0)
    .sort();
  if (files.length === 0) return [];
  const analyses = await analyzeFiles(files, results, workspaceRoot);
  return [
    ...(granularity
      ? granularityViolations(candidates, analyses, workspaceRoot)
      : []),
    ...(unextracted ? unextractedTitleViolations(judged, analyses) : []),
  ];
}
