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
import type { StagedFile } from "../../traceability/git-staged.js";
import {
  type ExtractedSymbol,
  extractSymbolsFromStagedFileAsync,
} from "../../traceability/symbol-extract.js";
import type { Violation } from "../../utils/rule-registry.js";
import { createSymbolGranularityDiagnostics } from "../impact/diagnostics.js";
import { createImpactManifestLookup } from "../impact/manifest.js";
import { normalizeSourceFile } from "../impact/source-changes.js";
import {
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
} from "../symbol-granularity.js";
import type { PrologPort } from "./runtime-types.js";
import {
  type SourceAnalysisCache,
  openSourceAnalysisCache,
} from "./source-analysis-cache.js";

/**
 * Full-check form of the staged gate's `symbol_granularity_violation`: a
 * symbol with traceability relationships must not link its source file
 * coarsely while narrower behavioral symbols are available, unless it carries
 * an allowed granularity_reason.
 */
export const SYMBOL_GRANULARITY_RULE = "symbol-granularity";

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
  // rationale: the codec reads any text without a list as no rows
  // Stryker disable next-line StringLiteral
  const relText = rels.bindings.Rels ?? "[]";
  for (const [rawFrom, rawTo, type] of parseTriples(relText)) {
    const from = normalizeEntityId(rawFrom);
    const relationship = { from, to: normalizeEntityId(rawTo), type };
    const current = relationships.get(from);
    if (current) current.push(relationship);
    else relationships.set(from, [relationship]);
  }

  const results: ExtractionResult[] = [];
  // rationale: the codec reads any text without a list as no rows
  // Stryker disable next-line StringLiteral
  for (const row of parseListOfLists(rows.bindings.Rows ?? "[]")) {
    const entity = parseEntityFromList(row);
    const id = stringField(entity, "id");
    const sourceFile = stringField(entity, "sourceFile");
    if (sourceFile === undefined) continue;
    // rationale: no relationship is keyed to a missing id, so such a symbol
    // is never judged and skipping it only saves work
    // Stryker disable next-line ConditionalExpression
    if (id === undefined) continue;
    const granularityReason = stringField(entity, "granularity_reason");
    results.push({
      entity: {
        id,
        title: stringField(entity, "title") ?? "",
        source: stringField(entity, "source") ?? "",
        // rationale: the granularity check reads only an entity's id, title,
        // source and granularity_reason; these fields only fill its shape
        // Stryker disable StringLiteral
        type: "symbol",
        status: "",
        created_at: "",
        updated_at: "",
        // Stryker restore StringLiteral
        // rationale: an absent and an undefined reason are both disallowed
        // Stryker disable next-line ConditionalExpression
        ...(granularityReason !== undefined
          ? { granularity_reason: granularityReason }
          : {}),
      },
      // rationale: a stray entry in a symbol without relationships has no
      // traceability type, so the symbol stays exempt
      // Stryker disable next-line ArrayDeclaration
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

async function analyzeFiles(
  files: readonly string[],
  results: readonly ExtractionResult[],
  workspaceRoot: string,
  cache: SourceAnalysisCache | null,
): Promise<Map<string, readonly ExtractedSymbol[]>> {
  const manifestLookup = createImpactManifestLookup(results);
  let service: ReturnType<
    typeof createMaintenanceSourceAnalysisService
  > | null = null;
  const analyses = new Map<string, readonly ExtractedSymbol[]>();
  for (const file of files) {
    try {
      const absolutePath = path.resolve(workspaceRoot, file);
      // A directory, device or pipe is no source file; a missing file throws.
      if (!statSync(absolutePath).isFile()) continue;
      const content = readFileSync(absolutePath, "utf8");
      let analysis = cache?.get(file, content);
      if (analysis === undefined) {
        service ??= createMaintenanceSourceAnalysisService(workspaceRoot);
        analysis = await service.analyzeTextV2(file, content);
        cache?.set(file, content, analysis);
      }
      const decided = analysis;
      // Only a complete parser-backed analysis decides; the staged gate
      // reports an incomplete one itself when the file is touched.
      // rationale: an incomplete analysis carries no symbols, so extracting
      // from it finds none either; the check only skips that work.
      // Stryker disable next-line ConditionalExpression
      if (decided.status !== "ok") continue;
      // rationale: every declaration meets the whole-file hunk, so neither
      // the status nor the hunk range changes which symbols come back
      // Stryker disable StringLiteral,ArrayDeclaration,ObjectLiteral
      const wholeFile: StagedFile = {
        path: file,
        status: "M",
        content,
        hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
      };
      // Stryker restore StringLiteral,ArrayDeclaration,ObjectLiteral
      const symbols = await extractSymbolsFromStagedFileAsync(
        wholeFile,
        manifestLookup,
        { analyzeText: async () => decided },
      );
      analyses.set(file, symbols);
    } catch {
      // An analysis failure cannot decide anything for this file.
    }
  }
  return analyses;
}

function granularityViolations(
  candidates: readonly ExtractionResult[],
  sourceSymbolsByFile: ReadonlyMap<string, readonly ExtractedSymbol[]>,
  workspaceRoot: string,
): Violation[] {
  return createSymbolGranularityDiagnostics({
    // A candidate whose file was not analyzed has no narrower symbols.
    manifestResults: candidates,
    symbolsByFile: new Map(),
    sourceSymbolsByFile,
    workspaceRoot,
  }).map((diagnostic) => ({
    rule: SYMBOL_GRANULARITY_RULE,
    entityId: diagnostic.entityId as string,
    description: diagnostic.message,
    suggestion: diagnostic.suggestion,
    ...(diagnostic.source !== undefined ? { source: diagnostic.source } : {}),
    evidence: {
      diagnosticId: diagnostic.id,
      ...(diagnostic.evidence ?? {}),
    },
  }));
}

/**
 * `symbol-granularity`: the staged gate's granularity predicate, evaluated
 * for every symbol against its whole working-tree file, every declaration a
 * candidate as if the file were fully staged. Only files of symbols the gate
 * would judge are analyzed; a file the source analyzers cannot fully analyze
 * is skipped.
 */
export async function collectSymbolGranularityViolations(
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
  rules: ReadonlySet<string>,
  /** A branch store directory to keep parsed analyses in across runs. */
  analysisCacheDir?: string,
): Promise<Violation[]> {
  if (!rules.has(SYMBOL_GRANULARITY_RULE)) return [];
  const results = await loadSymbolResults(prolog, workspaceRoot);
  const candidates = granularityCandidates(results);
  // Every loaded symbol has a sourceFile; an empty one names the workspace
  // root, a directory that analysis skips. Files are analyzed in the order
  // their symbols were loaded.
  const files = [
    ...new Set(candidates.map((result) => result.sourceFile as string)),
  ];
  if (files.length === 0) return [];
  const cache = openSourceAnalysisCache(analysisCacheDir, workspaceRoot);
  const analyses = await analyzeFiles(files, results, workspaceRoot, cache);
  cache?.save();
  return granularityViolations(candidates, analyses, workspaceRoot);
}
