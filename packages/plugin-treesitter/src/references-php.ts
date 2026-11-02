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

/** An import and where it is: it names nothing in the code before it. */
interface Imported {
  readonly name: string;
  readonly at: number;
}

interface Scope {
  readonly start: number;
  end: number;
  readonly namespace: string;
  /** Lower-case alias to the class or namespace it imports, from where. */
  readonly classes: Map<string, Imported>;
  /** Lower-case alias to the function it imports, from where. */
  readonly functions: Map<string, Imported>;
}

/** Superglobals that hold the environment (`$_SERVER` holds it in the CLI and under FPM). */
const ENV_ARRAYS = new Set(["_ENV", "_SERVER"]);

/** Getters that read one variable named by their first argument. */
const ENV_GETTERS = new Set([
  "getenv",
  "apache_getenv",
  "env",
  "illuminate\\support\\env::get",
  "illuminate\\support\\env::getorfail",
]);

/** Laravel's environment class: its getters may be reached through a subclass. */
const ENV_CLASS = "illuminate\\support\\env";
const ENV_METHODS = new Set(["get", "getorfail", "getrepository"]);

/** `filter_input(INPUT_ENV, 'X')` reads X. */
const ENV_INPUTS = new Set(["INPUT_ENV", "INPUT_SERVER"]);

/**
 * Builtins that call a callable they are given, by its argument position
 * (`array_map('trim', ...)` calls `trim`).
 */
const CALLABLE_ARGS: ReadonlyMap<string, readonly number[] | "all"> = new Map<
  string,
  readonly number[] | "all"
>([
  ["call_user_func", [0]],
  ["call_user_func_array", [0]],
  ["forward_static_call", [0]],
  ["forward_static_call_array", [0]],
  ["array_map", [0]],
  ["array_filter", [1]],
  ["array_find", [1]],
  ["array_find_key", [1]],
  ["array_any", [1]],
  ["array_all", [1]],
  ["array_walk", [1]],
  ["array_walk_recursive", [1]],
  ["array_reduce", [1]],
  ["usort", [1]],
  ["uasort", [1]],
  ["uksort", [1]],
  ["array_udiff", [-1]],
  ["array_uintersect", [-1]],
  ["array_diff_uassoc", [-1]],
  ["array_diff_ukey", [-1]],
  ["array_intersect_uassoc", [-1]],
  ["array_intersect_ukey", [-1]],
  ["array_udiff_assoc", [-1]],
  ["array_uintersect_assoc", [-1]],
  ["array_udiff_uassoc", [-2, -1]],
  ["array_uintersect_uassoc", [-2, -1]],
  ["iterator_apply", [1]],
  ["register_shutdown_function", [0]],
  ["register_tick_function", [0]],
  ["spl_autoload_register", [0]],
  ["set_error_handler", [0]],
  ["set_exception_handler", [0]],
  ["ob_start", [0]],
  ["preg_replace_callback", [1]],
  ["mb_ereg_replace_callback", [1]],
  ["header_register_callback", [0]],
  ["pcntl_signal", [1]],
  ["sapi_windows_set_ctrl_handler", [0]],
  ["readline_completion_function", [0]],
  ["readline_callback_handler_install", [1]],
  ["libxml_set_external_entity_loader", [0]],
  ["xml_set_element_handler", [1, 2]],
  ["xml_set_character_data_handler", [1]],
  ["xml_set_default_handler", [1]],
  ["xml_set_processing_instruction_handler", [1]],
  ["xml_set_start_namespace_decl_handler", [1]],
  ["xml_set_end_namespace_decl_handler", [1]],
  ["xml_set_unparsed_entity_decl_handler", [1]],
  ["xml_set_notation_decl_handler", [1]],
  ["xml_set_external_entity_ref_handler", [1]],
  ["session_set_save_handler", "all"],
  ["closure::fromcallable", [0]],
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

const INT64_MAX = 9223372036854775807n;

/**
 * An integer literal as a decimal (`0x1F90`, `0755`, `0o17`, `0b11`,
 * `1_000`), or null when PHP reads it as a float (past the int range).
 */
function canonicalInteger(text: string): string | null {
  const digits = text.replaceAll("_", "").toLowerCase();
  let value: bigint;
  if (/^0x[0-9a-f]+$/.test(digits) || /^0b[01]+$/.test(digits))
    value = BigInt(digits);
  else if (/^0o[0-7]+$/.test(digits)) value = BigInt(digits);
  else if (/^0[0-7]+$/.test(digits)) value = BigInt(`0o${digits.slice(1)}`);
  // The grammar admits no other spelling: a decimal.
  else value = BigInt(digits);
  return value > INT64_MAX ? null : value.toString();
}

/**
 * A float literal in its shortest decimal form (`1.50` is 1.5, `1e3` is
 * 1000), or null when the value has more digits than a double holds
 * exactly or needs an exponent.
 */
function canonicalFloat(text: string): string | null {
  const digits = text.replaceAll("_", "");
  const significant = digits
    .replace(/[eE].*$/, "")
    .replace(".", "")
    .replace(/^0+/, "")
    .replace(/0+$/, "");
  if (significant.length > 15) return null;
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  const shown = String(value);
  return /e/i.test(shown) ? null : shown;
}

/** A number literal node's value, or null. */
function numberValue(node: Node): string | null {
  if (node.type === "integer") return canonicalInteger(node.text);
  if (node.type === "float") return canonicalFloat(node.text);
  return null;
}

/**
 * The text of a heredoc or nowdoc without interpolation or escapes: the
 * lines between its markers, less the closing marker's indentation.
 */
function docValue(node: Node): string | null {
  const body = field(node, "value");
  const end = field(node, "end_tag");
  if (body === null || end === null) return null;
  if (
    node.type === "heredoc" &&
    named(body).some((part) => part.type !== "string_content")
  )
    return null;
  const text = node.text;
  const open = text.indexOf("\n");
  const close = text.lastIndexOf("\n", end.startIndex - node.startIndex);
  if (open < 0 || close < open) return null;
  const raw = text.slice(open + 1, close + 1 > open + 1 ? close : open + 1);
  if (node.type === "heredoc" && raw.includes("\\")) return null;
  const indent = text.slice(close + 1, end.startIndex - node.startIndex);
  if (!/^[ \t]*$/.test(indent)) return null;
  const lines = close === open ? [] : raw.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (line.trim() === "" && line.length <= indent.length) {
      out.push("");
      continue;
    }
    if (!line.startsWith(indent)) return null;
    out.push(line.slice(indent.length));
  }
  return out.join("\n");
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
        const at = declaration.endIndex;
        if (clauseKind === "function")
          scope.functions.set(lower(alias), { name: lower(full), at });
        else if (clauseKind === "class")
          scope.classes.set(lower(alias), { name: full, at });
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
  /** The import of `alias` in effect at `node`. */
  const imported = (
    map: Map<string, Imported>,
    alias: string,
    node: Node,
  ): string | undefined => {
    const entry = map.get(lower(alias));
    return entry !== undefined && entry.at <= node.startIndex
      ? entry.name
      : undefined;
  };
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
        const relative = relativeClass(node, text);
        if (relative !== undefined) return relative;
        const alias = imported(scope.classes, text, node);
        if (alias !== undefined) return alias;
        return scope.namespace === "" ? text : `${scope.namespace}\\${text}`;
      }
      case "qualified_name": {
        if (text.startsWith("\\")) return text.slice(1);
        const [first = "", ...rest] = text.split("\\");
        const alias = imported(scope.classes, first, node);
        if (alias !== undefined) return [alias, ...rest].join("\\");
        return scope.namespace === "" ? text : `${scope.namespace}\\${text}`;
      }
      case "relative_name":
        return `${scope.namespace === "" ? "" : `${scope.namespace}\\`}${text.replace(/^namespace\\/i, "")}`;
      case "relative_scope":
        return relativeClass(node, text) ?? null;
      default:
        return null;
    }
  };

  /**
   * `self`, `parent` and `static` where `node` is: the class, its parent, or
   * null for `static` (a subclass may be meant) and outside a class;
   * undefined for any other word.
   */
  function relativeClass(node: Node, word: string): string | null | undefined {
    const kind = lower(word);
    if (kind !== "self" && kind !== "parent" && kind !== "static")
      return undefined;
    const owner = enclosingClass(node);
    if (owner === null || kind === "static") return null;
    if (kind === "self") {
      const name = field(owner, "name")?.text;
      if (name === undefined) return null;
      const namespace = scopeOf(owner).namespace;
      return namespace === "" ? name : `${namespace}\\${name}`;
    }
    const base = named(owner).find((child) => child.type === "base_clause");
    const parent = base === undefined ? undefined : named(base)[0];
    return parent === undefined ? null : resolveClass(parent);
  }

  /** A function call target's names, and the namespace that may shadow it. */
  const resolveFunction = (
    node: Node,
  ): { name: string; namespace: string | null } | null => {
    const scope = scopeOf(node);
    const text = node.text.replace(/\s+/g, "");
    switch (node.type) {
      case "name": {
        const alias = imported(scope.functions, text, node);
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
      case "heredoc":
      case "nowdoc":
        return docValue(node);
      case "integer":
      case "float":
        return numberValue(node);
      case "boolean":
        return lower(node.text);
      case "null":
        return "null";
      case "parenthesized_expression":
        return literal(named(node)[0]);
      case "unary_op_expression": {
        const operand = named(node)[0];
        const value = operand === undefined ? null : numberValue(operand);
        if (value === null || !node.text.trimStart().startsWith("-"))
          return null;
        return /^0(?:\.0*)?$/.test(value) ? "0" : `-${value}`;
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

  /**
   * `__DIR__ . '/x.php'`, `dirname(__FILE__) . '/x.php'` and
   * `dirname(__DIR__, 2) . '/lib/' . 'x.php'`: a path from the file's folder.
   */
  const includePath = (node: Node | undefined): string | null => {
    if (node === undefined) return null;
    const inner =
      node.type === "parenthesized_expression" ? named(node)[0] : node;
    if (inner === undefined) return null;
    const value = literal(inner);
    if (value !== null) return value;
    // The parts of a `.` chain, left to right.
    const parts: Node[] = [];
    const flatten = (part: Node): void => {
      if (part.type === "parenthesized_expression" && named(part).length === 1)
        flatten(named(part)[0] as Node);
      else if (
        part.type === "binary_expression" &&
        field(part, "operator")?.text === "."
      ) {
        const left = field(part, "left");
        const right = field(part, "right");
        if (left !== null) flatten(left);
        if (right !== null) flatten(right);
      } else parts.push(part);
    };
    flatten(inner);
    const [head, ...rest] = parts;
    if (head === undefined || rest.length === 0) return null;
    const folder = directoryOf(head);
    if (folder === null) return null;
    let tail = "";
    for (const part of rest) {
      const text = literal(part);
      if (text === null) return null;
      tail += text;
    }
    if (!tail.startsWith("/")) return null;
    return posix.normalize(posix.join(folder, tail));
  };

  /** `__DIR__`, `dirname(__FILE__)`, `dirname(__DIR__, n)`: a folder of the file. */
  const directoryOf = (node: Node): string | null => {
    const here = posix.dirname(options.file);
    const text = node.text.replace(/\s+/g, "");
    if (/^__DIR__$/i.test(text)) return here;
    const call = /^\\?dirname\((__FILE__|__DIR__)(?:,(\d+))?\)$/i.exec(text);
    if (call === null) return null;
    const levels =
      Number(call[2] ?? "1") -
      (lower(call[1] as string) === "__file__" ? 1 : 0);
    let folder = here;
    for (let index = 0; index < levels; index += 1)
      folder = posix.join(folder, "..");
    return folder;
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
          // `die` is `exit`.
          names: [resolved.name === "die" ? "exit" : resolved.name],
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
    const list =
      field(node, "arguments") ??
      named(node).find((child) => child.type === "arguments") ??
      null;
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
      const scoped = /^(\w+)::(.+)$/.exec(name);
      if (scoped !== null) {
        const owner = relativeClass(node, scoped[1] as string);
        if (owner !== undefined)
          return [owner === null ? `*.${scoped[2]}` : `${owner}::${scoped[2]}`];
      }
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
      const ownerText = owner.type === "variable_name" ? null : literal(owner);
      const relative =
        ownerText === null ? undefined : relativeClass(owner, ownerText);
      const ownerName =
        relative === undefined
          ? ownerText === null
            ? null
            : stripLeading(ownerText)
          : relative;
      return [
        ownerName === null ? `*.${methodName}` : `${ownerName}::${methodName}`,
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

  // Classes this file declares, by lower-case full name, to the class each
  // extends (null for none).
  const classes = new Map<string, string | null>();
  const declareClasses = (node: Node): void => {
    if (node.type === "class_declaration") {
      const name = field(node, "name")?.text;
      if (name !== undefined) {
        const namespace = scopeOf(node).namespace;
        const base = named(node).find((child) => child.type === "base_clause");
        const parent = base === undefined ? undefined : named(base)[0];
        classes.set(
          lower(namespace === "" ? name : `${namespace}\\${name}`),
          parent === undefined ? null : resolveClass(parent),
        );
      }
    }
    for (const child of named(node)) declareClasses(child);
  };
  if (extract === "env") declareClasses(root);

  /**
   * Whether a class is Laravel's environment class: "env", "no", or the
   * class Kibi cannot follow (declared in another file, which may extend it).
   */
  const envReach = (owner: string, seen = new Set<string>()): string => {
    const key = lower(stripLeading(owner));
    if (key === ENV_CLASS) return "env";
    if (seen.has(key)) return "no";
    seen.add(key);
    const parent = classes.get(key);
    if (parent === undefined) return owner;
    if (parent === null) return "no";
    return envReach(parent, seen);
  };
  /** A host row: kept when the project mentions Laravel's environment class. */
  const envRow = (owner: string, node: Node): void => {
    unresolved.push({
      line: node.startPosition.row + 1,
      text: `${owner} may be Illuminate\\Support\\Env or a class that extends it: ${at(node).text}`,
    });
  };
  /**
   * What `Owner::method` means for env: true for a getter of the variable
   * its first argument names, false for none; a refusal or host row is
   * recorded. `*.method` is a class Kibi cannot name.
   */
  const envMethod = (
    name: string,
    node: Node,
    statically: boolean,
  ): boolean => {
    if (ENV_GETTERS.has(lower(name))) return true;
    const scoped = /^(.*)::(\w+)$/.exec(name);
    const unknown = /^\*\.(\w+)$/.exec(name);
    const method = lower(scoped?.[2] ?? unknown?.[1] ?? "");
    if (!ENV_METHODS.has(method)) return false;
    if (scoped === null) {
      // `static::get()`, `$class::get()`: any class; `$o->get()` is an
      // object's method, which Env's static getters are not called as.
      if (statically) refuse(node);
      return false;
    }
    const reach = envReach(scoped[1] as string);
    if (reach === "no") return false;
    if (reach !== "env") {
      envRow(reach, node);
      return false;
    }
    if (method === "getrepository") {
      // The repository reads any variable it is asked for.
      refuse(node);
      return false;
    }
    return true;
  };

  /** The last segment of a callee: `PDO::prepare` and `*.prepare` end in prepare. */
  const lastSegment = (name: string): string =>
    lower(name.split(/::|->|\\|\./).at(-1) ?? name);

  /** string_args: the first argument of a call of the callee. */
  const firstArgument = (node: Node, names: string[]): void => {
    const matches = names.some((candidate) =>
      calleeMatches(candidate, options.callee),
    );
    // `$db->prepare($sql)` may be a call of PDO::prepare.
    const unknown =
      !matches &&
      options.callee !== "" &&
      names.some(
        (candidate) =>
          candidate.startsWith("*.") &&
          lower(candidate.slice(2)) === lastSegment(options.callee),
      );
    if (!matches && !unknown) return;
    const first = callArguments(node)[0];
    if (first === undefined || first.type === "variadic_placeholder") return;
    if (
      unknown ||
      field(first, "name") !== null ||
      named(first).some((child) => child.type === "variadic_unpacking")
    ) {
      // A named or spread argument may be the first parameter.
      refuse(node);
      return;
    }
    const value = literal(argumentValue(first));
    if (value === null) refuse(node);
    else members.push(value);
  };

  /** What a callable handed to a builtin means for the extract. */
  const handedCallable = (argument: Node, value: Node | undefined): void => {
    const reached = callable(value);
    if (reached === null) {
      // `[$controller, $action]` calls a method of some class.
      if (
        env &&
        value?.type === "array_creation_expression" &&
        named(value).length === 2
      )
        envRow("the callable's class", argument);
      else refuse(argument);
      return;
    }
    if (extract === "calls") members.push(...reached);
    else if (env) {
      if (reached.some((target) => envMethod(target, argument, true)))
        refuse(argument);
    } else if (
      extract === "string_args" &&
      reached.some(
        (target) =>
          calleeMatches(target, options.callee) ||
          (target.startsWith("*.") &&
            lower(target.slice(2)) === lastSegment(options.callee)),
      )
    )
      refuse(argument);
  };

  /** Builtins that call what they are handed: `array_map('trim', $a)`. */
  const handedCallables = (node: Node, name: string): void => {
    if (!(extract === "calls" || extract === "string_args" || env)) return;
    const list = callArguments(node);
    const key = lower(name);
    const positions = CALLABLE_ARGS.get(key);
    if (positions !== undefined) {
      if (
        list.some(
          (argument) =>
            argument.type === "argument" &&
            named(argument).some(
              (child) => child.type === "variadic_unpacking",
            ),
        )
      ) {
        refuse(node);
        return;
      }
      const handed = new Set<Node>();
      if (positions === "all")
        for (const argument of list) handed.add(argument);
      else
        for (const position of positions) {
          const argument = position < 0 ? list.at(position) : list[position];
          if (argument !== undefined && field(argument, "name") === null)
            handed.add(argument);
        }
      // A named argument may be the callable parameter.
      for (const argument of list)
        if (field(argument, "name") !== null) handed.add(argument);
      for (const argument of handed)
        handedCallable(argument, argumentValue(argument));
      return;
    }
    if (key === "preg_replace_callback_array") {
      const map = argumentValue(list[0]);
      if (map?.type !== "array_creation_expression") {
        if (list[0] !== undefined) refuse(list[0]);
        return;
      }
      for (const item of named(map)) handedCallable(item, named(item).at(-1));
      return;
    }
    if (key === "curl_setopt" || key === "curl_setopt_array") {
      // CURLOPT_*FUNCTION options take a callback.
      const pairs: [Node | undefined, Node | undefined, Node][] = [];
      if (key === "curl_setopt") {
        if (list[1] !== undefined)
          pairs.push([argumentValue(list[1]), argumentValue(list[2]), list[1]]);
      } else {
        const map = argumentValue(list[1]);
        if (map?.type !== "array_creation_expression") {
          if (list[1] !== undefined) refuse(list[1]);
          return;
        }
        for (const item of named(map)) {
          const parts = named(item);
          if (parts.length !== 2) refuse(item);
          else pairs.push([parts[0], parts[1], item]);
        }
      }
      for (const [option, value, place] of pairs) {
        if (option === undefined) continue;
        const constant = /^\\?CURLOPT_\w+$/.test(option.text);
        if (!constant) refuse(place);
        else if (/FUNCTION$/.test(option.text)) handedCallable(place, value);
      }
    }
  };

  /**
   * Whether a catch variable still holds the caught exception wherever the
   * catch body names it: thrown, read through `->`, tested with
   * `instanceof`, passed on or put in a string or an array, and never in a
   * nested function, which has a variable of its own.
   */
  const catchTrusted = (clause: Node, name: string): boolean => {
    const body = field(clause, "body");
    if (body === null) return true;
    const safe = (use: Node): boolean => {
      for (
        let current = use.parent;
        current !== null && current.id !== body.id;
        current = current.parent
      )
        if (
          /^(?:anonymous_function|arrow_function|anonymous_function_creation_expression|function_definition|method_declaration|class_declaration)$/.test(
            current.type,
          )
        )
          return false;
      const parent = use.parent;
      if (parent === null) return false;
      switch (parent.type) {
        case "throw_expression":
        case "encapsed_string":
          return true;
        case "member_access_expression":
        case "nullsafe_member_access_expression":
        case "member_call_expression":
        case "nullsafe_member_call_expression":
          return field(parent, "object")?.id === use.id;
        case "binary_expression": {
          const operator = lower(field(parent, "operator")?.text ?? "");
          return (
            operator === "." ||
            (operator === "instanceof" && field(parent, "left")?.id === use.id)
          );
        }
        case "argument":
          return field(parent, "name")?.id !== use.id;
        case "array_element_initializer":
          return (
            named(parent).at(-1)?.id === use.id && !/&\s*\$/.test(parent.text)
          );
        default:
          return false;
      }
    };
    const check = (node: Node): boolean => {
      if (node.type === "variable_name" && node.text === name)
        return safe(node);
      return named(node).every(check);
    };
    return check(body);
  };

  const catchNames: string[] = [];

  /** property: what a write to `left` sets, "dynamic" when any key may be meant. */
  const writtenKey = (left: Node | null): string | null => {
    if (left === null) return null;
    switch (left.type) {
      case "subscript_expression": {
        const index = named(left)[1];
        if (index === undefined)
          return /^(?:0|[1-9]\d*)$/.test(options.key) ? "dynamic" : null;
        if (intConstant(index)) return null;
        return keyOf(index) ?? "dynamic";
      }
      case "member_access_expression":
      case "nullsafe_member_access_expression": {
        const name = field(left, "name");
        return name?.type === "name" ? name.text : "dynamic";
      }
      case "scoped_property_access_expression": {
        const name = field(left, "name");
        return name?.type === "variable_name"
          ? name.text.replace(/^\$/, "")
          : "dynamic";
      }
      default:
        return null;
    }
  };

  const numericKey = /^(?:0|-?[1-9]\d*)$/.test(options.key);

  /**
   * An array key as PHP stores it: `true` is 1, `null` is "", a float is cut
   * to an integer; null when the key is not a literal.
   */
  const keyOf = (node: Node): string | null => {
    switch (node.type) {
      case "boolean":
        return lower(node.text) === "true" ? "1" : "0";
      case "null":
        return "";
      case "float":
      case "unary_op_expression": {
        const value = literal(node);
        if (value === null) return null;
        if (
          node.type === "unary_op_expression" &&
          named(node)[0]?.type !== "float"
        )
          return value;
        const number = Math.trunc(Number(value));
        return Number.isSafeInteger(number)
          ? String(number === 0 ? 0 : number)
          : null;
      }
      default:
        return literal(node);
    }
  };

  /**
   * An integer constant of an extension used as a key (`PDO::ATTR_ERRMODE`,
   * `CURLOPT_URL`): it cannot be a key that is not a number.
   */
  const intConstant = (node: Node): boolean => {
    if (numericKey) return false;
    if (node.type === "name" || node.type === "qualified_name")
      return /^\\?(?:CURLOPT|CURLINFO|CURLMOPT)_\w+$/.test(node.text);
    if (node.type !== "class_constant_access_expression") return false;
    const [owner, constant] = named(node);
    return (
      owner !== undefined &&
      /^\\?PDO$/i.test(owner.text) &&
      /^(?:ATTR|MYSQL_ATTR|PGSQL_ATTR|SQLITE_ATTR|PARAM|FETCH|ERRMODE|CASE|NULL|CURSOR)_\w+$/.test(
        constant?.text ?? "",
      )
    );
  };

  /** The keys of an array literal, with the implicit ones PHP numbers. */
  const arrayEntries = (
    node: Node,
  ): { key: string | null; value: Node | undefined; item: Node }[] | null => {
    const entries: {
      key: string | null;
      value: Node | undefined;
      item: Node;
    }[] = [];
    let next = 0n;
    for (const item of named(node)) {
      if (item.type !== "array_element_initializer") continue;
      const parts = named(item);
      if (parts.length === 1 && parts[0]?.type === "variadic_unpacking")
        return null;
      if (parts.length === 1) {
        entries.push({ key: next.toString(), value: parts[0], item });
        next += 1n;
        continue;
      }
      const keyNode = parts[0] as Node;
      const key = intConstant(keyNode) ? undefined : keyOf(keyNode);
      if (key === undefined) continue;
      entries.push({ key, value: parts.at(-1), item });
      if (key !== null && /^(?:0|-?[1-9]\d*)$/.test(key) && BigInt(key) >= next)
        next = BigInt(key) + 1n;
    }
    return entries;
  };

  const arrayHasKey = (node: Node): boolean =>
    (arrayEntries(node) ?? []).some(
      (entry) => entry.key === options.key || entry.key === null,
    );

  /** property: the value an array literal gives the key. */
  const arrayKeys = (node: Node): void => {
    const entries = arrayEntries(node);
    if (entries === null) {
      // `[...$defaults]` may hold the key.
      refuse(node);
      return;
    }
    const matching = entries.filter((entry) => entry.key === options.key);
    for (const entry of entries) if (entry.key === null) refuse(entry.item);
    // A key written twice keeps only its last value.
    if (matching.length > 1) {
      refuse(node);
      return;
    }
    for (const entry of matching) {
      const value = literal(entry.value);
      if (value === null) refuse(entry.item);
      else members.push(value);
    }
  };

  /** property: `define('K', v)`, `compact('k')` and `array_merge` of literals. */
  const propertyCall = (node: Node, name: string): void => {
    const list = callArguments(node);
    if (name === "define") {
      const key = literal(argumentValue(list[0]));
      if (key === null) refuse(node);
      else if (key === options.key) {
        const value = literal(argumentValue(list[1]));
        if (value === null) refuse(node);
        else members.push(value);
      }
      return;
    }
    if (name === "compact") {
      // compact('acl') gives the key the variable's value.
      for (const argument of list) {
        const value = literal(argumentValue(argument));
        if (value === null || value === options.key) refuse(argument);
      }
      return;
    }
    if (/^array_(?:merge|replace)(?:_recursive)?$/.test(name)) {
      const values = list.map((argument) => argumentValue(argument));
      if (
        values.some(
          (value) =>
            value?.type === "array_creation_expression" && arrayHasKey(value),
        ) &&
        values.some((value) => value?.type !== "array_creation_expression")
      )
        refuse(node);
    }
  };

  /**
   * Whether a string may name an environment getter that some code calls:
   * `'getenv'`, `'env'`, `'Illuminate\Support\Env::get'`. An array key, or
   * the variable a getter is asked for, names none.
   */
  const callableEnvName = (node: Node, value: string): boolean => {
    const name = lower(stripLeading(value));
    const getter =
      /^(?:apache_)?getenv$/.test(name) ||
      name === "env" ||
      /^illuminate\\support\\env(?:::\w+)?$/.test(name);
    if (!getter) return false;
    const parent = node.parent;
    if (
      parent?.type === "array_element_initializer" &&
      named(parent).length === 2 &&
      named(parent)[0]?.id === node.id
    )
      return false;
    if (
      parent?.type === "subscript_expression" &&
      named(parent)[1]?.id === node.id
    )
      return false;
    if (parent?.type === "argument") {
      const call = parent.parent?.parent;
      const read =
        call !== null && call !== undefined && isCall(call)
          ? callNames(call)
          : null;
      if (read?.names.some((candidate) => ENV_GETTERS.has(lower(candidate))))
        return false;
    }
    return true;
  };

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
            node.type === "scoped_call_expression" ||
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
        if (
          env &&
          envMethod(name, node, node.type === "scoped_call_expression")
        ) {
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
        if (extract === "string_args") firstArgument(node, names);
        if (extract === "property") propertyCall(node, name);
        handedCallables(node, name);
        break;
      }
      case "object_creation_expression": {
        if (extract === "imports" || extract === "property") break;
        const type = named(node)[0];
        const owner =
          type === undefined || type.type === "variable_name"
            ? null
            : resolveClass(type);
        // Reflection calls, reads and builds whatever it is given at run time.
        if (owner !== null && /^reflection/i.test(finalName(owner))) {
          refuse(node);
          break;
        }
        // `new Fiber('task')` calls what it is handed.
        if (owner !== null && lower(owner) === "fiber") {
          const list = callArguments(node);
          if (list[0] !== undefined)
            handedCallable(list[0], argumentValue(list[0]));
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
      case "exit_statement": {
        if (extract === "calls") members.push("exit");
        const argument = named(node)[0];
        if (
          extract === "string_args" &&
          argument !== undefined &&
          (calleeMatches("exit", options.callee) ||
            calleeMatches("die", options.callee))
        ) {
          const value = literal(argument);
          if (value === null) refuse(node);
          else members.push(value);
        }
        break;
      }
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
          // `"$_SERVER[HOME]"`: in a string an unquoted key is text.
          const value =
            index?.type === "name" && node.parent?.type === "encapsed_string"
              ? index.text
              : literal(index);
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
        if (env && value !== null && callableEnvName(node, value)) refuse(node);
        break;
      }
      case "catch_clause": {
        const name = field(node, "name")?.text ?? null;
        // A catch variable assigned or handed by reference may hold another
        // exception by the time it is thrown.
        const trusted = name !== null && catchTrusted(node, name);
        catchNames.push(trusted ? (name as string) : "");
        for (const child of named(node)) visit(child);
        catchNames.pop();
        return;
      }
      case "throw_expression": {
        if (extract !== "thrown") break;
        const thrown = named(node)[0];
        if (thrown?.type === "object_creation_expression") {
          const type = named(thrown)[0];
          // `new static` may be any subclass.
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
      case "array_creation_expression":
        if (extract === "property") arrayKeys(node);
        break;
      case "binary_expression": {
        // `$defaults + ['acl' => 'x']`: the key may keep the other array's value.
        if (extract !== "property" || field(node, "operator")?.text !== "+")
          break;
        const sides = [field(node, "left"), field(node, "right")];
        if (
          sides.some(
            (side) =>
              side?.type === "array_creation_expression" && arrayHasKey(side),
          ) &&
          sides.some((side) => side?.type !== "array_creation_expression")
        )
          refuse(node);
        break;
      }
      case "assignment_expression":
      case "augmented_assignment_expression":
      case "reference_assignment_expression": {
        if (extract !== "property") break;
        const key = writtenKey(field(node, "left"));
        if (key === "dynamic") refuse(node);
        else if (key === options.key) {
          const value =
            node.type === "assignment_expression"
              ? literal(field(node, "right"))
              : null;
          if (value === null) refuse(node);
          else members.push(value);
        }
        break;
      }
      case "enum_case":
      case "property_promotion_parameter": {
        if (extract !== "property") break;
        const name = field(node, "name")?.text.replace(/^\$/, "");
        if (name !== options.key) break;
        const value =
          node.type === "enum_case"
            ? field(node, "value")
            : field(node, "default_value");
        if (value === null) break;
        const read = literal(value);
        if (read === null) refuse(node);
        else members.push(read);
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
