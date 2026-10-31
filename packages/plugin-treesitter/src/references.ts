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
  /** The callee node of a call, when the grammar has one. */
  callee(call: Node): Node | null;
  /** A call of a function literal or `nameof`: nothing is referenced by name. */
  ignoredCall(call: Node): boolean;
  /** Arguments of a call, in order. */
  callArguments(call: Node): Node[];
  /** Per-file import aliases and the imports that make bare names ambiguous. */
  context(root: Node): FileContext;
  /**
   * The names a spelled call target may stand for once import aliases,
   * static imports and fully qualified prefixes are resolved; the first is
   * the canonical one.
   */
  candidates(name: string, context: FileContext): string[];
  /** A name used as a value (not called), for a maximal reference node. */
  reference(node: Node): string | null;
  /** Calls that read one environment variable named by their first argument. */
  readonly envGetters: ReadonlySet<string>;
  /** Calls that read the whole environment or a template of variables. */
  readonly envWhole: ReadonlySet<string>;
  /** Environment reads that are not calls (Rust `env!`, Java `System::getenv`). */
  envSpecial?(
    node: Node,
    context: FileContext,
    members: string[],
    unresolved: Unresolved[],
  ): boolean;
  imports(node: Node, members: string[], unresolved: Unresolved[]): void;
  thrown(
    node: Node,
    catchNames: readonly string[],
    members: string[],
    unresolved: Unresolved[],
  ): void;
  /** Constructs that make `calls` and `thrown` unknowable (reflection, macros). */
  hidesCalls(
    node: Node,
    names: readonly string[],
    context: FileContext,
  ): boolean;
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
  /** Local name (an alias, or a statically imported member) to what it names. */
  readonly aliases: ReadonlyMap<string, string>;
  /** C# `using static` types whose members bare names may be. */
  readonly staticTypes: readonly string[];
  /** Imports that make a bare environment read impossible to name. */
  readonly envAmbiguous: readonly Unresolved[];
  /** Imports that make a bare call impossible to name. */
  readonly callsAmbiguous: readonly Unresolved[];
  readonly imported: ReadonlySet<string>;
}

function emptyContext(): {
  aliases: Map<string, string>;
  staticTypes: string[];
  envAmbiguous: Unresolved[];
  callsAmbiguous: Unresolved[];
  imported: Set<string>;
} {
  return {
    aliases: new Map(),
    staticTypes: [],
    envAmbiguous: [],
    callsAmbiguous: [],
    imported: new Set(),
  };
}

function descendants(root: Node, type: string): Node[] {
  return root
    .descendantsOfType(type)
    .filter((node): node is Node => node !== null);
}

/** Replace the first segment of a name by what an alias names. */
function aliased(
  name: string,
  separator: string,
  aliases: ReadonlyMap<string, string>,
): string {
  const cut = name.indexOf(separator);
  const head = cut === -1 ? name : name.slice(0, cut);
  const target = aliases.get(head);
  return target === undefined
    ? name
    : `${target}${cut === -1 ? "" : name.slice(cut)}`;
}

function unique(names: readonly string[]): string[] {
  return [...new Set(names)];
}

/** Chain node types that are part of a longer reference, per language. */
const REFERENCE_PARENTS = new Set([
  "selector_expression",
  "field_access",
  "scoped_identifier",
  "scoped_type_identifier",
  "qualified_name",
  "member_access_expression",
  "field_expression",
  "generic_name",
  "use_declaration",
  "use_as_clause",
  "use_list",
  "scoped_use_list",
  "import_spec",
  "import_declaration",
  "using_directive",
]);

// ---------------------------------------------------------------- Go

const GO_ENV_GETTERS = new Set(["os.Getenv", "os.LookupEnv", "syscall.Getenv"]);
// Expand and ExpandEnv read every variable their template names.
const GO_ENV_WHOLE = new Set([
  "os.Environ",
  "syscall.Environ",
  "os.ExpandEnv",
  "os.Expand",
]);
const GO_ENV_PACKAGES = new Set(["os", "syscall"]);
const GO_REFLECT_CALLS = new Set(["Call", "CallSlice", "MethodByName"]);
const GO_PLUGIN_CALLS = new Set(["plugin.Open", "*.Lookup"]);

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
    case "generic_type": {
      // Map[int](x): an explicitly instantiated generic function.
      const base = field(node, "type");
      return base === null ? null : goChain(base);
    }
    default:
      // An element access (handlers[name]()) names no function.
      return null;
  }
}

const GO: Reader = {
  isCall: (node) =>
    node.type === "call_expression" ||
    (node.type === "type_conversion_expression" &&
      field(node, "type")?.type === "generic_type"),
  callee: (call) => field(call, "function") ?? field(call, "type"),
  ignoredCall: (call) => field(call, "function")?.type === "func_literal",
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
  context(root) {
    const context = emptyContext();
    for (const spec of descendants(root, "import_spec")) {
      const path = literal(field(spec, "path"));
      if (path === null) continue;
      context.imported.add(path);
      const packageName = path.split("/").at(-1) ?? path;
      const alias = field(spec, "name");
      if (alias === null) continue;
      if (alias.type === "dot") {
        // Every exported name of the package is in scope unqualified.
        context.callsAmbiguous.push(at(spec));
        if (GO_ENV_PACKAGES.has(path)) context.envAmbiguous.push(at(spec));
      } else if (alias.type === "package_identifier")
        context.aliases.set(alias.text, packageName);
    }
    return context;
  },
  candidates: (name, context) =>
    unique([aliased(name, ".", context.aliases), name]),
  reference(node) {
    if (node.type !== "selector_expression") return null;
    return goChain(node);
  },
  envGetters: GO_ENV_GETTERS,
  envWhole: GO_ENV_WHOLE,
  imports(node, members) {
    if (node.type !== "import_spec") return;
    const path = literal(field(node, "path"));
    if (path !== null) members.push(path);
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
  hidesCalls(node, names, context) {
    if (!GO.isCall(node) || names.length === 0) return false;
    if (
      context.imported.has("plugin") &&
      names.some((name) => reflective(name, GO_PLUGIN_CALLS))
    )
      return true;
    if (!context.imported.has("reflect")) return false;
    return names.some((name) =>
      GO_REFLECT_CALLS.has(name.split(".").at(-1) ?? ""),
    );
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
  "MethodHandles.publicLookup",
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

/** `java.lang.System.getenv` is `System.getenv`; other packages stay. */
function withoutJavaLang(name: string): string {
  return name.replace(/^java\.lang\.(?:invoke\.|reflect\.)?(?=[A-Z])/, "");
}

/**
 * Whether a call name is in a reflection table: exactly, by a fully
 * qualified spelling (`java.lang.invoke.MethodHandles.lookup`), or as a
 * method on any receiver (`*.invoke`).
 */
function reflective(name: string | null, table: ReadonlySet<string>): boolean {
  if (name === null) return false;
  if (table.has(name)) return true;
  for (const entry of table)
    if (!entry.startsWith(ANY_RECEIVER) && name.endsWith(`.${entry}`))
      return true;
  const method = name.split(".").at(-1) ?? "";
  return table.has(`${ANY_RECEIVER}.${method}`);
}

const JAVA: Reader = {
  isCall: (node) => node.type === "method_invocation",
  callee: () => null,
  ignoredCall: () => false,
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
  context(root) {
    const context = emptyContext();
    for (const declaration of descendants(root, "import_declaration")) {
      if (!/^import\s+static\b/.test(declaration.text)) continue;
      const path = named(declaration).find(
        (part) => part.type === "scoped_identifier",
      );
      if (path === undefined) continue;
      const segments = path.text.replace(/\s+/g, "").split(".");
      if (named(declaration).some((part) => part.type === "asterisk")) {
        // `import static a.b.C.*`: any bare call may be one of C's methods.
        context.callsAmbiguous.push(at(declaration));
        if (segments.at(-1) === "System")
          context.envAmbiguous.push(at(declaration));
        continue;
      }
      const member = segments.at(-1);
      const owner = segments.at(-2);
      if (member !== undefined && owner !== undefined)
        context.aliases.set(member, `${owner}.${member}`);
    }
    return context;
  },
  candidates(name, context) {
    const bare = name.includes(".")
      ? name
      : (context.aliases.get(name) ?? name);
    return unique([withoutJavaLang(bare), name]);
  },
  reference: () => null,
  envGetters: new Set(["System.getenv"]),
  envWhole: new Set(),
  envSpecial(node, context, _members, unresolved) {
    // `System::getenv` hands the getter on: what it reads is not known.
    if (node.type !== "method_reference") return false;
    const name = JAVA.methodReference?.(node) ?? null;
    if (name === null) return false;
    if (!JAVA.candidates(name, context).includes("System.getenv")) return false;
    unresolved.push(at(node));
    return true;
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
  hidesCalls: (node, names) =>
    JAVA.isCall(node) &&
    names.some((name) => reflective(name, JAVA_REFLECTION)),
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

// Names are compared without `global::` and `System.` (see csharpCandidates).
const CSHARP_ENV = new Set(["Environment.GetEnvironmentVariable"]);
const CSHARP_ENV_WHOLE = new Set([
  "Environment.GetEnvironmentVariables",
  "Environment.ExpandEnvironmentVariables",
]);
const CSHARP_REFLECTION = new Set([
  "Type.GetType",
  "Activator.CreateInstance",
  "Reflection.Assembly.Load",
  "Reflection.Assembly.LoadFrom",
  "Reflection.Assembly.LoadFile",
  "Assembly.Load",
  "Assembly.LoadFrom",
  "Assembly.LoadFile",
  "*.CreateInstance",
  "*.GetMethod",
  "*.GetMethods",
  "*.InvokeMember",
  "*.Invoke",
  "*.DynamicInvoke",
  "*.CreateDelegate",
]);

function withoutSystem(name: string): string {
  return name.replace(/^global::/, "").replace(/^System\./, "");
}

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
  callee: (call) => field(call, "function"),
  ignoredCall(call) {
    const target = field(call, "function");
    if (target === null) return false;
    if (target.type === "identifier" && target.text === "nameof") return true;
    const inner =
      target.type === "parenthesized_expression" ? named(target)[0] : target;
    return (
      inner?.type === "lambda_expression" ||
      inner?.type === "anonymous_method_expression"
    );
  },
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
  context(root) {
    const context = emptyContext();
    for (const directive of descendants(root, "using_directive")) {
      const alias = field(directive, "name");
      const path = named(directive)
        .filter((part) => part.id !== alias?.id)
        .at(-1);
      if (path === undefined) continue;
      const target = withoutSystem(withoutGenerics(path.text));
      if (alias !== null) context.aliases.set(alias.text, target);
      else if (
        /^global\s+using\s+static\b|^using\s+static\b/.test(directive.text)
      )
        context.staticTypes.push(target);
    }
    return context;
  },
  candidates(name, context) {
    const resolved = withoutSystem(
      aliased(withoutSystem(name), ".", context.aliases),
    );
    const fromStatic = name.includes(".")
      ? []
      : context.staticTypes.map((type) => `${type}.${name}`);
    return unique([resolved, ...fromStatic, name]);
  },
  reference(node) {
    if (node.type === "member_access_expression") return csharpChain(node);
    if (node.type === "identifier") return node.text;
    return null;
  },
  envGetters: CSHARP_ENV,
  envWhole: CSHARP_ENV_WHOLE,
  imports(node, members) {
    if (node.type !== "using_directive") return;
    const parts = named(node);
    const alias = field(node, "name");
    const path = parts.filter((part) => part.id !== alias?.id).at(-1);
    if (path !== undefined) members.push(withoutGenerics(path.text));
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
  hidesCalls(node, names) {
    if (
      CSHARP.isCall(node) &&
      names.some((name) => reflective(name, CSHARP_REFLECTION))
    )
      return true;
    // A dynamic value binds its members at run time, wherever `dynamic` is
    // its type: a local, a parameter, a field, a property, a cast or a type
    // argument.
    return (
      (node.type === "identifier" || node.type === "predefined_type") &&
      node.text === "dynamic" &&
      node.parent?.type !== "member_access_expression" &&
      node.parent?.type !== "invocation_expression" &&
      node.parent?.type !== "argument"
    );
  },
  conditional: (node) =>
    node.type === "preproc_if" ||
    node.type === "preproc_ifdef" ||
    node.type === "if_directive",
  skip: () => false,
  property(node, key, members, unresolved) {
    const parent = node.parent;
    if (parent?.type !== "initializer_expression") return;
    // `{ { "Mode", "u" } }`: a collection initializer's key and value.
    if (node.type === "initializer_expression") {
      const [keyNode, valueNode, ...rest] = named(node);
      if (keyNode === undefined || valueNode === undefined || rest.length > 0)
        return;
      // A numeric or nested initializer is an array row, not a key.
      if (
        !/string_literal$/.test(keyNode.type) &&
        keyNode.type !== "identifier"
      )
        return;
      const keyValue = literal(keyNode);
      if (keyValue !== null && keyValue !== key) return;
      const value = keyValue === null ? null : literal(valueNode);
      if (value === null) unresolved.push(at(node));
      else members.push(value);
      return;
    }
    if (node.type !== "assignment_expression") return;
    const left = field(node, "left");
    if (left === null) return;
    if (left.type === "element_binding_expression") {
      // `{ ["Mode"] = "u" }`: an indexer initializer.
      const index = named(left);
      const argument =
        index[0]?.type === "argument" ? named(index[0]).at(-1) : index[0];
      const keyValue = index.length === 1 ? literal(argument) : null;
      if (keyValue !== null && keyValue !== key) return;
      const value = keyValue === null ? null : literal(field(node, "right"));
      if (value === null) unresolved.push(at(node));
      else members.push(value);
      return;
    }
    if (left.text !== key) return;
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

const RUST_ENV = new Set(["std::env::var", "std::env::var_os"]);
const RUST_ENV_WHOLE = new Set(["std::env::vars", "std::env::vars_os"]);
const RUST_ENV_MACROS = new Set([
  "env",
  "option_env",
  "std::env",
  "core::env",
  "std::option_env",
  "core::option_env",
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
    case "generic_function": {
      // `<T as Trait>::m` names a method of whichever impl T resolves to.
      if (node.text.trimStart().startsWith("<")) return null;
      return withoutGenerics(node.text);
    }
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

/** The local names a `use` tree binds, each to the path it names. */
function rustUseBindings(
  node: Node,
  prefix: string,
  bind: (local: string, path: string) => void,
  glob: (path: string, at: Node) => void,
): void {
  const join = (left: string, right: string) =>
    left === "" ? right : `${left}::${right}`;
  const lastSegment = (path: string) => path.split("::").at(-1) ?? path;
  switch (node.type) {
    case "use_as_clause": {
      const path = field(node, "path");
      const alias = field(node, "alias");
      if (path !== null && alias !== null && alias.text !== "_")
        bind(alias.text, join(prefix, path.text.replace(/\s+/g, "")));
      return;
    }
    case "use_wildcard": {
      const path = named(node)[0];
      glob(
        path === undefined
          ? prefix
          : join(prefix, path.text.replace(/\s+/g, "")),
        node,
      );
      return;
    }
    case "scoped_use_list": {
      const path = field(node, "path");
      const list = field(node, "list");
      const base =
        path === null ? prefix : join(prefix, path.text.replace(/\s+/g, ""));
      if (list !== null) rustUseBindings(list, base, bind, glob);
      return;
    }
    case "use_list":
      for (const item of named(node)) rustUseBindings(item, prefix, bind, glob);
      return;
    case "self":
      bind(lastSegment(prefix), prefix);
      return;
    default: {
      const path = join(prefix, node.text.replace(/\s+/g, ""));
      bind(lastSegment(path), path);
    }
  }
}

/** `::std::env::var` and `core::env` name the same items as `std::env`. */
function rustCanonical(path: string): string {
  return path.replace(/^::/, "").replace(/^core::/, "std::");
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

/**
 * Built-in attributes that generate no code that calls or panics. Any other
 * attribute (a procedural attribute macro such as `#[tokio::main]`) may
 * rewrite the item, so `calls` and `thrown` refuse it.
 */
const RUST_INERT_ATTRIBUTES = new Set([
  "allow",
  "warn",
  "deny",
  "forbid",
  "expect",
  "deprecated",
  "must_use",
  "doc",
  "inline",
  "cold",
  "track_caller",
  "non_exhaustive",
  "repr",
  "test",
  "ignore",
  "should_panic",
  "automatically_derived",
  "no_mangle",
  "export_name",
  "link_name",
  "used",
  "path",
  "macro_use",
  "macro_export",
  "feature",
  "no_std",
  "no_implicit_prelude",
  "recursion_limit",
  "crate_type",
  "crate_name",
  "rustfmt::skip",
  "diagnostic::on_unimplemented",
]);
/** Derives whose generated impls call nothing outside the type's fields. */
const RUST_STD_DERIVES = new Set([
  "Debug",
  "Clone",
  "Copy",
  "PartialEq",
  "Eq",
  "Hash",
  "Default",
  "PartialOrd",
  "Ord",
]);

function rustAttributeHidesCalls(node: Node): boolean {
  if (node.type !== "attribute_item" && node.type !== "inner_attribute_item")
    return false;
  const attribute = named(node).find((child) => child.type === "attribute");
  if (attribute === undefined) return true;
  const path = named(attribute)[0]?.text.replace(/\s+/g, "") ?? "";
  // cfg and cfg_attr are reported as conditional compilation.
  if (path === "cfg" || path === "cfg_attr") return false;
  if (path.startsWith("clippy::") || path.startsWith("rustfmt::")) return false;
  if (path === "derive") {
    const list = field(attribute, "arguments");
    const traits = list === null ? [] : named(list).map((item) => item.text);
    return traits.some(
      (item) =>
        !RUST_STD_DERIVES.has(item.replace(/^(?:::)?(?:std|core)::\w+::/, "")),
    );
  }
  return !RUST_INERT_ATTRIBUTES.has(path);
}

const RUST: Reader = {
  isCall: (node) => node.type === "call_expression",
  callee: (call) => field(call, "function"),
  ignoredCall(call) {
    const target = field(call, "function");
    const inner =
      target?.type === "parenthesized_expression" ? named(target)[0] : target;
    return inner?.type === "closure_expression";
  },
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
  context(root) {
    const context = emptyContext();
    for (const declaration of descendants(root, "use_declaration")) {
      const argument = field(declaration, "argument");
      if (argument === null) continue;
      rustUseBindings(
        argument,
        "",
        (local, path) => context.aliases.set(local, rustCanonical(path)),
        (path, node) => {
          // A glob brings names in unqualified: a bare call may be any of them.
          context.callsAmbiguous.push(at(node));
          if (/^(?:std|env|self::env)(?:::env)?$/.test(rustCanonical(path)))
            context.envAmbiguous.push(at(node));
        },
      );
    }
    return context;
  },
  candidates(name, context) {
    const resolved = rustCanonical(
      aliased(rustCanonical(name), "::", context.aliases),
    );
    // `env::var` after `use std::env` (or with the std prelude path) is std::env::var.
    const std = resolved.startsWith("env::") ? `std::${resolved}` : resolved;
    return unique([std, resolved, name]);
  },
  reference(node) {
    if (node.type !== "scoped_identifier" && node.type !== "identifier")
      return null;
    return rustChain(node);
  },
  envGetters: RUST_ENV,
  envWhole: RUST_ENV_WHOLE,
  envSpecial(node, _context, members, unresolved) {
    if (
      node.type !== "macro_invocation" ||
      !RUST_ENV_MACROS.has(rustCanonical(rustMacroName(node)))
    )
      return false;
    const tokens = named(node).find((child) => child.type === "token_tree");
    const value = literal(tokens === undefined ? null : named(tokens)[0]);
    if (value === null) unresolved.push(at(node));
    else members.push(value);
    return true;
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
  thrown() {
    // Rust has no throw statement; panics are macros, refused with the rest.
  },
  hidesCalls: (node) =>
    node.type === "macro_invocation" || rustAttributeHidesCalls(node),
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
  const context = reader.context(root);
  if (extract === "env") unresolved.push(...context.envAmbiguous);
  if (extract === "calls" || extract === "string_args")
    unresolved.push(...context.callsAmbiguous);
  const isCallee = (node: Node): boolean => {
    const parent = node.parent;
    return (
      parent !== null &&
      reader.isCall(parent) &&
      reader.callee(parent)?.id === node.id
    );
  };
  const catchNames: string[] = [];
  const visit = (node: Node): void => {
    if (reader.skip(node)) return;
    if (reader.conditional(node)) unresolved.push(at(node));
    const caught = reader.catchName(node);
    if (caught !== null) catchNames.push(caught);
    const callName = reader.isCall(node) ? reader.callName(node) : null;
    const names = callName === null ? [] : reader.candidates(callName, context);
    switch (extract) {
      case "imports":
        reader.imports(node, members, unresolved);
        break;
      case "env": {
        if (reader.envSpecial?.(node, context, members, unresolved)) return;
        if (names.some((name) => reader.envGetters.has(name))) {
          const args = reader.callArguments(node);
          const value = literal(args[0]);
          if (value === null) unresolved.push(at(node));
          else members.push(value);
          return;
        }
        if (names.some((name) => reader.envWhole.has(name))) {
          unresolved.push(at(node));
          return;
        }
        // An environment getter used as a value is handed on: whatever it is
        // later called with is not known here.
        if (
          !isCallee(node) &&
          !REFERENCE_PARENTS.has(node.parent?.type ?? "")
        ) {
          const reference = reader.reference(node);
          if (
            reference !== null &&
            reader
              .candidates(reference, context)
              .some(
                (name) =>
                  reader.envGetters.has(name) || reader.envWhole.has(name),
              )
          ) {
            unresolved.push(at(node));
            return;
          }
        }
        break;
      }
      case "calls":
        if (reader.hidesCalls(node, names, context)) unresolved.push(at(node));
        else if (callName !== null) {
          members.push(callName);
          // An alias or static import is listed under what it names, too.
          for (const name of names)
            if (name !== callName && !name.startsWith(ANY_RECEIVER))
              members.push(name);
        } else if (reader.isCall(node) && !reader.ignoredCall(node))
          // A call through an element, a call result or a cast names no function.
          unresolved.push(at(node));
        else {
          const passed = reader.methodReference?.(node) ?? null;
          if (passed !== null) members.push(passed);
        }
        break;
      case "string_args":
        if (names.some((name) => calleeMatches(name, callee))) {
          const value = literal(reader.callArguments(node)[0]);
          if (value === null) unresolved.push(at(node));
          else members.push(value);
        }
        break;
      case "thrown":
        if (reader.hidesCalls(node, names, context) && language === "rust")
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
