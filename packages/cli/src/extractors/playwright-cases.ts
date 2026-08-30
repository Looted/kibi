import { playwrightCaseId } from "../proof/producers/playwright-case-id.js";

// implements REQ-kibi-verification-evidence-contract
export type PlaywrightCaseSymbol = Readonly<{
  id: string;
  title: string;
  sourceFile: string;
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
  symbol_role: "behavioral";
  tags: readonly ["test-case", "playwright"];
}>;

// implements REQ-kibi-verification-evidence-contract
export type PlaywrightCaseDiagnostic = Readonly<{
  code: "dynamic_test_case_unresolved";
  sourceFile: string;
  sourceLine: number;
  detail: string;
}>;

// implements REQ-kibi-verification-evidence-contract
export type PlaywrightCaseExtraction = Readonly<{
  symbols: readonly PlaywrightCaseSymbol[];
  diagnostics: readonly PlaywrightCaseDiagnostic[];
}>;

type Event = Readonly<{
  kind: "describe" | "test";
  start: number;
  end: number;
  title?: string;
  dynamic: boolean;
  braceDepth: number;
  scopeEnd?: number;
}>;

function lineColumn(source: string, offset: number): [number, number] {
  const prefix = source.slice(0, offset);
  const line = prefix.split("\n").length;
  const lastBreak = prefix.lastIndexOf("\n");
  return [line, offset - lastBreak];
}

function braceDepthAt(source: string, offset: number): number {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (const character of source.slice(0, offset)) {
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
    } else if (character === "{") depth += 1;
    else if (character === "}") depth = Math.max(0, depth - 1);
  }
  return depth;
}

function matchingBrace(source: string, open: number): number | undefined {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

function events(source: string): Event[] {
  const output: Event[] = [];
  const importedAliases = [
    "test",
    ...[...source.matchAll(/\btest\s+as\s+([A-Za-z_$][\w$]*)/g)].map(
      (match) => match[1] as string,
    ),
  ];
  const pattern = new RegExp(
    `\\b(?:${importedAliases.join("|")})(?:\\.only|\\.skip)?\\s*\\.?(describe)?\\s*\\(`,
    "g",
  );
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (/function\s+$/.test(source.slice(Math.max(0, start - 16), start))) {
      continue;
    }
    const open = start + match[0].lastIndexOf("(") + 1;
    const remainder = source.slice(open);
    const stringMatch = remainder.match(/^\s*(["'`])((?:\\.|(?!\1).)*)\1/s);
    const dynamic = !stringMatch;
    const title = stringMatch?.[2]?.replaceAll(/\\(["'`\\])/g, "$1");
    const end = Math.min(source.length, open + (stringMatch?.[0].length ?? 1));
    const callbackOpen = source.indexOf("{", end);
    const scopeEnd =
      match[1] === "describe" && callbackOpen >= 0
        ? matchingBrace(source, callbackOpen)
        : undefined;
    output.push({
      kind: match[1] === "describe" ? "describe" : "test",
      start,
      end,
      ...(title === undefined ? {} : { title }),
      dynamic,
      braceDepth: braceDepthAt(source, start),
      ...(scopeEnd === undefined ? {} : { scopeEnd }),
    });
  }
  return output;
}

function qualifiedTitle(event: Event, all: readonly Event[]): string {
  const suites = all
    .filter(
      (candidate) =>
        candidate.kind === "describe" &&
        candidate.start < event.start &&
        (candidate.scopeEnd === undefined ||
          event.start < candidate.scopeEnd) &&
        candidate.braceDepth <= event.braceDepth &&
        candidate.title !== undefined,
    )
    .map((candidate) => candidate.title as string);
  return [...suites, event.title ?? ""].join(" > ");
}

/** Extract statically named Playwright tests from a TS/JS source module. */
// implements REQ-kibi-verification-evidence-contract
export function extractPlaywrightCases(
  sourceFile: string,
  source: string,
): PlaywrightCaseExtraction {
  if (
    !/from\s+["']@playwright\/test["']|require\(\s*["']@playwright\/test/.test(
      source,
    )
  ) {
    return { symbols: [], diagnostics: [] };
  }
  const symbols: PlaywrightCaseSymbol[] = [];
  const diagnostics: PlaywrightCaseDiagnostic[] = [];
  const all = events(source);
  for (const event of all.filter(({ kind }) => kind === "test")) {
    const [line, column] = lineColumn(source, event.start);
    if (event.dynamic) {
      diagnostics.push({
        code: "dynamic_test_case_unresolved",
        sourceFile,
        sourceLine: line,
        detail:
          "The Playwright test title is computed at runtime and cannot enter a verification contract.",
      });
      continue;
    }
    const title = qualifiedTitle(event, all);
    const end = source.indexOf("\n", event.end);
    const [endLine, endColumn] = lineColumn(
      source,
      end === -1 ? source.length : end,
    );
    symbols.push({
      id: playwrightCaseId(sourceFile, title),
      title,
      sourceFile,
      sourceLine: line,
      sourceColumn: column,
      sourceEndLine: endLine,
      sourceEndColumn: endColumn,
      symbol_role: "behavioral",
      tags: ["test-case", "playwright"],
    });
  }
  return { symbols, diagnostics };
}
