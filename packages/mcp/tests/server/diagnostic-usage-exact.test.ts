import { afterEach, describe, expect, setSystemTime, test } from "bun:test";

import {
  buildDiagnosticToolCall,
  classifyDiagnosticError,
  deriveDiagnosticHints,
} from "../../src/diagnostics-helpers.js";
import {
  appendDiagnosticErrorUsage,
  appendDiagnosticSuccessUsage,
} from "../../src/server/diagnostic-usage.js";

afterEach(() => {
  setSystemTime();
});

function runtime(pid: number | null) {
  const rows: Record<string, unknown>[] = [];
  return {
    rows,
    runtime: {
      deriveDiagnosticFields: () => ({ result_summary: "derived" }),
      classifyDiagnosticError,
      prologProcess: async () => (pid === null ? null : { getPid: () => pid }),
      activeBranchName: async () => "main",
      appendUsageLogLine: (row: Record<string, unknown>) => {
        rows.push(row);
      },
    } as never,
  };
}

const startedAt = new Date("2026-01-01T00:00:00.000Z");
const finishedAt = new Date("2026-01-01T00:00:01.500Z");
const base = {
  toolName: "kb_query",
  requestId: "r1",
  args: { q: 1, _diagnostic_telemetry: { t: 1 } },
  businessArgs: { q: 1 },
  telemetry: { t: 1 },
  startedAt,
};

describe("diagnostic usage rows, exact", () => {
  test("a success row", async () => {
    setSystemTime(finishedAt);
    const { rows, runtime: tools } = runtime(42);
    await appendDiagnosticSuccessUsage({ ...base, runtime: tools, result: {} });
    const toolCall = buildDiagnosticToolCall({
      tool: "kb_query",
      requestId: "r1",
      args: base.args,
      diagnosticPhase: "success",
      telemetry: base.telemetry,
    });
    expect(rows).toStrictEqual([
      {
        timestamp: finishedAt.toISOString(),
        request_id: "r1",
        tool: "kb_query",
        telemetry: { t: 1 },
        business_args: { q: 1 },
        tool_call: toolCall,
        retry_key: toolCall.retry_key,
        diagnostic_phase: "success",
        status: "success",
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: 1500,
        prolog_pid: 42,
        active_branch: "main",
        result_summary: "derived",
      },
    ]);
  });

  test("an error row", async () => {
    setSystemTime(finishedAt);
    const { rows, runtime: tools } = runtime(null);
    await appendDiagnosticErrorUsage({
      ...base,
      runtime: tools,
      error: "query failed",
      resetState: {
        resetAttempted: true,
        resetSucceeded: false,
        resetError: "x",
      },
    });
    const err = new Error("query failed");
    const toolCall = buildDiagnosticToolCall({
      tool: "kb_query",
      requestId: "r1",
      args: base.args,
      diagnosticPhase: "error",
      error: err,
      telemetry: base.telemetry,
    });
    expect(rows).toStrictEqual([
      {
        timestamp: finishedAt.toISOString(),
        request_id: "r1",
        tool: "kb_query",
        telemetry: { t: 1 },
        business_args: { q: 1 },
        tool_call: toolCall,
        retry_key: toolCall.retry_key,
        diagnostic_phase: "error",
        status: "error",
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: 1500,
        prolog_pid: null,
        active_branch: "main",
        reset_attempted: true,
        reset_succeeded: false,
        reset_error: "x",
        diagnostic_hints: [
          deriveDiagnosticHints({ tool: "kb_query", error: err }),
        ],
        ...classifyDiagnosticError(err),
      },
    ]);
  });

  test("a process id of zero is kept", async () => {
    const { rows, runtime: tools } = runtime(0);
    await appendDiagnosticSuccessUsage({ ...base, runtime: tools, result: {} });
    await appendDiagnosticErrorUsage({
      ...base,
      runtime: tools,
      error: new Error("e"),
      resetState: {
        resetAttempted: false,
        resetSucceeded: false,
        resetError: null,
      },
    });
    expect(rows.map((row) => row.prolog_pid)).toStrictEqual([0, 0]);
  });
});
