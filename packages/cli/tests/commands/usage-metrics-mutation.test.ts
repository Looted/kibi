import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { stripVTControlCharacters } from "node:util";
import {
  type UsageLogRow,
  buildUsageMetricsReport,
  parseUsageLog,
  usageMetricsCommand,
} from "../../src/commands/usage-metrics.js";
import {
  type TelemetryUsageEvent,
  analyzeTelemetryAcceptance,
} from "../../src/public/telemetry-acceptance.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

// Usage-log aggregation and the usage-metrics command, pinned in process
// against a temporary .kb/usage.log.

const NOW = new Date("2026-08-10T12:00:00.000Z");

function build(rows: UsageLogRow[], limit = 10) {
  const { acceptance, ...report } = buildUsageMetricsReport(rows, limit, NOW);
  expect(acceptance).toEqual(analyzeTelemetryAcceptance(rows, NOW));
  return report;
}

describe("buildUsageMetricsReport", () => {
  test("reports an empty log", () => {
    expect(build([])).toEqual({
      rowCount: 0,
      dateRange: { first: null, last: null },
      toolCounts: {},
      branchCounts: {},
      outcomeCounts: { success: 0, error: 0 },
      telemetry: { completeCount: 0, missingCount: 0, completenessRate: 0 },
      zeroResults: { count: 0, rate: 0, byTool: {}, topSourceFiles: [] },
      kbCheck: { violationTrend: [] },
      upsertErrors: { categories: {} },
      errors: { categories: {}, stages: {}, byTool: {} },
    });
  });

  test("uses the default clock for acceptance", () => {
    const before = Date.now();
    const report = buildUsageMetricsReport([], 10);
    const evaluatedAt = new Date(report.acceptance.evaluatedAt);
    expect(evaluatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(evaluatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(report.acceptance).toEqual(
      analyzeTelemetryAcceptance([], evaluatedAt),
    );
  });

  test("sorts string timestamps and ignores the rest", () => {
    const report = build([
      { timestamp: "2026-05-03T00:00:00.000Z" },
      { timestamp: 7 as never },
      { timestamp: "2026-05-01T00:00:00.000Z" },
      {},
      { timestamp: "2026-05-02T00:00:00.000Z" },
    ]);
    expect(report.dateRange).toEqual({
      first: "2026-05-01T00:00:00.000Z",
      last: "2026-05-03T00:00:00.000Z",
    });
    expect(
      build([{ timestamp: "2026-05-01T00:00:00.000Z" }]).dateRange,
    ).toEqual({
      first: "2026-05-01T00:00:00.000Z",
      last: "2026-05-01T00:00:00.000Z",
    });
  });

  test("counts tools and branches, most frequent first then by name", () => {
    const report = build([
      { tool: "kb_query", active_branch: "main", branch: "ignored" },
      { tool: "kb_query", branch: "feature" },
      { tool: "kb_status", active_branch: "", branch: "feature" },
      { tool: "  ", active_branch: "   " },
      { tool: "kb_check" },
      { tool: "kb_query", active_branch: "main" },
    ]);
    expect(Object.entries(report.toolCounts)).toEqual([
      ["kb_query", 3],
      ["kb_check", 1],
      ["kb_status", 1],
      ["unknown", 1],
    ]);
    expect(Object.entries(report.branchCounts)).toEqual([
      ["feature", 2],
      ["main", 2],
      ["unknown", 2],
    ]);
  });

  test("derives outcomes from status, then the success flag", () => {
    const report = build([
      { status: "success" },
      { status: "success", success: false },
      { status: "error", success: true, tool: "kb_query" },
      { status: "pending", success: true },
      { status: "pending", success: false },
      { success: "yes" as never },
      {},
    ]);
    expect(report.outcomeCounts).toEqual({ success: 3, error: 2 });
    expect(report.errors.byTool).toEqual({ kb_query: 1, unknown: 1 });
  });

  test("categorizes errors by explicit fields, then by message", () => {
    const report = build([
      { status: "error", error_category: "given", error_stage: "stage" },
      { status: "error", error_message: "query failed: x", error: "ignored" },
      { status: "error", error: "Prolog process not started" },
      { status: "error" },
    ]);
    expect(report.errors.categories).toEqual({
      given: 1,
      prolog_process_not_started: 1,
      "Unknown error": 1,
      prolog_query_failed: 1,
    });
    expect(report.errors.stages).toEqual({
      prolog_lifecycle: 1,
      prolog_runtime: 1,
      stage: 1,
      unknown: 1,
    });
  });

  test.each([
    ["STALE_SNAPSHOT: retry", "stale_snapshot", "persistence"],
    [
      "Unknown option --x; use -h for help",
      "prolog_unknown_option",
      "prolog_runtime",
    ],
    ["unknown option --x", "unknown option --x", "prolog_runtime"],
    ["h for help: nothing", "h for help", "unknown"],
    [
      "prolog process not started: query failed",
      "prolog_process_not_started",
      "prolog_runtime",
    ],
    [
      "Linked coarsely while granular symbols are available; fix",
      "coarse_symbol_linkage",
      "validation",
    ],
    [
      "Module load failed: query failed",
      "prolog_module_load_failed",
      "prolog_runtime",
    ],
    ["Query failed; x", "prolog_query_failed", "prolog_runtime"],
    [
      "Entity validation failed: missing title",
      "Entity validation failed",
      "validation",
    ],
    [
      "Entity validation failed: title; status",
      "Entity validation failed",
      "validation",
    ],
    [
      "entity validation failed; lower case",
      "entity validation failed",
      "validation",
    ],
    [
      "Relationship source must match the upserted entity (REQ-1)",
      "Relationship source must match the upserted entity",
      "validation",
    ],
    [
      "relationship source must match: lower case",
      "relationship source must match",
      "validation",
    ],
    ["  disk full ; retry: later", "disk full", "unknown"],
    [";leading semicolon", ";leading semicolon", "unknown"],
    ["  timeout : after 5s", "timeout", "unknown"],
    [":leading colon", ":leading colon", "unknown"],
    ["  plain failure  ", "plain failure", "unknown"],
    ["   ", "Unknown error", "unknown"],
  ])("message %p is category %p at stage %p", (message, category, stage) => {
    const report = build([{ status: "error", error_message: message }]);
    expect(report.errors.categories).toEqual({ [category]: 1 });
    expect(report.errors.stages).toEqual({ [stage]: 1 });
  });

  test("counts telemetry from its status, then its presence", () => {
    const report = build([
      { telemetry_status: "provided", telemetry: null },
      { telemetry_status: "missing", telemetry: {} },
      { telemetry_status: "other", telemetry: {} },
      { telemetry: false },
      { telemetry: null },
      {},
    ]);
    expect(report.telemetry).toEqual({
      completeCount: 3,
      missingCount: 3,
      completenessRate: 0.5,
    });
  });

  test("finds zero results and their source files", () => {
    const report = build(
      [
        { tool: "kb_query", zero_results: true, result_count: 4 },
        { tool: "kb_query", zero_results: false, result_count: 0 },
        { tool: "kb_search", result_count: 0, sourceFile: "src/a.ts" },
        { tool: "kb_search", result_summary: "0 results", sourceFile: " " },
        { result_summary: "1 results", sourceFile: "src/none.ts" },
        { result_count: 1, sourceFile: "src/none.ts" },
        {
          zero_results: true,
          sourceFile: "  ",
          args: { sourceFile: "src/b.ts" },
          business_args: { sourceFile: "src/c.ts" },
        },
        {
          zero_results: true,
          args: { sourceFile: 3 as never },
          business_args: { sourceFile: "src/b.ts" },
        },
        {
          zero_results: true,
          args: { sourceFile: " " },
          business_args: { sourceFile: "src/c.ts" },
        },
        { zero_results: true, business_args: { sourceFile: "  " } },
        { zero_results: true, business_args: {} },
      ],
      2,
    );
    expect(report.zeroResults).toEqual({
      count: 8,
      rate: 8 / 11,
      byTool: { kb_query: 1, kb_search: 2, unknown: 5 },
      topSourceFiles: [
        { sourceFile: "src/b.ts", count: 2 },
        { sourceFile: "src/a.ts", count: 1 },
      ],
    });
    expect(Object.keys(report.zeroResults.byTool)).toEqual([
      "unknown",
      "kb_search",
      "kb_query",
    ]);
  });

  test("keeps the kb_check violation trend in timestamp order", () => {
    const report = build([
      { tool: "kb_check", violation_count: 2, timestamp: "2026-05-02" },
      { tool: "kb_check", violation_count: 5, timestamp: "2026-05-01" },
      { tool: "kb_check", violation_count: 0, timestamp: "2026-05-03" },
      { tool: "kb_check", violation_count: "3" as never, timestamp: "x" },
      { tool: "kb_check", violation_count: 3 },
      { tool: "kb_query", violation_count: 9, timestamp: "2026-05-04" },
    ]);
    expect(report.kbCheck.violationTrend).toEqual([
      { timestamp: "2026-05-01", violationCount: 5 },
      { timestamp: "2026-05-02", violationCount: 2 },
      { timestamp: "2026-05-03", violationCount: 0 },
    ]);
  });

  test("categorizes kb_upsert errors separately", () => {
    const report = build([
      {
        tool: "kb_upsert",
        status: "error",
        error: "Entity validation failed: x",
      },
      { tool: "kb_upsert", status: "error", error_message: "a; b" },
      { tool: "kb_upsert", status: "success", error: "ignored: x" },
      { tool: "kb_query", status: "error", error: "other: x" },
    ]);
    expect(report.upsertErrors.categories).toEqual({
      a: 1,
      "Entity validation failed": 1,
    });
  });
});

describe("parseUsageLog", () => {
  test("parses JSON lines and skips blank ones", () => {
    expect(
      parseUsageLog('{"tool":"kb_query"}\n\n{"tool":"kb_check"}\n').map(
        (row) => row.tool,
      ),
    ).toEqual(["kb_query", "kb_check"]);
  });
});

describe("usageMetricsCommand", () => {
  let root: string;
  let logs: string[];
  let errors: string[];
  let restores: Array<() => void>;

  beforeEach(() => {
    root = createTempDir("kibi-usage-metrics-mut-");
    logs = [];
    errors = [];
    const cwd = spyOn(process, "cwd").mockReturnValue(root);
    const log = spyOn(console, "log").mockImplementation((value: unknown) => {
      logs.push(stripVTControlCharacters(String(value)));
    });
    const error = spyOn(console, "error").mockImplementation(
      (value: unknown) => {
        errors.push(String(value));
      },
    );
    restores = [
      () => cwd.mockRestore(),
      () => log.mockRestore(),
      () => error.mockRestore(),
    ];
  });

  afterEach(() => {
    for (const restore of restores) restore();
    removeTempDir(root);
  });

  function writeLog(rows: readonly object[]): void {
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "usage.log"),
      rows.map((row) => JSON.stringify(row)).join("\n"),
    );
  }

  function minutesAgo(minutes: number): string {
    return new Date(Date.now() - minutes * 60_000).toISOString();
  }

  function passingRows(): TelemetryUsageEvent[] {
    const base = (minutes: number) =>
      ({
        timestamp: minutesAgo(minutes),
        status: "success",
        telemetry_status: "provided",
        telemetry: { is_autonomous: true },
      }) as const;
    const hash = "a".repeat(64);
    const properties = {
      status: "open",
      title: "Telemetry acceptance",
      semantic_source_hash: hash,
    };
    return [
      ...Array.from({ length: 20 }, (_, index) => ({
        ...base(40 - index),
        tool: "kb_status",
        business_args: {},
      })),
      {
        ...base(18),
        tool: "kb_semantic_advisor",
        semantic_source_hash: hash,
        business_args: { id: "REQ-TELEMETRY", text: "Telemetry must pass." },
      },
      {
        ...base(17),
        tool: "kb_validate_upsert",
        validation_valid: true,
        business_args: { type: "req", id: "REQ-TELEMETRY", properties },
      },
      {
        ...base(16),
        tool: "kb_upsert",
        semantic_source_hash: hash,
        business_args: { id: "REQ-TELEMETRY", type: "req", properties },
      },
      {
        ...base(15),
        tool: "kb_query",
        zero_results: false,
        result_count: 1,
        business_args: { sourceFile: "src/telemetry.ts" },
      },
      {
        ...base(14),
        tool: "kb_coverage",
        coverage_by: "req",
        coverage_scope_complete: true,
        coverage_proof_gap_count: 0,
        coverage_receipt_gap_count: 0,
        business_args: { by: "req", includePassing: true, limit: 500 },
      },
    ];
  }

  test.each(["0", "-2", "abc", "0x"])("rejects --limit %p", async (limit) => {
    writeLog([]);
    expect(await usageMetricsCommand({ limit })).toEqual({
      exitCode: 1,
    });
    expect(errors).toEqual(["Error: --limit must be a positive integer"]);
  });

  test("reports a missing usage log", async () => {
    expect(await usageMetricsCommand({})).toEqual({ exitCode: 1 });
    expect(errors).toEqual([
      `Error: usage log not found at ${path.join(root, ".kb", "usage.log")}`,
    ]);
  });

  test("applies the default limit of ten source files", async () => {
    writeLog(
      Array.from({ length: 12 }, (_, index) => ({
        zero_results: true,
        sourceFile: `src/${String(index).padStart(2, "0")}.ts`,
      })),
    );
    expect(await usageMetricsCommand({ format: "json" })).toBeUndefined();
    const report = JSON.parse(logs[0] ?? "{}");
    expect(report.zeroResults.topSourceFiles).toHaveLength(10);
    expect(logs[0]).toBe(JSON.stringify(report, null, 2));
  });

  test("honours a limit of one", async () => {
    writeLog([
      { zero_results: true, sourceFile: "src/a.ts" },
      { zero_results: true, sourceFile: "src/b.ts" },
    ]);
    await usageMetricsCommand({ format: "json", limit: "1" });
    expect(JSON.parse(logs[0] ?? "{}").zeroResults.topSourceFiles).toEqual([
      { sourceFile: "src/a.ts", count: 1 },
    ]);
  });

  test("gates JSON output on acceptance only when asked", async () => {
    writeLog([{ tool: "kb_query" }]);
    expect(await usageMetricsCommand({ format: "json" })).toBeUndefined();
    expect(
      await usageMetricsCommand({ format: "json", requireAcceptance: true }),
    ).toEqual({ exitCode: 1 });
    expect(errors).toEqual([]);
    expect(logs).toHaveLength(2);
  });

  test("passes the gate with complete fresh evidence", async () => {
    writeLog(passingRows());
    expect(
      await usageMetricsCommand({ format: "json", requireAcceptance: true }),
    ).toBeUndefined();
    expect(JSON.parse(logs[0] ?? "{}").acceptance.status).toBe("passed");
    expect(
      await usageMetricsCommand({ format: "table", requireAcceptance: true }),
    ).toBeUndefined();
    expect(errors).toEqual([]);
    expect(logs[1]).toContain("Status: passed; evidence fresh: yes");
  });

  test("explains a failed gate after the tables", async () => {
    writeLog([{ tool: "kb_query" }]);
    expect(await usageMetricsCommand({ requireAcceptance: true })).toEqual({
      exitCode: 1,
    });
    expect(logs).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(
      /^Telemetry acceptance gate: (failed|insufficient_evidence)\. Review the acceptance metrics and quality diagnostics before completion\.$/,
    );
    expect(await usageMetricsCommand({ requireAcceptance: false })).toBe(
      undefined,
    );
    expect(errors).toHaveLength(1);
  });

  test("renders every table for an empty log", async () => {
    writeLog([]);
    await usageMetricsCommand({});
    expect(logs[0]).toMatchInlineSnapshot(`
      "┌────────────────────────┬────────────────────────────────────────────────────────┐
      │ Field                  │ Value                                                  │
      ├────────────────────────┼────────────────────────────────────────────────────────┤
      │ Row Count              │ 0                                                      │
      ├────────────────────────┼────────────────────────────────────────────────────────┤
      │ First Timestamp        │ -                                                      │
      ├────────────────────────┼────────────────────────────────────────────────────────┤
      │ Last Timestamp         │ -                                                      │
      └────────────────────────┴────────────────────────────────────────────────────────┘

      Telemetry Acceptance (kibi.telemetry-acceptance.v1)
      Status: insufficient_evidence; evidence fresh: no
      ┌────────────────────────────────────┬────────────────────────┬──────────────────┬──────────────┐
      │ Metric                             │ Status                 │ Observed         │ Rate         │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ telemetry_completeness             │ insufficient_evidence  │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ advisor_before_requirement_write   │ not_applicable         │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ validation_before_upsert           │ not_applicable         │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ lookup_before_first_edit           │ not_applicable         │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ source_lookup_zero_result_rate     │ not_applicable         │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ proof_gap_recovery                 │ insufficient_evidence  │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ e2e_receipt_freshness              │ insufficient_evidence  │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ repeated_mutation_failures         │ not_applicable         │ 0/0              │ -            │
      └────────────────────────────────────┴────────────────────────┴──────────────────┴──────────────┘

      Tool Counts
      ┌────────────────────────────────────────────────┬────────────┐
      │ Tool                                           │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ -                                              │ 0          │
      └────────────────────────────────────────────────┴────────────┘

      Branch Counts
      ┌────────────────────────────────────────────────┬────────────┐
      │ Branch                                         │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ -                                              │ 0          │
      └────────────────────────────────────────────────┴────────────┘

      Outcome Counts
      ┌────────────────────────────────────────────────┬────────────┐
      │ Outcome                                        │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ success                                        │ 0          │
      ├────────────────────────────────────────────────┼────────────┤
      │ error                                          │ 0          │
      └────────────────────────────────────────────────┴────────────┘

      Telemetry
      ┌────────────────────────────────┬────────────────────────────┐
      │ Metric                         │ Value                      │
      ├────────────────────────────────┼────────────────────────────┤
      │ Complete                       │ 0                          │
      ├────────────────────────────────┼────────────────────────────┤
      │ Missing                        │ 0                          │
      ├────────────────────────────────┼────────────────────────────┤
      │ Completeness Rate              │ 0.0%                       │
      └────────────────────────────────┴────────────────────────────┘

      Zero Results
      ┌────────────────────────────────┬────────────────────────────┐
      │ Metric                         │ Value                      │
      ├────────────────────────────────┼────────────────────────────┤
      │ Count                          │ 0                          │
      ├────────────────────────────────┼────────────────────────────┤
      │ Rate                           │ 0.0%                       │
      └────────────────────────────────┴────────────────────────────┘
      Zero-Result Counts By Tool
      ┌────────────────────────────────────────────────┬────────────┐
      │ Tool                                           │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ -                                              │ 0          │
      └────────────────────────────────────────────────┴────────────┘
      Zero-Result Source Files
      ┌────────────────────────────────────────────────┬──────────────┐
      │ Source File                                    │ Zero Results │
      ├────────────────────────────────────────────────┼──────────────┤
      │ -                                              │ 0            │
      └────────────────────────────────────────────────┴──────────────┘

      KB Check Violation Trend
      ┌────────────────────────────────┬────────────┐
      │ Timestamp                      │ Violations │
      ├────────────────────────────────┼────────────┤
      │ -                              │ 0          │
      └────────────────────────────────┴────────────┘

      Upsert Error Categories
      ┌────────────────────────────────────────────────┬────────────┐
      │ Category                                       │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ -                                              │ 0          │
      └────────────────────────────────────────────────┴────────────┘

      Error Categories
      ┌────────────────────────────────────────────────┬────────────┐
      │ Category                                       │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ -                                              │ 0          │
      └────────────────────────────────────────────────┴────────────┘

      Error Stages
      ┌────────────────────────────────────────────────┬────────────┐
      │ Stage                                          │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ -                                              │ 0          │
      └────────────────────────────────────────────────┴────────────┘

      Errors By Tool
      ┌────────────────────────────────────────────────┬────────────┐
      │ Tool                                           │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ -                                              │ 0          │
      └────────────────────────────────────────────────┴────────────┘"
    `);
  });

  test("renders counts, wrapped long values and rates", async () => {
    writeLog([
      {
        timestamp: "2026-05-01T10:00:00.000Z",
        tool: "kb_check",
        status: "error",
        error_message: "query failed",
        violation_count: 4,
        active_branch: "main",
        telemetry_status: "provided",
      },
      {
        timestamp: "2026-05-01T10:01:00.000Z",
        tool: "kb_upsert",
        status: "error",
        error: "Entity validation failed: x",
        zero_results: true,
        sourceFile:
          "src/a/very/long/path/that/does/not/fit/in/one/column/of/the/table.ts",
      },
      {
        timestamp: "2026-05-01T10:02:00.000Z",
        tool: "kb_query",
        status: "success",
        result_count: 0,
        sourceFile: "src/b.ts",
      },
      {
        tool: "kb_status",
        status: "error",
        error:
          "the knowledge base could not be opened because another process holds the lock",
      },
    ]);
    await usageMetricsCommand({ format: "table" });
    expect(logs[0]).toMatchInlineSnapshot(`
      "┌────────────────────────┬────────────────────────────────────────────────────────┐
      │ Field                  │ Value                                                  │
      ├────────────────────────┼────────────────────────────────────────────────────────┤
      │ Row Count              │ 4                                                      │
      ├────────────────────────┼────────────────────────────────────────────────────────┤
      │ First Timestamp        │ 2026-05-01T10:00:00.000Z                               │
      ├────────────────────────┼────────────────────────────────────────────────────────┤
      │ Last Timestamp         │ 2026-05-01T10:02:00.000Z                               │
      └────────────────────────┴────────────────────────────────────────────────────────┘

      Telemetry Acceptance (kibi.telemetry-acceptance.v1)
      Status: insufficient_evidence; evidence fresh: no
      ┌────────────────────────────────────┬────────────────────────┬──────────────────┬──────────────┐
      │ Metric                             │ Status                 │ Observed         │ Rate         │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ telemetry_completeness             │ insufficient_evidence  │ 1/4              │ 25.0%        │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ advisor_before_requirement_write   │ not_applicable         │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ validation_before_upsert           │ failed                 │ 0/1              │ 0.0%         │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ lookup_before_first_edit           │ not_applicable         │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ source_lookup_zero_result_rate     │ not_applicable         │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ proof_gap_recovery                 │ insufficient_evidence  │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ e2e_receipt_freshness              │ insufficient_evidence  │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ repeated_mutation_failures         │ passed                 │ 0/1              │ -            │
      └────────────────────────────────────┴────────────────────────┴──────────────────┴──────────────┘

      Tool Counts
      ┌────────────────────────────────────────────────┬────────────┐
      │ Tool                                           │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_check                                       │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_query                                       │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_status                                      │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_upsert                                      │ 1          │
      └────────────────────────────────────────────────┴────────────┘

      Branch Counts
      ┌────────────────────────────────────────────────┬────────────┐
      │ Branch                                         │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ unknown                                        │ 3          │
      ├────────────────────────────────────────────────┼────────────┤
      │ main                                           │ 1          │
      └────────────────────────────────────────────────┴────────────┘

      Outcome Counts
      ┌────────────────────────────────────────────────┬────────────┐
      │ Outcome                                        │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ success                                        │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ error                                          │ 3          │
      └────────────────────────────────────────────────┴────────────┘

      Telemetry
      ┌────────────────────────────────┬────────────────────────────┐
      │ Metric                         │ Value                      │
      ├────────────────────────────────┼────────────────────────────┤
      │ Complete                       │ 1                          │
      ├────────────────────────────────┼────────────────────────────┤
      │ Missing                        │ 3                          │
      ├────────────────────────────────┼────────────────────────────┤
      │ Completeness Rate              │ 25.0%                      │
      └────────────────────────────────┴────────────────────────────┘

      Zero Results
      ┌────────────────────────────────┬────────────────────────────┐
      │ Metric                         │ Value                      │
      ├────────────────────────────────┼────────────────────────────┤
      │ Count                          │ 2                          │
      ├────────────────────────────────┼────────────────────────────┤
      │ Rate                           │ 50.0%                      │
      └────────────────────────────────┴────────────────────────────┘
      Zero-Result Counts By Tool
      ┌────────────────────────────────────────────────┬────────────┐
      │ Tool                                           │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_query                                       │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_upsert                                      │ 1          │
      └────────────────────────────────────────────────┴────────────┘
      Zero-Result Source Files
      ┌────────────────────────────────────────────────┬──────────────┐
      │ Source File                                    │ Zero Results │
      ├────────────────────────────────────────────────┼──────────────┤
      │ src/a/very/long/path/that/does/not/fit/in/one… │ 1            │
      ├────────────────────────────────────────────────┼──────────────┤
      │ src/b.ts                                       │ 1            │
      └────────────────────────────────────────────────┴──────────────┘

      KB Check Violation Trend
      ┌────────────────────────────────┬────────────┐
      │ Timestamp                      │ Violations │
      ├────────────────────────────────┼────────────┤
      │ 2026-05-01T10:00:00.000Z       │ 4          │
      └────────────────────────────────┴────────────┘

      Upsert Error Categories
      ┌────────────────────────────────────────────────┬────────────┐
      │ Category                                       │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ Entity validation failed                       │ 1          │
      └────────────────────────────────────────────────┴────────────┘

      Error Categories
      ┌────────────────────────────────────────────────┬────────────┐
      │ Category                                       │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ Entity validation failed                       │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ prolog_query_failed                            │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ the knowledge base could not be opened because │ 1          │
      │ another process holds the lock                 │            │
      └────────────────────────────────────────────────┴────────────┘

      Error Stages
      ┌────────────────────────────────────────────────┬────────────┐
      │ Stage                                          │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ prolog_runtime                                 │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ unknown                                        │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ validation                                     │ 1          │
      └────────────────────────────────────────────────┴────────────┘

      Errors By Tool
      ┌────────────────────────────────────────────────┬────────────┐
      │ Tool                                           │ Count      │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_check                                       │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_status                                      │ 1          │
      ├────────────────────────────────────────────────┼────────────┤
      │ kb_upsert                                      │ 1          │
      └────────────────────────────────────────────────┴────────────┘"
    `);
  });

  test("renders fresh evidence and metric rates", async () => {
    writeLog(passingRows());
    await usageMetricsCommand({});
    const acceptance = (logs[0] ?? "").split("\n\n")[1];
    expect(acceptance).toMatchInlineSnapshot(`
      "Telemetry Acceptance (kibi.telemetry-acceptance.v1)
      Status: passed; evidence fresh: yes
      ┌────────────────────────────────────┬────────────────────────┬──────────────────┬──────────────┐
      │ Metric                             │ Status                 │ Observed         │ Rate         │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ telemetry_completeness             │ passed                 │ 25/25            │ 100.0%       │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ advisor_before_requirement_write   │ passed                 │ 1/1              │ 100.0%       │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ validation_before_upsert           │ passed                 │ 1/1              │ 100.0%       │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ lookup_before_first_edit           │ not_applicable         │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ source_lookup_zero_result_rate     │ passed                 │ 0/1              │ 0.0%         │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ proof_gap_recovery                 │ passed                 │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ e2e_receipt_freshness              │ passed                 │ 0/0              │ -            │
      ├────────────────────────────────────┼────────────────────────┼──────────────────┼──────────────┤
      │ repeated_mutation_failures         │ passed                 │ 0/1              │ -            │
      └────────────────────────────────────┴────────────────────────┴──────────────────┴──────────────┘"
    `);
  });
});
