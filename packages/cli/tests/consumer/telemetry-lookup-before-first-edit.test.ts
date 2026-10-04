// implements REQ-kibi-telemetry-acceptance-gate-v2
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of the lookup_before_first_edit acceptance metric. Kibi
 * operation rows in `.kb/usage.log` come from real diagnostic-mode CLI runs;
 * the host hook rows around them are a fixture in the shape host plugin
 * hooks append (`interface: "hook"`). One session runs kb_search before its
 * first edit of a requirement-linked file, the other edits first.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const LOG = ".kb/usage.log";
const LOOKUP_FIRST = "session-lookup-first";
const EDIT_FIRST = "session-edit-first";

type Metric = {
  id: string;
  status: string;
  numerator: number;
  denominator: number;
  rate?: number;
  threshold?: { operator: string; value: number };
  message: string;
  evidence?: { unguidedEditPaths?: string[]; lookupOperations?: string[] };
};

type HookRow = Json & { request_id: string };

let hookSequence = 0;

/** One host hook row, as a host plugin hook appends it. */
function hookRow(
  sessionId: string | null,
  trace:
    | Readonly<{ action: "kb_usage"; operation: string; hostTool: string }>
    | Readonly<{
        action: "edited";
        path: string;
        pathKind: string;
        requirementIds: readonly string[];
      }>,
  kbUsedBefore: boolean,
): HookRow {
  hookSequence += 1;
  const finishedAt = new Date(Date.now() + hookSequence * 1_000);
  return {
    timestamp: finishedAt.toISOString(),
    request_id: `hook-fixture-${hookSequence}`,
    tool: "hook_PostToolUse",
    interface: "hook",
    host: "claude-code",
    package_version: null,
    workspace_root: workspace?.root ?? "",
    session_id: sessionId,
    hook_event: "PostToolUse",
    host_tool: trace.action === "kb_usage" ? trace.hostTool : "Edit",
    hook_action: trace.action,
    path: trace.action === "edited" ? trace.path : null,
    path_kind: trace.action === "edited" ? trace.pathKind : null,
    requirement_ids: trace.action === "edited" ? [...trace.requirementIds] : [],
    kb_operation: trace.action === "kb_usage" ? trace.operation : null,
    kb_used_before: kbUsedBefore,
    status: "success",
    duration_ms: 12,
  };
}

const lookup = (operation: "kb_search" | "kb_query" | "kb_check") =>
  ({
    action: "kb_usage",
    operation,
    hostTool: `mcp__plugin_kibi-claude_kibi__${operation}`,
  }) as const;

const edit = (path: string, requirementIds: readonly string[] = []) =>
  ({
    action: "edited",
    path,
    pathKind: path.startsWith(".kb/") ? "kb" : "source",
    requirementIds,
  }) as const;

function seed(ws: ConsumerWorkspace): string[] {
  for (const [id, title] of [
    ["REQ-checkout-total", "Checkout totals are positive"],
    ["REQ-refund-window", "Refunds are accepted within thirty days"],
  ] as const) {
    ws.write(
      `.kb/requirements/${id}.md`,
      doc(
        `
id: ${id}
title: ${title}
type: req
status: open
`,
        `${title}.`,
      ),
    );
  }
  ws.sync();
  // Real Kibi operation rows: the CLI appends them in diagnostic mode.
  const diagnostic = { KIBI_CLI_DIAGNOSTIC_MODE: "1" };
  for (const [route, input] of [
    ["search", { query: "checkout total" }],
    ["query", { type: "req" }],
  ] as const) {
    const run = ws.kibi([route], { input, env: diagnostic });
    expect(run.status).toBe(0);
  }
  const operations = ws.read(LOG).trim().split("\n");
  expect(operations.map((line) => JSON.parse(line).tool)).toEqual([
    "kb_search",
    "kb_query",
  ]);
  return operations;
}

/** Write the usage log: the real operation rows, then the hook rows. */
function writeLog(
  ws: ConsumerWorkspace,
  operations: readonly string[],
  hooks: readonly HookRow[],
): string[] {
  const lines = [...operations, ...hooks.map((row) => JSON.stringify(row))];
  ws.write(LOG, `${lines.join("\n")}\n`);
  return lines;
}

function metricsReport(ws: ConsumerWorkspace): Json {
  const run = ws.kibi(["usage-metrics", "--format", "json"]);
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout) as Json;
}

function lookupMetric(report: Json): Metric {
  const acceptance = report.acceptance as { metrics: Metric[] };
  const metric = acceptance.metrics.find(
    (candidate) => candidate.id === "lookup_before_first_edit",
  );
  expect(metric).toBeDefined();
  return metric as Metric;
}

function remediationItems(ws: ConsumerWorkspace): Json[] {
  const run = ws.kibi(["usage-remediation", "--format", "json"]);
  expect(run.status).toBe(0);
  const report = JSON.parse(run.stdout) as { items: Json[] };
  return report.items.filter(
    (item) => item.metric === "lookup_before_first_edit",
  );
}

function bypassDiagnostics(ws: ConsumerWorkspace): Json[] {
  const result = ws.json(["check", "--format", "json"]);
  const structured = result.structuredContent as {
    qualityDiagnostics: Json[];
  };
  return structured.qualityDiagnostics.filter(
    (diagnostic) => diagnostic.id === "lookup_before_first_edit_bypassed",
  );
}

/** Rows that never count: no session, unlinked code, and KB documents. */
function noise(): HookRow[] {
  return [
    hookRow(null, edit("src/checkout.ts", ["REQ-checkout-total"]), false),
    hookRow(LOOKUP_FIRST, edit("src/format.ts"), false),
    hookRow(EDIT_FIRST, edit(".kb/requirements/REQ-refund-window.md"), false),
  ];
}

describe("telemetry lookup before first edit through the kibi CLI", () => {
  test("reports the session that edited a requirement-linked file before kb_search or kb_query and credits the session that looked it up first", () => {
    const ws = createConsumerWorkspace("kibi-telemetry-lookup-");
    workspace = ws;
    const operations = seed(ws);

    const [sessionless, unlinked, kbEdit] = noise();
    const unguidedEdit = hookRow(
      EDIT_FIRST,
      edit("src/refund.ts", ["REQ-refund-window"]),
      false,
    );
    const hooks = [
      sessionless as HookRow,
      unlinked as HookRow,
      // Session one looks the change up, then edits linked code.
      hookRow(LOOKUP_FIRST, lookup("kb_search"), false),
      hookRow(
        LOOKUP_FIRST,
        edit("src/checkout.ts", ["REQ-checkout-total"]),
        true,
      ),
      // Session two edits linked code first and only then queries.
      kbEdit as HookRow,
      unguidedEdit,
      hookRow(EDIT_FIRST, lookup("kb_query"), false),
      hookRow(EDIT_FIRST, edit("src/refund.ts", ["REQ-refund-window"]), true),
    ];
    const lines = writeLog(ws, operations, hooks);
    const unguidedLine = lines.indexOf(JSON.stringify(unguidedEdit)) + 1;
    expect(unguidedLine).toBe(operations.length + 6);

    const report = metricsReport(ws);
    // Hook rows are not Kibi operations: they never fill the window.
    expect(report.rowCount).toBe(operations.length);
    expect(report.acceptance).toMatchObject({
      status: "failed",
      scope: { totalEvents: operations.length, fresh: true },
    });
    expect(lookupMetric(report)).toEqual({
      id: "lookup_before_first_edit",
      status: "failed",
      numerator: 1,
      denominator: 2,
      rate: 0.5,
      threshold: { operator: ">=", value: 1 },
      message:
        "1/2 sessions ran kb_search or kb_query before their first edit of a requirement-linked file.",
      evidence: {
        unguidedEditPaths: ["src/refund.ts"],
        lookupOperations: ["kb_query", "kb_search"],
      },
    });

    // The gate fails the run and still prints the report.
    const gated = ws.kibi([
      "usage-metrics",
      "--format",
      "json",
      "--require-acceptance",
    ]);
    expect(gated.status).toBe(1);
    expect(lookupMetric(JSON.parse(gated.stdout) as Json)).toEqual(
      lookupMetric(report),
    );
    const table = ws.kibi(["usage-metrics", "--require-acceptance"]);
    expect(table.status).toBe(1);
    expect(table.stdout).toContain("lookup_before_first_edit");
    expect(table.stderr).toContain("Telemetry acceptance gate: failed.");

    // Remediation points at the exact log line of the unguided edit.
    expect(remediationItems(ws)).toEqual([
      {
        id: `lookup_before_first_edit:line-${unguidedLine}:src/refund.ts`,
        rank: 35,
        metric: "lookup_before_first_edit",
        scope: "event",
        target: "src/refund.ts",
        reason:
          "This session edited a requirement-linked file before any kb_search or kb_query.",
        action:
          "Before the next edit of this file, run kb_search for the change or kb_query with this sourceFile, and read the requirements it names.",
        event: {
          logLine: unguidedLine,
          requestId: unguidedEdit.request_id,
          timestamp: unguidedEdit.timestamp,
          tool: "hook_PostToolUse",
          sessionId: EDIT_FIRST,
          actorId: null,
        },
      },
    ]);

    // kibi check carries the same finding as a non-blocking diagnostic.
    expect(bypassDiagnostics(ws)).toMatchObject([
      {
        severity: "warning",
        blocking: false,
        category: "telemetry",
        source: ".kb/usage.log",
        message: lookupMetric(report).message,
      },
    ]);
  }, 300_000);

  test("passes when every session looked up first and is not applicable when no requirement-linked file was edited", () => {
    const ws = createConsumerWorkspace("kibi-telemetry-lookup-pass-");
    workspace = ws;
    const operations = seed(ws);

    writeLog(ws, operations, [
      ...noise(),
      hookRow(LOOKUP_FIRST, lookup("kb_search"), false),
      hookRow(
        LOOKUP_FIRST,
        edit("src/checkout.ts", ["REQ-checkout-total"]),
        true,
      ),
    ]);
    expect(lookupMetric(metricsReport(ws))).toMatchObject({
      status: "passed",
      numerator: 1,
      denominator: 1,
      rate: 1,
      message:
        "1/1 sessions ran kb_search or kb_query before their first edit of a requirement-linked file.",
      evidence: { unguidedEditPaths: [] },
    });
    expect(remediationItems(ws)).toEqual([]);
    expect(bypassDiagnostics(ws)).toEqual([]);

    // Only kb_search and kb_query count as a lookup.
    writeLog(ws, operations, [
      hookRow(EDIT_FIRST, lookup("kb_check"), false),
      hookRow(EDIT_FIRST, edit("src/refund.ts", ["REQ-refund-window"]), true),
    ]);
    expect(lookupMetric(metricsReport(ws))).toMatchObject({
      status: "failed",
      numerator: 0,
      denominator: 1,
      rate: 0,
      evidence: { unguidedEditPaths: ["src/refund.ts"] },
    });

    // Edits without a session, of unlinked code, or of KB documents leave
    // nothing to evaluate.
    writeLog(ws, operations, noise());
    const idle = lookupMetric(metricsReport(ws));
    expect(idle).toMatchObject({
      status: "not_applicable",
      numerator: 0,
      denominator: 0,
      message:
        "No host hook recorded an edit of a requirement-linked file in the evaluated window.",
      evidence: { unguidedEditPaths: [] },
    });
    expect(idle.rate).toBeUndefined();
    expect(remediationItems(ws)).toEqual([]);
  }, 300_000);
});
