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
import type {
  SourceAnalysisProvider,
  SourceAnalysisResult,
  SourceAnalysisResultV2,
  SourceSymbolAnalysis,
  SourceSymbolAnalysisV2,
  SourceSymbolKind,
  SymbolExtractorV1,
  SymbolExtractorV2,
} from "kibi-plugin-sdk";
import { toSourceAnalysisProvider } from "kibi-plugin-sdk";
import {
  type ClassDeclaration,
  type ClassExpression,
  type Node,
  Project,
  type SourceFile,
  SyntaxKind,
} from "ts-morph";
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

/** Built-in asynchronous ts-morph extractor for the source-bound v2 contract. */
// implements REQ-capability-plugin-builtin-parity-v1
export function createBuiltinTsMorphSymbolExtractorV2(): SymbolExtractorV2 {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  return {
    id: `${EXTRACTOR_ID}.v2`,
    supports(input): boolean {
      return SUPPORTED_SOURCE_EXTENSIONS.has(
        path.extname(input.path).toLowerCase(),
      );
    },
    async analyze(input): Promise<SourceAnalysisResultV2> {
      const language =
        input.language?.trim() || inferSourceLanguage(input.path);
      const module = {
        title: inferModuleTitle(input.path),
        language,
        analysisMode: "parser" as const,
      };
      if (
        !SUPPORTED_SOURCE_EXTENSIONS.has(path.extname(input.path).toLowerCase())
      ) {
        return {
          contractVersion: "kibi.symbol-extractor.v2",
          status: "unsupported",
          sourceFile: input.path,
          language,
          module,
          symbols: [],
          diagnostics: [
            {
              code: "UNSUPPORTED_SOURCE_TYPE",
              message: `The built-in ts-morph extractor does not support '${path.extname(input.path) || "extensionless"}' files`,
            },
          ],
          uncoveredRanges: [],
        };
      }

      try {
        const sourceFile = project.createSourceFile(input.path, input.content, {
          overwrite: true,
          scriptKind: chooseScriptKind(input.path),
        });
        const diagnostics = sourceFile
          .getProject()
          .getProgram()
          .getSyntacticDiagnostics(sourceFile)
          .map((diagnostic) => {
            const start = diagnostic.getStart();
            const length = diagnostic.getLength();
            const range =
              start === undefined
                ? wholeSourceRange(sourceFile, input.content)
                : sourceRangeAtOffsets(
                    sourceFile,
                    input.content,
                    start,
                    start + (length ?? 0),
                  );
            const message = diagnostic.getMessageText();
            return {
              code: `TS${diagnostic.getCode()}`,
              message:
                typeof message === "string"
                  ? message
                  : message.getMessageText(),
              range,
            };
          });
        const result: SourceAnalysisResultV2 = {
          contractVersion: "kibi.symbol-extractor.v2",
          status: diagnostics.length > 0 ? "partial" : "ok",
          sourceFile: input.path,
          language,
          module,
          symbols: collectSourceSymbols(sourceFile, true),
          diagnostics,
          uncoveredRanges: diagnostics.map(({ range, code }) => ({
            ...range,
            reason: `The TypeScript parser reported ${code} at this source span.`,
          })),
        };
        return result;
      } catch (error) {
        return {
          contractVersion: "kibi.symbol-extractor.v2",
          status: "failed",
          sourceFile: input.path,
          language,
          module,
          symbols: [],
          diagnostics: [
            {
              code: "SOURCE_ANALYSIS_FAILED",
              message:
                error instanceof Error
                  ? error.message
                  : "The built-in ts-morph extractor failed",
            },
          ],
          uncoveredRanges: [],
        };
      }
    },
  };
}

function sourceRangeAtOffsets(
  sourceFile: SourceFile,
  content: string,
  startOffset: number,
  endOffset: number,
): NonNullable<SourceAnalysisResultV2["diagnostics"][number]["range"]> {
  const boundedStart = Math.min(Math.max(startOffset, 0), content.length);
  const boundedEnd = Math.min(
    Math.max(endOffset, boundedStart),
    content.length,
  );
  const start = sourceFile.getLineAndColumnAtPos(boundedStart);
  const end = sourceFile.getLineAndColumnAtPos(boundedEnd);
  return {
    startLine: start.line,
    startColumn: Math.max(0, start.column - 1),
    endLine: end.line,
    endColumn: Math.max(0, end.column - 1),
  };
}

function wholeSourceRange(
  sourceFile: SourceFile,
  content: string,
): NonNullable<SourceAnalysisResultV2["diagnostics"][number]["range"]> {
  return sourceRangeAtOffsets(sourceFile, content, 0, content.length);
}

// implements REQ-capability-plugin-builtin-parity-v1
export function createBuiltinTsMorphSourceAnalysisProvider(): SourceAnalysisProvider {
  return toSourceAnalysisProvider(createBuiltinTsMorphSymbolExtractor());
}

function collectSourceSymbols(
  sourceFile: SourceFile,
  includeV2Fields = false,
): SourceSymbolAnalysisV2[] {
  const symbols: SourceSymbolAnalysisV2[] = [];

  for (const decl of sourceFile.getFunctions()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "function",
        decl.getNameNode() ?? decl,
        decl,
        // Functions: leading trivia via getFullText + JSDoc (historical CLI).
        fullTextWithJsDocs(decl),
        includeV2Fields,
      ),
    );
  }

  for (const decl of sourceFile.getClasses()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "class",
        decl.getNameNode() ?? decl,
        decl,
        // Leading comments + JSDoc only — never the class body (method
        // `// implements` must stay on the method symbol).
        leadingCommentsAndJsDocs(sourceFile, decl),
        includeV2Fields,
      ),
    );
    try {
      appendClassMembers(
        sourceFile,
        decl,
        decl.getName(),
        symbols,
        includeV2Fields,
      );
    } catch {
      // Skip malformed class member walks; keep the class symbol.
    }
  }

  for (const decl of sourceFile.getInterfaces()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "interface",
        decl.getNameNode() ?? decl,
        decl,
        // Historical CLI used getText(); keep calling it so characterization
        // mocks that throw from getText still isolate the failure.
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${safeGetText(decl)}`,
        includeV2Fields,
      ),
    );
  }

  for (const decl of sourceFile.getTypeAliases()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "type",
        decl.getNameNode() ?? decl,
        decl,
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${safeGetText(decl)}`,
        includeV2Fields,
      ),
    );
  }

  for (const decl of sourceFile.getEnums()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName() ?? "<anonymous>",
        "enum",
        decl.getNameNode() ?? decl,
        decl,
        // Enums historically used getText(); prefer leading comments when the
        // real AST is available, else getText for test doubles.
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${safeGetText(decl)}`,
        includeV2Fields,
      ),
    );
  }

  for (const statement of sourceFile.getVariableStatements()) {
    if (!statement.isExported()) continue;

    for (const declaration of statement.getDeclarations()) {
      pushSymbol(symbols, includeV2Fields, () =>
        toSourceSymbolAnalysis(
          sourceFile,
          declaration.getName(),
          "variable",
          declaration.getNameNode() ?? declaration,
          declaration,
          // Statement carries leading `// implements`; declaration text is the
          // historical fallback when only getText is stubbed in tests.
          `${safeFullText(statement)}\n${safeGetText(declaration)}`,
          includeV2Fields,
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
            includeV2Fields,
          );
        }
      } catch (error) {
        if (includeV2Fields) throw error;
        // Preserve legacy v1 class-expression recovery.
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
  symbols: SourceSymbolAnalysisV2[],
  includeV2Fields: boolean,
): void {
  // Inherit class *leading* ownership comments onto members (not the class
  // body). Method-local `// implements` stay on the method via getFullText.
  const classLeading = leadingCommentsAndJsDocs(sourceFile, declaration);
  const methods =
    typeof declaration.getMethods === "function"
      ? declaration.getMethods()
      : [];
  for (const method of methods) {
    if (isPrivateClassMember(method)) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, method.getName()),
        "method",
        method.getNameNode() ?? method,
        method,
        `${classLeading}\n${fullTextWithJsDocs(method)}`,
        includeV2Fields,
        className,
      ),
    );
  }

  const properties =
    typeof declaration.getProperties === "function"
      ? declaration.getProperties()
      : [];
  for (const property of properties) {
    if (isPrivateClassMember(property)) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, property.getName()),
        "property",
        property.getNameNode() ?? property,
        property,
        `${classLeading}\n${fullTextWithJsDocs(property)}`,
        includeV2Fields,
        className,
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
  const pairedAccessors = new Set<Node>();
  for (const accessor of accessors) {
    if (isPrivateClassMember(accessor)) continue;
    if (pairedAccessors.has(accessor)) continue;
    if (includeV2Fields) {
      const candidates = accessors.filter(
        (candidate) =>
          candidate.getName() === accessor.getName() &&
          candidate.isStatic() === accessor.isStatic(),
      );
      const other = candidates.find((candidate) => candidate !== accessor);
      if (
        candidates.length === 2 &&
        other &&
        other.getKind() !== accessor.getKind()
      ) {
        const first = accessor.getStart() < other.getStart() ? accessor : other;
        const last = first === accessor ? other : accessor;
        // A complementary getter/setter pair is one authored property. Keep
        // both bodies in its span without assigning the same ID twice.
        const symbol = toSourceSymbolAnalysis(
          sourceFile,
          formatMethodSymbolName(className, accessor.getName()),
          "accessor",
          first.getNameNode() ?? first,
          last,
          `${classLeading}\n${fullTextWithJsDocs(first)}\n${fullTextWithJsDocs(last)}`,
          true,
          className,
        );
        symbols.push({ ...symbol, nativeKind: "AccessorPair" });
        pairedAccessors.add(accessor);
        pairedAccessors.add(other);
        continue;
      }
    }
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, accessor.getName()),
        "accessor",
        accessor.getNameNode() ?? accessor,
        accessor,
        `${classLeading}\n${fullTextWithJsDocs(accessor)}`,
        includeV2Fields,
        className,
      ),
    );
  }
}

function pushSymbol(
  symbols: SourceSymbolAnalysis[],
  strict: boolean,
  build: () => SourceSymbolAnalysis,
): void {
  try {
    symbols.push(build());
  } catch (error) {
    if (strict) throw error;
    // Preserve legacy v1 recovery; v2 must expose extraction failure.
  }
}

function toSourceSymbolAnalysis(
  sourceFile: SourceFile,
  name: string,
  kind: SourceSymbolKind,
  startNode: Node,
  endNode: Node,
  directiveText: string,
  includeV2Fields = false,
  containerName?: string,
): SourceSymbolAnalysisV2 {
  const start = sourceFile.getLineAndColumnAtPos(startNode.getStart());
  const end = sourceFile.getLineAndColumnAtPos(endNode.getEnd());

  const result: SourceSymbolAnalysis = {
    name,
    kind,
    startLine: start.line,
    startColumn: Math.max(0, start.column - 1),
    endLine: end.line,
    endColumn: Math.max(0, end.column - 1),
    directiveText,
  };
  if (!includeV2Fields) return result;

  const nameKind = startNode.getKindName();
  const hasNameNode = [
    "Identifier",
    "PrivateIdentifier",
    "StringLiteral",
    "NumericLiteral",
    "NoSubstitutionTemplateLiteral",
    "ComputedPropertyName",
  ].includes(nameKind);
  const nameRangeStart = sourceFile.getLineAndColumnAtPos(startNode.getStart());
  const nameRangeEnd = sourceFile.getLineAndColumnAtPos(startNode.getEnd());
  return {
    ...result,
    qualifiedName: name,
    ...(containerName ? { containerName } : {}),
    nativeKind: endNode.getKindName(),
    ...(hasNameNode
      ? {
          nameRange: {
            startLine: nameRangeStart.line,
            startColumn: Math.max(0, nameRangeStart.column - 1),
            endLine: nameRangeEnd.line,
            endColumn: Math.max(0, nameRangeEnd.column - 1),
          },
        }
      : {}),
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
