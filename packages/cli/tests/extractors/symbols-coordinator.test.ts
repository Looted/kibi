import { afterEach, beforeEach, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import * as symbolsCoordinatorExports from "../../src/extractors/symbols-coordinator.js";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinates,
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
      fs.rmSync(path.join(tmpDir, fileName), { recursive: true, force: true });
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
      fs.rmSync(path.join(tmpDir, fileName), { recursive: true, force: true });
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

it("falls back when a matching source analysis provider throws", () => {
  const analyzeSourceText = (
    symbolsCoordinatorExports as {
      analyzeSourceText?: (
        filePath: string,
        content: string,
        options: {
          providers: Array<{
            id: string;
            supportsFile: (filePath: string) => boolean;
            analyzeText: (filePath: string, content: string) => never;
          }>;
        },
      ) => {
        providerId: string | null;
        language: string;
        sourceFile: string;
        module: {
          analysisMode: string;
          fallbackReason?: string;
          language: string;
          title: string;
        };
        symbols: unknown[];
      };
    }
  ).analyzeSourceText;

  const analysis = analyzeSourceText?.("src/broken.ts", "export const x = 1;", {
    providers: [
      {
        id: "throwing-provider",
        supportsFile(filePath: string) {
          return filePath.endsWith(".ts");
        },
        analyzeText() {
          throw new Error("parser failed");
        },
      },
    ],
  });

  expect(analysis).toEqual({
    providerId: null,
    module: {
      analysisMode: "fallback",
      fallbackReason: "provider_error",
      language: "typescript",
      title: "broken",
    },
    language: "typescript",
    sourceFile: "src/broken.ts",
    symbols: [],
  });
});

it("supports the legacy analyzeSourceText enrichment overload", async () => {
  const analyzeSourceText = (
    symbolsCoordinatorExports as {
      analyzeSourceText?: (
        entries: ManifestSymbolEntry[],
        workspaceRoot: string,
        deps: { enrichTsCoordinates: TsEnrichStub },
      ) => Promise<ManifestSymbolEntry[]>;
    }
  ).analyzeSourceText;
  const tsPath = writeFile("legacy.ts", "export function legacySymbol() {}\n");
  const entries: ManifestSymbolEntry[] = [
    { id: "legacy", title: "legacySymbol", sourceFile: path.basename(tsPath) },
  ];

  const out = await analyzeSourceText?.(entries, tmpDir, {
    enrichTsCoordinates: async (inputEntries) =>
      inputEntries.map((entry) => ({
        ...entry,
        sourceLine: 44,
        sourceColumn: 0,
        sourceEndLine: 44,
        sourceEndColumn: 12,
        coordinatesGeneratedAt: "2026-01-01T00:00:00.000Z",
      })),
  });

  expect(out).toEqual([
    expect.objectContaining({ id: "legacy", sourceLine: 44 }),
  ]);
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

it("returns original entry when regex heuristic cannot read a resolved path", async () => {
  const entries: ManifestSymbolEntry[] = [
    { id: "dir", title: "anything", sourceFile: "." },
  ];

  const out = await runEnrichment(entries, tmpDir);

  expect(out).toEqual(entries);
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
