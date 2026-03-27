import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { PrologProcess as RealPrologProcess } from "kibi-cli/prolog";
import { handleKbCoverage } from "../../src/tools/coverage.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import {
  setupIsolatedCore,
  type IsolatedCoreFixture,
} from "./discovery-root-fixture.js";

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

describe("kb_coverage isolated-core regression (issue #118)", () => {
  let prolog: RealPrologProcess;
  let fixture: IsolatedCoreFixture;

  beforeAll(async () => {
    fixture = setupIsolatedCore();
    prolog = new RealPrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    await prolog.query(`kb_attach('${fixture.kbDataDir}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
    fixture.cleanup();
  });

  test("coverage succeeds from isolated core root with includePassing and includeTransitive", async () => {
    // Seed entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-118-COV-1",
      properties: {
        title: "Issue 118 coverage req 1",
        status: "open",
        priority: "must",
      },
    });
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-118-COV-2",
      properties: { title: "Issue 118 coverage req 2", status: "open" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "SCEN-118-COV-1",
      properties: { title: "Issue 118 coverage scenario", status: "active" },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "TEST-118-COV-1",
      properties: { title: "Issue 118 coverage test", status: "passing" },
    });

    // Create relationships on REQ-118-COV-1
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-118-COV-1",
      properties: {
        title: "Issue 118 coverage req 1",
        status: "open",
        priority: "must",
      },
      relationships: [
        { type: "specified_by", from: "REQ-118-COV-1", to: "SCEN-118-COV-1" },
        { type: "verified_by", from: "REQ-118-COV-1", to: "TEST-118-COV-1" },
      ],
    });

    // Call with includePassing: true, includeTransitive: true
    const result = await handleKbCoverage(prolog, {
      by: "req",
      includePassing: true,
      includeTransitive: true,
    });

    expect(result.structuredContent?.summary.total).toBe(2);
    expect(result.structuredContent?.summary.fullyCovered).toBe(1);

    const rows = result.structuredContent?.rows ?? [];
    const row1 = rows.find(
      (r) => (r as Record<string, unknown>).id === "REQ-118-COV-1",
    ) as Record<string, unknown> | undefined;
    const row2 = rows.find(
      (r) => (r as Record<string, unknown>).id === "REQ-118-COV-2",
    ) as Record<string, unknown> | undefined;

    expect(row1?.coverageStatus).toBe("fully_covered");
    expect(row2?.evaluated).toBe(false);

    // Second call with includePassing: false, includeTransitive: false
    const result2 = await handleKbCoverage(prolog, {
      by: "req",
      includePassing: false,
      includeTransitive: false,
    });
    expect(result2.structuredContent).not.toBeNull();
    expect(result2.structuredContent).toBeDefined();
  });
});
