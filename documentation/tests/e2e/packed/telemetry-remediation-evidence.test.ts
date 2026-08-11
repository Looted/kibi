import assert from "node:assert";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
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
import {
  sendMcpRequest,
  startMcpServer,
} from "./mcp-cli-operation-parity-support.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type UsageRow = {
  readonly tool: string;
  readonly status: string;
  readonly telemetry_status: string;
  readonly session_id: string;
  readonly actor_id: string;
  readonly business_args: Record<string, unknown>;
};

type RemediationReport = {
  readonly version: string;
  readonly status: string;
  readonly items: readonly {
    readonly metric: string;
    readonly scope: string;
    readonly target: string;
    readonly event: null | {
      readonly logLine: number;
      readonly requestId: string | null;
      readonly timestamp: string | null;
      readonly tool: string | null;
      readonly sessionId: string | null;
      readonly actorId: string | null;
    };
  }[];
};

function diagnosticTelemetry(session: string, actor: string) {
  return {
    is_autonomous: true,
    reasoning: "Packed telemetry correlation proof.",
    confidence_score: 1,
    attempt_number: 1,
    missing_context: "",
    session_id: session,
    actor_id: actor,
  };
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: correlated telemetry remediation",
    { concurrency: false },
    () => {
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
          `${initialized.stdout}${initialized.stderr}`
        );
      });

      afterEach(async () => {
        if (sandbox) await sandbox.cleanup();
      });

      it(
        "logs equivalent CLI/MCP correlation and emits deterministic exact repairs",
        { timeout: 300_000 },
        async () => {
          if (!hasProlog) return;
          const inputPath = join(sandbox.repoDir, "diagnostic-input.json");
          writeFileSync(
            inputPath,
            JSON.stringify({
              _diagnostic_telemetry: diagnosticTelemetry(
                "session-packed",
                "actor-packed"
              ),
            })
          );
          const cli = await kibi(sandbox, [
            "--diagnostic-mode",
            "skills-list",
            "--input",
            inputPath,
          ]);
          assert.strictEqual(cli.exitCode, 0, `${cli.stdout}${cli.stderr}`);

          const mcp = startMcpServer(sandbox, ["--diagnostic-mode"]);
          try {
            await sendMcpRequest(mcp, 1, "initialize", {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: { name: "telemetry-e2e", version: "1.0.0" },
            });
            mcp.stdin?.write(
              `${JSON.stringify({
                jsonrpc: "2.0",
                method: "notifications/initialized",
              })}\n`
            );
            const response = await sendMcpRequest(mcp, 2, "tools/call", {
              name: "kb_skills_list",
              arguments: {
                _diagnostic_telemetry: diagnosticTelemetry(
                  "session-packed",
                  "actor-packed"
                ),
              },
            });
            assert.ifError(response.error);
          } finally {
            mcp.kill();
          }

          const usagePath = join(sandbox.repoDir, ".kb", "usage.log");
          const firstRows = readFileSync(usagePath, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line) as UsageRow);
          assert.strictEqual(firstRows.length, 2);
          for (const row of firstRows) {
            assert.deepStrictEqual(
              {
                tool: row.tool,
                status: row.status,
                telemetry_status: row.telemetry_status,
                session_id: row.session_id,
                actor_id: row.actor_id,
                business_args: row.business_args,
              },
              {
                tool: "kb_skills_list",
                status: "success",
                telemetry_status: "provided",
                session_id: "session-packed",
                actor_id: "actor-packed",
                business_args: {},
              }
            );
          }

          const now = Date.now();
          const synthetic: Record<string, unknown>[] = Array.from(
            { length: 18 },
            (_, index) => ({
              timestamp: new Date(now - (30 - index) * 1_000).toISOString(),
              request_id: `status-${index + 1}`,
              tool: "kb_status",
              status: "success",
              telemetry_status: "provided",
              telemetry: diagnosticTelemetry("session-packed", "actor-packed"),
              session_id: "session-packed",
              actor_id: "actor-packed",
              business_args: {},
            })
          );
          const requirementPayload = {
            type: "req",
            id: "REQ-PACKED-REMEDIATION",
            properties: { title: "Packed remediation", status: "open" },
          };
          synthetic.push(
            {
              timestamp: new Date(now - 10_000).toISOString(),
              request_id: "advisor-mismatch",
              tool: "kb_semantic_advisor",
              status: "success",
              telemetry_status: "provided",
              telemetry: diagnosticTelemetry("session-other", "actor-packed"),
              session_id: "session-other",
              actor_id: "actor-packed",
              business_args: {
                id: "REQ-PACKED-REMEDIATION",
                text: "Must repair.",
              },
            },
            {
              timestamp: new Date(now - 9_000).toISOString(),
              request_id: "preflight-mismatch",
              tool: "kb_validate_upsert",
              status: "success",
              telemetry_status: "provided",
              telemetry: diagnosticTelemetry("session-packed", "actor-other"),
              session_id: "session-packed",
              actor_id: "actor-other",
              validation_valid: true,
              business_args: requirementPayload,
            },
            {
              timestamp: new Date(now - 8_000).toISOString(),
              request_id: "unmatched-upsert",
              tool: "kb_upsert",
              status: "success",
              telemetry_status: "provided",
              telemetry: diagnosticTelemetry("session-packed", "actor-packed"),
              session_id: "session-packed",
              actor_id: "actor-packed",
              business_args: requirementPayload,
            },
            ...[2, 1].map((seconds) => ({
              timestamp: new Date(now - seconds * 1_000).toISOString(),
              request_id: `coverage-${seconds}`,
              tool: "kb_coverage",
              status: "success",
              telemetry_status: "provided",
              telemetry: diagnosticTelemetry("session-packed", "actor-packed"),
              session_id: "session-packed",
              actor_id: "actor-packed",
              coverage_by: "req",
              coverage_scope_complete: true,
              coverage_proof_gap_count: 3,
              coverage_receipt_gap_count: 2,
              business_args: { by: "req" },
            }))
          );
          appendFileSync(
            usagePath,
            `${synthetic.map((event) => JSON.stringify(event)).join("\n")}\n`
          );
          const evidenceBefore = readFileSync(usagePath, "utf8");
          const first = await kibi(sandbox, [
            "usage-remediation",
            "--format",
            "json",
          ]);
          const second = await kibi(sandbox, [
            "usage-remediation",
            "--format",
            "json",
          ]);
          assert.strictEqual(
            first.exitCode,
            0,
            `${first.stdout}${first.stderr}`
          );
          assert.strictEqual(
            second.exitCode,
            0,
            `${second.stdout}${second.stderr}`
          );
          assert.strictEqual(readFileSync(usagePath, "utf8"), evidenceBefore);

          const firstReport = JSON.parse(first.stdout) as RemediationReport;
          const secondReport = JSON.parse(second.stdout) as RemediationReport;
          assert.strictEqual(
            firstReport.version,
            "kibi.telemetry-remediation.v1"
          );
          assert.strictEqual(firstReport.status, "action_required");
          assert.deepStrictEqual(firstReport.items, secondReport.items);
          for (const metric of [
            "validation_before_upsert",
            "advisor_before_requirement_write",
          ]) {
            const item = firstReport.items.find(
              (candidate) =>
                candidate.metric === metric && candidate.event?.logLine === 23
            );
            assert.ok(item, `missing exact ${metric} remediation`);
            assert.deepStrictEqual(item.event, {
              logLine: 23,
              requestId: "unmatched-upsert",
              timestamp: new Date(now - 8_000).toISOString(),
              tool: "kb_upsert",
              sessionId: "session-packed",
              actorId: "actor-packed",
            });
          }
        }
      );
    }
  );
}
