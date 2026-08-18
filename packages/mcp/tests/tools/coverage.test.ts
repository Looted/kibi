import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { PrologProcess as RealPrologProcess } from "kibi-cli/prolog";
import { handleKbCoverage } from "../../src/tools/coverage.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import {
  type IsolatedCoreFixture,
  setupIsolatedCore,
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
            proofProven: 0,
            proofUnresolved: 0,
            proofMissing: 2,
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
              coverageDepth: "direct_passing_e2e",
              coverage_depth: "direct_passing_e2e",
              directTests: ["TEST-002-E2E"],
              scenarioTests: [],
              testStatuses: ["passing"],
              verificationScopes: ["end_to_end"],
              gaps: ["missing_scenario"],
              proofVersion: "kibi.requirement-proof.v2",
              proofStatus: "missing",
              proofGaps: ["missing_semantic_inventory"],
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

    const prolog = {
      query,
      invalidateCache: () => {},
    } as unknown as PrologProcess;
    const result = await handleKbCoverage(prolog, { by: "req" });

    expect(result.structuredContent?.summary.total).toBe(2);
    expect(result.structuredContent?.rows[0]?.coverageDepth).toBe(
      "direct_passing_e2e",
    );
    expect(result.structuredContent?.rows[0]?.coverage_depth).toBe(
      "direct_passing_e2e",
    );
    expect(result.structuredContent?.rows[0]?.directTests).toEqual([
      "TEST-002-E2E",
    ]);
    expect(result.structuredContent?.rows[0]?.gaps).toContain(
      "missing_scenario",
    );
    expect(result.structuredContent?.rows[0]?.proofStatus).toBe("missing");
    expect(result.structuredContent?.repairPlan).toMatchObject({
      version: "kibi.repair-plan.v1",
      readOnly: true,
      status: "partial",
      scope: {
        complete: false,
        actionableRequirements: 2,
        returnedActionableRequirements: 1,
      },
    });
    expect(result.structuredContent?.repairPlan?.batches[0]).toMatchObject({
      phase: "semantic_inventory",
      requirementId: "REQ-002",
      state: "ready",
      autoApplicable: false,
    });
    expect(result.content[0]?.text).toContain("structurally covered");
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

    const prolog = {
      query,
      invalidateCache: () => {},
    } as unknown as PrologProcess;
    await handleKbCoverage(prolog, {
      by: "req",
      includePassing: false,
      includeTransitive: false,
    });

    // Coverage now appends the status-derived migration fragment when the
    // workspace attachment is available, so the Prolog query is followed by
    // a read-only status query. Assert the coverage invocation itself.
    expect(query.mock.calls.length).toBeGreaterThanOrEqual(1);
    const coverageCall = query.mock.calls.find((call) =>
      String((call as unknown[])[0]).includes("coverage_report_json"),
    );
    expect(coverageCall).toBeDefined();
    const firstCall = coverageCall as unknown as unknown[];
    expect(String(firstCall[0])).toContain(
      ", false, false, 100, 0, 'unknown', ",
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
      properties: {
        title: "Issue 118 coverage test",
        status: "passing",
        verification_scope: "end_to_end",
      },
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
    expect(row1?.proofStatus).toBe("missing");
    expect(row1?.proofGaps).toContain("missing_semantic_inventory");
    expect(row1?.proofGaps).toContain("missing_scenario_test");
    expect(row1?.coverageDepth).toBe("direct_passing_e2e");
    expect(row1?.coverage_depth).toBe("direct_passing_e2e");
    expect(row1?.directTests).toEqual(["TEST-118-COV-1"]);
    expect(row1?.verificationScopes).toEqual(["end_to_end"]);
    expect(row2?.evaluated).toBe(false);
    expect(row2?.coverageDepth).toBe("no_test_evidence");

    // Second call with includePassing: false, includeTransitive: false
    const result2 = await handleKbCoverage(prolog, {
      by: "req",
      includePassing: false,
      includeTransitive: false,
    });
    expect(result2.structuredContent).not.toBeNull();
    expect(result2.structuredContent).toBeDefined();
  }, 30000);

  test("exposes the shared read-only legacy migration plan through MCP coverage", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-migration-preview-"),
    );
    try {
      const source = ".kb/requirements/REQ-MCP-MIGRATION.md";
      mkdirSync(path.join(workspaceRoot, ".kb/requirements"), {
        recursive: true,
      });
      writeFileSync(
        path.join(workspaceRoot, source),
        "---\nid: REQ-MCP-MIGRATION\ntitle: MCP migration preview\nstatus: open\n---\n\nWhen an operator requests a legacy migration preview, Kibi must return one read-only source-bound review batch.\n",
        "utf8",
      );
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-MCP-MIGRATION",
        properties: {
          title: "MCP migration preview",
          status: "open",
          source,
        },
      });

      const result = await handleKbCoverage(
        prolog,
        {
          by: "req",
          includeMigrationPreview: true,
          migrationLimit: 10,
          migrationPredicateMinScore: 0,
        },
        {
          workspaceRoot,
          signal: new AbortController().signal,
          clock: () => new Date("2026-08-11T12:00:00Z"),
        },
      );
      const plan = result.structuredContent?.legacyMigrationPlan;
      const batch = plan?.batches.find(
        (candidate) => candidate.requirementId === "REQ-MCP-MIGRATION",
      );
      expect(plan?.version).toBe("kibi.legacy-migration-plan.v1");
      expect(plan?.readOnly).toBe(true);
      expect(plan?.scope.limit).toBe(10);
      expect(batch?.autoApplicable).toBe(false);
      expect(batch?.sourceBinding.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(batch?.propositions).not.toHaveLength(0);
      expect(
        batch?.propositions.every(
          (proposition) =>
            proposition.reviewRequired &&
            proposition.predicateCandidates.every(
              (candidate) => candidate.writeEligible === false,
            ),
        ),
      ).toBe(true);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  }, 30000);
});
