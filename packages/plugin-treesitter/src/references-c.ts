import type { Node } from "web-tree-sitter";
import { type UnresolvedRow, at, field, named } from "./reference-nodes.js";

/**
 * C references, read from one translation unit's source without running the
 * preprocessor. A macro the file defines is expanded by its text: a call of
 * `LOG(x)` defined as `printf(...)` calls both, and `#define getenv f` makes
 * `getenv("X")` a call of `f`. What the preprocessor or the program decides
 * is an unresolved row: code under `#if` that holds a member, a macro
 * defined under `#if`, token pasting, a quoted `#include` (its macros may
 * rename anything below it; the host drops the row when the header defines
 * nothing the file uses), a call through a function pointer, and an
 * environment read Kibi cannot name (`environ`, `envp`, `getenv(name)`).
 */

type CExtract = "env" | "imports" | "calls" | "string_args" | "property";

interface CRead {
  members: string[];
  unresolved: UnresolvedRow[];
}

/** Getters that read one variable named by their first argument. */
const ENV_GETTERS: ReadonlyMap<string, number> = new Map([
  ["getenv", 0],
  ["secure_getenv", 0],
  ["__secure_getenv", 0],
  ["_wgetenv", 0],
  ["GetEnvironmentVariable", 0],
  ["GetEnvironmentVariableA", 0],
  ["GetEnvironmentVariableW", 0],
  ["_dupenv_s", 2],
  ["_wdupenv_s", 2],
  ["getenv_s", 3],
  ["_wgetenv_s", 3],
]);

/** Reads of the whole environment. */
const ENV_WHOLE = new Set([
  "environ",
  "__environ",
  "_environ",
  "_wenviron",
  "GetEnvironmentStrings",
  "GetEnvironmentStringsA",
  "GetEnvironmentStringsW",
  "ExpandEnvironmentStrings",
  "ExpandEnvironmentStringsA",
  "ExpandEnvironmentStringsW",
]);

/**
 * Library variables a file uses without declaring them; any other
 * undeclared name used as a value may be a function and is listed in
 * `calls`, since whatever receives it may call it.
 */
const LIBRARY_VARIABLES = new Set([
  "stdin",
  "stdout",
  "stderr",
  "errno",
  "optarg",
  "optind",
  "opterr",
  "optopt",
  "timezone",
  "daylight",
  "tzname",
  "signgam",
  "sys_errlist",
  "sys_nerr",
  "program_invocation_name",
  "program_invocation_short_name",
  "NULL",
  "true",
  "false",
]);

const C_KEYWORDS = new Set([
  "if",
  "else",
  "while",
  "for",
  "do",
  "switch",
  "case",
  "default",
  "return",
  "sizeof",
  "break",
  "continue",
  "goto",
  "typedef",
  "struct",
  "union",
  "enum",
  "static",
  "extern",
  "const",
  "volatile",
  "register",
  "auto",
  "inline",
  "restrict",
  "signed",
  "unsigned",
  "char",
  "short",
  "int",
  "long",
  "float",
  "double",
  "void",
  "_Bool",
  "bool",
  "_Alignof",
  "alignof",
  "_Static_assert",
  "static_assert",
  "_Generic",
  "__attribute__",
  "__typeof__",
  "typeof",
  "defined",
]);

interface Macro {
  readonly name: string;
  readonly start: number;
  /** Where an `#undef` ends it, or the end of the file. */
  end: number;
  readonly body: string;
  /** Defined under `#if`: whether it exists is the preprocessor's choice. */
  readonly conditional: boolean;
}

const ESCAPES: Readonly<Record<string, string>> = {
  n: "\n",
  t: "\t",
  r: "\r",
  "0": "\0",
  a: "\x07",
  b: "\b",
  f: "\f",
  v: "\v",
  "\\": "\\",
  '"': '"',
  "'": "'",
  "?": "?",
};

/** A string literal's value (adjacent literals joined), or null. */
function stringValue(node: Node | null | undefined): string | null {
  if (node === null || node === undefined) return null;
  if (node.type === "concatenated_string") {
    let value = "";
    for (const part of named(node)) {
      const text = stringValue(part);
      if (text === null) return null;
      value += text;
    }
    return value;
  }
  if (node.type !== "string_literal") return null;
  const body = /^(?:L|u8|u|U)?"([\s\S]*)"$/.exec(node.text)?.[1];
  if (body === undefined) return null;
  let value = "";
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index] as string;
    if (char !== "\\") {
      value += char;
      continue;
    }
    const next = body[index + 1] ?? "";
    const hex = /^x([0-9A-Fa-f]{1,2})(?![0-9A-Fa-f])/.exec(
      body.slice(index + 1),
    );
    const octal = /^([0-7]{1,3})/.exec(body.slice(index + 1));
    if (
      ESCAPES[next] !== undefined &&
      !(next === "0" && /^[0-7]{2}/.test(body.slice(index + 1)))
    ) {
      value += ESCAPES[next];
      index += 1;
    } else if (hex !== null) {
      value += String.fromCharCode(Number.parseInt(hex[1] as string, 16));
      index += hex[0].length;
    } else if (octal !== null) {
      value += String.fromCharCode(Number.parseInt(octal[1] as string, 8));
      index += octal[0].length;
    } else return null;
  }
  return value;
}

/** A literal value: a string, a number, a character, true/false/NULL. */
function literal(node: Node | null | undefined): string | null {
  if (node === null || node === undefined) return null;
  switch (node.type) {
    case "string_literal":
    case "concatenated_string":
      return stringValue(node);
    case "number_literal":
      return node.text;
    case "true":
    case "false":
    case "null":
      return node.text;
    case "char_literal":
      return node.text;
    case "unary_expression": {
      const operand = field(node, "argument");
      return node.text.trimStart().startsWith("-") &&
        operand?.type === "number_literal"
        ? `-${operand.text}`
        : null;
    }
    case "parenthesized_expression":
      return literal(named(node)[0]);
    default:
      return null;
  }
}

/** Identifiers of a macro body, and those called in it (`name(`). */
function bodyTokens(body: string): {
  names: string[];
  calls: string[];
  pastes: boolean;
} {
  const code = body
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");
  const names: string[] = [];
  const calls: string[] = [];
  for (const match of code.matchAll(/(?<![\w.]|->)([A-Za-z_]\w*)(\s*\()?/g)) {
    const name = match[1] as string;
    if (C_KEYWORDS.has(name)) continue;
    names.push(name);
    if (match[2] !== undefined) calls.push(name);
  }
  for (const match of code.matchAll(/(?:\.|->)\s*([A-Za-z_]\w*)\s*\(/g))
    calls.push(`*.${match[1] as string}`);
  return { names, calls, pastes: /#/.test(code) };
}

function conditionalAncestor(node: Node): boolean {
  for (let current = node.parent; current !== null; current = current.parent)
    if (/^preproc_(?:if|ifdef|elif|else|elifdef)$/.test(current.type))
      return true;
  return false;
}

/** The identifier a declarator declares, and whether it is a function. */
function declared(
  declarator: Node | null,
  pointer = false,
): { name: string; function: boolean } | null {
  // A null declarator has no type and falls to the default.
  const node = declarator as Node;
  switch (declarator?.type) {
    case "identifier":
      return { name: node.text, function: false };
    case "function_declarator": {
      const inner = field(node, "declarator");
      if (inner?.type === "identifier" && !pointer)
        return { name: inner.text, function: true };
      return declared(inner, true);
    }
    case "pointer_declarator":
    case "array_declarator":
    case "init_declarator":
    case "attributed_declarator":
      return declared(
        field(node, "declarator") ?? named(node)[0] ?? null,
        pointer,
      );
    case "parenthesized_declarator":
      return declared(named(node)[0] ?? null, true);
    default:
      return null;
  }
}

/** Read one extract of a parsed C file. */
// implements REQ-kibi-tree-sitter-script-references
export function cReferences(
  root: Node,
  extract: CExtract,
  options: { callee: string; key: string },
): CRead {
  const members: string[] = [];
  const unresolved: UnresolvedRow[] = [];
  const env = extract === "env";
  const refuse = (node: Node): void => {
    unresolved.push(at(node));
  };

  // Macros, by name and range, and every name the file declares.
  const macros: Macro[] = [];
  const variables = new Set<string>();
  const functions = new Set<string>();
  const collect = (node: Node): void => {
    switch (node.type) {
      case "preproc_def":
      case "preproc_function_def": {
        const name = field(node, "name")?.text ?? "";
        macros.push({
          name,
          start: node.endIndex,
          end: root.endIndex,
          body: field(node, "value")?.text ?? "",
          conditional: conditionalAncestor(node),
        });
        break;
      }
      case "preproc_call": {
        if (field(node, "directive")?.text.replace(/\s+/g, "") === "#undef") {
          const name = field(node, "argument")?.text.trim() ?? "";
          for (const macro of macros)
            if (macro.name === name && macro.end === root.endIndex)
              macro.end = node.startIndex;
        }
        break;
      }
      case "declaration":
      case "field_declaration":
      case "parameter_declaration":
      case "type_definition": {
        for (const declarator of node.childrenForFieldName("declarator")) {
          const found = declared(declarator);
          if (found === null) continue;
          if (node.type === "field_declaration") continue;
          if (found.function) functions.add(found.name);
          else variables.add(found.name);
        }
        break;
      }
      case "function_definition": {
        const found = declared(field(node, "declarator"));
        if (found !== null) functions.add(found.name);
        break;
      }
      case "enumerator": {
        const name = field(node, "name")?.text;
        if (name !== undefined) variables.add(name);
        break;
      }
    }
    for (const child of named(node)) collect(child);
  };
  collect(root);
  for (const name of functions) variables.delete(name);

  const macroAt = (name: string, node: Node): Macro[] =>
    macros.filter(
      (macro) =>
        macro.name === name &&
        macro.start <= node.startIndex &&
        node.startIndex < macro.end,
    );

  /**
   * What using macro `name` at `node` brings in: the calls and names of its
   * body, expanded through the macros it uses in turn. Null when the
   * preprocessor's choice decides it (a conditional definition, `#`, `##`).
   */
  const expand = (
    name: string,
    node: Node,
    seen: Set<string> = new Set(),
  ): { names: string[]; calls: string[] } | null => {
    const found = macroAt(name, node);
    if (found.some((macro) => macro.conditional)) return null;
    const names: string[] = [];
    const calls: string[] = [];
    seen.add(name);
    for (const macro of found) {
      const tokens = bodyTokens(macro.body);
      if (tokens.pastes) return null;
      for (const token of tokens.names) {
        if (seen.has(token)) continue;
        if (macroAt(token, node).length > 0) {
          const inner = expand(token, node, new Set(seen));
          if (inner === null) return null;
          names.push(...inner.names);
          calls.push(...inner.calls);
        } else names.push(token);
      }
      for (const call of tokens.calls)
        if (!seen.has(call) && macroAt(call, node).length === 0)
          calls.push(call);
      // An object-like macro that names a function is called with the arguments that follow it.
      if (
        tokens.names.length === 1 &&
        tokens.calls.length === 0 &&
        /^\s*[A-Za-z_]\w*\s*$/.test(macro.body)
      ) {
        const target = tokens.names[0] as string;
        if (!seen.has(target) && macroAt(target, node).length === 0)
          calls.push(target);
      }
    }
    return { names, calls };
  };

  const getterNames = (names: readonly string[]): boolean =>
    names.some((name) => ENV_GETTERS.has(name) || ENV_WHOLE.has(name));

  const calleeMatches = (name: string): boolean =>
    options.callee !== "" &&
    (name === options.callee || name === `*.${options.callee}`);

  /** Positions of code under `#if` whose read gave members or rows. */
  const visit = (node: Node): void => {
    if (/^preproc_(?:if|ifdef)$/.test(node.type)) {
      const before = members.length + unresolved.length;
      for (const child of named(node)) visit(child);
      if (members.length + unresolved.length > before) refuse(node);
      return;
    }
    switch (node.type) {
      case "preproc_include": {
        const path = field(node, "path");
        if (path?.type === "system_lib_string") {
          if (extract === "imports") members.push(path.text.slice(1, -1));
        } else if (path?.type === "string_literal") {
          const value = stringValue(path);
          if (extract === "imports") {
            if (value === null) refuse(node);
            else members.push(value);
          } else if (value === null) refuse(node);
          else
            unresolved.push({
              line: node.startPosition.row + 1,
              text: `${value} may define macros this file uses: ${at(node).text}`,
            });
        } else refuse(node);
        return;
      }
      case "preproc_def":
      case "preproc_function_def":
      case "preproc_call":
        return;
      case "function_definition": {
        // `int main(int argc, char **argv, char **envp)` hands the environment in.
        const declarator = field(node, "declarator");
        const found = declared(declarator);
        if (env && found?.name === "main") {
          let current: Node | null = declarator;
          while (current !== null && current.type !== "function_declarator")
            current = field(current, "declarator");
          const parameters =
            current === null ? null : field(current, "parameters");
          if (
            parameters !== null &&
            named(parameters).filter(
              (child) => child.type === "parameter_declaration",
            ).length >= 3
          )
            refuse(parameters);
        }
        break;
      }
      case "call_expression": {
        const target = field(node, "function");
        const list = field(node, "arguments");
        const argumentsOf = list === null ? [] : named(list);
        if (target?.type === "identifier") {
          const name = target.text;
          if (macroAt(name, node).length > 0) {
            const expanded = expand(name, node);
            if (expanded === null) {
              if (extract !== "imports" && extract !== "property") refuse(node);
            } else if (env && getterNames(expanded.names)) refuse(node);
            else if (
              extract === "string_args" &&
              [...expanded.names, ...expanded.calls].some(calleeMatches)
            )
              refuse(node);
            else if (extract === "calls") members.push(name, ...expanded.calls);
            for (const argument of argumentsOf) visit(argument);
            return;
          }
          if (variables.has(name)) {
            // A call through a function pointer the file declares.
            if (extract === "calls" || extract === "string_args" || env)
              refuse(node);
            for (const argument of argumentsOf) visit(argument);
            return;
          }
          if (extract === "calls") members.push(name);
          if (env && ENV_GETTERS.has(name)) {
            const value = stringValue(
              argumentsOf[ENV_GETTERS.get(name) as number],
            );
            if (value === null) refuse(node);
            else members.push(value);
          }
          if (env && ENV_WHOLE.has(name)) refuse(node);
          if (extract === "string_args" && calleeMatches(name)) {
            const first = argumentsOf[0];
            if (first !== undefined) {
              const value = literal(first);
              if (value === null) refuse(node);
              else members.push(value);
            }
          }
          for (const argument of argumentsOf) visit(argument);
          return;
        }
        if (target?.type === "field_expression") {
          const method = field(target, "field")?.text ?? "";
          if (extract === "calls") members.push(`*.${method}`);
          if (extract === "string_args" && calleeMatches(`*.${method}`))
            refuse(node);
          const object = field(target, "argument");
          if (object !== null) visit(object);
          for (const argument of argumentsOf) visit(argument);
          return;
        }
        // A call through an expression names no function.
        if (extract === "calls" || extract === "string_args" || env)
          refuse(node);
        break;
      }
      case "identifier": {
        const name = node.text;
        if (declaratorPosition(node)) return;
        if (macroAt(name, node).length > 0) {
          const expanded = expand(name, node);
          if (expanded === null) {
            if (extract !== "imports" && extract !== "property") refuse(node);
          } else if (env && getterNames(expanded.names)) refuse(node);
          else if (
            extract === "string_args" &&
            [...expanded.names, ...expanded.calls].some(calleeMatches)
          )
            refuse(node);
          else if (extract === "calls") members.push(...expanded.calls);
          return;
        }
        if (env && (ENV_WHOLE.has(name) || ENV_GETTERS.has(name))) {
          // The environment, or a getter handed on as a value.
          refuse(node);
          return;
        }
        if (
          extract === "calls" &&
          !variables.has(name) &&
          !LIBRARY_VARIABLES.has(name) &&
          valuePosition(node)
        )
          members.push(name);
        if (
          extract === "string_args" &&
          !variables.has(name) &&
          calleeMatches(name) &&
          valuePosition(node)
        )
          refuse(node);
        return;
      }
      case "initializer_pair": {
        if (extract !== "property") break;
        const designators = node.childrenForFieldName("designator");
        const last = designators.at(-1);
        if (
          last?.type === "field_designator" &&
          named(last)[0]?.text === options.key
        ) {
          const value = field(node, "value");
          const read = literal(value);
          if (read === null) refuse(node);
          else members.push(read);
        }
        break;
      }
      case "initializer_list": {
        if (extract !== "property") break;
        const positional = named(node).some(
          (child) =>
            child.type !== "initializer_pair" && child.type !== "comment",
        );
        if (positional && aggregate(node)) refuse(node);
        break;
      }
    }
    for (const child of named(node)) visit(child);
  };
  visit(root);
  return { members, unresolved };
}

/** Whether an identifier is the name a declaration declares. */
function declaratorPosition(node: Node): boolean {
  const parent = node.parent;
  if (parent === null) return false;
  if (
    /^(?:function|pointer|array|parenthesized|attributed)_declarator$/.test(
      parent.type,
    )
  )
    return true;
  if (parent.type === "init_declarator")
    return field(parent, "declarator")?.id === node.id;
  if (
    parent.type === "declaration" ||
    parent.type === "parameter_declaration" ||
    parent.type === "type_definition"
  )
    return parent
      .childrenForFieldName("declarator")
      .some((child) => child.id === node.id);
  return parent.type === "enumerator" && field(parent, "name")?.id === node.id;
}

/** Whether an identifier is used as a value a callee could receive. */
function valuePosition(node: Node): boolean {
  const parent = node.parent;
  if (parent === null) return false;
  switch (parent.type) {
    case "argument_list":
    case "init_declarator":
    case "return_statement":
    case "initializer_list":
    case "initializer_pair":
    case "conditional_expression":
    case "comma_expression":
    case "cast_expression":
      return true;
    case "assignment_expression":
      return field(parent, "right")?.id === node.id;
    case "pointer_expression":
      return node.parent?.text.startsWith("&") ?? false;
    default:
      return false;
  }
}

/**
 * Whether an initializer list fills a struct or union (a type other than a
 * plain scalar), whose fields positional values set by order.
 */
function aggregate(node: Node): boolean {
  let current = node.parent;
  while (current !== null && INITIALIZER_PARTS.has(current.type))
    current = current.parent;
  return !(
    (current?.type === "declaration" ||
      current?.type === "compound_literal_expression") &&
    field(current, "type")?.type === "primitive_type"
  );
}

const INITIALIZER_PARTS = new Set([
  "initializer_list",
  "initializer_pair",
  "init_declarator",
]);
