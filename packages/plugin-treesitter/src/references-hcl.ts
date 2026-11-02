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
  const match = /^<<([A-Za-z_][\w-]*)\r?\n([\s\S]*?)[ \t]*\1[ \t]*$/.exec(
    node.text,
  );
  if (match === null) return null;
  const marker = match[1] as string;
  const body = match[2] as string;
  if (body.includes("${") || body.includes("%{")) return null;
  // Terraform ends a heredoc on a line that is the marker once any Unicode
  // blank (U+00A0, \v, \f) is trimmed; the grammar does not.
  if (body.split("\n").some((line) => line.trim() === marker)) return null;
  // Line ends are kept as written (`\r\n` on a CRLF checkout).
  return body.normalize("NFC");
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
  if (key.type === "variable_expr") return key.text;
  if (key.type === "literal_value") {
    const literal = named(key)[0] as Node;
    if (literal.type === "string_lit") return quoted(literal);
    // `{ 007 = ... }` has the key "7".
    if (literal.type === "numeric_lit") return canonicalNumber(literal.text);
    return literal.text;
  }
  if (key.type === "template_expr") {
    const template = named(key)[0] as Node;
    return template.type === "quoted_template" ? quoted(template) : null;
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
  const first = pieces[0];
  const last = pieces.at(-1);
  const head = first?.type === "template_literal" ? decode(first.text) : "";
  const tail = last?.type === "template_literal" ? decode(last.text) : "";
  // A combining mark at either end may compose with what is interpolated.
  if (head === null || tail === null || /^\p{M}/u.test(tail)) return true;
  return (
    key.startsWith(head) &&
    key.endsWith(tail) &&
    head.length + tail.length <= key.length
  );
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
  const take = (owner: Node, value: Node | null): void => {
    const read = values(value);
    if (read === null) unresolved.push(at(owner));
    else members.push(...read);
  };
  /**
   * A variable's `type` is a type constraint, not a value: only an
   * `optional(type, default)` attribute of `key` holds one.
   */
  const typeConstraint = (node: Node): void => {
    if (node.type === "object_elem") {
      if (keyName(field(node, "key")) === key) {
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
          if (defaults.length > 1) take(node, defaults[1] ?? null);
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
      if (value !== undefined) visit(value);
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
          if (mayBeKey(keyNode, key)) unresolved.push(at(node));
        } else if (name === key) {
          // A key written twice keeps its last value.
          const twice = named(node.parent as Node).filter(
            (other) =>
              other.type === "object_elem" &&
              keyName(field(other, "key")) === key,
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
          inner.some((line) => line.trim() === marker)
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
        if (!forEach && mayBeKey(keyExpression, key)) unresolved.push(at(node));
        break;
      }
      case "function_call": {
        const name = named(node)[0]?.text ?? "";
        if (keyFunction(name)) unresolved.push(at(node));
        else if (name.replace(/\s+/g, "").replace(/^core::/, "") === "merge") {
          // The last of the objects `merge` gets that names the key wins,
          // and a later argument Kibi cannot read may name it.
          const args = named(node).find(
            (child) => child.type === "function_arguments",
          );
          const objects = (args === undefined ? [] : parts(args)).map((arg) => {
            const value = single(arg);
            const object =
              value?.type === "collection_value" ? named(value)[0] : undefined;
            if (object?.type !== "object") return "unknown";
            return named(object).some(
              (elem) =>
                elem.type === "object_elem" &&
                keyName(field(elem, "key")) === key,
            )
              ? "key"
              : "other";
          });
          const first = objects.indexOf("key");
          if (
            first !== -1 &&
            objects.slice(first + 1).some((kind) => kind !== "other")
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
