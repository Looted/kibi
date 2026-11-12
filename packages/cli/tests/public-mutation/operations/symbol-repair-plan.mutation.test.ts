import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as coordinator from "../../../src/extractors/symbols-coordinator.js";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import {
  addCoordinateRepairEvidence,
  buildSymbolRepairPlan,
  inspectCoordinateRepairs,
} from "../../../src/public/operations/symbol-repair-plan.js";
import { expectGolden } from "../helpers/golden.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-symbol-repair-"));
  roots.push(root);
  const files: Record<string, string> = {
    "src/a.ts":
      "export function alpha(): number {\n  return 1;\n}\n\nexport class Beta {}\n",
    "src/notes.txt": "gamma here\n",
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

const prolog = { query: async () => ({ success: true, bindings: {} }) };

const context = (workspaceRoot: string, withProlog = true) =>
  ({
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    ...(withProlog ? { prolog: prolog as unknown as PrologPort } : {}),
  }) as OperationContext;

function symbols(list: Record<string, unknown>[]) {
  const load = spyOn(entities, "loadEntitiesPaged").mockResolvedValue(list);
  spies.push(load);
  return load;
}

function enrichCalls() {
  const enrich = spyOn(coordinator, "enrichSymbolCoordinates");
  spies.push(enrich);
  return enrich;
}

const portable = (root: string, value: unknown) =>
  JSON.parse(JSON.stringify(value).replaceAll(root, "<root>"));

const AT = {
  sourceLine: 1,
  sourceColumn: 0,
  sourceEndLine: 1,
  sourceEndColumn: 5,
};

describe("inspectCoordinateRepairs", () => {
  test("previews extraction, coarse anchors and unreadable sources", async () => {
    const root = workspace();
    const enrich = enrichCalls();
    const evidence = await inspectCoordinateRepairs(
      [
        { id: "S-ext", title: "alpha", sourceFile: " src/a.ts " },
        { id: "S-blank", title: "x", sourceFile: "   ", source: "src/a.ts" },
        { id: "S-src", title: "alpha", source: "src/a.ts" },
        {
          id: "S-gone-coarse",
          title: "x",
          sourceFile: "src/gone.ts",
          granularity_reason: "extractor-miss",
        },
        {
          id: "S-coarse",
          title: "nothing",
          sourceFile: "src/notes.txt",
          granularity_reason: "module-level-behavior",
        },
        {
          id: "S-untitled",
          title: 5,
          sourceFile: "src/notes.txt",
          granularity_reason: 5,
        },
        { id: "S-none", title: "zzz", sourceFile: "src/a.ts" },
        { id: "S-nofile", title: "alpha" },
      ],
      root,
    );
    expectGolden("symbol-repair-inspect", [...evidence.values()]);
    expect(enrich.mock.calls[0]?.slice(1)).toEqual([
      root,
      { allowPythonDecoratorCoordinates: true },
    ]);
    expect(enrich.mock.calls[0]?.[0]).toStrictEqual([
      { id: "S-ext", title: "alpha", sourceFile: "src/a.ts" },
      { id: "S-blank", title: "x" },
      { id: "S-src", title: "alpha", sourceFile: "src/a.ts" },
      {
        id: "S-gone-coarse",
        title: "x",
        sourceFile: "src/gone.ts",
        granularity_reason: "extractor-miss",
      },
      {
        id: "S-coarse",
        title: "nothing",
        sourceFile: "src/notes.txt",
        granularity_reason: "module-level-behavior",
      },
      { id: "S-untitled", title: "", sourceFile: "src/notes.txt" },
      { id: "S-none", title: "zzz", sourceFile: "src/a.ts" },
      { id: "S-nofile", title: "alpha" },
    ]);
  });
});

describe("addCoordinateRepairEvidence", () => {
  test("leaves rows alone without missing symbols or an engine", async () => {
    const root = workspace();
    const load = symbols([]);
    const plain = [{ id: "REQ-a" }, { id: "REQ-b", proofStages: {} }];
    expect(await addCoordinateRepairEvidence(plain, context(root))).toBe(plain);
    expect(load).not.toHaveBeenCalled();
    load.mockRestore();
    const missing = [
      { proofStages: { sourceCoordinates: { missingSymbols: ["S-a"] } } },
    ];
    expect(
      await addCoordinateRepairEvidence(missing, context(root, false)),
    ).toBe(missing);
  });

  test("attaches evidence and names the repairs that refresh cannot make", async () => {
    const root = workspace();
    const load = symbols([
      { id: "S-ext", title: "alpha", sourceFile: "src/a.ts" },
      { id: "S-none", title: "zzz", sourceFile: "src/a.ts" },
      { id: "S-none-2", title: "yyy", sourceFile: "src/a.ts" },
      { id: "S-other", title: "other", sourceFile: "src/a.ts" },
    ]);
    const enrich = enrichCalls();
    const gap = { gap: "missing_symbol_coordinates", action: "refresh" };
    const quiet = { id: "REQ-quiet", proofStages: { other: {} } };
    const rows = [
      {
        id: "REQ-mixed",
        proofStages: {
          sourceCoordinates: {
            status: "missing",
            missingSymbols: ["S-ext", "S-none", "S-none-2", "S-unknown", 5],
          },
        },
        proofRepairs: [null, gap, { gap: "other", action: "keep" }],
      },
      quiet,
      {
        id: "REQ-fresh",
        proofStages: { sourceCoordinates: { missingSymbols: ["S-ext"] } },
        proofRepairs: [gap],
      },
      { id: "REQ-bare" },
      {
        id: "REQ-no-repairs",
        proofStages: { sourceCoordinates: { missingSymbols: ["S-none"] } },
      },
    ];
    const result = await addCoordinateRepairEvidence(rows, context(root));
    expect(result[1]).toBe(quiet);
    expect(result[3]).toBe(rows[3]);
    expectGolden("symbol-repair-evidence", result);
    expect(load).toHaveBeenCalledWith(prolog, "symbol", 250);
    expect((enrich.mock.calls[0]?.[0] ?? []).map((entry) => entry.id)).toEqual([
      "S-ext",
      "S-none",
      "S-none-2",
    ]);
  });
});

describe("buildSymbolRepairPlan", () => {
  test("needs an engine and rows", async () => {
    const root = workspace();
    symbols([]);
    expect(
      await buildSymbolRepairPlan([{ id: "S" }], context(root, false)),
    ).toBeUndefined();
    expect(await buildSymbolRepairPlan([], context(root))).toBeUndefined();
  });

  test("suggests a reviewed repair for each symbol row", async () => {
    const root = workspace();
    const list: Record<string, unknown>[] = [
      {
        id: "SYM-alpha",
        title: "alpha",
        symbol_kind: "function",
        sourceFile: "src/a.ts",
        symbol_origin: "extracted",
        ...AT,
      },
      { id: "SYM-alpha-copy", title: "alpha", ...AT },
      {
        id: "SYM-gone",
        title: "gone",
        sourceFile: "src/gone.ts",
        symbol_origin: "extracted",
        ...AT,
      },
      {
        id: "SYM-stale",
        title: "removed",
        symbol_kind: "function",
        sourceFile: "src/a.ts",
        symbol_origin: "extracted",
        ...AT,
      },
      {
        id: "SYM-kindless",
        title: "Beta",
        sourceFile: "src/a.ts",
        symbol_origin: "extracted",
        ...AT,
      },
      {
        id: "SYM-wrong-kind",
        title: "Beta",
        symbol_kind: "function",
        sourceFile: join(root, "src/a.ts"),
        symbol_origin: "extracted",
        ...AT,
      },
      {
        id: "SYM-renamed",
        title: "Old",
        symbol_kind: "class",
        sourceFile: "src/a.ts",
        ...AT,
      },
      {
        id: "SYM-beta-class",
        title: "Beta",
        symbol_kind: "class",
        sourceFile: "src/b.ts",
        ...AT,
      },
      {
        id: "SYM-beta-type",
        title: "Beta",
        symbol_kind: "type",
        sourceFile: "src/b.ts",
        ...AT,
      },
      {
        id: "SYM-text",
        title: "gamma",
        sourceFile: "src/notes.txt",
        symbol_origin: "extracted",
        ...AT,
      },
      {
        id: "SYM-refresh",
        title: "alpha",
        symbol_kind: "function",
        sourceFile: "src/a.ts",
      },
      {
        id: "SYM-unrefreshable",
        title: "zzz",
        sourceFile: "src/a.ts",
        ...AT,
        sourceEndColumn: 1.5,
      },
      {
        id: "SYM-negative",
        title: "alpha",
        sourceFile: "src/a.ts",
        ...AT,
        sourceLine: -1,
      },
      { id: "SYM-number", title: 5, sourceFile: "src/a.ts", ...AT },
      { id: "SYM-number-2", title: 5, ...AT },
      { id: "SYM-empty", title: "", ...AT },
      { id: "SYM-empty-2", title: "", ...AT },
      { id: "SYM-untitled", ...AT },
      { id: "SYM-untitled-2", ...AT },
    ];
    const load = symbols(list);
    const rows = [
      ...list.map((symbol) => ({
        type: "symbol",
        id: symbol.id,
        gaps: symbol.id === "SYM-text" ? "none" : ["coordinates", 2],
      })),
      { type: "req", id: "SYM-alpha" },
      { type: "symbol", id: "SYM-unknown", gaps: "none" },
    ];
    const plan = await buildSymbolRepairPlan(rows, context(root));
    expect(load).toHaveBeenCalledWith(prolog, "symbol", 250);
    expectGolden("symbol-repair-plan", portable(root, plan));
    expect(
      plan?.repairs.map(
        (repair) =>
          `${repair.symbolId} ${repair.action} ${
            (repair.evidence as { coordinateRepair?: unknown })
              .coordinateRepair !== undefined
          }`,
      ),
    ).toEqual([
      "SYM-alpha remap false",
      "SYM-alpha-copy review false",
      "SYM-gone delete_obsolete_symbol false",
      "SYM-stale delete_obsolete_symbol false",
      "SYM-kindless remap false",
      "SYM-wrong-kind delete_obsolete_symbol false",
      "SYM-renamed remap false",
      "SYM-beta-class review false",
      "SYM-beta-type review false",
      "SYM-text review false",
      "SYM-refresh refresh_coordinates true",
      "SYM-unrefreshable review true",
      "SYM-negative refresh_coordinates true",
      "SYM-number review false",
      "SYM-number-2 review false",
      "SYM-empty review false",
      "SYM-empty-2 review false",
      "SYM-untitled review false",
      "SYM-untitled-2 review false",
    ]);
  });
});
