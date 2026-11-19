import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as discovery from "../../../src/public/operations/discovery-executors.js";
import { RESULT_BUDGET_CHARS } from "../../../src/public/operations/result-budget.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import {
  COVERAGE_FULL_LISTING,
  coverageCheckTime,
  executeCoverage,
  executeGraph,
  summarizeCoverageRow,
  withFullListing,
} from "../../../src/public/operations/specs/reporting.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const json = (value: unknown): PrologQueryResult => ({
  success: true,
  bindings: { JsonString: JSON.stringify(value) },
});

function engine(respond: (goal: string) => unknown) {
  const goals: string[] = [];
  const prolog = {
    oneShotMode: true,
    goals,
    async query(goal: string) {
      goals.push(goal);
      return json(respond(goal));
    },
  };
  return prolog as unknown as PrologPort & { goals: string[] };
}

function context(prolog: PrologPort): OperationContext {
  const root = mkdtempSync(join(tmpdir(), "kibi-coverage-budget-"));
  roots.push(root);
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-03-04T05:06:07.000Z"),
    prolog,
  } as OperationContext;
}

/** A requirement row of about `size` characters. */
function row(index: number, size = 3000) {
  return {
    id: `REQ-${String(index).padStart(3, "0")}`,
    proofStatus: "missing",
    proofGaps: [],
    proofRepairs: [],
    note: "x".repeat(size),
    testResolutions: [{ test: "TEST-a", resolved: true }],
    proofStages: {
      semanticInventory: { status: "missing", detail: "y".repeat(40) },
    },
  };
}

/** A coverage engine answering every page with `rows` and `matched`. */
function coverage(rows: readonly unknown[], matched: number) {
  return engine((goal) =>
    goal.includes("coverage_report_json")
      ? { summary: { total: matched }, rows, matched }
      : {},
  );
}

function quietStatus() {
  spies.push(
    spyOn(discovery, "executeStatus").mockResolvedValue({
      content: [],
    } as never),
  );
}

describe("kb_coverage size budget", () => {
  test("returns the rows that fit and the offset of the next page", async () => {
    quietStatus();
    const rows = Array.from({ length: 10 }, (_, index) => row(index));
    const result = await executeCoverage(
      { limit: 10, offset: 4 },
      context(coverage(rows, 40)),
    );
    const data = result.structuredContent;
    expect(JSON.stringify(data).length).toBeLessThanOrEqual(
      RESULT_BUDGET_CHARS,
    );
    const returned = data?.rows.length ?? 0;
    expect(returned).toBeGreaterThan(0);
    expect(returned).toBeLessThan(10);
    expect(data?.matched).toBe(40);
    expect(data?.truncated).toBe(true);
    expect(data?.truncation).toMatchObject({
      returned,
      total: 40,
      omitted: 40 - 4 - returned,
      nextOffset: 4 + returned,
    });
    expect(data?.truncation?.hint).toContain("page with offset");
    expect(result.content[0]?.text).toContain(
      `Call again with offset ${4 + returned}`,
    );
    // Summary rows leave out test resolutions and stage detail.
    expect(data?.rows[0]).not.toHaveProperty("testResolutions");
    expect(data?.rows[0]?.proofStages).toStrictEqual({
      semanticInventory: "missing",
    });
    expect(data).toHaveProperty("migrationPlanSummary");
    expect(data).not.toHaveProperty("migrationPlan");
  });

  test("cuts a single row past the budget and names what it left out", async () => {
    quietStatus();
    const result = await executeCoverage(
      { limit: 1 },
      context(coverage([row(0, 40_000)], 1)),
    );
    const data = result.structuredContent as Record<string, unknown>;
    expect(JSON.stringify(data).length).toBeLessThanOrEqual(
      RESULT_BUDGET_CHARS,
    );
    expect(data.truncated).toBe(true);
    expect(data.truncation).toMatchObject({ returned: 1 });
    expect(data.truncation).not.toHaveProperty("nextOffset");
    expect(data.omittedFields).toContain("rows.0.note");
  });

  test("keeps a result that fits as it is", async () => {
    quietStatus();
    const result = await executeCoverage(
      { limit: 3 },
      context(coverage([row(0, 10), row(1, 10)], 2)),
    );
    expect(result.structuredContent?.rows).toHaveLength(2);
    expect(result.structuredContent).not.toHaveProperty("truncated");
  });

  test("counts a page cut without a matched count", async () => {
    quietStatus();
    const rows = Array.from({ length: 10 }, (_, index) => row(index));
    const prolog = engine((goal) =>
      goal.includes("coverage_report_json") ? { summary: {}, rows } : {},
    );
    const result = await executeCoverage({ limit: 10 }, context(prolog));
    const truncation = result.structuredContent?.truncation;
    expect(truncation?.returned).toBeLessThan(10);
    expect(truncation).not.toHaveProperty("total");
    expect(truncation).not.toHaveProperty("nextOffset");
  });

  test("lists every row and full plans for a reader of the whole report", async () => {
    quietStatus();
    const rows = Array.from({ length: 10 }, (_, index) => row(index));
    const marked = withFullListing({ limit: 10 });
    expect((marked as Record<symbol, unknown>)[COVERAGE_FULL_LISTING]).toBe(
      true,
    );
    const result = await executeCoverage(marked, context(coverage(rows, 10)));
    expect(result.structuredContent?.rows).toHaveLength(10);
    expect(result.structuredContent?.rows[0]).toHaveProperty("testResolutions");
    expect(result.structuredContent).toHaveProperty("migrationPlan");
    expect(result.structuredContent).not.toHaveProperty("truncated");
    const viaOptions = await executeCoverage(
      { limit: 10 },
      context(coverage(rows, 10)),
      { fullListing: true },
    );
    expect(viaOptions.structuredContent?.rows).toHaveLength(10);
  });

  test("honours a smaller budget from its caller", async () => {
    quietStatus();
    const rows = Array.from({ length: 5 }, (_, index) => row(index, 500));
    const result = await executeCoverage(
      { limit: 5 },
      context(coverage(rows, 5)),
      { budget: 4000 },
    );
    expect(JSON.stringify(result.structuredContent).length).toBeLessThanOrEqual(
      4000,
    );
    expect(result.structuredContent?.truncation?.budgetChars).toBe(4000);
  });
});

describe("summarizeCoverageRow", () => {
  test("keeps each stage's status and leaves out evidence without one", () => {
    expect(
      summarizeCoverageRow({
        id: "REQ-a",
        testResolutions: [],
        proofStages: {
          semanticInventory: { status: "met", detail: "long" },
          sourceCoordinates: { missingSymbols: ["SYM-gone"] },
          logicGrounding: "blocked",
          contradictions: null,
          batches: ["a"],
        },
      }),
    ).toStrictEqual({
      id: "REQ-a",
      proofStages: {
        semanticInventory: "met",
        logicGrounding: "blocked",
        contradictions: null,
        batches: ["a"],
      },
    });
  });

  test("drops test resolutions from a row without stages", () => {
    for (const proofStages of [undefined, null, ["a"], "x"]) {
      expect(
        summarizeCoverageRow({ id: "REQ-a", testResolutions: [], proofStages }),
      ).toStrictEqual({ id: "REQ-a" });
    }
  });
});

describe("coverageCheckTime", () => {
  test("rounds up to the end of its window, so repeated calls reuse the report", () => {
    expect(coverageCheckTime(new Date("2026-03-04T05:06:07.000Z"))).toBe(
      "2026-03-04T05:15:00.000Z",
    );
    expect(coverageCheckTime(new Date("2026-03-04T05:14:59.999Z"))).toBe(
      "2026-03-04T05:15:00.000Z",
    );
    expect(coverageCheckTime(new Date("2026-03-04T05:15:00.000Z"))).toBe(
      "2026-03-04T05:15:00.000Z",
    );
    expect(coverageCheckTime(new Date("2026-03-04T05:15:00.001Z"))).toBe(
      "2026-03-04T05:30:00.000Z",
    );
  });
});

describe("kb_graph paging", () => {
  test("returns the nodes from the offset with the edges that leave them", async () => {
    const prolog = engine(() => ({
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "A" },
      ],
    }));
    const result = await executeGraph(
      { seedIds: ["A"], offset: 1 },
      context(prolog),
    );
    expect(result.structuredContent).toMatchObject({
      nodes: [{ id: "B" }, { id: "C" }],
      edges: [
        { from: "B", to: "C" },
        { from: "C", to: "A" },
      ],
      nodeCount: 3,
    });
  });
});
