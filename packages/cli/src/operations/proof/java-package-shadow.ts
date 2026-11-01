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
 *   System's.
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
function sourceFiles(directory: string, extension: string, skipped: readonly string[] = []): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || skipped.includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full, extension, skipped));
    else if (entry.name.endsWith(extension)) files.push(full);
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
      const go = GO_ROW.exec(row.text);
      if (go !== null) {
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
        const name = new RegExp(`\\b${go[1]}\\b`);
        return (
          texts === null ||
          (texts.some((text) => GO_ENV_SOURCE.test(text)) && texts.some((text) => name.test(text)))
        );
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
