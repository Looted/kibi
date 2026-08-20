import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "../helpers/isolated-env.js";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("kibi usage-metrics", () => {
  let tmpDir: string;
  const kibiCli = path.resolve(__dirname, "../../src/cli.ts");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-usage-metrics-"));
    mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });

    writeFileSync(
      path.join(tmpDir, ".kb", "usage.log"),
      [
        JSON.stringify({
          timestamp: "2026-05-01T10:00:00.000Z",
          request_id: "kb_query-1",
          tool: "kb_query",
          telemetry: { is_autonomous: true },
          business_args: { sourceFile: "src/a.ts" },
          status: "success",
          active_branch: "main",
          zero_results: true,
          result_count: 0,
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:01:00.000Z",
          request_id: "kb_query-2",
          tool: "kb_query",
          telemetry: null,
          telemetry_status: "missing",
          business_args: { sourceFile: "src/a.ts" },
          status: "success",
          active_branch: "main",
          zero_results: true,
          result_count: 0,
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:02:00.000Z",
          request_id: "kb_query-3",
          tool: "kb_query",
          telemetry: null,
          telemetry_status: "missing",
          args: { sourceFile: "src/b.ts" },
          success: true,
          active_branch: "main",
          zero_results: true,
          result_count: 0,
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:03:00.000Z",
          request_id: "kb_search-1",
          tool: "kb_search",
          telemetry: null,
          telemetry_status: "missing",
          business_args: { query: "traceability" },
          status: "success",
          active_branch: "feature/reporting",
          zero_results: false,
          result_count: 5,
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:04:00.000Z",
          request_id: "kb_check-1",
          tool: "kb_check",
          telemetry: { is_autonomous: true },
          business_args: { rules: ["required-fields"] },
          status: "success",
          active_branch: "main",
          violation_count: 3,
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:05:00.000Z",
          request_id: "kb_check-2",
          tool: "kb_check",
          telemetry: { is_autonomous: true },
          business_args: { rules: ["required-fields"] },
          status: "success",
          active_branch: "main",
          violation_count: 1,
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:06:00.000Z",
          request_id: "kb_upsert-1",
          tool: "kb_upsert",
          telemetry: { is_autonomous: false },
          business_args: { type: "symbol" },
          status: "error",
          active_branch: "main",
          error_message:
            "Entity validation failed: root: must NOT have additional properties",
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:07:00.000Z",
          request_id: "kb_upsert-2",
          tool: "kb_upsert",
          telemetry: null,
          telemetry_status: "missing",
          business_args: { type: "test" },
          success: false,
          active_branch: "feature/reporting",
          error:
            "Relationship source must match the upserted entity TEST-1; received from=REQ-1",
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:08:00.000Z",
          request_id: "kb_upsert-3",
          tool: "kb_upsert",
          telemetry: null,
          telemetry_status: "missing",
          business_args: { type: "req" },
          status: "error",
          active_branch: "main",
          error_message: "Some failure: detailed reason",
        }),
        JSON.stringify({
          timestamp: "2026-05-01T10:09:00.000Z",
          request_id: "kb_status-1",
          tool: "kb_status",
          telemetry: null,
          telemetry_status: "missing",
          business_args: {},
          status: "error",
          active_branch: "main",
          error_message:
            "Status execution failed: Status execution module load failed: Unknown option (h for help)",
        }),
        "",
      ].join("\n"),
      "utf8",
    );
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("reports usage metrics as json", () => {
    const output = execSync(
      `bun ${kibiCli} usage-metrics --format json --limit 2`,
      { cwd: tmpDir, encoding: "utf8" },
    );

    const result = JSON.parse(output) as {
      rowCount: number;
      dateRange: { first: string; last: string };
      toolCounts: Record<string, number>;
      branchCounts: Record<string, number>;
      outcomeCounts: { success: number; error: number };
      telemetry: {
        completeCount: number;
        missingCount: number;
        completenessRate: number;
      };
      zeroResults: {
        count: number;
        rate: number;
        byTool: Record<string, number>;
        topSourceFiles: Array<{ sourceFile: string; count: number }>;
      };
      kbCheck: {
        violationTrend: Array<{
          timestamp: string;
          violationCount: number;
        }>;
      };
      upsertErrors: {
        categories: Record<string, number>;
      };
      errors: {
        categories: Record<string, number>;
        stages: Record<string, number>;
        byTool: Record<string, number>;
      };
      acceptance: {
        version: string;
        status: string;
        scope: { fresh: boolean; evaluatedEvents: number };
        metrics: Array<{ id: string; status: string }>;
      };
    };

    expect(result.rowCount).toBe(10);
    expect(result.dateRange).toEqual({
      first: "2026-05-01T10:00:00.000Z",
      last: "2026-05-01T10:09:00.000Z",
    });
    expect(result.toolCounts).toEqual({
      kb_query: 3,
      kb_search: 1,
      kb_check: 2,
      kb_upsert: 3,
      kb_status: 1,
    });
    expect(result.branchCounts).toEqual({
      main: 8,
      "feature/reporting": 2,
    });
    expect(result.outcomeCounts).toEqual({ success: 6, error: 4 });
    expect(result.telemetry.completeCount).toBe(4);
    expect(result.telemetry.missingCount).toBe(6);
    expect(result.telemetry.completenessRate).toBeCloseTo(4 / 10);
    expect(result.zeroResults.count).toBe(3);
    expect(result.zeroResults.rate).toBeCloseTo(3 / 10);
    expect(result.zeroResults.byTool).toEqual({ kb_query: 3 });
    expect(result.zeroResults.topSourceFiles).toEqual([
      { sourceFile: "src/a.ts", count: 2 },
      { sourceFile: "src/b.ts", count: 1 },
    ]);
    expect(result.kbCheck.violationTrend).toEqual([
      {
        timestamp: "2026-05-01T10:04:00.000Z",
        violationCount: 3,
      },
      {
        timestamp: "2026-05-01T10:05:00.000Z",
        violationCount: 1,
      },
    ]);
    expect(result.upsertErrors.categories).toEqual({
      "Entity validation failed": 1,
      "Relationship source must match the upserted entity": 1,
      "Some failure": 1,
    });
    expect(result.errors.categories).toEqual({
      "Entity validation failed": 1,
      "Relationship source must match the upserted entity": 1,
      "Some failure": 1,
      prolog_unknown_option: 1,
    });
    expect(result.errors.stages).toEqual({
      prolog_runtime: 1,
      validation: 2,
      unknown: 1,
    });
    expect(result.errors.byTool).toEqual({
      kb_upsert: 3,
      kb_status: 1,
    });
    expect(result.acceptance.version).toBe("kibi.telemetry-acceptance.v1");
    expect(result.acceptance.status).toBe("insufficient_evidence");
    expect(result.acceptance.scope.evaluatedEvents).toBe(10);
    expect(result.acceptance.metrics).toHaveLength(7);
  });

  test("renders table output and applies the zero-result file limit", () => {
    const output = execSync(`bun ${kibiCli} usage-metrics --limit 1`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    expect(output).toContain("Row Count");
    expect(output).toContain("Tool Counts");
    expect(output).toContain("Telemetry Acceptance");
    expect(output).toContain("Telemetry");
    expect(output).toContain("Zero-Result Source Files");
    expect(output).toContain("Error Categories");
    expect(output).toContain("Error Stages");
    expect(output).toContain("kb_query");
    expect(output).toContain("src/a.ts");
    expect(output).not.toContain("src/b.ts");
  });

  test("fails the explicit acceptance gate when evidence is not passing", () => {
    expect(() =>
      execSync(
        `bun ${kibiCli} usage-metrics --format json --require-acceptance`,
        { cwd: tmpDir, encoding: "utf8" },
      ),
    ).toThrow();
  });

  test("rejects --limit 0 with exit code 1", () => {
    expect(() =>
      execSync(`bun ${kibiCli} usage-metrics --limit 0`, {
        cwd: tmpDir,
        encoding: "utf8",
      }),
    ).toThrow(/--limit must be a positive integer/);
  });

  test("rejects negative --limit with exit code 1", () => {
    expect(() =>
      execSync(`bun ${kibiCli} usage-metrics --limit -5`, {
        cwd: tmpDir,
        encoding: "utf8",
      }),
    ).toThrow(/--limit must be a positive integer/);
  });

  test("reports error when usage.log is missing", () => {
    const noLogFileDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-usage-metrics-no-log-"),
    );
    mkdirSync(path.join(noLogFileDir, ".kb"), { recursive: true });
    try {
      expect(() =>
        execSync(`bun ${kibiCli} usage-metrics --format json`, {
          cwd: noLogFileDir,
          encoding: "utf8",
        }),
      ).toThrow(/usage log not found/);
    } finally {
      rmSync(noLogFileDir, { recursive: true, force: true });
    }
  });

  test("returns valid empty JSON when usage.log is empty", () => {
    const emptyDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-usage-metrics-empty-"),
    );
    mkdirSync(path.join(emptyDir, ".kb"), { recursive: true });
    writeFileSync(path.join(emptyDir, ".kb", "usage.log"), "", "utf8");
    try {
      const output = execSync(
        `bun ${kibiCli} usage-metrics --format json --limit 10`,
        { cwd: emptyDir, encoding: "utf8" },
      );
      const result = JSON.parse(output);
      expect(result.rowCount).toBe(0);
      expect(result.dateRange).toEqual({ first: null, last: null });
      expect(result.telemetry.completenessRate).toBe(0);
      expect(result.zeroResults.rate).toBe(0);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test("reports error for malformed JSON in usage.log", () => {
    const badJsonDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-usage-metrics-bad-json-"),
    );
    mkdirSync(path.join(badJsonDir, ".kb"), { recursive: true });
    writeFileSync(
      path.join(badJsonDir, ".kb", "usage.log"),
      "this is not json\n",
      "utf8",
    );
    try {
      expect(() =>
        execSync(`bun ${kibiCli} usage-metrics --format json`, {
          cwd: badJsonDir,
          encoding: "utf8",
        }),
      ).toThrow(/Failed to parse .kb\/usage.log line 1/);
    } finally {
      rmSync(badJsonDir, { recursive: true, force: true });
    }
  });

  test("reports error for non-object JSON in usage.log", () => {
    const nonObjDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-usage-metrics-non-obj-"),
    );
    mkdirSync(path.join(nonObjDir, ".kb"), { recursive: true });
    writeFileSync(
      path.join(nonObjDir, ".kb", "usage.log"),
      '"hello"\n',
      "utf8",
    );
    try {
      expect(() =>
        execSync(`bun ${kibiCli} usage-metrics --format json`, {
          cwd: nonObjDir,
          encoding: "utf8",
        }),
      ).toThrow(/expected object/);
    } finally {
      rmSync(nonObjDir, { recursive: true, force: true });
    }
  });

  test("reports error for non-numeric --limit value", () => {
    expect(() =>
      execSync(`bun ${kibiCli} usage-metrics --limit abc`, {
        cwd: tmpDir,
        encoding: "utf8",
      }),
    ).toThrow(/--limit must be a positive integer/);
  });

  test("reports error for JSON number in usage.log", () => {
    const numDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-usage-metrics-num-"),
    );
    mkdirSync(path.join(numDir, ".kb"), { recursive: true });
    writeFileSync(path.join(numDir, ".kb", "usage.log"), "42\n", "utf8");
    try {
      expect(() =>
        execSync(`bun ${kibiCli} usage-metrics --format json`, {
          cwd: numDir,
          encoding: "utf8",
        }),
      ).toThrow(/expected object/);
    } finally {
      rmSync(numDir, { recursive: true, force: true });
    }
  });

  test("reports 0 rows for usage.log with only blank lines", () => {
    const blankDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-test-usage-metrics-blank-"),
    );
    mkdirSync(path.join(blankDir, ".kb"), { recursive: true });
    writeFileSync(path.join(blankDir, ".kb", "usage.log"), "\n  \n\n", "utf8");
    try {
      const output = execSync(
        `bun ${kibiCli} usage-metrics --format json --limit 10`,
        { cwd: blankDir, encoding: "utf8" },
      );
      const result = JSON.parse(output);
      expect(result.rowCount).toBe(0);
      expect(result.dateRange).toEqual({ first: null, last: null });
      expect(result.telemetry.completenessRate).toBe(0);
    } finally {
      rmSync(blankDir, { recursive: true, force: true });
    }
  });
});
