import type { Node } from "web-tree-sitter";
import { type UnresolvedRow, at, field, named } from "./reference-nodes.js";

/**
 * Terraform and HCL references: the literal values of an attribute or object
 * key. Configuration has no imports, calls, environment reads or errors of
 * its own that a file names, so only `property` is read. A value Kibi cannot
 * know without evaluating the configuration (a variable, a local, a function
 * call, an interpolated template) is an unresolved row, and so is any object
 * key it cannot name, since that key may be the one asked for.
 */

/**
 * Functions whose result is an object with keys their arguments spell only
 * as text or data (`jsondecode("{\"acl\": \"public\"}")`, `zipmap(["acl"],
 * ...)`): the key may be inside, unseen.
 */
const HCL_KEY_FUNCTIONS = new Set([
  "jsondecode",
  "yamldecode",
  "csvdecode",
  "zipmap",
  "transpose",
  // Named capture groups become object keys.
  "regex",
  "regexall",
  // Terragrunt: another file's configuration as an object.
  "read_terragrunt_config",
]);

/**
 * The function a call names: `core::jsondecode` is `jsondecode`. A
 * provider-defined function (`provider::aws::arn_parse`) may return any
 * object, so it is treated like the key functions.
 */
function keyFunction(call: Node): boolean {
  const name = callee(call);
  return HCL_KEY_FUNCTIONS.has(name) || name.startsWith("provider::");
}

/** The function a call names, as written. */
function functionName(call: Node): string {
  return (named(call)[0] as Node).text;
}

/** The function a call names, without a `core::` prefix. */
function callee(call: Node): string {
  return functionName(call).replace(/^core::/, "");
}

/**
 * A call's arguments, and the `...` after the last one in `f(list...)`: the
 * parts of its last part, which is its name when it has no arguments.
 */
function callArguments(call: Node): Node[] {
  return parts(parts(call).at(-1) as Node);
}

/** An object element's key expression. */
function keyOf(elem: Node): Node {
  return field(elem, "key") as Node;
}

/** An object element's value expression. */
function elemValue(elem: Node): Node {
  return field(elem, "val") as Node;
}

/** Named children other than comments. */
function parts(node: Node): Node[] {
  return named(node).filter((child) => child.type !== "comment");
}

/** The one named child of an `expression` wrapper, or null for a compound. */
function single(node: Node | null): Node | null {
  if (node === null) return null;
  if (node.type !== "expression") return node;
  const inner = parts(node);
  return inner.length === 1 ? single(inner[0] as Node) : null;
}

/** Whether an expression is wrapped in parentheses, which force evaluation. */
function parenthesized(node: Node): boolean {
  return (node.child(0) as Node).type === "(";
}

const ESCAPES: Readonly<Record<string, string>> = {
  n: "\n",
  r: "\r",
  t: "\t",
  '"': '"',
  "\\": "\\",
};

/**
 * The text of a template literal: `\n`, `\t`, `\r`, `\"`, `\\`, `\uNNNN`,
 * `\UNNNNNNNN` and the `$${` and `%%{` escapes decoded, or null for a code
 * point that is not a character. The grammar admits no other escape: a
 * file with one is a syntax error, never read.
 */
function decode(text: string): string | null {
  let value = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    // `$${` is `${` and `%%{` is `%{`: the first `$` or `%` is dropped.
    if (text.startsWith("$${", index) || text.startsWith("%%{", index))
      continue;
    if (char === "\\") {
      const next = text.charAt(index + 1);
      const simple = ESCAPES[next];
      if (simple !== undefined) {
        value += simple;
        index += 1;
        continue;
      }
      const digits = next === "u" ? 4 : 8;
      const point = Number.parseInt(
        text.slice(index + 2, index + 2 + digits),
        16,
      );
      // A surrogate is not a character: HCL writes U+FFFD for it.
      if (point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return null;
      value += String.fromCodePoint(point);
      index += 1 + digits;
    } else value += char;
  }
  // HCL normalizes string literals to NFC.
  return value.normalize("NFC");
}

/**
 * A number as HCL holds it: `007` is 7, `3.0e3` is 3000 and `1.50` is 1.5.
 * Integers keep every digit; other values are written in their shortest
 * decimal form, or refused when that would round them.
 */
function canonicalNumber(text: string): string | null {
  // A numeric literal's text always matches; other literals (`true`, `"1"`)
  // do not.
  const match = /^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?/.exec(text);
  if (match === null) return null;
  // The value is digits × 10^scale, written in plain decimal as Terraform
  // prints it (`0.0000001`, never `1e-7`).
  const fraction = match[2] ?? "";
  let digits = `${match[1]}${fraction}`.replace(/^0+(?=\d)/, "");
  // `Number("")` is 0: no exponent.
  let scale = Number(match[3] ?? "") - fraction.length;
  if (Math.abs(scale) > 400) return null;
  if (digits === "0") return "0";
  // Trailing zeros move into the scale.
  while (digits.endsWith("0")) {
    digits = digits.slice(0, -1);
    scale += 1;
  }
  // Terraform holds a number in 512 bits (about 154 digits) and rounds a
  // longer one.
  if (digits.length > 150) return null;
  if (scale >= 0) return `${digits}${"0".repeat(scale)}`;
  const padded = digits.padStart(-scale + 1, "0");
  return `${padded.slice(0, scale)}.${padded.slice(scale)}`;
}

/**
 * A string literal (a quoted string with no interpolation or directive),
 * read from the source between its quotes: the grammar's literal nodes
 * leave out blanks at the ends (`" acl "`).
 */
function quoted(node: Node): string | null {
  return decode(node.text.slice(1, -1));
}

/**
 * A `<<EOT` heredoc with no interpolation or directive: its lines, each
 * ending with a newline. An indented `<<-EOT` heredoc is not read.
 */
function heredoc(node: Node): string | null {
  const match = new RegExp(
    `^<<([A-Za-z_][\\w-]*)\\r?\\n([\\s\\S]*?)${GO_SPACE}*\\1${GO_SPACE}*$`,
  ).exec(node.text);
  if (match === null) return null;
  const marker = match[1] as string;
  const body = match[2] as string;
  // An interpolation or a directive (or its `$${` or `%%{` escape, which a
  // literal reads the same) is not a literal.
  if (body.includes("${") || body.includes("%{")) return null;
  // Terraform ends a heredoc on a line that is the marker once any Unicode
  // blank (U+00A0, \v, \f) is trimmed; the grammar does not.
  if (body.split("\n").some((line) => goTrim(line) === marker)) return null;
  // Line ends are kept as written (`\r\n` on a CRLF checkout).
  return body.normalize("NFC");
}

/** A blank to Go's `unicode.IsSpace`, which Terraform trims a heredoc line with. */
const GO_SPACE =
  "[\\t\\v\\f\\r \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]";

function goTrim(line: string): string {
  return line.replace(new RegExp(`^${GO_SPACE}+|${GO_SPACE}+$`, "g"), "");
}

/** The scalar literal values an expression holds (each item of a tuple). */
function values(node: Node | null): string[] | null {
  const value = single(node);
  if (value === null) return null;
  switch (value.type) {
    case "literal_value": {
      const literal = named(value)[0] as Node;
      if (literal.type === "string_lit") return wrap(quoted(literal));
      if (literal.type === "numeric_lit")
        return wrap(canonicalNumber(literal.text));
      return [literal.text];
    }
    // A quoted template holds an interpolation or a directive (a string
    // without one is a literal value), so only a heredoc may be literal.
    case "template_expr":
      return wrap(heredoc(named(value)[0] as Node));
    case "collection_value": {
      // An object's parts (`{`, its elements) are not values: it is null.
      const collection = named(value)[0] as Node;
      const items: string[] = [];
      for (const item of parts(collection)) {
        if (item.type === "tuple_start" || item.type === "tuple_end") continue;
        const read = values(item);
        if (read === null) return null;
        items.push(...read);
      }
      return items;
    }
    case "operation": {
      // `-1` is a unary operation on a number; `-1[0]` and `-1.x` select from
      // it. A binary operation starts with its first operand, never a `-`
      // literal; a literal operand other than a number is no number.
      const operation = named(value)[0] as Node;
      const [first, ...selectors] = parts(operation);
      const operand = single(first as Node);
      const number =
        operation.text.startsWith("-") &&
        selectors.length === 0 &&
        operand?.type === "literal_value"
          ? canonicalNumber(operand.text)
          : null;
      return number === null ? null : [number === "0" ? "0" : `-${number}`];
    }
    default:
      return null;
  }
}

function wrap(value: string | null): string[] | null {
  return value === null ? null : [value];
}

/** An object key's name: a bare identifier or a literal string. */
function keyName(node: Node): string | null {
  const key = single(node);
  // An identifier key becomes a string, which HCL normalizes to NFC. `(k) = v`
  // evaluates k: only a literal inside is a name.
  if (!parenthesized(node) && key?.type === "variable_expr")
    return key.text.normalize("NFC");
  // A template (an interpolation, a heredoc) names no key.
  if (key?.type !== "literal_value") return null;
  const literal = named(key)[0] as Node;
  if (literal.type === "string_lit")
    return quoted(literal)?.normalize("NFC") ?? null;
  // `{ 007 = ... }` has the key "7".
  if (literal.type === "numeric_lit") return canonicalNumber(literal.text);
  return literal.text;
}

/**
 * Whether a computed object key may be `key`: a template whose literal start
 * or end rules the key out cannot be it.
 */
function mayBeKey(node: Node, key: string): boolean {
  const value = single(node);
  if (value?.type === "literal_value") {
    const name = keyName(node);
    return name === null || name === key;
  }
  if (value?.type !== "template_expr") return true;
  const template = named(value)[0] as Node;
  // `${~ x}` and `${x ~}` strip the blanks next to them, escapes too.
  if (/\$\{~|~\}|%\{~/.test(template.text)) return true;
  // The parts between the quotes, at least one interpolation or directive.
  // A heredoc's first and last parts are its markers, never literal text.
  const pieces = named(template).slice(1, -1);
  const text = (piece: Node): string | null =>
    piece.type === "template_literal" ? decode(piece.text) : "";
  const head = text(pieces[0] as Node);
  const tail = text(pieces.at(-1) as Node);
  if (head === null || tail === null) return true;
  // NFC may compose the character next to an interpolation with what it
  // yields (a combining mark, a Hangul vowel), so that character and its
  // marks are left out of the comparison.
  const name = key.normalize("NFD");
  const start = head.normalize("NFD").replace(/\P{M}?\p{M}*$/u, "");
  const end = tail.normalize("NFD").replace(/^\p{M}*\P{M}?\p{M}*/u, "");
  return (
    name.startsWith(start) &&
    name.endsWith(end) &&
    start.length + end.length <= name.length
  );
}

/**
 * Functions whose result holds every argument's elements as written, so an
 * object element inside them is a value of the configuration.
 */
const KEEPS_ARGUMENTS = new Set([
  "merge",
  "tomap",
  "toset",
  "tolist",
  "concat",
  "flatten",
  "jsonencode",
  "yamlencode",
]);

/**
 * Whether converting a value to a type constraint leaves what it holds as
 * written: the type is `any`, a literal of the primitive type, `null`, or
 * an object, map or list whose elements are each kept. An object attribute
 * the type does not declare is dropped, so it is not kept.
 */
function kept(typeNode: Node | null, valueNode: Node): boolean {
  const type = single(typeNode);
  const value = single(valueNode);
  if (type === null || value === null) return false;
  // What the value holds: a literal's kind, a template's or a collection's.
  const inner = named(value)[0] as Node;
  if (inner.type === "null_lit") return true;
  // Only a named type (a variable expression) is written as one of these.
  switch (type.text) {
    case "any":
      return true;
    // A quoted template is a string; a heredoc is not read as one.
    case "string":
      return inner.type === "string_lit" || inner.type === "quoted_template";
    // `-1` is a number too.
    case "number":
      return (
        inner.type === "numeric_lit" ||
        (value.type === "operation" && values(value) !== null)
      );
    case "bool":
      return inner.type === "bool_lit";
  }
  // Another named type (`list` without its element type) is not kept either.
  if (type.type !== "function_call") return false;
  const name = callee(type);
  const typeArgs = callArguments(type);
  if (name === "optional") return kept(typeArgs[0] ?? null, valueNode);
  // An object's elements; a tuple has none.
  const elems = named(inner).filter((elem) => elem.type === "object_elem");
  if (name === "object" && inner.type === "object") {
    const shape = single(typeArgs[0] ?? null);
    const object = shape === null ? undefined : named(shape)[0];
    if (object?.type !== "object") return false;
    // A computed key in the value is no declared attribute.
    const attributes = new Map<string | null, Node>();
    for (const elem of named(object))
      if (elem.type === "object_elem") {
        const attribute = keyName(keyOf(elem));
        // A type's attribute names are not normalized as object keys are:
        // `café` written decomposed declares no key a value can set.
        if (attribute === null || !nfcName(keyOf(elem))) return false;
        attributes.set(attribute, elemValue(elem));
      }
    return elems.every((elem) => {
      const attribute = keyName(keyOf(elem));
      return (
        attributes.has(attribute) &&
        kept(attributes.get(attribute) as Node, elemValue(elem))
      );
    });
  }
  if (name === "map" && inner.type === "object")
    return elems.every(
      (elem) =>
        keyName(keyOf(elem)) !== null &&
        kept(typeArgs[0] ?? null, elemValue(elem)),
    );
  // A set also drops duplicates and reorders, which a set of values keeps.
  if ((name === "list" || name === "set") && inner.type === "tuple")
    return parts(inner)
      .filter((item) => item.type === "expression")
      .every((item) => kept(typeArgs[0] ?? null, item));
  return false;
}

/** Whether a key is written as Unicode normalizes it (NFC). */
function nfcName(node: Node): boolean {
  return node.text === node.text.normalize("NFC");
}

/** Blocks whose `for_each` keys are instance keys. */
const FOR_EACH_BLOCKS = new Set<string | undefined>([
  "resource",
  "data",
  "module",
  "dynamic",
  "import",
  "provider",
  "ephemeral",
]);

/** An attribute's name. */
function attributeName(attribute: Node): string {
  return (named(attribute)[0] as Node).text;
}

/** The type of the block a node is in (`variable`), if any. */
function blockName(node: Node): string | undefined {
  for (let current = node.parent; current !== null; current = current.parent)
    if (current.type === "block") return (named(current)[0] as Node).text;
  return undefined;
}

/** The attribute a node is in. */
function attributeOf(node: Node): Node {
  let current = node;
  while (current.type !== "attribute") current = current.parent as Node;
  return current;
}

/** Whether an attribute is a variable's `type`, a type constraint. */
function variableType(attribute: Node): boolean {
  return (
    attributeName(attribute) === "type" && blockName(attribute) === "variable"
  );
}

/** Read `property` values of `key` from a parsed Terraform or HCL file. */
// implements REQ-kibi-tree-sitter-script-references
export function hclProperty(
  root: Node,
  key: string,
  file: string,
): { members: string[]; unresolved: UnresolvedRow[] } {
  const members: string[] = [];
  const unresolved: UnresolvedRow[] = [];
  const terragrunt = /\.hcl$/i.test(file);
  // Object keys are strings, which HCL normalizes to NFC.
  const objectKey = key.normalize("NFC");
  /** Whether an expression holds an object element that is or may be the key. */
  const holdsKey = (node: Node): boolean => {
    if (node.type === "object_elem") {
      const keyNode = keyOf(node);
      const name = keyName(keyNode);
      if (name === null ? mayBeKey(keyNode, objectKey) : name === objectKey)
        return true;
    }
    return named(node).some(holdsKey);
  };
  /**
   * The literal top-level keys of an object argument, or null when it is not
   * an object literal or a key is computed. With `owning`, only the keys
   * whose value holds the key (or that are the key).
   */
  const topKeys = (arg: Node, owning: boolean): string[] | null => {
    const value = single(arg);
    const object = value === null ? undefined : named(value)[0];
    if (object?.type !== "object") return null;
    const elems = named(object).filter((elem) => elem.type === "object_elem");
    const names = elems.map((elem) => keyName(keyOf(elem)));
    if (names.includes(null)) return null;
    return (names as string[]).filter(
      (_, index) => !owning || holdsKey(elems[index] as Node),
    );
  };
  /**
   * Whether evaluation may drop or replace the value an attribute or object
   * element holds: a conditional branch, an indexed or attribute-selected
   * collection, a `for` body, a splat, or the argument of a function that
   * does not keep its arguments whole (`coalesce`, `lookup`, `try`). A
   * typed variable's `default` is converted to its type.
   */
  const discarded = (owner: Node): boolean => {
    // A variable's `type` is read by typeConstraint.
    if (variableType(attributeOf(owner))) return false;
    // The owner is in an attribute, which ends the walk.
    for (let current = owner; ; current = current.parent as Node) {
      // `[a, b][1]`, `{...}.acl` and `x[*]` select from the collection: the
      // index, attribute or splat follows it in the same expression (an
      // index or a splat inside one is also inside such an expression).
      if (
        named(current).some((child) =>
          ["index", "get_attr", "splat"].includes(child.type),
        )
      )
        return true;
      switch (current.type) {
        // An operand of `==`, `!`, `&&` becomes a bool or number, and a
        // template `%{ if }` or `%{ for }` may drop what it holds.
        case "operation":
        case "template_directive":
        case "conditional":
        case "for_tuple_expr":
        case "for_object_expr":
          return true;
        // `{ settings = {acl = "x"}, settings = {} }` keeps the later value
        // of a key written twice, also one a computed key may spell.
        case "object_elem": {
          if (current.id === owner.id) break;
          const name = keyName(keyOf(current));
          const siblings = named(current.parent as Node);
          const later = siblings.slice(
            siblings.findIndex((other) => other.id === current.id) + 1,
          );
          if (
            later.some(
              (other) =>
                other.type === "object_elem" &&
                (name === null || [name, null].includes(keyName(keyOf(other)))),
            )
          )
            return true;
          break;
        }
        case "function_call":
          if (!KEEPS_ARGUMENTS.has(callee(current))) return true;
          break;
        case "attribute": {
          if (
            attributeName(current) !== "default" ||
            blockName(current) !== "variable"
          )
            return false;
          const type = named(current.parent as Node).find(
            (child) =>
              child.type === "attribute" && attributeName(child) === "type",
          );
          return (
            type !== undefined &&
            !kept(named(type)[1] as Node, named(current)[1] as Node)
          );
        }
      }
    }
  };
  const take = (owner: Node, value: Node): void => {
    const read = discarded(owner) ? null : values(value);
    if (read === null) unresolved.push(at(owner));
    else members.push(...read);
  };
  /**
   * A variable's `type` is a type constraint, not a value: only an
   * `optional(type, default)` attribute of `key` holds one.
   */
  const typeConstraint = (node: Node): void => {
    switch (node.type) {
      case "object_elem": {
        if (keyName(keyOf(node)) !== objectKey) break;
        const call = single(elemValue(node));
        if (!nfcName(keyOf(node))) unresolved.push(at(node));
        else if (
          call?.type === "function_call" &&
          functionName(call) === "optional"
        ) {
          const [type, value] = callArguments(call);
          // `optional(number, "007")` converts the default to 7.
          if (value === undefined) break;
          if (kept(type as Node, value)) take(node, value);
          else unresolved.push(at(node));
        }
        break;
      }
      // An `optional(type, default)` default is a value: an object default
      // may hold the key.
      case "function_call": {
        if (functionName(node) !== "optional") break;
        const [type, value] = callArguments(node);
        // An object default is converted to the optional's type, which may
        // drop or convert what it holds.
        if (value !== undefined) {
          if (kept(type as Node, value)) visit(value);
          else if (holdsKey(value)) unresolved.push(at(value));
        }
        if (type !== undefined) typeConstraint(type);
        return;
      }
    }
    for (const child of named(node)) typeConstraint(child);
  };
  const visit = (node: Node): void => {
    switch (node.type) {
      case "block": {
        // Terragrunt merges an included file's configuration into this one.
        if (terragrunt && (named(node)[0] as Node).text === "include") {
          unresolved.push(at(node));
          return;
        }
        break;
      }
      case "attribute": {
        const value = named(node)[1] as Node;
        if (attributeName(node) === key) take(node, value);
        if (variableType(node)) {
          typeConstraint(value);
          return;
        }
        break;
      }
      case "object_elem": {
        const keyNode = keyOf(node);
        const name = keyName(keyNode);
        if (name === null) {
          if (mayBeKey(keyNode, objectKey)) unresolved.push(at(node));
        } else if (name === objectKey) {
          // A key written twice keeps its last value.
          const twice = named(node.parent as Node).filter(
            (other) =>
              other.type === "object_elem" &&
              keyName(keyOf(other)) === objectKey,
          );
          if (twice.length > 1) unresolved.push(at(node));
          else take(node, elemValue(node));
        }
        break;
      }
      case "heredoc_template": {
        // Terraform ends a heredoc on a line that is the marker once any
        // Unicode blank (U+00A0, \v, \f) is trimmed; the grammar reads on.
        // The text starts with `<<` or `<<-` and the marker.
        const marker = (
          /[A-Za-z_][\w-]*/.exec(node.text) as RegExpExecArray
        )[0];
        const inner = node.text.split("\n").slice(1, -1);
        if (inner.some((line) => goTrim(line) === marker))
          unresolved.push(at(node));
        break;
      }
      case "for_object_expr": {
        // `{ for k, v in x : k => v }` makes keys at evaluation. The keys of
        // a `for_each` map are instance keys, not configuration values.
        // The parents are a for expression, an expression and its owner.
        const owner = ((node.parent as Node).parent as Node).parent as Node;
        const forEach =
          !terragrunt &&
          owner.type === "attribute" &&
          attributeName(owner) === "for_each" &&
          FOR_EACH_BLOCKS.has(blockName(node));
        // `for k, v in x : key => value`: the first expression is the key.
        const keyExpression = parts(node).find(
          (part) => part.type === "expression",
        ) as Node;
        if (!forEach && mayBeKey(keyExpression, objectKey))
          unresolved.push(at(node));
        break;
      }
      case "function_call": {
        if (keyFunction(node)) unresolved.push(at(node));
        else if (callee(node) === "merge") {
          // The last of the objects `merge` gets that holds the key wins, and
          // a later argument replaces a top-level key whole. In
          // `merge(list...)` the objects come from a list: the `...` is a
          // later argument whose keys are unknown.
          const list = callArguments(node);
          const first = list.findIndex(holdsKey);
          if (first === -1) break;
          const owners = topKeys(list[first] as Node, true);
          if (
            list.slice(first + 1).some((later) => {
              const keys = topKeys(later, false);
              return (
                owners === null ||
                keys === null ||
                keys.some((name) => owners.includes(name))
              );
            })
          )
            unresolved.push(at(node));
        }
        break;
      }
    }
    for (const child of named(node)) visit(child);
  };
  visit(root);
  return { members, unresolved };
}
