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

import * as path from "node:path";
import {
  type ClassDeclaration,
  type ClassExpression,
  type Node,
  Project,
  type SourceFile,
  SyntaxKind,
} from "ts-morph";
import type {
  SourceAnalysisProvider,
  SourceAnalysisResult,
  SourceSymbolAnalysis,
  SourceSymbolKind,
  SymbolExtractorV1,
} from "kibi-plugin-sdk";
import { toSourceAnalysisProvider } from "kibi-plugin-sdk";
import {
  SUPPORTED_SOURCE_EXTENSIONS,
  chooseScriptKind,
  formatMethodSymbolName,
  isPrivateClassMember,
} from "./ts-morph-shared.js";

const EXTRACTOR_ID = "kibi-plugin-builtin.ts-morph";

/**
 * Built-in ts-morph symbol extractor. Behavior matches the historical CLI
 * `createTsMorphSourceAnalysisProvider` analysis path.
 */
// implements REQ-capability-plugin-builtin-parity-v1
export function createBuiltinTsMorphSymbolExtractor(): SymbolExtractorV1 {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  return {
    id: EXTRACTOR_ID,
    supports(input): boolean {
      return SUPPORTED_SOURCE_EXTENSIONS.has(
        path.extname(input.path).toLowerCase(),
      );
    },
    analyze(input): SourceAnalysisResult {
      const sourceFile = project.createSourceFile(input.path, input.content, {
        overwrite: true,
        scriptKind: chooseScriptKind(input.path),
      });

      return {
        sourceFile: input.path,
        language: inferSourceLanguage(input.path),
        module: {
          title: inferModuleTitle(input.path),
          language: inferSourceLanguage(input.path),
          analysisMode: "parser",
        },
        symbols: collectSourceSymbols(sourceFile),
      };
    },
  };
}

// implements REQ-capability-plugin-builtin-parity-v1
export function createBuiltinTsMorphSourceAnalysisProvider(): SourceAnalysisProvider {
  return toSourceAnalysisProvider(createBuiltinTsMorphSymbolExtractor());
}

function collectSourceSymbols(sourceFile: SourceFile): SourceSymbolAnalysis[] {
  const symbols: SourceSymbolAnalysis[] = [];

  for (const decl of sourceFile.getFunctions()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "function",
        decl.getNameNode() ?? decl,
        decl,
        directiveTextFor(decl),
      ),
    );
  }

  for (const decl of sourceFile.getClasses()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "class",
        decl.getNameNode() ?? decl,
        decl,
        directiveTextFor(decl),
      ),
    );
    try {
      appendClassMembers(sourceFile, decl, decl.getName(), symbols);
    } catch {
      // Skip malformed class member walks; keep the class symbol.
    }
  }

  for (const decl of sourceFile.getInterfaces()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "interface",
        decl.getNameNode() ?? decl,
        decl,
        directiveTextFor(decl),
      ),
    );
  }

  for (const decl of sourceFile.getTypeAliases()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "type",
        decl.getNameNode() ?? decl,
        decl,
        directiveTextFor(decl),
      ),
    );
  }

  for (const decl of sourceFile.getEnums()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "enum",
        decl.getNameNode() ?? decl,
        decl,
        directiveTextFor(decl),
      ),
    );
  }

  for (const statement of sourceFile.getVariableStatements()) {
    if (!statement.isExported()) continue;

    for (const declaration of statement.getDeclarations()) {
      pushSymbol(symbols, () =>
        toSourceSymbolAnalysis(
          sourceFile,
          declaration.getName(),
          "variable",
          declaration.getNameNode() ?? declaration,
          declaration,
          // Variable declarations themselves often lack leading comments;
          // the export statement carries `// implements` / JSDoc.
          `${directiveTextFor(statement)}\n${declaration.getFullText()}`,
        ),
      );
      try {
        const classExpression =
          typeof declaration.getInitializerIfKind === "function"
            ? declaration.getInitializerIfKind(SyntaxKind.ClassExpression)
            : undefined;
        if (classExpression) {
          appendClassMembers(
            sourceFile,
            classExpression,
            declaration.getName(),
            symbols,
          );
        }
      } catch {
        // Skip malformed class-expression members; keep the variable symbol.
      }
    }
  }

  return symbols;
}

/** Leading line comments + JSDoc attached to a declaration (for ownership directives). */
function directiveTextFor(node: {
  getFullText: () => string;
  getJsDocs?: () => ReadonlyArray<{ getFullText: () => string }>;
}): string {
  const jsdocs =
    typeof node.getJsDocs === "function"
      ? node
          .getJsDocs()
          .map((doc) => doc.getFullText())
          .join("\n")
      : "";
  return `${node.getFullText()}\n${jsdocs}`;
}

function appendClassMembers(
  sourceFile: SourceFile,
  declaration: ClassDeclaration | ClassExpression,
  className: string | undefined,
  symbols: SourceSymbolAnalysis[],
): void {
  // Class-level ownership directives also cover members (avoids repeating
  // `// implements` on every method when the class is the unit of ownership).
  const classDirectives = directiveTextFor(declaration);
  const methods =
    typeof declaration.getMethods === "function" ? declaration.getMethods() : [];
  for (const method of methods) {
    if (isPrivateClassMember(method)) continue;
    pushSymbol(symbols, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, method.getName()),
        "method",
        method.getNameNode() ?? method,
        method,
        `${classDirectives}\n${directiveTextFor(method)}`,
      ),
    );
  }

  const properties =
    typeof declaration.getProperties === "function"
      ? declaration.getProperties()
      : [];
  for (const property of properties) {
    if (isPrivateClassMember(property)) continue;
    pushSymbol(symbols, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, property.getName()),
        "property",
        property.getNameNode() ?? property,
        property,
        `${classDirectives}\n${directiveTextFor(property)}`,
      ),
    );
  }

  const accessors = [
    ...(typeof declaration.getGetAccessors === "function"
      ? declaration.getGetAccessors()
      : []),
    ...(typeof declaration.getSetAccessors === "function"
      ? declaration.getSetAccessors()
      : []),
  ];
  for (const accessor of accessors) {
    if (isPrivateClassMember(accessor)) continue;
    pushSymbol(symbols, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, accessor.getName()),
        "accessor",
        accessor.getNameNode() ?? accessor,
        accessor,
        `${classDirectives}\n${directiveTextFor(accessor)}`,
      ),
    );
  }
}

function pushSymbol(
  symbols: SourceSymbolAnalysis[],
  build: () => SourceSymbolAnalysis,
): void {
  try {
    symbols.push(build());
  } catch {
    // Skip malformed declarations; keep sibling symbols.
  }
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
