import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";
import { handleKbCoverageReport } from "../../src/tools/coverage-report.js";
import { handleKbDerive } from "../../src/tools/derive.js";
import { handleKbImpact } from "../../src/tools/impact.js";

describe("MCP Inference Tool Handlers", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "kibi-mcp-inference-"),
    );

    prolog = new PrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    await prolog.query(`kb_attach('${testKbPath}')`);

    await seedGraph(prolog);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }

    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("kb_derive transitively_implements returns deterministic rows", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "transitively_implements",
      params: { req: "req-base" },
    });

    expect(result.structuredContent.rule).toBe("transitively_implements");
    expect(result.structuredContent.count).toBeGreaterThanOrEqual(2);
    expect(result.structuredContent.rows[0]).toHaveProperty("symbol");
    expect(result.structuredContent.rows[0]).toHaveProperty("req", "req-base");
  });

  test("kb_derive transitively_depends traverses dependency chain", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "transitively_depends",
      params: { req1: "req-ui", req2: "req-base" },
    });

    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.rows[0]).toEqual({
      req1: "req-ui",
      req2: "req-base",
    });
  });

  test("kb_derive coverage_gap finds MUST gaps", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "coverage_gap",
      params: { req: "req-gap" },
    });

    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.rows[0]).toEqual({
      req: "req-gap",
      reason: "missing_scenario_and_test",
    });
  });

  test("kb_derive affected_symbols returns impacted symbols", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "affected_symbols",
      params: { req: "req-base" },
    });

    expect(result.structuredContent.count).toBeGreaterThanOrEqual(2);
    const symbols = result.structuredContent.rows.map(
      (row) => row.symbol as string,
    );
    expect(symbols).toContain("symbol-core");
    expect(symbols).toContain("symbol-via-test");
  });

  test("kb_derive stale supports max_age_days", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "stale",
      params: { max_age_days: 30 },
    });

    const staleIds = result.structuredContent.rows.map(
      (row) => row.entity as string,
    );
    expect(staleIds).toContain("req-legacy");
  });

  test("kb_derive orphaned returns symbols without links", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "orphaned",
      params: { symbol: "symbol-orphan" },
    });

    expect(result.structuredContent.rows).toEqual([
      { symbol: "symbol-orphan" },
    ]);
  });

  test("kb_derive conflicting returns ADR conflicts", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "conflicting",
    });

    expect(result.structuredContent.count).toBeGreaterThanOrEqual(1);
    expect(result.structuredContent.rows).toContainEqual({
      adr1: "adr-a",
      adr2: "adr-b",
    });
  });

  test("kb_derive deprecated_still_used returns symbols", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "deprecated_still_used",
      params: { adr: "adr-legacy" },
    });

    expect(result.structuredContent.rows[0]).toEqual({
      adr: "adr-legacy",
      symbols: ["symbol-core"],
    });
  });

  test("kb_derive current_adr returns active ADRs", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "current_adr",
      params: {},
    });

    expect(result.structuredContent.rule).toBe("current_adr");
    expect(result.structuredContent.count).toBeGreaterThanOrEqual(1);
    expect(result.structuredContent.rows).toContainEqual({
      id: "adr-a",
      title: "ADR A",
    });
  });

  test("kb_derive adr_chain returns temporal chain", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "adr_chain",
      params: { adr: "adr-legacy" },
    });

    expect(result.structuredContent.rule).toBe("adr_chain");
    expect(result.structuredContent.count).toBe(2);
    expect(result.structuredContent.rows).toContainEqual({
      id: "adr-legacy",
      title: "Legacy ADR",
      status: "deprecated",
    });
    expect(result.structuredContent.rows).toContainEqual({
      id: "adr-new",
      title: "New ADR",
      status: "active",
    });
  });

  test("kb_derive superseded_by returns direct successor", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "superseded_by",
      params: { adr: "adr-legacy" },
    });

    expect(result.structuredContent.rule).toBe("superseded_by");
    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.rows[0]).toEqual({
      adr: "adr-legacy",
      successor_id: "adr-new",
      successor_title: "New ADR",
    });
  });

  test("kb_derive domain_contradictions returns conflicting requirements", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "domain_contradictions",
      params: {},
    });

    expect(result.structuredContent.rule).toBe("domain_contradictions");
    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.rows[0]).toEqual({
      reqA: "req-role-2",
      reqB: "req-role-3",
      reason: "Conflict on fact-user-role: fact-limit-2 vs fact-limit-3",
    });
  });

  test("kb_impact returns typed impacted entities", async () => {
    const result = await handleKbImpact(prolog, { entity: "req-base" });

    expect(result.structuredContent.entity).toBe("req-base");
    expect(result.structuredContent.count).toBeGreaterThan(0);
    expect(
      result.structuredContent.impacted.some((x) => x.id === "req-ui"),
    ).toBe(true);
  });

  test("kb_coverage_report (all) returns req and symbol stats", async () => {
    const result = await handleKbCoverageReport(prolog, {});

    expect(result.structuredContent.requested_type).toBe("all");
    expect(result.structuredContent.coverage.requirements).toBeDefined();
    expect(result.structuredContent.coverage.symbols).toBeDefined();
    expect(result.structuredContent.coverage.requirements?.gaps).toContainEqual(
      {
        req: "req-gap",
        reason: "missing_scenario_and_test",
      },
    );
  });

  test("kb_coverage_report accepts focused type filter", async () => {
    const result = await handleKbCoverageReport(prolog, { type: "symbol" });

    expect(result.structuredContent.requested_type).toBe("symbol");
    expect(result.structuredContent.coverage.symbols).toBeDefined();
    expect(result.structuredContent.coverage.requirements).toBeUndefined();
  });
});

async function seedGraph(prolog: PrologProcess): Promise<void> {
  const standardTime = "2026-02-20T00:00:00Z";
  const legacyTime = "2020-01-01T00:00:00Z";

  const goals = [
    `kb_assert_entity(req, [id='req-base', title="Base requirement", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference", priority=must])`,
    `kb_assert_entity(req, [id='req-ui', title="UI requirement", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(req, [id='req-gap', title="Gap requirement", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference", priority=must])`,
    `kb_assert_entity(req, [id='req-legacy', title="Legacy requirement", status=active, created_at="${legacyTime}", updated_at="${legacyTime}", source="test://inference"])`,
    `kb_assert_entity(req, [id='req-role-2', title="Users have max 2 roles", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(req, [id='req-role-3', title="Users have max 3 roles", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(test, [id='test-base', title="Test validates base", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(symbol, [id='symbol-core', title="Core symbol", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(symbol, [id='symbol-via-test', title="Symbol tested against base", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(symbol, [id='symbol-orphan', title="Orphan symbol", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(symbol, [id='symbol-conflict', title="Conflict symbol", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(adr, [id='adr-legacy', title="Legacy ADR", status=deprecated, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(adr, [id='adr-a', title="ADR A", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(adr, [id='adr-b', title="ADR B", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(adr, [id='adr-new', title="New ADR", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(fact, [id='fact-user-role', title="User Role Assignment", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(fact, [id='fact-limit-2', title="Maximum of Two", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(fact, [id='fact-limit-3', title="Maximum of Three", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    "kb_assert_relationship(depends_on, 'req-ui', 'req-base', [])",
    "kb_assert_relationship(validates, 'test-base', 'req-base', [])",
    "kb_assert_relationship(implements, 'symbol-core', 'req-base', [])",
    "kb_assert_relationship(covered_by, 'symbol-via-test', 'test-base', [])",
    "kb_assert_relationship(constrained_by, 'symbol-core', 'adr-legacy', [])",
    "kb_assert_relationship(constrained_by, 'symbol-conflict', 'adr-a', [])",
    "kb_assert_relationship(constrained_by, 'symbol-conflict', 'adr-b', [])",
    "kb_assert_relationship(supersedes, 'adr-new', 'adr-legacy', [])",
    "kb_assert_relationship(constrains, 'req-role-2', 'fact-user-role', [])",
    "kb_assert_relationship(constrains, 'req-role-3', 'fact-user-role', [])",
    "kb_assert_relationship(requires_property, 'req-role-2', 'fact-limit-2', [])",
    "kb_assert_relationship(requires_property, 'req-role-3', 'fact-limit-3', [])",
  ];

  const result = await prolog.query(goals);
  if (!result.success) {
    throw new Error(result.error || "Failed to seed inference graph");
  }

  await prolog.query("kb_save");
}
