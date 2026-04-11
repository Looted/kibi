import { afterEach, describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbCoverage } from "../../src/tools/coverage.js";
import { handleKbFindGaps } from "../../src/tools/find-gaps.js";
import { handleKbGraph } from "../../src/tools/graph.js";
import { handleKbSearch } from "../../src/tools/search.js";
import { handleKbStatus } from "../../src/tools/status.js";

function createFailingProlog(error: string): PrologProcess {
  return {
    query: mock(async () => ({
      success: false,
      bindings: {},
      error,
    })),
  } as unknown as PrologProcess;
}

afterEach(() => {
  mock.restore();
});

describe("MCP tool handler error wrappers", () => {
  test("rejects blank kb_search queries before execution", async () => {
    await expect(
      handleKbSearch(createFailingProlog("unused"), { query: "  \n\t  " }),
    ).rejects.toThrow(
      "Search execution failed: query must be a non-empty string",
    );
  });

  test("wraps non-prefixed kb_search failures", async () => {
    await expect(
      handleKbSearch(createFailingProlog("backend unavailable"), {
        query: "oauth",
      }),
    ).rejects.toThrow("Search execution failed: backend unavailable");
  });

  test("rethrows already-prefixed kb_search failures unchanged", async () => {
    await expect(
      handleKbSearch(
        createFailingProlog("Search execution failed: backend unavailable"),
        {
          query: "oauth",
        },
      ),
    ).rejects.toThrow("Search execution failed: backend unavailable");
  });

  test("wraps kb_coverage failures", async () => {
    await expect(
      handleKbCoverage(createFailingProlog("coverage backend unavailable"), {
        by: "req",
      }),
    ).rejects.toThrow(
      "Coverage execution failed: Coverage execution query failed: coverage backend unavailable",
    );
  });

  test("wraps kb_find_gaps failures", async () => {
    await expect(
      handleKbFindGaps(createFailingProlog("gap backend unavailable"), {
        type: "req",
      }),
    ).rejects.toThrow(
      "Find-gaps execution failed: Find-gaps execution query failed: gap backend unavailable",
    );
  });

  test("wraps kb_graph failures", async () => {
    await expect(
      handleKbGraph(createFailingProlog("graph backend unavailable"), {
        seedIds: ["REQ-001"],
      }),
    ).rejects.toThrow(
      "Graph execution failed: Graph execution query failed: graph backend unavailable",
    );
  });

  test("wraps kb_status failures", async () => {
    await expect(
      handleKbStatus(createFailingProlog("status backend unavailable"), {}),
    ).rejects.toThrow(
      "Status execution failed: Status execution query failed: status backend unavailable",
    );
  });
});
