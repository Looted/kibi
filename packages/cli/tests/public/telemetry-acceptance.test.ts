import { describe, expect, test } from "bun:test";
import {
  type TelemetryUsageEvent,
  DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  TELEMETRY_ACCEPTANCE_VERSION,
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
        coverage_receipt_gaps: [
          {
            requirementId: "REQ-RECEIPT",
            testIds: ["TEST-RECEIPT"],
            codes: ["proof_contract_mismatch"],
          },
        ],
        coverage_receipt_gap_total: 1,
        coverage_receipt_gaps_truncated: false,
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
    const receiptDiagnostic = diagnostics.find(
      (diagnostic) => diagnostic.id === "e2e_receipt_freshness_low",
    );
    expect(receiptDiagnostic?.suggestion).toContain("kibi prove");
    expect(receiptDiagnostic?.suggestion).toContain("idempotently");
    expect(receiptDiagnostic?.suggestion).not.toContain(
      "kibi.verification-receipt",
    );
    expect(receiptDiagnostic?.evidence).toMatchObject({
      metric: {
        evidence: {
          receiptGaps: [
            {
              requirementId: "REQ-RECEIPT",
              testIds: ["TEST-RECEIPT"],
              codes: ["proof_contract_mismatch"],
            },
          ],
          receiptGapTotal: 1,
          receiptGapsTruncated: false,
        },
      },
    });
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
    expect(parseTelemetryUsageLog("\n\n")).toEqual([]);
    expect(
      parseTelemetryUsageLog(`${JSON.stringify({ tool: "kb_status" })}\n`),
    ).toHaveLength(1);
  });

  test("uses args fallback, success booleans, inferred telemetry, and future-dated logs", () => {
    const future = new Date(NOW.getTime() + 30 * 60_000).toISOString();
    const events: TelemetryUsageEvent[] = [
      {
        timestamp: timestamp(1),
        tool: "kb_upsert",
        success: false,
        args: { type: "req", id: "REQ-FAIL" },
        telemetry_status: "missing",
      },
      {
        timestamp: future,
        tool: "kb_query",
        success: true,
        args: { sourceFile: "src/a.ts" },
        zero_results: false,
        result_count: 1,
        telemetry: { is_autonomous: true },
      },
    ];
    const report = analyzeTelemetryAcceptance(events, NOW, {
      ...DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
      minimumEvents: 1,
      eventLimit: 200,
      maxFutureSkewSeconds: 60,
    });
    expect(report.version).toBe(TELEMETRY_ACCEPTANCE_VERSION);
    expect(report.diagnostics).toContain("usage_log_future_dated");
    expect(createTelemetryAcceptanceDiagnostics(report).map((d) => d.id)).toContain(
      "telemetry_evidence_stale",
    );
  });

  test("reports unavailable timestamps and empty logs", () => {
    const empty = analyzeTelemetryAcceptance([]);
    expect(empty.diagnostics).toContain("usage_log_empty");
    const untimed = analyzeTelemetryAcceptance([
      { tool: "kb_status", telemetry_status: "provided", telemetry: {} },
    ]);
    expect(untimed.diagnostics).toContain("usage_log_timestamps_unavailable");
    expect(untimed.scope.lastTimestamp).toBeNull();
    const diagnostics = createTelemetryAcceptanceDiagnostics(untimed);
    expect(diagnostics.some((item) => item.id === "telemetry_evidence_stale")).toBe(
      true,
    );
    expect(diagnostics.some((item) => item.message.includes("no valid timestamped"))).toBe(
      true,
    );
  });

  test("covers remaining metric, correlation, truncation, and recovery branches", () => {
    const events: TelemetryUsageEvent[] = [];
    for (let index = 0; index < 25; index += 1) {
      events.push({
        timestamp: timestamp(80 - index),
        tool: "kb_status",
        success: true,
        telemetry: { is_autonomous: true, session_id: "sess-a", actor_id: "act-a" },
        args: { _diagnostic_telemetry: { ignored: true }, keep: ["nested"] },
      });
    }
    events.push(
      {
        timestamp: timestamp(50),
        tool: "kb_semantic_advisor",
        status: "success",
        telemetry_status: "provided",
        semantic_source_hash: "b".repeat(64),
        business_args: { requirementId: "REQ-HASH" },
        session_id: "sess-a",
      },
      {
        timestamp: timestamp(49),
        tool: "kb_upsert",
        status: "success",
        telemetry_status: "provided",
        semantic_source_hash: "c".repeat(64),
        mutation_target: "req:REQ-HASH",
        mutation_fingerprint: '{"id":"REQ-HASH"}',
        business_args: { type: "req", id: "REQ-HASH" },
        session_id: "sess-a",
      },
      {
        timestamp: timestamp(48),
        tool: "kb_validate_upsert",
        status: "success",
        validation_valid: false,
        business_args: { type: "req", id: "REQ-SKIP" },
      },
      {
        timestamp: timestamp(47),
        tool: "kb_validate_upsert",
        status: "success",
        telemetry_status: "provided",
        business_args: { type: "req", id: "REQ-OK" },
      },
      {
        timestamp: timestamp(46),
        tool: "kb_upsert",
        status: "success",
        telemetry_status: "provided",
        business_args: { type: "req", id: "REQ-OK" },
      },
      {
        timestamp: timestamp(45),
        tool: "kb_search",
        status: "success",
        telemetry_status: "provided",
        zero_results: false,
        result_count: 2,
        business_args: { sourceFile: "src/b.ts" },
      },
      {
        timestamp: timestamp(44),
        tool: "kb_query",
        status: "success",
        telemetry_status: "provided",
        zero_results: true,
        result_count: 0,
        business_args: { sourceFile: "src/a.ts" },
      },
      {
        timestamp: timestamp(43),
        tool: "kb_query",
        status: "success",
        telemetry_status: "provided",
        zero_results: true,
        result_count: 0,
        business_args: { sourceFile: "src/z.ts" },
      },
      {
        timestamp: timestamp(42),
        tool: "kb_coverage",
        status: "success",
        telemetry_status: "provided",
        coverage_scope_complete: true,
        coverage_proof_gap_count: 4,
        coverage_receipt_gap_count: 1,
        business_args: { by: "req" },
      },
      {
        timestamp: timestamp(41),
        tool: "kb_coverage",
        status: "success",
        telemetry_status: "provided",
        coverage_by: "req",
        coverage_scope_complete: true,
        coverage_proof_gap_count: 1,
        coverage_receipt_gap_count: 0,
        business_args: { by: "req" },
      },
      {
        timestamp: "not-a-date",
        tool: "kb_upsert",
        status: "error",
        error_category: "timeout",
        business_args: { type: "flag", id: "FLAG-1" },
      },
      {
        timestamp: timestamp(40),
        tool: "kb_upsert",
        status: "error",
        error_category: "timeout",
        business_args: { type: "flag", id: "FLAG-1" },
      },
      {
        timestamp: timestamp(39),
        tool: "kb_upsert",
        status: "success",
        telemetry_status: "provided",
        business_args: { type: "flag", id: "FLAG-1" },
      },
    );
    const report = analyzeTelemetryAcceptance(events, NOW, {
      ...DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
      eventLimit: 20,
      minimumEvents: 5,
      repeatedMutationFailureThreshold: 3,
    });
    expect(report.scope.truncated).toBe(true);
    expect(
      report.metrics.find((metric) => metric.id === "proof_gap_recovery")?.status,
    ).toBe("passed");
    expect(
      report.metrics.find((metric) => metric.id === "e2e_receipt_freshness")
        ?.status,
    ).toBe("passed");
    expect(
      report.metrics.find(
        (metric) => metric.id === "advisor_before_requirement_write",
      )?.status,
    ).toBe("failed");
    expect(
      report.metrics.find((metric) => metric.id === "source_lookup_zero_result_rate")
        ?.evidence,
    ).toMatchObject({
      zeroResultSourceFiles: expect.arrayContaining([
        { sourceFile: "src/a.ts", count: 1 },
      ]),
    });

    const singleGap = analyzeTelemetryAcceptance(
      [
        {
          timestamp: timestamp(1),
          tool: "kb_coverage",
          status: "success",
          telemetry_status: "provided",
          coverage_by: "req",
          coverage_scope_complete: true,
          coverage_proof_gap_count: 3,
        },
      ],
      NOW,
      { ...DEFAULT_TELEMETRY_ACCEPTANCE_POLICY, minimumEvents: 1 },
    );
    expect(
      singleGap.metrics.find((metric) => metric.id === "proof_gap_recovery")
        ?.status,
    ).toBe("insufficient_evidence");
    expect(createTelemetryAcceptanceDiagnostics(singleGap).map((d) => d.id)).toContain(
      "telemetry_acceptance_incomplete",
    );

    const staleFreshMetrics = analyzeTelemetryAcceptance(
      [
        {
          timestamp: timestamp(1),
          tool: "kb_status",
          telemetry_status: "provided",
          telemetry: {},
        },
      ],
      new Date("2026-08-20T12:00:00.000Z"),
      { ...DEFAULT_TELEMETRY_ACCEPTANCE_POLICY, minimumEvents: 1 },
    );
    const staleDiagnostics = createTelemetryAcceptanceDiagnostics(staleFreshMetrics);
    expect(staleDiagnostics.some((item) => item.id === "telemetry_evidence_stale")).toBe(
      true,
    );
    expect(staleDiagnostics[0]?.message).toContain("latest");
  });
});

