import type { SourceAnalysisResult } from "kibi-plugin-sdk";
import { partialAnalysisSymbolsUsable } from "./symbol-extract.js";

/**
 * Which declarations of a staged source file the commit adds or changes,
 * judged against the base tree's version of the same file.
 *
 * A declaration is in the change when its locator is new, or when its own
 * text (its lines minus the lines of declarations nested inside it) differs
 * from every base declaration with that locator once normalized (see
 * `normalizeDeclarationText`). In a C-style language, reformatting and
 * comments do not put a declaration in the change; moving it inside the file
 * never does.
 */

type AnalyzedSymbol = SourceAnalysisResult["symbols"][number];

export interface DeclarationSource {
  analysis: SourceAnalysisResult;
  content: string;
}

/** The identity a declaration keeps across versions of one file. */
export function declarationLocator(symbol: AnalyzedSymbol): string {
  return (symbol as { qualifiedName?: string }).qualifiedName ?? symbol.name;
}

/** A span key that matches a symbol extracted from the same analysis. */
export function declarationSpanKey(span: {
  startLine: number;
  endLine: number;
}): string {
  return `${span.startLine}:${span.endLine}`;
}

/**
 * Whether a base analysis places its declarations well enough to compare
 * against. A failed analysis, or a partial one whose symbols are unusable,
 * does not: every declaration of the staged file is then in the change.
 */
export function baseAnalysisUsable(analysis: SourceAnalysisResult): boolean {
  const status = (analysis as { status?: string }).status;
  if (status === undefined || status === "ok") return true;
  return partialAnalysisSymbolsUsable(
    analysis as Parameters<typeof partialAnalysisSymbolsUsable>[0],
  );
}

/** Languages with line (`//`) and block comments and free layout. */
const C_STYLE_LANGUAGES = new Set([
  "c",
  "cpp",
  "c-or-cpp",
  "csharp",
  "go",
  "java",
  "javascript",
  "kotlin",
  "rust",
  "swift",
  "typescript",
]);

/** Languages with `/regex/` literals. */
const REGEX_LITERAL_LANGUAGES = new Set(["javascript", "typescript"]);

/** Keywords after which a `/` starts a regular expression. */
const REGEX_AFTER_WORD =
  /(?:^|[^\p{L}\p{N}_$])(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/u;

const WORD_CHAR = /[\p{L}\p{N}_$]/u;

/** Whether a `/` after the normalized text `out` starts a regex literal. */
function regexStarts(out: string): boolean {
  const previous = out[out.length - 1];
  if (previous === undefined) return true;
  if (/[(,=:[!&|?{};+\-*%<>~^]/.test(previous)) return true;
  return REGEX_AFTER_WORD.test(out);
}

/**
 * The end (exclusive) of the regex literal starting at `start`, flags
 * included; undefined when the line ends before it closes, so the `/` is
 * an operator.
 */
function regexEnd(text: string, start: number): number | undefined {
  let index = start + 1;
  let inClass = false;
  while (index < text.length) {
    const char = text[index] as string;
    if (char === "\n") return undefined;
    if (char === "\\") index += 2;
    else {
      if (char === "[") inClass = true;
      else if (char === "]") inClass = false;
      else if (char === "/" && !inClass) {
        index += 1;
        while (index < text.length && WORD_CHAR.test(text[index] as string))
          index += 1;
        return index;
      }
      index += 1;
    }
  }
  return undefined;
}

/**
 * Whether dropping the whitespace between `left` and `right` would join two
 * tokens into one (`return x`, `a + +b`).
 */
function spaceNeeded(left: string | undefined, right: string): boolean {
  if (left === undefined) return false;
  if (WORD_CHAR.test(left) && WORD_CHAR.test(right)) return true;
  return left === right && (left === "+" || left === "-");
}

/**
 * Source text normalized for comparing two versions of a declaration. For a
 * C-style language, comments and layout whitespace are dropped (one space is
 * kept where two tokens would otherwise join), while string, template and
 * regex literals are kept verbatim, so a `//` inside a string or a
 * JavaScript regex is never read as a comment. Other languages may give
 * comments other forms, layout meaning or `//` another use (Python's integer
 * division), so only blank lines and trailing whitespace are dropped there.
 */
export function normalizeDeclarationText(
  text: string,
  language: string | undefined,
): string {
  if (!C_STYLE_LANGUAGES.has(String(language)))
    return text
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line !== "")
      .join("\n");
  const regexLiterals = REGEX_LITERAL_LANGUAGES.has(String(language));
  let out = "";
  let space = false;
  const emit = (token: string) => {
    if (space && spaceNeeded(out[out.length - 1], token[0] as string))
      out += " ";
    space = false;
    out += token;
  };
  let index = 0;
  while (index < text.length) {
    const char = text[index] as string;
    const next = text[index + 1];
    if (char === "/" && next === "/") {
      const end = text.indexOf("\n", index);
      index = end === -1 ? text.length : end;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
      space = true;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      let end = index + 1;
      // rationale: one step past the end reads undefined, which ends the
      // loop with the same slice, so <= is equivalent here.
      // Stryker disable next-line EqualityOperator
      while (end < text.length && text[end] !== char) {
        end += text[end] === "\\" ? 2 : 1;
      }
      emit(text.slice(index, end + 1));
      index = end + 1;
      continue;
    }
    if (char === "/" && regexLiterals && regexStarts(out)) {
      const end = regexEnd(text, index);
      if (end !== undefined) {
        emit(text.slice(index, end));
        index = end;
        continue;
      }
    }
    if (/\s/.test(char)) space = true;
    else emit(char);
    index++;
  }
  return out;
}

/** A declaration's own text, normalized, without nested declarations. */
export function declarationOwnText(
  content: string,
  symbol: AnalyzedSymbol,
  symbols: readonly AnalyzedSymbol[],
  language?: string,
): string {
  const lines = content.split(/\r?\n/);
  // The declaration itself, like any twin with its span, is not nested.
  const nested = symbols.filter(
    (other) =>
      symbol.startLine <= other.startLine &&
      other.endLine <= symbol.endLine &&
      (other.startLine !== symbol.startLine ||
        other.endLine !== symbol.endLine),
  );
  const own: string[] = [];
  for (let line = symbol.startLine; line <= symbol.endLine; line++) {
    if (
      nested.some((other) => other.startLine <= line && line <= other.endLine)
    )
      continue;
    own.push(lines[line - 1] ?? "");
  }
  return normalizeDeclarationText(own.join("\n"), language);
}

/**
 * The declarations of `after` that the commit adds or changes. A missing or
 * unusable base puts every declaration in the change.
 */
export function declarationsInChange(
  before: DeclarationSource | null,
  after: DeclarationSource,
): Set<AnalyzedSymbol> {
  const afterSymbols = after.analysis.symbols;
  if (!before || !baseAnalysisUsable(before.analysis)) {
    return new Set(afterSymbols);
  }
  const baseTexts = new Map<string, Set<string>>();
  for (const symbol of before.analysis.symbols) {
    const locator = declarationLocator(symbol);
    const texts = baseTexts.get(locator) ?? new Set<string>();
    texts.add(
      declarationOwnText(
        before.content,
        symbol,
        before.analysis.symbols,
        before.analysis.language,
      ),
    );
    baseTexts.set(locator, texts);
  }
  const changed = new Set<AnalyzedSymbol>();
  for (const symbol of afterSymbols) {
    const texts = baseTexts.get(declarationLocator(symbol));
    if (
      !texts ||
      !texts.has(
        declarationOwnText(
          after.content,
          symbol,
          afterSymbols,
          after.analysis.language,
        ),
      )
    ) {
      changed.add(symbol);
    }
  }
  return changed;
}

/**
 * Whether the staged gate judges an extracted symbol: a declaration with a
 * symbol record is always judged by the hunks it owns; one without a record
 * only when the commit adds or changes it.
 */
export function judgedByCommit(
  symbol: { location: { startLine: number; endLine: number } },
  recorded: boolean,
  changedSpanKeys: ReadonlySet<string> | null,
): boolean {
  if (recorded || changedSpanKeys === null) return true;
  return changedSpanKeys.has(declarationSpanKey(symbol.location));
}
