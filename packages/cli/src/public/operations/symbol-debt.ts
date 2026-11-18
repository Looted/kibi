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

import type { ManifestSymbolRecord } from "../../extractors/manifest.js";
import { parseEntityFromList, parseListOfLists } from "../../prolog/codec.js";
import { unrecordedDeclarations } from "../../traceability/staged-symbols-manifest.js";
import { normalizeSourceFile } from "../impact/source-changes.js";
import type { PrologPort } from "./runtime-types.js";
import {
  type SourceAnalysisCache,
  withSourceAnalysisCache,
} from "./source-analysis-cache.js";
import { analyzeWorkspaceSources } from "./symbol-granularity-check.js";

/**
 * Declarations without a symbol record in source files that have at least
 * one record: the debt the staged gate does not judge until a commit adds
 * or changes those declarations. Reported by an unscoped `kibi check` as
 * counts, and per file only when asked; it never blocks.
 */
export interface SymbolDebt {
  /** Unrecorded declarations. */
  total: number;
  /** Files holding them. */
  fileCount: number;
  /** Per file, only when the check was asked to list them. */
  files?: Array<{ path: string; unrecorded: string[] }>;
}

/** The debt as counts, with the per-file list only when `list` is set. */
export function symbolDebtListing(debt: SymbolDebt, list: boolean): SymbolDebt {
  return list ? debt : { total: debt.total, fileCount: debt.fileCount };
}

const SYMBOL_RECORDS_QUERY =
  "findall([Id,symbol,Fields], (kb_entity(Id, symbol, Props), include([Key=_]>>memberchk(Key, [title,sourceFile,granularity_reason]), Props, Fields)), Rows)";

function stringField(
  entity: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = entity[key];
  return typeof value === "string" ? value : undefined;
}

function manifestRecord(
  workspaceRoot: string,
  entity: Record<string, unknown>,
): ManifestSymbolRecord[] {
  const raw = stringField(entity, "sourceFile");
  // rationale: a stray non-record in the list names no source file, so no
  // file is analyzed for it and no declaration matches it.
  // Stryker disable next-line ArrayDeclaration
  if (raw === undefined) return [];
  // An empty path (or the workspace root) names a directory, which yields
  // no analysis and so no debt.
  const sourceFile = normalizeSourceFile(workspaceRoot, raw);
  const granularityReason = stringField(entity, "granularity_reason");
  return [
    {
      title: stringField(entity, "title"),
      sourceFile,
      ...(granularityReason !== undefined
        ? { granularity_reason: granularityReason }
        : {}),
    } as ManifestSymbolRecord,
  ];
}

export async function collectSymbolDebt(
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
  /**
   * A branch store directory to keep parsed analyses in across runs, or a
   * cache the caller opened and saves.
   */
  analysisCache?: string | SourceAnalysisCache | null,
): Promise<SymbolDebt> {
  const rows = await prolog.query(SYMBOL_RECORDS_QUERY);
  if (!rows.success) {
    throw new Error(
      `symbol debt projection failed: ${rows.error ?? "unknown error"}`,
    );
  }
  // rationale: the codec reads any text without a list as no rows
  // Stryker disable next-line StringLiteral
  const records = parseListOfLists(rows.bindings.Rows ?? "[]").flatMap((row) =>
    manifestRecord(workspaceRoot, parseEntityFromList(row)),
  );
  const files = [
    ...new Set(records.map((record) => record.sourceFile as string)),
  ].sort();
  if (files.length === 0) return { total: 0, fileCount: 0, files: [] };
  const sources = await withSourceAnalysisCache(
    analysisCache,
    workspaceRoot,
    (cache) => analyzeWorkspaceSources(files, workspaceRoot, cache),
  );
  const debt: NonNullable<SymbolDebt["files"]> = [];
  for (const file of files) {
    const source = sources.get(file);
    if (!source) continue;
    const unrecorded = unrecordedDeclarations(file, source.analysis, records);
    if (unrecorded.length > 0)
      debt.push({
        path: file,
        unrecorded: unrecorded.map((entry) => entry.title),
      });
  }
  return {
    total: debt.reduce((sum, file) => sum + file.unrecorded.length, 0),
    fileCount: debt.length,
    files: debt,
  };
}
