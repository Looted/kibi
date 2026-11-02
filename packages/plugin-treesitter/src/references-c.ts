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
function stringValue(node: Node | undefined): string | null {
  if (node === undefined) return null;
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
  // After the `L`, `u8`, `u` or `U` prefix.
  const body = node.text.slice(node.text.indexOf('"') + 1, -1);
  // A trigraph (`??/`) means another character where the compiler reads them.
  if (/\?\?[=/'()!<>-]/.test(body)) return null;
  let value = "";
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index] as string;
    if (char !== "\\") {
      value += char;
      continue;
    }
    const next = body[index + 1] as string;
    const hex = /^x([0-9A-Fa-f]{1,2})(?![0-9A-Fa-f])/.exec(
      body.slice(index + 1),
    );
    const octal = /^([0-7]{1,3})/.exec(body.slice(index + 1));
    // `\0` is the octal escape of 0.
    if (ESCAPES[next] !== undefined) {
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
  const decimal = /^((\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([fFlL]?)$/.exec(plain);
  if (decimal === null) return null;
  const value = Number(decimal[1]);
  // Significant digits of the mantissa.
  const digits = (decimal[2] as string)
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .replace(/0+$/, "");
  // A float suffix rounds the value to float precision.
  if (digits.length > 15 || (decimal[3] !== "" && !Number.isInteger(value)))
    return null;
  // Exponent form (`1e-7`) is not how the value is written, and `1e400`
  // overflows.
  return Number.isFinite(value) && !/e/.test(String(value))
    ? String(value)
    : null;
}

/** A literal value: a string, a number, true/false/NULL. */
function literal(node: Node): string | null {
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
      const operand = field(node, "argument") as Node;
      const number =
        operand.type === "number_literal" ? cNumber(operand.text) : null;
      if (number === null || !node.text.startsWith("-")) return null;
      return number === "0" ? "0" : `-${number}`;
    }
    case "parenthesized_expression":
      return literal(named(node)[0] as Node);
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
  parameters: readonly string[] | null,
): {
  tokens: BodyToken[];
  methods: string[];
  pastes: boolean;
} {
  const code = blankLiterals(body);
  const tokens: BodyToken[] = [];
  const end = /([A-Za-z_$][\w$]*)\s*$/.exec(code)?.index;
  for (const match of code.matchAll(
    /(?<![\w$.]|->)([A-Za-z_$][\w$]*)(\s*\()?/g,
  )) {
    const name = match[1] as string;
    if (C_KEYWORDS.has(name) || parameters?.includes(name)) continue;
    tokens.push({
      name,
      called: match[2] !== undefined,
      last: match.index === end,
    });
  }
  const methods = [
    ...code.matchAll(/(?:\.|->)\s*([A-Za-z_$][\w$]*)\s*\(/g),
  ].map((match) => `*.${match[1] as string}`);
  return { tokens, methods, pastes: /#/.test(code) };
}

/**
 * A macro's value with its lines spliced, strings and character constants
 * emptied and a line comment cut, lexed left to right as the preprocessor
 * does (`'"'` is one constant).
 */
function blankLiterals(value: string): string {
  // A spliced line is one line, also for a comment that ends with `\`. The
  // grammar ends a directive at `\ ` and a newline, which fails the parse.
  const text = value.replace(/\\\r?\n/g, " ");
  let out = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index] as string;
    // A block comment ends a macro's value in the grammar (text after it on
    // the line fails the parse), so only a line comment reaches here, and it
    // runs to the end of the value.
    if (char === "/" && text[index + 1] === "/") break;
    if (char === '"' || char === "'") {
      let stop = index + 1;
      // An unclosed one runs to the end of the value.
      while (text[stop] !== undefined && text[stop] !== char)
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

/** Under `#if`, `#ifdef` or `#ifndef`, whose `#elif` and `#else` they hold. */
function conditionalAncestor(node: Node): boolean {
  for (let current = node.parent; current !== null; current = current.parent)
    if (current.type === "preproc_if" || current.type === "preproc_ifdef")
      return true;
  return false;
}

/** The identifier a declarator declares, and whether it is a function. */
function declared(
  node: Node,
  pointer = false,
): { name: string; function: boolean } | null {
  switch (node.type) {
    case "identifier":
      return { name: node.text, function: false };
    case "function_declarator": {
      const inner = field(node, "declarator") as Node;
      if (inner.type === "identifier" && !pointer)
        return { name: inner.text, function: true };
      return declared(inner, true);
    }
    case "pointer_declarator":
    case "array_declarator":
    case "init_declarator":
    case "attributed_declarator":
      return declared(inside(node), pointer);
    case "parenthesized_declarator":
      return declared(inside(node), true);
    default:
      return null;
  }
}

/** The name a function definition defines. */
function definedName(node: Node): string {
  return (declared(field(node, "declarator") as Node) as { name: string }).name;
}

/**
 * The declarator a declarator holds: its `declarator` field, or the first
 * child of one without it (`(f)`, `x [[attr]]`); undefined in a name.
 */
function inside(node: Node): Node {
  return field(node, "declarator") ?? (named(node)[0] as Node);
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
  // by a line splice. A last line that ends with a splice fails the parse,
  // so a splice always has a next line.
  const lines = root.text.split("\n");
  lines.forEach((text, index) => {
    if (
      /\\[ \t\f\v]+\r?$/.test(text) ||
      /\?\?[=/'()!<>-]/.test(text) ||
      (/[\w$]\\\r?$/.test(text) && /^[\w$]/.test(lines[index + 1] as string))
    )
      unresolved.push({ line: index + 1, text: text.trim().slice(0, 80) });
  });

  // Macros, by name and range, and every name the file declares.
  // Stryker disable next-line ArrayDeclaration: rationale: a string in the list has no name, so no lookup finds it.
  const macros: Macro[] = [];
  const variables = new Set<string>();
  // Variables of a function: a local pointer may share a function's name.
  const locals = new Set<string>();
  const functions = new Set<string>();
  const collect = (node: Node): void => {
    switch (node.type) {
      case "preproc_def":
      case "preproc_function_def": {
        const parameters = field(node, "parameters");
        // `#define X` has no value.
        const body = field(node, "value")?.text ?? "";
        // `#define SAVE _Pragma("push_macro(\"x\")")` restores a macro when used.
        if (
          extract !== "imports" &&
          /\b(?:_Pragma|__pragma)\b/.test(body) &&
          (/\b(?:push_macro|pop_macro|redefine_extname)\b/.test(body) ||
            blankLiterals(body).includes("#"))
        )
          refuse(node);
        macros.push({
          name: (field(node, "name") as Node).text,
          start: node.endIndex,
          end: root.endIndex,
          body,
          // `...` is no name the body could use.
          parameters:
            parameters === null
              ? null
              : named(parameters).map((child) => child.text),
          conditional: conditionalAncestor(node),
          maybeEnded: [],
        });
        break;
      }
      case "preproc_call": {
        const argument = field(node, "argument");
        if (directive(node) === "#undef" && argument !== null) {
          // `#undef X // note`: the name is the first word.
          const name = /^([A-Za-z_]\w*)/.exec(argument.text)?.[1];
          const conditional = conditionalAncestor(node);
          for (const macro of macros)
            if (macro.name === name && macro.end === root.endIndex) {
              if (conditional) macro.maybeEnded.push(node.endIndex);
              else macro.end = node.endIndex;
            }
        }
        break;
      }
      case "declaration":
      case "parameter_declaration": {
        // A prototype's parameter names exist only inside the prototype.
        if (node.type === "parameter_declaration" && !definitionParameter(node))
          break;
        // A K&R parameter declaration sits between the declarator and the
        // body of its function.
        const local =
          node.type === "parameter_declaration" ||
          (node.parent as Node).type === "function_definition" ||
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
        functions.add(definedName(node));
        break;
      }
      case "enumerator":
        variables.add((field(node, "name") as Node).text);
        break;
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
      const tokens = bodyTokens(macro.body, macro.parameters);
      if (tokens.pastes) return null;
      // A call through a pointer the file declares names no function.
      if (
        tokens.tokens.some((token) => token.called && variables.has(token.name))
      )
        return null;
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
          followed ||
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
    name === options.callee || name === `*.${options.callee}`;

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
    if (node?.type !== "identifier") return stringValue(node);
    const found = macroAt(node.text, node);
    if (found.length !== 1) return null;
    const macro = found[0] as Macro;
    if (
      macro.parameters !== null ||
      macro.conditional ||
      macro.maybeEnded.length > 0
    )
      return null;
    // A macro's value starts after the blanks that follow its name.
    const body = /^((?:"(?:[^"\\\n]|\\.)*"\s*)+)$/.exec(macro.body)?.[1];
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
    if (node.type === "preproc_if" || node.type === "preproc_ifdef") {
      const before = members.length + unresolved.length;
      for (const child of named(node)) visit(child);
      if (members.length + unresolved.length > before) refuse(node);
      return;
    }
    switch (node.type) {
      case "preproc_include": {
        // `#include MACRO_H` names its header through a macro.
        const path = field(node, "path") as Node;
        included(
          node,
          path.type === "system_lib_string"
            ? path.text.slice(1, -1)
            : stringValue(path),
        );
        return;
      }
      case "preproc_call": {
        const name = directive(node);
        // An absent argument reads as "undefined", which no pattern matches.
        const argument = String(field(node, "argument")?.text);
        if (name === "#import" || name === "#include_next") {
          // A block comment after the path is not part of the argument.
          const path = /^(?:<([^>]+)>|"([^"]+)")\s*(?:\/\/.*)?$/.exec(argument);
          included(node, path === null ? null : (path[1] ?? path[2] ?? null));
        } else if (
          name === "#pragma" &&
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
        const declarator = field(node, "declarator") as Node;
        const name = definedName(node);
        // `#define ENTRY main` / `int ENTRY(...)` is main too.
        // `wmain` and `_tmain` take the environment the same way.
        const entry = (word: string): boolean => MAIN_NAMES.has(word);
        const main =
          entry(name) || (expand(name, node)?.names.some(entry) ?? true);
        // glibc hands a constructor `(argc, argv, envp)` too, marked before
        // the body or on the declaration before it.
        const startupHook = /\bconstructor\b/.test(
          root.text.slice(
            node.previousSibling?.startIndex ?? node.startIndex,
            (field(node, "body") as Node).startIndex,
          ),
        );
        if (env && (main || startupHook)) {
          // The parameters of the function itself, the innermost list:
          // `void (*main(int, char **, char **))(int)` and `int (main(...))`.
          let parameters = declarator;
          for (
            let current: Node | undefined = declarator;
            current !== undefined;
            current = inside(current)
          )
            if (current.type === "function_declarator")
              parameters = field(current, "parameters") as Node;
          // K&R `main(argc, argv, envp)` names them without types, and
          // `main(MAIN_ARGS)` writes them through a macro.
          if (
            [...parameters.text.matchAll(/[A-Za-z_$][\w$]*/g)].some(
              (word) => macroAt(word[0], parameters).length > 0,
            ) ||
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
        let target = field(node, "function") as Node;
        const argumentsOf = named(field(node, "arguments") as Node);
        // `(getenv)("X")` calls the function, never a function-like macro.
        let bare = false;
        while (target.type === "parenthesized_expression") {
          target = named(target).find(
            (child) => child.type !== "comment",
          ) as Node;
          bare = true;
        }
        if (/^_?_[Pp]ragma$/.test(target.text)) {
          // `_Pragma("push_macro(...)")` restores a macro Kibi does not track.
          if (
            extract !== "imports" &&
            /\b(?:push_macro|pop_macro|redefine_extname)\b/.test(node.text)
          )
            refuse(node);
          return;
        }
        if (
          target.type === "identifier" &&
          bare &&
          macroAt(target.text, node).every((macro) => macro.parameters !== null)
        ) {
          plainCall(target.text, node, argumentsOf);
          return;
        }
        if (target.type === "identifier") {
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
        // A call through an expression names no function: a struct field
        // holds a function pointer, which may point to any function
        // (`ops->exec` may be `system`).
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
        if (found.some((macro) => macro.parameters === null)) {
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
        // Undefined for `[0] = 1`, which names no macro and is not the key.
        const name = designatorName(
          node.childrenForFieldName("designator").at(-1) as Node,
        ) as string;
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
        const value = field(node, "value") as Node;
        const read = literal(value);
        // `#define true 0` changes what the word means.
        if (read === null || macroAt(value.text, node).length > 0) refuse(node);
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

/** The name of a directive: `# undef` is `#undef`. */
function directive(node: Node): string {
  return (field(node, "directive") as Node).text.replace(/\s/g, "");
}

/** Parents of an identifier that declare it (the grammar names a typedef a type_identifier). */
const DECLARING = new Set([
  "function_declarator",
  "pointer_declarator",
  "array_declarator",
  "parenthesized_declarator",
  "attributed_declarator",
  "declaration",
  "parameter_declaration",
]);

/** Whether an identifier is the name a declaration declares. */
function declaratorPosition(node: Node): boolean {
  const parent = node.parent as Node;
  if (DECLARING.has(parent.type)) return true;
  if (parent.type === "init_declarator")
    return (field(parent, "declarator") as Node).id === node.id;
  return (
    parent.type === "enumerator" &&
    (field(parent, "name") as Node).id === node.id
  );
}

/** Whether an identifier is used as a value a callee could receive. */
function valuePosition(node: Node): boolean {
  // `(system)` and `*system` are the function too.
  let current = node;
  let parent = node.parent as Node;
  while (
    parent.type === "parenthesized_expression" ||
    (parent.type === "pointer_expression" && parent.text.startsWith("*"))
  ) {
    current = parent;
    parent = current.parent as Node;
  }
  if (current !== node)
    return (
      // Climbed from an argument, the parent is its argument list.
      parent.type === "call_expression" || valuePosition(current)
    );
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
    // `&system`; `*system` is read above.
    case "pointer_expression":
      return true;
    case "assignment_expression":
      return (field(parent, "right") as Node).id === node.id;
    case "extension_expression":
      // `__extension__ system` is `system`.
      return valuePosition(parent);
    case "expression_statement": {
      // The last statement of `({ ...; system; })` is the expression's value.
      const block = parent.parent as Node;
      const outer = block.parent;
      return (
        outer?.type === "parenthesized_expression" &&
        (
          named(block)
            .filter((child) => child.type !== "comment")
            .at(-1) as Node
        ).id === parent.id &&
        valuePosition(outer)
      );
    }
  }
  return false;
}

/**
 * Whether an initializer list fills a struct or union (a type other than a
 * plain scalar), whose fields positional values set by order. Past the
 * initializers it sits in, a list is the value of a declaration or of a
 * compound literal, both of which have a type.
 */
function aggregate(node: Node): boolean {
  let current = node.parent as Node;
  while (INITIALIZER_PARTS.has(current.type)) current = current.parent as Node;
  return (field(current, "type") as Node).type !== "primitive_type";
}

const INITIALIZER_PARTS = new Set([
  "initializer_list",
  "initializer_pair",
  "init_declarator",
]);

/** Whether a parameter belongs to a function definition (not a prototype). */
function definitionParameter(node: Node): boolean {
  // From the list's declarator (an abstract one in a type name too), the
  // declarators around it lead to a definition only for a function's own
  // parameters.
  let current = (node.parent as Node).parent as Node;
  while (current.type.endsWith("_declarator")) current = current.parent as Node;
  return current.type === "function_definition";
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
  // `[0]` and `[0x0]` are one element; `[1 - 1]` and `[0 ... 2]` are
  // not read.
  const index = named(node);
  const first = index[0] as Node;
  const number =
    index.length === 1 && first.type === "number_literal"
      ? cNumber(first.text)
      : null;
  return number === null ? "?" : `[${number}]`;
}

/** The designator path of a pair from its outermost initializer list. */
function designatorPath(pair: Node): { path: string[]; list: Node } {
  const own = pair.childrenForFieldName("designator").map(designatorStep);
  const list = pair.parent as Node;
  const outer = list.parent as Node;
  if (outer.type === "initializer_pair") {
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
    // A longer path differs where this one has no step.
    return steps.every((step, index) => step === path[index]);
  });
}

/** The field a designator names: `.f` or GNU `f:`. */
function designatorName(node: Node): string | undefined {
  if (node.type === "field_designator") return (named(node)[0] as Node).text;
  if (node.type === "field_identifier") return node.text;
  return undefined;
}
