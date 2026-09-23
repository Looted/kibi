// implements REQ-kibi-telemetry-acceptance-gate
import { afterEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  type TelemetryAcceptanceMetric,
  type TelemetryAcceptancePolicy,
  type TelemetryAcceptanceReport,
  type TelemetryMetricId,
  type TelemetryUsageEvent,
  analyzeTelemetryAcceptance,
  createTelemetryAcceptanceDiagnostics,
  parseTelemetryUsageLog,
} from "../../src/public/telemetry-acceptance.js";

// The suite is pure and in-memory; the guard only keeps a failed expectation
// from leaking a nonzero exit code into later tooling.
afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

const NOW = new Date("2026-09-01T12:00:00.000Z");

function ts(secondsBefore: number): string {
  return new Date(NOW.getTime() - secondsBefore * 1_000).toISOString();
}

function future(secondsAfter: number): string {
  return new Date(NOW.getTime() + secondsAfter * 1_000).toISOString();
}

function event(
  secondsBefore: number,
  fields: Record<string, unknown>,
): TelemetryUsageEvent {
  return {
    timestamp: ts(secondsBefore),
    status: "success",
    telemetry_status: "provided",
    telemetry: { is_autonomous: true },
    ...fields,
  };
}

function policy(
  overrides: Partial<TelemetryAcceptancePolicy>,
): TelemetryAcceptancePolicy {
  return { ...DEFAULT_TELEMETRY_ACCEPTANCE_POLICY, ...overrides };
}

function metric(
  report: TelemetryAcceptanceReport,
  id: TelemetryMetricId,
): TelemetryAcceptanceMetric {
  const found = report.metrics.find((entry) => entry.id === id);
  if (found === undefined) {
    throw new Error(`metric ${id} missing from report`);
  }
  return found;
}

function coverageEvent(
  secondsBefore: number,
  proofGaps: number,
): TelemetryUsageEvent {
  return event(secondsBefore, {
    tool: "kb_coverage",
    coverage_by: "req",
    coverage_scope_complete: true,
    coverage_proof_gap_count: proofGaps,
  });
}

describe("telemetry acceptance edge gates", () => {
  test("matches preflights across key order and diagnostic telemetry noise", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(120, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          business_args: {
            _diagnostic_telemetry: { noise: true },
            properties: { status: "open", tags: ["b", "a"] },
            id: "FACT-1",
            type: "fact",
          },
        }),
        event(60, {
          tool: "kb_upsert",
          business_args: {
            type: "fact",
            id: "FACT-1",
            properties: { tags: ["b", "a"], status: "open" },
          },
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );

    expect(metric(report, "validation_before_upsert")).toEqual({
      id: "validation_before_upsert",
      status: "passed",
      numerator: 1,
      denominator: 1,
      rate: 1,
      threshold: { operator: ">=", value: 1 },
      message:
        "1/1 upsert attempts had a recent successful preflight for the exact payload.",
      evidence: { unvalidatedTargets: [], preflightMaxAgeSeconds: 3600 },
    });
    expect(metric(report, "advisor_before_requirement_write").status).toBe(
      "not_applicable",
    );
  });

  test("ignores failed, invalid, and mismatched preflights", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(90, {
          tool: "kb_validate_upsert",
          status: "error",
          business_args: { type: "fact", id: "FACT-2" },
        }),
        event(80, {
          tool: "kb_validate_upsert",
          validation_valid: false,
          business_args: { type: "fact", id: "FACT-2", status: "open" },
        }),
        event(70, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          business_args: { type: "fact", id: "FACT-2", status: "closed" },
        }),
        event(60, {
          tool: "kb_upsert",
          business_args: { type: "fact", id: "FACT-2", status: "open" },
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );

    const validation = metric(report, "validation_before_upsert");
    expect(validation.status).toBe("failed");
    expect(validation.numerator).toBe(0);
    expect(validation.denominator).toBe(1);
    expect(validation.message).toBe(
      "0/1 upsert attempts had a recent successful preflight for the exact payload.",
    );
    expect(validation.evidence).toEqual({
      unvalidatedTargets: ["fact:FACT-2"],
      preflightMaxAgeSeconds: 3600,
    });
  });

  test("derives mutation targets from unknown types and fingerprint ids", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(30, {
          tool: "kb_upsert",
          status: "error",
          error_category: "runtime",
          args: { note: "x" },
        }),
        event(20, {
          tool: "kb_upsert",
          status: "error",
          error_category: "runtime",
          args: { type: "flag" },
        }),
      ],
      NOW,
      policy({ repeatedMutationFailureThreshold: 1 }),
    );

    const repeated = metric(report, "repeated_mutation_failures");
    expect(repeated.status).toBe("failed");
    expect(repeated.message).toBe(
      "2 target(s) reached at least 1 consecutive mutation failures.",
    );
    expect(repeated.evidence).toEqual({
      targets: [
        {
          target: `flag:${JSON.stringify({ type: "flag" })}`,
          consecutiveFailures: 1,
          errorCategories: ["runtime"],
        },
        {
          target: `unknown:${JSON.stringify({ note: "x" })}`,
          consecutiveFailures: 1,
          errorCategories: ["runtime"],
        },
      ],
    });
  });

  test("falls back to the telemetry payload when telemetry_status is unknown", () => {
    const events: TelemetryUsageEvent[] = [
      {
        timestamp: ts(30),
        tool: "kb_status",
        telemetry_status: "redacted",
        telemetry: { session_id: "sess" },
      },
      {
        timestamp: ts(20),
        tool: "kb_status",
        telemetry_status: "redacted",
        telemetry: null,
      },
    ];

    const completeness = metric(
      analyzeTelemetryAcceptance(events, NOW, policy({ minimumEvents: 2 })),
      "telemetry_completeness",
    );

    expect(completeness.status).toBe("failed");
    expect(completeness.numerator).toBe(1);
    expect(completeness.denominator).toBe(2);
    expect(completeness.rate).toBe(0.5);
    expect(completeness.message).toBe(
      "1/2 recent events include diagnostic telemetry.",
    );
  });

  test("defers to telemetry correlation ids when top-level ids are empty", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(120, {
          tool: "kb_semantic_advisor",
          session_id: "",
          actor_id: "",
          telemetry: { session_id: "sess-1", actor_id: "actor-1" },
          business_args: { id: "REQ-CORR", text: "Correlated." },
        }),
        event(60, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          session_id: "",
          actor_id: "",
          telemetry: { session_id: "sess-1", actor_id: "actor-1" },
          business_args: { type: "req", id: "REQ-CORR" },
        }),
        event(30, {
          tool: "kb_upsert",
          session_id: "sess-1",
          actor_id: "actor-1",
          business_args: { type: "req", id: "REQ-CORR" },
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );

    expect(metric(report, "validation_before_upsert").status).toBe("passed");
    const advisor = metric(report, "advisor_before_requirement_write");
    expect(advisor.status).toBe("passed");
    expect(advisor.numerator).toBe(1);
    expect(advisor.denominator).toBe(1);
  });

  test("accepts evidence exactly at the maximum preflight age", () => {
    const atLimit = analyzeTelemetryAcceptance(
      [
        event(3600, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          business_args: { type: "req", id: "REQ-EDGE" },
        }),
        event(3600, {
          tool: "kb_semantic_advisor",
          business_args: { id: "REQ-EDGE", text: "Edge." },
        }),
        event(0, {
          tool: "kb_upsert",
          business_args: { type: "req", id: "REQ-EDGE" },
        }),
      ],
      NOW,
    );
    expect(metric(atLimit, "validation_before_upsert").status).toBe("passed");
    expect(metric(atLimit, "advisor_before_requirement_write").status).toBe(
      "passed",
    );

    const beyond = analyzeTelemetryAcceptance(
      [
        event(3601, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          business_args: { type: "req", id: "REQ-EDGE" },
        }),
        event(0, {
          tool: "kb_upsert",
          business_args: { type: "req", id: "REQ-EDGE" },
        }),
      ],
      NOW,
    );
    expect(metric(beyond, "validation_before_upsert").status).toBe("failed");
    expect(metric(beyond, "validation_before_upsert").evidence).toEqual({
      unvalidatedTargets: ["req:REQ-EDGE"],
      preflightMaxAgeSeconds: 3600,
    });
  });

  test("does not let a preflight postdate the upsert it would justify", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(10, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          business_args: { type: "fact", id: "FACT-LATE" },
        }),
        event(60, {
          tool: "kb_upsert",
          business_args: { type: "fact", id: "FACT-LATE" },
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );

    const validation = metric(report, "validation_before_upsert");
    expect(validation.status).toBe("failed");
    expect(validation.evidence).toEqual({
      unvalidatedTargets: ["fact:FACT-LATE"],
      preflightMaxAgeSeconds: 3600,
    });
  });

  test("uses the latest compatible preflight and does not consume it", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(120, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          session_id: "sess-old",
          business_args: { type: "fact", id: "FACT-REUSE" },
        }),
        event(90, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          session_id: "sess-new",
          business_args: { type: "fact", id: "FACT-REUSE" },
        }),
        event(60, {
          tool: "kb_upsert",
          status: undefined,
          success: true,
          session_id: "sess-new",
          business_args: { type: "fact", id: "FACT-REUSE" },
        }),
        event(30, {
          tool: "kb_upsert",
          status: undefined,
          success: false,
          error_category: "runtime",
          session_id: "sess-new",
          business_args: { type: "fact", id: "FACT-REUSE" },
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );

    const validation = metric(report, "validation_before_upsert");
    expect(validation.status).toBe("passed");
    expect(validation.numerator).toBe(2);
    expect(validation.denominator).toBe(2);
    expect(metric(report, "repeated_mutation_failures").status).toBe("passed");
  });

  test("evaluates preflights and upserts against the recent-event window", () => {
    const early = analyzeTelemetryAcceptance(
      [
        event(600, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          business_args: { type: "fact", id: "FACT-W" },
        }),
        event(500, { tool: "kb_status", business_args: {} }),
        event(400, { tool: "kb_status", business_args: {} }),
        event(300, { tool: "kb_status", business_args: {} }),
        event(200, { tool: "kb_status", business_args: {} }),
        event(60, {
          tool: "kb_upsert",
          business_args: { type: "fact", id: "FACT-W" },
        }),
        event(30, { tool: "kb_status", business_args: {} }),
      ],
      NOW,
      policy({ eventLimit: 5 }),
    );
    expect(early.scope).toMatchObject({
      totalEvents: 7,
      evaluatedEvents: 5,
      truncated: true,
    });
    expect(metric(early, "validation_before_upsert").status).toBe("passed");

    const late = analyzeTelemetryAcceptance(
      [
        event(600, {
          tool: "kb_upsert",
          business_args: { type: "fact", id: "FACT-OLD" },
        }),
        event(500, { tool: "kb_status", business_args: {} }),
        event(400, { tool: "kb_status", business_args: {} }),
        event(300, { tool: "kb_status", business_args: {} }),
        event(200, { tool: "kb_status", business_args: {} }),
        event(60, {
          tool: "kb_validate_upsert",
          validation_valid: true,
          business_args: { type: "fact", id: "FACT-OLD" },
        }),
        event(30, { tool: "kb_status", business_args: {} }),
      ],
      NOW,
      policy({ eventLimit: 5 }),
    );
    expect(metric(late, "validation_before_upsert").status).toBe(
      "not_applicable",
    );
    expect(metric(late, "validation_before_upsert").message).toBe(
      "No upsert attempts occurred in the evaluated window.",
    );
    expect(metric(late, "repeated_mutation_failures").status).toBe(
      "not_applicable",
    );
  });

  test("counts result_count zero without an explicit zero_results flag", () => {
    const events: TelemetryUsageEvent[] = [
      event(50, {
        tool: "kb_query",
        result_count: 0,
        business_args: { sourceFile: "src/empty.ts" },
      }),
    ];
    for (let index = 0; index < 4; index += 1) {
      events.push(
        event(40 - index, {
          tool: "kb_search",
          result_count: 3,
          business_args: { sourceFile: `src/file-${index}.ts` },
        }),
      );
    }

    expect(
      metric(
        analyzeTelemetryAcceptance(events, NOW),
        "source_lookup_zero_result_rate",
      ),
    ).toEqual({
      id: "source_lookup_zero_result_rate",
      status: "passed",
      numerator: 1,
      denominator: 5,
      rate: 0.2,
      threshold: { operator: "<=", value: 0.2 },
      message: "1/5 source-linked lookups returned zero results.",
      evidence: {
        zeroResultSourceFiles: [{ sourceFile: "src/empty.ts", count: 1 }],
      },
    });
  });

  test("reports no source-linked lookups when calls omit a source file", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(60, {
          tool: "kb_query",
          result_count: 0,
          business_args: { query: "text" },
        }),
        event(30, {
          tool: "kb_search",
          status: "error",
          business_args: { sourceFile: "src/failed.ts" },
        }),
      ],
      NOW,
    );

    expect(metric(report, "source_lookup_zero_result_rate")).toEqual({
      id: "source_lookup_zero_result_rate",
      status: "not_applicable",
      numerator: 0,
      denominator: 0,
      threshold: { operator: "<=", value: 0.2 },
      message:
        "No source-linked query or search calls occurred in the evaluated window.",
      evidence: { zeroResultSourceFiles: [] },
    });
  });

  test("derives receipt evidence from the gaps array when no total is recorded", () => {
    const gaps = [
      { requirementId: "REQ-B", testIds: ["TEST-B"], codes: ["stale_receipt"] },
      {
        requirementId: "REQ-A",
        testIds: [],
        codes: ["missing_receipt"],
      },
    ];
    const report = analyzeTelemetryAcceptance(
      [
        event(30, {
          tool: "kb_coverage",
          coverage_by: "req",
          coverage_scope_complete: true,
          coverage_proof_gap_count: 2,
          coverage_receipt_gap_count: 2,
          coverage_receipt_gaps: gaps,
          coverage_receipt_gaps_truncated: true,
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );

    expect(metric(report, "e2e_receipt_freshness")).toEqual({
      id: "e2e_receipt_freshness",
      status: "failed",
      numerator: 2,
      denominator: 2,
      threshold: { operator: "<=", value: 0 },
      message:
        "The latest complete requirement coverage event has 2 missing, stale, failed, invalid, or uncheckable receipt gaps.",
      evidence: {
        receiptGaps: gaps,
        receiptGapTotal: 2,
        receiptGapsTruncated: true,
      },
    });
  });

  test("reports recovery shapes for zero-gap, recovered, worsened, and single-event streams", () => {
    const recoveredToZero = analyzeTelemetryAcceptance(
      [coverageEvent(120, 3), coverageEvent(60, 0)],
      NOW,
      policy({ minimumEvents: 1 }),
    );
    expect(metric(recoveredToZero, "proof_gap_recovery")).toEqual({
      id: "proof_gap_recovery",
      status: "passed",
      numerator: 3,
      denominator: 3,
      message:
        "The latest complete requirement coverage event has zero proof gaps.",
      evidence: { previousGapCount: 3, latestGapCount: 0 },
    });

    const decreased = analyzeTelemetryAcceptance(
      [coverageEvent(120, 4), coverageEvent(60, 1)],
      NOW,
      policy({ minimumEvents: 1 }),
    );
    expect(metric(decreased, "proof_gap_recovery")).toEqual({
      id: "proof_gap_recovery",
      status: "passed",
      numerator: 3,
      denominator: 4,
      rate: 0.75,
      threshold: { operator: "<", value: 4 },
      message: "Proof gaps decreased from 4 to 1.",
      evidence: { previousGapCount: 4, latestGapCount: 1 },
    });

    const worsened = analyzeTelemetryAcceptance(
      [coverageEvent(120, 1), coverageEvent(60, 3)],
      NOW,
      policy({ minimumEvents: 1 }),
    );
    expect(metric(worsened, "proof_gap_recovery")).toEqual({
      id: "proof_gap_recovery",
      status: "failed",
      numerator: 0,
      denominator: 1,
      rate: 0,
      threshold: { operator: "<", value: 1 },
      message:
        "Proof gaps did not recover: the previous complete report had 1 and the latest has 3.",
      evidence: { previousGapCount: 1, latestGapCount: 3 },
    });

    const single = analyzeTelemetryAcceptance(
      [coverageEvent(60, 2)],
      NOW,
      policy({ minimumEvents: 1 }),
    );
    expect(metric(single, "proof_gap_recovery")).toEqual({
      id: "proof_gap_recovery",
      status: "insufficient_evidence",
      numerator: 0,
      denominator: 2,
      message:
        "The latest complete coverage event reports 2 proof gaps, but no comparable earlier event is available.",
      evidence: { previousGapCount: null, latestGapCount: 2 },
    });
  });

  test("requires complete req-scoped coverage telemetry before judging proof gaps", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(90, {
          tool: "kb_coverage",
          coverage_by: "scenario",
          coverage_scope_complete: true,
          coverage_proof_gap_count: 2,
        }),
        event(80, {
          tool: "kb_coverage",
          coverage_by: "req",
          coverage_scope_complete: false,
          coverage_proof_gap_count: 2,
        }),
        event(70, {
          tool: "kb_coverage",
          coverage_by: "req",
          coverage_scope_complete: true,
          coverage_proof_gap_count: "many" as unknown as number,
        }),
        event(60, {
          tool: "kb_coverage",
          status: "error",
          coverage_by: "req",
          coverage_scope_complete: true,
          coverage_proof_gap_count: 2,
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );

    const proof = metric(report, "proof_gap_recovery");
    expect(proof.status).toBe("insufficient_evidence");
    expect(proof.message).toBe(
      "No complete requirement coverage event with proof-gap telemetry is available.",
    );
    expect(metric(report, "e2e_receipt_freshness").message).toBe(
      "No complete requirement coverage event with receipt-freshness telemetry is available.",
    );
  });

  test("resets failure streaks on success and aggregates error categories", () => {
    const events: TelemetryUsageEvent[] = [
      event(100, {
        tool: "kb_upsert",
        status: "error",
        error_category: "network",
        business_args: { type: "req", id: "REQ-S" },
      }),
      event(90, {
        tool: "kb_upsert",
        status: "error",
        error_category: "tool_timeout",
        business_args: { type: "req", id: "REQ-S" },
      }),
      event(80, {
        tool: "kb_upsert",
        business_args: { type: "req", id: "REQ-S" },
      }),
      event(70, {
        tool: "kb_upsert",
        status: "error",
        error_category: "validation_failed",
        business_args: { type: "req", id: "REQ-S" },
      }),
      event(60, {
        tool: "kb_upsert",
        status: "error",
        error_category: "validation_failed",
        business_args: { type: "req", id: "REQ-S" },
      }),
    ];

    expect(
      metric(
        analyzeTelemetryAcceptance(events, NOW),
        "repeated_mutation_failures",
      ),
    ).toEqual({
      id: "repeated_mutation_failures",
      status: "passed",
      numerator: 0,
      denominator: 5,
      threshold: { operator: "<", value: 3 },
      message: "No target reached 3 consecutive mutation failures.",
      evidence: { targets: [] },
    });

    const streak = analyzeTelemetryAcceptance(
      [
        event(50, {
          tool: "kb_upsert",
          status: "error",
          error_category: "network",
          business_args: { type: "req", id: "REQ-T" },
        }),
        event(40, {
          tool: "kb_upsert",
          status: "error",
          error_category: "tool_timeout",
          business_args: { type: "req", id: "REQ-T" },
        }),
        event(30, {
          tool: "kb_upsert",
          status: "error",
          error_category: "network",
          business_args: { type: "req", id: "REQ-T" },
        }),
      ],
      NOW,
    );
    const repeated = metric(streak, "repeated_mutation_failures");
    expect(repeated.status).toBe("failed");
    expect(repeated.evidence).toEqual({
      targets: [
        {
          target: "req:REQ-T",
          consecutiveFailures: 3,
          errorCategories: ["network", "tool_timeout"],
        },
      ],
    });
  });

  test("marks mutation metrics not applicable when the window has no upserts", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(60, { tool: "kb_status", business_args: {} }),
        event(30, {
          tool: "kb_query",
          result_count: 2,
          business_args: { query: "text" },
        }),
      ],
      NOW,
    );

    expect(metric(report, "validation_before_upsert")).toEqual({
      id: "validation_before_upsert",
      status: "not_applicable",
      numerator: 0,
      denominator: 0,
      threshold: { operator: ">=", value: 1 },
      message: "No upsert attempts occurred in the evaluated window.",
      evidence: { unvalidatedTargets: [], preflightMaxAgeSeconds: 3600 },
    });
    expect(metric(report, "advisor_before_requirement_write")).toEqual({
      id: "advisor_before_requirement_write",
      status: "not_applicable",
      numerator: 0,
      denominator: 0,
      threshold: { operator: ">=", value: 1 },
      message:
        "No requirement upsert attempts occurred in the evaluated window.",
      evidence: { unadvisedRequirements: [], advisorMaxAgeSeconds: 86400 },
    });
    expect(metric(report, "repeated_mutation_failures")).toEqual({
      id: "repeated_mutation_failures",
      status: "not_applicable",
      numerator: 0,
      denominator: 0,
      threshold: { operator: "<", value: 3 },
      message: "No upsert attempts occurred in the evaluated window.",
      evidence: { targets: [] },
    });
  });

  test("reports an empty stream as empty and stale with null scope timestamps", () => {
    const report = analyzeTelemetryAcceptance([], NOW);

    expect(report.status).toBe("insufficient_evidence");
    expect(report.diagnostics).toEqual(["usage_log_empty", "usage_log_stale"]);
    expect(report.scope).toEqual({
      totalEvents: 0,
      evaluatedEvents: 0,
      truncated: false,
      firstTimestamp: null,
      lastTimestamp: null,
      evidenceAgeSeconds: null,
      fresh: false,
    });
    expect(metric(report, "telemetry_completeness").message).toBe(
      "Only 0/20 required recent events are available.",
    );
  });

  test("treats evidence exactly at the age and future-skew limits as fresh", () => {
    const exactlyOld = analyzeTelemetryAcceptance(
      [event(3600, { tool: "kb_status", business_args: {} })],
      NOW,
      policy({ maxEvidenceAgeSeconds: 3600, minimumEvents: 1 }),
    );
    expect(exactlyOld.scope).toMatchObject({
      fresh: true,
      evidenceAgeSeconds: 3600,
    });
    expect(exactlyOld.diagnostics).toEqual([]);

    const exactlyFuture = analyzeTelemetryAcceptance(
      [
        {
          timestamp: future(300),
          tool: "kb_status",
          status: "success",
          telemetry_status: "provided",
          telemetry: { is_autonomous: true },
          business_args: {},
        },
      ],
      NOW,
    );
    expect(exactlyFuture.scope).toMatchObject({
      fresh: true,
      evidenceAgeSeconds: -300,
    });
    expect(exactlyFuture.diagnostics).toEqual([]);

    const tooFuture = analyzeTelemetryAcceptance(
      [
        {
          timestamp: future(301),
          tool: "kb_status",
          status: "success",
          telemetry_status: "provided",
          telemetry: { is_autonomous: true },
          business_args: {},
        },
      ],
      NOW,
    );
    expect(tooFuture.scope.fresh).toBe(false);
    expect(tooFuture.diagnostics).toEqual(["usage_log_future_dated"]);

    const tooStale = analyzeTelemetryAcceptance(
      [event(3601, { tool: "kb_status", business_args: {} })],
      NOW,
      policy({ maxEvidenceAgeSeconds: 3600, minimumEvents: 1 }),
    );
    expect(tooStale.scope.fresh).toBe(false);
    expect(tooStale.diagnostics).toEqual(["usage_log_stale"]);
  });

  test("derives scope timestamps from the earliest and latest valid times", () => {
    const report = analyzeTelemetryAcceptance(
      [
        event(600, { tool: "kb_status", business_args: {} }),
        event(60, { tool: "kb_status", business_args: {} }),
        event(300, { tool: "kb_status", business_args: {} }),
        {
          tool: "kb_status",
          status: "success",
          telemetry_status: "provided",
          telemetry: {},
          timestamp: "bogus-date",
        },
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );

    expect(report.scope.firstTimestamp).toBe(ts(600));
    expect(report.scope.lastTimestamp).toBe(ts(60));
    expect(report.scope.evidenceAgeSeconds).toBe(60);
  });

  test("orders combined stale, failed, and incomplete diagnostics by repair rank", () => {
    const events: TelemetryUsageEvent[] = [1, 2, 3].map(() => ({
      tool: "kb_upsert",
      status: "error",
      error_category: "validation_failed",
      telemetry_status: "provided",
      business_args: { type: "req", id: "REQ-DIAG" },
    }));

    const report = analyzeTelemetryAcceptance(events, NOW);
    expect(report.status).toBe("insufficient_evidence");
    expect(report.diagnostics).toEqual(["usage_log_timestamps_unavailable"]);

    const diagnostics = createTelemetryAcceptanceDiagnostics(report);
    expect(diagnostics.map((diagnostic) => diagnostic.id)).toEqual([
      "telemetry_evidence_stale",
      "repeated_mutation_failures",
      "mutation_validation_bypassed",
      "semantic_advisor_bypassed",
      "telemetry_acceptance_incomplete",
    ]);
    expect(
      diagnostics.every(
        (diagnostic) =>
          diagnostic.blocking === false &&
          diagnostic.category === "telemetry" &&
          diagnostic.source === ".kb/usage.log",
      ),
    ).toBe(true);
    expect(diagnostics[0]?.message).toContain("no valid timestamped evidence");
    expect(diagnostics.at(-1)?.message).toBe(
      "Telemetry cannot evaluate 3 required metric(s): telemetry_completeness, proof_gap_recovery, e2e_receipt_freshness.",
    );
  });

  test("advises hashed writes from hashless advisors and rejects hash mismatches", () => {
    const hashless = analyzeTelemetryAcceptance(
      [
        event(120, {
          tool: "kb_semantic_advisor",
          business_args: { id: "REQ-H" },
        }),
        event(60, {
          tool: "kb_upsert",
          semantic_source_hash: "a".repeat(64),
          business_args: { type: "req", id: "REQ-H" },
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );
    expect(metric(hashless, "advisor_before_requirement_write").status).toBe(
      "passed",
    );

    const byRequirementId = analyzeTelemetryAcceptance(
      [
        event(120, {
          tool: "kb_semantic_advisor",
          business_args: { requirementId: "REQ-RID" },
        }),
        event(60, {
          tool: "kb_upsert",
          business_args: { type: "req", requirementId: "REQ-RID" },
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );
    expect(
      metric(byRequirementId, "advisor_before_requirement_write").status,
    ).toBe("passed");

    const mismatch = analyzeTelemetryAcceptance(
      [
        event(120, {
          tool: "kb_semantic_advisor",
          semantic_source_hash: "b".repeat(64),
          business_args: { id: "REQ-H" },
        }),
        event(60, {
          tool: "kb_upsert",
          semantic_source_hash: "a".repeat(64),
          business_args: { type: "req", id: "REQ-H" },
        }),
      ],
      NOW,
      policy({ minimumEvents: 1 }),
    );
    const advisor = metric(mismatch, "advisor_before_requirement_write");
    expect(advisor.status).toBe("failed");
    expect(advisor.message).toBe(
      "0/1 requirement upserts followed a recent semantic-advisor pass for the same requirement and source hash when observable.",
    );
    expect(advisor.evidence).toEqual({
      unadvisedRequirements: ["REQ-H"],
      advisorMaxAgeSeconds: 86400,
    });
  });

  test("parses padded JSONL lines and rejects scalar lines", () => {
    const line = JSON.stringify({ tool: "kb_query", result_count: 0 });
    expect(parseTelemetryUsageLog(`   ${line}   \r\n\r\n`)).toEqual([
      { tool: "kb_query", result_count: 0 },
    ]);
    expect(() => parseTelemetryUsageLog(`${line}\n"scalar string"\n`)).toThrow(
      "Failed to parse .kb/usage.log line 2: expected object",
    );
  });
});
