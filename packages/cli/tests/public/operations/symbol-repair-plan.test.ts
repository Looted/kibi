import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import {
  SYMBOL_REPAIR_PLAN_VERSION,
  buildSymbolRepairPlan,
} from "../../../src/public/operations/symbol-repair-plan.js";

const xsdInteger = "http://www.w3.org/2001/XMLSchema#integer";

function coords(): string {
  const lit = (value: number) => `^^("${String(value)}", '${xsdInteger}')`;
  return `,sourceLine=${lit(1)},sourceColumn=${lit(0)},sourceEndLine=${lit(3)},sourceEndColumn=${lit(1)}`;
}

function contextFor(results: string, workspaceRoot: string): OperationContext {
  const query = mock(
    async (): Promise<PrologQueryResult> => ({
      success: true,
      bindings: { Results: results },
    }),
  );
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    prolog,
  };
}

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-repair-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  mock.restore();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("buildSymbolRepairPlan", () => {
  test("returns undefined without Prolog or when the gap rows are empty", async () => {
    const workspaceRoot = makeTempDir();
    expect(
      await buildSymbolRepairPlan([], {
        workspaceRoot,
        signal: new AbortController().signal,
        clock: () => new Date(0),
      }),
    ).toBeUndefined();
    expect(
      await buildSymbolRepairPlan([{ type: "symbol", id: "SYM-1" }], {
        workspaceRoot,
        signal: new AbortController().signal,
        clock: () => new Date(0),
      }),
    ).toBeUndefined();
  });

  test("classifies delete, refresh, remap, and review repairs from extraction evidence", async () => {
    const root = makeTempDir();
    const src = path.join(root, "src");
    mkdirSync(src);
    writeFileSync(
      path.join(src, "live.ts"),
      [
        "export function handleClick() { return 1; }",
        "export function keepAlive() { return 2; }",
      ].join("\n"),
    );
    writeFileSync(
      path.join(src, "remap-peer.ts"),
      "export function handleClick() { return 0; }\n",
    );
    writeFileSync(
      path.join(src, "unique.ts"),
      "export function uniqueFn() { return 9; }\n",
    );
    mkdirSync(path.join(src, "not-a-file.ts"));
    const absLive = path.join(root, "src/live.ts");

    const results = `[${[
      `[SYM-MISSING-FILE,symbol,[title="ghostFn",sourceFile="src/gone.ts",symbol_kind=function,symbol_origin=extracted]]`,
      `[SYM-MISSING-REVIEW,symbol,[title="manualGhost",source="src/gone.ts",symbol_kind=function,symbol_origin=manual]]`,
      `[SYM-ABSENT,symbol,[title="removedFn",sourceFile="src/live.ts",symbol_kind=function,symbol_origin=extracted]]`,
      `[SYM-REFRESH,symbol,[title="handleClick",sourceFile="src/live.ts",symbol_kind=function,symbol_origin=extracted]]`,
      `[SYM-REMAP,symbol,[title="handleClick",sourceFile="src/remap-peer.ts",symbol_kind=function,symbol_origin=extracted${coords()}]]`,
      `[SYM-REVIEW,symbol,[title="uniqueFn",sourceFile="src/unique.ts",symbol_kind=function,symbol_origin=extracted${coords()}]]`,
      `[SYM-DIR,symbol,[title="dirSymbol",sourceFile="src/not-a-file.ts",symbol_kind=function,symbol_origin=extracted]]`,
      `[SYM-ABSOLUTE,symbol,[title="handleClick",sourceFile="${absLive}",symbol_kind=function,symbol_origin=extracted]]`,
      `[SYM-NO-SOURCE,symbol,[title="orphan",symbol_kind=function,symbol_origin=manual]]`,
      `[SYM-KIND-MATCH,symbol,[title="otherName",sourceFile="src/live.ts",symbol_kind=function,symbol_origin=extracted]]`,
      `[SYM-UNTYPED,symbol,[sourceFile="src/live.ts"]]`,
      `[SYM-TITLE-ONLY,symbol,[title="handleClick",sourceFile="src/live.ts"]]`,
    ].join(",")}]`;

    const plan = await buildSymbolRepairPlan(
      [
        { type: "req", id: "REQ-1" },
        { type: "symbol", id: "SYM-UNKNOWN" },
        {
          type: "symbol",
          id: "SYM-MISSING-FILE",
          gaps: ["missing_symbol_coordinates"],
        },
        { type: "symbol", id: "SYM-MISSING-REVIEW" },
        { type: "symbol", id: "SYM-ABSENT", gaps: "not-an-array" },
        { type: "symbol", id: "SYM-REFRESH" },
        { type: "symbol", id: "SYM-REMAP" },
        { type: "symbol", id: "SYM-REVIEW" },
        { type: "symbol", id: "SYM-DIR" },
        { type: "symbol", id: "SYM-ABSOLUTE" },
        { type: "symbol", id: "SYM-NO-SOURCE" },
        { type: "symbol", id: "SYM-KIND-MATCH" },
        { type: "symbol", id: "SYM-UNTYPED" },
        { type: "symbol", id: "SYM-TITLE-ONLY" },
      ],
      contextFor(results, root),
    );

    expect(plan?.version).toBe(SYMBOL_REPAIR_PLAN_VERSION);
    expect(plan?.readOnly).toBe(true);
    expect(plan?.autoApplicable).toBe(false);
    const byId = Object.fromEntries(
      (plan?.repairs ?? []).map((repair) => [String(repair.symbolId), repair]),
    );
    expect(byId["SYM-MISSING-FILE"]?.action).toBe("delete_obsolete_symbol");
    expect(byId["SYM-MISSING-REVIEW"]?.action).toBe("review");
    expect(byId["SYM-ABSENT"]?.action).toBe("delete_obsolete_symbol");
    expect(byId["SYM-REFRESH"]?.action).toBe("refresh_coordinates");
    expect(byId["SYM-REMAP"]?.action).toBe("remap");
    expect(
      (byId["SYM-REMAP"]?.candidates as ReadonlyArray<{ symbolId: string }>).map(
        (candidate) => candidate.symbolId,
      ),
    ).toEqual(expect.arrayContaining(["SYM-REFRESH", "SYM-TITLE-ONLY"]));
    expect(byId["SYM-REVIEW"]?.action).toBe("review");
    expect(byId["SYM-DIR"]?.action).toBe("delete_obsolete_symbol");
    expect(byId["SYM-ABSOLUTE"]?.action).toBe("refresh_coordinates");
    expect(byId["SYM-NO-SOURCE"]?.action).toBe("review");
    expect(byId["SYM-KIND-MATCH"]?.action).toBe("delete_obsolete_symbol");
    expect(byId["SYM-UNTYPED"]?.action).toBe("refresh_coordinates");
    expect(byId["SYM-MISSING-FILE"]?.evidence).toMatchObject({
      gaps: ["missing_symbol_coordinates"],
      autoApply: false,
      sourceExists: false,
    });
    expect(byId["SYM-ABSENT"]?.evidence).toMatchObject({ gaps: [] });
    expect(byId).not.toHaveProperty("SYM-UNKNOWN");
  });
});
