import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbCoverage } from "../../src/tools/coverage.js";

describe("MCP coverage tool handler", () => {
  test("returns summary rows and metadata", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          summary: {
            total: 2,
            fullyCovered: 1,
            uncovered: 0,
            evaluated: 1,
            notApplicable: 1,
            missingScenario: 1,
            missingTest: 0,
            missingScenarioAndTest: 0,
          },
          rows: [
            {
              id: "REQ-002",
              title: "Payment processing",
              status: "open",
              scenarioCount: 0,
              testCount: 1,
              directSymbolCount: 2,
              transitiveSymbolCount: 2,
              gaps: ["missing_scenario"],
            },
          ],
          meta: {
            branch: "feature/discovery-bundle",
            snapshotId: "stamp:123",
            syncedAt: "2026-03-22T12:00:00Z",
            dirty: false,
          },
        }),
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbCoverage(prolog, { by: "req" });

    expect(result.structuredContent?.summary.total).toBe(2);
    expect(result.structuredContent?.rows[0]?.gaps).toContain(
      "missing_scenario",
    );
    expect(result.content[0]?.text).toContain("fully covered");
  });

  test("forwards includePassing and includeTransitive options to Prolog", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          summary: { total: 0, fullyCovered: 0 },
          rows: [],
        }),
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    await handleKbCoverage(prolog, {
      by: "req",
      includePassing: false,
      includeTransitive: false,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]?.[0] ?? "")).toContain(
      ", false, false, 100, 0, JsonString)",
    );
  });
});
