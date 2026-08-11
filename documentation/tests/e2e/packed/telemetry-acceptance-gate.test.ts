import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type AcceptanceResult = {
  readonly acceptance: {
    readonly version: string;
    readonly status: string;
    readonly metrics: readonly {
      readonly id: string;
      readonly status: string;
    }[];
  };
};

function assertAcceptanceStatus(
  report: AcceptanceResult,
  expected: "passed" | "failed",
): void {
  assert.strictEqual(report.acceptance.version, "kibi.telemetry-acceptance.v1");
  assert.strictEqual(report.acceptance.status, expected);
}

function atMinutesBefore(now: number, minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

function passingEvents(now: number): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = Array.from(
    { length: 20 },
    (_, index) => ({
      timestamp: atMinutesBefore(now, 40 - index),
      tool: "kb_status",
      status: "success",
      telemetry_status: "provided",
      telemetry: { is_autonomous: true },
      business_args: {},
    }),
  );
  const payload = {
    type: "req",
    id: "REQ-PACKED-TELEMETRY",
    properties: {
      title: "Packed telemetry gate",
      status: "open",
      semantic_source_hash: "a".repeat(64),
    },
  };
  events.push(
    {
      timestamp: atMinutesBefore(now, 18),
      tool: "kb_semantic_advisor",
      status: "success",
      telemetry_status: "provided",
      telemetry: { is_autonomous: true },
      semantic_source_hash: "a".repeat(64),
      business_args: {
        id: "REQ-PACKED-TELEMETRY",
        text: "Packed telemetry must pass.",
      },
    },
    {
      timestamp: atMinutesBefore(now, 17),
      tool: "kb_validate_upsert",
      status: "success",
      telemetry_status: "provided",
      telemetry: { is_autonomous: true },
      validation_valid: true,
      business_args: payload,
    },
    {
      timestamp: atMinutesBefore(now, 16),
      tool: "kb_upsert",
      status: "success",
      telemetry_status: "provided",
      telemetry: { is_autonomous: true },
      semantic_source_hash: "a".repeat(64),
      business_args: {
        properties: {
          semantic_source_hash: "a".repeat(64),
          status: "open",
          title: "Packed telemetry gate",
        },
        id: "REQ-PACKED-TELEMETRY",
        type: "req",
      },
    },
    {
      timestamp: atMinutesBefore(now, 15),
      tool: "kb_query",
      status: "success",
      telemetry_status: "provided",
      telemetry: { is_autonomous: true },
      result_count: 1,
      zero_results: false,
      business_args: { sourceFile: "src/telemetry.ts" },
    },
    {
      timestamp: atMinutesBefore(now, 14),
      tool: "kb_coverage",
      status: "success",
      telemetry_status: "provided",
      telemetry: { is_autonomous: true },
      coverage_by: "req",
      coverage_scope_complete: true,
      coverage_proof_gap_count: 0,
      coverage_receipt_gap_count: 0,
      business_args: { by: "req", includePassing: true, limit: 500 },
    },
  );
  return events;
}

function writeUsageLog(
  sandbox: TestSandbox,
  events: readonly Record<string, unknown>[],
): void {
  mkdirSync(join(sandbox.repoDir, ".kb"), { recursive: true });
  writeFileSync(
    join(sandbox.repoDir, ".kb", "usage.log"),
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: telemetry acceptance gate", { concurrency: false }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(async () => {
      hasProlog = checkPrologAvailable();
      if (!hasProlog) return;
      tarballs = await packAll();
    });

    beforeEach(async () => {
      if (!hasProlog) return;
      sandbox = createSandbox();
      await sandbox.install(tarballs);
      await sandbox.initGitRepo();
      const initialized = await kibi(sandbox, ["init"]);
      assert.strictEqual(
        initialized.exitCode,
        0,
        `${initialized.stdout}${initialized.stderr}`,
      );
    });

    afterEach(async () => {
      if (sandbox) await sandbox.cleanup();
    });

    it(
      "passes fresh complete evidence and fails with ranked retry diagnostics",
      { timeout: 300_000 },
      async () => {
        if (!hasProlog) return;
        const now = Date.now();
        const events = passingEvents(now);
        writeUsageLog(sandbox, events);

        const passing = await kibi(sandbox, [
          "usage-metrics",
          "--format",
          "json",
          "--require-acceptance",
        ]);
        assert.strictEqual(
          passing.exitCode,
          0,
          `${passing.stdout}${passing.stderr}`,
        );
        const passingReport = JSON.parse(passing.stdout) as AcceptanceResult;
        assertAcceptanceStatus(passingReport, "passed");

        for (const minutes of [3, 2, 1]) {
          events.push({
            timestamp: atMinutesBefore(now, minutes),
            tool: "kb_upsert",
            status: "error",
            telemetry_status: "provided",
            telemetry: { is_autonomous: true },
            error_category: "tool_timeout",
            business_args: {
              type: "symbol",
              id: "SYM-PACKED-RETRY",
              properties: { title: "retry", status: "active" },
            },
          });
        }
        writeUsageLog(sandbox, events);

        const failing = await kibi(sandbox, [
          "usage-metrics",
          "--format",
          "json",
          "--require-acceptance",
        ]);
        assert.strictEqual(failing.exitCode, 1);
        const failingReport = JSON.parse(failing.stdout) as AcceptanceResult;
        assertAcceptanceStatus(failingReport, "failed");
        assert.strictEqual(
          failingReport.acceptance.metrics.find(
            (metric) => metric.id === "repeated_mutation_failures",
          )?.status,
          "failed",
        );

        const check = await kibi(sandbox, ["check", "--format", "json"]);
        assert.strictEqual(check.exitCode, 0, `${check.stdout}${check.stderr}`);
        const checkResult = JSON.parse(check.stdout) as {
          readonly structuredContent: {
            readonly qualityDiagnostics?: readonly {
              readonly id: string;
              readonly category: string;
              readonly blocking: boolean;
            }[];
          };
        };
        const ids = checkResult.structuredContent.qualityDiagnostics?.map(
          (diagnostic) => diagnostic.id,
        );
        assert.ok(ids?.includes("repeated_mutation_failures"));
        assert.ok(ids?.includes("mutation_validation_bypassed"));
        assert.ok(
          checkResult.structuredContent.qualityDiagnostics?.every(
            (diagnostic) =>
              diagnostic.category !== "telemetry" || !diagnostic.blocking,
          ),
        );
      },
    );
  });
}
