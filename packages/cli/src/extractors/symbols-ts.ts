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
import {
  createBuiltinTsMorphSourceAnalysisProvider,
  enrichSymbolCoordinatesWithTsMorph as enrichBuiltinSymbolCoordinates,
  isPrivateClassMember as isBuiltinPrivateClassMember,
  onlyCandidate as onlyBuiltinCandidate,
  type ManifestSymbolEntry as BuiltinManifestSymbolEntry,
  type SymbolCoordinates as BuiltinSymbolCoordinates,
} from "kibi-plugin-builtin";
import type {
  SourceAnalysisProvider,
  SourceAnalysisResult,
} from "./symbols-coordinator.js";

// implements REQ-capability-plugin-builtin-parity-v1
export type SymbolCoordinates = BuiltinSymbolCoordinates;
// implements REQ-capability-plugin-builtin-parity-v1
export type ManifestSymbolEntry = BuiltinManifestSymbolEntry;

// implements REQ-capability-plugin-builtin-parity-v1
export const isPrivateClassMember = isBuiltinPrivateClassMember;

/**
 * Thin host adapter over kibi-plugin-builtin's ts-morph extractor.
 * Preserves the historical `ts-morph` provider id for sync callers and tests.
 */
// implements REQ-001
export function createTsMorphSourceAnalysisProvider(): SourceAnalysisProvider {
  const provider = createBuiltinTsMorphSourceAnalysisProvider();
  return {
    id: "ts-morph",
    supportsFile(filePath: string): boolean {
      return provider.supportsFile(filePath);
    },
    analyzeText(filePath: string, content: string): SourceAnalysisResult {
      const result = provider.analyzeText(filePath, content);
      return {
        sourceFile: result.sourceFile,
        language: result.language,
        providerId: "ts-morph",
        module: {
          title: result.module.title,
          language: result.module.language,
          analysisMode: result.module.analysisMode,
          ...(result.module.fallbackReason
            ? { fallbackReason: result.module.fallbackReason }
            : {}),
        },
        symbols: result.symbols.map((symbol) => ({
          name: symbol.name,
          kind: symbol.kind,
          startLine: symbol.startLine,
          startColumn: symbol.startColumn,
          endLine: symbol.endLine,
          endColumn: symbol.endColumn,
          ...(symbol.directiveText
            ? { directiveText: symbol.directiveText }
            : {}),
        })),
      };
    },
  };
}

// implements REQ-capability-plugin-builtin-parity-v1
export async function enrichSymbolCoordinatesWithTsMorph(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
  // implements REQ-vscode-traceability
  return enrichBuiltinSymbolCoordinates(entries, workspaceRoot);
}

// implements REQ-capability-plugin-builtin-parity-v1
export function onlyCandidate<T>(candidates: readonly T[]): T | undefined {
  return onlyBuiltinCandidate(candidates);
}
