import { describe, expect, test } from "bun:test";
import { parseTelemetryUsageLog } from "../../src/public/telemetry-acceptance.js";
import {
  TELEMETRY_REMEDIATION_VERSION,
  buildTelemetryRemediationReport,
} from "../../src/public/telemetry-remediation.js";

const NOW = new Date("2026-08-10T12:00:00.000Z");

function timestamp(minutesBefore: number): string {
  return new Date(NOW.getTime() - minutesBefore * 60_000).toISOString();
}

function event(
  line: number,
  tool: string,
  extra: Record<string, unknown> = {},
) {
  return {
    timestamp: timestamp(60 - line),
    request_id: `request-${line}`,
    tool,
    status: "success",
    telemetry_status: "provided",
    telemetry: {
      is_autonomous: true,
      session_id: "session-a",
      actor_id: "actor-a",
    },
    session_id: "session-a",
    actor_id: "actor-a",
    business_args: {},
    ...extra,
  };
}

function failingEvents() {
  const events = Array.from({ length: 20 }, (_, index) =>
    event(index + 1, "kb_status"),
  );
  const payload = {
    type: "req",
    id: "REQ-REMEDIATION",
    properties: { title: "Remediation", status: "open" },
  };
  events.push(
    event(21, "kb_semantic_advisor", {
      session_id: "session-other",
      business_args: { id: "REQ-REMEDIATION", text: "Must repair." },
    }),
    event(22, "kb_validate_upsert", {
      actor_id: "actor-other",
      validation_valid: true,
      business_args: payload,
    }),
    event(23, "kb_upsert", { business_args: payload }),
    event(24, "kb_query", {
      zero_results: true,
      result_count: 0,
      business_args: { sourceFile: "src/missing.ts" },
    }),
    event(25, "kb_coverage", {
      coverage_by: "req",
      coverage_scope_complete: true,
      coverage_proof_gap_count: 3,
      coverage_receipt_gap_count: 2,
      business_args: { by: "req" },
    }),
    event(26, "kb_coverage", {
      coverage_by: "req",
      coverage_scope_complete: true,
      coverage_proof_gap_count: 3,
      coverage_receipt_gap_count: 2,
      business_args: { by: "req" },
    }),
  );
  for (const line of [27, 28, 29]) {
    events.push(
      event(line, "kb_upsert", {
        status: "error",
        error_category: "tool_timeout",
        business_args: { type: "symbol", id: "SYM-RETRY" },
      }),
    );
  }
  return events;
}

describe("telemetry remediation", () => {
  test("enumerates exact unmatched events in deterministic repair order", () => {
    const report = buildTelemetryRemediationReport(failingEvents(), NOW);

    expect(report.version).toBe(TELEMETRY_REMEDIATION_VERSION);
    expect(report.status).toBe("action_required");
    expect(report.items.slice(0, 3).map((item) => item.event?.logLine)).toEqual(
      [27, 28, 29],
    );
    const validation = report.items.find(
      (item) =>
        item.metric === "validation_before_upsert" &&
        item.event?.logLine === 23,
    );
    expect(validation).toMatchObject({
      scope: "event",
      target: "req:REQ-REMEDIATION",
      event: {
        requestId: "request-23",
        tool: "kb_upsert",
        sessionId: "session-a",
        actorId: "actor-a",
      },
    });
    expect(
      report.items.find(
        (item) =>
          item.metric === "advisor_before_requirement_write" &&
          item.event?.logLine === 23,
      ),
    ).toBeDefined();
    expect(
      report.items.find(
        (item) =>
          item.metric === "source_lookup_zero_result_rate" &&
          item.event?.logLine === 24,
      ),
    ).toBeDefined();
    expect(report.items).toEqual(
      [...report.items].sort(
        (left, right) =>
          left.rank - right.rank ||
          (left.event?.logLine ?? Number.MAX_SAFE_INTEGER) -
            (right.event?.logLine ?? Number.MAX_SAFE_INTEGER) ||
          left.id.localeCompare(right.id),
      ),
    );
  });

  test("keeps missing complete coverage as explicit report-level repairs", () => {
    const events = Array.from({ length: 20 }, (_, index) =>
      event(index + 1, "kb_status"),
    );
    const report = buildTelemetryRemediationReport(events, NOW);

    expect(
      report.items.filter(
        (item) =>
          item.scope === "report" &&
          ["proof_gap_recovery", "e2e_receipt_freshness"].includes(item.metric),
      ),
    ).toHaveLength(2);
  });

  test("asks for current evidence when the window has no timestamps", () => {
    const events = Array.from({ length: 20 }, (_, index) => ({
      tool: "kb_status",
      status: "success",
      telemetry_status: "provided",
      telemetry: { is_autonomous: true },
      request_id: `stale-${index}`,
    }));
    const report = buildTelemetryRemediationReport(events, NOW);

    expect(report.items[0]).toEqual({
      id: "evidence_freshness:report:.kb/usage.log",
      rank: 5,
      metric: "evidence_freshness",
      scope: "report",
      target: ".kb/usage.log",
      reason: "The acceptance window has no current timestamped evidence.",
      action:
        "Run the current workflow in diagnostic mode, then regenerate this report.",
      event: null,
    });
  });

  test("does not accept a matching preflight older than the preflight age limit", () => {
    const payload = {
      type: "req",
      id: "REQ-AGE",
      properties: { title: "Age", status: "open" },
    };
    const events = Array.from({ length: 20 }, (_, index) =>
      event(index + 1, "kb_status"),
    );
    events.push(
      event(21, "kb_validate_upsert", {
        timestamp: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        validation_valid: true,
        mutation_fingerprint: "same-payload",
        business_args: payload,
      }),
      event(22, "kb_upsert", {
        timestamp: NOW.toISOString(),
        mutation_fingerprint: "same-payload",
        business_args: payload,
      }),
    );
    const report = buildTelemetryRemediationReport(events, NOW);

    expect(
      report.items.find((item) => item.metric === "validation_before_upsert"),
    ).toMatchObject({
      target: "req:REQ-AGE",
      event: { logLine: 22, requestId: "request-22" },
    });
  });

  // implements REQ-kibi-telemetry-remediation-evidence, REQ-claude-hook-usage-telemetry-v2
  test("points unguided first edits and operations at their usage.log lines", () => {
    const hook = (fields: Record<string, unknown>) => ({
      timestamp: timestamp(5),
      request_id: `hook-${String(fields.session_id)}-${String(fields.hook_action)}`,
      tool: "hook_PostToolUse",
      interface: "hook",
      host: "codex",
      hook_event: "PostToolUse",
      status: "success",
      ...fields,
    });
    const rows = [
      hook({
        session_id: "session-edit-first",
        hook_action: "edited",
        path: "src/checkout.ts",
        requirement_ids: ["REQ-checkout-rounding"],
      }),
      hook({
        session_id: "session-guided",
        hook_action: "kb_usage",
        kb_operation: "kb_search",
      }),
      hook({
        session_id: "session-guided",
        hook_action: "edited",
        path: "src/cart.ts",
        requirement_ids: ["REQ-cart-limit"],
      }),
      ...failingEvents(),
    ];
    // A blank line still counts as a line of the log.
    const lines = rows.map((row) => JSON.stringify(row));
    lines.splice(1, 0, "");
    const report = buildTelemetryRemediationReport(
      parseTelemetryUsageLog(`${lines.join("\n")}\n`),
      NOW,
    );

    const lookupItems = report.items.filter(
      (item) => item.metric === "lookup_before_first_edit",
    );
    expect(lookupItems).toEqual([
      {
        id: "lookup_before_first_edit:line-1:src/checkout.ts",
        rank: 35,
        metric: "lookup_before_first_edit",
        scope: "event",
        target: "src/checkout.ts",
        reason:
          "This session edited a requirement-linked file before any kb_search or kb_query.",
        action:
          "Before the next edit of this file, run kb_search for the change or kb_query with this sourceFile, and read the requirements it names.",
        event: {
          logLine: 1,
          requestId: "hook-session-edit-first-edited",
          timestamp: timestamp(5),
          tool: "hook_PostToolUse",
          sessionId: "session-edit-first",
          actorId: null,
        },
      },
    ]);
    // Operation items point past the three hook rows and the blank line.
    const validation = report.items.find(
      (item) => item.metric === "validation_before_upsert",
    );
    expect(validation?.event).toMatchObject({
      logLine: 27,
      requestId: "request-23",
    });
    expect(validation?.id).toBe(
      "validation_before_upsert:line-27:req:REQ-REMEDIATION",
    );
  });
});
