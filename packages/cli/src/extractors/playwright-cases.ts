import { playwrightCaseId } from "../proof/producers/playwright-case-id.js";

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

export type PlaywrightCaseDiagnostic = Readonly<{
  code: "dynamic_test_case_unresolved";
  sourceFile: string;
  sourceLine: number;
  detail: string;
}>;

export type PlaywrightCaseExtraction = Readonly<{
  symbols: readonly PlaywrightCaseSymbol[];
  diagnostics: readonly PlaywrightCaseDiagnostic[];
}>;

type Event = Readonly<{
  kind: "describe" | "test";
  start: number;
  end: number;
  /** The literal title; undefined when it is computed at runtime. */
  title: string | undefined;
  braceDepth: number;
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

/**
 * The offset of the `}` closing the first `{` block at or after `from`, or
 * undefined when there is none or it never closes.
 */
function blockEndAfter(source: string, from: number): number | undefined {
  let depth = 0;
  for (const brace of source.slice(from).matchAll(/[{}]/g)) {
    if (brace[0] === "{") depth += 1;
    else if (depth > 0) {
      depth -= 1;
      if (depth === 0) return from + (brace.index as number);
    }
  }
  return undefined;
}

function events(source: string): Event[] {
  const importedAliases = [
    "test",
    ...[...source.matchAll(/\btest\s+as\s+([A-Za-z_$][\w$]*)/g)].map(
      (match) => match[1] as string,
    ),
  ];
  // A declaration such as `function test(` is not a call. Aliases may hold
  // `$`, which must match literally and is not a word character.
  const pattern = new RegExp(
    `(?<!function\\s+)(?<![\\w$])(?:${importedAliases.map((alias) => alias.replaceAll("$", "\\$")).join("|")})(?:\\.only|\\.skip)?\\s*\\.?(describe)?(?:\\.only|\\.skip)?\\s*\\(`,
    "g",
  );
  return [...source.matchAll(pattern)].map((match) => {
    const start = match.index as number;
    const open = start + match[0].lastIndexOf("(") + 1;
    const stringMatch = source
      .slice(open)
      .match(/^\s*(["'`])((?:\\.|(?!\1).)*)\1/s);
    return {
      kind: match[1] === "describe" ? "describe" : "test",
      start,
      end: open + (stringMatch?.[0].length ?? 1),
      title:
        stringMatch === null
          ? undefined
          : (stringMatch[2] as string).replaceAll(/\\(["'`\\])/g, "$1"),
      braceDepth: braceDepthAt(source, start),
    };
  });
}

/** The test's title prefixed by the titles of the describes holding it. */
function qualifiedTitle(
  source: string,
  event: Event,
  all: readonly Event[],
): string {
  const suites = all
    .slice(0, all.indexOf(event))
    .filter(
      (candidate) =>
        candidate.kind === "describe" &&
        candidate.title !== undefined &&
        candidate.braceDepth <= event.braceDepth &&
        // A describe scopes its callback block; one whose block is missing
        // or never closes scopes the rest of the module.
        // rationale: a test call never starts on the `}` that closes a
        // describe callback, so `<` and `<=` agree on every source.
        // Stryker disable next-line EqualityOperator
        event.start <
          (blockEndAfter(source, candidate.end) ?? Number.POSITIVE_INFINITY),
    )
    .map((candidate) => candidate.title as string);
  // Only statically titled tests are qualified.
  return [...suites, event.title as string].join(" > ");
}

/** Extract statically named Playwright tests from a TS/JS source module. */
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
    if (event.title === undefined) {
      diagnostics.push({
        code: "dynamic_test_case_unresolved",
        sourceFile,
        sourceLine: line,
        detail:
          "The Playwright test title is computed at runtime and cannot enter a verification contract.",
      });
      continue;
    }
    const title = qualifiedTitle(source, event, all);
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
