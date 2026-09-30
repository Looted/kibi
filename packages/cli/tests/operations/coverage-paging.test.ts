import { describe, expect, test } from "bun:test";
import type { PrologPort } from "../../src/public/operations/runtime-types.js";
import {
  COVERAGE_ROW_PAGE_SIZE,
  readCoveragePages,
} from "../../src/public/operations/specs/reporting.js";

// Whole-KB coverage reports are read in bounded row pages so no single
// engine answer approaches the Prolog output cap.

function fakePort(totalRows: number): {
  port: NonNullable<Parameters<typeof readCoveragePages>[0]>;
  requests: Array<{ limit: number; offset: number }>;
} {
  const requests: Array<{ limit: number; offset: number }> = [];
  const port = {
    oneShotMode: true,
    query: async (goal: string) => {
      const match = goal.match(/cov\((\d+),(\d+)\)/);
      const limit = Number(match?.[1]);
      const offset = Number(match?.[2]);
      requests.push({ limit, offset });
      const rows = Array.from(
        { length: Math.max(0, Math.min(limit, totalRows - offset)) },
        (_, index) => ({ id: `REQ-${offset + index}` }),
      );
      const payload = {
        summary: { total: totalRows },
        rows,
        meta: { page: requests.length },
      };
      return {
        success: true,
        bindings: { JsonString: JSON.stringify(JSON.stringify(payload)) },
      };
    },
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  } as unknown as PrologPort;
  return { port, requests };
}

const goalFor = (limit: number, offset: number): string =>
  `cov(${limit},${offset})`;

describe("readCoveragePages", () => {
  test("reads a small request in one query", async () => {
    const { port, requests } = fakePort(100);
    const payload = await readCoveragePages(port, goalFor, 5, 3);
    expect(requests).toEqual([{ limit: 5, offset: 3 }]);
    expect(payload.rows.map((row) => row.id)).toEqual([
      "REQ-3",
      "REQ-4",
      "REQ-5",
      "REQ-6",
      "REQ-7",
    ]);
  });

  test("pages a whole-KB request and keeps the first page's summary and meta", async () => {
    const total = COVERAGE_ROW_PAGE_SIZE * 3 + 4;
    const { port, requests } = fakePort(total);
    const payload = await readCoveragePages(port, goalFor, 100_000, 0);
    expect(payload.rows).toHaveLength(total);
    expect(payload.rows.map((row) => row.id)).toEqual(
      Array.from({ length: total }, (_, index) => `REQ-${index}`),
    );
    expect(payload.summary).toEqual({ total });
    expect(payload.meta).toEqual({ page: 1 });
    expect(
      requests.every((request) => request.limit <= COVERAGE_ROW_PAGE_SIZE),
    ).toBe(true);
    // Stops after the first short page instead of probing further.
    expect(requests).toHaveLength(4);
  });

  test("honors the requested limit and offset across pages", async () => {
    const { port, requests } = fakePort(1_000);
    const limit = COVERAGE_ROW_PAGE_SIZE * 2 + 3;
    const payload = await readCoveragePages(port, goalFor, limit, 7);
    expect(payload.rows).toHaveLength(limit);
    expect(payload.rows[0]?.id).toBe("REQ-7");
    expect(payload.rows.at(-1)?.id).toBe(`REQ-${7 + limit - 1}`);
    expect(requests.at(-1)).toEqual({
      limit: 3,
      offset: 7 + COVERAGE_ROW_PAGE_SIZE * 2,
    });
  });

  test("an exactly page-aligned report issues one empty trailing read", async () => {
    const total = COVERAGE_ROW_PAGE_SIZE * 2;
    const { port, requests } = fakePort(total);
    const payload = await readCoveragePages(port, goalFor, 100_000, 0);
    expect(payload.rows).toHaveLength(total);
    expect(requests).toHaveLength(3);
  });
});
