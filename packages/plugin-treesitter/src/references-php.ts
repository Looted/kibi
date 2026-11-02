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
  ["assert_options", [1]],
  ["ldap_set_rebind_proc", [1]],
  ["intlchar::enumcharnames", [2]],
  ["intlchar::enumchartypes", [0]],
  ["*.setauthorizer", [0]],
  // Methods of builtin classes, on a receiver Kibi cannot name.
  ["*.uasort", [0]],
  ["*.uksort", [0]],
  ["*.createfunction", [1]],
  ["*.createaggregate", [1, 2]],
  ["*.createcollation", [1]],
  ["*.sqlitecreatefunction", [1]],
  ["*.sqlitecreateaggregate", [1, 2]],
  ["*.sqlitecreatecollation", [1]],
]);

/** Builtin classes whose constructor calls a callable it is given, by position. */
const CALLABLE_CONSTRUCTORS: ReadonlyMap<string, number> = new Map([
  ["fiber", 0],
  ["callbackfilteriterator", 1],
  ["recursivecallbackfilteriterator", 1],
]);

/** PHP's own throwables, whose constructors take their arguments by value. */
const BUILTIN_THROWABLES = new Set(
  [
    "Exception",
    "ErrorException",
    "Error",
    "TypeError",
    "ValueError",
    "ArithmeticError",
    "DivisionByZeroError",
    "ArgumentCountError",
    "JsonException",
    "RuntimeException",
    "LogicException",
    "InvalidArgumentException",
    "DomainException",
    "LengthException",
    "OutOfRangeException",
    "OutOfBoundsException",
    "RangeException",
    "OverflowException",
    "UnderflowException",
    "UnexpectedValueException",
    "BadFunctionCallException",
    "BadMethodCallException",
  ].map(lower),
);

/** Builtins that take every argument by value: a caught exception passed in stays. */
const BY_VALUE_BUILTINS = new Set([
  "error_log",
  "print_r",
  "var_dump",
  "var_export",
  "get_class",
  "is_a",
  "is_subclass_of",
  "json_encode",
  "serialize",
  "spl_object_id",
  "spl_object_hash",
  "sprintf",
  "printf",
  "trigger_error",
]);

/**
 * Builtins that take an array slot by value: `strtolower($o['acl'])` reads
 * the key. Any other callee may take it by reference and set it.
 */
const READS_SLOT = new Set([
  ...BY_VALUE_BUILTINS,
  "strtolower",
  "strtoupper",
  "ucfirst",
  "lcfirst",
  "trim",
  "ltrim",
  "rtrim",
  "strlen",
  "mb_strlen",
  "count",
  "in_array",
  "array_key_exists",
  "array_keys",
  "array_values",
  "intval",
  "floatval",
  "boolval",
  "strval",
  "is_array",
  "is_string",
  "is_int",
  "is_bool",
  "is_null",
  "is_numeric",
  "htmlspecialchars",
  "htmlentities",
  "urlencode",
  "rawurlencode",
  "base64_encode",
  "md5",
  "sha1",
  "hash",
  "explode",
  "implode",
  "join",
  "str_contains",
  "str_starts_with",
  "str_ends_with",
  "strpos",
  "stripos",
  "substr",
  "str_pad",
  "str_repeat",
  "number_format",
  "date",
  "strtotime",
  "json_decode",
  "unserialize",
  "filter_var",
  "max",
  "min",
  "abs",
  "round",
  "echo",
  "print",
]);

/** Builtins that rewrite a whole array, its values or its keys. */
const ARRAY_TRANSFORMS = new Set([
  "str_replace",
  "str_ireplace",
  "preg_replace",
  "preg_replace_callback",
  "array_map",
  "array_filter",
  "array_change_key_case",
  "array_diff_key",
  "array_diff_assoc",
  "array_intersect_key",
  "array_intersect_assoc",
  "array_splice",
  "array_slice",
  "array_pad",
  "array_unique",
  "array_reverse",
  "array_column",
  "substr_replace",
  "preg_filter",
  "array_merge_recursive",
  "array_replace_recursive",
  "iterator_to_array",
]);

/** Code built from text: every extract is unknowable there. */
const CODE_FUNCTIONS = new Set(["create_function"]);

function lower(name: string): string {
  return name.toLowerCase();
}

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  n: "\n",
  t: "\t",
  r: "\r",
  v: "\v",
  e: "\x1b",
  f: "\f",
  "\\": "\\",
  $: "$",
  '"': '"',
};

/**
 * The bytes of an `escape_sequence` node, or null for a code point PHP
 * refuses (past U+10FFFF) or writes as bytes that are not UTF-8 (a
 * surrogate). The grammar admits only the escapes PHP decodes: `\n` and the
 * like, `\x41`, `\101` and `\u{42}`.
 */
function decodeEscape(text: string): number[] | null {
  const body = text.slice(1);
  const simple = SIMPLE_ESCAPES[body];
  if (simple !== undefined) return [simple.charCodeAt(0)];
  if (body.startsWith("x")) return [Number.parseInt(body.slice(1), 16)];
  if (body.startsWith("u")) {
    const point = Number.parseInt(body.slice(2), 16);
    return point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)
      ? null
      : [...new TextEncoder().encode(String.fromCodePoint(point))];
  }
  return [Number.parseInt(body, 8) & 0xff];
}

/** The value of a `string` or `encapsed_string` node with no interpolation. */
function stringValue(node: Node): string | null {
  const text = node.text;
  if (node.type === "string")
    return text.slice(text.indexOf("'") + 1, -1).replace(/\\([\\'])/g, "$1");
  // A PHP string is bytes: `"\xc3\xa9"` is the UTF-8 of é.
  const bytes: number[] = [];
  for (const part of named(node)) {
    if (part.type === "string_content")
      bytes.push(...new TextEncoder().encode(part.text));
    else if (part.type === "escape_sequence") {
      const decoded = decodeEscape(part.text);
      if (decoded === null) return null;
      bytes.push(...decoded);
    } else return null;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(bytes),
    );
  } catch {
    return null;
  }
}

const INT64_MAX = 9223372036854775807n;

/**
 * An integer literal as a decimal (`0x1F90`, `0755`, `0o17`, `0b11`,
 * `1_000`), or null when PHP reads it as a float (past the int range).
 */
function canonicalInteger(text: string): string | null {
  const digits = text.replaceAll("_", "");
  // A digit after a leading 0 is octal (the grammar admits only 0-7 there);
  // BigInt reads every other spelling the grammar admits.
  const value = BigInt(/^0\d/.test(digits) ? `0o${digits}` : digits);
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
    .replace(/e.*/i, "")
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
  return node.type === "float" ? canonicalFloat(node.text) : null;
}

/**
 * The text of a heredoc or nowdoc without interpolation or escapes: the
 * lines between its markers, less the closing marker's indentation.
 */
function docValue(node: Node): string | null {
  const body = field(node, "value");
  // A doc with no line between its markers has no body: Kibi does not read it.
  if (body === null) return null;
  if (
    node.type === "heredoc" &&
    named(body).some(
      (part) => part.type !== "string_content" || part.text.includes("\\"),
    )
  )
    return null;
  const text = node.text;
  const end = (field(node, "end_tag") as Node).startIndex - node.startIndex;
  const close = text.lastIndexOf("\n", end);
  // The closing marker's indentation: the grammar admits only blanks there.
  const indent = text.slice(close + 1, end);
  const out: string[] = [];
  for (const row of text.slice(text.indexOf("\n") + 1, close).split("\n")) {
    if (row.startsWith(indent)) out.push(row.slice(indent.length));
    // A blank line may be shorter than the indentation; its `\r` stays.
    else if (row.trim() === "") out.push(row.endsWith("\r") ? "\r" : "");
    else return null;
  }
  // The line end before the closing marker, `\r\n` too, is not text.
  return out.join("\n").replace(/\r$/, "");
}

/** A `php://`, `phar://` or `data:` path: no project file. */
function isStream(path: string): boolean {
  return /^[A-Za-z][\w+.-]*:\/\//.test(path) || /^data:/i.test(path);
}

function stripLeading(name: string): string {
  return name.replace(/^\\/, "").replace(/\s/g, "");
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

  const makeScope = (start: number, end: number, namespace: string): Scope => ({
    start,
    end,
    namespace,
    classes: new Map(),
    functions: new Map(),
  });
  // Namespaces and imports, in file order: the global namespace first.
  const scopes: Scope[] = [makeScope(0, root.endIndex, "")];
  const newScope = (start: number, end: number, namespace: string): Scope => {
    const scope = makeScope(start, end, namespace);
    scopes.push(scope);
    return scope;
  };
  const declared = new Set<string>();
  {
    let current = scopes[0] as Scope;
    /** `use function` and `use const`, on the clause or the whole group. */
    const typeOf = (node: Node): string | undefined =>
      field(node, "type")?.text.toLowerCase();
    const imports = (declaration: Node, scope: Scope): void => {
      const prefixNode = named(declaration).find(
        (child) => child.type === "namespace_name",
      );
      const prefix =
        prefixNode === undefined ? "" : `${stripLeading(prefixNode.text)}\\`;
      const group = field(declaration, "body");
      const clauses = named(group ?? declaration).filter(
        (child) => child.type === "namespace_use_clause",
      );
      for (const clause of clauses) {
        // A comment may come first.
        const target = named(clause).find(
          (child) => child.type === "qualified_name" || child.type === "name",
        ) as Node;
        const clauseKind = typeOf(clause) ?? typeOf(declaration) ?? "class";
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
        switch (child.type) {
          case "namespace_definition": {
            const name = stripLeading(field(child, "name")?.text ?? "");
            const body = field(child, "body");
            if (body !== null)
              walk(body, newScope(body.startIndex, body.endIndex, name));
            else {
              // `namespace X;` holds until the next namespace statement.
              current.end = child.startIndex;
              current = newScope(child.endIndex, root.endIndex, name);
              scope = current;
            }
            break;
          }
          case "namespace_use_declaration":
            imports(child, scope);
            break;
          case "function_definition":
            // A name is never looked up in the global namespace's.
            declared.add(
              lower(
                `${scope.namespace}\\${(field(child, "name") as Node).text}`,
              ),
            );
            break;
          case "compound_statement":
          case "declare_statement":
            walk(child, scope);
        }
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
    // Scopes are in file order: a later one is the namespace inside.
    for (const scope of scopes)
      if (scope.start <= node.startIndex && node.startIndex < scope.end)
        found = scope;
    return found;
  };

  const resolveClass = (node: Node): string | null => {
    const scope = scopeOf(node);
    const text = node.text.replace(/\s/g, "");
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
        const [first, ...rest] = text.split("\\") as [string, ...string[]];
        const alias = imported(scope.classes, first, node);
        if (alias !== undefined) return [alias, ...rest].join("\\");
        return scope.namespace === "" ? text : `${scope.namespace}\\${text}`;
      }
      case "relative_name":
        return `${scope.namespace === "" ? "" : `${scope.namespace}\\`}${text.slice("namespace\\".length)}`;
      case "relative_scope":
        return relativeClass(node, text) ?? null;
      default:
        return null;
    }
  };

  const rebinds =
    /->\s*call\s*\(|\bbindTo\s*\(|::\s*bind\s*\(|(?:::|->)\s*(?:macro|mixin)\s*\(|\bcall_user_func\w*\s*\(\s*\[\s*\$\w+\s*,\s*['"]call['"]/i.test(
      root.text,
    );
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
    // In a trait, `self` and `parent` are the using class's, and a closure
    // `->call`ed or bound (`bindTo`, `Closure::bind`) takes another class's.
    if (
      owner === null ||
      kind === "static" ||
      owner.type === "trait_declaration" ||
      (rebinds && insideClosure(node))
    )
      return null;
    if (kind === "self")
      return field(owner, "name") === null ? null : selfName(owner);
    return parentName(owner);
  }
  /** The full name of a class, trait or enum the file declares. */
  function selfName(owner: Node): string {
    const name = (field(owner, "name") as Node).text;
    const namespace = scopeOf(owner).namespace;
    return namespace === "" ? name : `${namespace}\\${name}`;
  }
  /** The class a class extends, or null for none. */
  function parentName(owner: Node): string | null {
    const base = named(owner).find((child) => child.type === "base_clause");
    return base === undefined ? null : resolveClass(named(base)[0] as Node);
  }

  /** A function call target's names, and the namespace that may shadow it. */
  const resolveFunction = (
    node: Node,
  ): { name: string; namespace: string | null } | null => {
    const scope = scopeOf(node);
    const text = node.text;
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
      case "relative_name":
        // Either is resolved as a class name is, never to null.
        return { name: lower(resolveClass(node) as string), namespace: null };
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
        const value = numberValue(named(node)[0] as Node);
        if (value === null || !node.text.startsWith("-")) return null;
        // A number's value is "0" for `0`, `0.0` and `-0.0` alike.
        return value === "0" ? "0" : `-${value}`;
      }
      case "binary_expression": {
        if ((field(node, "operator") as Node).text !== ".") return null;
        // As text, `true` is "1" and `false` and `null` are "".
        const text = (side: Node): string | null => {
          if (side.type === "boolean")
            return lower(side.text) === "true" ? "1" : "";
          if (side.type === "null") return "";
          // PHP writes a float with its own precision (`1.0E+15`).
          if (
            side.type === "float" ||
            (side.type === "unary_op_expression" &&
              (named(side)[0] as Node).type === "float")
          )
            return null;
          return literal(side);
        };
        const left = text(field(node, "left") as Node);
        const right = text(field(node, "right") as Node);
        return left === null || right === null ? null : left + right;
      }
      case "class_constant_access_expression": {
        const [scope, constant] = named(node) as [Node, Node];
        return lower(constant.text) === "class" ? resolveClass(scope) : null;
      }
      default:
        return null;
    }
  };

  /**
   * `__DIR__ . '/x.php'`, `dirname(__FILE__) . '/x.php'` and
   * `dirname(__DIR__, 2) . '/lib/' . 'x.php'`: a path from the file's folder.
   */
  const includePath = (node: Node): string | null => {
    const value = literal(node);
    // `data://`, `php://` and `phar://` paths are not project files.
    if (value !== null) return isStream(value) ? null : value;
    // The parts of a `.` chain, left to right.
    const parts: Node[] = [];
    const flatten = (part: Node): void => {
      if (part.type === "parenthesized_expression" && named(part).length === 1)
        flatten(named(part)[0] as Node);
      else if (
        part.type === "binary_expression" &&
        (field(part, "operator") as Node).text === "."
      ) {
        flatten(field(part, "left") as Node);
        flatten(field(part, "right") as Node);
      } else parts.push(part);
    };
    flatten(node);
    // A lone part is no `.` chain: `__DIR__` alone ends in no "/" below.
    const [head, ...rest] = parts as [Node, ...Node[]];
    const folder = directoryOf(head);
    if (folder === null) return null;
    let tail = "";
    for (const part of rest) {
      const text = /^\\?DIRECTORY_SEPARATOR$/.test(part.text)
        ? "/"
        : literal(part);
      if (text === null) return null;
      tail += text;
    }
    if (!tail.startsWith("/")) return null;
    return posix.normalize(posix.join(folder, tail));
  };

  /** `__DIR__`, `dirname(__FILE__)`, `dirname(__DIR__, n)`: a folder of the file. */
  const directoryOf = (node: Node): string | null =>
    folderOf(node.text.replace(/\s/g, ""));
  const folderOf = (text: string): string | null => {
    if (/^__DIR__$/i.test(text)) return posix.dirname(options.file);
    // `dirname(dirname(__FILE__))`: each call goes up from the inner path.
    const call = /^\\?dirname\((.+?)(?:,(\d+))?\)$/i.exec(text);
    if (call === null) return null;
    const inner = call[1] as string;
    let folder = /^__FILE__$/i.test(inner) ? options.file : folderOf(inner);
    if (folder === null) return null;
    for (let index = 0; index < Number(call[2] ?? "1"); index += 1)
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
  } | null => {
    // A method name computed at run time: `$o->$m()`, `X::{'m'}()`.
    const method = field(node, "name");
    if (method !== null && method.type !== "name") return null;
    switch (node.type) {
      case "function_call_expression": {
        let target = field(node, "function") as Node;
        while (target.type === "parenthesized_expression")
          target = named(target)[0] as Node;
        const literalName =
          target.type === "string" || target.type === "encapsed_string"
            ? stringValue(target)
            : null;
        if (literalName !== null) {
          const name = stripLeading(literalName);
          return {
            names: [name.includes("::") ? name : lower(name)],
            namespace: null,
          };
        }
        const resolved = resolveFunction(target);
        if (resolved === null) return null;
        return {
          // `die` and `exit` are one construct: both names are listed.
          names:
            resolved.name === "die" || resolved.name === "exit"
              ? ["exit", "die"]
              : [resolved.name],
          namespace: resolved.namespace,
        };
      }
      case "member_call_expression":
      case "nullsafe_member_call_expression":
        return { names: [`*.${(method as Node).text}`], namespace: null };
      default: {
        // scoped_call_expression, the one other call isCall admits.
        const owner = resolveClass(field(node, "scope") as Node);
        const name = (method as Node).text;
        return {
          names: [owner === null ? `*.${name}` : `${owner}::${name}`],
          namespace: null,
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
    // `new X` has no list, and no child of its own is an argument. A
    // comment may come between arguments.
    const list = named(node).find((child) => child.type === "arguments");
    return named(list ?? node).filter(
      (child) =>
        child.type === "argument" || child.type === "variadic_placeholder",
    );
  };
  /** An argument's value: its last child, after the name of a named one. */
  const argumentValue = (argument: Node | undefined): Node | undefined =>
    argument === undefined ? undefined : named(argument).at(-1);
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
      const scoped = /^(\w+)::(.+)/.exec(name);
      if (scoped !== null) {
        const owner = relativeClass(node, scoped[1] as string);
        if (owner !== undefined)
          return [owner === null ? `*.${scoped[2]}` : `${owner}::${scoped[2]}`];
      }
      return [name.includes("::") ? name : lower(name)];
    }
    if (node.type === "anonymous_function" || node.type === "arrow_function")
      return [];
    if (node.type === "array_creation_expression") {
      const items = named(node).map((item) => named(item));
      if (items.length !== 2 || items.some((item) => item.length !== 1))
        return null;
      const [owner, method] = items.map((item) => item[0]) as [Node, Node];
      const methodName = literal(method);
      if (methodName === null) return null;
      const ownerText = literal(owner);
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
    if (node.type === "class_declaration")
      classes.set(lower(selfName(node)), parentName(node));
    for (const child of named(node)) declareClasses(child);
  };
  declareClasses(root);

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
  /**
   * The class of the object a method is called on, when the code names it:
   * `$this` (null in a trait or an anonymous class) and `new X`; undefined
   * for any other object.
   */
  const instanceClass = (call: Node): string | null | undefined => {
    let object = field(call, "object") as Node;
    while (object.type === "parenthesized_expression")
      object = named(object)[0] as Node;
    if (object.text === "$this") return relativeClass(call, "self") ?? null;
    // `new static`, `new $class` and `new class {}` are null.
    if (object.type === "object_creation_expression")
      return resolveClass(named(object)[0] as Node);
    return undefined;
  };

  /** Whether the file names a class `Env` (or Laravel's support namespace). */
  const namesEnv =
    /\benv\s*::|\b(?:new|extends)\s+env\b|\\env\b|illuminate\s*\\\s*support\b/i.test(
      root.text,
    );

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
    const scoped = /(.*)::(.*)/.exec(name);
    // A function, not a method.
    if (scoped === null && !name.startsWith("*.")) return false;
    const method = lower(
      scoped === null ? name.slice(2) : (scoped[2] as string),
    );
    if (!ENV_METHODS.has(method)) return false;
    let owner = scoped?.[1];
    if (scoped === null) {
      // `static::get()`, `$class::get()`: any class.
      if (statically) {
        refuse(node);
        return false;
      }
      // A static getter may be called on an instance: `$this->get()` in a
      // subclass, `(new Env)->get()`. Another object's method is not one.
      const instance = instanceClass(node);
      // `$env = new Env(); $env->get('X')`, `$self = $this; $self->get()`.
      if (instance === undefined) {
        if (namesEnv) refuse(node);
        return false;
      }
      if (instance === null) {
        refuse(node);
        return false;
      }
      owner = instance;
    }
    const reach = envReach(owner as string);
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
    // `$db->prepare($sql)` may be a call of PDO::prepare. A method's name
    // is the only one.
    const method = names[0] as string;
    const unknown =
      !matches &&
      method.startsWith("*.") &&
      lower(method.slice(2)) === lastSegment(options.callee);
    if (!matches && !unknown) return;
    const first = callArguments(node)[0];
    if (first === undefined) return;
    if (unknown || field(first, "name") !== null) {
      // A named argument may be the first parameter.
      refuse(node);
      return;
    }
    // `exec(...)` makes a callable of the callee, called elsewhere with
    // arguments Kibi does not see; a spread (`...$args`) has no literal
    // value either.
    const value = literal(argumentValue(first));
    if (value === null) refuse(node);
    else members.push(value);
  };

  /** What a callable handed to a builtin means for the extract. */
  const handedCallable = (argument: Node, value: Node | undefined): void => {
    const reached = callable(value);
    // `call_user_func('class_alias', ...)` renames a class at run time.
    if (
      reached?.some((target) =>
        /^(?:class_alias|create_function)$/i.test(target),
      ) &&
      extract !== "property" &&
      extract !== "imports"
    ) {
      refuse(argument);
      return;
    }
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
      // A named argument is the callable when it names that parameter
      // (`callback:`, `value:` for assert_options).
      for (const argument of list) {
        const parameter = lower(field(argument, "name")?.text ?? "");
        if (
          parameter !== "" &&
          (positions === "all" ||
            parameter === "callback" ||
            (key === "assert_options" && parameter === "value"))
        )
          handed.add(argument);
      }
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
    if (
      key === "curl_setopt" ||
      key === "curl_setopt_array" ||
      key === "curl_multi_setopt"
    ) {
      // CURLOPT_*FUNCTION and CURLMOPT_*FUNCTION options take a callback.
      const pairs: [Node | undefined, Node | undefined, Node][] = [];
      if (key !== "curl_setopt_array") {
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
        const constant = /^\\?CURLM?OPT_\w+$/.test(option.text);
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
    // The function or file the catch is in: a reference to the variable
    // (`use (&$e)`, `$r = &$e`), `global $e`, `extract()`, a variable
    // variable or `$GLOBALS` may replace it without an assignment in the
    // catch body.
    let scope: Node = clause;
    while (
      scope.parent !== null &&
      !/^(?:anonymous_function|arrow_function|function_definition|method_declaration)$/.test(
        scope.type,
      )
    )
      scope = scope.parent;
    const variable = name.replace(/^\$/, "");
    if (
      new RegExp(
        `&\\s*\\$${variable}\\b|\\bglobal\\b[^;]*\\$${variable}\\b`,
        "i",
      ).test(scope.text) ||
      /\b(?:extract|parse_str|mb_parse_str)\s*\(|\$\$|\$\{|\$GLOBALS\b/i.test(
        scope.text,
      )
    )
      return false;
    // An included file shares the scope's variables.
    if (/\b(?:include|require)(?:_once)?\b/i.test(body.text)) return false;
    // At file scope, a function the catch body calls may set the global.
    if (
      scope.parent === null &&
      /\(|\b(?:include|require)(?:_once)?\b|`/.test(
        body.text.replace(/\bthrow\s+\$\w+\s*;/g, ""),
      )
    )
      return false;
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
        case "argument": {
          if (field(parent, "name")?.id === use.id) return false;
          // A constructor or a builtin that takes it by value keeps it; a
          // function or method may take it by reference and replace it.
          const call = parent.parent?.parent;
          // A project class's constructor may take it by reference.
          if (call?.type === "object_creation_expression") {
            const type = named(call)[0];
            const owner =
              type === undefined || type.type === "variable_name"
                ? null
                : resolveClass(type);
            return owner !== null && BUILTIN_THROWABLES.has(lower(owner));
          }
          if (call?.type !== "function_call_expression") return false;
          const callee = lower(
            stripLeading(field(call, "function")?.text ?? ""),
          );
          return BY_VALUE_BUILTINS.has(callee);
        }
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
  /** Whether `define()` and `const` together name the key more than once. */
  const definedTwice =
    [...root.text.matchAll(/\bdefine\s*\(\s*(['"])(.*?)\1/gi)].filter(
      (match) => match[2] === options.key,
    ).length +
      [
        ...root.text.matchAll(/\bconst\s+(?:\w+\s+)?([A-Za-z_]\w*)\s*=/g),
      ].filter((match) => match[1] === options.key).length >
    1;

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
    if (node.type === "name" || node.type === "qualified_name") {
      if (!/^\\?(?:CURLOPT|CURLINFO|CURLMOPT)_\w+$/.test(node.text))
        return false;
      // `CURLOPT_ACL` may be a constant the file defines (`const
      // CURLOPT_ACL = 'acl';`, `define('CURLOPT_ACL', 'acl')`).
      // An included file may define it too.
      const name = node.text.replace(/^\\/, "");
      return (
        !new RegExp(`\\b(?:const|define)\\b[^;]*\\b${name}\\b`).test(
          root.text,
        ) && !/\b(?:include|require)(?:_once)?\b/i.test(root.text)
      );
    }
    if (node.type !== "class_constant_access_expression") return false;
    const [owner, constant] = named(node);
    return (
      owner !== undefined &&
      // `PDO::ATTR_X` in `namespace App;` may be `App\PDO`'s.
      lower(resolveClass(owner) ?? "") === "pdo" &&
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
    let highest: bigint | null = null;
    for (const item of named(node)) {
      if (item.type !== "array_element_initializer") continue;
      const parts = named(item);
      if (parts.length === 1 && parts[0]?.type === "variadic_unpacking")
        return null;
      if (parts.length === 1) {
        if (highest !== null && highest < 0n) return null;
        entries.push({ key: next.toString(), value: parts[0], item });
        highest = next;
        next += 1n;
        continue;
      }
      const keyNode = parts[0] as Node;
      const key = intConstant(keyNode) ? undefined : keyOf(keyNode);
      if (key === undefined) continue;
      entries.push({ key, value: parts.at(-1), item });
      if (key !== null && /^(?:0|-?[1-9]\d*)$/.test(key)) {
        // While every integer key is negative, the next implicit key is the
        // largest + 1 from PHP 8.3 and 0 before it: the version decides.
        const number = BigInt(key);
        if (highest === null || number > highest) highest = number;
        if (number >= next) next = number + 1n;
      }
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
      // `define(value: 1, constant_name: 'K')` names its arguments.
      const byName = (wanted: string, position: number): Node | undefined =>
        list.find(
          (argument) => lower(field(argument, "name")?.text ?? "") === wanted,
        ) ??
        (list[position] !== undefined &&
        field(list[position] as Node, "name") === null
          ? list[position]
          : undefined);
      const key = literal(argumentValue(byName("constant_name", 0)));
      if (key === null) refuse(node);
      else if (key === options.key && definedTwice)
        // A second `define` (or one after `const`) of a name fails and
        // keeps the first value.
        refuse(node);
      else if (key === options.key) {
        const value = literal(argumentValue(byName("value", 1)));
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
      // The last array that has the key gives its value (`_recursive`
      // merges them), so an earlier literal is overwritten and a later array
      // Kibi cannot read may hold the key. `array_merge` renumbers integer
      // keys.
      const values = list.map((argument) => argumentValue(argument));
      const holds = values.map((value) =>
        value?.type === "array_creation_expression"
          ? arrayHasKey(value)
            ? "key"
            : "other"
          : "unknown",
      );
      const first = holds.indexOf("key");
      if (
        first !== -1 &&
        (holds.slice(first + 1).some((kind) => kind !== "other") ||
          (name.endsWith("_recursive") && holds.includes("unknown")) ||
          (numericKey && name.startsWith("array_merge")))
      )
        refuse(node);
    }
    // A whole-array rewrite stored back (`$o = str_replace(...)`, or
    // `array_splice` in place) in a file that names the key, includes
    // another, or runs at the top level, where its variables are the ones
    // other included files set. Keys from a case change.
    if (ARRAY_TRANSFORMS.has(name)) {
      let outer: Node = node;
      while (outer.parent?.type === "parenthesized_expression")
        outer = outer.parent;
      const stored =
        name === "array_splice" ||
        (outer.parent?.type === "assignment_expression" &&
          field(outer.parent, "right")?.id === outer.id);
      if (
        name === "array_change_key_case"
          ? lower(root.text).includes(lower(options.key))
          : stored &&
            (root.text.includes(options.key) ||
              /\b(?:include|require)(?:_once)?\b/i.test(root.text) ||
              !insideFunctionScope(node))
      )
        refuse(node);
    }
    // `array_unshift($levels, 'x')` renumbers every slot.
    if (numericKey && /^array_(?:unshift|push|splice|shift|pop)$/.test(name))
      refuse(node);
    // Keys built from data, and a callback that may change values by reference.
    if (
      name === "array_fill_keys" ||
      name === "array_combine" ||
      name === "array_flip"
    )
      refuse(node);
    if (name === "array_walk" || name === "array_walk_recursive") {
      const callback = argumentValue(list[1]);
      const first = named(field(callback ?? root, "parameters") ?? root).find(
        (child) => /_parameter$/.test(child.type),
      );
      const byValue =
        (callback?.type === "anonymous_function" ||
          callback?.type === "arrow_function") &&
        (first === undefined || field(first, "reference_modifier") === null);
      if (!byValue) refuse(node);
    }
  };

  /**
   * Whether a string may name an environment getter that some code calls:
   * `'getenv'`, `'env'`, `'Illuminate\Support\Env::get'`. An array key, or
   * the variable a getter is asked for, names none.
   */
  const callableEnvName = (node: Node, value: string): boolean => {
    const name = lower(stripLeading(value));
    const parent = node.parent;
    // `'env'` is a common word: only one handed to a function may be the
    // helper called by name.
    const getter =
      /^(?:apache_)?getenv$/.test(name) ||
      (name === "env" &&
        parent?.type === "argument" &&
        parent.parent?.parent?.type === "function_call_expression") ||
      /^illuminate\\support\\env(?:::\w+)?$/.test(name);
    if (!getter) return false;
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

  /**
   * Whether a filter or fetch mode may be a callback Kibi cannot name: a
   * filter that is not a `FILTER_*` constant (`1024` is FILTER_CALLBACK),
   * also in a definition array, a fetch mode that is not a `PDO::FETCH_*` constant
   * (`10` is FETCH_FUNC), or an ini option that takes a callback.
   */
  const callbackMode = (
    node: Node,
    name: string,
    names: readonly string[],
  ): boolean => {
    const list = callArguments(node);
    if (/^filter_(?:var|var_array|input|input_array)$/.test(name)) {
      const filter = list[name.startsWith("filter_input") ? 2 : 1];
      return (
        list.some(
          (argument) =>
            argument.type !== "argument" || field(argument, "name") !== null,
        ) ||
        (filter !== undefined &&
          !/^\\?FILTER_\w+$/.test(argumentValue(filter)?.text ?? "") &&
          !(
            name.endsWith("_array") &&
            argumentValue(filter)?.type === "array_creation_expression"
          )) ||
        // `['filter' => 1024, 'options' => 'system']` in a definition.
        /['"]filter['"]\s*=>\s*(?!\\?FILTER_\w+\s*[,\]])/.test(node.text)
      );
    }
    if (
      names.some((candidate) =>
        /^(?:\*\.|.*::)(?:fetch|fetchall|setfetchmode|fetchobject)$/i.test(
          candidate,
        ),
      ) &&
      list.length > 1
    )
      return !/^\\?PDO::FETCH_\w+(?:\s*\|\s*\\?PDO::FETCH_\w+)*$/.test(
        argumentValue(list[0])?.text ?? "",
      );
    if (name === "ini_set" || name === "ini_alter") {
      const byName = list.some(
        (argument) =>
          argument.type !== "argument" || field(argument, "name") !== null,
      );
      const option = byName ? null : literal(argumentValue(list[0]));
      return (
        option === null ||
        /^(?:unserialize_callback_func|assert\.callback)$/i.test(option)
      );
    }
    return false;
  };

  const visit = (node: Node): void => {
    switch (node.type) {
      case "function_call_expression":
      case "member_call_expression":
      case "nullsafe_member_call_expression":
      case "scoped_call_expression": {
        const read = callNames(node);
        if (read === null) {
          // A method name or target computed at run time.
          const functionLike =
            node.type === "function_call_expression" ||
            node.type === "scoped_call_expression";
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
        // `ReflectionMethod::createFromMethodName('A::m')` builds a callable.
        if (
          names.some((candidate) =>
            /(?:^|\\)reflection\w*::/i.test(candidate),
          ) &&
          extract !== "property" &&
          extract !== "imports"
        ) {
          refuse(node);
          break;
        }
        // `$r->invoke('rm')` on a Reflection object (also through a subclass
        // or an anonymous class), a callback filter, a PDO row callback, a
        // SOAP function table and `class_alias` call or rename what they
        // are given at run time.
        if (
          extract !== "property" &&
          extract !== "imports" &&
          (names.some((candidate) =>
            /^(?:\*\.|.*::)(?:invoke|invokeargs|newinstance|newinstanceargs|newinstancewithoutconstructor|getclosure|addfunction|registerphpfunctions)$/i.test(
              candidate,
            ),
          ) ||
            name === "class_alias" ||
            callArguments(node).some((argument) =>
              /\b(?:FILTER_CALLBACK|FETCH_FUNC)\b/.test(argument.text),
            ) ||
            callbackMode(node, name, names))
        ) {
          refuse(node);
          break;
        }
        if (name === "eval" || CODE_FUNCTIONS.has(name) || codeText) {
          if (extract !== "property") refuse(node);
          break;
        }
        if (extract === "calls") members.push(...names);
        if (
          env &&
          envMethod(name, node, node.type === "scoped_call_expression")
        ) {
          // `getenv(name: 'HOME')` names the variable by its parameter.
          const parameter =
            name === "getenv"
              ? "name"
              : name === "apache_getenv"
                ? "variable"
                : "key";
          const list = callArguments(node);
          const first =
            firstPositional(node) ??
            (list.some(
              (argument) =>
                argument.type !== "argument" ||
                named(argument).some(
                  (child) => child.type === "variadic_unpacking",
                ),
            )
              ? undefined
              : list.find(
                  (argument) =>
                    lower(field(argument, "name")?.text ?? "") === parameter,
                ));
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
          // `const INPUT_GET = \INPUT_ENV;` in a namespace renames a source.
          if (
            /^INPUT_\w+$/.test(source) &&
            new RegExp(`\\b(?:const|define)\\b[^;]*\\b${source}\\b`).test(
              root.text,
            )
          )
            refuse(node);
          else if (ENV_INPUTS.has(source.replace(/^\\/, ""))) {
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
        if (extract === "property") {
          propertyCall(node, name);
          // `ReflectionProperty::setValue`, `ArrayObject::offsetSet` and
          // `exchangeArray` set a value Kibi does not follow.
          if (
            names.some((candidate) =>
              /^(?:\*\.|.*::)(?:setstaticpropertyvalue|offsetset|offsetunset|exchangearray)$/i.test(
                candidate,
              ),
            ) ||
            (names.some((candidate) =>
              /^(?:\*\.|.*::)setvalue$/i.test(candidate),
            ) &&
              /\bReflection\w*\b/i.test(root.text))
          )
            refuse(node);
        }
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
        // Reflection calls, reads and builds whatever it is given at run
        // time, and a class computed at run time may be Reflection.
        if (
          (owner !== null && /^reflection/i.test(finalName(owner))) ||
          (type !== undefined &&
            type.type !== "name" &&
            type.type !== "qualified_name" &&
            type.type !== "anonymous_class" &&
            !/^(?:static|self|parent)$/i.test(type.text) &&
            // `new $controller()` with no argument cannot hand Reflection or
            // a Fiber anything to call.
            callArguments(node).length > 0)
        ) {
          refuse(node);
          break;
        }
        // `new Fiber('task')` calls what it is handed.
        const position =
          owner === null
            ? undefined
            : CALLABLE_CONSTRUCTORS.get(lower(stripLeading(owner)));
        if (position !== undefined) {
          const list = callArguments(node);
          const argument = list[position];
          if (argument !== undefined)
            handedCallable(argument, argumentValue(argument));
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
        if (extract === "calls") members.push("exit", "die");
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
        if (extract !== "imports") {
          // `include 'data://text/plain,<?php system(...);'` runs code the
          // file does not show.
          const value = literal(named(node)[0] as Node);
          if (value !== null && isStream(value)) refuse(node);
          break;
        }
        const path = includePath(named(node)[0] as Node);
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
        // `preg_match('/(?<acl>\w+)/', $s, $m)` sets the key `acl` of `$m`.
        if (
          extract === "property" &&
          new RegExp(
            `\\(\\?P?(?:<${options.key.replace(/[^\w]/g, "\\$&")}>|'${options.key.replace(/[^\w]/g, "\\$&")}')`,
          ).test(node.text)
        )
          refuse(node);
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
        let thrown = named(node)[0];
        // `throw (new X)` throws X.
        while (
          thrown?.type === "parenthesized_expression" &&
          named(thrown).length === 1
        )
          thrown = named(thrown)[0];
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
          if (read === null) refuse(node);
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
        // A stream context's `'notification' => 'cb'` is called on events.
        if (extract === "calls" || extract === "string_args" || env)
          for (const element of named(node)) {
            const parts = named(element);
            if (
              element.type === "array_element_initializer" &&
              parts.length === 2 &&
              literal(parts[0] as Node) === "notification"
            )
              handedCallable(element, parts[1]);
          }
        if (extract === "property") {
          arrayKeys(node);
          // `['acl' => &$a]` lets a later `$a = ...` set the slot.
          for (const element of named(node))
            if (
              element.type === "array_element_initializer" &&
              named(element).some((part) => part.type === "by_ref")
            ) {
              const slot =
                named(element).length === 2 ? named(element)[0] : undefined;
              const written = slot === undefined ? null : literal(slot);
              if (written === null || written === options.key) refuse(element);
            }
        }
        break;
      case "list_literal":
        // `['acl' => &$a] = $opts` binds a reference to the slot.
        if (
          extract === "property" &&
          named(node).some((part) => part.type === "by_ref")
        )
          refuse(node);
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
      case "update_expression":
      case "unset_statement":
      case "foreach_statement": {
        if (extract !== "property") break;
        // `$cfg['port']++` and `unset($o['acl'])` change the value, and
        // `foreach ($o as &$v)` may change any value of the array.
        if (node.type === "foreach_statement") {
          const body = field(node, "body");
          const header = named(node).filter((child) => child.id !== body?.id);
          // `foreach ($o as $k => &$v)`, and a value written to a key
          // (`foreach ($rows as $o['acl'])`, `as [$o['acl']]`).
          const targets: Node[] = [];
          const gather = (part: Node): void => {
            if (part.type === "by_ref") refuse(node);
            else if (
              part.type === "subscript_expression" ||
              /member_access_expression$/.test(part.type) ||
              part.type === "scoped_property_access_expression"
            )
              targets.push(part);
            else for (const child of named(part)) gather(child);
          };
          for (const part of header.slice(1)) gather(part);
          if (
            targets.some((target) => {
              const written = writtenKey(target);
              return written === "dynamic" || written === options.key;
            })
          )
            refuse(node);
          break;
        }
        for (const target of named(node)) {
          const key = writtenKey(target);
          if (key === "dynamic" || key === options.key) refuse(node);
        }
        break;
      }
      case "assignment_expression":
      case "augmented_assignment_expression":
      case "reference_assignment_expression": {
        if (extract !== "property") break;
        const left = field(node, "left");
        // `[$o['acl']] = [...]` writes through a destructuring target, and
        // `$r = &$o['acl']` lets `$r` write the key.
        const targets: Node[] = [];
        const gather = (part: Node): void => {
          if (
            part.type === "subscript_expression" ||
            /member_access_expression$/.test(part.type) ||
            part.type === "scoped_property_access_expression"
          )
            targets.push(part);
          else for (const child of named(part)) gather(child);
        };
        if (
          left !== null &&
          (left.type === "list_literal" ||
            left.type === "array_creation_expression")
        )
          gather(left);
        if (node.type === "reference_assignment_expression") {
          const right = field(node, "right");
          if (right !== null) targets.push(right);
        }
        if (
          targets.some((target) => {
            const written = writtenKey(target);
            return written === "dynamic" || written === options.key;
          })
        ) {
          refuse(node);
          break;
        }
        // `$o += ['acl' => 'x']` keeps a value `$o` already has.
        const right = field(node, "right");
        if (
          node.type === "augmented_assignment_expression" &&
          field(node, "operator")?.text === "+=" &&
          right?.type === "array_creation_expression" &&
          arrayHasKey(right)
        ) {
          refuse(node);
          break;
        }
        const key = writtenKey(left);
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
        // A promoted parameter holds what each `new` passes; its default is
        // only one of them.
        if (node.type === "property_promotion_parameter") {
          refuse(node);
          break;
        }
        const value = field(node, "value");
        if (value === null) break;
        const read = literal(value);
        if (read === null) refuse(node);
        else members.push(read);
        break;
      }
      case "argument": {
        if (extract !== "property") break;
        {
          // `setv($o['acl'], 'x')` may set the key through a reference.
          const value = argumentValue(node);
          const call = node.parent?.parent;
          const callee =
            call?.type === "function_call_expression"
              ? lower(stripLeading(field(call, "function")?.text ?? ""))
              : null;
          if (
            value !== undefined &&
            (value.type === "subscript_expression" ||
              /member_access_expression$/.test(value.type) ||
              value.type === "scoped_property_access_expression") &&
            !(callee !== null && READS_SLOT.has(callee))
          ) {
            const written = writtenKey(value);
            if (written === "dynamic" || written === options.key) refuse(node);
          }
        }
        const name = field(node, "name");
        if (name !== null && name.text === options.key) {
          const value = literal(argumentValue(node));
          if (value === null) refuse(node);
          else members.push(value);
        }
        break;
      }
      case "property_declaration":
        // A PHP 8.4 hook (`$acl { get => ...; }`) computes the value on
        // every read.
        if (
          extract === "property" &&
          named(node).some((child) => child.type === "property_hook_list") &&
          named(node).some(
            (child) =>
              child.type === "property_element" &&
              field(child, "name")?.text.replace(/^\$/, "") === options.key,
          )
        ) {
          refuse(node);
          return;
        }
        break;
      case "property_element":
      case "const_element": {
        if (extract !== "property") break;
        const name = (field(node, "name") ?? named(node)[0])?.text.replace(
          /^\$/,
          "",
        );
        if (name !== options.key) break;
        if (node.type === "const_element" && definedTwice) {
          refuse(node);
          break;
        }
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

/** Whether a node runs inside a function, method or closure body. */
function insideFunctionScope(node: Node): boolean {
  for (let current = node.parent; current !== null; current = current.parent)
    if (
      /^(?:function_definition|method_declaration|anonymous_function|arrow_function|anonymous_function_creation_expression)$/.test(
        current.type,
      )
    )
      return true;
  return false;
}

function insideClosure(node: Node): boolean {
  // A class, method or function between the closure and `node` is the
  // scope `self` belongs to.
  for (
    let current = node.parent;
    current !== null &&
    !/^(?:class_declaration|method_declaration|function_definition)$/.test(
      current.type,
    );
    current = current.parent
  )
    if (
      current.type === "anonymous_function" ||
      current.type === "arrow_function" ||
      current.type === "anonymous_function_creation_expression"
    )
      return true;
  return false;
}

function enclosingClass(node: Node): Node | null {
  for (let current = node.parent; current !== null; current = current.parent)
    if (
      current.type === "class_declaration" ||
      current.type === "trait_declaration" ||
      current.type === "enum_declaration" ||
      current.type === "anonymous_class"
    )
      return current;
  return null;
}
