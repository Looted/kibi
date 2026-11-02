/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Names another file of the project may bind instead of the standard one.
 * The tree-sitter reference reader reads one file at a time, so it marks:
 *
 * - a bare Java `System` or `Runtime` ("System may be a class of package
 *   p: ..."): a top-level type of that name in another file of the package
 *   would be used instead of java.lang's;
 * - a bare Rust standard macro ("println may be a macro_rules! macro of the
 *   crate: ..."): a `macro_rules! println` elsewhere in the crate, in
 *   textual scope through `#[macro_use]`, would be expanded instead;
 * - a C# System type spelled bare ("Environment may be a type of the
 *   project: ..."): a type of that name in the file's namespace, an
 *   enclosing one or the global namespace, declared in any file of the
 *   project, or a `global using` alias of that name, would bind instead of
 *   System's;
 * - a Go name the file uses but does not declare ("getenv may be declared in
 *   another file of the package: ..."), for env: another file of the package
 *   may hold a getter or a wrapper of one;
 * - a Go name the file calls but does not declare ("command may be a
 *   function of another file of the package: ..."), for calls: another file
 *   of the package may bind it to a function value (`var command =
 *   exec.Command`), so the call is that function's;
 * - a Go import ("config may be a package of the project: ..."), for env: a
 *   package of the project may wrap a getter (`config.Get("X")`, `var Get =
 *   os.Getenv`) or read the environment at init;
 * - a PHP function called unqualified in a namespace ("getenv may be a
 *   function of namespace App: ..."): PHP calls `App\getenv` when the
 *   project declares one, and the global `getenv` only otherwise;
 * - a C quoted `#include` ("config.h may define macros this file uses:
 *   ..."): a macro of the header, or of a header it includes, may rename
 *   anything the file calls or reads.
 *
 * The host drops such a row only after it has looked at those files and
 * found no such declaration. When it finds one, or cannot read the files,
 * the row stays and the read is refused.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

interface Row {
  readonly line: number;
  readonly text: string;
}

const JAVA_ROW = /^(System|Runtime) may be a class of (?:package ([\w.]+)|the default package): /;
const RUST_ROW = /^(\w+) may be a macro_rules! macro of the crate: /;
const CSHARP_ROW = /^(\w+) may be a type of the project: /;
const GO_ROW = /^(\w+) may be declared in another file of the package: /;
const GO_IMPORT_ROW = /^\S+ may be a package of the project: /;
const GO_CALL_ROW = /^(\w+) may be a function of another file of the package: /;
const PHP_ROW = /^(\w+) may be a function of namespace ([\w\\]+): /;
const PHP_ENV_ROW = / may be Illuminate\\Support\\Env or a class that extends it: /;
/** PHP sources: included files are often not named .php. */
// Extensions PHP code is commonly run from (Drupal's module files too).
const PHP_EXTENSIONS = [".php", ".php3", ".php4", ".php5", ".php7", ".php8", ".phtml", ".phtm", ".inc", ".module", ".install", ".theme", ".engine", ".profile"];
const C_INCLUDE_ROW = /^(.+?) may define macros or function pointers this file uses: /;
const BASH_ZERO_ROW = /^(.+?) may be sourced by another script, whose folder \$0 names: /;

/** Space, or a comment, between PHP tokens. */
const PHP_GAP = String.raw`(?:\s|/\*[\s\S]*?\*/|(?://|#(?!\[))[^\n]*(?:\n|$))*`;

/**
 * Whether PHP source may declare function `name` in namespace `namespace`.
 * Comments may sit between the words, and strings are not told apart from
 * code (a mention there keeps the row too).
 */
function phpDeclares(text: string, name: string, namespace: string): boolean {
  const spelled = namespace.split("\\").map((part) => part.replace(/[^\w]/g, "")).join(`${PHP_GAP}\\\\${PHP_GAP}`);
  return (
    new RegExp(String.raw`\bnamespace${PHP_GAP}\\?${PHP_GAP}${spelled}${PHP_GAP}[;{]`, "i").test(text) &&
    new RegExp(String.raw`\bfunction${PHP_GAP}&?${PHP_GAP}${name}${PHP_GAP}\(`, "i").test(text)
  );
}

/** C source with comments blanked and line splices joined: what the preprocessor reads. */
function cPreprocessed(text: string): string {
  return text
    .replace(/\?\?\//g, "\\")
    .replace(/\\\r?\n/g, "")
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (match) =>
      match.startsWith("/") ? " " : match,
    );
}

const C_KEYWORDS = new Set(["defined", "sizeof", "int", "char", "long", "short", "unsigned", "signed", "void", "const", "volatile", "struct", "union", "enum", "float", "double", "do", "while", "if", "else", "for", "return", "typeof", "_Bool", "bool", "_Static_assert", "static_assert", "_Alignof", "alignof", "inline", "static", "extern", "register", "restrict"]);

/** What a header may do that no macro name shows: alias a symbol, restore a macro, lex by build mode. */
const C_HEADER_OPAQUE = /\b(?:__asm__|__asm|asm|weakref|alias|ifunc|redefine_extname|push_macro|pop_macro|_Pragma|__pragma)\b|\?\?[=/'()!<>-]/;

const C_DEFINE = /^[ \t\f\v]*(?:#|%:|\?\?=)[ \t\f\v]*define[ \t]+([A-Za-z_$][\w$]*)(\([^)]*\))?(.*)$/gm;

interface CMacro {
  readonly name: string;
  readonly parameters: readonly string[];
  readonly body: string;
}

/** Every macro a C text defines. */
function cDefines(text: string): CMacro[] {
  return [...cPreprocessed(text).matchAll(C_DEFINE)].map((match) => ({
    name: match[1] as string,
    parameters: (match[2] ?? "").replace(/[()\s.]/g, "").split(","),
    body: (match[3] ?? "").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ""),
  }));
}

/** Project macro definitions by name; "*" when the sources could not be listed. */
type MacroIndex = ReadonlyMap<string, readonly CMacro[]>;

const upperName = (name: string): boolean => /^[A-Z_][A-Z0-9_]*$/.test(name);

/**
 * Whether a macro cannot change what a name of the including file means:
 * an upper-case name whose body names only its parameters, keywords,
 * compiler builtins, arrays it indexes (`table[i]`, never called) and
 * upper-case names that are harmless project macros or no project macro
 * (a system constant such as `INFINITY`).
 */
function harmlessMacro(macro: CMacro, index: MacroIndex, seen: Set<string> = new Set()): boolean {
  if (!upperName(macro.name) || index.has("*")) return false;
  if (seen.has(macro.name)) return true;
  seen.add(macro.name);
  const indexed = !/\]\s*\(/.test(macro.body);
  for (const word of macro.body.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const name = word[0];
    if (macro.parameters.includes(name) || C_KEYWORDS.has(name)) continue;
    if (/^__(?:builtin_\w+|attribute__|typeof__|extension__|inline__|restrict__)$/.test(name)) continue;
    const defined = index.get(name);
    if (upperName(name)) {
      if (defined === undefined) continue;
      if (defined.every((inner) => harmlessMacro(inner, index, seen))) continue;
      return false;
    }
    const after = macro.body.slice((word.index ?? 0) + name.length);
    if (indexed && defined === undefined && /^\s*\[/.test(after)) continue;
    return false;
  }
  return true;
}

/**
 * The names a header gives the file that includes it, with those of the
 * headers it includes: macros that may change what a name of the file
 * means, names it `#undef`s, and function pointers (declared directly,
 * through a typedef or through a macro). A macro is harmless only when its
 * name is upper case (a lower-case one may replace a function such as
 * `getenv`) and its body names nothing but its parameters, keywords,
 * compiler builtins and upper-case names no project file defines (a system
 * constant such as `INFINITY`). Null when the header cannot be read: a
 * quoted header missing next to its includer (it may come from an include
 * path Kibi does not know), an include Kibi cannot follow, an asm label,
 * alias attribute or macro push in it, or a trigraph. A header in `<...>`
 * is the project's when the project has a file at that path, and the
 * system's (not read) otherwise.
 */
function headerMacros(
  header: string,
  findProjectHeader: (spelled: string) => string[],
  macroIndex: () => MacroIndex,
  seen: Set<string> = new Set(),
): string[] | null {
  if (seen.has(header)) return [];
  seen.add(header);
  let text: string;
  try {
    text = cPreprocessed(readFileSync(header, "utf8"));
  } catch {
    return null;
  }
  if (C_HEADER_OPAQUE.test(text)) return null;
  const names: string[] = [];
  const pointerMacros: string[] = [];
  for (const macro of cDefines(text)) {
    const { name, parameters, body } = macro;
    if (!harmlessMacro(macro, macroIndex())) names.push(name);
    // `#define DECLARE_HOOK(name) extern int (*name)(const char *)`.
    if (parameters.some((parameter) => parameter !== "" && new RegExp(`\\(\\s*\\*\\s*${parameter.replace(/\$/g, "\\$")}\\s*\\)`).test(body)))
      pointerMacros.push(name);
  }
  for (const match of text.matchAll(/^[ \t\f\v]*(?:#|%:)[ \t]*undef[ \t]+([A-Za-z_$][\w$]*)/gm)) names.push(match[1] as string);
  // Function pointers: `int (*run_hook)(const char *)`.
  for (const match of text.matchAll(/\(\s*\*\s*(?:const\s+)?([A-Za-z_$][\w$]*)\s*\)\s*\(/g)) names.push(match[1] as string);
  // Through a typedef: `typedef int (*runner_t)(const char *); extern runner_t run_hook;`.
  for (const match of text.matchAll(/\btypedef\b[^;]*?\(\s*\*\s*([A-Za-z_$][\w$]*)\s*\)\s*\(/g)) {
    const type = match[1] as string;
    for (const use of text.matchAll(new RegExp(`\\b${type.replace(/\$/g, "\\$")}\\s*(?:const\\s+)?\\**\\s*(?:const\\s+)?([A-Za-z_$][\\w$]*)`, "g")))
      names.push(use[1] as string);
  }
  for (const macro of pointerMacros)
    for (const use of text.matchAll(new RegExp(`\\b${macro.replace(/\$/g, "\\$")}\\s*\\(\\s*([A-Za-z_$][\\w$]*)`, "g")))
      names.push(use[1] as string);
  for (const match of text.matchAll(/^[ \t\f\v]*(?:#|%:)[ \t]*(?:include|include_next|import)\b[ \t]*(.*)$/gm)) {
    const spelled = (match[1] as string).trim();
    const quoted = /^"([^"]+)"/.exec(spelled)?.[1];
    const angled = /^<([^>]+)>/.exec(spelled)?.[1];
    if (quoted === undefined && angled === undefined) return null;
    const targets =
      quoted !== undefined
        ? [path.join(path.dirname(header), quoted)]
        : findProjectHeader(angled as string);
    for (const target of targets) {
      const inner = headerMacros(target, findProjectHeader, macroIndex, seen);
      if (inner === null) return null;
      names.push(...inner);
    }
  }
  return names;
}

/**
 * What in Go source may read the environment: a getter of os, syscall or
 * x/sys (also as a value, or through an alias or a dot import), cgo, and a
 * `//go:linkname`, which binds a local name to any function.
 */
const GO_ENV_SOURCE = /\b(?:Getenv|LookupEnv|Environ|ExpandEnv|Expand)\b|"C"|go:linkname/;

/** Java source with comments, string, char and text-block contents removed. */
export function javaCode(text: string): string {
  let out = "";
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index, index + 3);
    if (rest.startsWith("//")) {
      const end = text.indexOf("\n", index);
      index = end === -1 ? text.length : end;
      out += " ";
    } else if (rest.startsWith("/*")) {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
      out += " ";
    } else if (rest === '"""') {
      const end = text.indexOf('"""', index + 3);
      index = end === -1 ? text.length : end + 3;
      out += '""';
    } else if (rest[0] === '"' || rest[0] === "'") {
      const quote = rest[0];
      index += 1;
      while (index < text.length && text[index] !== quote && text[index] !== "\n")
        index += text[index] === "\\" ? 2 : 1;
      index += 1;
      out += `${quote}${quote}`;
    } else {
      out += text[index];
      index += 1;
    }
  }
  return out;
}

/**
 * Java source with its Unicode escapes decoded (`q` is `q`), as the
 * compiler reads it before anything else; a backslash escaped by another
 * starts no escape.
 */
function javaUnicode(text: string): string {
  return text.replace(/(\\+)u+([0-9a-fA-F]{4})/g, (escape, slashes: string, hex: string) =>
    slashes.length % 2 === 1 ? `${slashes.slice(1)}${String.fromCharCode(Number.parseInt(hex, 16))}` : escape,
  );
}

/** The package a Java file declares, "" for the default package. */
function javaPackage(text: string): string {
  const declared = /\bpackage\s+([\w$.\s]+?)\s*;/.exec(javaCode(javaUnicode(text)));
  return declared === null ? "" : (declared[1] as string).replace(/\s+/g, "");
}

/** Whether Java source declares a type of that name (any nesting). */
function javaDeclares(text: string, name: string): boolean {
  // A Unicode escape may spell any identifier: the file is not ruled out.
  if (text.includes("\\u")) return true;
  return new RegExp(`(?:^|[^\\w$.])(?:class|interface|enum|record)\\s+${name}(?![\\w$])`).test(javaCode(text));
}

/**
 * Source files with an extension under a directory, skipping dot folders,
 * node_modules and the named build folders.
 */
function sourceFiles(directory: string, extension: string | readonly string[], skipped: readonly string[] = []): string[] {
  const files: string[] = [];
  const extensions = typeof extension === "string" ? [extension] : extension;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || skipped.includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full, extensions, skipped));
    else if (extensions.some((suffix) => entry.name.endsWith(suffix))) files.push(full);
  }
  return files;
}

/**
 * Whether C# source may declare a type, namespace or `global using` alias of
 * that name. Comments and strings are not stripped (a mention there keeps
 * the row too), and an identifier spelled with a Unicode escape may be any
 * name.
 */
function csharpDeclares(text: string, name: string): boolean {
  const id = `@?${name}(?![\\w\\\\])`;
  return (
    new RegExp(`\\b(?:class|struct|interface|enum|record)\\s+(?:(?:class|struct)\\s+)?${id}`).test(text) ||
    new RegExp(`\\bdelegate\\s+[^;{}()]*?[\\s>\\]?]${id}\\s*[<(]`).test(text) ||
    new RegExp(`\\bnamespace\\s+(?:[\\w@]+\\s*\\.\\s*)*${id}`).test(text) ||
    new RegExp(`\\bglobal\\s+using\\s+${id}\\s*=`).test(text) ||
    /\b(?:class|struct|interface|enum|record|delegate)\b[^;{}]*?\\[uU]/.test(text)
  );
}

/** Go string literals, interpreted and raw: every import path a file may spell. */
function goStrings(text: string): string[] {
  return [...text.matchAll(/"((?:[^"\\\n]|\\.)*)"|`([^`]*)`/g)].map((match) => match[1] ?? match[2] ?? "");
}

interface GoModule {
  /** The module path, or a replaced module's path. */
  readonly path: string;
  /** The folder its packages are in. */
  readonly dir: string;
}

/**
 * The project's Go modules: each go.mod's module path at its folder (which
 * covers the modules of a go.work), and each replace with a local folder.
 */
function goModules(workspaceRoot: string): GoModule[] {
  const modules: GoModule[] = [];
  for (const file of sourceFiles(workspaceRoot, "go.mod", ["vendor"])) {
    if (path.basename(file) !== "go.mod") continue;
    const dir = path.dirname(file);
    const text = readFileSync(file, "utf8").replace(/\/\/[^\n]*/g, "");
    const name = /^\s*module\s+"?([^\s"]+)"?/m.exec(text);
    if (name !== null) modules.push({ path: name[1] as string, dir });
    // `replace a v1 => ../a`, alone or in a `replace ( ... )` block.
    for (const replace of text.matchAll(/^\s*(?:replace\s+)?"?([^\s"(]+)"?(?:\s+\S+)?\s*=>\s*"?((?:\.\.?|\/)[^\s"]*)"?/gm))
      modules.push({ path: replace[1] as string, dir: path.resolve(dir, replace[2] as string) });
  }
  return modules;
}

/** Whether a go.mod at or above `directory`, within the workspace, puts it in module mode. */
function goModuleMode(workspaceRoot: string, directory: string): boolean {
  for (let current = directory; ; current = path.dirname(current)) {
    try {
      if (statSync(path.join(current, "go.mod")).isFile()) return true;
    } catch {
      // no go.mod here
    }
    if (path.relative(workspaceRoot, current) === "" || path.dirname(current) === current) return false;
  }
}

/**
 * Which Go packages are the project's, and whether one can read the
 * environment. Folder scans and go.mod files are read once per filter.
 */
function createGoReach(workspaceRoot: string): {
  /** Whether Go source imports a package of the project that can read the environment. */
  readonly importsReach: (text: string, from: string) => boolean;
} {
  let modules: GoModule[] | null | undefined;
  const reached = new Map<string, boolean>();
  /**
   * The folder an import path names when it is the project's: relative,
   * under a module path or local replace of the project (the longest
   * wins), or, without a go.mod (GOPATH mode), that path under one of the
   * importer's enclosing folders. Null for another package (the standard
   * library's, a third-party one); "" when the project's go.mod files
   * cannot be read.
   */
  const resolve = (spelled: string, from: string): string | null => {
    if (/^\.\.?(?:\/|$)/.test(spelled)) return path.resolve(from, spelled);
    if (goModuleMode(workspaceRoot, from)) {
      if (modules === undefined) {
        try {
          modules = goModules(workspaceRoot);
        } catch {
          modules = null;
        }
      }
      if (modules === null) return "";
      let best: GoModule | null = null;
      for (const module of modules)
        if (
          (spelled === module.path || spelled.startsWith(`${module.path}/`)) &&
          (best === null || module.path.length > best.path.length)
        )
          best = module;
      return best === null ? null : path.join(best.dir, spelled.slice(best.path.length));
    }
    for (let current = from; ; current = path.dirname(current)) {
      const candidate = path.join(current, spelled);
      try {
        if (statSync(candidate).isDirectory()) return candidate;
      } catch {
        // not here
      }
      if (path.relative(workspaceRoot, current) === "" || path.dirname(current) === current) return null;
    }
  };
  /**
   * Whether a package of the project can read the environment: one of its
   * files (not its tests, which an importer does not compile) spells a
   * getter, cgo or a linkname, or imports a package of the project that
   * can. A folder that cannot be read, or holds no Go file, can.
   */
  const reaches = (dir: string): boolean => {
    const known = reached.get(dir);
    if (known !== undefined) return known;
    // An import cycle reads nothing by itself.
    reached.set(dir, false);
    let result: boolean;
    try {
      const texts = readdirSync(dir)
        .filter((name) => name.endsWith(".go") && !name.endsWith("_test.go"))
        .map((name) => readFileSync(path.join(dir, name), "utf8"));
      result = texts.some((text) => GO_ENV_SOURCE.test(text) || importsReach(text, dir));
    } catch (error) {
      // No such folder: no package of the project, so the path is not an
      // import of it (an import of it would not build), only a string.
      const code = (error as NodeJS.ErrnoException).code;
      result = code !== "ENOENT" && code !== "ENOTDIR";
    }
    reached.set(dir, result);
    return result;
  };
  /** Whether Go source imports a package of the project that can read the environment. */
  const importsReach = (text: string, from: string): boolean =>
    goStrings(text).some((spelled) => {
      const target = resolve(spelled, from);
      return target === "" || (target !== null && target !== from && reaches(target));
    });
  return { importsReach };
}

/** The nearest folder holding Cargo.toml at or above `directory`, within the workspace. */
function crateRoot(workspaceRoot: string, directory: string): string {
  for (let current = directory; ; current = path.dirname(current)) {
    try {
      if (statSync(path.join(current, "Cargo.toml")).isFile()) return current;
    } catch {
      // no manifest here
    }
    if (path.relative(workspaceRoot, current) === "" || path.dirname(current) === current) return workspaceRoot;
  }
}

/**
 * Whether Rust source may define a macro of that name for the crate: a
 * `macro_rules!` of it (comments allowed between the tokens), a
 * `macro_rules!` whose name is a macro variable, or `#[macro_use] extern
 * crate`, which brings another crate's macros in.
 */
function rustDefines(text: string, name: string): boolean {
  const gap = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*)*`;
  return (
    new RegExp(`macro_rules${gap}!${gap}(?:r#)?${name}(?!\\w)`).test(text) ||
    new RegExp(`macro_rules${gap}!${gap}\\$`).test(text) ||
    new RegExp(`#${gap}\\[${gap}macro_use${gap}\\]${gap}(?:pub${gap})?extern${gap}crate\\b`).test(text)
  );
}

/**
 * A filter for one read: keeps every row, except a marked row whose
 * declaration the project's files rule out. Directory scans are shared by
 * the files of the read.
 */
export function createShadowRowFilter(workspaceRoot: string): (file: string, rows: readonly Row[]) => Row[] {
  const sources = new Map<string, string[] | null>();
  // The project's C headers, for `#include <...>` of one of them.
  let headerPaths: string[] | undefined;
  let projectMacros: Map<string, CMacro[]> | undefined;
  const read = (key: string, list: () => string[]): string[] | null => {
    if (!sources.has(key)) {
      try {
        sources.set(
          key,
          list().map((file) => readFileSync(file, "utf8")),
        );
      } catch {
        sources.set(key, null);
      }
    }
    return sources.get(key) ?? null;
  };
  const go = createGoReach(workspaceRoot);
  return (file, rows) => {
    const directory = path.dirname(path.join(workspaceRoot, file));
    return rows.filter((row) => {
      const java = JAVA_ROW.exec(row.text);
      if (java !== null) {
        const texts = read(`java:${directory}`, () =>
          readdirSync(directory)
            .filter((name) => name.endsWith(".java"))
            .map((name) => path.join(directory, name)),
        );
        const type = java[1] as string;
        if (texts === null || texts.some((text) => javaDeclares(text, type))) return true;
        // A package spans source roots (src/main/java beside generated or
        // test sources), and a file's package is what it declares, not its
        // folder: every .java file of the project declaring the package is
        // read too.
        const all = read("java:*", () => sourceFiles(workspaceRoot, ".java"));
        const pkg = java[2] ?? "";
        return all === null || all.some((text) => javaPackage(text) === pkg && javaDeclares(text, type));
      }
      const rust = RUST_ROW.exec(row.text);
      if (rust !== null) {
        const root = crateRoot(workspaceRoot, directory);
        const texts = read(`rust:${root}`, () => sourceFiles(root, ".rs", ["target"]));
        return texts === null || texts.some((text) => rustDefines(text, rust[1] as string));
      }
      if (GO_IMPORT_ROW.test(row.text)) {
        // The row's text may be cut short, so the import is read from the
        // file's line; every path spelled there is checked.
        const texts = read(`file:${file}`, () => [path.join(workspaceRoot, file)]);
        const line = texts?.[0]?.split("\n")[row.line - 1];
        return line === undefined || goStrings(line).length === 0 || go.importsReach(line, directory);
      }
      const goCall = GO_CALL_ROW.exec(row.text);
      if (goCall !== null) {
        const own = path.basename(file);
        const test = own.endsWith("_test.go");
        const texts = read(`go:${file}`, () =>
          readdirSync(directory)
            .filter((name) => name.endsWith(".go") && name !== own && (test || !name.endsWith("_test.go")))
            .map((name) => path.join(directory, name)),
        );
        // A function declared in another file is the package's own function;
        // a variable of that name may hold any function value.
        const name = goCall[1] as string;
        const variable = new RegExp(`\\bvar\\s+${name}\\b|\\b${name}\\s*(?:,\\s*\\w+\\s*)*(?::=|=(?!=))|^\\s*${name}\\s+[^\\s(=]`, "m");
        return texts === null || texts.some((text) => variable.test(javaCode(text)));
      }
      const goName = GO_ROW.exec(row.text);
      if (goName !== null) {
        // The package's other files: the directory's .go files, with its
        // test files only for a test file.
        const own = path.basename(file);
        const test = own.endsWith("_test.go");
        const texts = read(`go:${file}`, () =>
          readdirSync(directory)
            .filter((name) => name.endsWith(".go") && name !== own && (test || !name.endsWith("_test.go")))
            .map((name) => path.join(directory, name)),
        );
        // A getter may be reached through the name by any chain of the
        // package's functions and values, so the row stays when any of
        // those files can read the environment and any names it.
        // A file that imports a package of the project that can read the
        // environment can read it too.
        const name = new RegExp(`\\b${goName[1]}\\b`);
        return (
          texts === null ||
          (texts.some((text) => GO_ENV_SOURCE.test(text) || go.importsReach(text, directory)) &&
            texts.some((text) => name.test(text)))
        );
      }
      const php = PHP_ROW.exec(row.text);
      if (php !== null) {
        // Composer packages under vendor/ do not declare the project's namespaces.
        const texts = read("php", () => sourceFiles(workspaceRoot, PHP_EXTENSIONS, ["vendor"]));
        return texts === null || texts.some((text) => phpDeclares(text, php[1] as string, php[2] as string));
      }
      const zero = BASH_ZERO_ROW.exec(row.text);
      if (zero !== null) {
        // `$0` names this file's folder only when no project script sources it.
        const scripts = read("shell", () =>
          sourceFiles(workspaceRoot, "").filter(
            (candidate) =>
              /\.(?:sh|bash|zsh|ksh|bats)$/i.test(candidate) || !path.basename(candidate).includes("."),
          ),
        );
        const name = (zero[1] as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const sources = new RegExp(`(?:^|[\\s;&|(])(?:source|\\.)\\s+[^\\n;&|]*${name}`, "m");
        return scripts === null || scripts.some((text) => sources.test(text));
      }
      if (PHP_ENV_ROW.test(row.text)) {
        // A class can extend Laravel's environment class only where the
        // project names it.
        // A package under vendor/ may extend it too, and a group use names it
        // as `Illuminate\Support\{Env, Str}`.
        const texts = read("php+vendor", () => sourceFiles(workspaceRoot, PHP_EXTENSIONS));
        return (
          texts === null ||
          texts.some((text) => /Illuminate\s*\\+\s*Support\s*\\+\s*(?:Env\b|\{[^}]*\bEnv\b)/i.test(text))
        );
      }
      const include = C_INCLUDE_ROW.exec(row.text);
      if (include !== null) {
        // The row's text may be cut short, so the path is read from the line.
        const own = read(`file:${file}`, () => [path.join(workspaceRoot, file)])?.[0];
        const line = own?.split("\n")[row.line - 1] ?? "";
        const spelled = /(?:#|%:)\s*(?:include|include_next|import)\s*(?:"([^"]+)"|<([^>]+)>)/.exec(line);
        if (own === undefined || spelled === null) return true;
        // An angle include may name a project file of any extension (`<shims.inl>`).
        const findProjectHeader = (header: string): string[] => {
          if (headerPaths === undefined) {
            try {
              headerPaths = sourceFiles(workspaceRoot, "");
            } catch {
              headerPaths = [];
            }
          }
          const suffix = `${path.sep}${path.normalize(header)}`;
          return headerPaths.filter((candidate) => candidate.endsWith(suffix));
        };
        // The macros any C or header file of the project defines.
        const macroIndex = (): MacroIndex => {
          if (projectMacros === undefined) {
            const texts = read("c-sources", () => sourceFiles(workspaceRoot, [".c", ".h", ".hh", ".hpp", ".hxx", ".inc", ".inl", ".def", ".ipp", ".tcc"]));
            const index = new Map<string, CMacro[]>();
            for (const macro of (texts ?? []).flatMap(cDefines)) index.set(macro.name, [...(index.get(macro.name) ?? []), macro]);
            if (texts === null) index.set("*", []);
            projectMacros = index;
          }
          return projectMacros;
        };
        const targets =
          spelled[1] !== undefined ? [path.join(directory, spelled[1])] : findProjectHeader(spelled[2] as string);
        const code = cPreprocessed(own);
        for (const target of targets) {
          const macros = headerMacros(target, findProjectHeader, macroIndex);
          if (macros === null || macros.some((name) => new RegExp(`\\b${name}\\b`).test(code))) return true;
        }
        return false;
      }
      const csharp = CSHARP_ROW.exec(row.text);
      if (csharp !== null) {
        // Generated sources under obj/ are compiled too, so they are read.
        const texts = read("csharp", () => sourceFiles(workspaceRoot, ".cs"));
        return texts === null || texts.some((text) => csharpDeclares(text, csharp[1] as string));
      }
      return true;
    });
  };
}
