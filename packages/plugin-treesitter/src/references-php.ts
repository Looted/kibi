import { posix } from "node:path";
import type { Node } from "web-tree-sitter";
import { type UnresolvedRow, at, field, named } from "./reference-nodes.js";

/**
 * PHP references. Names resolve through the file's namespace and `use`
 * imports; function names are case-insensitive in PHP and are listed in
 * lower case, without the leading `\`. A call whose target is computed at
 * run time (`$f()`, `$o->$m()`, `call_user_func($x)`), code built from text
 * (`eval`, `create_function`) and environment reads Kibi cannot name
 * (`getenv($name)`, `$_ENV` handed on, variable variables) are unresolved
 * rows, so a claim is never decided over code Kibi did not see.
 */

type PhpExtract =
  | "env"
  | "imports"
  | "calls"
  | "string_args"
  | "thrown"
  | "property";

interface PhpRead {
  members: string[];
  unresolved: UnresolvedRow[];
}

interface Scope {
  readonly start: number;
  end: number;
  readonly namespace: string;
  /** Lower-case alias to the class or namespace it imports. */
  readonly classes: Map<string, string>;
  /** Lower-case alias to the function it imports. */
  readonly functions: Map<string, string>;
}

/** Superglobals that hold the environment (`$_SERVER` holds it in the CLI and under FPM). */
const ENV_ARRAYS = new Set(["_ENV", "_SERVER"]);

/** Getters that read one variable named by their first argument. */
const ENV_GETTERS = new Set([
  "getenv",
  "apache_getenv",
  "env",
  "illuminate\\support\\env::get",
]);

/** `filter_input(INPUT_ENV, 'X')` reads X. */
const ENV_INPUTS = new Set(["INPUT_ENV", "INPUT_SERVER"]);

/**
 * Builtins that call a callable they are given, by its argument position
 * (`array_map('trim', ...)` calls `trim`).
 */
const CALLABLE_ARGS: ReadonlyMap<string, number> = new Map([
  ["call_user_func", 0],
  ["call_user_func_array", 0],
  ["forward_static_call", 0],
  ["forward_static_call_array", 0],
  ["array_map", 0],
  ["array_filter", 1],
  ["array_walk", 1],
  ["array_walk_recursive", 1],
  ["array_reduce", 1],
  ["usort", 1],
  ["uasort", 1],
  ["uksort", 1],
  ["array_udiff", -1],
  ["array_uintersect", -1],
  ["iterator_apply", 1],
  ["register_shutdown_function", 0],
  ["register_tick_function", 0],
  ["spl_autoload_register", 0],
  ["set_error_handler", 0],
  ["set_exception_handler", 0],
  ["ob_start", 0],
  ["preg_replace_callback", 1],
  ["header_register_callback", 0],
  ["closure::fromcallable", 0],
  ["is_callable", -2],
]);

/** Code built from text: every extract is unknowable there. */
const CODE_FUNCTIONS = new Set(["create_function"]);

function lower(name: string): string {
  return name.toLowerCase();
}

/** The value of a PHP escape sequence, or null for one Kibi does not decode. */
function decodeEscape(text: string): string | null {
  const simple: Readonly<Record<string, string>> = {
    "\\n": "\n",
    "\\t": "\t",
    "\\r": "\r",
    "\\v": "\v",
    "\\e": "\x1b",
    "\\f": "\f",
    "\\\\": "\\",
    "\\$": "$",
    '\\"': '"',
  };
  const known = simple[text];
  if (known !== undefined) return known;
  const hex = /^\\x([0-9A-Fa-f]{1,2})$/.exec(text);
  if (hex !== null)
    return String.fromCharCode(Number.parseInt(hex[1] as string, 16));
  const octal = /^\\([0-7]{1,3})$/.exec(text);
  if (octal !== null)
    return String.fromCharCode(Number.parseInt(octal[1] as string, 8) & 0xff);
  const unicode = /^\\u\{([0-9A-Fa-f]+)\}$/.exec(text);
  const point =
    unicode === null ? Number.NaN : Number.parseInt(unicode[1] as string, 16);
  return point <= 0x10ffff ? String.fromCodePoint(point) : null;
}

/** The value of a `string` or `encapsed_string` node with no interpolation. */
function stringValue(node: Node): string | null {
  if (node.type === "string") {
    const text = node.text;
    const body = /^[bB]?'([\s\S]*)'$/.exec(text)?.[1];
    if (body === undefined) return null;
    return body.replace(/\\([\\'])/g, "$1");
  }
  if (!/^[bB]?"/.test(node.text)) return null;
  let value = "";
  for (const part of named(node)) {
    if (part.type === "string_content") value += part.text;
    else if (part.type === "escape_sequence") {
      const decoded = decodeEscape(part.text);
      if (decoded === null) return null;
      value += decoded;
    } else return null;
  }
  return value;
}

function stripLeading(name: string): string {
  return name.replace(/^\\/, "").replace(/\s+/g, "");
}

function finalName(name: string): string {
  return name.slice(name.lastIndexOf("\\") + 1);
}

/** Whether a call name is the callee: the same name, or ending in it at `\` or `::`. */
function calleeMatches(name: string, callee: string): boolean {
  if (callee === "") return false;
  const a = lower(name);
  const b = lower(stripLeading(callee));
  return a === b || a.endsWith(`\\${b}`) || a.endsWith(`::${b}`);
}

/** Read one extract of a parsed PHP file. */
// implements REQ-kibi-tree-sitter-script-references
export function phpReferences(
  root: Node,
  extract: PhpExtract,
  options: { callee: string; key: string; file: string },
): PhpRead {
  const members: string[] = [];
  const unresolved: UnresolvedRow[] = [];
  const env = extract === "env";
  const refuse = (node: Node): void => {
    unresolved.push(at(node));
  };

  // Namespaces and imports, in file order.
  const scopes: Scope[] = [];
  const newScope = (start: number, end: number, namespace: string): Scope => {
    const scope = {
      start,
      end,
      namespace,
      classes: new Map(),
      functions: new Map(),
    };
    scopes.push(scope);
    return scope;
  };
  const declared = new Set<string>();
  {
    let current = newScope(0, root.endIndex, "");
    const imports = (declaration: Node, scope: Scope): void => {
      const kind =
        /^use\s+(function|const)\b/i
          .exec(declaration.text)?.[1]
          ?.toLowerCase() ?? "class";
      const prefixNode = named(declaration).find(
        (child) => child.type === "namespace_name",
      );
      const prefix =
        prefixNode === undefined ? "" : `${stripLeading(prefixNode.text)}\\`;
      const group = field(declaration, "body");
      const clauses = (group ?? declaration).namedChildren.filter(
        (child) => child?.type === "namespace_use_clause",
      ) as Node[];
      for (const clause of clauses) {
        const target = named(clause).find(
          (child) => child.type === "qualified_name" || child.type === "name",
        );
        if (target === undefined) continue;
        const clauseKind =
          /^\s*(function|const)\b/i.exec(clause.text)?.[1]?.toLowerCase() ??
          kind;
        const full = `${prefix}${stripLeading(target.text)}`;
        const alias = field(clause, "alias")?.text ?? finalName(full);
        if (extract === "imports") members.push(full);
        if (clauseKind === "function")
          scope.functions.set(lower(alias), lower(full));
        else if (clauseKind === "class") scope.classes.set(lower(alias), full);
      }
    };
    const walk = (node: Node, outer: Scope): void => {
      let scope = outer;
      for (const child of named(node)) {
        if (child.type === "namespace_definition") {
          const name = stripLeading(field(child, "name")?.text ?? "");
          const body = field(child, "body");
          if (body !== null) {
            const inner = newScope(body.startIndex, body.endIndex, name);
            walk(body, inner);
          } else {
            // `namespace X;` holds until the next namespace statement.
            current.end = child.startIndex;
            current = newScope(child.startIndex, root.endIndex, name);
            scope = current;
          }
          continue;
        }
        if (child.type === "namespace_use_declaration") imports(child, scope);
        if (child.type === "function_definition") {
          const name = field(child, "name")?.text ?? "";
          declared.add(
            lower(
              scope.namespace === "" ? name : `${scope.namespace}\\${name}`,
            ),
          );
        }
        if (
          child.type === "compound_statement" ||
          child.type === "declare_statement"
        )
          walk(child, scope);
      }
    };
    walk(root, current);
  }
  const scopeOf = (node: Node): Scope => {
    let found = scopes[0] as Scope;
    for (const scope of scopes)
      if (
        scope.start <= node.startIndex &&
        node.startIndex < scope.end &&
        scope.start >= found.start
      )
        found = scope;
    return found;
  };

  const resolveClass = (node: Node): string | null => {
    const scope = scopeOf(node);
    const text = node.text.replace(/\s+/g, "");
    switch (node.type) {
      case "name": {
        const alias = scope.classes.get(lower(text));
        if (alias !== undefined) return alias;
        return scope.namespace === "" ? text : `${scope.namespace}\\${text}`;
      }
      case "qualified_name": {
        if (text.startsWith("\\")) return text.slice(1);
        const [first = "", ...rest] = text.split("\\");
        const alias = scope.classes.get(lower(first));
        if (alias !== undefined) return [alias, ...rest].join("\\");
        return scope.namespace === "" ? text : `${scope.namespace}\\${text}`;
      }
      case "relative_name":
        return `${scope.namespace === "" ? "" : `${scope.namespace}\\`}${text.replace(/^namespace\\/i, "")}`;
      case "relative_scope": {
        const owner = enclosingClass(node);
        if (owner === null) return null;
        if (lower(text) === "self") {
          const name = field(owner, "name")?.text;
          return name === undefined
            ? null
            : scope.namespace === ""
              ? name
              : `${scope.namespace}\\${name}`;
        }
        if (lower(text) === "parent") {
          const base = named(owner).find(
            (child) => child.type === "base_clause",
          );
          const parent = base === undefined ? undefined : named(base)[0];
          return parent === undefined ? null : resolveClass(parent);
        }
        return null;
      }
      default:
        return null;
    }
  };

  /** A function call target's names, and the namespace that may shadow it. */
  const resolveFunction = (
    node: Node,
  ): { name: string; namespace: string | null } | null => {
    const scope = scopeOf(node);
    const text = node.text.replace(/\s+/g, "");
    switch (node.type) {
      case "name": {
        const alias = scope.functions.get(lower(text));
        if (alias !== undefined) return { name: alias, namespace: null };
        if (scope.namespace === "")
          return { name: lower(text), namespace: null };
        const local = lower(`${scope.namespace}\\${text}`);
        if (declared.has(local)) return { name: local, namespace: null };
        return { name: lower(text), namespace: scope.namespace };
      }
      case "qualified_name":
      case "relative_name": {
        if (text.startsWith("\\"))
          return { name: lower(text.slice(1)), namespace: null };
        const resolved = resolveClass(node);
        return resolved === null
          ? null
          : { name: lower(resolved), namespace: null };
      }
      default:
        return null;
    }
  };

  /** A literal value: a string without interpolation, a number, a boolean, null or `X::class`. */
  const literal = (node: Node | null | undefined): string | null => {
    if (node === null || node === undefined) return null;
    switch (node.type) {
      case "string":
      case "encapsed_string":
        return stringValue(node);
      case "integer":
      case "float":
        return node.text.replaceAll("_", "");
      case "boolean":
        return lower(node.text);
      case "null":
        return "null";
      case "parenthesized_expression":
        return literal(named(node)[0]);
      case "unary_op_expression": {
        const operand = named(node)[0];
        return node.text.trimStart().startsWith("-") &&
          (operand?.type === "integer" || operand?.type === "float")
          ? `-${operand.text}`
          : null;
      }
      case "binary_expression": {
        if (field(node, "operator")?.text !== ".") return null;
        const left = literal(field(node, "left"));
        const right = literal(field(node, "right"));
        return left === null || right === null ? null : left + right;
      }
      case "class_constant_access_expression": {
        const [scope, constant] = named(node);
        if (scope === undefined || lower(constant?.text ?? "") !== "class")
          return null;
        return resolveClass(scope);
      }
      default:
        return null;
    }
  };

  /** `__DIR__ . '/x.php'` and `dirname(__FILE__) . '/x.php'`: a path from the file's folder. */
  const includePath = (node: Node | undefined): string | null => {
    if (node === undefined) return null;
    const inner =
      node.type === "parenthesized_expression" ? named(node)[0] : node;
    if (inner === undefined) return null;
    const value = literal(inner);
    if (value !== null) return value;
    if (
      inner.type !== "binary_expression" ||
      field(inner, "operator")?.text !== "."
    )
      return null;
    const left = field(inner, "left");
    const rest = literal(field(inner, "right"));
    const here =
      left !== null &&
      (left.text === "__DIR__" ||
        /^dirname\(\s*__FILE__\s*\)$/i.test(left.text.replace(/\s+/g, "")));
    if (!here || rest === null || !rest.startsWith("/")) return null;
    return posix.normalize(posix.join(posix.dirname(options.file), rest));
  };

  const shadow = (name: string, namespace: string, node: Node): void => {
    unresolved.push({
      line: node.startPosition.row + 1,
      text: `${finalName(name)} may be a function of namespace ${namespace}: ${at(node).text}`,
    });
  };

  /** The names a call reaches, or null when its target is computed. */
  const callNames = (
    node: Node,
  ): {
    names: string[];
    namespace: string | null;
    dynamicFunction: boolean;
  } | null => {
    switch (node.type) {
      case "function_call_expression": {
        let target = field(node, "function");
        while (target?.type === "parenthesized_expression")
          target = named(target)[0] ?? null;
        if (target === null) return null;
        const literalName =
          target.type === "string" || target.type === "encapsed_string"
            ? stringValue(target)
            : null;
        if (literalName !== null) {
          const name = stripLeading(literalName);
          return {
            names: [name.includes("::") ? name : lower(name)],
            namespace: null,
            dynamicFunction: false,
          };
        }
        const resolved = resolveFunction(target);
        if (resolved === null)
          return { names: [], namespace: null, dynamicFunction: true };
        return {
          names: [resolved.name],
          namespace: resolved.namespace,
          dynamicFunction: false,
        };
      }
      case "member_call_expression":
      case "nullsafe_member_call_expression": {
        const method = field(node, "name");
        if (method?.type !== "name") return null;
        return {
          names: [`*.${method.text}`],
          namespace: null,
          dynamicFunction: false,
        };
      }
      default: {
        // scoped_call_expression, the one other call isCall admits.
        const method = field(node, "name");
        const scope = field(node, "scope");
        if (method?.type !== "name" || scope === null) return null;
        const owner =
          scope.type === "name" ||
          scope.type === "qualified_name" ||
          scope.type === "relative_scope" ||
          scope.type === "relative_name"
            ? resolveClass(scope)
            : null;
        return {
          names: [
            owner === null ? `*.${method.text}` : `${owner}::${method.text}`,
          ],
          namespace: null,
          dynamicFunction: false,
        };
      }
    }
  };

  const isCall = (node: Node): boolean =>
    node.type === "function_call_expression" ||
    node.type === "member_call_expression" ||
    node.type === "nullsafe_member_call_expression" ||
    node.type === "scoped_call_expression";

  const callArguments = (node: Node): Node[] => {
    const list = field(node, "arguments");
    if (list === null) return [];
    return named(list).filter(
      (child) =>
        child.type === "argument" || child.type === "variadic_placeholder",
    );
  };
  const argumentValue = (argument: Node | undefined): Node | undefined =>
    argument === undefined
      ? undefined
      : named(argument)
          .filter((child) => child.id !== field(argument, "name")?.id)
          .at(-1);
  const firstPositional = (node: Node): Node | undefined => {
    const first = callArguments(node)[0];
    if (
      first === undefined ||
      first.type !== "argument" ||
      field(first, "name") !== null
    )
      return undefined;
    return first;
  };

  /** A callable a builtin is handed: `'trim'`, `'X::m'`, `[X::class, 'm']`, `[$o, 'm']`. */
  const callable = (node: Node | undefined): string[] | null => {
    if (node === undefined) return [];
    const value = literal(node);
    if (value !== null) {
      const name = stripLeading(value);
      return [name.includes("::") ? name : lower(name)];
    }
    if (
      node.type === "anonymous_function" ||
      node.type === "arrow_function" ||
      node.type === "anonymous_function_creation_expression"
    )
      return [];
    if (node.type === "array_creation_expression") {
      const items = named(node).map((item) => named(item));
      if (items.length !== 2 || items.some((item) => item.length !== 1))
        return null;
      const [owner, method] = items.map((item) => item[0] as Node);
      const methodName = literal(method);
      if (methodName === null || owner === undefined) return null;
      const ownerName = owner.type === "variable_name" ? null : literal(owner);
      return [
        ownerName === null
          ? `*.${methodName}`
          : `${stripLeading(ownerName)}::${methodName}`,
      ];
    }
    // A call that returns a callable (`strlen(...)`) is listed where it is made.
    if (
      node.type === "function_call_expression" &&
      callArguments(node).some((child) => child.type === "variadic_placeholder")
    )
      return [];
    return null;
  };

  const catchNames: string[] = [];

  const visit = (node: Node): void => {
    switch (node.type) {
      case "function_call_expression":
      case "member_call_expression":
      case "nullsafe_member_call_expression":
      case "scoped_call_expression": {
        const read = callNames(node);
        if (read === null || read.dynamicFunction) {
          // A method name or target computed at run time.
          const functionLike =
            node.type === "function_call_expression" ||
            read?.dynamicFunction === true;
          if (
            extract === "calls" ||
            extract === "string_args" ||
            (env && functionLike)
          )
            refuse(node);
          break;
        }
        const { names, namespace } = read;
        const name = names[0] as string;
        if (
          namespace !== null &&
          (extract === "calls" ||
            extract === "string_args" ||
            (env && ENV_GETTERS.has(name)))
        )
          shadow(name, namespace, node);
        const firstValue = argumentValue(firstPositional(node));
        const codeText =
          name === "assert" &&
          (firstValue?.type === "string" ||
            firstValue?.type === "encapsed_string");
        if (name === "eval" || CODE_FUNCTIONS.has(name) || codeText) {
          if (extract !== "property") refuse(node);
          break;
        }
        if (extract === "calls") members.push(...names);
        if (env && ENV_GETTERS.has(lower(name))) {
          const first = firstPositional(node);
          const value = literal(argumentValue(first));
          if (value === null || first === undefined) refuse(node);
          else members.push(value);
        }
        if (
          env &&
          (name === "filter_input" ||
            name === "filter_input_array" ||
            name === "filter_has_var")
        ) {
          const source = argumentValue(callArguments(node)[0])?.text ?? "";
          if (ENV_INPUTS.has(source.replace(/^\\/, ""))) {
            const variable =
              name === "filter_input_array"
                ? null
                : literal(argumentValue(callArguments(node)[1]));
            if (variable === null) refuse(node);
            else members.push(variable);
          } else if (!/^\\?INPUT_(?:GET|POST|COOKIE|REQUEST)$/.test(source))
            refuse(node);
        }
        if (env && name === "get_defined_vars") refuse(node);
        if (
          extract === "string_args" &&
          names.some((candidate) => calleeMatches(candidate, options.callee))
        ) {
          const first = firstPositional(node);
          if (first !== undefined) {
            const value = literal(argumentValue(first));
            if (value === null) refuse(node);
            else members.push(value);
          }
        }
        const position = CALLABLE_ARGS.get(lower(name));
        if (
          position !== undefined &&
          position >= -1 &&
          (extract === "calls" || extract === "string_args" || env)
        ) {
          const list = callArguments(node);
          const handed =
            position === -1
              ? list.slice(-1)
              : list.slice(position, position + 1);
          for (const argument of handed) {
            const reached = callable(argumentValue(argument));
            if (reached === null) refuse(argument);
            else if (extract === "calls") members.push(...reached);
            else if (
              env &&
              reached.some((target) => ENV_GETTERS.has(lower(target)))
            )
              refuse(argument);
            else if (
              extract === "string_args" &&
              reached.some((target) => calleeMatches(target, options.callee))
            )
              refuse(argument);
          }
        }
        break;
      }
      case "shell_command_expression":
        if (extract === "calls") members.push("shell_exec");
        if (
          extract === "string_args" &&
          calleeMatches("shell_exec", options.callee)
        ) {
          const value = named(node).every(
            (part) => part.type === "string_content",
          )
            ? named(node)
                .map((part) => part.text)
                .join("")
            : null;
          if (value === null) refuse(node);
          else members.push(value);
        }
        break;
      case "exit_statement":
        if (extract === "calls") members.push("exit");
        break;
      case "include_expression":
      case "include_once_expression":
      case "require_expression":
      case "require_once_expression": {
        if (extract !== "imports") break;
        const path = includePath(named(node)[0]);
        if (path === null) refuse(node);
        else members.push(path);
        break;
      }
      case "subscript_expression": {
        if (!env) break;
        const [base, index] = named(node);
        if (
          base?.type === "variable_name" &&
          ENV_ARRAYS.has(base.text.replace(/^\$/, ""))
        ) {
          const value = literal(index);
          if (value === null) refuse(node);
          else members.push(value);
          if (index !== undefined) visit(index);
          return;
        }
        if (base?.type === "variable_name" && base.text === "$GLOBALS") {
          const value = literal(index);
          if (value === null || ENV_ARRAYS.has(value) || value === "GLOBALS")
            refuse(node);
          if (index !== undefined) visit(index);
          return;
        }
        break;
      }
      case "variable_name": {
        if (!env) break;
        const name = node.text.replace(/^\$/, "");
        // A superglobal handed on or iterated: any key may be read.
        if (ENV_ARRAYS.has(name) || name === "GLOBALS") refuse(node);
        break;
      }
      case "dynamic_variable_name":
        if (env) refuse(node);
        break;
      case "string":
      case "encapsed_string": {
        // A string may be called as a function: `$f = 'getenv'; $f('X')`.
        const value = stringValue(node);
        if (env && value !== null && /^\\?(?:apache_)?getenv$/i.test(value))
          refuse(node);
        break;
      }
      case "catch_clause": {
        const name = field(node, "name")?.text ?? null;
        if (name !== null) catchNames.push(name);
        for (const child of named(node)) visit(child);
        if (name !== null) catchNames.pop();
        return;
      }
      case "throw_expression": {
        if (extract !== "thrown") break;
        const thrown = named(node)[0];
        if (thrown?.type === "object_creation_expression") {
          const type = named(thrown)[0];
          const owner =
            type === undefined || type.type === "variable_name"
              ? null
              : resolveClass(type);
          if (owner === null) refuse(node);
          else members.push(owner);
        } else if (thrown !== undefined && isCall(thrown)) {
          const read = callNames(thrown);
          if (read === null || read.dynamicFunction) refuse(node);
          else {
            members.push(...read.names);
            if (read.namespace !== null)
              shadow(read.names[0] as string, read.namespace, thrown);
          }
        } else if (
          !(
            thrown?.type === "variable_name" && catchNames.includes(thrown.text)
          )
        )
          refuse(node);
        break;
      }
      case "array_element_initializer": {
        if (extract !== "property") break;
        const parts = named(node);
        if (parts.length === 1 && parts[0]?.type === "variadic_unpacking")
          refuse(node);
        if (parts.length !== 2) break;
        const key = literal(parts[0]);
        if (key === null) refuse(node);
        else if (key === options.key) {
          const value = literal(parts[1]);
          if (value === null) refuse(node);
          else members.push(value);
        }
        break;
      }
      case "argument": {
        if (extract !== "property") break;
        const name = field(node, "name");
        if (name !== null && name.text === options.key) {
          const value = literal(argumentValue(node));
          if (value === null) refuse(node);
          else members.push(value);
        }
        break;
      }
      case "property_element":
      case "const_element": {
        if (extract !== "property") break;
        const name = (field(node, "name") ?? named(node)[0])?.text.replace(
          /^\$/,
          "",
        );
        if (name !== options.key) break;
        const value =
          node.type === "property_element"
            ? field(node, "default_value")
            : (named(node)[1] ?? null);
        if (value === null) break;
        const read = literal(value);
        if (read === null) refuse(node);
        else members.push(read);
        break;
      }
    }
    for (const child of named(node)) visit(child);
  };
  visit(root);
  return { members, unresolved };
}

function enclosingClass(node: Node): Node | null {
  for (let current = node.parent; current !== null; current = current.parent)
    if (
      current.type === "class_declaration" ||
      current.type === "trait_declaration" ||
      current.type === "enum_declaration"
    )
      return current;
  return null;
}
