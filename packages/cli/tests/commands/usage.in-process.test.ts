import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildUsageMetricsReport,
  parseUsageLog,
  usageMetricsCommand,
} from "../../src/commands/usage-metrics.js";
import {
  renderUsageRemediationReport,
  usageRemediationCommand,
} from "../../src/commands/usage-remediation.js";
import { buildTelemetryRemediationReport } from "../../src/public/telemetry-remediation.js";
import {
  captureIo,
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    removeTempDir(root);
  }
});

function usageWorkspace(lines: unknown[]): string {
  const cwd = createTempDir("kibi-usage-");
  roots.push(cwd);
  mkdirSync(path.join(cwd, ".kb"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "usage.log"),
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
  );
  return cwd;
}

describe("usageMetricsCommand", () => {
  test("rejects invalid limits and missing logs", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    const cwd = createTempDir("kibi-usage-missing-");
    roots.push(cwd);
    const missing = await withCwd(cwd, () => usageMetricsCommand({}));
    expect(missing).toEqual({ exitCode: 1 });
    expect(io.errorText()).toContain("usage log not found");

    const invalid = await usageMetricsCommand({ limit: "0" });
    expect(invalid).toEqual({ exitCode: 1 });
    expect(io.errorText()).toContain("--limit must be a positive integer");
  });

  test("prints json and table reports and fails the acceptance gate", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = usageWorkspace([
      {
        timestamp: "2026-05-01T10:00:00.000Z",
        tool: "kb_query",
        telemetry_status: "provided",
        telemetry: { is_autonomous: true },
        status: "success",
        active_branch: "main",
        zero_results: true,
        result_count: 0,
        sourceFile: "src/a.ts",
      },
      {
        timestamp: "2026-05-01T10:01:00.000Z",
        tool: "kb_check",
        telemetry_status: "missing",
        success: false,
        branch: "feature/x",
        violation_count: 2,
        error_message: "stale_snapshot: store moved",
      },
    ]);
    const io = captureIo();
    restores.push(io.restore);
    const jsonResult = await withCwd(cwd, () =>
      usageMetricsCommand({ format: "json", requireAcceptance: true }),
    );
    expect(jsonResult).toEqual({ exitCode: 1 });
    expect(io.logText()).toContain('"rowCount"');

    const tableResult = await withCwd(cwd, () =>
      usageMetricsCommand({ requireAcceptance: true }),
    );
    expect(tableResult).toEqual({ exitCode: 1 });
    expect(io.logText()).toContain("Telemetry Acceptance");
    expect(io.errorText()).toContain("Telemetry acceptance gate");
  });

  test("categorizes errors, zero-results, and telemetry completeness", () => {
    const rows = parseUsageLog(
      [
        JSON.stringify({
          tool: "kb_upsert",
          status: "error",
          error: "Entity validation failed: title",
          args: { sourceFile: "src/b.ts" },
        }),
        JSON.stringify({
          tool: "kb_upsert",
          success: false,
          error_message:
            "Relationship source must match the upserted entity; got other",
        }),
        JSON.stringify({
          tool: "kb_query",
          success: true,
          telemetry: { is_autonomous: true },
          result_summary: "0 results",
          business_args: { sourceFile: "src/c.ts" },
        }),
        JSON.stringify({
          tool: "kb_search",
          status: "error",
          error: "unknown option: foo. Use -h for help",
        }),
        JSON.stringify({
          tool: "kb_status",
          status: "error",
          error: "Prolog process not started",
        }),
        JSON.stringify({
          tool: "kb_check",
          status: "error",
          error: "module load failed",
        }),
        JSON.stringify({
          tool: "kb_check",
          status: "error",
          error: "query failed: boom",
        }),
        JSON.stringify({
          tool: "kb_coverage",
          status: "error",
          error:
            "linked coarsely while granular symbols are available in the manifest",
        }),
        JSON.stringify({
          tool: "kb_query",
          status: "error",
          error: "Prefix; extra detail",
        }),
        JSON.stringify({
          tool: "kb_query",
          status: "error",
          error: "Plain",
        }),
        JSON.stringify({
          tool: "kb_query",
          status: "error",
        }),
        JSON.stringify({
          tool: "kb_search",
          zero_results: false,
          result_count: 4,
        }),
      ].join("\n"),
    );
    const report = buildUsageMetricsReport(rows, 2);
    expect(report.rowCount).toBe(12);
    expect(report.errors.categories["Entity validation failed"]).toBe(1);
    expect(
      report.errors.categories[
        "Relationship source must match the upserted entity"
      ],
    ).toBe(1);
    expect(report.errors.categories.prolog_unknown_option).toBe(1);
    expect(report.errors.categories.prolog_process_not_started).toBe(1);
    expect(report.errors.categories.prolog_module_load_failed).toBe(1);
    expect(report.errors.categories.prolog_query_failed).toBe(1);
    expect(report.errors.categories.coarse_symbol_linkage).toBe(1);
    expect(report.errors.stages.validation).toBeGreaterThan(0);
    expect(report.errors.stages.prolog_runtime).toBeGreaterThan(0);
    expect(report.zeroResults.count).toBeGreaterThan(0);
    expect(report.upsertErrors.categories["Entity validation failed"]).toBe(1);
    expect(report.telemetry.completenessRate).toBeGreaterThanOrEqual(0);
  });
});

describe("usageRemediationCommand", () => {
  test("rejects invalid options and missing logs", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    expect(await usageRemediationCommand({ limit: "nope" })).toEqual({
      exitCode: 1,
    });
    expect(await usageRemediationCommand({ format: "yaml" as "json" })).toEqual({
      exitCode: 1,
    });
    const cwd = createTempDir("kibi-remediation-missing-");
    roots.push(cwd);
    expect(await withCwd(cwd, () => usageRemediationCommand({}))).toEqual({
      exitCode: 1,
    });
    expect(io.errorText()).toContain("usage log not found");
  });

  test("renders json, table, and truncated tables", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = usageWorkspace(
      Array.from({ length: 8 }, (_, index) => ({
        timestamp: new Date(Date.now() - index * 1000).toISOString(),
        tool: "kb_status",
        status: "success",
        telemetry_status: index < 4 ? "missing" : "provided",
        telemetry: index < 4 ? null : { is_autonomous: true },
        business_args: {},
      })),
    );
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () => usageRemediationCommand({ format: "json" }));
    expect(io.logText()).toContain("kibi.telemetry-remediation");
    await withCwd(cwd, () => usageRemediationCommand({ limit: "1" }));
    expect(io.logText()).toContain("Showing 1/");

    const events = parseUsageLog(
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        tool: "kb_status",
        status: "success",
        telemetry_status: "missing",
      })}\n`,
    );
    const report = buildTelemetryRemediationReport(events);
    expect(renderUsageRemediationReport(report, 50)).toContain(
      "Telemetry remediation",
    );
  });
});
