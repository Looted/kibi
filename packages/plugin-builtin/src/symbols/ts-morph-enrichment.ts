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
import type {
  ClassDeclaration,
  ClassExpression,
  Node,
  Project,
  SourceFile,
  VariableDeclaration,
} from "ts-morph";
import { tsMorph } from "./ts-morph-runtime.js";
import {
  SUPPORTED_SOURCE_EXTENSIONS,
  isPrivateClassMember,
  onlyCandidate,
} from "./ts-morph-shared.js";
import { resolveWorkspaceSourceAbsolute } from "./workspace-path.js";

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
  /**
   * Transient refresh outcome, never authored: why no coordinates were
   * published for this entry. Set when the title names a declaration the
   * symbol extractor does not produce (a private class member), so a refresh
   * reports it instead of binding a span no other Kibi path recognizes.
   */
  coordinateRefreshFailure?: string;
  [key: string]: unknown;
}

type NamedDeclarationCandidate = Node | ClassDeclaration | VariableDeclaration;

// implements REQ-capability-plugin-builtin-parity-v1
export async function enrichSymbolCoordinatesWithTsMorph(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
  const project = new (tsMorph().Project)({
    skipAddingFilesFromTsConfig: true,
  });
  const sourceFileCache = new Map<string, SourceFile>();

  // Add every source file before the first declaration lookup. Export checks
  // consult the type checker, and adding a file discards the program, so
  // interleaving adds with lookups rebuilt the whole program (and its module
  // resolution) once per newly seen file. A declaration's own symbol does
  // not depend on which other root files are present, so the coordinates are
  // unchanged; only the repeated program construction disappears.
  const resolvedPaths: Array<
    | { readonly ok: true; readonly absolutePath: string | null }
    | { readonly ok: false; readonly error: unknown }
  > = [];
  for (const entry of entries) {
    try {
      const absolutePath = await resolveSourcePath(
        entry.sourceFile,
        workspaceRoot,
      );
      if (absolutePath) {
        getOrAddSourceFile(project, sourceFileCache, absolutePath);
      }
      resolvedPaths.push({ ok: true, absolutePath });
    } catch (error) {
      resolvedPaths.push({ ok: false, error });
    }
  }

  const enriched: ManifestSymbolEntry[] = [];
  for (const [index, entry] of entries.entries()) {
    try {
      const resolved = resolvedPaths[index];
      if (resolved !== undefined && !resolved.ok) throw resolved.error;
      const absolutePath = resolved?.absolutePath ?? null;
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
        enriched.push(
          namesPrivateClassMember(sourceFile, entry.title)
            ? {
                ...entry,
                coordinateRefreshFailure: privateMemberRefreshFailure(
                  entry.title,
                ),
              }
            : entry,
        );
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

  const absolute = resolveWorkspaceSourceAbsolute(workspaceRoot, sourceFile);
  if (absolute === null) return null;
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
          tsMorph().SyntaxKind.ClassExpression,
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
        if (isPrivateClassMember(method)) continue;
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
          tsMorph().SyntaxKind.ClassExpression,
        );
        if (!classExpression) continue;
        for (const method of classExpression.getMethods()) {
          if (isPrivateClassMember(method)) continue;
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
        if (isPrivateClassMember(property)) continue;
        if (property.getName() !== title) continue;
        const nameNode = property.getNameNode();
        if (!nameNode) continue;
        memberCandidates.push({ node: property, getNameNode: () => nameNode });
      }
      for (const accessor of [
        ...cls.getGetAccessors(),
        ...cls.getSetAccessors(),
      ]) {
        if (isPrivateClassMember(accessor)) continue;
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
          tsMorph().SyntaxKind.ClassExpression,
        );
        if (!classExpression) continue;
        for (const property of classExpression.getProperties()) {
          if (isPrivateClassMember(property)) continue;
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
          if (isPrivateClassMember(accessor)) continue;
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

/**
 * Public members only: the symbol extractor skips private class members, so
 * a coordinate refresh must not bind a span to one either.
 */
// implements REQ-capability-plugin-builtin-parity-v1
function findClassMember(
  declaration: ClassDeclaration | ClassExpression,
  name: string,
): { node: NamedDeclarationCandidate; getNameNode: () => Node } | null {
  const visible = (member: Parameters<typeof isPrivateClassMember>[0]) =>
    !isPrivateClassMember(member);
  for (const method of declaration.getMethods()) {
    if (method.getName() !== name || !visible(method)) continue;
    const nameNode = method.getNameNode();
    if (nameNode) return { node: method, getNameNode: () => nameNode };
  }
  for (const property of declaration.getProperties()) {
    if (property.getName() !== name || !visible(property)) continue;
    const nameNode = property.getNameNode();
    if (nameNode) return { node: property, getNameNode: () => nameNode };
  }
  for (const accessor of [
    ...declaration.getGetAccessors(),
    ...declaration.getSetAccessors(),
  ]) {
    if (accessor.getName() !== name || !visible(accessor)) continue;
    const nameNode = accessor.getNameNode();
    if (nameNode) return { node: accessor, getNameNode: () => nameNode };
  }
  return null;
}

/**
 * True when the title names a private member of a class in this file (as
 * `Class.member` or as a bare member name), which the extractor never emits.
 */
// implements REQ-capability-plugin-builtin-parity-v1
function namesPrivateClassMember(
  sourceFile: SourceFile,
  title: string,
): boolean {
  const qualified = parseQualifiedMethodTitle(title);
  const classes: Array<ClassDeclaration | ClassExpression> = [
    ...sourceFile.getClasses(),
  ];
  for (const statement of sourceFile.getVariableStatements()) {
    for (const declaration of statement.getDeclarations()) {
      const classExpression = declaration.getInitializerIfKind(
        tsMorph().SyntaxKind.ClassExpression,
      );
      if (classExpression) classes.push(classExpression);
    }
  }
  return classes.some((declaration) => {
    const className =
      declaration.getName() ??
      declaration
        .getParentIfKind(tsMorph().SyntaxKind.VariableDeclaration)
        ?.getName();
    if (qualified && qualified.className !== className) return false;
    const memberName = qualified ? qualified.methodName : title;
    return [
      ...declaration.getMethods(),
      ...declaration.getProperties(),
      ...declaration.getGetAccessors(),
      ...declaration.getSetAccessors(),
    ].some(
      (member) =>
        member.getName() === memberName && isPrivateClassMember(member),
    );
  });
}

function privateMemberRefreshFailure(title: string): string {
  return `'${title}' is a private class member; the symbol extractor tracks only public declarations, so no coordinates are published. Re-point the symbol to the public member or class that owns the behavior, or remove it`;
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
