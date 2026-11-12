import { describe, expect, test } from "bun:test";
import type { HostSourceAnalysisResultV2 } from "../../src/plugins/source-analysis-service.js";
import {
  type SourceChangeAnalysis,
  analyzeSourceChanges,
  assertSourceAnalysisGate,
  gateAnalysis,
  partialAnalysisReviews,
} from "../../src/plugins/source-change-analysis.js";
import type { StagedPath } from "../../src/traceability/git-staged.js";

type Span = { startLine: number; endLine: number };

function staged(path: string, extra: Partial<StagedPath> = {}): StagedPath {
  return {
    path,
    status: "M",
    hunkRanges: [],
    analysisDepth: "symbol",
    disposition: "checked",
    ...extra,
  } as StagedPath;
}

function host(
  status: string,
  extra: Partial<{
    symbols: Span[];
    diagnostics: { code: string; message: string; range?: Span }[];
    uncoveredRanges: (Span & { reason: string; startColumn?: number })[];
  }> = {},
): HostSourceAnalysisResultV2 {
  return {
    status,
    symbols: extra.symbols ?? [],
    diagnostics: extra.diagnostics ?? [],
    uncoveredRanges: extra.uncoveredRanges ?? [],
  } as unknown as HostSourceAnalysisResultV2;
}

const analyses = (
  entries: Record<string, HostSourceAnalysisResultV2 | null>,
): Map<string, SourceChangeAnalysis> =>
  new Map(
    Object.entries(entries).map(([path, after]) => [
      path,
      { path, before: null, after },
    ]),
  );

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("analyzeSourceChanges", () => {
  test("analyzes nothing for an empty inventory", async () => {
    const calls: string[] = [];
    const result = await analyzeSourceChanges([], {
      analyzeTextV2: async (path: string) => {
        calls.push(path);
        return host("ok");
      },
    } as never);
    expect([...result.entries()]).toStrictEqual([]);
    expect(calls).toStrictEqual([]);
  });

  test("analyzes each side under its own path and skips metadata and skipped files", async () => {
    const calls: string[] = [];
    const service = {
      analyzeTextV2: async (path: string, content: string) => {
        calls.push(`${path}:${content}`);
        return `${path}:${content}` as unknown as HostSourceAnalysisResultV2;
      },
    } as never;
    const result = await analyzeSourceChanges(
      [
        staged("meta.json", { analysisDepth: "metadata", content: "m" }),
        staged("bin.ts", { skipReason: "binary", content: "b" }),
        staged("renamed.ts", {
          oldPath: "old.ts",
          copyFromPath: "copy-src.ts",
          previousContent: "p1",
          content: "c1",
        }),
        staged("copied.ts", { copyFromPath: "src.ts", previousContent: "p2" }),
        staged("plain.ts", { previousContent: "p3", content: "c3" }),
        staged("added.ts", { content: "c4" }),
      ],
      service,
    );
    expect([...result.entries()]).toStrictEqual([
      [
        "renamed.ts",
        { path: "renamed.ts", before: "old.ts:p1", after: "renamed.ts:c1" },
      ],
      ["copied.ts", { path: "copied.ts", before: "src.ts:p2", after: null }],
      [
        "plain.ts",
        { path: "plain.ts", before: "plain.ts:p3", after: "plain.ts:c3" },
      ],
      ["added.ts", { path: "added.ts", before: null, after: "added.ts:c4" }],
    ] as never);
    expect(calls.toSorted()).toStrictEqual([
      "added.ts:c4",
      "old.ts:p1",
      "plain.ts:c3",
      "plain.ts:p3",
      "renamed.ts:c1",
      "src.ts:p2",
    ]);
  });

  test("runs at most four files at once and keeps inventory order", async () => {
    let inFlight = 0;
    let peak = 0;
    const service = {
      analyzeTextV2: async (path: string) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await tick(path === "f0" ? 20 : 2);
        inFlight--;
        return path as unknown as HostSourceAnalysisResultV2;
      },
    } as never;
    const names = ["f0", "f1", "f2", "f3", "f4", "f5"];
    const result = await analyzeSourceChanges(
      names.map((name) => staged(name, { content: name })),
      service,
    );
    expect(peak).toBe(4);
    expect([...result.keys()]).toStrictEqual(names);
    expect([...result.values()].map((change) => change.after)).toStrictEqual(
      names as never,
    );
  });
});

describe("gateAnalysis", () => {
  test("adapts a host result and passes null through", () => {
    const ranges = [
      {
        startLine: 1,
        startColumn: 0,
        endLine: 2,
        endColumn: 0,
        reason: "macro",
      },
    ];
    expect(gateAnalysis(null)).toBeNull();
    expect(
      gateAnalysis(
        host("partial", {
          diagnostics: [
            { code: "A", message: "a" },
            { code: "B", message: "b" },
          ],
          uncoveredRanges: ranges,
        }),
      ),
    ).toStrictEqual({
      status: "partial",
      diagnosticCodes: ["A", "B"],
      uncoveredRanges: ranges,
    });
  });
});

describe("partialAnalysisReviews", () => {
  const hunkRanges = [
    { start: 1, end: 3 },
    { start: 4, end: 5 },
    { start: 10, end: 20 },
  ];

  test("reports the staged lines inside gaps and outside placed declarations", () => {
    const after = host("partial", {
      symbols: [
        { startLine: 15, endLine: 19 },
        { startLine: 13, endLine: 13 },
      ],
      uncoveredRanges: [
        { startLine: 12, endLine: 14, reason: "macro", startColumn: 0 },
        { startLine: 2, endLine: 5, reason: "decorator" },
        { startLine: 30, endLine: 40, reason: "macro" },
        { startLine: 16, endLine: 18, reason: "macro" },
        { startLine: 3, endLine: 4, reason: "decorator" },
      ],
      diagnostics: [
        { code: "MACRO", message: "macro skipped" },
        { code: "MACRO", message: "macro skipped" },
        {
          code: "LOC",
          message: "at end",
          range: { startLine: 14, endLine: 20 },
        },
        {
          code: "LOC",
          message: "at start",
          range: { startLine: 0, endLine: 2 },
        },
        { code: "LOC", message: "far", range: { startLine: 30, endLine: 31 } },
        {
          code: "LOC",
          message: "covered",
          range: { startLine: 16, endLine: 16 },
        },
        { code: "LOC", message: "before", range: { startLine: 0, endLine: 1 } },
      ],
    });
    expect(
      partialAnalysisReviews(
        [staged("a.ts", { hunkRanges })],
        analyses({ "a.ts": after }),
      ),
    ).toStrictEqual([
      {
        path: "a.ts",
        lines: [
          { startLine: 2, endLine: 5 },
          { startLine: 12, endLine: 12 },
          { startLine: 14, endLine: 14 },
        ],
        ranges: [
          { startLine: 12, endLine: 14, reason: "macro" },
          { startLine: 2, endLine: 5, reason: "decorator" },
          { startLine: 3, endLine: 4, reason: "decorator" },
        ],
        detail: "macro skipped at end at start",
      },
    ]);
  });

  test("ignores placed declarations when a limit was hit, and names reasons without diagnostics", () => {
    const analysisWith = (codes: string[]) =>
      host("partial", {
        symbols: [{ startLine: 1, endLine: 9 }],
        uncoveredRanges: [
          { startLine: 2, endLine: 3, reason: "macro" },
          { startLine: 5, endLine: 5, reason: "decorator" },
          { startLine: 7, endLine: 7, reason: "macro" },
        ],
        diagnostics: codes.map((code) => ({ code, message: "" })),
      });
    const inventory = [staged("b.ts", { hunkRanges: [{ start: 1, end: 9 }] })];
    expect(
      partialAnalysisReviews(inventory, analyses({ "b.ts": analysisWith([]) })),
    ).toStrictEqual([]);
    expect(
      partialAnalysisReviews(
        inventory,
        analyses({ "b.ts": analysisWith(["SIZE_LIMIT"]) }),
      ),
    ).toStrictEqual([
      {
        path: "b.ts",
        lines: [
          { startLine: 2, endLine: 3 },
          { startLine: 5, endLine: 5 },
          { startLine: 7, endLine: 7 },
        ],
        ranges: [
          { startLine: 2, endLine: 3, reason: "macro" },
          { startLine: 5, endLine: 5, reason: "decorator" },
          { startLine: 7, endLine: 7, reason: "macro" },
        ],
        detail: "macro, decorator",
      },
    ]);
  });

  test("skips files without an analysis or a partial review, in inventory order", () => {
    const partial = host("partial", {
      uncoveredRanges: [{ startLine: 1, endLine: 1, reason: "macro" }],
    });
    const hunk = { hunkRanges: [{ start: 1, end: 1 }] };
    expect(
      partialAnalysisReviews(
        [
          staged("z.ts", hunk),
          staged("missing.ts", hunk),
          staged("none.ts", hunk),
          staged("ok.ts", hunk),
          staged("a.ts", hunk),
        ],
        analyses({
          "a.ts": partial,
          "z.ts": partial,
          "none.ts": null,
          "ok.ts": host("ok"),
        }),
      ).map((review) => review.path),
    ).toStrictEqual(["z.ts", "a.ts"]);
  });
});

describe("assertSourceAnalysisGate", () => {
  test("passes files without an analysis or with a passing one", () => {
    expect(() =>
      assertSourceAnalysisGate(
        [staged("missing.ts"), staged("ok.ts"), staged("none.ts")],
        analyses({ "ok.ts": host("ok"), "none.ts": null }),
      ),
    ).not.toThrow();
  });

  test("throws for the first blocked file with its diagnostics", () => {
    expect(() =>
      assertSourceAnalysisGate(
        [staged("ok.ts"), staged("bad.ts"), staged("worse.ts")],
        analyses({
          "ok.ts": host("ok"),
          "bad.ts": host("failed", {
            diagnostics: [
              { code: "X", message: "first" },
              { code: "Y", message: "second" },
            ],
          }),
          "worse.ts": host("failed"),
        }),
      ),
    ).toThrow(new Error("Source analysis failed for bad.ts: first; second"));
    expect(() =>
      assertSourceAnalysisGate(
        [staged("gap.ts")],
        analyses({ "gap.ts": host("partial") }),
      ),
    ).toThrow(new Error("Source analysis partial for gap.ts: "));
  });
});
