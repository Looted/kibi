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
function keyFunction(name: string): boolean {
  const bare = name.replace(/\s+/g, "").replace(/^core::/, "");
  return HCL_KEY_FUNCTIONS.has(bare) || bare.startsWith("provider::");
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
function parenthesized(node: Node | null): boolean {
  return (
    node !== null && node.type === "expression" && node.child(0)?.type === "("
  );
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
 * `\UNNNNNNNN` and the `$${` and `%%{` escapes decoded, or null for an
 * escape HCL does not define.
 */
function decode(text: string): string | null {
  let value = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (char === "$" && text.startsWith("$${", index)) {
      value += "${";
      index += 2;
    } else if (char === "%" && text.startsWith("%%{", index)) {
      value += "%{";
      index += 2;
    } else if (char === "\\") {
      const next = text[index + 1] ?? "";
      const simple = ESCAPES[next];
      if (simple !== undefined) {
        value += simple;
        index += 1;
        continue;
      }
      const digits = next === "u" ? 4 : next === "U" ? 8 : 0;
      const hex = text.slice(index + 2, index + 2 + digits);
      if (digits === 0 || !new RegExp(`^[0-9A-Fa-f]{${digits}}$`).test(hex))
        return null;
      const point = Number.parseInt(hex, 16);
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
  const match = /^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (match === null) return null;
  // The value is digits × 10^scale, written in plain decimal as Terraform
  // prints it (`0.0000001`, never `1e-7`).
  const fraction = match[2] ?? "";
  let digits = `${match[1]}${fraction}`.replace(/^0+(?=\d)/, "");
  let scale = Number(match[3] ?? "0") - fraction.length;
  if (!Number.isSafeInteger(scale) || Math.abs(scale) > 400) return null;
  while (scale < 0 && digits.endsWith("0") && digits.length > 1) {
    digits = digits.slice(0, -1);
    scale += 1;
  }
  if (/^0+$/.test(digits)) return "0";
  // Terraform holds a number in 512 bits (about 154 digits) and rounds a
  // longer one.
  if (digits.replace(/0+$/, "").length > 150) return null;
  if (scale >= 0) return `${digits}${"0".repeat(scale)}`;
  const padded = digits.padStart(-scale + 1, "0");
  return `${padded.slice(0, scale)}.${padded.slice(scale)}`;
}

/**
 * A quoted string or template with no interpolation or directive, read from
 * the source between its quotes: the grammar's literal nodes leave out
 * blanks at the ends (`" acl "`).
 */
function quoted(node: Node): string | null {
  const parts = named(node);
  const start = parts.find((part) => part.type === "quoted_template_start");
  const end =
    parts.at(-1)?.type === "quoted_template_end" ? parts.at(-1) : undefined;
  if (start === undefined || end === undefined) return null;
  if (
    parts.some(
      (part) =>
        part.type !== "quoted_template_start" &&
        part.type !== "quoted_template_end" &&
        part.type !== "template_literal",
    )
  )
    return null;
  return decode(
    node.text.slice(
      start.endIndex - node.startIndex,
      end.startIndex - node.startIndex,
    ),
  );
}

/**
 * A `<<EOT` heredoc with no interpolation or directive: its lines, each
 * ending with a newline. An indented `<<-EOT` heredoc is not read.
 */
function heredoc(node: Node): string | null {
  if (
    named(node).some(
      (part) =>
        part.type === "template_interpolation" ||
        part.type === "template_directive",
    )
  )
    return null;
  const match = new RegExp(
    `^<<([A-Za-z_][\\w-]*)\\r?\\n([\\s\\S]*?)${GO_SPACE}*\\1${GO_SPACE}*$`,
    "u",
  ).exec(node.text);
  if (match === null) return null;
  const marker = match[1] as string;
  const body = match[2] as string;
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
  return line.replace(new RegExp(`^${GO_SPACE}+|${GO_SPACE}+$`, "gu"), "");
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
    case "template_expr": {
      const template = named(value)[0] as Node;
      return wrap(
        template.type === "quoted_template"
          ? quoted(template)
          : heredoc(template),
      );
    }
    case "collection_value": {
      const collection = named(value)[0] as Node;
      if (collection.type !== "tuple") return null;
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
      // `-1` is a unary operation on a number.
      const operation = named(value)[0] as Node;
      const operand = single(named(operation)[0] ?? null);
      if (
        operation.type === "unary_operation" &&
        operation.text.trimStart().startsWith("-") &&
        operand?.type === "literal_value" &&
        named(operand)[0]?.type === "numeric_lit"
      ) {
        const number = canonicalNumber(operand.text);
        return number === null ? null : [number === "0" ? "0" : `-${number}`];
      }
      return null;
    }
    default:
      return null;
  }
}

function wrap(value: string | null): string[] | null {
  return value === null ? null : [value];
}

/** An object key's name: a bare identifier or a literal string. */
function keyName(node: Node | null): string | null {
  // `(k) = v` evaluates k: only a literal inside is a name.
  if (parenthesized(node)) {
    const inner = single(parts(node as Node)[0] ?? null);
    return inner?.type === "literal_value" || inner?.type === "template_expr"
      ? keyName(parts(node as Node)[0] ?? null)
      : null;
  }
  const key = single(node);
  if (key === null) return null;
  // An identifier key becomes a string, which HCL normalizes to NFC.
  if (key.type === "variable_expr") return key.text.normalize("NFC");
  if (key.type === "literal_value") {
    const literal = named(key)[0] as Node;
    if (literal.type === "string_lit")
      return quoted(literal)?.normalize("NFC") ?? null;
    // `{ 007 = ... }` has the key "7".
    if (literal.type === "numeric_lit") return canonicalNumber(literal.text);
    return literal.text;
  }
  if (key.type === "template_expr") {
    const template = named(key)[0] as Node;
    return template.type === "quoted_template"
      ? (quoted(template)?.normalize("NFC") ?? null)
      : null;
  }
  return null;
}

/**
 * Whether a computed object key may be `key`: a template whose literal start
 * or end rules the key out cannot be it.
 */
function mayBeKey(node: Node | null, key: string): boolean {
  const value = single(node);
  if (value?.type === "literal_value" || value?.type === "template_expr") {
    const name = keyName(node);
    if (name !== null) return name === key;
  }
  if (value?.type !== "template_expr") return true;
  const template = named(value)[0] as Node;
  if (template.type !== "quoted_template") return true;
  const pieces = named(template).filter(
    (part) =>
      part.type !== "quoted_template_start" &&
      part.type !== "quoted_template_end",
  );
  // `${~ x}` and `${x ~}` strip the blanks next to them, escapes too.
  if (/\$\{~|~\}|%\{~/.test(template.text)) return true;
  const first = pieces[0];
  const last = pieces.at(-1);
  const head = first?.type === "template_literal" ? decode(first.text) : "";
  const tail = last?.type === "template_literal" ? decode(last.text) : "";
  if (head === null || tail === null) return true;
  // NFC may compose the character next to an interpolation with what it
  // yields (a combining mark, a Hangul vowel), so that character and its
  // marks are left out of the comparison.
  const name = key.normalize("NFD");
  const start =
    first?.type === "template_literal"
      ? head.normalize("NFD").replace(/\P{M}?\p{M}*$/u, "")
      : "";
  const end =
    last?.type === "template_literal"
      ? tail.normalize("NFD").replace(/^\p{M}*\P{M}?\p{M}*/u, "")
      : "";
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
function kept(typeNode: Node | null, valueNode: Node | null): boolean {
  const type = single(typeNode);
  const value = single(valueNode);
  if (type === null || value === null) return false;
  const literal = value.type === "literal_value" ? named(value)[0] : undefined;
  if (literal?.type === "null_lit") return true;
  if (type.type === "variable_expr")
    switch (type.text.trim()) {
      case "any":
        return true;
      case "string":
        return (
          literal?.type === "string_lit" ||
          (value.type === "template_expr" &&
            named(value)[0]?.type === "quoted_template")
        );
      case "number":
        return (
          literal?.type === "numeric_lit" ||
          (values(value)?.length === 1 && value.type === "operation")
        );
      case "bool":
        return literal?.type === "bool_lit";
      default:
        return false;
    }
  if (type.type !== "function_call") return false;
  const name = named(type)[0]?.text.trim() ?? "";
  const args = named(type).find((child) => child.type === "function_arguments");
  const typeArgs =
    args === undefined
      ? []
      : parts(args).filter((arg) => arg.type === "expression");
  if (name === "optional") return kept(typeArgs[0] ?? null, valueNode);
  const collection =
    value.type === "collection_value" ? named(value)[0] : undefined;
  const elems =
    collection?.type === "object"
      ? named(collection).filter((elem) => elem.type === "object_elem")
      : [];
  if (name === "object" && collection?.type === "object") {
    const shape = single(typeArgs[0] ?? null);
    const object =
      shape?.type === "collection_value" ? named(shape)[0] : undefined;
    if (object?.type !== "object") return false;
    const attributes = new Map<string, Node | null>();
    for (const elem of named(object))
      if (elem.type === "object_elem") {
        const attribute = keyName(field(elem, "key"));
        // A type's attribute names are not normalized as object keys are:
        // `café` written decomposed declares no key a value can set.
        if (attribute === null || !nfcName(field(elem, "key"))) return false;
        attributes.set(attribute, field(elem, "val"));
      }
    return elems.every((elem) => {
      const attribute = keyName(field(elem, "key"));
      return (
        attribute !== null &&
        attributes.has(attribute) &&
        kept(attributes.get(attribute) ?? null, field(elem, "val"))
      );
    });
  }
  if (name === "map" && collection?.type === "object")
    return elems.every(
      (elem) =>
        keyName(field(elem, "key")) !== null &&
        kept(typeArgs[0] ?? null, field(elem, "val")),
    );
  // A set also drops duplicates and reorders, which a set of values keeps.
  if ((name === "list" || name === "set") && collection?.type === "tuple")
    return parts(collection)
      .filter((item) => item.type === "expression")
      .every((item) => kept(typeArgs[0] ?? null, item));
  return false;
}

/** Whether a key is written as Unicode normalizes it (NFC). */
function nfcName(node: Node | null): boolean {
  const text = node?.text ?? "";
  return text === text.normalize("NFC");
}

/** Blocks whose `for_each` keys are instance keys. */
const FOR_EACH_BLOCKS = new Set([
  "resource",
  "data",
  "module",
  "dynamic",
  "import",
  "provider",
  "ephemeral",
]);

/** The name of the block a node is the body of, and that block's labels. */
function blockOf(node: Node): Node | null {
  for (let current = node.parent; current !== null; current = current.parent)
    if (current.type === "block") return current;
  return null;
}

/** Read `property` values of `key` from a parsed Terraform or HCL file. */
// implements REQ-kibi-tree-sitter-script-references
export function hclProperty(
  root: Node,
  key: string,
  file = "",
): { members: string[]; unresolved: UnresolvedRow[] } {
  const members: string[] = [];
  const unresolved: UnresolvedRow[] = [];
  const terragrunt = /\.hcl$/i.test(file);
  // Object keys are strings, which HCL normalizes to NFC.
  const objectKey = key.normalize("NFC");
  /** Whether an expression holds an object element that is or may be the key. */
  const holdsKey = (node: Node): boolean => {
    if (node.type === "object_elem") {
      const keyNode = field(node, "key");
      const name = keyName(keyNode);
      if (name === null ? mayBeKey(keyNode, objectKey) : name === objectKey)
        return true;
    }
    return named(node).some(holdsKey);
  };
  /**
   * The literal top-level keys of an object argument, or null when it is not
   * an object literal. With `owning`, only the keys whose value holds the key
   * (or that are the key).
   */
  const topKeys = (arg: Node, owning: boolean): string[] | null => {
    const value = single(arg);
    const object =
      value?.type === "collection_value" ? named(value)[0] : undefined;
    if (object?.type !== "object") return null;
    const names: string[] = [];
    for (const elem of named(object)) {
      if (elem.type !== "object_elem") continue;
      const name = keyName(field(elem, "key"));
      if (name === null) return null;
      if (!owning || holdsKey(elem)) names.push(name);
    }
    return names;
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
    for (
      let current: Node | null = owner;
      current !== null;
      current = current.parent
    )
      if (current.type === "attribute") {
        if (
          named(current)[0]?.text === "type" &&
          named(blockOf(current) ?? current)[0]?.text === "variable"
        )
          return false;
        break;
      }
    for (
      let current: Node | null = owner;
      current !== null;
      current = current.parent
    ) {
      // `[a, b][1]`, `{...}.acl` and `x[*]` select from the collection: the
      // index, attribute or splat follows it in the same expression.
      if (
        current.type === "expression" &&
        named(current).some((child) =>
          ["index", "get_attr", "splat"].includes(child.type),
        )
      )
        return true;
      // `{ settings = {acl = "x"}, settings = {} }` keeps the later value of
      // a key written twice, also one a computed key may spell.
      if (current.type === "object_elem" && current.id !== owner.id) {
        const name = keyName(field(current, "key"));
        let after = false;
        for (const other of named(current.parent as Node)) {
          if (other.id === current.id) after = true;
          else if (
            after &&
            other.type === "object_elem" &&
            (name === null ||
              [name, null].includes(keyName(field(other, "key"))))
          )
            return true;
        }
      }
      switch (current.type) {
        // An operand of `==`, `!`, `&&` becomes a bool or number, and a
        // template `%{ if }` or `%{ for }` may drop what it holds.
        case "operation":
        case "template_directive":
        case "conditional":
        case "index":
        case "new_index":
        case "legacy_index":
        case "get_attr":
        case "splat":
        case "full_splat":
        case "attr_splat":
        case "for_tuple_expr":
        case "for_object_expr":
          return true;
        case "function_call": {
          const name = (named(current)[0]?.text ?? "")
            .replace(/\s+/g, "")
            .replace(/^core::/, "");
          if (!KEEPS_ARGUMENTS.has(name)) return true;
          break;
        }
        case "attribute": {
          const block = blockOf(current);
          if (
            named(current)[0]?.text === "default" &&
            block !== null &&
            named(block)[0]?.text === "variable"
          ) {
            const body = named(block).find((child) => child.type === "body");
            const type = named(body ?? block).find(
              (child) =>
                child.type === "attribute" && named(child)[0]?.text === "type",
            );
            if (type !== undefined)
              return !kept(named(type)[1] ?? null, named(current)[1] ?? null);
          }
          return false;
        }
      }
    }
    return false;
  };
  const take = (owner: Node, value: Node | null): void => {
    const read = discarded(owner) ? null : values(value);
    if (read === null) unresolved.push(at(owner));
    else members.push(...read);
  };
  /**
   * A variable's `type` is a type constraint, not a value: only an
   * `optional(type, default)` attribute of `key` holds one.
   */
  const typeConstraint = (node: Node): void => {
    if (node.type === "object_elem") {
      if (
        keyName(field(node, "key")) === objectKey &&
        !nfcName(field(node, "key"))
      )
        unresolved.push(at(node));
      else if (keyName(field(node, "key")) === objectKey) {
        const call = single(field(node, "val"));
        if (
          call?.type === "function_call" &&
          named(call)[0]?.text === "optional"
        ) {
          const args = named(call).find(
            (child) => child.type === "function_arguments",
          );
          const defaults =
            args === undefined
              ? []
              : parts(args).filter((arg) => arg.type === "expression");
          if (defaults.length > 1) {
            // `optional(number, "007")` converts the default to 7.
            if (kept(defaults[0] ?? null, defaults[1] ?? null))
              take(node, defaults[1] ?? null);
            else unresolved.push(at(node));
          }
        }
      }
    }
    // An `optional(type, default)` default is a value: an object default
    // may hold the key.
    if (node.type === "function_call" && named(node)[0]?.text === "optional") {
      const args = named(node).find(
        (child) => child.type === "function_arguments",
      );
      const defaults =
        args === undefined
          ? []
          : parts(args).filter((arg) => arg.type === "expression");
      const value = defaults[1];
      // An object default is converted to the optional's type, which may
      // drop or convert what it holds.
      if (value !== undefined) {
        if (kept(defaults[0] ?? null, value)) visit(value);
        else if (holdsKey(value)) unresolved.push(at(value));
      }
      if (defaults[0] !== undefined) typeConstraint(defaults[0]);
      return;
    }
    for (const child of named(node)) typeConstraint(child);
  };
  const visit = (node: Node): void => {
    switch (node.type) {
      case "block": {
        // Terragrunt merges an included file's configuration into this one.
        if (terragrunt && named(node)[0]?.text === "include") {
          unresolved.push(at(node));
          return;
        }
        break;
      }
      case "attribute": {
        const [name, value] = named(node);
        if (name?.text === key) take(node, value ?? null);
        if (
          name?.text === "type" &&
          named(blockOf(node) ?? node)[0]?.text === "variable"
        ) {
          if (value !== undefined) typeConstraint(value);
          return;
        }
        break;
      }
      case "object_elem": {
        const keyNode = field(node, "key");
        const name = keyName(keyNode);
        if (name === null) {
          if (mayBeKey(keyNode, objectKey)) unresolved.push(at(node));
        } else if (name === objectKey) {
          // A key written twice keeps its last value.
          const twice = named(node.parent as Node).filter(
            (other) =>
              other.type === "object_elem" &&
              keyName(field(other, "key")) === objectKey,
          );
          if (twice.length > 1) unresolved.push(at(node));
          else take(node, field(node, "val"));
        }
        break;
      }
      case "heredoc_template": {
        // Terraform ends a heredoc on a line that is the marker once any
        // Unicode blank (U+00A0, \v, \f) is trimmed; the grammar reads on.
        const marker = /^<<-?([A-Za-z_][\w-]*)/.exec(node.text)?.[1];
        const inner = node.text.split("\n").slice(1, -1);
        if (
          marker !== undefined &&
          inner.some((line) => goTrim(line) === marker)
        )
          unresolved.push(at(node));
        break;
      }
      case "for_object_expr": {
        // `{ for k, v in x : k => v }` makes keys at evaluation. The keys of
        // a `for_each` map are instance keys, not configuration values.
        const owner = node.parent?.parent?.parent;
        const block = blockOf(node);
        const forEach =
          !terragrunt &&
          owner?.type === "attribute" &&
          named(owner)[0]?.text === "for_each" &&
          block !== null &&
          FOR_EACH_BLOCKS.has(named(block)[0]?.text ?? "");
        const keyExpression =
          parts(node).find((part) => part.type === "expression") ?? null;
        if (!forEach && mayBeKey(keyExpression, objectKey))
          unresolved.push(at(node));
        break;
      }
      case "function_call": {
        const name = named(node)[0]?.text ?? "";
        if (keyFunction(name)) unresolved.push(at(node));
        else if (name.replace(/\s+/g, "").replace(/^core::/, "") === "merge") {
          // The last of the objects `merge` gets that holds the key wins, and
          // a later argument replaces a top-level key whole.
          const args = named(node).find(
            (child) => child.type === "function_arguments",
          );
          const list = (args === undefined ? [] : parts(args)).filter(
            (arg) => arg.type === "expression",
          );
          // `merge(list...)`: the objects come from a list.
          if (
            args !== undefined &&
            parts(args).some((part) => part.type === "ellipsis") &&
            holdsKey(args)
          ) {
            unresolved.push(at(node));
            break;
          }
          const first = list.findIndex(holdsKey);
          if (first !== -1) {
            const owners = topKeys(list[first] as Node, true);
            for (const later of list.slice(first + 1)) {
              const keys = topKeys(later, false);
              if (
                owners === null ||
                keys === null ||
                keys.some((name) => owners.includes(name))
              ) {
                unresolved.push(at(node));
                break;
              }
            }
          }
        }
        break;
      }
    }
    for (const child of named(node)) visit(child);
  };
  visit(root);
  return { members, unresolved };
}
