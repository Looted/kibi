import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  formatSymbolDebt,
  inheritedSymbolGapsNote,
  inheritedSymbolGapsOf,
  printStagedResult,
} from "../../../src/commands/check.js";
import {
  type StagedHarness,
  entry,
  side,
  stagedHarness,
} from "./staged-harness.js";

describe("symbol debt text", () => {
  test("no debt, or a zero total, prints nothing", () => {
    expect(formatSymbolDebt(undefined)).toBe("");
    expect(formatSymbolDebt({ total: 0, files: [] })).toBe("");
  });

  test("a debt names the total and each file's declarations", () => {
    expect(
      formatSymbolDebt({
        total: 3,
        files: [
          { path: "src/a.ts", unrecorded: ["one", "two"] },
          { path: "src/b.ts", unrecorded: ["three"] },
        ],
      }),
    ).toBe(
      [
        "Symbol records (not blocking): 3 unrecorded declaration(s) in 2 file(s) that have symbol records. A commit is judged on them only when it adds or changes them.",
        "  src/a.ts (2): one, two",
        "  src/b.ts (1): three",
      ].join("\n"),
    );
  });
});

describe("inherited symbol gaps", () => {
  const detail = (inherited?: {
    missing: Array<{ title: string; line: number }>;
    extra: string[];
  }) => ({
    path: "src/a.ts",
    expectedCount: 2,
    coveredCount: 1,
    missing: [],
    extra: [],
    ...(inherited ? { inherited } : {}),
  });

  test("a file without inherited gaps has none", () => {
    expect(inheritedSymbolGapsOf(detail())).toBeUndefined();
    expect(
      inheritedSymbolGapsOf(detail({ missing: [], extra: [] })),
    ).toBeUndefined();
  });

  test("unrecorded declarations or orphaned records alone are gaps", () => {
    const missing = [{ title: "a", line: 1 }];
    expect(inheritedSymbolGapsOf(detail({ missing, extra: [] }))).toEqual({
      path: "src/a.ts",
      unrecorded: missing,
      orphaned: [],
    });
    expect(
      inheritedSymbolGapsOf(detail({ missing: [], extra: ["b"] })),
    ).toEqual({ path: "src/a.ts", unrecorded: [], orphaned: ["b"] });
  });

  test("the note counts each kind and joins them", () => {
    const tail =
      "They are not judged by this commit and no action is required. Run kibi check for the list.";
    const unrecorded =
      "2 declaration(s) without a .kb/symbols.yaml record that this commit did not add or change";
    const orphaned =
      "1 record(s) whose declaration was already gone before this commit";
    const gaps = (u: number, o: number) => ({
      path: "src/a.ts",
      unrecorded: Array.from({ length: u }, (_, i) => ({
        title: `d${i}`,
        line: i,
      })),
      orphaned: Array.from({ length: o }, (_, i) => `r${i}`),
    });
    expect(inheritedSymbolGapsNote(gaps(2, 0))).toBe(
      `Symbol records: src/a.ts has ${unrecorded}. ${tail}`,
    );
    expect(inheritedSymbolGapsNote(gaps(0, 1))).toBe(
      `Symbol records: src/a.ts has ${orphaned}. ${tail}`,
    );
    expect(inheritedSymbolGapsNote(gaps(2, 1))).toBe(
      `Symbol records: src/a.ts has ${unrecorded} and ${orphaned}. ${tail}`,
    );
  });

  test("json output carries the inherited gaps when given", () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (line: string) => logs.push(line);
    try {
      const inheritedSymbolGaps = [
        { path: "src/a.ts", unrecorded: [], orphaned: ["b"] },
      ];
      printStagedResult({
        format: "json",
        coverage: null,
        inheritedSymbolGaps,
      });
    } finally {
      console.log = original;
    }
    expect(JSON.parse(logs[0] as string).structuredContent).toEqual({
      violations: [],
      count: 0,
      diagnostics: [],
      qualityDiagnostics: [],
      staged: null,
      messages: [],
      inheritedSymbolGaps: [
        { path: "src/a.ts", unrecorded: [], orphaned: ["b"] },
      ],
    });
  });
});

describe("staged gate on declarations the commit touches", () => {
  let h: StagedHarness;
  beforeEach(() => {
    h = stagedHarness();
  });
  afterEach(() => h.restore());

  // src/a.ts: `a` (line 1) changes, `b` (line 2) and `c` (line 3) do not;
  // `c` has a record.
  const BEFORE = "a0\nb\nc\n";
  const AFTER = "a1\nb\nc\n";
  const declarations = [
    { name: "a", startLine: 1, endLine: 1 },
    { name: "b", startLine: 2, endLine: 2 },
    { name: "c", startLine: 3, endLine: 3 },
  ];
  const extracted = [
    { name: "a", reqLinks: [], location: { startLine: 1, endLine: 1 } },
    { name: "b", reqLinks: [], location: { startLine: 2, endLine: 2 } },
    {
      name: "c",
      reqLinks: [],
      relationships: [],
      location: { startLine: 3, endLine: 3 },
    },
  ];
  const source = (extra: Record<string, unknown> = {}) =>
    entry("src/a.ts", {
      analysisDepth: "symbol",
      content: AFTER,
      previousContent: BEFORE,
      ...extra,
    });
  const analyze = (before: boolean) => {
    h.world.analysis.set("src/a.ts", {
      ...(before ? { before: side("ok", { symbols: declarations }) } : {}),
      after: side("ok", { symbols: declarations }),
    });
  };
  /** Names of the symbols handed to the staged rule run. */
  const judged = async (): Promise<string[]> => {
    h.set("extractSymbolsFromStagedFileAsync", async (file) =>
      file.path === "src/a.ts" ? extracted : [],
    );
    await h.run();
    return (
      (h.calls.createOverlayFacts?.[0]?.[0] ?? []) as Array<{ name: string }>
    ).map((symbol) => symbol.name);
  };

  test("an unchanged unrecorded declaration is not judged", async () => {
    // Another staged file first, with a base that would change `b` too.
    h.world.inventory = [
      entry("src/z.ts", { analysisDepth: "symbol", previousContent: "x\nB\n" }),
      source(),
    ];
    analyze(true);
    expect(await judged()).toEqual(["a", "c"]);
  });

  test("without a usable base every declaration is judged", async () => {
    for (const [extra, before] of [
      [{ previousContent: undefined }, true],
      [{ copyFromPath: "src/old.ts" }, true],
      [{}, false],
    ] as const) {
      h.restore();
      h = stagedHarness();
      h.world.inventory = [source(extra)];
      analyze(before);
      expect(await judged()).toEqual(["a", "b", "c"]);
    }
  });

  test("an empty staged file compares as empty text", async () => {
    h.world.inventory = [source({ content: undefined, previousContent: "" })];
    h.world.analysis.set("src/a.ts", {
      before: side("ok", { symbols: [declarations[0]] }),
      after: side("ok", { symbols: [declarations[0]] }),
    });
    // `a` reads the same empty line in both versions; recorded `c` stays.
    expect(await judged()).toEqual(["c"]);
  });

  test("the symbol manifest gets the base reader", async () => {
    h.world.inventory = [source()];
    analyze(true);
    await h.run();
    const options = h.calls.assessStagedSymbolsManifest?.[0]?.[0] as {
      baseSource: (file: { path: string }) => unknown;
    };
    expect(options.baseSource({ path: "src/a.ts" })).toEqual({
      analysis: side("ok", { symbols: declarations }),
      content: BEFORE,
    });
    expect(options.baseSource({ path: "src/none.ts" })).toBeNull();
    // Analyzed but not staged: no inventory entry, so no base.
    h.world.analysis.set("src/ghost.ts", {
      before: side("ok", { symbols: declarations }),
    });
    expect(options.baseSource({ path: "src/ghost.ts" })).toBeNull();
  });

  test("inherited gaps become notes and json entries, nothing else", async () => {
    h.world.inventory = [source()];
    analyze(true);
    h.set("assessStagedSymbolsManifest", () => ({
      path: ".kb/symbols.yaml",
      state: "fresh",
      sourcePaths: ["src/a.ts", "src/b.ts", "src/c.ts"],
      coveredSourcePaths: ["src/a.ts"],
      fileDetails: [
        {
          path: "src/a.ts",
          expectedCount: 2,
          coveredCount: 1,
          missing: [],
          extra: [],
          inherited: { missing: [{ title: "x", line: 4 }], extra: [] },
        },
        {
          path: "src/b.ts",
          expectedCount: 1,
          coveredCount: 1,
          missing: [],
          extra: [],
        },
        {
          path: "src/c.ts",
          expectedCount: 0,
          coveredCount: 0,
          missing: [],
          extra: [],
          inherited: { missing: [], extra: ["y"] },
        },
      ],
    }));
    expect(await h.run()).toBe(0);
    const output = h.output();
    expect(output.inheritedSymbolGaps).toEqual([
      { path: "src/a.ts", unrecorded: [{ title: "x", line: 4 }], orphaned: [] },
      { path: "src/c.ts", unrecorded: [], orphaned: ["y"] },
    ]);
    expect(
      (output.messages as string[]).filter((message) =>
        message.startsWith("Symbol records:"),
      ),
    ).toEqual([
      "Symbol records: src/a.ts has 1 declaration(s) without a .kb/symbols.yaml record that this commit did not add or change. They are not judged by this commit and no action is required. Run kibi check for the list.",
      "Symbol records: src/c.ts has 1 record(s) whose declaration was already gone before this commit. They are not judged by this commit and no action is required. Run kibi check for the list.",
    ]);
    const evidence = h.calls.collectStagedKibiDiagnostics?.[0]?.[0] as {
      symbolsManifest: { coveredSourcePaths?: string[] };
    };
    expect(evidence.symbolsManifest.coveredSourcePaths).toEqual(["src/a.ts"]);
  });

  test("no inherited gaps leaves the json field out", async () => {
    h.world.inventory = [source()];
    analyze(true);
    expect(await h.run()).toBe(0);
    expect(h.output()).not.toHaveProperty("inheritedSymbolGaps");
  });
});
