import type { Node } from "web-tree-sitter";

/**
 * Reference extraction for source proofs. Each reader lists what a file
 * references exactly, from its syntax tree, and reports every construct whose
 * meaning it cannot know without running or compiling the program as an
 * unresolved row. The host refuses a read with any unresolved row, so the
 * rules lean towards refusal: a macro, a reflective call or a conditional
 * compilation block may hide a reference, so it is never read as absent.
 */

export const REFERENCE_LANGUAGES = ["go", "java", "csharp", "rust"] as const;
export type ReferenceLanguage = (typeof REFERENCE_LANGUAGES)[number];

export type ReferenceExtract =
  | "env"
  | "imports"
  | "calls"
  | "string_args"
  | "thrown"
  | "property";

export interface ReferenceRequest {
  readonly extract: ReferenceExtract;
  readonly callee?: string;
  readonly key?: string;
}

export interface Unresolved {
  readonly line: number;
  readonly text: string;
}

export type ReferenceRead =
  | { readonly ok: true; members: string[]; unresolved: Unresolved[] }
  | { readonly ok: false; code: string; message: string };

const LANGUAGE_NAMES: Readonly<Record<ReferenceLanguage, string>> = {
  go: "Go",
  java: "Java",
  csharp: "C#",
  rust: "Rust",
};

/** A method called on an expression the reader cannot name is `*.name`. */
const ANY_RECEIVER = "*";

function at(node: Node): Unresolved {
  return {
    line: node.startPosition.row + 1,
    text: node.text.replace(/\s+/g, " ").slice(0, 80),
  };
}

function field(node: Node, name: string): Node | null {
  return node.childForFieldName(name);
}

function named(node: Node): Node[] {
  const children: Node[] = [];
  for (let index = 0; index < node.namedChildCount; index += 1) {
    const child = node.namedChild(index);
    if (child !== null) children.push(child);
  }
  return children;
}

function firstError(root: Node): Node | null {
  if (!root.hasError) return null;
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.shift();
    if (node === undefined) break;
    if (node.type === "ERROR" || node.isMissing) return node;
    for (let index = 0; index < node.childCount; index += 1) {
      const child = node.child(index);
      if (child !== null && (child.hasError || child.isMissing))
        pending.push(child);
    }
  }
  return root;
}

/** Remove generic arguments: `Vec::<u8>::new` is `Vec::new`. */
function withoutGenerics(text: string): string {
  let current = text.replace(/\s+/g, "");
  for (;;) {
    const next = current.replace(/(?:::)?<[^<>]*>/g, "");
    if (next === current) return current;
    current = next;
  }
}

/**
 * A string literal's value, or null when it is not a plain literal (an
 * interpolated string, or escapes this reader does not decode).
 */
function literal(node: Node | null | undefined): string | null {
  if (node === null || node === undefined) return null;
  const text = node.text;
  switch (node.type) {
    case "interpreted_string_literal": // Go
    case "string_literal": {
      // Go, Java, C#, Rust
      if (text.startsWith("@") || text.startsWith("$")) return null;
      if (text.startsWith('"""')) return null;
      const body = text.startsWith('"') && text.endsWith('"') ? text : null;
      if (body === null) return null;
      try {
        const value: unknown = JSON.parse(body);
        return typeof value === "string" ? value : null;
      } catch {
        return null;
      }
    }
    case "raw_string_literal": {
      // Go `...`, Rust r"..." / r#"..."#
      if (text.startsWith("`") && text.endsWith("`")) return text.slice(1, -1);
      const content = named(node).find(
        (child) => child.type === "string_content",
      );
      return content?.text ?? text.match(/^r(#*)"([\s\S]*)"\1$/)?.[2] ?? null;
    }
    case "verbatim_string_literal": // C# @"..."
      return text.startsWith('@"') && text.endsWith('"')
        ? text.slice(2, -1).replaceAll('""', '"')
        : null;
    default:
      return null;
  }
}

function calleeMatches(name: string, callee: string): boolean {
  if (name === callee) return true;
  if (callee.includes(".") || callee.includes("::")) return false;
  return name.endsWith(`.${callee}`) || name.endsWith(`::${callee}`);
}

interface Reader {
  /** Name of a call target, `*.name` for a method on an unnamed receiver, or null. */
  callName(call: Node): string | null;
  /** The call nodes of the language. */
  isCall(node: Node): boolean;
  /** Arguments of a call, in order. */
  callArguments(call: Node): Node[];
  imports(node: Node, members: string[], unresolved: Unresolved[]): void;
  /** Environment reads at node; true when the node was handled. */
  env(
    node: Node,
    name: string | null,
    members: string[],
    unresolved: Unresolved[],
  ): boolean;
  thrown(
    node: Node,
    catchNames: readonly string[],
    members: string[],
    unresolved: Unresolved[],
  ): void;
  /** Constructs that make `calls` and `thrown` unknowable (reflection, macros). */
  hidesCalls(node: Node, name: string | null, context: FileContext): boolean;
  /** Constructs that make every extract unknowable at that place. */
  conditional(node: Node): boolean;
  /** Skip the subtree entirely (e.g. Rust `#[cfg(test)]` items). */
  skip(node: Node): boolean;
  property?(
    node: Node,
    key: string,
    members: string[],
    unresolved: Unresolved[],
  ): void;
  /** Name of the catch variable bound by a catch clause, if any. */
  catchName(node: Node): string | null;
  /** A callable passed by name, such as Java's `System.out::println`. */
  methodReference?(node: Node): string | null;
}

interface FileContext {
  readonly importsReflect: boolean;
}

// ---------------------------------------------------------------- Go

const GO_ENV_GETTERS = new Set(["os.Getenv", "os.LookupEnv", "syscall.Getenv"]);
const GO_ENV_WHOLE = new Set(["os.Environ", "syscall.Environ"]);
const GO_REFLECT_CALLS = new Set(["Call", "CallSlice", "MethodByName"]);

function goChain(node: Node): string | null {
  switch (node.type) {
    case "identifier":
    case "package_identifier":
    case "field_identifier":
    case "type_identifier":
      return node.text;
    case "selector_expression": {
      const operand = field(node, "operand");
      const name = field(node, "field");
      if (operand === null || name === null) return null;
      const left = goChain(operand);
      return left === null ? null : `${left}.${name.text}`;
    }
    case "parenthesized_expression": {
      const inner = named(node)[0];
      return inner === undefined ? null : goChain(inner);
    }
    case "generic_type":
    case "index_expression": {
      // Map[int](x): an explicitly instantiated generic function.
      const base = field(node, "type") ?? field(node, "operand");
      return base === null ? null : goChain(base);
    }
    default:
      return null;
  }
}

const GO: Reader = {
  isCall: (node) =>
    node.type === "call_expression" ||
    (node.type === "type_conversion_expression" &&
      field(node, "type")?.type === "generic_type"),
  callName(call) {
    const target = field(call, "function") ?? field(call, "type");
    if (target === null) return null;
    if (target.type === "func_literal") return null;
    const name = goChain(target);
    if (name !== null) return name;
    if (target.type === "selector_expression") {
      const method = field(target, "field");
      return method === null ? null : `${ANY_RECEIVER}.${method.text}`;
    }
    return null;
  },
  callArguments(call) {
    const args = field(call, "arguments") ?? field(call, "operand");
    if (args === null) return [];
    return args.type === "argument_list" ? named(args) : [args];
  },
  imports(node, members) {
    if (node.type !== "import_spec") return;
    const path = literal(field(node, "path"));
    if (path !== null) members.push(path);
  },
  env(node, name, members, unresolved) {
    if (!GO.isCall(node) || name === null) return false;
    if (GO_ENV_GETTERS.has(name)) {
      const value = literal(GO.callArguments(node)[0]);
      if (value === null) unresolved.push(at(node));
      else members.push(value);
      return true;
    }
    if (GO_ENV_WHOLE.has(name)) {
      unresolved.push(at(node));
      return true;
    }
    return false;
  },
  thrown(node, _catchNames, members, unresolved) {
    if (!GO.isCall(node) || GO.callName(node) !== "panic") return;
    let value = GO.callArguments(node)[0];
    if (value?.type === "unary_expression") value = named(value)[0];
    if (value?.type === "composite_literal") {
      const type = field(value, "type");
      if (type !== null) {
        members.push(withoutGenerics(type.text));
        return;
      }
    }
    if (value !== undefined && value.type === "call_expression") {
      const name = GO.callName(value);
      if (name !== null && !name.startsWith(ANY_RECEIVER)) {
        members.push(name);
        return;
      }
    }
    unresolved.push(at(node));
  },
  hidesCalls(node, name, context) {
    if (!context.importsReflect || !GO.isCall(node) || name === null)
      return false;
    const method = name.split(".").at(-1) ?? "";
    return GO_REFLECT_CALLS.has(method);
  },
  conditional: () => false,
  skip: () => false,
  property(node, key, members, unresolved) {
    if (node.type !== "keyed_element") return;
    const parts = named(node);
    const keyNode = parts[0];
    const keyText =
      keyNode === undefined ? "" : keyNode.text.replace(/\s+/g, "");
    const keyLiteral =
      keyNode === undefined ? null : literal(named(keyNode)[0] ?? keyNode);
    if (keyText !== key && keyLiteral !== key) return;
    const valueNode = parts[1];
    const value = literal(
      valueNode === undefined ? null : (named(valueNode)[0] ?? valueNode),
    );
    if (value === null) unresolved.push(at(node));
    else members.push(value);
  },
  catchName: () => null,
};

// ---------------------------------------------------------------- Java

const JAVA_REFLECTION = new Set([
  "Class.forName",
  "*.getMethod",
  "*.getDeclaredMethod",
  "*.getMethods",
  "*.getDeclaredMethods",
  "*.invoke",
  "*.invokeExact",
  "*.newInstance",
  "MethodHandles.lookup",
]);

function javaChain(node: Node): string | null {
  switch (node.type) {
    case "identifier":
    case "type_identifier":
    case "this":
    case "super":
      return node.text;
    case "field_access": {
      const object = field(node, "object");
      const name = field(node, "field");
      if (object === null || name === null) return null;
      const left = javaChain(object);
      return left === null ? null : `${left}.${name.text}`;
    }
    case "scoped_identifier":
    case "scoped_type_identifier":
      return withoutGenerics(node.text);
    case "parenthesized_expression": {
      const inner = named(node)[0];
      return inner === undefined ? null : javaChain(inner);
    }
    default:
      return null;
  }
}

function reflective(name: string | null, table: ReadonlySet<string>): boolean {
  if (name === null) return false;
  if (table.has(name)) return true;
  const method = name.split(".").at(-1) ?? "";
  return table.has(`${ANY_RECEIVER}.${method}`);
}

const JAVA: Reader = {
  isCall: (node) => node.type === "method_invocation",
  callName(call) {
    const name = field(call, "name");
    if (name === null) return null;
    const object = field(call, "object");
    if (object === null) return name.text;
    const left = javaChain(object);
    return `${left ?? ANY_RECEIVER}.${name.text}`;
  },
  callArguments(call) {
    const args = field(call, "arguments");
    return args === null ? [] : named(args);
  },
  imports(node, members) {
    if (node.type !== "import_declaration") return;
    const parts = named(node);
    const path = parts.find(
      (part) => part.type === "scoped_identifier" || part.type === "identifier",
    );
    if (path === undefined) return;
    const wildcard = parts.some((part) => part.type === "asterisk");
    members.push(wildcard ? `${path.text}.*` : path.text);
  },
  env(node, name, members, unresolved) {
    if (!JAVA.isCall(node) || name !== "System.getenv") return false;
    const args = JAVA.callArguments(node);
    const value = literal(args[0]);
    if (args.length !== 1 || value === null) unresolved.push(at(node));
    else members.push(value);
    return true;
  },
  thrown(node, catchNames, members, unresolved) {
    if (node.type !== "throw_statement") return;
    const value = named(node)[0];
    if (value?.type === "object_creation_expression") {
      const type = field(value, "type");
      if (type !== null) {
        members.push(withoutGenerics(type.text));
        return;
      }
    }
    if (value?.type === "method_invocation") {
      const name = JAVA.callName(value);
      if (name !== null && !name.startsWith(ANY_RECEIVER)) {
        members.push(name);
        return;
      }
    }
    if (value?.type === "identifier" && catchNames.includes(value.text)) return;
    unresolved.push(at(node));
  },
  hidesCalls: (node, name) =>
    JAVA.isCall(node) && reflective(name, JAVA_REFLECTION),
  methodReference(node) {
    if (node.type !== "method_reference") return null;
    const parts = named(node);
    const target = parts[0];
    const method = parts.at(-1);
    if (target === undefined || method === undefined || parts.length < 2)
      return null;
    const name = method.type === "identifier" ? method.text : "new";
    return `${javaChain(target) ?? ANY_RECEIVER}.${name}`;
  },
  conditional: () => false,
  skip: () => false,
  catchName(node) {
    if (node.type !== "catch_clause") return null;
    const parameter = named(node).find(
      (child) => child.type === "catch_formal_parameter",
    );
    return parameter === undefined
      ? null
      : (field(parameter, "name")?.text ?? null);
  },
};

// ---------------------------------------------------------------- C#

const CSHARP_ENV = new Set([
  "Environment.GetEnvironmentVariable",
  "System.Environment.GetEnvironmentVariable",
]);
const CSHARP_ENV_WHOLE = new Set([
  "Environment.GetEnvironmentVariables",
  "System.Environment.GetEnvironmentVariables",
]);
const CSHARP_REFLECTION = new Set([
  "Type.GetType",
  "Activator.CreateInstance",
  "System.Activator.CreateInstance",
  "*.GetMethod",
  "*.GetMethods",
  "*.InvokeMember",
  "*.Invoke",
  "*.DynamicInvoke",
  "*.CreateDelegate",
]);

function csharpChain(node: Node): string | null {
  switch (node.type) {
    case "identifier":
    case "this":
    case "this_expression":
    case "base_expression":
    case "predefined_type":
      return node.text;
    case "generic_name": {
      const name = named(node).find((child) => child.type === "identifier");
      return name?.text ?? null;
    }
    case "qualified_name":
      return withoutGenerics(node.text);
    case "member_access_expression": {
      const expression = field(node, "expression");
      const name = field(node, "name");
      if (name === null) return null;
      const member = csharpChain(name) ?? name.text;
      if (expression === null) {
        // `this.X()` and `base.X()`: the receiver is an anonymous keyword.
        const keyword = node.child(0);
        return keyword === null ? null : `${keyword.text}.${member}`;
      }
      const left = csharpChain(expression);
      return left === null ? null : `${left}.${member}`;
    }
    case "parenthesized_expression": {
      const inner = named(node)[0];
      return inner === undefined ? null : csharpChain(inner);
    }
    default:
      return null;
  }
}

const CSHARP: Reader = {
  isCall: (node) => node.type === "invocation_expression",
  callName(call) {
    const target = field(call, "function");
    if (target === null) return null;
    if (target.type === "identifier" && target.text === "nameof") return null;
    const name = csharpChain(target);
    if (name !== null) return name;
    if (target.type === "member_access_expression") {
      const member = field(target, "name");
      return member === null
        ? null
        : `${ANY_RECEIVER}.${csharpChain(member) ?? member.text}`;
    }
    if (target.type === "member_binding_expression") {
      const member = field(target, "name");
      return member === null
        ? null
        : `${ANY_RECEIVER}.${csharpChain(member) ?? member.text}`;
    }
    return null;
  },
  callArguments(call) {
    const args = field(call, "arguments");
    if (args === null) return [];
    return named(args).map((argument) =>
      argument.type === "argument"
        ? (named(argument).at(-1) ?? argument)
        : argument,
    );
  },
  imports(node, members) {
    if (node.type !== "using_directive") return;
    const parts = named(node);
    const alias = field(node, "name");
    const path = parts.filter((part) => part.id !== alias?.id).at(-1);
    if (path !== undefined) members.push(withoutGenerics(path.text));
  },
  env(node, name, members, unresolved) {
    if (!CSHARP.isCall(node) || name === null) return false;
    if (CSHARP_ENV.has(name)) {
      const value = literal(CSHARP.callArguments(node)[0]);
      if (value === null) unresolved.push(at(node));
      else members.push(value);
      return true;
    }
    if (CSHARP_ENV_WHOLE.has(name)) {
      unresolved.push(at(node));
      return true;
    }
    return false;
  },
  thrown(node, catchNames, members, unresolved) {
    if (node.type !== "throw_statement" && node.type !== "throw_expression")
      return;
    const value = named(node)[0];
    if (value === undefined) return; // `throw;` rethrows the caught exception
    if (value.type === "object_creation_expression") {
      const type = field(value, "type");
      if (type !== null) {
        members.push(withoutGenerics(type.text));
        return;
      }
    }
    if (value.type === "invocation_expression") {
      const name = CSHARP.callName(value);
      if (name !== null && !name.startsWith(ANY_RECEIVER)) {
        members.push(name);
        return;
      }
    }
    if (value.type === "identifier" && catchNames.includes(value.text)) return;
    unresolved.push(at(node));
  },
  hidesCalls(node, name) {
    if (CSHARP.isCall(node) && reflective(name, CSHARP_REFLECTION)) return true;
    // A dynamic receiver binds its members at run time.
    return (
      (node.type === "identifier" || node.type === "predefined_type") &&
      node.text === "dynamic" &&
      node.parent?.type === "variable_declaration"
    );
  },
  conditional: (node) =>
    node.type === "preproc_if" ||
    node.type === "preproc_ifdef" ||
    node.type === "if_directive",
  skip: () => false,
  property(node, key, members, unresolved) {
    if (
      node.type !== "assignment_expression" ||
      node.parent?.type !== "initializer_expression"
    )
      return;
    const left = field(node, "left");
    if (left?.text !== key) return;
    const value = literal(field(node, "right"));
    if (value === null) unresolved.push(at(node));
    else members.push(value);
  },
  catchName(node) {
    if (node.type !== "catch_clause") return null;
    const declaration = named(node).find(
      (child) => child.type === "catch_declaration",
    );
    return declaration === undefined
      ? null
      : (field(declaration, "name")?.text ?? null);
  },
};

// ---------------------------------------------------------------- Rust

const RUST_ENV = new Set([
  "env::var",
  "std::env::var",
  "env::var_os",
  "std::env::var_os",
]);
const RUST_ENV_WHOLE = new Set([
  "env::vars",
  "std::env::vars",
  "env::vars_os",
  "std::env::vars_os",
]);
const RUST_ENV_MACROS = new Set([
  "env",
  "option_env",
  "std::env",
  "core::env",
  "std::option_env",
]);

function rustChain(node: Node): string | null {
  switch (node.type) {
    case "identifier":
    case "self":
    case "crate":
    case "super":
    case "field_identifier":
    case "type_identifier":
    case "scoped_identifier":
    case "scoped_type_identifier":
    case "generic_function":
      return withoutGenerics(node.text);
    case "field_expression": {
      const value = field(node, "value");
      const name = field(node, "field");
      if (value === null || name === null) return null;
      const left = rustChain(value);
      return left === null ? null : `${left}.${name.text}`;
    }
    case "parenthesized_expression": {
      const inner = named(node)[0];
      return inner === undefined ? null : rustChain(inner);
    }
    default:
      return null;
  }
}

function rustUseTree(node: Node, prefix: string, members: string[]): void {
  const join = (left: string, right: string) =>
    left === "" ? right : `${left}::${right}`;
  switch (node.type) {
    case "use_as_clause": {
      const path = field(node, "path");
      if (path !== null) rustUseTree(path, prefix, members);
      return;
    }
    case "use_wildcard": {
      const path = named(node)[0];
      members.push(
        join(
          path === undefined
            ? prefix
            : join(prefix, path.text.replace(/\s+/g, "")),
          "*",
        ),
      );
      return;
    }
    case "scoped_use_list": {
      const path = field(node, "path");
      const list = field(node, "list");
      const base =
        path === null ? prefix : join(prefix, path.text.replace(/\s+/g, ""));
      if (list !== null) rustUseTree(list, base, members);
      return;
    }
    case "use_list":
      for (const item of named(node)) rustUseTree(item, prefix, members);
      return;
    case "self":
      members.push(prefix);
      return;
    default:
      members.push(join(prefix, node.text.replace(/\s+/g, "")));
  }
}

function rustMacroName(node: Node): string {
  const name = field(node, "macro");
  return name === null ? "" : name.text.replace(/\s+/g, "");
}

function rustAttribute(node: Node): string {
  return node.text.replace(/\s+/g, "");
}

/** The attribute items that annotate an item: its preceding siblings. */
function rustAttributes(node: Node): string[] {
  const attributes: string[] = [];
  let previous = node.previousNamedSibling;
  while (previous !== null && previous.type === "attribute_item") {
    attributes.push(rustAttribute(previous));
    previous = previous.previousNamedSibling;
  }
  return attributes;
}

const RUST_ITEM_PARENTS = new Set(["source_file", "declaration_list"]);

const RUST: Reader = {
  isCall: (node) => node.type === "call_expression",
  callName(call) {
    const target = field(call, "function");
    if (target === null) return null;
    const name = rustChain(target);
    if (name !== null) return name;
    if (target.type === "field_expression") {
      const method = field(target, "field");
      return method === null ? null : `${ANY_RECEIVER}.${method.text}`;
    }
    return null;
  },
  callArguments(call) {
    const args = field(call, "arguments");
    return args === null ? [] : named(args);
  },
  imports(node, members, unresolved) {
    if (node.type === "use_declaration") {
      const argument = field(node, "argument");
      if (argument !== null) rustUseTree(argument, "", members);
      return;
    }
    if (node.type === "extern_crate_declaration") {
      const name = field(node, "name");
      if (name !== null) members.push(name.text);
      return;
    }
    // A macro in item position can expand to further `use` items.
    if (
      node.type === "macro_invocation" &&
      RUST_ITEM_PARENTS.has(node.parent?.type ?? "")
    )
      unresolved.push(at(node));
  },
  env(node, name, members, unresolved) {
    if (
      node.type === "macro_invocation" &&
      RUST_ENV_MACROS.has(rustMacroName(node))
    ) {
      const tokens = named(node).find((child) => child.type === "token_tree");
      const value = literal(tokens === undefined ? null : named(tokens)[0]);
      if (value === null) unresolved.push(at(node));
      else members.push(value);
      return true;
    }
    if (!RUST.isCall(node) || name === null) return false;
    if (RUST_ENV.has(name)) {
      const value = literal(RUST.callArguments(node)[0]);
      if (value === null) unresolved.push(at(node));
      else members.push(value);
      return true;
    }
    if (RUST_ENV_WHOLE.has(name)) {
      unresolved.push(at(node));
      return true;
    }
    return false;
  },
  thrown() {
    // Rust has no throw statement; panics are macros, refused with the rest.
  },
  hidesCalls: (node) => node.type === "macro_invocation",
  conditional(node) {
    if (node.type !== "attribute_item") return false;
    const attribute = rustAttribute(node);
    return (
      /^#!?\[(?:cfg|cfg_attr)\(/.test(attribute) && attribute !== "#[cfg(test)]"
    );
  },
  skip: (node) =>
    RUST_ITEM_PARENTS.has(node.parent?.type ?? "") &&
    node.type !== "attribute_item" &&
    rustAttributes(node).includes("#[cfg(test)]"),
  catchName: () => null,
};

const READERS: Readonly<Record<ReferenceLanguage, Reader>> = {
  go: GO,
  java: JAVA,
  csharp: CSHARP,
  rust: RUST,
};

export function isReferenceLanguage(value: string): value is ReferenceLanguage {
  return (REFERENCE_LANGUAGES as readonly string[]).includes(value);
}

/** Read one extract from a parsed file. */
// implements REQ-kibi-tree-sitter-references
export function extractReferences(
  language: ReferenceLanguage,
  root: Node,
  request: ReferenceRequest,
): ReferenceRead {
  const name = LANGUAGE_NAMES[language];
  const broken = firstError(root);
  if (broken !== null)
    return {
      ok: false,
      code: "TREESITTER_REFERENCES_SYNTAX",
      message: `line ${broken.startPosition.row + 1} is not valid ${name}`,
    };
  const reader = READERS[language];
  const { extract } = request;
  if (extract === "property" && reader.property === undefined)
    return {
      ok: false,
      code: "TREESITTER_REFERENCES_UNSUPPORTED",
      message: `${name} has no property values to extract`,
    };
  const callee = request.callee ?? "";
  const key = request.key ?? "";
  const members: string[] = [];
  const unresolved: Unresolved[] = [];
  const context: FileContext = {
    importsReflect:
      language === "go" &&
      /^\s*(?:import\s+)?(?:\w+\s+)?"reflect"/m.test(root.text),
  };
  const catchNames: string[] = [];
  const visit = (node: Node): void => {
    if (reader.skip(node)) return;
    if (reader.conditional(node)) unresolved.push(at(node));
    const caught = reader.catchName(node);
    if (caught !== null) catchNames.push(caught);
    const callName = reader.isCall(node) ? reader.callName(node) : null;
    switch (extract) {
      case "imports":
        reader.imports(node, members, unresolved);
        break;
      case "env":
        if (reader.env(node, callName, members, unresolved)) return;
        break;
      case "calls":
        if (reader.hidesCalls(node, callName, context))
          unresolved.push(at(node));
        else if (callName !== null) members.push(callName);
        else {
          const passed = reader.methodReference?.(node) ?? null;
          if (passed !== null) members.push(passed);
        }
        break;
      case "string_args":
        if (callName !== null && calleeMatches(callName, callee)) {
          const value = literal(reader.callArguments(node)[0]);
          if (value === null) unresolved.push(at(node));
          else members.push(value);
        }
        break;
      case "thrown":
        if (reader.hidesCalls(node, callName, context) && language === "rust")
          unresolved.push(at(node));
        else reader.thrown(node, catchNames, members, unresolved);
        break;
      case "property":
        reader.property?.(node, key, members, unresolved);
        break;
    }
    for (const child of named(node)) visit(child);
    if (caught !== null) catchNames.pop();
  };
  visit(root);
  return { ok: true, members, unresolved };
}
