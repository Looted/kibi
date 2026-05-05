import { afterEach, beforeEach, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import * as symbolsCoordinatorExports from "../../src/extractors/symbols-coordinator.js";
import {
  enrichSymbolCoordinates,
  type ManifestSymbolEntry,
} from "../../src/extractors/symbols-coordinator.js";

type TsEnrichStub = (
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
) => Promise<ManifestSymbolEntry[]>;

let tsEnrichStub: TsEnrichStub | null = null;

function runEnrichment(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
  return enrichSymbolCoordinates(
    entries,
    workspaceRoot,
    tsEnrichStub ? { enrichTsCoordinates: tsEnrichStub } : undefined,
  );
}

const tmpDir = path.join(process.cwd(), "tmp-symbols-coord-tests");

function ensureDir() {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
}

function writeFile(name: string, content: string) {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

beforeEach(() => {
  if (fs.existsSync(tmpDir)) {
    for (const fileName of fs.readdirSync(tmpDir)) {
      try {
        fs.chmodSync(path.join(tmpDir, fileName), 0o600);
      } catch {}
      try {
        fs.unlinkSync(path.join(tmpDir, fileName));
      } catch {}
    }

    try {
      fs.rmdirSync(tmpDir);
    } catch {}
  }

  ensureDir();
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) {
    for (const fileName of fs.readdirSync(tmpDir)) {
      try {
        fs.chmodSync(path.join(tmpDir, fileName), 0o600);
      } catch {}
      fs.unlinkSync(path.join(tmpDir, fileName));
    }
    fs.rmdirSync(tmpDir);
  }

  tsEnrichStub = null;
});

it("delegates parser-backed source analysis to a matching provider", () => {
  const analyzeSourceText = (
    symbolsCoordinatorExports as unknown as {
      analyzeSourceText?: (
        filePath: string,
        content: string,
        options: {
          providers: Array<{
            id: string;
            supportsFile: (filePath: string) => boolean;
            analyzeText: (
              filePath: string,
              content: string,
            ) => {
              sourceFile: string;
              providerId: string;
              language: string;
              module: {
                title: string;
                language: string;
                analysisMode: string;
              };
              symbols: Array<{
                name: string;
                kind: string;
                startLine: number;
                startColumn: number;
                endLine: number;
                endColumn: number;
                directiveText: string;
              }>;
            };
          }>;
        },
      ) => {
        providerId: string | null;
        module: { analysisMode: string };
        symbols: Array<{ name: string; kind: string; startLine: number }>;
      };
    }
  ).analyzeSourceText;

  const analysis = analyzeSourceText?.(
    "src/feature.ts",
    "export function parsedSymbol() {}\n",
    {
      providers: [
        {
          id: "stub-provider",
          supportsFile(filePath: string) {
            return filePath.endsWith(".ts");
          },
          analyzeText(filePath: string, content: string) {
            return {
              sourceFile: filePath,
              providerId: "stub-provider",
              language: "typescript",
              module: {
                title: "feature",
                language: "typescript",
                analysisMode: "parser",
              },
              symbols: [
                {
                  name: "parsedSymbol",
                  kind: "function",
                  startLine: 1,
                  startColumn: 16,
                  endLine: 1,
                  endColumn: content.length - 1,
                  directiveText: content,
                },
              ],
            };
          },
        },
      ],
    },
  );

  expect(typeof analyzeSourceText).toBe("function");
  if (!analysis) {
    throw new Error("Expected parser-backed analysis result");
  }
  const actualAnalysis = analysis;
  expect(actualAnalysis.providerId).toBe("stub-provider");
  expect(actualAnalysis.module.analysisMode).toBe("parser");
  expect(actualAnalysis.symbols).toEqual([
    expect.objectContaining({
      name: "parsedSymbol",
      kind: "function",
      startLine: 1,
    }),
  ]);
});

it("falls back to module evidence for unsupported languages", () => {
  const analyzeSourceText = (
    symbolsCoordinatorExports as unknown as {
      analyzeSourceText?: (
        filePath: string,
        content: string,
      ) => {
        providerId: string | null;
        language: string;
        symbols: unknown[];
        module: {
          title: string;
          language: string;
          analysisMode: string;
          fallbackReason?: string;
        };
      };
    }
  ).analyzeSourceText;

  const analysis = analyzeSourceText?.(
    "src/app.py",
    "def main():\n    return True\n",
  );

  expect(typeof analyzeSourceText).toBe("function");
  if (!analysis) {
    throw new Error("Expected fallback analysis result");
  }
  const actualAnalysis = analysis;
  expect(actualAnalysis.providerId).toBeNull();
  expect(actualAnalysis.symbols).toEqual([]);
  expect(actualAnalysis.language).toBe("python");
  expect(actualAnalysis.module).toMatchObject({
    title: "app",
    language: "python",
    analysisMode: "fallback",
    fallbackReason: "unsupported_language",
  });
});

it("delegates TS/JS files to ts-morph exporter (ts and js) and resolves absolute/relative paths", async () => {
  tsEnrichStub = async (entries) =>
    entries.map((entry, index) => ({
      ...entry,
      sourceLine: 10 + index,
      sourceColumn: 1,
      sourceEndLine: 10 + index,
      sourceEndColumn: 5,
      coordinatesGeneratedAt: new Date().toISOString(),
    }));

  const tsPath = writeFile("a.ts", "export function foo() {}\n");
  const jsPath = writeFile("b.js", "export function bar() {}\n");

  const entries: ManifestSymbolEntry[] = [
    { id: "e1", title: "foo", sourceFile: path.basename(tsPath) },
    { id: "e2", title: "bar", sourceFile: jsPath },
  ];

  const out = await runEnrichment(entries, tmpDir);

  expect(out).toHaveLength(2);
  expect(out[0]?.sourceLine).toBe(10);
  expect(out[1]?.sourceLine).toBe(11);
});

it("uses regex heuristic for non-TS files and returns original when no match", async () => {
  const mdPath = writeFile(
    "doc.md",
    "first line\nmySymbol here and more\nlast\n",
  );
  const noMatchPath = writeFile("other.txt", "nothing to see here\n");

  const entries: ManifestSymbolEntry[] = [
    { id: "r1", title: "mySymbol", sourceFile: path.basename(mdPath) },
    { id: "r2", title: "absent", sourceFile: path.basename(noMatchPath) },
  ];

  const out = await runEnrichment(entries, tmpDir);

  expect(out[0]?.sourceLine).toBe(2);
  expect(out[0]?.sourceColumn).toBeGreaterThanOrEqual(0);
  expect(out[1]?.sourceLine).toBeUndefined();
});

it("returns original entry when source path cannot be resolved", async () => {
  const missing = `no-such-protected-${Date.now()}.txt`;
  const entries: ManifestSymbolEntry[] = [
    { id: "w1", title: "myX", sourceFile: missing },
  ];

  const out = await runEnrichment(entries, tmpDir);

  expect(out[0]?.sourceLine).toBeUndefined();
});

it("handles nonexistent sourceFile and returns original", async () => {
  const entries: ManifestSymbolEntry[] = [
    { id: "n1", title: "nope", sourceFile: "no/such/path.txt" },
  ];

  const out = await runEnrichment(entries, tmpDir);

  expect(out[0]?.sourceLine).toBeUndefined();
});

it("properly escapes regex metacharacters in title when searching", async () => {
  const trickyName = "funny(name).*+?^${}[]|\\";
  const content =
    "line1\nthis has funny(name).*+?^${}[]|\\inside the middle\nend";
  const textPath = writeFile("tricky.txt", content);

  const entries: ManifestSymbolEntry[] = [
    { id: "t1", title: trickyName, sourceFile: path.basename(textPath) },
  ];

  const out = await runEnrichment(entries, tmpDir);

  expect(out[0]?.sourceLine).toBe(2);
});

it("mixes multiple symbols with different file types", async () => {
  tsEnrichStub = async (entries) =>
    entries.map((entry, index) => ({
      ...entry,
      sourceLine: 100 + index,
      sourceColumn: 0,
      sourceEndLine: 100 + index,
      sourceEndColumn: 3,
      coordinatesGeneratedAt: new Date().toISOString(),
    }));

  const tsPath = writeFile("mix.ts", "export function a() {}\n");
  const mdPath = writeFile("mix.md", "alpha\nbeta\nGammaSymbol is here\n");

  const entries: ManifestSymbolEntry[] = [
    { id: "m1", title: "a", sourceFile: path.basename(tsPath) },
    { id: "m2", title: "GammaSymbol", sourceFile: path.basename(mdPath) },
  ];

  const out = await runEnrichment(entries, tmpDir);

  expect(out[0]?.sourceLine).toBe(100);
  expect(out[1]?.sourceLine).toBe(3);
});
