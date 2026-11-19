import { describe, expect, test } from "bun:test";
import { proofStateFromCoverage } from "../runtime/codex-cell-defaults";
import { readEveryPage } from "../runtime/final-state";

/** A tool result whose data is cut to `rows`, naming `nextOffset` if any. */
function page(rows: readonly unknown[], nextOffset?: number) {
  return {
    content: [{ type: "text", text: "rows" }],
    structuredContent: {
      kibiProtocol: 1,
      data: {
        rows,
        summary: { proofTested: 0 },
        ...(nextOffset === undefined
          ? {}
          : {
              truncated: true,
              truncation: { returned: rows.length, nextOffset },
            }),
      },
    },
  };
}

describe("readEveryPage", () => {
  test("reads each page a cut result names and joins its rows", async () => {
    const calls: Record<string, unknown>[] = [];
    const pages = [page(["a", "b"], 2), page(["c"], 3), page(["d"])];
    const result = (await readEveryPage(
      async (args) => {
        calls.push(args);
        return pages[calls.length - 1];
      },
      { by: "req" },
    )) as ReturnType<typeof page>;
    expect(calls).toStrictEqual([
      { by: "req" },
      { by: "req", offset: 2 },
      { by: "req", offset: 3 },
    ]);
    expect(result.structuredContent.data).toStrictEqual({
      rows: ["a", "b", "c", "d"],
      summary: { proofTested: 0 },
    });
  });

  test("returns a result that was not cut as it is", async () => {
    const whole = page(["a"]);
    expect(await readEveryPage(async () => whole, {})).toBe(whole);
    const failed = { isError: true, content: [] };
    expect(await readEveryPage(async () => failed, {})).toBe(failed);
  });

  test("keeps the cut marked when a later page cannot be read", async () => {
    const pages: unknown[] = [page(["a"], 1), { isError: true }];
    let index = 0;
    const result = (await readEveryPage(
      async () => pages[index++],
      {},
    )) as ReturnType<typeof page>;
    expect(result.structuredContent.data.rows).toStrictEqual(["a"]);
    expect(result.structuredContent.data.truncated).toBe(true);
  });

  test("reads data a result carries without a protocol envelope", async () => {
    const pages = [
      { structuredContent: { entities: [1], truncation: { nextOffset: 1 } } },
      { structuredContent: { entities: [2] } },
    ];
    let index = 0;
    const result = (await readEveryPage(async () => pages[index++], {})) as {
      structuredContent: Record<string, unknown>;
    };
    expect(result.structuredContent).toStrictEqual({ entities: [1, 2] });
  });
});

describe("proofStateFromCoverage", () => {
  const rows = [{ proofStatus: "missing" }, { proofStatus: "tested" }];

  test("evaluates a report read page by page once every matched row is in", () => {
    expect(
      proofStateFromCoverage({
        matched: 2,
        rows,
        repairPlan: { scope: { complete: false } },
      }),
    ).toBe("mixed");
  });

  test("leaves a report with unread rows unevaluated", () => {
    for (const coverage of [
      { matched: 3, rows },
      { matched: 2, rows, truncated: true },
      { rows },
      { matched: 2, rows: "x" },
    ]) {
      expect(proofStateFromCoverage(coverage)).toBe("not_evaluated");
    }
  });
});
