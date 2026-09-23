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
        // Functions: leading trivia via getFullText + JSDoc (historical CLI).
        fullTextWithJsDocs(decl),
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
        // Leading comments + JSDoc only — never the class body (method
        // `// implements` must stay on the method symbol).
        leadingCommentsAndJsDocs(sourceFile, decl),
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
        // Historical CLI used getText(); keep calling it so characterization
        // mocks that throw from getText still isolate the failure.
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${safeGetText(decl)}`,
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
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${safeGetText(decl)}`,
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
        // Enums historically used getText(); prefer leading comments when the
        // real AST is available, else getText for test doubles.
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${safeGetText(decl)}`,
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
          // Statement carries leading `// implements`; declaration text is the
          // historical fallback when only getText is stubbed in tests.
          `${safeFullText(statement)}\n${safeGetText(declaration)}`,
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

function jsDocsOnly(node: {
  getJsDocs?: () => ReadonlyArray<{ getFullText: () => string }>;
}): string {
  if (typeof node.getJsDocs !== "function") return "";
  return node
    .getJsDocs()
    .map((doc) => doc.getFullText())
    .join("\n");
}

function leadingCommentsAndJsDocs(
  sourceFile: SourceFile,
  node: {
    getFullStart?: () => number;
    getStart?: (includeJsDocComment?: boolean) => number;
    getJsDocs?: () => ReadonlyArray<{ getFullText: () => string }>;
  },
): string {
  let leading = "";
  try {
    if (
      typeof node.getFullStart === "function" &&
      typeof node.getStart === "function"
    ) {
      const fullStart = node.getFullStart();
      // Exclude JSDoc from the range so we don't double-count with jsDocsOnly.
      const start = node.getStart(false);
      if (
        Number.isFinite(fullStart) &&
        Number.isFinite(start) &&
        start > fullStart
      ) {
        leading = sourceFile.getFullText().slice(fullStart, start);
      }
    }
  } catch {
    leading = "";
  }
  return `${leading}\n${jsDocsOnly(node)}`;
}

function fullTextWithJsDocs(node: {
  getFullText?: () => string;
  getJsDocs?: () => ReadonlyArray<{ getFullText: () => string }>;
}): string {
  return `${safeFullText(node)}\n${jsDocsOnly(node)}`;
}

function safeFullText(node: { getFullText?: () => string }): string {
  return typeof node.getFullText === "function" ? node.getFullText() : "";
}

function safeGetText(node: { getText?: () => string }): string {
  return typeof node.getText === "function" ? node.getText() : "";
}

function appendClassMembers(
  sourceFile: SourceFile,
  declaration: ClassDeclaration | ClassExpression,
  className: string | undefined,
  symbols: SourceSymbolAnalysis[],
): void {
  // Inherit class *leading* ownership comments onto members (not the class
  // body). Method-local `// implements` stay on the method via getFullText.
  const classLeading = leadingCommentsAndJsDocs(sourceFile, declaration);
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
        `${classLeading}\n${fullTextWithJsDocs(method)}`,
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
        `${classLeading}\n${fullTextWithJsDocs(property)}`,
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
        `${classLeading}\n${fullTextWithJsDocs(accessor)}`,
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
