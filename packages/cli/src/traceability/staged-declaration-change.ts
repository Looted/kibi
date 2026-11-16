import type { SourceAnalysisResult } from "kibi-plugin-sdk";
import { partialAnalysisSymbolsUsable } from "./symbol-extract.js";

/**
 * Which declarations of a staged source file the commit adds or changes,
 * judged against the base tree's version of the same file.
 *
 * A declaration is in the change when its locator is new, or when its own
 * text (its lines minus the lines of declarations nested inside it) differs
 * from every base declaration with that locator once comments and
 * whitespace are dropped. Reformatting, comments and moving a
 * declaration inside the file do not put it in the change.
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

/**
 * Source text without comments and whitespace. String and template literals
 * are kept verbatim (minus whitespace), so a `//` inside a string is never
 * read as a comment.
 */
export function stripCommentsAndWhitespace(text: string): string {
  let out = "";
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
      out += text.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    out += char;
    index++;
  }
  return out.replace(/\s/g, "");
}

/** A declaration's own text, normalized, without nested declarations. */
export function declarationOwnText(
  content: string,
  symbol: AnalyzedSymbol,
  symbols: readonly AnalyzedSymbol[],
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
  return stripCommentsAndWhitespace(own.join("\n"));
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
      declarationOwnText(before.content, symbol, before.analysis.symbols),
    );
    baseTexts.set(locator, texts);
  }
  const changed = new Set<AnalyzedSymbol>();
  for (const symbol of afterSymbols) {
    const texts = baseTexts.get(declarationLocator(symbol));
    if (
      !texts ||
      !texts.has(declarationOwnText(after.content, symbol, afterSymbols))
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
