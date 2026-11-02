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
  ["uv_os_getenv", 0],
  ["apr_env_get", 1],
  ["getenv_r", 0],
]);

/**
 * A name that looks like an environment getter Kibi does not know
 * (`SDL_getenv`, `my_env_get`): what it reads cannot be named.
 */
const GETTER_LIKE = /getenv|env_?get|get_env|environ$/i;

/** Entry points whose third parameter is the environment. */
const MAIN_NAMES = new Set(["main", "wmain", "_tmain"]);

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
  "uv_os_environ",
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

/**
 * A number as the program holds it: `0x1F90`, `017`, `0b1` and `30u` are
 * written in decimal, `1.50` as `1.5`. A character constant, a hex float and
 * a value a double cannot hold exactly are null.
 */
function cNumber(text: string): string | null {
  // The grammar reads `-1` as one literal.
  const sign = /^-\s*/.exec(text);
  if (sign !== null) {
    const value = cNumber(text.slice(sign[0].length));
    return value === null || value === "0" ? value : `-${value}`;
  }
  // C23 digit separators.
  const plain = text.replace(/'/g, "");
  const integer =
    /^(?:0[xX]([0-9A-Fa-f]+)|0[bB]([01]+)|0([0-7]*)|([1-9]\d*))(?:[uU](?:ll|LL|l|L|wb|WB)?|(?:ll|LL|l|L|wb|WB)[uU]?)?$/.exec(
      plain,
    );
  if (integer !== null) {
    if (integer[1] !== undefined) return BigInt(`0x${integer[1]}`).toString();
    if (integer[2] !== undefined) return BigInt(`0b${integer[2]}`).toString();
    if (integer[3] !== undefined)
      return BigInt(`0o${integer[3] || "0"}`).toString();
    return BigInt(integer[4] as string).toString();
  }
  const decimal = /^((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([fFlL]?)$/.exec(
    plain,
  );
  if (decimal === null) return null;
  const value = Number(decimal[1]);
  const digits = (decimal[1] as string)
    .replace(/[eE].*$/, "")
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .replace(/0+$/, "");
  // A float suffix rounds the value to float precision.
  if (digits.length > 15 || (decimal[2] !== "" && !Number.isInteger(value)))
    return null;
  if (Number.isInteger(value) && Math.abs(value) < 1e21)
    return BigInt(value).toString();
  // Exponent form (`1e-7`) is not how the value is written.
  return /e/.test(String(value)) ? null : String(value);
}

/** A literal value: a string, a number, true/false/NULL. */
function literal(node: Node | null | undefined): string | null {
  if (node === null || node === undefined) return null;
  switch (node.type) {
    case "string_literal":
    case "concatenated_string":
      return stringValue(node);
    case "number_literal":
      return cNumber(node.text);
    case "true":
    case "false":
    case "null":
      return node.text;
    case "unary_expression": {
      const operand = field(node, "argument");
      const number =
        operand?.type === "number_literal" ? cNumber(operand.text) : null;
      if (number === null || !node.text.trimStart().startsWith("-"))
        return null;
      return number === "0" ? "0" : `-${number}`;
    }
    case "parenthesized_expression":
      return literal(named(node)[0]);
    default:
      return null;
  }
}

/** One identifier of a macro body. */
interface BodyToken {
  readonly name: string;
  /** Followed by `(` in the body. */
  readonly called: boolean;
  /** The body's last token, which a `(` after the macro's use may follow. */
  readonly last: boolean;
}

/**
 * Identifiers of a macro body, those called in it (`name(`) and methods
 * called on a value (`*.name`). Identifiers may hold `$`, as gcc and clang
 * allow.
 */
function bodyTokens(
  body: string,
  parameters: readonly string[] = [],
): {
  tokens: BodyToken[];
  calls: string[];
  methods: string[];
  pastes: boolean;
} {
  const code = blankLiterals(body.replace(/\\[ \t\f\v]*\r?\n/g, " "));
  const tokens: BodyToken[] = [];
  const calls: string[] = [];
  const end = /([A-Za-z_$][\w$]*)\s*$/.exec(code)?.index;
  for (const match of code.matchAll(
    /(?<![\w$.]|->)([A-Za-z_$][\w$]*)(\s*\()?/g,
  )) {
    const name = match[1] as string;
    if (C_KEYWORDS.has(name) || parameters.includes(name)) continue;
    const called = match[2] !== undefined;
    tokens.push({ name, called, last: match.index === end });
    if (called) calls.push(name);
  }
  const methods = [
    ...code.matchAll(/(?:\.|->)\s*([A-Za-z_$][\w$]*)\s*\(/g),
  ].map((match) => `*.${match[1] as string}`);
  return { tokens, calls, methods, pastes: /#/.test(code) };
}

/**
 * C text with strings and character constants emptied and comments blanked,
 * lexed left to right as the preprocessor does (`'"'` is one constant).
 */
function blankLiterals(text: string): string {
  let out = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index] as string;
    const next = text[index + 1];
    if (char === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
      out += " ";
    } else if (char === "/" && next === "/") {
      const end = text.indexOf("\n", index);
      index = end === -1 ? text.length : end;
      out += " ";
    } else if (char === '"' || char === "'") {
      let stop = index + 1;
      while (stop < text.length && text[stop] !== char && text[stop] !== "\n")
        stop += text[stop] === "\\" ? 2 : 1;
      index = stop + 1;
      out += `${char}${char}`;
    } else {
      out += char;
      index += 1;
    }
  }
  return out;
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

  // Where the grammar and the preprocessor read the text differently: a
  // backslash with blanks before the newline (gcc and clang splice it), a
  // trigraph (`??/` is a backslash in strict modes) and an identifier split
  // by a line splice.
  const lines = root.text.split("\n");
  lines.forEach((text, index) => {
    if (
      /\\[ \t\f\v]+\r?$/.test(text) ||
      /\?\?[=/'()!<>-]/.test(text) ||
      (/[\w$]\\\r?$/.test(text) && /^[\w$]/.test(lines[index + 1] ?? ""))
    )
      unresolved.push({ line: index + 1, text: text.trim().slice(0, 80) });
  });

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
        // `#define SAVE _Pragma("push_macro(\"x\")")` restores a macro when used.
        {
          const value = field(node, "value")?.text ?? "";
          if (
            extract !== "imports" &&
            /\b(?:_Pragma|__pragma)\b/.test(value) &&
            (/\b(?:push_macro|pop_macro|redefine_extname)\b/.test(value) ||
              blankLiterals(value).includes("#"))
          )
            refuse(node);
        }
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
        // A K&R parameter declaration sits between the declarator and the
        // body of its function.
        const local =
          node.type === "parameter_declaration" ||
          node.parent?.type === "function_definition" ||
          insideFunction(node);
        for (const declarator of node.childrenForFieldName("declarator")) {
          const found = declared(declarator);
          if (found === null) continue;
          if (found.function) {
            functions.add(found.name);
            // `n * run(cmd);` in a body parses as a prototype: the grammar
            // cannot tell it from a multiplication of a call.
            if (
              insideFunction(node) &&
              (extract === "calls" || extract === "string_args" || env)
            )
              refuse(node);
          } else (local ? locals : variables).add(found.name);
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
  /**
   * Names declared both as a function and as a variable: under `#ifdef` one
   * file may declare `run` a function pointer and the other branch a
   * function, and a call of it may then go anywhere.
   */
  const pointerOrFunction = new Set(
    [...functions].filter((name) => variables.has(name)),
  );
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
    called = false,
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
      for (const token of tokens.tokens) {
        // C expands neither a macro's own name inside its body (the
        // function `getenv` in `#define getenv(n) (log(n), getenv(n))`)
        // nor a function-like macro's name without `(`, which is the
        // function of that name. The `(` may follow the use of an
        // object-like macro whose body ends with the name.
        const inner = seen.has(token.name) ? [] : macroAt(token.name, node);
        const followed =
          token.called || (token.last && called && macro.parameters === null);
        if (
          inner.length > 0 &&
          (followed || inner.some((other) => other.parameters === null))
        ) {
          const result = expand(token.name, node, new Set(seen), followed);
          if (result === null) return null;
          names.push(...result.names);
          calls.push(...result.calls);
          continue;
        }
        names.push(token.name);
        // Any other name in the body may be a function: called, handed on
        // (`run_cb(system, x)`) or, for an object-like macro, called with
        // the arguments that follow it (`#define RUN (system)`).
        if (
          token.called ||
          (!variables.has(token.name) &&
            !LIBRARY_VARIABLES.has(token.name) &&
            !/_t$/.test(token.name))
        )
          calls.push(token.name);
      }
      calls.push(...tokens.methods);
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
      // A header's union may alias the field a `property` read sets.
      text: `${path} may define macros${extract === "property" ? ", function pointers or unions" : " or function pointers"} this file uses: ${at(node).text}`,
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

  /** A call of a function the file names, not a macro. */
  const plainCall = (
    name: string,
    node: Node,
    argumentsOf: readonly Node[],
  ): void => {
    if (variables.has(name) || pointerOrFunction.has(name)) {
      // A call through a function pointer the file declares.
      if (extract === "calls" || extract === "string_args" || env) refuse(node);
    } else {
      if (extract === "calls") members.push(name);
      if (env && ENV_GETTERS.has(name)) {
        const value = constantString(
          argumentsOf[ENV_GETTERS.get(name) as number],
        );
        // `getenv("A\0B")` reads A.
        if (value === null || value.includes("\u0000")) refuse(node);
        else members.push(value);
      } else if (env && (ENV_WHOLE.has(name) || GETTER_LIKE.test(name)))
        refuse(node);
      if (extract === "string_args" && calleeMatches(name)) {
        const first = argumentsOf[0];
        if (first !== undefined) {
          const value = literal(first) ?? constantString(first);
          if (value === null || value.includes("\u0000")) refuse(node);
          else members.push(value);
        }
      }
    }
    for (const argument of argumentsOf) visit(argument);
  };

  /**
   * For `property`, whether a macro used at `node` may hold an initializer
   * that sets the key (`#define TLS_DEFAULTS { .verify_peer = 0 }`): a body
   * with braces, the key's name or a paste, followed through the macros
   * it names.
   */
  const initializes = (
    name: string,
    node: Node,
    seen = new Set<string>(),
  ): boolean => {
    if (seen.has(name)) return false;
    seen.add(name);
    return macroAt(name, node).some((macro) => {
      const body = blankLiterals(macro.body);
      if (
        /[{#]/.test(body) ||
        new RegExp(
          `(?<![\\w$])${options.key.replace(/\$/g, "\\$")}(?![\\w$])`,
        ).test(body)
      )
        return true;
      return [...body.matchAll(/[A-Za-z_$][\w$]*/g)].some((word) =>
        initializes(word[0], node, seen),
      );
    });
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
          /\b(?:push_macro|pop_macro|redefine_extname)\b/.test(argument) &&
          extract !== "imports"
        )
          // The macro a pop brings back is not tracked.
          refuse(node);
        return;
      }
      case "string_literal":
      case "concatenated_string":
        // `fopen("/proc/self/environ", "r")` reads the whole environment.
        if (
          env &&
          // `PROC_SELF "environ"` joins a macro the string does not show.
          /\/proc\/[\s\S]*environ|(?:^|[/"])environ\b/.test(
            stringValue(node) ?? node.text,
          )
        )
          refuse(node);
        return;
      case "attribute_specifier":
        // `__attribute__((weakref("system")))` and `alias` bind a name to
        // another function.
        if (
          (extract === "calls" || extract === "string_args" || env) &&
          /\b(?:weakref|alias|ifunc)\b/.test(node.text)
        )
          refuse(node);
        break;
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
        // `wmain` and `_tmain` take the environment the same way.
        const entry = (name: string): boolean => MAIN_NAMES.has(name);
        const main =
          found !== null &&
          (entry(found.name) ||
            (macroAt(found.name, node).length > 0 &&
              (expand(found.name, node)?.names.some(entry) ?? true)));
        // glibc hands a constructor `(argc, argv, envp)` too.
        const startupHook =
          /\bconstructor\b/.test(
            node.text.slice(
              0,
              (field(node, "body")?.startIndex ?? node.endIndex) -
                node.startIndex,
            ),
          ) || /\bconstructor\b/.test(node.previousSibling?.text ?? "");
        if (env && (main || startupHook)) {
          let current: Node | null = declarator;
          while (current !== null && current.type !== "function_declarator")
            current = field(current, "declarator");
          const parameters =
            current === null ? null : field(current, "parameters");
          // K&R `main(argc, argv, envp)` names them without types, and
          // `main(MAIN_ARGS)` writes them through a macro.
          if (
            parameters !== null &&
            ([...parameters.text.matchAll(/[A-Za-z_$][\w$]*/g)].some(
              (word) => macroAt(word[0], parameters).length > 0,
            ) ||
              named(parameters).filter(
                (child) =>
                  child.type === "parameter_declaration" ||
                  child.type === "identifier" ||
                  child.type === "variadic_parameter",
              ).length >= 3)
          )
            refuse(parameters);
        }
        break;
      }
      case "call_expression": {
        let target = field(node, "function");
        const list = field(node, "arguments");
        const argumentsOf = list === null ? [] : named(list);
        // `(getenv)("X")` calls the function, never a function-like macro.
        let bare = false;
        while (target?.type === "parenthesized_expression") {
          const inner = named(target).filter(
            (child) => child.type !== "comment",
          );
          if (inner.length !== 1) break;
          target = inner[0] as Node;
          bare = true;
        }
        if (
          target?.type === "identifier" &&
          /^_?_[Pp]ragma$/.test(target.text)
        ) {
          // `_Pragma("push_macro(...)")` restores a macro Kibi does not track.
          if (
            extract !== "imports" &&
            /\b(?:push_macro|pop_macro|redefine_extname)\b/.test(node.text)
          )
            refuse(node);
          return;
        }
        if (
          target?.type === "identifier" &&
          bare &&
          macroAt(target.text, node).every((macro) => macro.parameters !== null)
        ) {
          plainCall(target.text, node, argumentsOf);
          return;
        }
        if (target?.type === "identifier") {
          const name = target.text;
          if (extract === "property" && initializes(name, node)) refuse(node);
          if (macroAt(name, node).length > 0) {
            const expanded = expand(name, node, new Set(), true);
            if (expanded === null) {
              if (extract !== "imports" && extract !== "property") refuse(node);
            } else if (env && getterNames(expanded.names)) refuse(node);
            else if (
              extract === "string_args" &&
              [name, ...expanded.names, ...expanded.calls].some(calleeMatches)
            )
              // A macro's own first argument is not a call's (`LOG("x")`).
              refuse(node);
            else if (extract === "calls") members.push(name, ...expanded.calls);
            for (const argument of argumentsOf) visit(argument);
            return;
          }
          plainCall(name, node, argumentsOf);
          return;
        }
        if (target?.type === "field_expression") {
          // A struct field holds a function pointer, which may point to any
          // function (`ops->exec` may be `system`).
          if (extract === "calls" || extract === "string_args" || env)
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
        if (extract === "property" && initializes(name, node)) {
          refuse(node);
          return;
        }
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
        if (
          env &&
          (ENV_WHOLE.has(name) ||
            ENV_GETTERS.has(name) ||
            (GETTER_LIKE.test(name) && !variables.has(name)))
        ) {
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
        // A union's members share storage: setting another one later
        // changes this one.
        if (/\bunion\b/.test(root.text)) {
          refuse(node);
          break;
        }
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
        // A field set twice keeps its last value, and a later `.tls = {...}`
        // sets every field of `.tls.verify_peer`'s subobject again.
        if (overridden(node)) refuse(node);
        break;
      }
      case "initializer_list": {
        if (extract !== "property") break;
        // `{ { .verify_peer = 1 }, ... }`: an array of designated structs.
        const positional = named(node).some(
          (child) =>
            child.type !== "initializer_pair" &&
            child.type !== "initializer_list" &&
            child.type !== "comment",
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
    case "generic_expression":
      return true;
    case "assignment_expression":
      return field(parent, "right")?.id === node.id;
    case "pointer_expression":
      return node.parent?.text.startsWith("&") ?? false;
    case "extension_expression":
      // `__extension__ system` is `system`.
      return valuePosition(parent);
    case "expression_statement": {
      // The last statement of `({ ...; system; })` is the expression's value.
      const block = parent.parent;
      const outer = block?.parent;
      if (
        block?.type === "compound_statement" &&
        outer?.type === "parenthesized_expression" &&
        named(block)
          .filter((child) => child.type !== "comment")
          .at(-1)?.id === parent.id
      )
        return valuePosition(outer);
      return false;
    }
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

/** A designator as a path step: `.f` and GNU `f:` are the same field. */
function designatorStep(node: Node): string {
  const name = designatorName(node);
  if (name !== undefined) return name;
  // `[0]` and `[0x0]` are one element; `[1 - 1]` is not read.
  const index = named(node);
  if (
    node.type === "subscript_designator" &&
    index.length === 1 &&
    index[0]?.type === "number_literal"
  ) {
    const number = cNumber((index[0] as Node).text);
    if (number !== null) return `[${number}]`;
  }
  return "?";
}

/** The designator path of a pair from its outermost initializer list. */
function designatorPath(pair: Node): { path: string[]; list: Node } {
  const own = pair.childrenForFieldName("designator").map(designatorStep);
  const list = pair.parent as Node;
  const outer = list.parent;
  if (outer?.type === "initializer_pair") {
    const above = designatorPath(outer);
    return { path: [...above.path, ...own], list: above.list };
  }
  return { path: own, list };
}

/**
 * Whether another pair of the same initializer sets the same field or the
 * subobject holding it (`.tls = {...}` for `.tls.verify_peer`).
 */
function overridden(pair: Node): boolean {
  const { path, list } = designatorPath(pair);
  const pairs: Node[] = [];
  const gather = (node: Node): void => {
    for (const child of named(node)) {
      if (child.type === "initializer_pair") pairs.push(child);
      gather(child);
    }
  };
  gather(list);
  if (path.includes("?")) return true;
  return pairs.some((other) => {
    if (other.id === pair.id) return false;
    const steps = designatorPath(other).path;
    if (steps.includes("?")) return true;
    return (
      steps.length <= path.length &&
      steps.every((step, index) => step === path[index])
    );
  });
}

/** The field a designator names: `.f` or GNU `f:`. */
function designatorName(node: Node | undefined): string | undefined {
  if (node?.type === "field_designator") return named(node)[0]?.text;
  if (node?.type === "field_identifier") return node.text;
  return undefined;
}
