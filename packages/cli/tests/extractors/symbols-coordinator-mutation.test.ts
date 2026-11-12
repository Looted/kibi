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

import {
  afterEach,
  describe,
  expect,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type ManifestSymbolEntry,
  type SourceAnalysisProvider,
  type SourceAnalysisResult,
  analyzeSourceText,
  analyzeSourceTextWithRegistry,
  enrichSymbolCoordinates,
} from "../../src/extractors/symbols-coordinator.js";
import type { CapabilityRegistry } from "../../src/plugins/registry.js";
import type { SourceAnalysisService } from "../../src/plugins/source-analysis-service.js";

type V2 = Awaited<ReturnType<SourceAnalysisService["analyzeTextV2"]>>;
type Span = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function workspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-coordinator-mutation-"));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

function warnings(): unknown[][] {
  const spy = spyOn(console, "warn").mockImplementation(() => {});
  cleanups.push(() => spy.mockRestore());
  return spy.mock.calls;
}

function symbol(name: string, startLine: number, endLine = startLine) {
  return {
    name,
    qualifiedName: name,
    kind: "function" as const,
    startLine,
    startColumn: 4,
    endLine,
    endColumn: 9,
  };
}

function analysis(patch: Record<string, unknown> = {}): V2 {
  return {
    status: "ok",
    language: "python",
    providerId: "kibi-plugin-treesitter.tree-sitter.v2",
    stamp: { pluginId: "kibi-plugin-treesitter" },
    module: { title: "m", language: "python", analysisMode: "parser" },
    symbols: [symbol("run", 2, 3)],
    diagnostics: [],
    uncoveredRanges: [],
    ...patch,
  } as unknown as V2;
}

function fakeService(result: V2 | ((file: string) => V2)) {
  const calls: Array<[string, string]> = [];
  const service = {
    analyzeTextV2: async (file: string, content: string) => {
      calls.push([file, content]);
      return typeof result === "function" ? result(file) : result;
    },
  } as unknown as SourceAnalysisService;
  return { calls, service };
}

const noTs = async () => {
  throw new Error("no TypeScript expected");
};

async function enrich(
  entries: ManifestSymbolEntry[],
  root: string,
  result: V2 | ((file: string) => V2),
  allow?: boolean,
) {
  const { service, calls } = fakeService(result);
  const output = await enrichSymbolCoordinates(entries, root, {
    sourceAnalysisService: service,
    enrichTsCoordinates: noTs,
    ...(allow === undefined ? {} : { allowPythonDecoratorCoordinates: allow }),
  });
  return { output, calls };
}

const placed = (entry: ManifestSymbolEntry, s: Span) => ({
  ...entry,
  sourceLine: s.startLine,
  sourceColumn: s.startColumn,
  sourceEndLine: s.endLine,
  sourceEndColumn: s.endColumn,
});

describe("analyzeSourceText (sync)", () => {
  const result = (file: string): SourceAnalysisResult => ({
    sourceFile: file,
    language: "x",
    providerId: "p",
    module: { title: "t", language: "x", analysisMode: "parser" },
    symbols: [],
  });

  test("uses the first provider that supports the file", () => {
    const seen: string[] = [];
    const providers: SourceAnalysisProvider[] = [
      {
        id: "a",
        supportsFile: (file) => {
          seen.push(`a:${file}`);
          return false;
        },
        analyzeText: () => {
          throw new Error("a");
        },
      },
      {
        id: "b",
        supportsFile: (file) => {
          seen.push(`b:${file}`);
          return true;
        },
        analyzeText: (file) => result(file),
      },
      {
        id: "c",
        supportsFile: () => true,
        analyzeText: () => {
          throw new Error("c");
        },
      },
    ];
    expect(analyzeSourceText("src/x.rb", "", { providers })).toStrictEqual(
      result("src/x.rb"),
    );
    expect(seen).toStrictEqual(["a:src/x.rb", "b:src/x.rb"]);
  });

  test("falls back on provider errors and unsupported files", () => {
    const failing: SourceAnalysisProvider[] = [
      {
        id: "a",
        supportsFile: () => true,
        analyzeText: () => {
          throw new Error("boom");
        },
      },
    ];
    expect(
      analyzeSourceText("lib/tool.py", "x", { providers: failing }),
    ).toStrictEqual({
      sourceFile: "lib/tool.py",
      language: "python",
      providerId: null,
      module: {
        title: "tool",
        language: "python",
        analysisMode: "fallback",
        fallbackReason: "provider_error",
      },
      symbols: [],
    });
    expect(analyzeSourceText("lib/.env", "x", { providers: [] })).toStrictEqual(
      {
        sourceFile: "lib/.env",
        language: "unknown",
        providerId: null,
        module: {
          title: ".env",
          language: "unknown",
          analysisMode: "fallback",
          fallbackReason: "unsupported_language",
        },
        symbols: [],
      },
    );
    expect(
      analyzeSourceText("a.b.go", "", { providers: [] }).module.title,
    ).toBe("a.b");
  });

  test("defaults to the TypeScript provider", () => {
    const analyzed = analyzeSourceText(
      "src/x.ts",
      "export function alpha() {}\n",
    );
    expect(analyzed.providerId).not.toBe(null);
    expect(analyzed.symbols.map((entry) => entry.name)).toStrictEqual([
      "alpha",
    ]);
    expect(
      analyzeSourceText("src/x.py", "def a(): pass\n").module.fallbackReason,
    ).toBe("unsupported_language");
    expect(analyzeSourceText("src/x.ts", "", {}).module.analysisMode).toBe(
      "parser",
    );
  });
});

describe("analyzeSourceTextWithRegistry", () => {
  const registry = (analyze: () => unknown) =>
    ({
      resolveSymbolExtractors: async () => ({
        builtin: {
          pluginId: "builtin",
          capability: { id: "fake.extractor", supports: () => true, analyze },
          stamp: { pluginId: "builtin" },
        },
        replace: null,
        augment: [],
        shadow: [],
      }),
    }) as unknown as CapabilityRegistry;

  test("maps the host result and drops empty optional fields", async () => {
    const base = {
      sourceFile: "src/x.rb",
      language: "ruby",
      module: { title: "x", language: "ruby", analysisMode: "parser" },
      symbols: [
        {
          name: "a",
          kind: "function",
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 3,
          directiveText: "d",
        },
        {
          name: "b",
          kind: "class",
          startLine: 2,
          startColumn: 1,
          endLine: 3,
          endColumn: 4,
          directiveText: "",
        },
      ],
    };
    expect(
      await analyzeSourceTextWithRegistry(
        "src/x.rb",
        "",
        registry(() => base),
      ),
    ).toStrictEqual({
      sourceFile: "src/x.rb",
      language: "ruby",
      providerId: "fake.extractor",
      module: { title: "x", language: "ruby", analysisMode: "parser" },
      symbols: [
        {
          name: "a",
          kind: "function",
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 3,
        },
        {
          name: "b",
          kind: "class",
          startLine: 2,
          startColumn: 1,
          endLine: 3,
          endColumn: 4,
        },
      ],
    });
    const fallback = await analyzeSourceTextWithRegistry(
      "src/x.rb",
      "",
      registry(() => ({
        ...base,
        symbols: [],
        module: {
          ...base.module,
          analysisMode: "fallback",
          fallbackReason: "why",
        },
      })),
    );
    expect(fallback.module).toStrictEqual({
      title: "x",
      language: "ruby",
      analysisMode: "fallback",
      fallbackReason: "why",
    });
  });

  test("falls back to the sync analysis when the registry fails", async () => {
    const broken = {
      resolveSymbolExtractors: async () => {
        throw new Error("registry down");
      },
    } as unknown as CapabilityRegistry;
    expect(
      await analyzeSourceTextWithRegistry("lib/tool.py", "", broken),
    ).toStrictEqual(analyzeSourceText("lib/tool.py", ""));
  });
});

describe("enrichSymbolCoordinates paths", () => {
  test("reports unreadable sources and strips generated fields", async () => {
    const root = workspace({ "dir/inner.txt": "", "m.py": "" });
    const generated = {
      sourceLine: 1,
      sourceColumn: 1,
      sourceEndLine: 1,
      sourceEndColumn: 1,
      coordinatesGeneratedAt: "x",
      coordinateRefreshFailure: "old",
    };
    const entries: ManifestSymbolEntry[] = [
      { id: "S1", title: "a", ...generated },
      { id: "S2", title: "a", sourceFile: "", ...generated },
      { id: "S3", title: "a", sourceFile: "gone.py" },
      { id: "S4", title: "a", sourceFile: "../outside.py" },
      { id: "S5", title: "a", sourceFile: "dir" },
    ];
    const { output, calls } = await enrich(entries, root, analysis());
    expect(output).toStrictEqual([
      { id: "S1", title: "a" },
      { id: "S2", title: "a", sourceFile: "" },
      {
        id: "S3",
        title: "a",
        sourceFile: "gone.py",
        coordinateRefreshFailure: "gone.py does not exist",
      },
      {
        id: "S4",
        title: "a",
        sourceFile: "../outside.py",
        coordinateRefreshFailure:
          "../outside.py is not a file path inside the workspace",
      },
      {
        id: "S5",
        title: "a",
        sourceFile: "dir",
        coordinateRefreshFailure: "dir is not a regular file",
      },
    ]);
    expect(calls).toStrictEqual([]);
  });

  test("delegates TypeScript entries in order and keeps unmatched ones", async () => {
    const root = workspace({
      "a.ts": "",
      "b.js": "",
      "c.py": "def run(): pass\n",
    });
    const seen: ManifestSymbolEntry[][] = [];
    const entries: ManifestSymbolEntry[] = [
      { id: "T1", title: "x", sourceFile: "a.ts" },
      { id: "P1", title: "run", sourceFile: "c.py" },
      { id: "T2", title: "y", sourceFile: "b.js", sourceLine: 9 },
    ];
    const { service } = fakeService(analysis());
    const output = await enrichSymbolCoordinates(entries, root, {
      sourceAnalysisService: service,
      enrichTsCoordinates: async (tsEntries, workspaceRoot) => {
        seen.push(tsEntries);
        expect(workspaceRoot).toBe(root);
        return [{ ...(tsEntries[0] as ManifestSymbolEntry), sourceLine: 7 }];
      },
    });
    expect(seen).toStrictEqual([
      [
        { id: "T1", title: "x", sourceFile: "a.ts" },
        { id: "T2", title: "y", sourceFile: "b.js" },
      ],
    ]);
    expect(output).toStrictEqual([
      { id: "T1", title: "x", sourceFile: "a.ts", sourceLine: 7 },
      placed(
        { id: "P1", title: "run", sourceFile: "c.py" },
        symbol("run", 2, 3),
      ),
      { id: "T2", title: "y", sourceFile: "b.js" },
    ]);
  });

  test("skips the TypeScript enricher without TypeScript entries", async () => {
    const root = workspace({ "c.py": "" });
    const { output } = await enrich(
      [{ id: "P", title: "run", sourceFile: "c.py" }],
      root,
      analysis(),
    );
    expect(output[0]?.sourceLine).toBe(2);
    expect(
      await enrichSymbolCoordinates([], root, { enrichTsCoordinates: noTs }),
    ).toStrictEqual([]);
  });

  test("analyses each file once with its workspace-relative path", async () => {
    const root = workspace({ "pkg/c.py": "body", "d.py": "other" });
    const warn = warnings();
    const failed = analysis({
      status: "failed",
      diagnostics: [{ code: "E", message: "bad" }],
    });
    const { output, calls } = await enrich(
      [
        { id: "A", title: "run", sourceFile: "pkg/c.py" },
        { id: "B", title: "run", sourceFile: "./pkg/c.py" },
        { id: "C", title: "run", sourceFile: "d.py" },
      ],
      root,
      failed,
    );
    expect(calls).toStrictEqual([
      ["pkg/c.py", "body"],
      ["d.py", "other"],
    ]);
    const reason =
      "Cannot refresh incomplete source analysis for pkg/c.py: E: bad";
    const other = "Cannot refresh incomplete source analysis for d.py: E: bad";
    expect(output.map((entry) => entry.coordinateRefreshFailure)).toStrictEqual(
      [reason, reason, other],
    );
    expect(warn).toStrictEqual([[`[kibi] ${reason}`], [`[kibi] ${other}`]]);
  });

  test("uses the maintenance service and ts-morph by default", async () => {
    const root = workspace({
      "a.ts": "export function alpha() {}\n",
      "notes.txt": "see alpha here\n",
    });
    warnings();
    const output = await enrichSymbolCoordinates(
      [
        { id: "T", title: "alpha", sourceFile: "a.ts" },
        { id: "N", title: "alpha", sourceFile: "notes.txt" },
      ],
      root,
    );
    expect(output[0]?.sourceLine).toBe(1);
    expect(output[1]?.sourceLine).toBe(1);
    expect(output[1]?.sourceColumn).toBe(4);
    const viaOverload = await analyzeSourceText(
      [{ id: "T", title: "alpha", sourceFile: "a.ts" }],
      root,
    );
    expect(viaOverload[0]?.sourceLine).toBe(1);
  });
});

describe("enrichSymbolCoordinates analysis states", () => {
  const entry = { id: "S", title: "run", sourceFile: "m.py" };

  test("describes diagnostics with lines, once per distinct text", async () => {
    const root = workspace({ "m.py": "" });
    const warn = warnings();
    const { output } = await enrich(
      [entry],
      root,
      analysis({
        status: "partial",
        diagnostics: [
          {
            code: "TREESITTER_SYNTAX_ERROR",
            message: "bad",
            range: { startLine: 3 },
          },
          {
            code: "TREESITTER_SYNTAX_ERROR",
            message: "bad",
            range: { startLine: 3 },
          },
          { code: "OTHER", message: "worse" },
        ],
        uncoveredRanges: [
          {
            startLine: 3,
            startColumn: 0,
            endLine: 3,
            endColumn: 1,
            reason: "syntax",
          },
        ],
      }),
    );
    const reason =
      "Cannot refresh incomplete source analysis for m.py: TREESITTER_SYNTAX_ERROR (line 3): bad; OTHER: worse";
    expect(output).toStrictEqual([
      { ...entry, coordinateRefreshFailure: reason },
    ]);
    expect(warn).toStrictEqual([[`[kibi] ${reason}`]]);
  });

  test("blocks partial analyses without local ranges or with a limit", async () => {
    const root = workspace({ "m.py": "" });
    warnings();
    for (const patch of [
      { diagnostics: [{ code: "MACRO", message: "m" }], uncoveredRanges: [] },
      {
        diagnostics: [{ code: "TREESITTER_SYMBOL_LIMIT", message: "m" }],
        uncoveredRanges: [
          {
            startLine: 9,
            startColumn: 0,
            endLine: 9,
            endColumn: 1,
            reason: "macro",
          },
        ],
      },
      {
        diagnostics: [{ code: "symbol_limit", message: "m" }],
        uncoveredRanges: [
          {
            startLine: 9,
            startColumn: 0,
            endLine: 9,
            endColumn: 1,
            reason: "macro",
          },
        ],
      },
    ]) {
      const { output } = await enrich(
        [entry],
        root,
        analysis({ status: "partial", ...patch }),
      );
      expect([patch, output[0]?.coordinateRefreshFailure]).toStrictEqual([
        patch,
        `Cannot refresh incomplete source analysis for m.py: ${patch.diagnostics[0]?.code}: m`,
      ]);
    }
  });

  test("a limit among other codes blocks the file", async () => {
    const root = workspace({ "m.py": "" });
    warnings();
    const { output } = await enrich(
      [entry],
      root,
      analysis({
        status: "partial",
        diagnostics: [
          { code: "MACRO", message: "m" },
          { code: "X_LIMIT", message: "n" },
        ],
        uncoveredRanges: [
          {
            startLine: 9,
            startColumn: 0,
            endLine: 9,
            endColumn: 1,
            reason: "macro",
          },
        ],
      }),
    );
    expect(output[0]?.coordinateRefreshFailure).toBe(
      "Cannot refresh incomplete source analysis for m.py: MACRO: m; X_LIMIT: n",
    );
  });

  test("ignores uncovered ranges of a complete analysis", async () => {
    const root = workspace({ "m.py": "" });
    const warn = warnings();
    const { output } = await enrich(
      [entry],
      root,
      analysis({
        diagnostics: [{ code: "MACRO", message: "m" }],
        uncoveredRanges: [
          {
            startLine: 1,
            startColumn: 0,
            endLine: 5,
            endColumn: 1,
            reason: "macro",
          },
        ],
      }),
      true,
    );
    expect(output[0]?.sourceLine).toBe(2);
    expect(warn).toStrictEqual([]);
  });

  test("drops only symbols declared inside local gaps", async () => {
    const root = workspace({ "m.py": "" });
    const warn = warnings();
    const symbols = [
      symbol("before", 1),
      symbol("first", 2),
      symbol("last", 4),
      symbol("after", 5),
      symbol("single", 7),
    ];
    const partial = analysis({
      status: "partial",
      symbols,
      diagnostics: [{ code: "MACRO", message: "a macro" }],
      uncoveredRanges: [
        {
          startLine: 2,
          startColumn: 0,
          endLine: 4,
          endColumn: 1,
          reason: "macro",
        },
        {
          startLine: 7,
          startColumn: 0,
          endLine: 7,
          endColumn: 1,
          reason: "macro",
        },
      ],
    });
    const names = ["before", "first", "last", "after", "single"];
    const { output } = await enrich(
      names.map((name) => ({ id: name, title: name, sourceFile: "m.py" })),
      root,
      partial,
    );
    expect(
      output.map((item) => item.sourceLine ?? item.coordinateRefreshFailure),
    ).toStrictEqual([
      1,
      "'first' is declared in a part of m.py the source analysis could not read",
      "'last' is declared in a part of m.py the source analysis could not read",
      5,
      "'single' is declared in a part of m.py the source analysis could not read",
    ]);
    expect(warn).toStrictEqual([
      [
        "[kibi] m.py: source analysis is partial; symbols declared on lines 2-4, line 7 keep no coordinates (MACRO: a macro)",
      ],
    ]);
  });

  test("reports a title match failure", async () => {
    const root = workspace({ "m.py": "" });
    const { output } = await enrich(
      [{ ...entry, title: "nope" }],
      root,
      analysis(),
    );
    expect(output).toStrictEqual([
      {
        ...entry,
        title: "nope",
        coordinateRefreshFailure:
          "no declaration titled 'nope' found in m.py (declarations there: run)",
      },
    ]);
  });
});

describe("enrichSymbolCoordinates unsupported files", () => {
  const unsupported = (diagnostics: unknown[]) =>
    analysis({ status: "unsupported", symbols: [], diagnostics });

  test("places by text match and stamps the time", async () => {
    setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
    cleanups.push(() => setSystemTime());
    const root = workspace({ "n.txt": "xrun\r\n  call run(1)\nrun" });
    const warn = warnings();
    const fileLevel = {
      code: "source_file_level_only",
      message: "File level only.",
    };
    const entries = [
      { id: "A", title: "run", sourceFile: "n.txt" },
      { id: "B", title: "run", sourceFile: "n.txt" },
    ];
    const { output } = await enrich(entries, root, unsupported([fileLevel]));
    const expected = {
      sourceLine: 2,
      sourceColumn: 7,
      sourceEndLine: 2,
      sourceEndColumn: 10,
      coordinatesGeneratedAt: "2026-01-02T03:04:05.000Z",
    };
    expect(output).toStrictEqual([
      { ...entries[0], ...expected },
      { ...entries[1], ...expected },
    ]);
    expect(warn).toStrictEqual([
      [
        "[kibi] n.txt: symbol coordinates are approximate (placed by text match). File level only.",
      ],
    ]);
  });

  test("escapes the title and explains a missing match", async () => {
    const root = workspace({ "n.txt": "axb\n" });
    const warn = warnings();
    const pack = {
      code: "TREESITTER_LANGUAGE_PACK_MISSING",
      message: "Install the pack.",
    };
    const fileLevel = {
      code: "source_file_level_only",
      message: "File level only.",
    };
    const entry = { id: "A", title: "a.b", sourceFile: "n.txt" };
    const withPack = await enrich(
      [entry],
      root,
      unsupported([fileLevel, pack]),
    );
    expect(withPack.output).toStrictEqual([
      {
        ...entry,
        coordinateRefreshFailure:
          "no text match for 'a.b' in n.txt, which has no parser-backed declarations (Install the pack.)",
      },
    ]);
    expect(warn).toStrictEqual([
      [
        "[kibi] n.txt: symbol coordinates are approximate until its grammar pack is installed. Install the pack.",
      ],
    ]);
    warn.length = 0;
    const bare = await enrich(
      [entry],
      root,
      unsupported([{ code: "OTHER", message: "x" }]),
    );
    expect(bare.output[0]?.coordinateRefreshFailure).toBe(
      "no text match for 'a.b' in n.txt, which has no parser-backed declarations (no symbol extractor reads this file type)",
    );
    const levelOnly = await enrich([entry], root, unsupported([fileLevel]));
    expect(levelOnly.output[0]?.coordinateRefreshFailure).toBe(
      "no text match for 'a.b' in n.txt, which has no parser-backed declarations (File level only.)",
    );
    expect(warn).toStrictEqual([
      [
        "[kibi] n.txt: symbol coordinates are approximate (placed by text match). File level only.",
      ],
    ]);
  });

  test("splits lines on a bare newline and never reads past the end", async () => {
    const root = workspace({ "n.txt": "xrun\n  call run(1)\nab a.b" });
    warnings();
    const { output } = await enrich(
      [
        { id: "A", title: "run", sourceFile: "n.txt" },
        { id: "B", title: "undefined", sourceFile: "n.txt" },
        { id: "C", title: "a.b", sourceFile: "n.txt" },
      ],
      root,
      unsupported([]),
    );
    expect(
      output.map((item) => [
        item.sourceLine,
        item.sourceColumn,
        item.sourceEndColumn,
      ]),
    ).toStrictEqual([
      [2, 7, 10],
      [undefined, undefined, undefined],
      [3, 3, 6],
    ]);
  });

  test("warns and keeps the entry when the heuristic fails", async () => {
    const root = workspace({ "n.txt": "x\n" });
    const warn = warnings();
    const { output } = await enrich(
      [{ id: "A", sourceFile: "n.txt" } as ManifestSymbolEntry],
      root,
      unsupported([]),
    );
    expect(output as unknown[]).toStrictEqual([
      {
        id: "A",
        sourceFile: "n.txt",
        coordinateRefreshFailure:
          "no text match for 'undefined' in n.txt, which has no parser-backed declarations (no symbol extractor reads this file type)",
      },
    ]);
    expect(warn).toHaveLength(1);
    expect(
      String(warn[0]?.[0]).startsWith(
        "[kibi] Failed regex coordinate heuristic for A: ",
      ),
    ).toBe(true);
    expect(String(warn[0]?.[0]).length).toBeGreaterThan(
      "[kibi] Failed regex coordinate heuristic for A: ".length,
    );
  });
});

describe("coordinate-only decorator refresh", () => {
  const span = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 8 };
  const REASON = "decorator-may-alter-or-create-declarations";
  const CODE = "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE";
  const decorated = (patch: Record<string, unknown> = {}) =>
    analysis({
      status: "partial",
      diagnostics: [
        { code: CODE, message: "Decorators may alter.", range: span },
      ],
      uncoveredRanges: [{ ...span, reason: REASON }],
      ...patch,
    });
  const entry = { id: "S", title: "run", sourceFile: "m.py" };

  async function line(result: V2, allow = true) {
    const root = workspace({ "m.py": "" });
    const { output } = await enrich([entry], root, result, allow);
    return output[0]?.sourceLine;
  }

  test("places decorated symbols and warns once", async () => {
    const root = workspace({ "m.py": "" });
    const warn = warnings();
    const { output } = await enrich(
      [entry, { ...entry, id: "T" }],
      root,
      decorated(),
      true,
    );
    expect(output.map((item) => item.sourceLine)).toStrictEqual([2, 2]);
    expect(warn).toStrictEqual([
      [
        "[kibi] Coordinate-only refresh for m.py; source analysis remains partial: Decorators may alter.",
      ],
    ]);
  });

  test("accepts several decorator ranges and lists every message", async () => {
    const root = workspace({ "m.py": "" });
    const warn = warnings();
    const moved = { startLine: 5, startColumn: 0, endLine: 6, endColumn: 2 };
    const { output } = await enrich(
      [entry],
      root,
      decorated({
        diagnostics: [
          { code: CODE, message: "first", range: span },
          { code: CODE, message: "second", range: moved },
        ],
        uncoveredRanges: [
          { ...span, reason: REASON },
          { ...moved, reason: REASON },
        ],
      }),
      true,
    );
    expect(output[0]?.sourceLine).toBe(2);
    expect(warn).toStrictEqual([
      [
        "[kibi] Coordinate-only refresh for m.py; source analysis remains partial: first; second",
      ],
    ]);
  });

  test("only a partial analysis is a coordinate-only refresh", async () => {
    const root = workspace({ "m.py": "" });
    const warn = warnings();
    const { output } = await enrich(
      [entry],
      root,
      decorated({ status: "ok" }),
      true,
    );
    expect(output[0]?.sourceLine).toBe(2);
    expect(warn).toStrictEqual([]);
    const unsupportedRoot = workspace({ "m.py": "run\n" });
    const unsupported = await enrich(
      [entry],
      unsupportedRoot,
      decorated({ status: "unsupported" }),
      true,
    );
    expect(unsupported.output[0]?.sourceLine).toBe(1);
    expect(warn).toStrictEqual([]);
  });

  test("needs the explicit opt-in", async () => {
    warnings();
    expect(await line(decorated(), false)).toBe(undefined);
    const root = workspace({ "m.py": "" });
    const { output } = await enrich([entry], root, decorated());
    expect(output[0]?.sourceLine).toBe(undefined);
  });

  test("rejects every other analysis shape", async () => {
    warnings();
    const other = { startLine: 1, startColumn: 1, endLine: 3, endColumn: 8 };
    const cases: Array<[string, Record<string, unknown>]> = [
      ["language", { language: "ruby" }],
      [
        "mode",
        {
          module: { title: "m", language: "python", analysisMode: "fallback" },
        },
      ],
      ["provider", { providerId: "other" }],
      ["stamp", { stamp: { pluginId: "other" } }],
      ["no stamp", { stamp: null }],
      ["code", { diagnostics: [{ code: "MACRO", message: "m", range: span }] }],
      ["reason", { uncoveredRanges: [{ ...span, reason: "macro" }] }],
      [
        "count",
        {
          uncoveredRanges: [
            { ...span, reason: REASON },
            { ...span, reason: REASON },
          ],
        },
      ],
    ];
    for (const key of [
      "startLine",
      "startColumn",
      "endLine",
      "endColumn",
    ] as const) {
      const moved = { ...span, [key]: span[key] + 1 };
      cases.push([
        `diagnostic ${key}`,
        {
          diagnostics: [
            { code: CODE, message: "a", range: span },
            { code: CODE, message: "b", range: moved },
          ],
          uncoveredRanges: [
            { ...span, reason: REASON },
            { ...span, reason: REASON },
          ],
        },
      ]);
      cases.push([
        `uncovered ${key}`,
        {
          diagnostics: [
            { code: CODE, message: "a", range: span },
            { code: CODE, message: "b", range: span },
          ],
          uncoveredRanges: [
            { ...span, reason: REASON },
            { ...moved, reason: REASON },
          ],
        },
      ]);
    }
    cases.push([
      "second reason",
      {
        diagnostics: [
          { code: CODE, message: "a", range: span },
          { code: CODE, message: "b", range: span },
        ],
        uncoveredRanges: [
          { ...span, reason: REASON },
          { ...span, reason: "macro" },
        ],
      },
    ]);
    for (const [label, patch] of cases) {
      expect([label, await line(decorated(patch))]).toStrictEqual([
        label,
        undefined,
      ]);
    }
  });

  test("an empty or rangeless decorator report is not coordinate-only", async () => {
    warnings();
    expect(
      await line(decorated({ diagnostics: [], uncoveredRanges: [] })),
    ).toBe(undefined);
    expect(
      await line(decorated({ diagnostics: [{ code: CODE, message: "m" }] })),
    ).toBe(undefined);
    expect(
      await line(
        decorated({ status: "ok", diagnostics: [], uncoveredRanges: [] }),
      ),
    ).toBe(2);
  });
});
