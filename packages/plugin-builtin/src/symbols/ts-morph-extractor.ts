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
import type {
  ClassDeclaration,
  ClassExpression,
  Node,
  Project,
  ScriptKind,
  SourceFile,
} from "ts-morph";
import { tsMorph } from "./ts-morph-runtime.js";
import {
  SUPPORTED_SOURCE_EXTENSIONS,
  chooseScriptKind,
  formatMethodSymbolName,
  isPrivateClassMember,
} from "./ts-morph-shared.js";

const EXTRACTOR_ID = "kibi-plugin-builtin.ts-morph";

const V2_LANGUAGE_ALIASES = new Map<
  string | undefined,
  "javascript" | "typescript"
>([
  ["javascript", "javascript"],
  ["js", "javascript"],
  ["node", "javascript"],
  ["nodejs", "javascript"],
  ["typescript", "typescript"],
  ["ts", "typescript"],
]);

function normalizeV2ScriptLanguage(
  language: string | undefined,
): "javascript" | "typescript" | undefined {
  return V2_LANGUAGE_ALIASES.get(language?.trim().toLowerCase());
}

function v2ScriptKind(
  filePath: string,
  languageHint: string | undefined,
): ScriptKind | undefined {
  const extension = path.extname(filePath).toLowerCase();
  const language = normalizeV2ScriptLanguage(languageHint);
  if (SUPPORTED_SOURCE_EXTENSIONS.has(extension)) {
    if (languageHint !== undefined && language === undefined) return undefined;
    if (language !== undefined && language !== inferSourceLanguage(filePath)) {
      return undefined;
    }
    return chooseScriptKind(filePath);
  }
  if (extension === "" && language !== undefined) {
    return language === "typescript"
      ? tsMorph().ScriptKind.TS
      : tsMorph().ScriptKind.JS;
  }
  return undefined;
}

/**
 * Built-in ts-morph symbol extractor. Behavior matches the historical CLI
 * `createTsMorphSourceAnalysisProvider` analysis path.
 */
// implements REQ-capability-plugin-builtin-parity-v1
export function createBuiltinTsMorphSymbolExtractor(): SymbolExtractorV1 {
  // Plugin registration creates the extractor on every CLI start; the project
  // (and the TypeScript compiler behind it) is built on the first analysis.
  let project: Project | undefined;
  const getProject = (): Project => {
    // Without a tsconfig path the project reads no tsconfig files.
    project ??= new (tsMorph().Project)();
    return project;
  };

  return {
    id: EXTRACTOR_ID,
    supports(input): boolean {
      return SUPPORTED_SOURCE_EXTENSIONS.has(
        path.extname(input.path).toLowerCase(),
      );
    },
    analyze(input): SourceAnalysisResult {
      const sourceFile = getProject().createSourceFile(
        input.path,
        input.content,
        {
          overwrite: true,
          scriptKind: chooseScriptKind(input.path),
        },
      );

      try {
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
      } finally {
        // Analysis is per file and purely syntactic; keeping files would grow
        // the project without bound in a long-running daemon.
        getProject().removeSourceFile(sourceFile);
      }
    },
  };
}

/** Built-in asynchronous ts-morph extractor for the source-bound v2 contract. */
// implements REQ-capability-plugin-builtin-parity-v1
export function createBuiltinTsMorphSymbolExtractorV2(): SymbolExtractorV2 {
  // Like the v1 extractor, build the project (and load the TypeScript
  // compiler) on the first analysis rather than at plugin registration.
  // Only syntactic diagnostics are read, so the program needs neither the
  // default library files nor the file's imports; loading them made every
  // analysis rebuild a program over the whole lib closure.
  let project: Project | undefined;
  const getProject = (): Project => {
    project ??= new (tsMorph().Project)({
      compilerOptions: { noLib: true, noResolve: true, types: [] },
    });
    return project;
  };

  return {
    id: `${EXTRACTOR_ID}.v2`,
    supports(input): boolean {
      return v2ScriptKind(input.path, input.language) !== undefined;
    },
    async analyze(input): Promise<SourceAnalysisResultV2> {
      const extension = path.extname(input.path).toLowerCase();
      const language =
        normalizeV2ScriptLanguage(input.language) ??
        (input.language?.trim() ||
          (SUPPORTED_SOURCE_EXTENSIONS.has(extension)
            ? inferSourceLanguage(input.path)
            : "unknown"));
      const module = {
        title: inferModuleTitle(input.path),
        language,
        analysisMode: "parser" as const,
      };
      const scriptKind = v2ScriptKind(input.path, input.language);
      if (scriptKind === undefined) {
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

      let sourceFile: SourceFile | undefined;
      try {
        sourceFile = getProject().createSourceFile(input.path, input.content, {
          overwrite: true,
          scriptKind,
        });
        const analyzed = sourceFile;
        const diagnostics = analyzed
          .getProject()
          .getProgram()
          .getSyntacticDiagnostics(analyzed)
          .map((diagnostic) => {
            // Parser diagnostics always carry a span inside the analyzed text
            // and a plain string message (never a chained message).
            const start = diagnostic.getStart() as number;
            const end = start + (diagnostic.getLength() as number);
            return {
              code: `TS${diagnostic.getCode()}`,
              message: diagnostic.getMessageText() as string,
              range: sourceRangeAtOffsets(analyzed, start, end),
            };
          });
        const result: SourceAnalysisResultV2 = {
          contractVersion: "kibi.symbol-extractor.v2",
          status: diagnostics.length > 0 ? "partial" : "ok",
          sourceFile: input.path,
          language,
          module,
          symbols: collectSourceSymbols(analyzed, true),
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
      } finally {
        if (sourceFile) getProject().removeSourceFile(sourceFile);
      }
    },
  };
}

type SourceRange = NonNullable<
  SourceAnalysisResultV2["diagnostics"][number]["range"]
>;

// ts-morph columns are 1-based; Kibi ranges use 0-based columns.
function sourceRangeAtOffsets(
  sourceFile: SourceFile,
  startOffset: number,
  endOffset: number,
): SourceRange {
  const start = sourceFile.getLineAndColumnAtPos(startOffset);
  const end = sourceFile.getLineAndColumnAtPos(endOffset);
  return {
    startLine: start.line,
    startColumn: start.column - 1,
    endLine: end.line,
    endColumn: end.column - 1,
  };
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
    // v1 skips malformed class member walks and keeps the class symbol;
    // v2 must expose the failure.
    attempt(includeV2Fields, () =>
      appendClassMembers(
        sourceFile,
        decl,
        decl.getName(),
        symbols,
        includeV2Fields,
      ),
    );
  }

  for (const decl of sourceFile.getInterfaces()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName(),
        "interface",
        decl.getNameNode(),
        decl,
        // Historical CLI used getText(); keep calling it so characterization
        // mocks that throw from getText still isolate the failure.
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${decl.getText()}`,
        includeV2Fields,
      ),
    );
  }

  for (const decl of sourceFile.getTypeAliases()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName(),
        "type",
        decl.getNameNode(),
        decl,
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${decl.getText()}`,
        includeV2Fields,
      ),
    );
  }

  for (const decl of sourceFile.getEnums()) {
    if (!decl.isExported()) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        decl.getName(),
        "enum",
        decl.getNameNode(),
        decl,
        // Enums historically used getText(); prefer leading comments when the
        // real AST is available, else getText for test doubles.
        `${leadingCommentsAndJsDocs(sourceFile, decl)}\n${decl.getText()}`,
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
          declaration.getNameNode(),
          declaration,
          // Statement carries leading `// implements`; declaration text is the
          // historical fallback when only getText is stubbed in tests.
          `${safeFullText(statement)}\n${declaration.getText()}`,
          includeV2Fields,
        ),
      );
      attempt(includeV2Fields, () => {
        // Characterization doubles may omit AST accessors; treat a missing
        // one as "nothing there".
        const classExpression = declaration.getInitializerIfKind?.(
          tsMorph().SyntaxKind.ClassExpression,
        );
        if (classExpression) {
          appendClassMembers(
            sourceFile,
            classExpression,
            declaration.getName(),
            symbols,
            includeV2Fields,
          );
        }
      });
    }
  }

  return symbols;
}

// Characterization doubles of the v1 extractor may omit any of these AST
// accessors; a missing accessor contributes no text.
interface DirectiveTextNode {
  getFullText?: () => string;
  getFullStart?: () => number;
  getStart?: (includeJsDocComments?: boolean) => number;
  getJsDocs?: () => ReadonlyArray<{ getFullText: () => string }>;
}

function jsDocsOnly(node: DirectiveTextNode): string {
  return (node.getJsDocs?.() ?? []).map((doc) => doc.getFullText()).join("\n");
}

function leadingCommentsAndJsDocs(
  sourceFile: SourceFile,
  node: DirectiveTextNode,
): string {
  // The span between the full start and the start without JSDoc holds the
  // leading comments and the JSDoc itself (the JSDoc is appended again below,
  // matching the historical directive text).
  const leading =
    node.getFullStart === undefined || node.getStart === undefined
      ? ""
      : sourceFile
          .getFullText()
          .slice(node.getFullStart(), node.getStart(false));
  return `${leading}\n${jsDocsOnly(node)}`;
}

function fullTextWithJsDocs(node: DirectiveTextNode): string {
  return `${safeFullText(node)}\n${jsDocsOnly(node)}`;
}

function safeFullText(node: DirectiveTextNode): string {
  return node.getFullText?.() ?? "";
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
  for (const method of declaration.getMethods?.() ?? []) {
    if (isPrivateClassMember(method)) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, method.getName()),
        "method",
        method.getNameNode(),
        method,
        `${classLeading}\n${fullTextWithJsDocs(method)}`,
        includeV2Fields,
        className,
      ),
    );
  }

  for (const property of declaration.getProperties?.() ?? []) {
    if (isPrivateClassMember(property)) continue;
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, property.getName()),
        "property",
        property.getNameNode(),
        property,
        `${classLeading}\n${fullTextWithJsDocs(property)}`,
        includeV2Fields,
        className,
      ),
    );
  }

  const accessors = [
    ...(declaration.getGetAccessors?.() ?? []),
    ...(declaration.getSetAccessors?.() ?? []),
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
      const [one, two] = candidates as [typeof accessor, typeof accessor];
      if (candidates.length === 2 && one.getKind() !== two.getKind()) {
        // Class members in source order put the earlier accessor first.
        const [first, last] = declaration
          .getMembers()
          .filter((member) => member === one || member === two) as [
          typeof one,
          typeof two,
        ];
        // A complementary getter/setter pair is one authored property. Keep
        // both bodies in its span without assigning the same ID twice.
        const symbol = toSourceSymbolAnalysis(
          sourceFile,
          formatMethodSymbolName(className, accessor.getName()),
          "accessor",
          first.getNameNode(),
          last,
          `${classLeading}\n${fullTextWithJsDocs(first)}\n${fullTextWithJsDocs(last)}`,
          true,
          className,
        );
        symbols.push({ ...symbol, nativeKind: "AccessorPair" });
        // Only the later partner can still come up in this loop: `one` is
        // either the current accessor or one already visited.
        pairedAccessors.add(two);
        continue;
      }
    }
    pushSymbol(symbols, includeV2Fields, () =>
      toSourceSymbolAnalysis(
        sourceFile,
        formatMethodSymbolName(className, accessor.getName()),
        "accessor",
        accessor.getNameNode(),
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
  attempt(strict, () => {
    symbols.push(build());
  });
}

/** Legacy v1 recovers from a failing step; v2 must expose the failure. */
function attempt(strict: boolean, run: () => void): void {
  try {
    run();
  } catch (error) {
    if (strict) throw error;
  }
}

function toSourceSymbolAnalysis(
  sourceFile: SourceFile,
  name: string,
  kind: SourceSymbolKind,
  startNode: Node,
  endNode: Node,
  directiveText: string,
  includeV2Fields: boolean,
  containerName?: string,
): SourceSymbolAnalysisV2 {
  const span = sourceRangeAtOffsets(
    sourceFile,
    startNode.getStart(),
    endNode.getEnd(),
  );

  const result: SourceSymbolAnalysis = {
    name,
    kind,
    ...span,
    directiveText,
  };
  if (!includeV2Fields) return result;

  // Private identifiers never reach here (private members are skipped) and
  // declaration names cannot be template literals.
  const hasNameNode = [
    "Identifier",
    "StringLiteral",
    "NumericLiteral",
    "ComputedPropertyName",
  ].includes(startNode.getKindName());
  return {
    ...result,
    qualifiedName: name,
    ...(containerName ? { containerName } : {}),
    nativeKind: endNode.getKindName(),
    ...(hasNameNode
      ? {
          nameRange: sourceRangeAtOffsets(
            sourceFile,
            startNode.getStart(),
            startNode.getEnd(),
          ),
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
  // A dotfile such as `.ts` has no extension, so the basename is never empty
  // for a non-empty file name.
  return path.basename(filePath, path.extname(filePath));
}
