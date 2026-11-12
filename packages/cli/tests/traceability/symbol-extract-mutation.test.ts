import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import * as manifest from "../../src/extractors/manifest.js";
import type { CapabilityRegistry } from "../../src/plugins/registry.js";
import * as analysisService from "../../src/plugins/source-analysis-service.js";
import type { StagedFile } from "../../src/traceability/git-staged.js";
import {
  type ExtractSymbolsOptions,
  type ExtractedSymbol,
  type ManifestLookup,
  createManifestLookupSentinelKey,
  extractSymbolsFromStagedFile,
  extractSymbolsFromStagedFileAsync,
  partialAnalysisSymbolsUsable,
} from "../../src/traceability/symbol-extract.js";

afterEach(() => {
  mock.restore();
});

type Analysis = NonNullable<
  ReturnType<NonNullable<ExtractSymbolsOptions["analyzeText"]>>
>;
type Symbol = Readonly<{
  name: string;
  kind?: string;
  startLine: number;
  endLine: number;
  qualifiedName?: string;
  directiveText?: string;
}>;

let sequence = 0;
/** A path no earlier call used, so the analysis cache never answers for it. */
function freshPath(name = "a.ts"): string {
  sequence += 1;
  return `src/n${sequence}/${name}`;
}

function sym(
  name: string,
  startLine: number,
  endLine: number,
  extra: Partial<Symbol> = {},
): Symbol {
  return { name, kind: "function", startLine, endLine, ...extra };
}

function analysis(symbols: Symbol[], extra: Record<string, unknown> = {}) {
  return {
    sourceFile: "x",
    language: "typescript",
    module: {},
    symbols: symbols.map((symbol) => ({
      startColumn: 0,
      endColumn: 1,
      ...symbol,
    })),
    ...extra,
  } as unknown as Analysis;
}

function staged(path: string, overrides: Partial<StagedFile> = {}): StagedFile {
  return {
    path,
    status: "A",
    hunkRanges: [],
    content: "x",
    ...overrides,
  };
}

function hashId(path: string, name: string): string {
  return createHash("sha256")
    .update(`${path}:${name}`)
    .digest("hex")
    .slice(0, 16);
}

function noManifests() {
  return spyOn(
    manifest,
    "readManifestWithCoordinateOverlay",
  ).mockImplementation((path) => {
    throw new Error(`no manifest at ${path}`);
  });
}

function extract(
  file: StagedFile,
  symbols: Symbol[],
  lookup?: ManifestLookup,
  extra: Record<string, unknown> = {},
) {
  return extractSymbolsFromStagedFile(file, lookup, {
    analyzeText: () => analysis(symbols, extra),
  });
}

describe("createManifestLookupSentinelKey", () => {
  test("prefixes the manifest path", () => {
    expect(createManifestLookupSentinelKey("src/symbols.yaml")).toBe(
      "__manifest__:src/symbols.yaml",
    );
  });
});

describe("symbol traceability", () => {
  test("uses a manifest lookup entry and keeps only traceability links", () => {
    const reader = noManifests();
    const path = freshPath();
    const lookup: ManifestLookup = new Map([
      [
        `${path}:run`,
        {
          id: "SYM-run",
          relationships: [
            { type: "implements", to: "REQ-1" },
            { type: "relates_to", to: "REQ-2" },
            { type: "covered_by", to: "TEST-1" },
            { type: "executable_for", to: "E-1" },
            { type: "implements", to: "1bad" },
            { type: "implements", to: "R-1_a" },
            { type: "implements", to: "REQ x" },
          ],
        },
      ],
      [`${path}:bare`, { id: "SYM-bare" }],
    ]);
    expect(
      extract(staged(path), [sym("run", 1, 2), sym("bare", 3, 4)], lookup),
    ).toStrictEqual([
      {
        id: "SYM-run",
        name: "run",
        kind: "function",
        role: "behavioral",
        location: { file: path, startLine: 1, endLine: 2 },
        hunkRanges: [],
        reqLinks: ["REQ-1", "R-1_a"],
        relationships: [
          { type: "implements", to: "REQ-1" },
          { type: "covered_by", to: "TEST-1" },
          { type: "executable_for", to: "E-1" },
          { type: "implements", to: "1bad" },
          { type: "implements", to: "R-1_a" },
          { type: "implements", to: "REQ x" },
        ],
      },
      {
        id: "SYM-bare",
        name: "bare",
        kind: "function",
        role: "behavioral",
        location: { file: path, startLine: 3, endLine: 4 },
        hunkRanges: [],
        reqLinks: [],
        relationships: [],
      },
    ]);
    expect(reader).not.toHaveBeenCalled();
  });

  test("a source comment never changes the manifest requirement links", () => {
    noManifests();
    const path = freshPath();
    const lookup: ManifestLookup = new Map([
      [
        `${path}:run`,
        { id: "S", relationships: [{ type: "implements", to: "REQ-m" }] },
      ],
    ]);
    const [symbol] = extract(
      staged(path),
      [sym("run", 1, 2, { directiveText: "// implements REQ-inline" })],
      lookup,
    );
    expect(symbol?.reqLinks).toStrictEqual(["REQ-m"]);
    expect(symbol?.relationships).toStrictEqual([
      { type: "implements", to: "REQ-m" },
    ]);
  });

  test("a loaded manifest sentinel stops the local manifest search", () => {
    const reader = noManifests();
    const path = freshPath();
    for (const sentinel of [
      ".kb/symbols.yaml",
      `${path.slice(0, -5)}/symbols.yml`,
    ]) {
      const lookup: ManifestLookup = new Map([
        [createManifestLookupSentinelKey(sentinel), { id: "unused" }],
      ]);
      expect(extract(staged(path), [sym("run", 1, 1)], lookup)).toStrictEqual([
        {
          id: hashId(path, "run"),
          name: "run",
          kind: "function",
          role: "behavioral",
          location: { file: path, startLine: 1, endLine: 1 },
          hunkRanges: [],
          reqLinks: [],
        },
      ]);
    }
    expect(reader).not.toHaveBeenCalled();
  });

  test("searches both local manifest names when no sentinel covers the file", () => {
    const reader = noManifests();
    const path = freshPath();
    const dir = path.slice(0, -5);
    const lookup: ManifestLookup = new Map([
      [createManifestLookupSentinelKey("other/symbols.yaml"), { id: "x" }],
    ]);
    expect(
      extract(staged(path), [sym("run", 1, 1)], lookup).map(
        (symbol) => symbol.id,
      ),
    ).toStrictEqual([hashId(path, "run")]);
    expect(reader.mock.calls).toStrictEqual([
      [`${dir}/symbols.yaml`],
      [`${dir}/symbols.yml`],
    ]);
  });

  test("a file at the repository root has no local manifest", () => {
    const reader = noManifests();
    const path = `root${sequence}.ts`;
    sequence += 1;
    expect(
      extract(staged(path), [sym("run", 1, 1)]).map((symbol) => symbol.id),
    ).toStrictEqual([hashId(path, "run")]);
    expect(reader).not.toHaveBeenCalled();
  });

  test("reads the identity and links of a titled local manifest record", () => {
    const path = freshPath();
    const dir = path.slice(0, -5);
    const reader = spyOn(
      manifest,
      "readManifestWithCoordinateOverlay",
    ).mockImplementation((manifestPath) => {
      if (manifestPath === `${dir}/symbols.yaml`) throw new Error("missing");
      return [
        { title: "other", id: "SYM-other" },
        { title: "run", id: 5 },
        {
          title: "run",
          id: "SYM-run",
          links: [
            "REQ-a",
            { type: "covered_by", target: "TEST-1" },
            { type: 1, target: "x" },
            { type: "implements" },
            { type: "implements", target: 2 },
            null,
          ],
          relationships: [
            { type: "implements", target: "REQ-b" },
            { type: "relates_to", target: "REQ-c" },
            { type: "implements" },
            { type: 3, target: "REQ-d" },
            null,
          ],
        },
      ] as never;
    });
    expect(extract(staged(path), [sym("run", 1, 1)])).toStrictEqual([
      {
        id: "SYM-run",
        name: "run",
        kind: "function",
        role: "behavioral",
        location: { file: path, startLine: 1, endLine: 1 },
        hunkRanges: [],
        reqLinks: ["REQ-a", "REQ-b"],
        relationships: [
          { type: "implements", to: "REQ-a" },
          { type: "covered_by", to: "TEST-1" },
          { type: "implements", to: "REQ-b" },
        ],
      },
    ]);
    expect(reader.mock.calls).toStrictEqual([
      [`${dir}/symbols.yaml`],
      [`${dir}/symbols.yml`],
    ]);
  });

  test("reads relationships from a record without links", () => {
    spyOn(manifest, "readManifestWithCoordinateOverlay").mockImplementation(
      () =>
        [
          {
            title: "run",
            id: "SYM-rel",
            relationships: [{ type: "implements", target: "REQ-r" }],
          },
        ] as never,
    );
    expect(
      extract(staged(freshPath()), [sym("run", 1, 1)]).map((symbol) => [
        symbol.id,
        symbol.relationships,
      ]),
    ).toStrictEqual([["SYM-rel", [{ type: "implements", to: "REQ-r" }]]]);
  });

  test("ignores manifest link fields that are not lists", () => {
    const path = freshPath();
    spyOn(manifest, "readManifestWithCoordinateOverlay").mockImplementation(
      () =>
        [
          { title: "run", id: "SYM-run", links: "REQ-a", relationships: {} },
        ] as never,
    );
    expect(
      extract(staged(path), [sym("run", 1, 1)]).map((symbol) => [
        symbol.id,
        symbol.relationships,
      ]),
    ).toStrictEqual([["SYM-run", []]]);
  });
});

describe("source comments", () => {
  test("an implements comment gives a symbol no requirement link", () => {
    noManifests();
    const directiveText = [
      "// implements REQ-1",
      "// IMPLEMENTS: REQ-2 , REQ-3,REQ-4",
      "implements A1, b-2",
    ].join("\n");
    const [symbol] = extract(staged(freshPath()), [
      sym("run", 1, 1, { directiveText }),
    ]);
    expect(symbol?.reqLinks).toStrictEqual([]);
  });
});

describe("analysis cache", () => {
  test("reuses an analysis for the same path and content within the TTL", () => {
    noManifests();
    const path = freshPath();
    let calls = 0;
    const analyzeText = (filePath: string, content: string) => {
      calls += 1;
      expect([filePath, content]).toStrictEqual([path, "x"]);
      return analysis([sym(`run${calls}`, 1, 1)]);
    };
    const now = spyOn(Date, "now").mockReturnValue(1_000_000);
    const names = () =>
      extractSymbolsFromStagedFile(staged(path), undefined, {
        analyzeText,
      }).map((symbol) => symbol.name);
    expect(names()).toStrictEqual(["run1"]);
    now.mockReturnValue(1_030_000);
    expect(names()).toStrictEqual(["run1"]);
    now.mockReturnValue(1_030_001);
    expect(names()).toStrictEqual(["run2"]);
    expect(
      extractSymbolsFromStagedFile(staged(path, { content: "y" }), undefined, {
        analyzeText: () => analysis([sym("other", 1, 1)]),
      }).map((symbol) => symbol.name),
    ).toStrictEqual(["other"]);
  });

  test("keeps builtin and injected analyses apart", () => {
    noManifests();
    const path = freshPath("a.py");
    expect(
      extractSymbolsFromStagedFile(staged(path), undefined, {
        analyzeText: () => analysis([sym("run", 1, 1)]),
      }).map((symbol) => symbol.name),
    ).toStrictEqual(["run"]);
    expect(extractSymbolsFromStagedFile(staged(path))).toStrictEqual([]);
  });

  test("analyzes empty content when the staged file has none", () => {
    noManifests();
    const path = freshPath();
    const seen: string[] = [];
    extractSymbolsFromStagedFile(
      { path, status: "A", hunkRanges: [] },
      undefined,
      {
        analyzeText: (_file, content) => {
          seen.push(content);
          return null;
        },
      },
    );
    expect(seen).toStrictEqual([""]);
  });

  test("retries a failed analysis once the TTL passes", () => {
    const path = freshPath();
    let calls = 0;
    const analyzeText = () => {
      calls += 1;
      throw new Error("boom");
    };
    const now = spyOn(Date, "now").mockReturnValue(2_000_000);
    extractSymbolsFromStagedFile(staged(path), undefined, { analyzeText });
    now.mockReturnValue(2_030_001);
    extractSymbolsFromStagedFile(staged(path), undefined, { analyzeText });
    expect(calls).toBe(2);
  });

  test("caches a failed analysis as no symbols", () => {
    const path = freshPath();
    let calls = 0;
    for (const thrown of [new Error("boom"), "boom"]) {
      const file = staged(path, { content: String(thrown) });
      const analyzeText = () => {
        calls += 1;
        throw thrown;
      };
      expect(
        extractSymbolsFromStagedFile(file, undefined, { analyzeText }),
      ).toStrictEqual([]);
      expect(
        extractSymbolsFromStagedFile(file, undefined, { analyzeText }),
      ).toStrictEqual([]);
    }
    expect(calls).toBe(2);
  });

  test("rejects an asynchronous analyzer", () => {
    const path = freshPath();
    const options = { analyzeText: async () => null };
    const message =
      "extractSymbolsFromStagedFile received async analyzeText; use extractSymbolsFromStagedFileAsync";
    expect(() =>
      extractSymbolsFromStagedFile(staged(path), undefined, options),
    ).toThrow(message);
    expect(() =>
      extractSymbolsFromStagedFile(staged(path), undefined, options),
    ).toThrow(message);
  });
});

describe("builtin analysis", () => {
  test("parses TypeScript and skips languages it does not read", async () => {
    noManifests();
    const path = freshPath();
    const file = staged(path, { content: "export function foo() {}\n" });
    const expected: ExtractedSymbol[] = [
      {
        id: hashId(path, "foo"),
        name: "foo",
        kind: "function",
        role: "behavioral",
        location: { file: path, startLine: 1, endLine: 1 },
        hunkRanges: [],
        reqLinks: [],
      },
    ];
    expect(extractSymbolsFromStagedFile(file)).toStrictEqual(expected);
    expect(
      await extractSymbolsFromStagedFileAsync(file, undefined, {}),
    ).toStrictEqual(expected);
    const python = staged(freshPath("a.py"), {
      content: "export function foo() {}\n",
    });
    expect(
      await extractSymbolsFromStagedFileAsync(python, undefined, {}),
    ).toStrictEqual([]);
    expect(extractSymbolsFromStagedFile(python)).toStrictEqual([]);
  }, 60_000);
});

describe("extractSymbolsFromStagedFileAsync", () => {
  test("awaits an injected analyzer with the staged bytes", async () => {
    noManifests();
    const path = freshPath();
    const seen: string[][] = [];
    const symbols = await extractSymbolsFromStagedFileAsync(
      { path, status: "A", hunkRanges: [] },
      undefined,
      {
        analyzeText: async (filePath, content) => {
          seen.push([filePath, content]);
          return analysis([sym("run", 1, 1)], { status: "ok" });
        },
      },
    );
    expect(symbols.map((symbol) => symbol.name)).toStrictEqual(["run"]);
    expect(seen).toStrictEqual([[path, ""]]);
  });

  test("asks the registry service when no analyzer is injected", async () => {
    noManifests();
    const path = freshPath();
    const registry = { id: "registry" } as unknown as CapabilityRegistry;
    const seen: unknown[] = [];
    spyOn(analysisService, "createSourceAnalysisService").mockImplementation(
      (options) => {
        seen.push(options);
        return {
          analyzeText: async (filePath: string, content: string) => {
            seen.push([filePath, content]);
            return analysis([sym("viaRegistry", 1, 1)], { status: "ok" });
          },
        } as never;
      },
    );
    const symbols = await extractSymbolsFromStagedFileAsync(
      staged(path),
      undefined,
      { registry },
    );
    expect(symbols.map((symbol) => symbol.name)).toStrictEqual(["viaRegistry"]);
    expect(seen).toStrictEqual([{ registry }, [path, "x"]]);
  });

  const gap = { startLine: 1, endLine: 1, reason: "macro" };

  test("uses a partial analysis only when its declarations are placed", async () => {
    noManifests();
    const run = (extra: Record<string, unknown>) =>
      extractSymbolsFromStagedFileAsync(staged(freshPath()), undefined, {
        analyzeText: async () => analysis([sym("run", 1, 1)], extra),
      });
    expect(
      (
        await run({
          status: "partial",
          diagnostics: [{ code: "MACRO" }],
          uncoveredRanges: [gap],
        })
      ).map((symbol) => symbol.name),
    ).toStrictEqual(["run"]);
    for (const status of ["partial", "failed"] as const) {
      const path = freshPath();
      await expect(
        extractSymbolsFromStagedFileAsync(staged(path), undefined, {
          analyzeText: async () =>
            analysis([sym("run", 1, 1)], {
              status,
              diagnostics: [{ code: "SYNTAX" }],
              uncoveredRanges: [gap],
            }),
        }),
      ).rejects.toThrow(
        `Source analysis ${status} for ${path}; complete symbol validation is unavailable`,
      );
    }
    expect(
      (await run({ status: "unsupported" })).map((symbol) => symbol.name),
    ).toStrictEqual(["run"]);
    expect(
      await extractSymbolsFromStagedFileAsync(staged(freshPath()), undefined, {
        analyzeText: async () => null,
      }),
    ).toStrictEqual([]);
  });
});

describe("partialAnalysisSymbolsUsable", () => {
  const gap = { startLine: 1, endLine: 2, reason: "macro" };
  test("accepts only local, uncapped partial gaps", () => {
    expect(
      partialAnalysisSymbolsUsable({
        status: "partial",
        diagnostics: [{ code: "MACRO" }],
        uncoveredRanges: [gap],
      }),
    ).toBe(true);
    expect(
      partialAnalysisSymbolsUsable({
        status: "partial",
        uncoveredRanges: [gap],
      }),
    ).toBe(true);
    expect(
      partialAnalysisSymbolsUsable({
        status: "ok",
        diagnostics: [],
        uncoveredRanges: [gap],
      }),
    ).toBe(false);
    expect(partialAnalysisSymbolsUsable({ status: "partial" })).toBe(false);
    for (const code of ["OUTPUT_LIMIT", "symbol_limit_hit", "PARSE_ERROR"])
      expect(
        partialAnalysisSymbolsUsable({
          status: "partial",
          diagnostics: [{ code: "MACRO" }, { code }],
          uncoveredRanges: [gap],
        }),
      ).toBe(false);
  });
});

describe("declaration identity", () => {
  test("rejects two declarations with one locator in a versioned analysis", () => {
    noManifests();
    const path = freshPath();
    expect(() =>
      extract(staged(path), [sym("run", 1, 1), sym("run", 2, 2)], undefined, {
        status: "ok",
      }),
    ).toThrow(
      `Ambiguous declaration locator 'run' in ${path}; authored identity cannot be assigned`,
    );
    expect(
      extract(
        staged(freshPath()),
        [
          sym("run", 1, 1, { qualifiedName: "A.run" }),
          sym("run", 2, 2, { qualifiedName: "B.run" }),
        ],
        undefined,
        { status: "ok" },
      ).map((symbol) => symbol.name),
    ).toStrictEqual(["A.run", "B.run"]);
    expect(
      extract(staged(freshPath()), [sym("run", 1, 1), sym("run", 2, 2)]).map(
        (symbol) => symbol.name,
      ),
    ).toStrictEqual(["run", "run"]);
  });

  test("titles a declaration by the manifest title that places it", () => {
    noManifests();
    const path = freshPath();
    const bucket = sym("b", 1, 1, {
      qualifiedName: 'terraform:resource["aws_s3_bucket","b"]',
    });
    const member = sym("run", 2, 2, { qualifiedName: "A.run" });
    const plain = sym("run", 3, 3, { qualifiedName: "run" });
    const named = sym("only", 4, 4, { qualifiedName: "N.only" });
    const kept = sym("kept", 5, 5, { qualifiedName: "K.kept" });
    const lookupFor = (...titles: string[]): ManifestLookup =>
      new Map(titles.map((title) => [`${path}:${title}`, { id: title }]));
    const names = (lookup?: ManifestLookup) =>
      extract(
        staged(path, { content: String(lookup?.size) }),
        [bucket, member, plain, named, kept],
        lookup,
        { status: "ok" },
      ).map((symbol) => symbol.name);
    expect(
      names(lookupFor("resource.aws_s3_bucket.b", "run", "only", "K.kept")),
    ).toStrictEqual([
      "resource.aws_s3_bucket.b",
      "A.run",
      "run",
      "only",
      "K.kept",
    ]);
    expect(
      extract(
        staged(path, { content: "both" }),
        [member],
        lookupFor("A.run", "run"),
        { status: "ok" },
      ).map((symbol) => symbol.name),
    ).toStrictEqual(["A.run"]);
    expect(names()).toStrictEqual([
      'terraform:resource["aws_s3_bucket","b"]',
      "A.run",
      "run",
      "N.only",
      "K.kept",
    ]);
  });
});

describe("changed declarations", () => {
  const symbols = [
    sym("Outer", 1, 10, { kind: "class" }),
    sym("second", 6, 8, { kind: "method" }),
    sym("first", 2, 4, { kind: "method" }),
    sym("Twin", 1, 10, { kind: "class" }),
  ];

  function owned(hunk: { start: number; end: number }, status = "A") {
    noManifests();
    return extract(
      staged(freshPath(), { status: status as "A", hunkRanges: [hunk] }),
      symbols,
    ).map((symbol) => [symbol.name, symbol.hunkRanges.length]);
  }

  test("a changed line belongs to the innermost declaration holding it", () => {
    expect(owned({ start: 3, end: 3 })).toStrictEqual([
      ["Outer", 0],
      ["second", 0],
      ["first", 1],
      ["Twin", 0],
    ]);
    expect(owned({ start: 5, end: 5 })).toStrictEqual([
      ["Outer", 1],
      ["second", 0],
      ["first", 0],
      ["Twin", 1],
    ]);
    expect(owned({ start: 2, end: 8 })).toStrictEqual([
      ["Outer", 1],
      ["second", 1],
      ["first", 1],
      ["Twin", 1],
    ]);
    expect(owned({ start: 2, end: 4 })).toStrictEqual([
      ["Outer", 0],
      ["second", 0],
      ["first", 1],
      ["Twin", 0],
    ]);
    expect(owned({ start: 6, end: 8 })).toStrictEqual([
      ["Outer", 0],
      ["second", 1],
      ["first", 0],
      ["Twin", 0],
    ]);
    expect(owned({ start: 9, end: 12 })).toStrictEqual([
      ["Outer", 1],
      ["second", 0],
      ["first", 0],
      ["Twin", 1],
    ]);
    expect(owned({ start: 1, end: 1 })).toStrictEqual([
      ["Outer", 1],
      ["second", 0],
      ["first", 0],
      ["Twin", 1],
    ]);
    expect(owned({ start: 11, end: 12 })).toStrictEqual([
      ["Outer", 0],
      ["second", 0],
      ["first", 0],
      ["Twin", 0],
    ]);
  });

  test("a modified file keeps only declarations with a changed line", () => {
    expect(owned({ start: 3, end: 3 }, "M")).toStrictEqual([["first", 1]]);
    noManifests();
    expect(
      extract(staged(freshPath(), { status: "M" }), symbols).map(
        (symbol) => symbol.name,
      ),
    ).toStrictEqual(["Outer", "second", "first", "Twin"]);
  });

  function ownersOf(
    list: Symbol[],
    hunk: { start: number; end: number },
  ): [string, number][] {
    noManifests();
    return extract(staged(freshPath(), { hunkRanges: [hunk] }), list).map(
      (symbol) => [symbol.name, symbol.hunkRanges.length],
    );
  }

  test("a hunk outside the span never belongs to it", () => {
    const list = [sym("Outer", 5, 10), sym("inner", 7, 8)];
    expect(ownersOf(list, { start: 1, end: 1 })).toStrictEqual([
      ["Outer", 0],
      ["inner", 0],
    ]);
    expect(ownersOf(list, { start: 10, end: 10 })).toStrictEqual([
      ["Outer", 1],
      ["inner", 0],
    ]);
    expect(ownersOf(list, { start: 4, end: 5 })).toStrictEqual([
      ["Outer", 1],
      ["inner", 0],
    ]);
  });

  test("a line ending a member belongs to the member alone", () => {
    expect(ownersOf(symbols, { start: 4, end: 4 }).slice(0, 3)).toStrictEqual([
      ["Outer", 0],
      ["second", 0],
      ["first", 1],
    ]);
  });

  test("only declarations wholly inside a span are nested in it", () => {
    expect(
      ownersOf([sym("Outer", 5, 10), sym("early", 3, 7)], {
        start: 6,
        end: 6,
      }),
    ).toStrictEqual([
      ["Outer", 1],
      ["early", 1],
    ]);
    expect(
      ownersOf([sym("Outer", 1, 10), sym("late", 7, 12)], {
        start: 8,
        end: 8,
      }),
    ).toStrictEqual([
      ["Outer", 1],
      ["late", 1],
    ]);
    expect(
      ownersOf([sym("Outer", 1, 10), sym("head", 1, 3)], {
        start: 2,
        end: 2,
      }),
    ).toStrictEqual([
      ["Outer", 0],
      ["head", 1],
    ]);
    expect(
      ownersOf([sym("Outer", 1, 10), sym("tail", 8, 10)], {
        start: 9,
        end: 9,
      }),
    ).toStrictEqual([
      ["Outer", 0],
      ["tail", 1],
    ]);
  });

  test("records the exact owned hunks", () => {
    noManifests();
    const [symbol] = extract(
      staged(freshPath(), {
        hunkRanges: [
          { start: 1, end: 1 },
          { start: 3, end: 3 },
          { start: 5, end: 6 },
        ],
      }),
      [sym("Outer", 1, 10), sym("inner", 3, 5)],
    );
    expect(symbol?.hunkRanges).toStrictEqual([
      { start: 1, end: 1 },
      { start: 5, end: 6 },
    ]);
  });
});
