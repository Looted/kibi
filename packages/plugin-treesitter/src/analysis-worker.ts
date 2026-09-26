import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import type {
  SourceAnalysisDiagnosticV2,
  SourceAnalysisRangeV2,
  SourceAnalysisUncoveredRangeV2,
  SourceSymbolAnalysisV2,
  SourceSymbolKind,
} from "kibi-plugin-sdk";
import { Language, Parser, Query } from "web-tree-sitter";
import type { TreeSitterLanguage } from "./catalog.js";

const MAX_SYMBOLS = 10_000;
const QUERY_MATCH_LIMIT = 16_384;
const MAX_DIAGNOSTICS = 64;

interface AnalysisWorkerInput {
  readonly language: TreeSitterLanguage;
  readonly content: string;
}

interface AnalysisWorkerSuccess {
  readonly ok: true;
  readonly status: "ok" | "partial";
  readonly symbols: readonly SourceSymbolAnalysisV2[];
  readonly diagnostics: readonly SourceAnalysisDiagnosticV2[];
  readonly uncoveredRanges: readonly SourceAnalysisUncoveredRangeV2[];
}

interface AnalysisWorkerFailure {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
}

type AnalysisWorkerResult = AnalysisWorkerSuccess | AnalysisWorkerFailure;

interface DefinitionCandidate {
  readonly name: string;
  readonly kind: SourceSymbolKind;
  readonly nativeKind: string;
  readonly definitionNode: import("web-tree-sitter").Node;
  readonly nameNode: import("web-tree-sitter").Node;
  readonly directiveText?: string;
  readonly containerName?: string;
  readonly qualifiedName: string;
}

function rangeForNode(
  node: import("web-tree-sitter").Node,
): SourceAnalysisRangeV2 {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column,
  };
}

function fullSourceRange(content: string): SourceAnalysisRangeV2 {
  const lines = content.split(/\r\n|\n|\r/);
  return {
    startLine: 1,
    startColumn: 0,
    endLine: lines.length,
    endColumn: lines.at(-1)?.length ?? 0,
  };
}

function sourceRangeKey(range: SourceAnalysisRangeV2): string {
  return `${range.startLine}:${range.startColumn}-${range.endLine}:${range.endColumn}`;
}

function getLeadingDirective(
  content: string,
  startLine: number,
  language: TreeSitterLanguage,
): string | undefined {
  const marker = language === "python" ? "#" : "//";
  const lines = content.split(/\r\n|\n|\r/);
  const directives: string[] = [];
  for (let lineIndex = startLine - 2; lineIndex >= 0; lineIndex -= 1) {
    const line = lines[lineIndex]?.trim();
    if (line === undefined || line.length === 0) break;
    if (!line.startsWith(marker)) break;
    if (/\bimplements\s+REQ-[A-Za-z0-9-]+\b/.test(line)) {
      directives.unshift(line);
    }
  }
  return directives.length > 0 ? directives.join("\n") : undefined;
}

function enclosingNodes(
  node: import("web-tree-sitter").Node,
): import("web-tree-sitter").Node[] {
  const ancestors: import("web-tree-sitter").Node[] = [];
  let current = node.parent;
  while (current !== null) {
    ancestors.unshift(current);
    current = current.parent;
  }
  return ancestors;
}

function rustContainer(
  definitionNode: import("web-tree-sitter").Node,
): string | undefined {
  const ancestors = enclosingNodes(definitionNode);
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index];
    if (ancestor?.type === "trait_item") {
      return ancestor.childForFieldName("name")?.text;
    }
    if (ancestor?.type === "impl_item") {
      const typeName = ancestor.childForFieldName("type")?.text;
      const traitName = ancestor.childForFieldName("trait")?.text;
      if (typeName === undefined) return traitName;
      return traitName === undefined
        ? typeName
        : `${traitName} for ${typeName}`;
    }
    if (ancestor?.type === "mod_item") {
      const moduleName = ancestor.childForFieldName("name")?.text;
      if (moduleName !== undefined) return moduleName;
    }
  }
  return undefined;
}

function classifyDefinition(
  language: TreeSitterLanguage,
  captureName: string,
  node: import("web-tree-sitter").Node,
): SourceSymbolKind | undefined {
  if (captureName === "definition.function") {
    if (
      language === "rust" &&
      enclosingNodes(node).some(
        (ancestor) =>
          ancestor.type === "impl_item" || ancestor.type === "trait_item",
      )
    ) {
      return "method";
    }
    return "function";
  }
  if (captureName === "definition.method") {
    if (
      language === "rust" &&
      !enclosingNodes(node).some(
        (ancestor) =>
          ancestor.type === "impl_item" || ancestor.type === "trait_item",
      )
    ) {
      return "function";
    }
    return "method";
  }
  if (captureName === "definition.interface") return "interface";
  if (captureName === "definition.constant") return "variable";
  if (captureName === "definition.type") {
    if (language === "go" && node.type === "type_spec") {
      const declaredType = node.childForFieldName("type")?.type;
      if (declaredType === "interface_type") return "interface";
      if (declaredType === "struct_type") return "class";
    }
    return "type";
  }
  if (captureName === "definition.class") {
    if (language === "python") return "class";
    if (language === "rust") {
      if (node.type === "enum_item") return "enum";
      if (node.type === "type_item" || node.type === "union_item")
        return "type";
      return "class";
    }
    if (language === "go" && node.type === "type_spec") {
      const declaredType = node.childForFieldName("type")?.type;
      if (declaredType === "interface_type") return "interface";
      if (declaredType === "struct_type") return "class";
      return "type";
    }
  }
  return undefined;
}

function candidateForMatch(
  language: TreeSitterLanguage,
  content: string,
  captures: readonly {
    readonly name: string;
    readonly node: import("web-tree-sitter").Node;
  }[],
): DefinitionCandidate | undefined {
  const definitionCapture = captures.find((capture) =>
    capture.name.startsWith("definition."),
  );
  const nameCapture = captures.find((capture) => capture.name === "name");
  if (definitionCapture === undefined || nameCapture === undefined)
    return undefined;

  const definitionNode = definitionCapture.node;
  const nameNode = nameCapture.node;
  const kind = classifyDefinition(
    language,
    definitionCapture.name,
    definitionNode,
  );
  const name = nameNode.text;
  if (kind === undefined || name.length === 0) return undefined;

  const scopes: string[] = [];
  if (language === "python") {
    for (const ancestor of enclosingNodes(definitionNode)) {
      if (
        ancestor.type === "class_definition" ||
        ancestor.type === "function_definition"
      ) {
        const scopeName = ancestor.childForFieldName("name")?.text;
        if (scopeName !== undefined) scopes.push(scopeName);
      }
    }
  } else if (language === "rust") {
    for (const ancestor of enclosingNodes(definitionNode)) {
      if (ancestor.type === "mod_item") {
        const moduleName = ancestor.childForFieldName("name")?.text;
        if (moduleName !== undefined) scopes.push(moduleName);
      }
    }
    const rustContainerName = rustContainer(definitionNode);
    if (
      rustContainerName !== undefined &&
      !scopes.includes(rustContainerName)
    ) {
      scopes.push(rustContainerName);
    }
  } else if (language === "go" && kind === "method") {
    const receiver = definitionNode.childForFieldName("receiver");
    const receiverType =
      receiver?.descendantsOfType("type_identifier")[0]?.text;
    if (receiverType !== undefined) scopes.push(receiverType);
  }

  const containerName = scopes.at(-1);
  const qualifiedName = [...scopes, name].join(".");
  const directiveText = getLeadingDirective(
    content,
    rangeForNode(definitionNode).startLine,
    language,
  );
  return {
    name,
    kind,
    nativeKind: definitionNode.type,
    definitionNode,
    nameNode,
    qualifiedName,
    ...(containerName !== undefined ? { containerName } : {}),
    ...(directiveText !== undefined ? { directiveText } : {}),
  };
}

function buildSymbol(candidate: DefinitionCandidate): SourceSymbolAnalysisV2 {
  const definitionRange = rangeForNode(candidate.definitionNode);
  return {
    name: candidate.name,
    kind: candidate.kind,
    ...definitionRange,
    qualifiedName: candidate.qualifiedName,
    nativeKind: candidate.nativeKind,
    nameRange: rangeForNode(candidate.nameNode),
    ...(candidate.containerName !== undefined
      ? { containerName: candidate.containerName }
      : {}),
    ...(candidate.directiveText !== undefined
      ? { directiveText: candidate.directiveText }
      : {}),
  };
}

function uniqueDefinitions(
  candidates: readonly DefinitionCandidate[],
): DefinitionCandidate[] {
  const byNameRange = new Map<string, DefinitionCandidate>();
  for (const candidate of candidates) {
    const range = rangeForNode(candidate.nameNode);
    const key = `${sourceRangeKey(range)}:${candidate.name}`;
    const previous = byNameRange.get(key);
    if (
      previous === undefined ||
      (candidate.kind === "method" && previous.kind !== "method")
    ) {
      byNameRange.set(key, candidate);
    }
  }
  return [...byNameRange.values()].sort((left, right) => {
    const leftRange = rangeForNode(left.nameNode);
    const rightRange = rangeForNode(right.nameNode);
    return (
      leftRange.startLine - rightRange.startLine ||
      leftRange.startColumn - rightRange.startColumn ||
      left.name.localeCompare(right.name)
    );
  });
}

function errorRanges(
  root: import("web-tree-sitter").Node,
): SourceAnalysisRangeV2[] {
  const ranges: SourceAnalysisRangeV2[] = [];
  const pending = [root];
  while (pending.length > 0 && ranges.length < MAX_DIAGNOSTICS) {
    const node = pending.pop();
    if (node === undefined) break;
    if (node.type === "ERROR" || node.isMissing) {
      ranges.push(rangeForNode(node));
      continue;
    }
    for (let index = node.childCount - 1; index >= 0; index -= 1) {
      const child = node.child(index);
      if (child !== null && (child.hasError || child.isMissing))
        pending.push(child);
    }
  }
  return ranges;
}

function dynamicDeclarationOmissions(
  language: TreeSitterLanguage,
  root: import("web-tree-sitter").Node,
): {
  readonly node: import("web-tree-sitter").Node;
  readonly code: string;
  readonly message: string;
  readonly reason: string;
}[] {
  if (language === "rust") {
    return root.descendantsOfType("macro_invocation").map((node) => ({
      node,
      code: "TREESITTER_MACRO_EXPANSION_UNAVAILABLE",
      message:
        "Rust macro invocations are not expanded and may introduce declarations.",
      reason: "unexpanded-macro-may-declare-symbols",
    }));
  }
  if (language === "python") {
    const omissions = root
      .descendantsOfType("decorated_definition")
      .map((node) => ({
        node,
        code: "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE",
        message:
          "Python decorators are not evaluated and may alter or synthesize declarations.",
        reason: "decorator-may-alter-or-create-declarations",
      }));
    omissions.push(
      ...root.descendantsOfType("class_definition").flatMap((node) => {
        const superclasses = node.childForFieldName("superclasses");
        const usesMetaclass = superclasses
          ?.descendantsOfType("keyword_argument")
          .some(
            (argument) =>
              argument.childForFieldName("name")?.text === "metaclass",
          );
        return usesMetaclass
          ? [
              {
                node,
                code: "TREESITTER_METACLASS_EXPANSION_UNAVAILABLE",
                message:
                  "Python metaclasses are not evaluated and may synthesize declarations.",
                reason: "metaclass-may-create-declarations",
              },
            ]
          : [];
      }),
    );
    omissions.push(
      ...root.descendantsOfType("call").flatMap((node) => {
        const functionNode = node.childForFieldName("function");
        return functionNode?.type === "identifier" &&
          functionNode.text === "exec"
          ? [
              {
                node,
                code: "TREESITTER_DYNAMIC_DECLARATIONS_UNAVAILABLE",
                message:
                  "Python exec() may create declarations that are absent from the syntax tree.",
                reason: "dynamic-exec-may-create-declarations",
              },
            ]
          : [];
      }),
    );
    return omissions;
  }
  return [];
}

function analyzeInput(
  language: TreeSitterLanguage,
  content: string,
  root: import("web-tree-sitter").Node,
  query: Query,
): AnalysisWorkerSuccess {
  const matches = query.matches(root, { matchLimit: QUERY_MATCH_LIMIT });
  const exceededQueryLimit = query.didExceedMatchLimit();
  const rawCandidates: DefinitionCandidate[] = [];
  for (const match of matches) {
    const candidate = candidateForMatch(language, content, match.captures);
    if (candidate !== undefined) rawCandidates.push(candidate);
  }
  const candidates = uniqueDefinitions(rawCandidates);
  const limitedCandidates = candidates.slice(0, MAX_SYMBOLS);
  const diagnostics: SourceAnalysisDiagnosticV2[] = [];
  const uncoveredRanges: SourceAnalysisUncoveredRangeV2[] = [];

  if (root.hasError) {
    const ranges = errorRanges(root);
    diagnostics.push({
      code: "TREESITTER_SYNTAX_ERROR",
      message:
        "Tree-sitter found incomplete or invalid syntax; declarations around the error may be missing.",
      ...(ranges[0] !== undefined ? { range: ranges[0] } : {}),
    });
    for (const range of ranges) {
      uncoveredRanges.push({
        ...range,
        reason: "syntax-error-may-hide-declarations",
      });
    }
    if (ranges.length === 0) {
      uncoveredRanges.push({
        ...fullSourceRange(content),
        reason: "syntax-error-range-unavailable",
      });
    }
  }

  if (exceededQueryLimit || candidates.length > MAX_SYMBOLS) {
    diagnostics.push({
      code: "TREESITTER_SYMBOL_LIMIT",
      message: `Symbol output was capped at ${MAX_SYMBOLS} declarations.`,
      range: fullSourceRange(content),
    });
    uncoveredRanges.push({
      ...fullSourceRange(content),
      reason: "symbol-limit-may-hide-declarations",
    });
  }

  for (const omission of dynamicDeclarationOmissions(language, root).slice(
    0,
    MAX_DIAGNOSTICS,
  )) {
    const range = rangeForNode(omission.node);
    diagnostics.push({
      code: omission.code,
      message: omission.message,
      range,
    });
    uncoveredRanges.push({ ...range, reason: omission.reason });
    if (diagnostics.length >= MAX_DIAGNOSTICS) break;
  }

  if (diagnostics.length > 0 && uncoveredRanges.length === 0) {
    uncoveredRanges.push({
      ...fullSourceRange(content),
      reason: "analysis-incomplete",
    });
  }

  return {
    ok: true,
    status: diagnostics.length === 0 ? "ok" : "partial",
    symbols: limitedCandidates.map(buildSymbol),
    diagnostics: diagnostics.slice(0, MAX_DIAGNOSTICS),
    uncoveredRanges: uncoveredRanges.slice(0, MAX_DIAGNOSTICS),
  };
}

async function run(): Promise<AnalysisWorkerResult> {
  const input = workerData as AnalysisWorkerInput;
  try {
    await Parser.init();
    const grammarPath = fileURLToPath(
      new URL(`../assets/tree-sitter-${input.language}.wasm`, import.meta.url),
    );
    const queryPath = new URL(
      `../assets/queries/${input.language}.scm`,
      import.meta.url,
    );
    const [language, upstreamQuery] = await Promise.all([
      Language.load(grammarPath),
      readFile(queryPath, "utf8"),
    ]);
    const queryExtension =
      input.language === "rust"
        ? await readFile(
            new URL("../assets/queries/rust-extra.scm", import.meta.url),
            "utf8",
          )
        : "";
    const parser = new Parser();
    parser.setLanguage(language);
    const query = new Query(language, `${upstreamQuery}\n${queryExtension}`);
    const tree = parser.parse(input.content);
    if (tree === null) {
      return {
        ok: false,
        code: "TREESITTER_PARSE_FAILED",
        message: "The Tree-sitter runtime returned no syntax tree.",
      };
    }
    try {
      return analyzeInput(input.language, input.content, tree.rootNode, query);
    } finally {
      tree.delete();
      query.delete();
      parser.delete();
    }
  } catch (error) {
    return {
      ok: false,
      code: "TREESITTER_RUNTIME_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Unknown parser runtime error.",
    };
  }
}

if (parentPort === null) {
  throw new Error("Tree-sitter worker requires a parent port.");
}

void run().then((result) => parentPort?.postMessage(result));
