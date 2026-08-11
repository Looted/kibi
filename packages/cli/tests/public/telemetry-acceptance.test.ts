import { describe, expect, test } from "bun:test";
import {
  type TelemetryUsageEvent,
  analyzeTelemetryAcceptance,
  createTelemetryAcceptanceDiagnostics,
  parseTelemetryUsageLog,
} from "../../src/public/telemetry-acceptance.js";

const NOW = new Date("2026-08-10T12:00:00.000Z");

function timestamp(minutesBefore: number): string {
  return new Date(NOW.getTime() - minutesBefore * 60_000).toISOString();
}

function baseEvent(minutesBefore: number) {
  return {
    timestamp: timestamp(minutesBefore),
    status: "success",
    telemetry_status: "provided",
    telemetry: { is_autonomous: true },
  } as const;
}

function passingEvents() {
  const events: TelemetryUsageEvent[] = Array.from(
    { length: 20 },
    (_, index) => ({
      ...baseEvent(40 - index),
      tool: "kb_status",
      business_args: {},
    }),
  );
  const upsertArgs = {
    type: "req",
    id: "REQ-TELEMETRY",
    properties: {
      status: "open",
      title: "Telemetry acceptance",
      semantic_source_hash: "a".repeat(64),
    },
  };
  events.push(
    {
      ...baseEvent(18),
      tool: "kb_semantic_advisor",
      semantic_source_hash: "a".repeat(64),
      business_args: { id: "REQ-TELEMETRY", text: "Telemetry must pass." },
    },
    {
      ...baseEvent(17),
      tool: "kb_validate_upsert",
      validation_valid: true,
      business_args: upsertArgs,
    },
    {
      ...baseEvent(16),
      tool: "kb_upsert",
      semantic_source_hash: "a".repeat(64),
      business_args: {
        id: "REQ-TELEMETRY",
        type: "req",
        properties: {
          semantic_source_hash: "a".repeat(64),
          title: "Telemetry acceptance",
          status: "open",
        },
      },
    },
    {
      ...baseEvent(15),
      tool: "kb_query",
      zero_results: false,
      result_count: 1,
      business_args: { sourceFile: "src/telemetry.ts" },
    },
    {
      ...baseEvent(14),
      tool: "kb_coverage",
      coverage_by: "req",
      coverage_scope_complete: true,
      coverage_proof_gap_count: 0,
      coverage_receipt_gap_count: 0,
      business_args: { by: "req", includePassing: true, limit: 500 },
    },
  );
  return events;
}

describe("telemetry acceptance", () => {
  test("passes only with fresh complete workflow and proof evidence", () => {
    const report = analyzeTelemetryAcceptance(passingEvents(), NOW);

    expect(report.version).toBe("kibi.telemetry-acceptance.v1");
    expect(report.status).toBe("passed");
    expect(report.scope).toMatchObject({ fresh: true, truncated: false });
    expect(report.metrics.map((metric) => [metric.id, metric.status])).toEqual([
      ["telemetry_completeness", "passed"],
      ["advisor_before_requirement_write", "passed"],
      ["validation_before_upsert", "passed"],
      ["source_lookup_zero_result_rate", "passed"],
      ["proof_gap_recovery", "passed"],
      ["e2e_receipt_freshness", "passed"],
      ["repeated_mutation_failures", "passed"],
    ]);
    expect(createTelemetryAcceptanceDiagnostics(report)).toEqual([]);
  });

  test("requires matching session and actor when both evidence events expose them", () => {
    const events = passingEvents().map((event) => {
      if (event.tool === "kb_semantic_advisor") {
        return { ...event, session_id: "session-other", actor_id: "actor-a" };
      }
      if (event.tool === "kb_validate_upsert") {
        return { ...event, session_id: "session-a", actor_id: "actor-other" };
      }
      if (event.tool === "kb_upsert") {
        return { ...event, session_id: "session-a", actor_id: "actor-a" };
      }
      return event;
    });

    const report = analyzeTelemetryAcceptance(events, NOW);

    expect(
      report.metrics.find(
        (metric) => metric.id === "advisor_before_requirement_write",
      )?.status,
    ).toBe("failed");
    expect(
      report.metrics.find((metric) => metric.id === "validation_before_upsert")
        ?.status,
    ).toBe("failed");
  });

  test("fails with ranked repair diagnostics for bypasses and stalled recovery", () => {
    const events: TelemetryUsageEvent[] = Array.from(
      { length: 20 },
      (_, index) => ({
        ...baseEvent(40 - index),
        tool: "kb_status",
        telemetry_status: index < 4 ? "missing" : "provided",
        telemetry: index < 4 ? null : { is_autonomous: true },
        business_args: {},
      }),
    );
    for (const minutesBefore of [18, 17, 16]) {
      events.push({
        ...baseEvent(minutesBefore),
        tool: "kb_upsert",
        status: "error",
        error_category: "tool_timeout",
        business_args: {
          type: "req",
          id: "REQ-RETRY",
          properties: { title: "Retry", status: "open" },
        },
      });
    }
    events.push(
      {
        ...baseEvent(15),
        tool: "kb_query",
        zero_results: true,
        result_count: 0,
        business_args: { sourceFile: "src/missing.ts" },
      },
      {
        ...baseEvent(14),
        tool: "kb_coverage",
        coverage_by: "req",
        coverage_scope_complete: true,
        coverage_proof_gap_count: 5,
        coverage_receipt_gap_count: 2,
        business_args: { by: "req" },
      },
      {
        ...baseEvent(13),
        tool: "kb_coverage",
        coverage_by: "req",
        coverage_scope_complete: true,
        coverage_proof_gap_count: 5,
        coverage_receipt_gap_count: 2,
        business_args: { by: "req" },
      },
    );

    const report = analyzeTelemetryAcceptance(events, NOW);
    const diagnostics = createTelemetryAcceptanceDiagnostics(report);

    expect(report.status).toBe("failed");
    expect(diagnostics.map((diagnostic) => diagnostic.id)).toEqual([
      "repeated_mutation_failures",
      "mutation_validation_bypassed",
      "semantic_advisor_bypassed",
      "e2e_receipt_freshness_low",
      "proof_gap_recovery_stalled",
      "source_lookup_zero_result_rate_high",
      "telemetry_completeness_low",
    ]);
    expect(diagnostics.every((diagnostic) => !diagnostic.blocking)).toBe(true);
    expect(diagnostics[0]?.evidence).toMatchObject({ rank: 10 });
  });

  test("treats stale evidence and missing proof telemetry as insufficient", () => {
    const staleNow = new Date("2026-08-20T12:00:00.000Z");
    const events = passingEvents().filter(
      (event) => event.tool !== "kb_coverage",
    );
    const report = analyzeTelemetryAcceptance(events, staleNow);
    const diagnostics = createTelemetryAcceptanceDiagnostics(report);

    expect(report.status).toBe("insufficient_evidence");
    expect(report.scope.fresh).toBe(false);
    expect(report.diagnostics).toContain("usage_log_stale");
    expect(diagnostics.map((diagnostic) => diagnostic.id)).toContain(
      "telemetry_evidence_stale",
    );
    expect(diagnostics.map((diagnostic) => diagnostic.id)).toContain(
      "telemetry_acceptance_incomplete",
    );
  });

  test("parses JSONL strictly and rejects malformed evidence", () => {
    expect(
      parseTelemetryUsageLog(
        `${JSON.stringify(baseEvent(1))}\n${JSON.stringify(baseEvent(0))}\n`,
      ),
    ).toHaveLength(2);
    expect(() => parseTelemetryUsageLog("not json\n")).toThrow(
      "Failed to parse .kb/usage.log line 1",
    );
    expect(() => parseTelemetryUsageLog("42\n")).toThrow("expected object");
  });
});
