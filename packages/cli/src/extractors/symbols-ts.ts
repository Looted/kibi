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
import { access, readFile } from "node:fs/promises";
import * as path from "node:path";
import {
  type ClassDeclaration,
  type Node,
  Project,
  ScriptKind,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type {
  SourceAnalysisProvider,
  SourceAnalysisResult,
  SourceSymbolAnalysis,
  SourceSymbolKind,
} from "./symbols-coordinator.js";

export interface SymbolCoordinates {
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
  coordinatesGeneratedAt: string;
}

export interface ManifestSymbolEntry {
  id: string;
  title: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  sourceEndLine?: number;
  sourceEndColumn?: number;
  coordinatesGeneratedAt?: string;
  links?: string[];
  [key: string]: unknown;
}

const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

// implements REQ-001
export function createTsMorphSourceAnalysisProvider(): SourceAnalysisProvider {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  return {
    id: "ts-morph",
    supportsFile(filePath: string): boolean {
      return SUPPORTED_SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
    },
    analyzeText(filePath: string, content: string): SourceAnalysisResult {
      const sourceFile = project.createSourceFile(filePath, content, {
        overwrite: true,
        scriptKind: chooseScriptKind(filePath),
      });

      return {
        sourceFile: filePath,
        language: inferSourceLanguage(filePath),
        providerId: "ts-morph",
        module: {
          title: inferModuleTitle(filePath),
          language: inferSourceLanguage(filePath),
          analysisMode: "parser",
        },
        symbols: collectSourceSymbols(sourceFile),
      };
    },
  };
}

export async function enrichSymbolCoordinatesWithTsMorph(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
  // implements REQ-vscode-traceability
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });
  const sourceFileCache = new Map<string, SourceFile>();

  const enriched: ManifestSymbolEntry[] = [];
  for (const entry of entries) {
    try {
      const absolutePath = await resolveSourcePath(
        entry.sourceFile,
        workspaceRoot,
      );
      if (!absolutePath) {
        enriched.push(entry);
        continue;
      }

      const sourceFile = getOrAddSourceFile(
        project,
        sourceFileCache,
        absolutePath,
      );
      if (!sourceFile) {
        enriched.push(await enrichWithTextFallback(entry, absolutePath));
        continue;
      }

      const match = findNamedDeclaration(sourceFile, entry.title);
      if (!match) {
        enriched.push(entry);
        continue;
      }

      const nameStart = match.getNameNode().getStart();
      const end = match.node.getEnd();

      const startLc = sourceFile.getLineAndColumnAtPos(nameStart);
      const endLc = sourceFile.getLineAndColumnAtPos(end);

      const coordinates: SymbolCoordinates = {
        sourceLine: startLc.line,
        sourceColumn: Math.max(0, startLc.column - 1),
        sourceEndLine: endLc.line,
        sourceEndColumn: Math.max(0, endLc.column - 1),
        coordinatesGeneratedAt: new Date().toISOString(),
      };

      enriched.push({
        ...entry,
        ...coordinates,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[kibi] Failed to enrich symbol coordinates for ${entry.id}: ${message}`,
      );
      const absolutePath = await resolveSourcePath(
        entry.sourceFile,
        workspaceRoot,
      );
      if (!absolutePath) {
        enriched.push(entry);
        continue;
      }
      enriched.push(await enrichWithTextFallback(entry, absolutePath));
    }
  }

  return enriched;
}

async function resolveSourcePath(
  sourceFile: string | undefined,
  workspaceRoot: string,
): Promise<string | null> {
  if (!sourceFile) return null;

  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  const ext = path.extname(absolute).toLowerCase();

  if (!SUPPORTED_SOURCE_EXTENSIONS.has(ext)) return null;
  try {
    await access(absolute);
  } catch {
    return null;
  }

  return absolute;
}

function getOrAddSourceFile(
  project: Project,
  cache: Map<string, SourceFile>,
  absolutePath: string,
): SourceFile | null {
  const cached = cache.get(absolutePath);
  if (cached) return cached;

  try {
    const sourceFile = project.addSourceFileAtPath(absolutePath);
    cache.set(absolutePath, sourceFile);
    return sourceFile;
  } catch {
    return null;
  }
}

function enrichWithTextFallback(
  entry: ManifestSymbolEntry,
  absolutePath: string,
): Promise<ManifestSymbolEntry> {
  return enrichWithTextFallbackInternal(entry, absolutePath);
}

async function enrichWithTextFallbackInternal(
  entry: ManifestSymbolEntry,
  absolutePath: string,
): Promise<ManifestSymbolEntry> {
  try {
    const content = await readFile(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);
    const escapedTitle = entry.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedTitle}\\b`);

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line) continue;
      const match = pattern.exec(line);
      if (!match || match.index < 0) continue;

      return {
        ...entry,
        sourceLine: index + 1,
        sourceColumn: match.index,
        sourceEndLine: index + 1,
        sourceEndColumn: match.index + entry.title.length,
        coordinatesGeneratedAt: new Date().toISOString(),
      };
    }

    return entry;
  } catch {
    return entry;
  }
}

function collectSourceSymbols(sourceFile: SourceFile): SourceSymbolAnalysis[] {
  const symbols: SourceSymbolAnalysis[] = [];

  for (const decl of sourceFile.getFunctions()) {
    if (!decl.isExported()) continue;
    symbols.push(
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "function",
        decl.getNameNode() ?? decl,
        decl,
        `${decl.getFullText()}\n${decl
          .getJsDocs()
          .map((doc) => doc.getFullText())
          .join("\n")}`,
      ),
    );
  }

  for (const decl of sourceFile.getClasses()) {
    if (!decl.isExported()) continue;
    symbols.push(
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "class",
        decl.getNameNode() ?? decl,
        decl,
        `${decl.getText()}\n${decl
          .getJsDocs()
          .map((doc) => doc.getFullText())
          .join("\n")}`,
      ),
    );
  }

  for (const decl of sourceFile.getInterfaces()) {
    if (!decl.isExported()) continue;
    symbols.push(
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "interface",
        decl.getNameNode() ?? decl,
        decl,
        decl.getText(),
      ),
    );
  }

  for (const decl of sourceFile.getTypeAliases()) {
    if (!decl.isExported()) continue;
    symbols.push(
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "type",
        decl.getNameNode() ?? decl,
        decl,
        decl.getText(),
      ),
    );
  }

  for (const decl of sourceFile.getEnums()) {
    if (!decl.isExported()) continue;
    symbols.push(
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "enum",
        decl.getNameNode() ?? decl,
        decl,
        decl.getText(),
      ),
    );
  }

  for (const statement of sourceFile.getVariableStatements()) {
    if (!statement.isExported()) continue;

    for (const declaration of statement.getDeclarations()) {
      symbols.push(
        toSourceSymbolAnalysis(
          sourceFile,
          declaration.getName(),
          "variable",
          declaration.getNameNode() ?? declaration,
          declaration,
          declaration.getText(),
        ),
      );
    }
  }

  return symbols;
}

function toSourceSymbolAnalysis(
  sourceFile: SourceFile,
  name: string,
  kind: SourceSymbolKind,
  startNode: Node,
  endNode: Node,
  directiveText: string,
): SourceSymbolAnalysis {
  const start = sourceFile.getLineAndColumnAtPos(startNode.getStart());
  const end = sourceFile.getLineAndColumnAtPos(endNode.getEnd());

  return {
    name,
    kind,
    startLine: start.line,
    startColumn: Math.max(0, start.column - 1),
    endLine: end.line,
    endColumn: Math.max(0, end.column - 1),
    directiveText,
  };
}

function chooseScriptKind(filePath: string): ScriptKind {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".tsx")) return ScriptKind.TSX;
  if (lower.endsWith(".ts") || lower.endsWith(".mts") || lower.endsWith(".cts")) {
    return ScriptKind.TS;
  }
  if (lower.endsWith(".jsx")) return ScriptKind.JSX;
  return ScriptKind.JS;
}

function inferSourceLanguage(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if ([".ts", ".tsx", ".mts", ".cts"].includes(extension)) {
    return "typescript";
  }
  return "javascript";
}

function inferModuleTitle(filePath: string): string {
  const extension = path.extname(filePath);
  const basename = path.basename(filePath, extension);
  return basename.length > 0 ? basename : path.basename(filePath);
}

type NamedDeclarationCandidate = Node | ClassDeclaration | VariableDeclaration;

function findNamedDeclaration(
  sourceFile: SourceFile,
  title: string,
): { node: NamedDeclarationCandidate; getNameNode: () => Node } | null {
  const candidates: Array<{
    node: NamedDeclarationCandidate;
    getNameNode: () => Node;
  }> = [];

  for (const decl of sourceFile.getFunctions()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getClasses()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getInterfaces()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getTypeAliases()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getEnums()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const statement of sourceFile.getVariableStatements()) {
    if (!statement.isExported()) continue;

    for (const declaration of statement.getDeclarations()) {
      if (declaration.getName() !== title) continue;
      const nameNode = declaration.getNameNode();
      candidates.push({ node: declaration, getNameNode: () => nameNode });
    }
  }

  if (candidates.length === 0) {
    // Second pass: unique non-exported top-level functions only
    const internalCandidates: Array<{
      node: NamedDeclarationCandidate;
      getNameNode: () => Node;
    }> = [];

    for (const decl of sourceFile.getFunctions()) {
      if (decl.isExported()) continue; // Already scanned in first pass
      if (decl.getName() !== title) continue;
      const nameNode = decl.getNameNode();
      if (!nameNode) continue;
      internalCandidates.push({ node: decl, getNameNode: () => nameNode });
    }

    // Fail closed: only return if exactly one unique match
    if (internalCandidates.length === 1) {
      const candidate = internalCandidates[0];
      if (candidate) {
        return candidate;
      }
    }

    // Third pass: unique class methods
    const methodCandidates: Array<{
      node: NamedDeclarationCandidate;
      getNameNode: () => Node;
    }> = [];

    for (const cls of sourceFile.getClasses()) {
      for (const method of cls.getMethods()) {
        if (method.getName() !== title) continue;
        const nameNode = method.getNameNode();
        if (!nameNode) continue;
        methodCandidates.push({ node: method, getNameNode: () => nameNode });
      }
    }

    // Fail closed: only return if exactly one unique match
    if (methodCandidates.length === 1) {
      const candidate = methodCandidates[0];
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }
  candidates.sort(
    (a, b) => a.getNameNode().getStart() - b.getNameNode().getStart(),
  );
  return candidates[0] ?? null;
}
