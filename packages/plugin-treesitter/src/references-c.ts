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
  ["g_getenv", 0],
  ["g_environ_getenv", 1],
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
  "_NSGetEnviron",
  "g_get_environ",
  "g_listenv",
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
  /** A function-like macro's parameters; null for an object-like one. */
  readonly parameters: readonly string[] | null;
  /** Defined under `#if`: whether it exists is the preprocessor's choice. */
  readonly conditional: boolean;
  /** Where an `#undef` under `#if` may end it. */
  readonly maybeEnded: number[];
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
  // A trigraph (`??/`) means another character where the compiler reads them.
  if (body === undefined || /\?\?[=/'()!<>-]/.test(body)) return null;
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
function bodyTokens(
  body: string,
  parameters: readonly string[] = [],
): {
  names: string[];
  calls: string[];
  pastes: boolean;
} {
  const code = body
    .replace(/\\\r?\n/g, " ")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");
  const names: string[] = [];
  const calls: string[] = [];
  for (const match of code.matchAll(/(?<![\w.]|->)([A-Za-z_]\w*)(\s*\()?/g)) {
    const name = match[1] as string;
    if (C_KEYWORDS.has(name) || parameters.includes(name)) continue;
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
  // Variables of a function: a local pointer may share a function's name.
  const locals = new Set<string>();
  const functions = new Set<string>();
  const collect = (node: Node): void => {
    switch (node.type) {
      case "preproc_def":
      case "preproc_function_def": {
        const name = field(node, "name")?.text ?? "";
        const parameters = field(node, "parameters");
        macros.push({
          name,
          start: node.endIndex,
          end: root.endIndex,
          body: field(node, "value")?.text ?? "",
          parameters:
            parameters === null
              ? null
              : named(parameters)
                  .filter((child) => child.type === "identifier")
                  .map((child) => child.text),
          conditional: conditionalAncestor(node),
          maybeEnded: [],
        });
        break;
      }
      case "preproc_call": {
        const directive = field(node, "directive")?.text.replace(/\s+/g, "");
        const argument = field(node, "argument")?.text ?? "";
        if (directive === "#undef") {
          // `#undef X // note`: the name is the first word.
          const name = /^\s*([A-Za-z_]\w*)/.exec(argument)?.[1] ?? "";
          const conditional = conditionalAncestor(node);
          for (const macro of macros)
            if (macro.name === name && macro.end === root.endIndex) {
              if (conditional) macro.maybeEnded.push(node.startIndex);
              else macro.end = node.startIndex;
            }
        }
        break;
      }
      case "declaration":
      case "field_declaration":
      case "parameter_declaration":
      case "type_definition": {
        if (node.type === "field_declaration") break;
        // A prototype's parameter names exist only inside the prototype.
        if (node.type === "parameter_declaration" && !definitionParameter(node))
          break;
        const local =
          node.type === "parameter_declaration" || insideFunction(node);
        for (const declarator of node.childrenForFieldName("declarator")) {
          const found = declared(declarator);
          if (found === null) continue;
          if (found.function) functions.add(found.name);
          else (local ? locals : variables).add(found.name);
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
  for (const name of locals) variables.add(name);

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
    if (
      found.some(
        (macro) =>
          macro.conditional ||
          macro.maybeEnded.some((place) => place <= node.startIndex),
      )
    )
      return null;
    const names: string[] = [];
    const calls: string[] = [];
    seen.add(name);
    for (const macro of found) {
      const tokens = bodyTokens(macro.body, macro.parameters ?? []);
      if (tokens.pastes) return null;
      // A call through a pointer the file declares names no function.
      if (tokens.calls.some((call) => variables.has(call))) return null;
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
      // Any other name in the body may be a function: called, handed on
      // (`run_cb(system, x)`) or, for an object-like macro, called with the
      // arguments that follow it (`#define RUN (system)`).
      for (const token of tokens.names)
        if (
          !seen.has(token) &&
          macroAt(token, node).length === 0 &&
          !variables.has(token) &&
          !LIBRARY_VARIABLES.has(token) &&
          !/_t$/.test(token)
        )
          calls.push(token);
    }
    return { names, calls: [...new Set(calls)] };
  };

  const getterNames = (names: readonly string[]): boolean =>
    names.some((name) => ENV_GETTERS.has(name) || ENV_WHOLE.has(name));

  const calleeMatches = (name: string): boolean =>
    options.callee !== "" &&
    (name === options.callee || name === `*.${options.callee}`);

  /**
   * An `#include`, `#import` or `#include_next` of `path`: for imports the
   * path; otherwise a row the host drops when the header (found next to the
   * file, or in the project for `<...>`) defines nothing the file uses.
   */
  const included = (node: Node, path: string | null): void => {
    if (path === null) {
      refuse(node);
      return;
    }
    if (extract === "imports") {
      members.push(path);
      return;
    }
    unresolved.push({
      line: node.startPosition.row + 1,
      text: `${path} may define macros or function pointers this file uses: ${at(node).text}`,
    });
  };

  /** A string literal, or an object-like macro of the file that is one. */
  const constantString = (node: Node | undefined): string | null => {
    const value = stringValue(node);
    if (value !== null || node?.type !== "identifier") return value;
    const found = macroAt(node.text, node);
    if (
      found.length !== 1 ||
      found[0]?.parameters !== null ||
      found[0].conditional ||
      found[0].maybeEnded.length > 0
    )
      return null;
    const body = /^\s*((?:"(?:[^"\\\n]|\\.)*"\s*)+)$/.exec(found[0].body)?.[1];
    if (body === undefined) return null;
    let joined = "";
    for (const part of body.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
      if (/\\/.test(part[1] as string)) return null;
      joined += part[1] as string;
    }
    return joined;
  };

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
        const value =
          path?.type === "system_lib_string"
            ? path.text.slice(1, -1)
            : path?.type === "string_literal"
              ? stringValue(path)
              : null;
        included(node, value);
        return;
      }
      case "preproc_call": {
        const directive = field(node, "directive")?.text.replace(/\s+/g, "");
        const argument = (field(node, "argument")?.text ?? "").trim();
        if (directive === "#import" || directive === "#include_next") {
          const path = /^(?:<([^>]+)>|"([^"]+)")\s*(?:\/\/.*|\/\*.*)?$/.exec(
            argument,
          );
          included(node, path === null ? null : (path[1] ?? path[2] ?? null));
        } else if (
          directive === "#pragma" &&
          /\b(?:push|pop)_macro\b/.test(argument) &&
          extract !== "imports"
        )
          // The macro a pop brings back is not tracked.
          refuse(node);
        return;
      }
      case "gnu_asm_expression":
        // An asm label (`__asm__("getenv")`) or inline asm may call anything.
        if (extract === "calls" || extract === "string_args" || env)
          refuse(node);
        return;
      case "preproc_def":
      case "preproc_function_def":
        return;
      case "function_definition": {
        // `int main(int argc, char **argv, char **envp)` hands the environment in.
        const declarator = field(node, "declarator");
        const found = declared(declarator);
        // `#define ENTRY main` / `int ENTRY(...)` is main too.
        const main =
          found !== null &&
          (found.name === "main" ||
            (macroAt(found.name, node).length > 0 &&
              (expand(found.name, node)?.names.includes("main") ?? true)));
        if (env && main) {
          let current: Node | null = declarator;
          while (current !== null && current.type !== "function_declarator")
            current = field(current, "declarator");
          const parameters =
            current === null ? null : field(current, "parameters");
          // K&R `main(argc, argv, envp)` names them without types.
          if (
            parameters !== null &&
            named(parameters).filter(
              (child) =>
                child.type === "parameter_declaration" ||
                child.type === "identifier" ||
                child.type === "variadic_parameter",
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
            const value = constantString(
              argumentsOf[ENV_GETTERS.get(name) as number],
            );
            if (value === null) refuse(node);
            else members.push(value);
          }
          if (env && ENV_WHOLE.has(name)) refuse(node);
          if (extract === "string_args" && calleeMatches(name)) {
            const first = argumentsOf[0];
            if (first !== undefined) {
              const value = literal(first) ?? constantString(first);
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
        // A function-like macro's name without `(` is not the macro: it is
        // the function of that name (`register_lookup(getenv)`).
        const found = macroAt(name, node);
        if (
          found.length > 0 &&
          found.some((macro) => macro.parameters === null)
        ) {
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
        const name = designatorName(last);
        if (name === undefined) break;
        // `.verify = 0` with `#define verify verify_peer` sets verify_peer.
        if (macroAt(name, node).length > 0) {
          refuse(node);
          break;
        }
        if (name !== options.key) break;
        const value = field(node, "value");
        const read = literal(value);
        // `#define true 0` changes what the word means.
        if (
          read === null ||
          (value !== null &&
            /^[A-Za-z_]\w*$/.test(value.text) &&
            macroAt(value.text, node).length > 0)
        )
          refuse(node);
        else members.push(read);
        // A field set twice keeps its last value.
        const twice = named(node.parent as Node).filter(
          (pair) =>
            pair.type === "initializer_pair" &&
            pair.childrenForFieldName("designator").length ===
              designators.length &&
            pair
              .childrenForFieldName("designator")
              .every(
                (designator, index) =>
                  designator.text.replace(/\s+/g, "") ===
                  (designators[index] as Node).text.replace(/\s+/g, ""),
              ),
        );
        if (twice.length > 1) refuse(node);
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
  // `(system)` and `*system` are the function too.
  let current = node;
  while (
    current.parent !== null &&
    (current.parent.type === "parenthesized_expression" ||
      (current.parent.type === "pointer_expression" &&
        current.parent.text.trimStart().startsWith("*")))
  )
    current = current.parent;
  if (current !== node) {
    const outer = current.parent;
    if (
      outer?.type === "call_expression" &&
      field(outer, "function")?.id === current.id
    )
      return true;
    return valuePosition(current);
  }
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

/** Whether a parameter belongs to a function definition (not a prototype). */
function definitionParameter(node: Node): boolean {
  let current: Node | null = node.parent;
  if (current?.type !== "parameter_list") return false;
  current = current.parent;
  if (current?.type !== "function_declarator") return false;
  let child: Node = current;
  let parent = child.parent;
  while (parent !== null && /_declarator$/.test(parent.type)) {
    child = parent;
    parent = child.parent;
  }
  return (
    parent?.type === "function_definition" &&
    field(parent, "declarator")?.id === child.id
  );
}

/** Whether a declaration is inside a function body. */
function insideFunction(node: Node): boolean {
  for (let current = node.parent; current !== null; current = current.parent)
    if (current.type === "compound_statement") return true;
  return false;
}

/** The field a designator names: `.f` or GNU `f:`. */
function designatorName(node: Node | undefined): string | undefined {
  if (node?.type === "field_designator") return named(node)[0]?.text;
  if (node?.type === "field_identifier") return node.text;
  return undefined;
}
