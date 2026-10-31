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

import path from "node:path";

/**
 * The languages Kibi reads code models in, decided by a file's extension in
 * one place. Every proof kind that loads code (exhaustive domains, value
 * constants, rule tables, state machines, patterns) asks this module which
 * evaluator a file needs, so adding a language adds one entry here and its
 * evaluator scripts, not another extension test at each call site.
 */

export type CodeLanguage = "js" | "python" | "prolog";

const JS_FILE = /\.(?:[cm]?[jt]sx?)$/i;
const PYTHON_FILE = /\.py$/i;
// Symbol discovery resolves an ambiguous `.pl` file by its content; one that
// is Perl fails to load in SWI-Prolog, so the read refuses rather than guess.
const PROLOG_FILE = /\.(?:pl|plt)$/i;

/** The language whose evaluator reads `file`, or null for any other file. */
// implements REQ-kibi-multilingual-code-proofs
export function codeLanguage(file: string): CodeLanguage | null {
  if (JS_FILE.test(file)) return "js";
  if (PYTHON_FILE.test(file)) return "python";
  if (PROLOG_FILE.test(file)) return "prolog";
  return null;
}

const PROLOG_LOAD =
  /\b(?:use_module|ensure_loaded|consult|load_files|reexport|include)\s*\(\s*(?:library\(\s*([^)\s]+)\s*\)|'([^']+)'|"([^"]+)"|([a-z][\w/]*))/g;
const PROLOG_LOAD_LIST = /:-\s*\[([^\]]+)\]/g;

export type PrologLoadSpec = { library: string } | { path: string };

/**
 * The files a SWI-Prolog source loads, read from its text: use_module,
 * ensure_loaded, consult, load_files, reexport and include with a quoted or
 * plain path or `library(X)`, and `:- [a, b]` load lists. Nothing runs.
 */
// implements REQ-kibi-multilingual-code-proofs
export function prologLoadSpecs(source: string): PrologLoadSpec[] {
  const specs: PrologLoadSpec[] = [];
  for (const match of source.matchAll(PROLOG_LOAD)) {
    if (match[1] !== undefined) specs.push({ library: match[1] });
    else {
      const spec = match[2] ?? match[3] ?? match[4] ?? "";
      if (spec !== "") specs.push({ path: spec });
    }
  }
  for (const match of source.matchAll(PROLOG_LOAD_LIST))
    for (const item of (match[1] ?? "").split(",")) {
      const spec = item.trim().replace(/^['"]|['"]$/g, "");
      if (spec !== "") specs.push({ path: spec });
    }
  return specs;
}

export function stripPrologExtension(file: string): string {
  return path.normalize(file).replace(/\.(?:pl|plt|pro)$/i, "");
}

/** How a reason names a language. */
/**
 * Languages whose references a qualified plugin reads (kibi-plugin-treesitter
 * through kibi.reference-extractor.v1). Kibi itself runs nothing for them.
 */
// implements REQ-kibi-tree-sitter-references
export const PLUGIN_REFERENCE_LANGUAGES = [
  { name: "Go", pattern: /\.go$/i },
  { name: "Java", pattern: /\.java$/i },
  { name: "C#", pattern: /\.cs$/i },
  { name: "Rust", pattern: /\.rs$/i },
] as const;

/**
 * The data-only kibi-lang-* packs kibi-plugin-treesitter reads these
 * languages with, by the file extensions its catalog maps to them. Python and
 * SWI-Prolog grammars are built into the plugin.
 */
// implements REQ-kibi-tree-sitter-language-packs
export const PLUGIN_LANGUAGE_PACKS = [
  { pack: "kibi-lang-go", name: "Go", pattern: /\.go$/i },
  { pack: "kibi-lang-rust", name: "Rust", pattern: /\.rs$/i },
  { pack: "kibi-lang-java", name: "Java", pattern: /\.java$/i },
  { pack: "kibi-lang-csharp", name: "C#", pattern: /\.cs$/i },
  { pack: "kibi-lang-php", name: "PHP", pattern: /\.php$/i },
  { pack: "kibi-lang-c", name: "C", pattern: /\.c$/i },
  { pack: "kibi-lang-cpp", name: "C++", pattern: /\.(?:cc|cpp|cxx|hh|hpp|hxx)$/i },
  { pack: "kibi-lang-bash", name: "Bash", pattern: /\.(?:bash|sh)$/i },
  { pack: "kibi-lang-ruby", name: "Ruby", pattern: /\.rb$/i },
  { pack: "kibi-lang-hcl", name: "Terraform/HCL", pattern: /\.(?:tf|hcl)$/i },
] as const;

export function pluginReferenceLanguage(file: string): string | null {
  return PLUGIN_REFERENCE_LANGUAGES.find((language) => language.pattern.test(file))?.name ?? null;
}

export const CODE_LANGUAGE_NAMES: Readonly<Record<CodeLanguage, string>> = {
  js: "TypeScript or JavaScript",
  python: "Python",
  prolog: "SWI-Prolog",
};

/** How a reason names the language of `file`. */
export function languageName(file: string): string {
  const language = codeLanguage(file);
  return language === null ? "an unsupported language" : CODE_LANGUAGE_NAMES[language];
}

/**
 * The one refusal for a file whose language a reader cannot read: what reads
 * which languages, and the files it was handed outside them.
 */
// implements REQ-kibi-multilingual-code-proofs
export function unsupportedLanguageReason(
  reader: string,
  supported: readonly CodeLanguage[],
  files: readonly string[],
): string {
  const names = supported.map((language) =>
    language === "js" ? "TypeScript, JavaScript" : CODE_LANGUAGE_NAMES[language],
  );
  const listed =
    names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "no");
  return `${reader} reads ${listed} files, not ${files.slice(0, 3).join(", ")}${files.length > 3 ? ` and ${files.length - 3} more` : ""}`;
}
