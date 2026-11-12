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
} from "ts-morph";
import { tsMorph } from "./ts-morph-runtime.js";
import {
  SUPPORTED_SOURCE_EXTENSIONS,
  isPrivateClassMember,
  onlyCandidate,
} from "./ts-morph-shared.js";
import { resolveWorkspaceSourceAbsolute } from "./workspace-path.js";

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
  /**
   * Transient refresh outcome, never authored: why no coordinates were
   * published for this entry. Set when the title names a declaration the
   * symbol extractor does not produce (a private class member), so a refresh
   * reports it instead of binding a span no other Kibi path recognizes.
   */
  coordinateRefreshFailure?: string;
  [key: string]: unknown;
}

interface NamedDeclarationMatch {
  readonly node: Node;
  readonly nameNode: Node;
}

type ResolvedEntry =
  | {
      readonly entry: ManifestSymbolEntry;
      readonly ok: true;
      readonly absolutePath: string | null;
    }
  | {
      readonly entry: ManifestSymbolEntry;
      readonly ok: false;
      readonly error: unknown;
    };

export async function enrichSymbolCoordinatesWithTsMorph(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
  // Without a tsconfig path the project reads no tsconfig files.
  const project = new (tsMorph().Project)();
  const sourceFileCache = new Map<string, SourceFile>();

  // Add every source file before the first declaration lookup. Export checks
  // consult the type checker, and adding a file discards the program, so
  // interleaving adds with lookups rebuilt the whole program (and its module
  // resolution) once per newly seen file. A declaration's own symbol does
  // not depend on which other root files are present, so the coordinates are
  // unchanged; only the repeated program construction disappears.
  const resolvedEntries: ResolvedEntry[] = [];
  for (const entry of entries) {
    try {
      const absolutePath = await resolveSourcePath(
        entry.sourceFile,
        workspaceRoot,
      );
      if (absolutePath) {
        getOrAddSourceFile(project, sourceFileCache, absolutePath);
      }
      resolvedEntries.push({ entry, ok: true, absolutePath });
    } catch (error) {
      resolvedEntries.push({ entry, ok: false, error });
    }
  }

  const enriched: ManifestSymbolEntry[] = [];
  for (const resolved of resolvedEntries) {
    const { entry } = resolved;
    try {
      if (!resolved.ok) throw resolved.error;
      const { absolutePath } = resolved;
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

      // ts-morph columns are 1-based; manifest columns are 0-based.
      const startLc = sourceFile.getLineAndColumnAtPos(
        match.nameNode.getStart(),
      );
      const endLc = sourceFile.getLineAndColumnAtPos(match.node.getEnd());

      const coordinates: SymbolCoordinates = {
        sourceLine: startLc.line,
        sourceColumn: startLc.column - 1,
        sourceEndLine: endLc.line,
        sourceEndColumn: endLc.column - 1,
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
      // A source that no longer resolves is just another unreadable file for
      // the text fallback, which then keeps the entry as it is.
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
): SourceFile | undefined {
  let sourceFile = cache.get(absolutePath);
  if (!sourceFile) {
    try {
      sourceFile = project.addSourceFileAtPath(absolutePath);
      cache.set(absolutePath, sourceFile);
    } catch {
      // An unparseable file falls back to a text search.
    }
  }
  return sourceFile;
}

async function enrichWithTextFallback(
  entry: ManifestSymbolEntry,
  absolutePath: string | null,
): Promise<ManifestSymbolEntry> {
  try {
    const content = await readFile(absolutePath as string, "utf8");
    const escapedTitle = entry.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedTitle}\\b`);

    for (const [index, line] of content.split(/\r?\n/).entries()) {
      const match = pattern.exec(line);
      if (!match) continue;

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

type ClassLike = ClassDeclaration | ClassExpression;
type ClassMember = ReturnType<ClassLike["getMembers"]>[number] & {
  getName(): string;
  getNameNode(): Node;
};

/** Class expressions bound by exported `const X = class {}` declarations. */
function exportedClassExpressions(
  sourceFile: SourceFile,
): Array<{ readonly name: string; readonly declaration: ClassExpression }> {
  return sourceFile
    .getVariableStatements()
    .filter((statement) => statement.isExported())
    .flatMap((statement) => statement.getDeclarations())
    .flatMap((variable) => {
      const declaration = variable.getInitializerIfKind(
        tsMorph().SyntaxKind.ClassExpression,
      );
      return declaration ? [{ name: variable.getName(), declaration }] : [];
    });
}

function namedMatch(
  node: Node & { getNameNode(): Node },
): NamedDeclarationMatch {
  return { node, nameNode: node.getNameNode() };
}

function methodsOf(declaration: ClassLike): ClassMember[] {
  return declaration.getMethods();
}

function propertiesAndAccessorsOf(declaration: ClassLike): ClassMember[] {
  return [
    ...declaration.getProperties(),
    ...declaration.getGetAccessors(),
    ...declaration.getSetAccessors(),
  ];
}

function findNamedDeclaration(
  sourceFile: SourceFile,
  title: string,
): NamedDeclarationMatch | undefined {
  const qualifiedMethod = parseQualifiedMethodTitle(title);
  if (qualifiedMethod) {
    const owners = [
      ...sourceFile
        .getClasses()
        .map((declaration) => ({ name: declaration.getName(), declaration })),
      ...exportedClassExpressions(sourceFile),
    ];
    for (const { name, declaration } of owners) {
      if (name !== qualifiedMethod.className) continue;
      const match = findClassMember(declaration, qualifiedMethod.methodName);
      if (match) return match;
    }
    return undefined;
  }

  // A named (non-default) declaration always has a name node.
  const exported = [
    ...sourceFile.getFunctions(),
    ...sourceFile.getClasses(),
    ...sourceFile.getInterfaces(),
    ...sourceFile.getTypeAliases(),
    ...sourceFile.getEnums(),
  ]
    .filter((decl) => decl.isExported() && decl.getName() === title)
    .map((decl) => namedMatch(decl as Node & { getNameNode(): Node }));
  for (const statement of sourceFile.getVariableStatements()) {
    if (!statement.isExported()) continue;
    for (const declaration of statement.getDeclarations()) {
      if (declaration.getName() === title) {
        exported.push(namedMatch(declaration));
      }
    }
  }
  if (exported.length > 0) {
    // The earliest declaration of the name wins.
    const earliest = Math.min(
      ...exported.map((candidate) => candidate.nameNode.getStart()),
    );
    return exported.find(
      (candidate) => candidate.nameNode.getStart() === earliest,
    );
  }

  const internalFunction = onlyCandidate(
    sourceFile
      .getFunctions()
      .filter((decl) => !decl.isExported() && decl.getName() === title),
  );
  if (internalFunction) {
    return namedMatch(internalFunction as Node & { getNameNode(): Node });
  }

  const classes: ClassLike[] = [
    ...sourceFile.getClasses(),
    ...exportedClassExpressions(sourceFile).map(
      ({ declaration }) => declaration,
    ),
  ];
  const uniquePublicMember = (
    membersOf: (declaration: ClassLike) => ClassMember[],
  ): ClassMember | undefined =>
    onlyCandidate(
      classes
        .flatMap(membersOf)
        .filter(
          (member) =>
            !isPrivateClassMember(member) && member.getName() === title,
        ),
    );
  const member =
    uniquePublicMember(methodsOf) ??
    uniquePublicMember(propertiesAndAccessorsOf);
  return member ? namedMatch(member) : undefined;
}

/**
 * Public members only: the symbol extractor skips private class members, so
 * a coordinate refresh must not bind a span to one either.
 */
function findClassMember(
  declaration: ClassLike,
  name: string,
): NamedDeclarationMatch | undefined {
  const member = [
    ...methodsOf(declaration),
    ...propertiesAndAccessorsOf(declaration),
  ].find(
    (candidate) =>
      candidate.getName() === name && !isPrivateClassMember(candidate),
  );
  return member ? namedMatch(member) : undefined;
}

/**
 * True when the title names a private member of a class in this file (as
 * `Class.member` or as a bare member name), which the extractor never emits.
 */
function namesPrivateClassMember(
  sourceFile: SourceFile,
  title: string,
): boolean {
  const qualified = parseQualifiedMethodTitle(title);
  const owners: Array<{ name: string | undefined; declaration: ClassLike }> =
    sourceFile
      .getClasses()
      .map((declaration) => ({ name: declaration.getName(), declaration }));
  for (const statement of sourceFile.getVariableStatements()) {
    for (const variable of statement.getDeclarations()) {
      const declaration = variable.getInitializerIfKind(
        tsMorph().SyntaxKind.ClassExpression,
      );
      if (declaration) {
        owners.push({
          name: declaration.getName() ?? variable.getName(),
          declaration,
        });
      }
    }
  }
  const memberName = qualified ? qualified.methodName : title;
  return owners.some(
    ({ name, declaration }) =>
      (!qualified || qualified.className === name) &&
      [
        ...methodsOf(declaration),
        ...propertiesAndAccessorsOf(declaration),
      ].some(
        (member) =>
          member.getName() === memberName && isPrivateClassMember(member),
      ),
  );
}

function privateMemberRefreshFailure(title: string): string {
  return `'${title}' is a private class member; the symbol extractor tracks only public declarations, so no coordinates are published. Re-point the symbol to the public member or class that owns the behavior, or remove it`;
}

function parseQualifiedMethodTitle(
  title: string,
): { className: string; methodName: string } | null {
  const parts = title.split(".");
  // split always yields at least one part. A trailing dot leaves an empty
  // member name, which no member has, so it needs no separate rejection.
  const methodName = parts.pop() as string;
  const className = parts.join(".");
  return className ? { className, methodName } : null;
}
