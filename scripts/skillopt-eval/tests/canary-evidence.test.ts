import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  sha256File,
  verifyCapabilityEvidence,
} from "../runtime/canary-evidence";
import { appendTraceReceipt } from "../runtime/jsonrpc";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function mcpEvidence(root: string) {
  const tracePath = join(root, "broker-trace.jsonl");
  await appendTraceReceipt(tracePath, {
    correlationId: "rpc-1",
    direction: "target_to_server",
    kind: "request",
    method: "tools/call",
    toolName: "kb_semantic_advisor",
    requestId: 1,
    payload: { method: "tools/call" },
  });
  await appendTraceReceipt(tracePath, {
    correlationId: "rpc-1",
    direction: "server_to_target",
    kind: "response",
    method: "tools/call",
    toolName: "kb_semantic_advisor",
    requestId: 1,
    payload: { result: { content: [] } },
  });
  return {
    brokerTrace: await readFile(tracePath, "utf8"),
    diagnosticReceipt: `${JSON.stringify({
      tool: "kb_semantic_advisor",
      status: "success",
      telemetry: { attempt_number: 1 },
    })}\n`,
    toolName: "kb_semantic_advisor",
  } as const;
}

describe("Codex capability evidence", () => {
  test("accepts the exact broker-added bash wrapper around the probe", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-evidence-test-"));
    roots.push(root);
    const absolutePath = join(root, "canary-probe");
    await writeFile(absolutePath, "probe\n");
    const probe = {
      absolutePath,
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: await sha256File(absolutePath),
    } as const;
    const events = [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "/bin/bash -c ./.runtime/canary-probe",
          aggregated_output: probe.expectedOutput,
          exit_code: 0,
          status: "completed",
        },
      },
    ];

    // When
    const attempt = verifyCapabilityEvidence(
      events,
      probe,
      await mcpEvidence(root),
    );

    // Then
    expect(await attempt).toBeUndefined();
  });

  test("accepts exit-zero probe evidence when Codex drops aggregated_output", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-evidence-empty-"));
    roots.push(root);
    const absolutePath = join(root, "canary-probe");
    await writeFile(absolutePath, "probe\n");
    const probe = {
      absolutePath,
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: await sha256File(absolutePath),
    } as const;
    const events = [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "/bin/bash -c ./.runtime/canary-probe",
          aggregated_output: "",
          exit_code: 0,
          status: "completed",
        },
      },
    ];

    await expect(
      verifyCapabilityEvidence(events, probe, await mcpEvidence(root)),
    ).resolves.toBeUndefined();
  });

  test("rejects non-empty mismatched probe output even when exit code is zero", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-evidence-mismatch-"));
    roots.push(root);
    const absolutePath = join(root, "canary-probe");
    await writeFile(absolutePath, "probe\n");
    const probe = {
      absolutePath,
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: await sha256File(absolutePath),
    } as const;
    const events = [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "/bin/bash -c ./.runtime/canary-probe",
          aggregated_output: "not-the-pass-token\n",
          exit_code: 0,
          status: "completed",
        },
      },
    ];

    await expect(
      verifyCapabilityEvidence(events, probe, await mcpEvidence(root)),
    ).rejects.toMatchObject({
      name: "CanaryEvidenceError",
      message: "missing_probe_execution",
    });
  });

  test("rejects a missing or failed model-originated MCP call", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-evidence-mcp-"));
    roots.push(root);
    const absolutePath = join(root, "canary-probe");
    await writeFile(absolutePath, "probe\n");
    const probe = {
      absolutePath,
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: await sha256File(absolutePath),
    } as const;
    const events = [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: probe.command,
          aggregated_output: probe.expectedOutput,
          exit_code: 0,
          status: "completed",
        },
      },
    ];
    const evidence = await mcpEvidence(root);
    const failedTrace = evidence.brokerTrace.replace(
      '"kind":"response"',
      '"kind":"error"',
    );

    await expect(
      verifyCapabilityEvidence(events, probe, {
        ...evidence,
        brokerTrace: "",
      }),
    ).rejects.toThrow("invalid_broker_trace");
    await expect(
      verifyCapabilityEvidence(events, probe, {
        ...evidence,
        brokerTrace: failedTrace,
      }),
    ).rejects.toThrow(/invalid_broker_trace|missing_mcp_tool_call/);
  });

  test("rejects an empty or mismatched diagnostic receipt", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-evidence-diag-"));
    roots.push(root);
    const absolutePath = join(root, "canary-probe");
    await writeFile(absolutePath, "probe\n");
    const probe = {
      absolutePath,
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: await sha256File(absolutePath),
    } as const;
    const events = [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: probe.command,
          aggregated_output: probe.expectedOutput,
          exit_code: 0,
          status: "completed",
        },
      },
    ];
    const evidence = await mcpEvidence(root);

    await expect(
      verifyCapabilityEvidence(events, probe, {
        ...evidence,
        diagnosticReceipt: "",
      }),
    ).rejects.toThrow("missing_diagnostic_receipt");
    await expect(
      verifyCapabilityEvidence(events, probe, {
        ...evidence,
        diagnosticReceipt:
          '{"tool":"kb_status","status":"success","telemetry":{}}\n',
      }),
    ).rejects.toThrow("invalid_diagnostic_receipt");
  });
});
