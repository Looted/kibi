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
  type ClassExpression,
  type Node,
  Project,
  type SourceFile,
  SyntaxKind,
  type VariableDeclaration,
} from "ts-morph";
import {
  SUPPORTED_SOURCE_EXTENSIONS,
  onlyCandidate,
} from "./ts-morph-shared.js";

// implements REQ-capability-plugin-builtin-parity-v1
export interface SymbolCoordinates {
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
  coordinatesGeneratedAt: string;
}

// implements REQ-capability-plugin-builtin-parity-v1
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

type NamedDeclarationCandidate = Node | ClassDeclaration | VariableDeclaration;

// implements REQ-capability-plugin-builtin-parity-v1
export async function enrichSymbolCoordinatesWithTsMorph(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
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

async function enrichWithTextFallback(
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

function findNamedDeclaration(
  sourceFile: SourceFile,
  title: string,
): { node: NamedDeclarationCandidate; getNameNode: () => Node } | null {
  const qualifiedMethod = parseQualifiedMethodTitle(title);
  if (qualifiedMethod) {
    for (const cls of sourceFile.getClasses()) {
      if (cls.getName() !== qualifiedMethod.className) continue;
      const match = findClassMember(cls, qualifiedMethod.methodName);
      if (match) return match;
    }

    for (const statement of sourceFile.getVariableStatements()) {
      if (!statement.isExported()) continue;
      for (const declaration of statement.getDeclarations()) {
        if (declaration.getName() !== qualifiedMethod.className) continue;
        const classExpression = declaration.getInitializerIfKind(
          SyntaxKind.ClassExpression,
        );
        const match = classExpression
          ? findClassMember(classExpression, qualifiedMethod.methodName)
          : null;
        if (match) return match;
      }
    }

    return null;
  }

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
    const internalCandidates: Array<{
      node: NamedDeclarationCandidate;
      getNameNode: () => Node;
    }> = [];

    for (const decl of sourceFile.getFunctions()) {
      if (decl.isExported()) continue;
      if (decl.getName() !== title) continue;
      const nameNode = decl.getNameNode();
      if (!nameNode) continue;
      internalCandidates.push({ node: decl, getNameNode: () => nameNode });
    }

    const uniqueInternal = onlyCandidate(internalCandidates);
    if (uniqueInternal) {
      return uniqueInternal;
    }

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

    for (const statement of sourceFile.getVariableStatements()) {
      if (!statement.isExported()) continue;
      for (const declaration of statement.getDeclarations()) {
        const classExpression = declaration.getInitializerIfKind(
          SyntaxKind.ClassExpression,
        );
        if (!classExpression) continue;
        for (const method of classExpression.getMethods()) {
          if (method.getName() !== title) continue;
          const nameNode = method.getNameNode();
          if (!nameNode) continue;
          methodCandidates.push({
            node: method,
            getNameNode: () => nameNode,
          });
        }
      }
    }

    const uniqueMethod = onlyCandidate(methodCandidates);
    if (uniqueMethod) {
      return uniqueMethod;
    }

    const memberCandidates: Array<{
      node: NamedDeclarationCandidate;
      getNameNode: () => Node;
    }> = [];

    for (const cls of sourceFile.getClasses()) {
      for (const property of cls.getProperties()) {
        if (property.getName() !== title) continue;
        const nameNode = property.getNameNode();
        if (!nameNode) continue;
        memberCandidates.push({ node: property, getNameNode: () => nameNode });
      }
      for (const accessor of [
        ...cls.getGetAccessors(),
        ...cls.getSetAccessors(),
      ]) {
        if (accessor.getName() !== title) continue;
        const nameNode = accessor.getNameNode();
        if (!nameNode) continue;
        memberCandidates.push({ node: accessor, getNameNode: () => nameNode });
      }
    }

    for (const statement of sourceFile.getVariableStatements()) {
      if (!statement.isExported()) continue;
      for (const declaration of statement.getDeclarations()) {
        const classExpression = declaration.getInitializerIfKind(
          SyntaxKind.ClassExpression,
        );
        if (!classExpression) continue;
        for (const property of classExpression.getProperties()) {
          if (property.getName() !== title) continue;
          const nameNode = property.getNameNode();
          if (!nameNode) continue;
          memberCandidates.push({
            node: property,
            getNameNode: () => nameNode,
          });
        }
        for (const accessor of [
          ...classExpression.getGetAccessors(),
          ...classExpression.getSetAccessors(),
        ]) {
          if (accessor.getName() !== title) continue;
          const nameNode = accessor.getNameNode();
          if (!nameNode) continue;
          memberCandidates.push({
            node: accessor,
            getNameNode: () => nameNode,
          });
        }
      }
    }

    const uniqueMember = onlyCandidate(memberCandidates);
    if (uniqueMember) {
      return uniqueMember;
    }

    return null;
  }
  candidates.sort(
    (a, b) => a.getNameNode().getStart() - b.getNameNode().getStart(),
  );
  return candidates[0] ?? null;
}

function findClassMember(
  declaration: ClassDeclaration | ClassExpression,
  name: string,
): { node: NamedDeclarationCandidate; getNameNode: () => Node } | null {
  for (const method of declaration.getMethods()) {
    if (method.getName() !== name) continue;
    const nameNode = method.getNameNode();
    if (nameNode) return { node: method, getNameNode: () => nameNode };
  }
  for (const property of declaration.getProperties()) {
    if (property.getName() !== name) continue;
    const nameNode = property.getNameNode();
    if (nameNode) return { node: property, getNameNode: () => nameNode };
  }
  for (const accessor of [
    ...declaration.getGetAccessors(),
    ...declaration.getSetAccessors(),
  ]) {
    if (accessor.getName() !== name) continue;
    const nameNode = accessor.getNameNode();
    if (nameNode) return { node: accessor, getNameNode: () => nameNode };
  }
  return null;
}

function parseQualifiedMethodTitle(
  title: string,
): { className: string; methodName: string } | null {
  const separatorIndex = title.lastIndexOf(".");
  if (separatorIndex <= 0 || separatorIndex === title.length - 1) return null;
  return {
    className: title.slice(0, separatorIndex),
    methodName: title.slice(separatorIndex + 1),
  };
}
