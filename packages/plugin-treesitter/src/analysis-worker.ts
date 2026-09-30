import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { parentPort } from "node:worker_threads";
import type {
  SourceAnalysisDiagnosticV2,
  SourceAnalysisRangeV2,
  SourceAnalysisUncoveredRangeV2,
  SourceSymbolAnalysisV2,
  SourceSymbolKind,
} from "kibi-plugin-sdk";
import { Language, Parser, Query } from "web-tree-sitter";
import type { Node } from "web-tree-sitter";
import type { TreeSitterLanguage } from "./catalog.js";

const MAX_SYMBOLS = 10_000;
const QUERY_MATCH_LIMIT = 16_384;
const MAX_DIAGNOSTICS = 64;

interface AnalysisWorkerInput {
  readonly id: number;
  readonly language: TreeSitterLanguage;
  readonly content: string;
  readonly performanceTimingEnabled?: boolean;
}

interface AnalysisWorkerTimings {
  readonly parserInitializationWallMs: number;
  readonly parseWallMs: number;
  readonly analysisWallMs: number;
  readonly totalAnalysisWallMs: number;
}

interface AnalysisWorkerSuccess {
  readonly ok: true;
  readonly status: "ok" | "partial";
  readonly symbols: readonly SourceSymbolAnalysisV2[];
  readonly diagnostics: readonly SourceAnalysisDiagnosticV2[];
  readonly uncoveredRanges: readonly SourceAnalysisUncoveredRangeV2[];
  readonly performanceTimings?: AnalysisWorkerTimings;
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
  readonly definitionNode: Node;
  readonly nameNode: Node;
  readonly nameRange?: SourceAnalysisRangeV2;
  readonly baseQualifiedName: string;
  readonly qualifiedName: string;
  readonly signature?: string;
  readonly directiveText?: string;
  readonly containerName?: string;
  readonly isDefinition: boolean;
}

interface Omission {
  readonly node: Node;
  readonly code: string;
  readonly message: string;
  readonly reason: string;
}

interface CandidateContext {
  readonly javaPackageSegments: readonly string[];
  readonly csharpFileScopedNamespaceSegments: readonly string[];
  readonly cppClassNames: ReadonlySet<string>;
}

const CONTAINER_NODE_TYPES: Readonly<
  Partial<Record<TreeSitterLanguage, ReadonlySet<string>>>
> = {
  java: new Set([
    "class_declaration",
    "interface_declaration",
    "enum_declaration",
    "record_declaration",
  ]),
  csharp: new Set([
    "namespace_declaration",
    "file_scoped_namespace_declaration",
    "class_declaration",
    "struct_declaration",
    "interface_declaration",
    "record_declaration",
    "enum_declaration",
  ]),
  php: new Set([
    "namespace_definition",
    "class_declaration",
    "interface_declaration",
    "trait_declaration",
    "enum_declaration",
  ]),
  cpp: new Set([
    "namespace_definition",
    "class_specifier",
    "struct_specifier",
    "union_specifier",
    "enum_specifier",
  ]),
  ruby: new Set(["module", "class"]),
  c: new Set(),
  bash: new Set(),
  terraform: new Set(),
  hcl: new Set(),
};

const SIGNATURE_IDENTITY_LANGUAGES: ReadonlySet<TreeSitterLanguage> = new Set([
  "java",
  "csharp",
  "cpp",
]);

function namedChildren(node: Node): Node[] {
  const children: Node[] = [];
  for (let index = 0; index < node.namedChildCount; index += 1) {
    const child = node.namedChild(index);
    if (child !== null) children.push(child);
  }
  return children;
}

function directChildOfType(node: Node, type: string): Node | undefined {
  for (let index = 0; index < node.childCount; index += 1) {
    const child = node.child(index);
    if (child?.type === type) return child;
  }
  return undefined;
}

function allDescendants(root: Node): Node[] {
  const result: Node[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    result.push(current);
    for (let index = current.childCount - 1; index >= 0; index -= 1) {
      const child = current.child(index);
      if (child !== null) pending.push(child);
    }
  }
  return result;
}

function rangeForNode(node: Node): SourceAnalysisRangeV2 {
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

function rangeKey(range: SourceAnalysisRangeV2): string {
  return `${range.startLine}:${range.startColumn}-${range.endLine}:${range.endColumn}`;
}

function ancestorsOf(node: Node): Node[] {
  const ancestors: Node[] = [];
  let current = node.parent;
  while (current !== null) {
    ancestors.unshift(current);
    current = current.parent;
  }
  return ancestors;
}

function splitQualified(value: string): string[] {
  return value
    .replace(/^global::/, "")
    .split(/\.|\\|::/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function nodeName(node: Node): string | undefined {
  const named = node.childForFieldName("name");
  if (named !== null) return named.text;
  const identifier = node.childForFieldName("identifier");
  if (identifier !== null) return identifier.text;
  return undefined;
}

function candidateContext(
  language: TreeSitterLanguage,
  root: Node,
): CandidateContext {
  const descendants =
    language === "java" || language === "csharp" || language === "cpp"
      ? allDescendants(root)
      : [];
  const javaPackage =
    language === "java"
      ? descendants.find((node) => node.type === "package_declaration")
      : undefined;
  const packageName =
    javaPackage === undefined ? undefined : namedChildren(javaPackage)[0]?.text;
  const csharpFileScopedNamespace =
    language === "csharp"
      ? descendants.find(
          (node) => node.type === "file_scoped_namespace_declaration",
        )
      : undefined;
  const cppClassNames = new Set<string>();
  if (language === "cpp") {
    for (const node of descendants) {
      if (
        ["class_specifier", "struct_specifier", "union_specifier"].includes(
          node.type,
        )
      ) {
        const name = node.childForFieldName("name")?.text;
        if (name !== undefined) cppClassNames.add(name);
      }
    }
  }
  return {
    javaPackageSegments:
      packageName === undefined ? [] : splitQualified(packageName),
    csharpFileScopedNamespaceSegments:
      csharpFileScopedNamespace === undefined
        ? []
        : splitQualified(nodeName(csharpFileScopedNamespace) ?? ""),
    cppClassNames,
  };
}

function phpFileNamespace(root: Node, target: Node): string[] {
  if (
    ancestorsOf(target).some(
      (ancestor) => ancestor.type === "namespace_definition",
    )
  ) {
    return [];
  }
  let active: string[] = [];
  for (const child of namedChildren(root)) {
    if (child.startIndex > target.startIndex) break;
    if (child.type === "namespace_definition") {
      const name = nodeName(child);
      active = name === undefined ? [] : splitQualified(name);
    }
  }
  return active;
}

function rustContainer(node: Node): string | undefined {
  const ancestors = ancestorsOf(node);
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index];
    if (ancestor?.type === "trait_item") return nodeName(ancestor);
    if (ancestor?.type === "impl_item") {
      const typeName = ancestor.childForFieldName("type")?.text;
      const traitName = ancestor.childForFieldName("trait")?.text;
      if (typeName === undefined) return traitName;
      if (traitName === undefined) return typeName;
      return `${traitName} for ${typeName}`;
    }
    if (ancestor?.type === "mod_item") return nodeName(ancestor);
  }
  return undefined;
}

function cppOutOfLineSegments(node: Node): string[] {
  const declarator = node.childForFieldName("declarator");
  if (declarator === null || declarator.type !== "qualified_identifier")
    return [];
  const visit = (current: Node): string[] => {
    if (current.type !== "qualified_identifier") return [current.text];
    const scope = current.childForFieldName("scope");
    const name = current.childForFieldName("name");
    return [
      ...(scope === null ? [] : visit(scope)),
      ...(name === null ? [] : visit(name)),
    ];
  };
  const parts = visit(declarator);
  return parts.length > 1 ? parts.slice(0, -1) : [];
}

function scopeSegments(
  language: TreeSitterLanguage,
  root: Node,
  definitionNode: Node,
  context: CandidateContext,
): string[] {
  const ancestors = ancestorsOf(definitionNode);
  const scopes: string[] = [];
  if (language === "python") {
    for (const ancestor of ancestors) {
      if (["class_definition", "function_definition"].includes(ancestor.type)) {
        const name = nodeName(ancestor);
        if (name !== undefined) scopes.push(name);
      }
    }
  } else if (language === "rust") {
    for (const ancestor of ancestors) {
      if (ancestor.type === "mod_item") {
        const name = nodeName(ancestor);
        if (name !== undefined) scopes.push(name);
      }
    }
    const container = rustContainer(definitionNode);
    if (container !== undefined && !scopes.includes(container))
      scopes.push(container);
  } else if (language === "go") {
    const receiver = definitionNode.childForFieldName("receiver");
    const receiverType =
      receiver?.descendantsOfType("type_identifier")[0]?.text;
    if (receiverType !== undefined) scopes.push(receiverType);
  } else {
    for (const ancestor of ancestors) {
      if (!CONTAINER_NODE_TYPES[language]?.has(ancestor.type)) continue;
      const name = nodeName(ancestor);
      if (name !== undefined) scopes.push(...splitQualified(name));
    }
    if (language === "java") scopes.unshift(...context.javaPackageSegments);
    if (language === "csharp")
      scopes.unshift(...context.csharpFileScopedNamespaceSegments);
    if (language === "php")
      scopes.unshift(...phpFileNamespace(root, definitionNode));
    if (language === "cpp") {
      const outOfLine = cppOutOfLineSegments(definitionNode);
      if (outOfLine.length > 0) {
        const current = scopes.join(".");
        const prefix = outOfLine.join(".");
        if (current.length === 0) scopes.push(...outOfLine);
        else if (prefix !== current && !prefix.startsWith(`${current}.`)) {
          scopes.push(...outOfLine);
        } else if (prefix.startsWith(`${current}.`)) {
          scopes.push(...outOfLine.slice(scopes.length));
        }
      }
    }
  }
  return scopes;
}

function normalizeTypeText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*([*&:,<>\[\]])\s*/g, "$1");
}

function typeDeclaratorSuffix(node: Node): string | undefined {
  if (
    ["function_declarator", "abstract_function_declarator"].includes(node.type)
  ) {
    return undefined;
  }
  const child = node.childForFieldName("declarator");
  const suffix = child === null ? "" : typeDeclaratorSuffix(child);
  if (suffix === undefined) return undefined;
  if (
    ["pointer_declarator", "abstract_pointer_declarator"].includes(node.type)
  ) {
    const qualifiers = namedChildren(node)
      .filter((item) => item.type === "type_qualifier")
      .map((item) => item.text)
      .join(" ");
    return `*${qualifiers}${qualifiers.length > 0 && suffix.length > 0 ? " " : ""}${suffix}`;
  }
  if (node.type === "reference_declarator") return `&${suffix}`;
  if (node.type === "rvalue_reference_declarator") return `&&${suffix}`;
  if (["array_declarator", "abstract_array_declarator"].includes(node.type)) {
    return `[]${suffix}`;
  }
  if (child !== null) return suffix;
  return "";
}

function signatureFor(
  language: TreeSitterLanguage,
  definitionNode: Node,
): string | undefined {
  const parameters = definitionNode.childForFieldName("parameters");
  if (parameters === null) return undefined;
  const parameterTypes: string[] = [];
  for (const parameter of namedChildren(parameters)) {
    if (
      [
        "comment",
        "attribute_list",
        "marker_annotation",
        "modifiers",
        "parameter_list",
      ].includes(parameter.type)
    ) {
      continue;
    }
    if (parameter.type === "variadic_parameter") {
      parameterTypes.push("...");
      continue;
    }
    const typeNode = parameter.childForFieldName("type");
    if (typeNode !== null) {
      const declarator = parameter.childForFieldName("declarator");
      const suffix =
        declarator === null ? "" : typeDeclaratorSuffix(declarator);
      if (suffix === undefined) return undefined;
      const qualifiers = namedChildren(parameter)
        .filter((item) => item.type === "type_qualifier")
        .map((item) => item.text);
      const qualifierPrefix =
        qualifiers.length > 0 ? `${qualifiers.join(" ")} ` : "";
      parameterTypes.push(
        `${qualifierPrefix}${normalizeTypeText(typeNode.text)}${suffix}`,
      );
      continue;
    }
    if (language === "php") {
      parameterTypes.push("?");
      continue;
    }
    if (language === "bash") return undefined;
    if (parameter.type === "formal_parameter" && language === "java") {
      const first = namedChildren(parameter)[0];
      if (first !== undefined)
        parameterTypes.push(normalizeTypeText(first.text));
      else return undefined;
      continue;
    }
    return undefined;
  }
  let signature = `(${parameterTypes.join(",")})`;
  if (language === "cpp") {
    const qualifiers = namedChildren(definitionNode);
    const cvQualifiers = qualifiers
      .filter((node) => node.type === "type_qualifier")
      .map((node) => node.text)
      .join(" ");
    const referenceQualifier = qualifiers.find(
      (node) => node.type === "ref_qualifier",
    )?.text;
    if (cvQualifiers.length > 0) signature += ` ${cvQualifiers}`;
    if (referenceQualifier !== undefined) {
      signature += `${cvQualifiers.length > 0 ? "" : " "}${referenceQualifier}`;
    }
  }
  return signature;
}

function classifyDefinition(
  language: TreeSitterLanguage,
  captureName: string,
  node: Node,
  scopes: readonly string[],
  context: CandidateContext,
): SourceSymbolKind | undefined {
  if (captureName === "definition.module") return undefined;
  if (
    captureName === "definition.property" ||
    captureName === "definition.field"
  )
    return "property";
  if (captureName === "definition.constant") return "variable";
  if (captureName === "definition.interface") return "interface";
  if (captureName === "definition.type") {
    if (["enum_declaration", "enum_specifier", "enum_item"].includes(node.type))
      return "enum";
    if (language === "go" && node.type === "type_spec") {
      const declaredType = node.childForFieldName("type")?.type;
      if (declaredType === "interface_type") return "interface";
      if (declaredType === "struct_type") return "class";
    }
    if (language === "rust" && node.type === "union_item") return "type";
    return "type";
  }
  if (captureName === "definition.class") {
    if (language === "rust") {
      if (node.type === "enum_item") return "enum";
      if (["type_item", "union_item"].includes(node.type)) return "type";
      return "class";
    }
    if (language === "go" && node.type === "type_spec") {
      const declaredType = node.childForFieldName("type")?.type;
      if (declaredType === "interface_type") return "interface";
      if (declaredType === "struct_type") return "class";
      return "type";
    }
    if (["enum_declaration", "enum_specifier"].includes(node.type))
      return "enum";
    return "class";
  }
  if (
    captureName === "definition.function" ||
    captureName === "definition.method"
  ) {
    if (language === "php" && node.type === "method_declaration")
      return "method";
    if (language === "ruby") return scopes.length > 0 ? "method" : "function";
    if (language === "cpp") {
      const inClass = ancestorsOf(node).some((ancestor) =>
        ["class_specifier", "struct_specifier", "union_specifier"].includes(
          ancestor.type,
        ),
      );
      const outOfLineTargets = cppOutOfLineSegments(node);
      if (
        inClass ||
        outOfLineTargets.some((segment) => context.cppClassNames.has(segment))
      )
        return "method";
      return "function";
    }
    if (language === "csharp" && node.type === "constructor_declaration")
      return "method";
    if (language === "java" && node.type === "constructor_declaration")
      return "method";
    if (
      language === "rust" &&
      ancestorsOf(node).some((ancestor) =>
        ["impl_item", "trait_item"].includes(ancestor.type),
      )
    ) {
      return "method";
    }
    if (captureName === "definition.method") return "method";
    return "function";
  }
  return undefined;
}

function leadingDirective(
  content: string,
  startLine: number,
  language: TreeSitterLanguage,
): string | undefined {
  const marker = ["python", "bash", "ruby", "terraform", "hcl"].includes(
    language,
  )
    ? "#"
    : "//";
  const lines = content.split(/\r\n|\n|\r/);
  const directives: string[] = [];
  for (let index = startLine - 2; index >= 0; index -= 1) {
    const line = lines[index]?.trim();
    if (line === undefined || line.length === 0 || !line.startsWith(marker))
      break;
    if (/\bimplements\s+REQ-[A-Za-z0-9-]+\b/.test(line))
      directives.unshift(line);
  }
  return directives.length > 0 ? directives.join("\n") : undefined;
}

function candidateFromMatch(
  language: TreeSitterLanguage,
  content: string,
  root: Node,
  context: CandidateContext,
  captures: readonly { readonly name: string; readonly node: Node }[],
): DefinitionCandidate | undefined {
  const definition = captures.find((capture) =>
    capture.name.startsWith("definition."),
  );
  const nameCapture = captures.find((capture) => capture.name === "name");
  if (definition === undefined || nameCapture === undefined) return undefined;
  const queryNode = definition.node;
  const definitionNode = sourceDefinitionNode(language, queryNode);
  const nameNode = nameCapture.node;
  const scopes = scopeSegments(language, root, queryNode, context);
  const kind = classifyDefinition(
    language,
    definition.name,
    queryNode,
    scopes,
    context,
  );
  const isCsharpDestructor =
    language === "csharp" && queryNode.type === "destructor_declaration";
  const name = isCsharpDestructor ? `~${nameNode.text}` : nameNode.text;
  if (kind === undefined || name.length === 0) return undefined;

  const nestedTag = allDescendants(queryNode).find((node) =>
    ["struct_specifier", "union_specifier", "enum_specifier"].includes(
      node.type,
    ),
  );
  let typePrefix = "";
  if (["c", "cpp"].includes(language)) {
    if (queryNode.type === "type_definition") {
      typePrefix = "typedef.";
    } else if (nestedTag !== undefined) {
      typePrefix = `${nestedTag.type.replace("_specifier", "")}.`;
    }
  }
  const baseQualifiedName = `${typePrefix}${[...scopes, name].join(".")}`;
  const signature =
    kind === "function" || kind === "method"
      ? signatureFor(language, queryNode)
      : undefined;
  const directiveText = leadingDirective(
    content,
    rangeForNode(definitionNode).startLine,
    language,
  );
  const containerName = scopes.at(-1);
  const destructorMarker = isCsharpDestructor
    ? directChildOfType(queryNode, "~")
    : undefined;
  const nameRange = isCsharpDestructor
    ? {
        startLine:
          (destructorMarker?.startPosition ?? queryNode.startPosition).row + 1,
        startColumn: (
          destructorMarker?.startPosition ?? queryNode.startPosition
        ).column,
        endLine: nameNode.endPosition.row + 1,
        endColumn: nameNode.endPosition.column,
      }
    : undefined;
  return {
    name,
    kind,
    nativeKind: queryNode.type,
    definitionNode,
    nameNode,
    ...(nameRange === undefined ? {} : { nameRange }),
    baseQualifiedName,
    qualifiedName: baseQualifiedName,
    ...(signature === undefined ? {} : { signature }),
    ...(containerName === undefined ? {} : { containerName }),
    ...(directiveText === undefined ? {} : { directiveText }),
    isDefinition:
      queryNode.type === "function_definition" ||
      ancestorsOf(queryNode).some(
        (ancestor) => ancestor.type === "function_definition",
      ),
  };
}

function sourceDefinitionNode(
  language: TreeSitterLanguage,
  queryNode: Node,
): Node {
  if (
    !["c", "cpp"].includes(language) ||
    queryNode.type !== "function_declarator"
  ) {
    return queryNode;
  }
  const ancestors = ancestorsOf(queryNode);
  const functionDefinition = [...ancestors]
    .reverse()
    .find((node) => node.type === "function_definition");
  if (functionDefinition !== undefined) return functionDefinition;
  const declaration = [...ancestors]
    .reverse()
    .find((node) => ["declaration", "field_declaration"].includes(node.type));
  return declaration ?? queryNode;
}

function uniqueByNameRange(
  candidates: readonly DefinitionCandidate[],
): DefinitionCandidate[] {
  const byRange = new Map<string, DefinitionCandidate>();
  for (const candidate of candidates) {
    const key = `${rangeKey(rangeForNode(candidate.nameNode))}:${candidate.name}`;
    const previous = byRange.get(key);
    if (
      previous === undefined ||
      (candidate.kind === "method" && previous.kind !== "method") ||
      (candidate.definitionNode.hasError === false &&
        previous.definitionNode.hasError)
    ) {
      byRange.set(key, candidate);
    }
  }
  return [...byRange.values()].sort(
    (left, right) => left.nameNode.startIndex - right.nameNode.startIndex,
  );
}

function staticHclLabel(node: Node): string | undefined {
  if (node.type !== "string_lit") return undefined;
  const value = node.text;
  if (value.length < 2 || value[0] !== '"' || value.at(-1) !== '"')
    return undefined;
  const inner = value.slice(1, -1);
  // Escapes and template directives can change label identity. This analyzer
  // keeps only unambiguous literal labels and reports the rest as uncovered.
  if (inner.includes("\\") || inner.includes("${") || inner.includes("%{"))
    return undefined;
  return inner;
}

function blockParts(block: Node): {
  readonly typeNode: Node | undefined;
  readonly typeName: string | undefined;
  readonly labels: readonly {
    readonly node: Node;
    readonly value: string | undefined;
  }[];
  readonly body: Node | undefined;
} {
  const children = namedChildren(block);
  const startIndex = children.findIndex(
    (child) => child.type === "block_start",
  );
  const header = startIndex < 0 ? children : children.slice(0, startIndex);
  const typeNode = header.find((child) => child.type === "identifier");
  const labels = header
    .filter((child) => child.type === "string_lit")
    .map((node) => ({ node, value: staticHclLabel(node) }));
  const body = children.find((child) => child.type === "body");
  return {
    typeNode,
    typeName: typeNode?.text,
    labels,
    body,
  };
}

function terraformCandidate(
  block: Node,
  typeName: string,
  labels: readonly {
    readonly node: Node;
    readonly value: string | undefined;
  }[],
): DefinitionCandidate | undefined {
  const staticLabels = labels.map((label) => label.value);
  if (staticLabels.some((label) => label === undefined)) return undefined;
  const values = staticLabels as string[];
  const nameNode = labels.at(-1)?.node;
  const name = values.at(-1);
  if (nameNode === undefined || name === undefined) return undefined;
  const baseQualifiedName = `terraform:${typeName}[${values.map((label) => JSON.stringify(label)).join(",")}]`;
  return {
    name,
    kind: "unknown",
    nativeKind: `terraform:block:${typeName}`,
    definitionNode: block,
    nameNode,
    baseQualifiedName,
    qualifiedName: baseQualifiedName,
    isDefinition: false,
  };
}

function hclCandidate(block: Node): DefinitionCandidate | undefined {
  const parts = blockParts(block);
  if (parts.typeName === undefined || parts.labels.length === 0)
    return undefined;
  const values = parts.labels.map((label) => label.value);
  if (values.some((label) => label === undefined)) return undefined;
  const staticLabels = values as string[];
  const nameNode = parts.labels.at(-1)?.node;
  const name = staticLabels.at(-1);
  if (nameNode === undefined || name === undefined) return undefined;
  const baseQualifiedName = `hcl:${JSON.stringify([parts.typeName, ...staticLabels])}`;
  return {
    name,
    kind: "unknown",
    nativeKind: `hcl:block:${parts.typeName}`,
    definitionNode: block,
    nameNode,
    baseQualifiedName,
    qualifiedName: baseQualifiedName,
    isDefinition: false,
  };
}

function terraformLocalCandidate(
  attribute: Node,
): DefinitionCandidate | undefined {
  const nameNode = namedChildren(attribute).find(
    (child) => child.type === "identifier",
  );
  if (nameNode === undefined || nameNode.text.length === 0) return undefined;
  const baseQualifiedName = `terraform:local[${JSON.stringify(nameNode.text)}]`;
  return {
    name: nameNode.text,
    kind: "variable",
    nativeKind: "terraform:local_attribute",
    definitionNode: attribute,
    nameNode,
    baseQualifiedName,
    qualifiedName: baseQualifiedName,
    containerName: "locals",
    isDefinition: false,
  };
}

function topLevelBlocks(root: Node): Node[] {
  const top = namedChildren(root).find((node) => node.type === "body");
  return top === undefined
    ? []
    : namedChildren(top).filter((node) => node.type === "block");
}

function terraformCandidatesFromMatches(
  matches: readonly {
    readonly captures: readonly {
      readonly name: string;
      readonly node: Node;
    }[];
  }[],
): DefinitionCandidate[] {
  const candidates: DefinitionCandidate[] = [];
  const blockDefinitions = new Set([
    "definition.resource",
    "definition.data",
    "definition.module",
    "definition.variable",
    "definition.output",
  ]);
  for (const match of matches) {
    const definition = match.captures.find((capture) =>
      capture.name.startsWith("definition."),
    );
    if (definition === undefined) continue;
    if (definition.name === "definition.local") {
      const local = terraformLocalCandidate(definition.node);
      if (local !== undefined) candidates.push(local);
      continue;
    }
    if (!blockDefinitions.has(definition.name)) continue;
    const block = definition.node;
    const parts = blockParts(block);
    if (parts.typeName === undefined) continue;
    const candidate = terraformCandidate(block, parts.typeName, parts.labels);
    if (candidate !== undefined) candidates.push(candidate);
  }
  return candidates;
}

function collectHclCandidates(
  root: Node,
  language: "terraform" | "hcl",
  matches: readonly {
    readonly captures: readonly {
      readonly name: string;
      readonly node: Node;
    }[];
  }[],
  omissions: Omission[],
): DefinitionCandidate[] {
  const candidates =
    language === "terraform" ? terraformCandidatesFromMatches(matches) : [];
  const matchedBlocks = new Set(
    matches.flatMap((match) =>
      match.captures
        .filter((capture) =>
          language === "hcl"
            ? capture.name === "definition.block"
            : [
                "definition.resource",
                "definition.data",
                "definition.module",
                "definition.variable",
                "definition.output",
              ].includes(capture.name),
        )
        .map((capture) => capture.node.startIndex),
    ),
  );
  const matchedLocals = new Set(
    candidates
      .filter(
        (candidate) => candidate.nativeKind === "terraform:local_attribute",
      )
      .map((candidate) => candidate.nameNode.startIndex),
  );
  for (const block of topLevelBlocks(root)) {
    const parts = blockParts(block);
    if (parts.typeName === undefined) {
      omissions.push({
        node: block,
        code: "TREESITTER_HCL_BLOCK_TYPE_UNAVAILABLE",
        message: "A top-level configuration block has no static type label.",
        reason: "hcl-block-type-unavailable",
      });
      continue;
    }
    if (language === "hcl") {
      if (parts.labels.length === 0) {
        omissions.push({
          node: block,
          code: "TREESITTER_HCL_UNLABELED_BLOCK_OMITTED",
          message: "Unlabeled HCL blocks are not assigned a source identity.",
          reason: "unlabeled-hcl-block-omitted",
        });
      } else {
        const candidate = matchedBlocks.has(block.startIndex)
          ? hclCandidate(block)
          : undefined;
        if (candidate === undefined) {
          omissions.push({
            node: block,
            code: matchedBlocks.has(block.startIndex)
              ? "TREESITTER_HCL_DYNAMIC_LABEL_OMITTED"
              : "TREESITTER_HCL_QUERY_CAPTURE_MISSING",
            message: matchedBlocks.has(block.startIndex)
              ? "HCL labels must be static unescaped string literals to receive an identity."
              : "The structural HCL query did not capture a top-level block.",
            reason: matchedBlocks.has(block.startIndex)
              ? "hcl-dynamic-or-escaped-label-omitted"
              : "hcl-structural-query-capture-missing",
          });
        } else {
          candidates.push(candidate);
        }
      }
      const nestedBlocks = allDescendants(block).filter(
        (node) => node.type === "block" && node.startIndex !== block.startIndex,
      );
      for (const nested of nestedBlocks) {
        omissions.push({
          node: nested,
          code: "TREESITTER_HCL_NESTED_BLOCK_OMITTED",
          message:
            "Nested HCL blocks are not emitted as top-level source identities.",
          reason: "nested-hcl-block-omitted",
        });
      }
      continue;
    }

    const metadataBlocks = new Set(["provider", "terraform"]);
    if (metadataBlocks.has(parts.typeName)) continue;
    const nestedBlocks = allDescendants(block).filter(
      (node) => node.type === "block" && node.startIndex !== block.startIndex,
    );
    for (const nested of nestedBlocks) {
      omissions.push({
        node: nested,
        code: "TREESITTER_TERRAFORM_NESTED_BLOCK_OMITTED",
        message:
          "Nested Terraform blocks are not emitted as source identities.",
        reason: "nested-terraform-block-omitted",
      });
    }
    if (parts.typeName === "locals") {
      const body = parts.body;
      for (const attribute of body === undefined ? [] : namedChildren(body)) {
        if (attribute.type !== "attribute") continue;
        if (attribute.hasError) {
          omissions.push({
            node: attribute,
            code: "TREESITTER_TERRAFORM_LOCAL_PARSE_ERROR",
            message: "A local value declaration contains incomplete syntax.",
            reason: "terraform-local-parse-error",
          });
          continue;
        }
        const nameNode = namedChildren(attribute).find(
          (child) => child.type === "identifier",
        );
        if (nameNode !== undefined && !matchedLocals.has(nameNode.startIndex)) {
          omissions.push({
            node: attribute,
            code: "TREESITTER_TERRAFORM_LOCAL_QUERY_CAPTURE_MISSING",
            message:
              "The Terraform locals query did not capture a supported local attribute.",
            reason: "terraform-local-query-capture-missing",
          });
        }
      }
      continue;
    }
    const knownBlocks = new Set([
      "resource",
      "data",
      "module",
      "variable",
      "output",
      "provider",
      "terraform",
      "locals",
    ]);
    if (!knownBlocks.has(parts.typeName)) {
      omissions.push({
        node: block,
        code: "TREESITTER_TERRAFORM_BLOCK_UNCLASSIFIED",
        message: `Terraform block '${parts.typeName}' is outside the structural catalog.`,
        reason: "unclassified-terraform-block-omitted",
      });
      continue;
    }
    const expectedLabels = ["resource", "data"].includes(parts.typeName)
      ? 2
      : 1;
    if (parts.labels.length !== expectedLabels) {
      omissions.push({
        node: block,
        code: "TREESITTER_TERRAFORM_LABEL_COUNT_UNSUPPORTED",
        message: `Terraform '${parts.typeName}' blocks require ${expectedLabels} static label${expectedLabels === 1 ? "" : "s"} for structural identity.`,
        reason: "terraform-label-count-unsupported",
      });
      continue;
    }
    if (parts.labels.some((label) => label.value === undefined)) {
      omissions.push({
        node: block,
        code: "TREESITTER_TERRAFORM_DYNAMIC_LABEL_OMITTED",
        message:
          "Terraform labels must be static unescaped string literals to receive an identity.",
        reason: "terraform-dynamic-or-escaped-label-omitted",
      });
      continue;
    }
    if (!matchedBlocks.has(block.startIndex)) {
      omissions.push({
        node: block,
        code: "TREESITTER_TERRAFORM_QUERY_CAPTURE_MISSING",
        message:
          "The Terraform structural query did not capture a supported block.",
        reason: "terraform-structural-query-capture-missing",
      });
    }
  }
  return candidates;
}

function errorRanges(root: Node): Node[] {
  const result: Node[] = [];
  const pending = [root];
  while (pending.length > 0 && result.length < MAX_DIAGNOSTICS) {
    const node = pending.pop();
    if (node === undefined) break;
    if (node.type === "ERROR" || node.isMissing) {
      result.push(node);
      continue;
    }
    for (let index = node.childCount - 1; index >= 0; index -= 1) {
      const child = node.child(index);
      if (child !== null && (child.hasError || child.isMissing))
        pending.push(child);
    }
  }
  return result;
}

function dynamicOmissions(
  language: TreeSitterLanguage,
  root: Node,
): Omission[] {
  const nodes = allDescendants(root);
  const omissions: Omission[] = [];
  const add = (
    node: Node,
    code: string,
    message: string,
    reason: string,
  ): void => {
    omissions.push({ node, code, message, reason });
  };
  if (language === "rust") {
    for (const node of nodes.filter(
      (item) => item.type === "macro_invocation",
    )) {
      add(
        node,
        "TREESITTER_MACRO_EXPANSION_UNAVAILABLE",
        "Rust macro invocations are not expanded and may introduce declarations.",
        "unexpanded-macro-may-declare-symbols",
      );
    }
  } else if (language === "python") {
    for (const node of nodes.filter(
      (item) => item.type === "decorated_definition",
    )) {
      add(
        node,
        "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE",
        "Python decorators are not evaluated and may alter or synthesize declarations.",
        "decorator-may-alter-or-create-declarations",
      );
    }
    for (const node of nodes.filter(
      (item) => item.type === "class_definition",
    )) {
      const superclasses = node.childForFieldName("superclasses");
      const usesMetaclass = superclasses
        ?.descendantsOfType("keyword_argument")
        .some(
          (argument) =>
            argument.childForFieldName("name")?.text === "metaclass",
        );
      if (usesMetaclass) {
        add(
          node,
          "TREESITTER_METACLASS_EXPANSION_UNAVAILABLE",
          "Python metaclasses are not evaluated and may synthesize declarations.",
          "metaclass-may-create-declarations",
        );
      }
    }
    for (const node of nodes.filter((item) => item.type === "call")) {
      if (node.childForFieldName("function")?.text === "exec") {
        add(
          node,
          "TREESITTER_DYNAMIC_DECLARATIONS_UNAVAILABLE",
          "Python exec() may create declarations absent from the syntax tree.",
          "dynamic-exec-may-create-declarations",
        );
      }
    }
  } else if (["c", "cpp"].includes(language)) {
    const preprocessor = nodes.filter((node) =>
      node.type.startsWith("preproc_"),
    );
    const macros = new Set(
      preprocessor
        .filter((node) =>
          ["preproc_def", "preproc_function_def"].includes(node.type),
        )
        .map((node) => nodeName(node))
        .filter((name): name is string => name !== undefined),
    );
    for (const node of preprocessor) {
      if (node.type === "preproc_include") {
        add(
          node,
          "TREESITTER_PREPROCESSOR_INCLUDE_UNAVAILABLE",
          "Included declarations are not loaded into this file-level analysis.",
          "preprocessor-include-not-expanded",
        );
      } else if (
        [
          "preproc_if",
          "preproc_ifdef",
          "preproc_else",
          "preproc_elif",
        ].includes(node.type)
      ) {
        add(
          node,
          "TREESITTER_PREPROCESSOR_CONDITION_UNRESOLVED",
          "Conditional compilation is not evaluated; branch declarations may be mutually exclusive.",
          "conditional-compilation-unresolved",
        );
      }
    }
    if (macros.size > 0) {
      for (const call of nodes.filter(
        (node) => node.type === "call_expression",
      )) {
        const functionNode = call.childForFieldName("function");
        if (functionNode !== null && macros.has(functionNode.text)) {
          add(
            call,
            "TREESITTER_MACRO_EXPANSION_UNAVAILABLE",
            "The invoked C/C++ macro is not expanded and may introduce declarations.",
            "macro-may-declare-symbols",
          );
        }
      }
    }
  } else if (language === "ruby") {
    const dynamicNames = new Set([
      "define_method",
      "define_singleton_method",
      "class_eval",
      "module_eval",
      "instance_eval",
      "eval",
      "alias_method",
      "attr",
      "attr_reader",
      "attr_writer",
      "attr_accessor",
    ]);
    for (const call of nodes.filter((node) => node.type === "call")) {
      const method = call.childForFieldName("method");
      if (method !== null && dynamicNames.has(method.text)) {
        add(
          call,
          "TREESITTER_RUBY_DYNAMIC_METHODS_UNAVAILABLE",
          `Ruby ${method.text} can create or alter methods that are not explicit definitions.`,
          `ruby-dynamic-${method.text}`,
        );
      }
    }
  } else if (language === "bash") {
    for (const node of nodes.filter((item) => item.type === "command")) {
      const commandName = node.childForFieldName("name")?.text;
      if (["eval", "source", "."].includes(commandName ?? "")) {
        add(
          node,
          "TREESITTER_BASH_DYNAMIC_DECLARATIONS_UNAVAILABLE",
          `Bash ${commandName} may define functions outside the current syntax tree.`,
          `bash-dynamic-${commandName}-may-declare-functions`,
        );
      }
    }
    for (const node of nodes.filter(
      (item) => item.type === "function_definition",
    )) {
      if (
        ancestorsOf(node).some((ancestor) =>
          [
            "if_statement",
            "while_statement",
            "for_statement",
            "case_statement",
          ].includes(ancestor.type),
        )
      ) {
        add(
          node,
          "TREESITTER_BASH_CONDITIONAL_FUNCTION_UNAVAILABLE",
          "A function declaration inside control flow may not execute in this shell run.",
          "conditional-bash-function-declaration",
        );
      }
    }
  } else if (language === "php") {
    for (const node of nodes) {
      if (
        [
          "include_expression",
          "include_once_expression",
          "require_expression",
          "require_once_expression",
        ].includes(node.type)
      ) {
        add(
          node,
          "TREESITTER_PHP_INCLUDED_DECLARATIONS_UNAVAILABLE",
          "Included PHP files are outside this file-level analysis.",
          "php-include-may-provide-declarations",
        );
      } else if (
        node.type === "function_call_expression" &&
        node.childForFieldName("function")?.text === "eval"
      ) {
        add(
          node,
          "TREESITTER_PHP_EVAL_UNAVAILABLE",
          "PHP eval() can create declarations that are absent from the syntax tree.",
          "php-eval-may-create-declarations",
        );
      }
    }
  }
  return omissions;
}

function collapseExactCDeclarations(
  language: TreeSitterLanguage,
  candidates: readonly DefinitionCandidate[],
): DefinitionCandidate[] {
  if (!["c", "cpp"].includes(language)) return [...candidates];
  const groups = new Map<string, DefinitionCandidate[]>();
  for (const candidate of candidates) {
    if (
      !["function", "method"].includes(candidate.kind) ||
      candidate.signature === undefined
    )
      continue;
    const key = `${candidate.kind}:${candidate.baseQualifiedName}:${candidate.signature}`;
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }
  const removed = new Set<DefinitionCandidate>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const definitions = group.filter((candidate) => candidate.isDefinition);
    if (definitions.length === 1) {
      for (const candidate of group) {
        if (candidate !== definitions[0]) removed.add(candidate);
      }
    }
  }
  return candidates.filter((candidate) => !removed.has(candidate));
}

function appendPartialCollisionLocators(
  language: TreeSitterLanguage,
  candidates: readonly DefinitionCandidate[],
  omissions: Omission[],
): DefinitionCandidate[] {
  const overloadGroups = new Map<string, DefinitionCandidate[]>();
  for (const candidate of candidates) {
    if (!["function", "method"].includes(candidate.kind)) continue;
    const key = `${candidate.kind}:${candidate.baseQualifiedName}`;
    const values = overloadGroups.get(key) ?? [];
    values.push(candidate);
    overloadGroups.set(key, values);
  }
  const overloadLocators = new Map<DefinitionCandidate, string>();
  for (const group of SIGNATURE_IDENTITY_LANGUAGES.has(language)
    ? overloadGroups.values()
    : []) {
    for (const candidate of group) {
      if (candidate.signature === undefined) continue;
      overloadLocators.set(
        candidate,
        `${candidate.baseQualifiedName}${candidate.signature}`,
      );
    }
  }
  let result = candidates.map((candidate) => ({
    ...candidate,
    qualifiedName:
      overloadLocators.get(candidate) ?? candidate.baseQualifiedName,
  }));
  const byLocator = new Map<string, DefinitionCandidate[]>();
  for (const candidate of result) {
    const values = byLocator.get(candidate.qualifiedName) ?? [];
    values.push(candidate);
    byLocator.set(candidate.qualifiedName, values);
  }
  const collisions = [...byLocator.entries()].filter(
    ([, values]) => values.length > 1,
  );
  for (const [locator, group] of collisions) {
    for (const candidate of group) {
      const range = rangeForNode(candidate.nameNode);
      const sourceLocalIdentity = `@${range.startLine}:${range.startColumn}`;
      result = result.map((item) =>
        item === candidate
          ? { ...item, qualifiedName: `${locator}${sourceLocalIdentity}` }
          : item,
      );
    }
    const first = group[0];
    if (first !== undefined) {
      omissions.push({
        node: first.definitionNode,
        code: "TREESITTER_LOCATOR_COLLISION",
        message: `Multiple syntactic declarations share '${locator}'. Source-local suffixes preserve distinct ranges but do not establish semantic identity.`,
        reason: "qualified-name-collision-source-local-disambiguation",
      });
    }
  }
  return result;
}

function buildSymbol(candidate: DefinitionCandidate): SourceSymbolAnalysisV2 {
  return {
    name: candidate.name,
    kind: candidate.kind,
    ...rangeForNode(candidate.definitionNode),
    qualifiedName: candidate.qualifiedName,
    nativeKind: candidate.nativeKind,
    nameRange: candidate.nameRange ?? rangeForNode(candidate.nameNode),
    ...(candidate.signature === undefined
      ? {}
      : { signature: candidate.signature }),
    ...(candidate.containerName === undefined
      ? {}
      : { containerName: candidate.containerName }),
    ...(candidate.directiveText === undefined
      ? {}
      : { directiveText: candidate.directiveText }),
  };
}

function analyzeInput(
  language: TreeSitterLanguage,
  content: string,
  root: Node,
  query: Query,
): AnalysisWorkerSuccess {
  const matches = query.matches(root, { matchLimit: QUERY_MATCH_LIMIT });
  const exceededQueryLimit = query.didExceedMatchLimit();
  const context = candidateContext(language, root);
  const omissions: Omission[] = [];
  let candidates: DefinitionCandidate[];
  if (language === "terraform" || language === "hcl") {
    candidates = collectHclCandidates(root, language, matches, omissions);
  } else {
    candidates = [];
    for (const match of matches) {
      const candidate = candidateFromMatch(
        language,
        content,
        root,
        context,
        match.captures,
      );
      if (candidate !== undefined) candidates.push(candidate);
    }
  }
  candidates = uniqueByNameRange(candidates);
  const cleanCandidates: DefinitionCandidate[] = [];
  for (const candidate of candidates) {
    if (
      candidate.definitionNode.hasError ||
      candidate.definitionNode.isMissing
    ) {
      omissions.push({
        node: candidate.definitionNode,
        code: "TREESITTER_DECLARATION_PARSE_ERROR",
        message:
          "A captured declaration contains syntax errors and was omitted.",
        reason: "declaration-contains-parse-error",
      });
      continue;
    }
    cleanCandidates.push(candidate);
  }
  candidates = collapseExactCDeclarations(language, cleanCandidates);

  if (root.hasError) {
    const damaged = errorRanges(root);
    if (damaged.length === 0) {
      omissions.push({
        node: root,
        code: "TREESITTER_SYNTAX_ERROR",
        message: "Tree-sitter found incomplete or invalid syntax.",
        reason: "syntax-error-range-unavailable",
      });
    } else {
      for (const node of damaged) {
        omissions.push({
          node,
          code: "TREESITTER_SYNTAX_ERROR",
          message:
            "Tree-sitter found incomplete or invalid syntax; declarations around the error may be missing.",
          reason: "syntax-error-may-hide-declarations",
        });
      }
    }
  }
  omissions.push(...dynamicOmissions(language, root));

  const uniqueCandidates = appendPartialCollisionLocators(
    language,
    candidates,
    omissions,
  );
  const limitedCandidates = uniqueCandidates.slice(0, MAX_SYMBOLS);
  if (exceededQueryLimit || uniqueCandidates.length > MAX_SYMBOLS) {
    omissions.push({
      node: root,
      code: "TREESITTER_SYMBOL_LIMIT",
      message: `Symbol output was capped at ${MAX_SYMBOLS} declarations or query matches.`,
      reason: "symbol-limit-may-hide-declarations",
    });
  }

  const diagnostics: SourceAnalysisDiagnosticV2[] = [];
  const uncoveredRanges: SourceAnalysisUncoveredRangeV2[] = [];
  const seenFindings = new Set<string>();
  for (const omission of omissions) {
    if (diagnostics.length >= MAX_DIAGNOSTICS) break;
    const range = rangeForNode(omission.node);
    const key = `${omission.code}:${rangeKey(range)}:${omission.reason}`;
    if (seenFindings.has(key)) continue;
    seenFindings.add(key);
    diagnostics.push({
      code: omission.code,
      message: omission.message,
      range,
    });
    uncoveredRanges.push({ ...range, reason: omission.reason });
  }
  if (
    omissions.length > MAX_DIAGNOSTICS &&
    diagnostics.length === MAX_DIAGNOSTICS
  ) {
    diagnostics[MAX_DIAGNOSTICS - 1] = {
      code: "TREESITTER_DIAGNOSTIC_LIMIT",
      message: `Further analysis diagnostics were capped at ${MAX_DIAGNOSTICS}.`,
      range: fullSourceRange(content),
    };
    uncoveredRanges[MAX_DIAGNOSTICS - 1] = {
      ...fullSourceRange(content),
      reason: "diagnostic-limit-may-hide-analysis-gaps",
    };
  }
  return {
    ok: true,
    status: diagnostics.length === 0 ? "ok" : "partial",
    symbols: limitedCandidates.map(buildSymbol),
    diagnostics,
    uncoveredRanges,
  };
}

const GRAMMAR_ASSETS: Readonly<Record<TreeSitterLanguage, string>> = {
  python: "tree-sitter-python.wasm",
  go: "tree-sitter-go.wasm",
  rust: "tree-sitter-rust.wasm",
  java: "tree-sitter-java.wasm",
  csharp: "tree-sitter-c_sharp.wasm",
  php: "tree-sitter-php.wasm",
  c: "tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp.wasm",
  bash: "tree-sitter-bash.wasm",
  ruby: "tree-sitter-ruby.wasm",
  terraform: "tree-sitter-terraform.release.wasm",
  hcl: "tree-sitter-hcl.release.wasm",
};

const SUPPLEMENTAL_QUERIES: Readonly<
  Partial<Record<TreeSitterLanguage, string>>
> = {
  rust: "rust-extra.scm",
  java: "java-extra.scm",
  csharp: "csharp-extra.scm",
  cpp: "cpp-extra.scm",
};

interface LoadedGrammar {
  readonly parser: Parser;
  readonly query: Query;
}

// The worker is persistent: the WASM runtime initializes once and each
// grammar and its query compile once, then serve every later request.
let runtimeReady: Promise<void> | undefined;
const grammars = new Map<TreeSitterLanguage, Promise<LoadedGrammar>>();

async function loadGrammar(
  languageName: TreeSitterLanguage,
): Promise<LoadedGrammar> {
  runtimeReady ??= Parser.init();
  await runtimeReady;
  const grammarPath = fileURLToPath(
    new URL(`../assets/${GRAMMAR_ASSETS[languageName]}`, import.meta.url),
  );
  const queryPath = new URL(
    `../assets/queries/${languageName}.scm`,
    import.meta.url,
  );
  const [language, upstreamQuery] = await Promise.all([
    Language.load(grammarPath),
    readFile(queryPath, "utf8"),
  ]);
  const supplementalName = SUPPLEMENTAL_QUERIES[languageName];
  const queryExtension =
    supplementalName === undefined
      ? ""
      : await readFile(
          new URL(`../assets/queries/${supplementalName}`, import.meta.url),
          "utf8",
        );
  const parser = new Parser();
  parser.setLanguage(language);
  return {
    parser,
    query: new Query(language, `${upstreamQuery}\n${queryExtension}`),
  };
}

function grammarFor(language: TreeSitterLanguage): Promise<LoadedGrammar> {
  let loaded = grammars.get(language);
  if (loaded === undefined) {
    loaded = loadGrammar(language);
    // A failed load must not poison later requests for the same grammar.
    loaded.catch(() => grammars.delete(language));
    grammars.set(language, loaded);
  }
  return loaded;
}

async function run(input: AnalysisWorkerInput): Promise<AnalysisWorkerResult> {
  const timingEnabled = input.performanceTimingEnabled === true;
  const totalAnalysisStartedAt = timingEnabled ? performance.now() : 0;
  try {
    const parserInitializationStartedAt = timingEnabled ? performance.now() : 0;
    const { parser, query } = await grammarFor(input.language);
    const parserInitializationWallMs = timingEnabled
      ? performance.now() - parserInitializationStartedAt
      : 0;
    const parseStartedAt = timingEnabled ? performance.now() : 0;
    parser.reset();
    const tree = parser.parse(input.content);
    const parseWallMs = timingEnabled ? performance.now() - parseStartedAt : 0;
    if (tree === null) {
      return {
        ok: false,
        code: "TREESITTER_PARSE_FAILED",
        message: "The Tree-sitter runtime returned no syntax tree.",
      };
    }
    try {
      const analysisStartedAt = timingEnabled ? performance.now() : 0;
      const result = analyzeInput(
        input.language,
        input.content,
        tree.rootNode,
        query,
      );
      if (!timingEnabled) return result;
      return {
        ...result,
        performanceTimings: {
          parserInitializationWallMs,
          parseWallMs,
          analysisWallMs: performance.now() - analysisStartedAt,
          totalAnalysisWallMs: performance.now() - totalAnalysisStartedAt,
        },
      };
    } finally {
      tree.delete();
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

if (parentPort === null)
  throw new Error("Tree-sitter worker requires a parent port.");
globalThis.fetch = async () => {
  throw new Error(
    "Network access is disabled in Tree-sitter analysis workers.",
  );
};
const port = parentPort;
// The host sends one request at a time and waits for its reply.
port.on("message", (input: AnalysisWorkerInput) => {
  void run(input).then((result) => port.postMessage({ id: input.id, result }));
});
