import { describe, expect, test } from "bun:test";

import { diagnosticMutationFingerprint } from "../../src/public/diagnostic-usage.js";
import {
  DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  type TelemetryAcceptancePolicy,
  type TelemetryAcceptanceReport,
  type TelemetryUsageEvent,
} from "../../src/public/telemetry-acceptance.js";
import {
  TELEMETRY_REMEDIATION_VERSION,
  type TelemetryRemediationItem,
  buildTelemetryRemediationReport,
  remediateTelemetryAcceptance,
} from "../../src/public/telemetry-remediation.js";

const BASE = Date.parse("2026-01-01T00:00:00.000Z");
const at = (seconds: number) => new Date(BASE + seconds * 1_000).toISOString();

const acceptance = (
  statuses: Record<string, string>,
  fresh = true,
): TelemetryAcceptanceReport =>
  ({
    scope: { fresh },
    metrics: Object.entries(statuses).map(([id, status]) => ({ id, status })),
  }) as unknown as TelemetryAcceptanceReport;

const policy = (
  overrides: Partial<TelemetryAcceptancePolicy> = {},
): TelemetryAcceptancePolicy => ({
  ...DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  minimumEvents: 0,
  ...overrides,
});

const run = (
  events: readonly TelemetryUsageEvent[],
  statuses: Record<string, string>,
  overrides: Partial<TelemetryAcceptancePolicy> = {},
) =>
  remediateTelemetryAcceptance(events, acceptance(statuses), policy(overrides));

const items = (
  events: readonly TelemetryUsageEvent[],
  metric: string,
  overrides: Partial<TelemetryAcceptancePolicy> = {},
  status = "failed",
): TelemetryRemediationItem[] =>
  run(events, { [metric]: status }, overrides)
    .items as TelemetryRemediationItem[];

const lines = (list: readonly TelemetryRemediationItem[]) =>
  list.map((item) => item.event?.logLine ?? null);

const hook = (event: Record<string, unknown>) =>
  ({ interface: "hook", ...event }) as TelemetryUsageEvent;

describe("report shape", () => {
  test("is clear with no actionable metric and fresh evidence", () => {
    const accepted = acceptance({ telemetry_completeness: "passed" });
    const report = remediateTelemetryAcceptance(
      [{ tool: "kb_status", telemetry: null }],
      accepted,
      policy({ minimumEvents: 5 }),
    );
    expect(report).toStrictEqual({
      version: "kibi.telemetry-remediation.v1",
      status: "clear",
      acceptance: accepted,
      summary: { total: 0, eventItems: 0, reportItems: 0 },
      items: [],
    });
    expect(report.acceptance).toBe(accepted);
    expect(TELEMETRY_REMEDIATION_VERSION).toBe("kibi.telemetry-remediation.v1");
  });

  test("asks for fresh evidence when the window is stale", () => {
    const report = remediateTelemetryAcceptance(
      [],
      acceptance({}, false),
      policy(),
    );
    expect(report.status).toBe("action_required");
    expect(report.summary).toStrictEqual({
      total: 1,
      eventItems: 0,
      reportItems: 1,
    });
    expect(report.items).toStrictEqual([
      {
        id: "evidence_freshness:report:.kb/usage.log",
        rank: 5,
        metric: "evidence_freshness",
        scope: "report",
        target: ".kb/usage.log",
        reason: "The acceptance window has no current timestamped evidence.",
        action:
          "Run the current workflow in diagnostic mode, then regenerate this report.",
        event: null,
      },
    ]);
  });

  test("builds from a computed acceptance report", () => {
    const report = buildTelemetryRemediationReport(
      [],
      new Date(BASE),
      DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
    );
    expect(report.acceptance.version).toBe("kibi.telemetry-acceptance.v1");
    expect(report.acceptance.evaluatedAt).toBe(at(0));
    expect(report.items[0]?.metric).toBe("evidence_freshness");
    const defaults = buildTelemetryRemediationReport([]);
    expect(defaults.acceptance.policy).toStrictEqual(
      DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
    );
    expect(Date.parse(defaults.acceptance.evaluatedAt)).toBeGreaterThan(BASE);
  });
});

describe("actionable metrics", () => {
  const missing: TelemetryUsageEvent[] = [{ tool: "kb_status" }];

  test("acts on failed and insufficient evidence only", () => {
    expect(items(missing, "telemetry_completeness")).toHaveLength(1);
    expect(
      items(missing, "telemetry_completeness", {}, "insufficient_evidence"),
    ).toHaveLength(1);
    expect(items(missing, "telemetry_completeness", {}, "passed")).toEqual([]);
    expect(run(missing, {}).items).toEqual([]);
  });
});

describe("telemetry completeness", () => {
  test("cites recent events without telemetry", () => {
    const events: TelemetryUsageEvent[] = [
      { tool: "old" },
      { tool: "a", telemetry_status: "provided", telemetry: null },
      { tool: "b", telemetry_status: "missing", telemetry: { x: 1 } },
      { tool: "c", telemetry: null },
      { tool: "d" },
      { tool: "e", telemetry: {} },
      {
        request_id: "r7",
        timestamp: at(7),
        session_id: "s7",
        actor_id: "a7",
      },
    ];
    const found = items(events, "telemetry_completeness", { eventLimit: 6 });
    expect(found.map((item) => item.target)).toEqual([
      "b",
      "c",
      "d",
      "unknown tool",
    ]);
    expect(found[0]).toStrictEqual({
      id: "telemetry_completeness:line-3:b",
      rank: 70,
      metric: "telemetry_completeness",
      scope: "event",
      target: "b",
      reason: "Diagnostic telemetry is missing for this event.",
      action:
        "Repeat this operation in diagnostic mode with complete _diagnostic_telemetry.",
      event: {
        logLine: 3,
        requestId: null,
        timestamp: null,
        tool: "b",
        sessionId: null,
        actorId: null,
      },
    });
    expect(found[3]?.event).toStrictEqual({
      logLine: 7,
      requestId: "r7",
      timestamp: at(7),
      tool: null,
      sessionId: "s7",
      actorId: "a7",
    });
  });

  test("reports a short window", () => {
    const events: TelemetryUsageEvent[] = [
      { tool: "x", telemetry: {} },
      { tool: "y", telemetry: {} },
    ];
    expect(
      items(events, "telemetry_completeness", { minimumEvents: 2 }),
    ).toEqual([]);
    expect(
      items(events, "telemetry_completeness", { minimumEvents: 3 }),
    ).toStrictEqual([
      {
        id: "telemetry_completeness:report:acceptance window",
        rank: 70,
        metric: "telemetry_completeness",
        scope: "report",
        target: "acceptance window",
        reason: "Only 2/3 required events are available.",
        action:
          "Capture enough current diagnostic events to satisfy the minimum evidence window.",
        event: null,
      },
    ]);
    expect(
      items(events, "telemetry_completeness", {
        minimumEvents: 3,
        eventLimit: 1,
      })[0]?.reason,
    ).toBe("Only 1/3 required events are available.");
  });

  test("counts log lines across host hook rows", () => {
    const events = [
      hook({ hook_action: "noop" }),
      { tool: "kb_status" },
      hook({ hook_action: "noop" }),
      { tool: "kb_query" },
    ];
    expect(lines(items(events, "telemetry_completeness"))).toEqual([2, 4]);
  });

  test("reads correlation ids from the event or its telemetry", () => {
    const telemetryList = Object.assign(["x"], {
      session_id: "list",
      actor_id: "list",
    });
    const events: TelemetryUsageEvent[] = [
      {
        tool: "a",
        telemetry_status: "missing",
        session_id: "",
        telemetry: { session_id: "ts", actor_id: 4 },
      },
      {
        tool: "b",
        telemetry_status: "missing",
        actor_id: "ea",
        telemetry: { session_id: "ts2", actor_id: "ta" },
      },
      { tool: "c", telemetry_status: "missing", telemetry: telemetryList },
      { tool: "d", telemetry_status: "missing", telemetry: "session" },
    ];
    expect(
      items(events, "telemetry_completeness").map((item) => [
        item.event?.sessionId,
        item.event?.actorId,
      ]),
    ).toEqual([
      ["ts", null],
      ["ts2", "ea"],
      [null, null],
      [null, null],
    ]);
  });
});

describe("validation before upsert", () => {
  const metric = "validation_before_upsert";
  const preflight = (seconds: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_validate_upsert",
    status: "success",
    timestamp: at(seconds),
    session_id: "s",
    business_args: { type: "req", id: "REQ-1" },
    ...extra,
  });
  const upsert = (seconds: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_upsert",
    status: "success",
    timestamp: at(seconds),
    session_id: "s",
    business_args: { type: "req", id: "REQ-1" },
    ...extra,
  });

  test("accepts a matching recent preflight", () => {
    expect(items([preflight(0), upsert(600)], metric)).toEqual([]);
    expect(
      items(
        [preflight(0, { status: undefined, success: true }), upsert(600)],
        metric,
      ),
    ).toEqual([]);
    expect(items([preflight(10), upsert(10)], metric)).toEqual([]);
    expect(items([preflight(0), upsert(3600)], metric)).toEqual([]);
  });

  test("cites an upsert without a matching preflight", () => {
    const found = items([upsert(600, { request_id: "u1" })], metric);
    expect(found).toStrictEqual([
      {
        id: "validation_before_upsert:line-1:req:REQ-1",
        rank: 20,
        metric,
        scope: "event",
        target: "req:REQ-1",
        reason:
          "No recent successful preflight matches this exact payload and correlation context.",
        action:
          "Run kb_upsert with dryRun true (CLI: validate-upsert) for this exact payload in the same session/actor context before retrying once.",
        event: {
          logLine: 1,
          requestId: "u1",
          timestamp: at(600),
          tool: "kb_upsert",
          sessionId: "s",
          actorId: null,
        },
      },
    ]);
  });

  test("ignores preflights that do not qualify", () => {
    for (const events of [
      [preflight(0, { validation_valid: false }), upsert(600)],
      [preflight(0, { status: "error" }), upsert(600)],
      [preflight(0, { tool: "kb_status" }), upsert(600)],
      [preflight(0, { session_id: "other" }), upsert(600)],
      [preflight(0, { actor_id: "a" }), upsert(600, { actor_id: "b" })],
      [preflight(0, { timestamp: undefined }), upsert(600)],
      [preflight(0, { timestamp: "soon" }), upsert(600)],
      [preflight(0), upsert(600, { timestamp: undefined })],
      [preflight(20), upsert(10)],
      [preflight(0), upsert(3601)],
      [
        preflight(0, { business_args: { type: "req", id: "REQ-2" } }),
        upsert(600),
      ],
    ]) {
      expect(lines(items(events, metric))).toEqual([2]);
    }
  });

  test("matches when one side lacks a correlation id", () => {
    expect(
      items([preflight(0, { session_id: undefined }), upsert(600)], metric),
    ).toEqual([]);
    expect(
      items([preflight(0), upsert(600, { session_id: undefined })], metric),
    ).toEqual([]);
  });

  test("matches by explicit or computed fingerprint", () => {
    expect(
      items(
        [
          preflight(0, {
            mutation_fingerprint: "fp",
            business_args: { a: 1 },
          }),
          upsert(600, { mutation_fingerprint: "fp", business_args: { b: 2 } }),
        ],
        metric,
      ),
    ).toEqual([]);
    expect(
      items(
        [
          preflight(0, { business_args: undefined, args: { b: 1, a: 2 } }),
          upsert(600, { business_args: { a: 2, b: 1 } }),
        ],
        metric,
      ),
    ).toEqual([]);
    expect(
      items(
        [
          preflight(0, { business_args: undefined }),
          upsert(600, { business_args: {} }),
        ],
        metric,
      ),
    ).toEqual([]);
  });

  test("uses preflights from before the window but cites recent upserts only", () => {
    const events = [preflight(0), upsert(5, { session_id: "x" }), upsert(600)];
    expect(items(events, metric, { eventLimit: 1 })).toEqual([]);
    expect(lines(items(events, metric, { eventLimit: 2 }))).toEqual([2]);
  });

  test("names the target from the mutation target, type and id", () => {
    const targets = items(
      [
        upsert(0, { mutation_target: "custom:T" }),
        upsert(0, { mutation_target: "", business_args: { id: "X" } }),
        upsert(0, { business_args: { type: 3, id: 4, title: "t" } }),
        upsert(0, { business_args: { type: "fact", title: "t" } }),
      ],
      metric,
    ).map((item) => item.target);
    expect(targets).toEqual([
      "custom:T",
      "unknown:X",
      `unknown:${diagnosticMutationFingerprint({ type: 3, id: 4, title: "t" })}`,
      `fact:${diagnosticMutationFingerprint({ type: "fact", title: "t" })}`,
    ]);
  });
});

describe("advisor before requirement write", () => {
  const metric = "advisor_before_requirement_write";
  const advisor = (seconds: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_semantic_advisor",
    status: "success",
    timestamp: at(seconds),
    session_id: "s",
    business_args: { id: "REQ-1" },
    ...extra,
  });
  const write = (seconds: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_upsert",
    status: "success",
    timestamp: at(seconds),
    session_id: "s",
    business_args: { type: "req", id: "REQ-1" },
    ...extra,
  });
  const day = 24 * 60 * 60;

  test("accepts a matching advisor run", () => {
    expect(items([advisor(0), write(day)], metric)).toEqual([]);
    expect(
      items(
        [
          advisor(0, { business_args: { requirementId: "REQ-1" } }),
          write(10, { business_args: { type: "req", requirementId: "REQ-1" } }),
        ],
        metric,
      ),
    ).toEqual([]);
    expect(
      items(
        [
          advisor(0, { business_args: { id: "req:T" } }),
          write(10, {
            mutation_target: "req:T",
            business_args: { type: "req" },
          }),
        ],
        metric,
      ),
    ).toEqual([]);
    expect(
      items(
        [
          advisor(0, { semantic_source_hash: "h" }),
          write(10, { semantic_source_hash: "h" }),
        ],
        metric,
      ),
    ).toEqual([]);
    expect(
      items([advisor(0, { semantic_source_hash: "h" }), write(10)], metric),
    ).toEqual([]);
    expect(
      items([advisor(0), write(10, { semantic_source_hash: "h" })], metric),
    ).toEqual([]);
    expect(
      items(
        [advisor(0, { status: undefined, success: true }), write(10)],
        metric,
      ),
    ).toEqual([]);
  });

  test("cites a requirement write without a matching advisor run", () => {
    expect(items([write(10, { request_id: "w" })], metric)).toStrictEqual([
      {
        id: "advisor_before_requirement_write:line-1:REQ-1",
        rank: 30,
        metric,
        scope: "event",
        target: "REQ-1",
        reason:
          "No recent semantic-advisor event matches this requirement, source hash, and correlation context.",
        action:
          "Run kb_model with mode analyze (CLI: semantic-advisor) on the complete prose in the same session/actor context before the next upsert.",
        event: {
          logLine: 1,
          requestId: "w",
          timestamp: at(10),
          tool: "kb_upsert",
          sessionId: "s",
          actorId: null,
        },
      },
    ]);
    expect(
      items(
        [write(10, { business_args: { type: "req", title: "t" } })],
        metric,
      )[0]?.target,
    ).toBe(`req:${diagnosticMutationFingerprint({ type: "req", title: "t" })}`);
  });

  test("ignores advisor runs that do not qualify", () => {
    for (const events of [
      [advisor(0, { status: "error" }), write(10)],
      [advisor(0, { business_args: { id: 1 } }), write(10)],
      [advisor(0, { business_args: { id: "REQ-2" } }), write(10)],
      [advisor(0, { tool: "kb_search" }), write(10)],
      [advisor(0, { session_id: "t" }), write(10)],
      [
        advisor(0, { semantic_source_hash: "a" }),
        write(10, { semantic_source_hash: "b" }),
      ],
      [advisor(0), write(day + 1)],
      [advisor(20), write(10)],
    ]) {
      expect(lines(items(events, metric))).toEqual([2]);
    }
  });

  test("checks recent requirement writes only", () => {
    expect(
      items([write(10, { business_args: { type: "fact", id: "F" } })], metric),
    ).toEqual([]);
    expect(items([write(10, { tool: "kb_delete" })], metric)).toEqual([]);
    expect(
      lines(items([write(1), write(2)], metric, { eventLimit: 1 })),
    ).toEqual([2]);
  });
});

describe("lookup before first edit", () => {
  const metric = "lookup_before_first_edit";
  const edit = (extra: Record<string, unknown> = {}) =>
    hook({
      hook_action: "edited",
      session_id: "s",
      requirement_ids: ["REQ-1"],
      path: "src/a.ts",
      timestamp: at(1),
      ...extra,
    });

  test("cites a first linked edit without a lookup", () => {
    expect(
      items([{ tool: "kb_status" }, edit({ request_id: "e" })], metric),
    ).toStrictEqual([
      {
        id: "lookup_before_first_edit:line-2:src/a.ts",
        rank: 35,
        metric,
        scope: "event",
        target: "src/a.ts",
        reason:
          "This session edited a requirement-linked file before any kb_search or kb_query.",
        action:
          "Before the next edit of this file, run kb_search for the change or kb_query with this sourceFile, and read the requirements it names.",
        event: {
          logLine: 2,
          requestId: "e",
          timestamp: at(1),
          tool: null,
          sessionId: "s",
          actorId: null,
        },
      },
    ]);
    expect(items([edit({ path: null })], metric)[0]?.target).toBe(
      "unknown path",
    );
  });

  test("skips sessions that looked up first and edits before the window", () => {
    expect(
      items(
        [
          hook({
            hook_action: "kb_usage",
            kb_operation: "kb_search",
            session_id: "s",
          }),
          edit(),
        ],
        metric,
      ),
    ).toEqual([]);
    expect(
      items([edit(), { tool: "a" }, { tool: "b" }], metric, { eventLimit: 1 }),
    ).toEqual([]);
  });
});

describe("source lookup zero results", () => {
  const metric = "source_lookup_zero_result_rate";
  const lookup = (extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_query",
    status: "success",
    business_args: { sourceFile: "src/a.ts" },
    zero_results: true,
    ...extra,
  });

  test("cites recent empty source lookups", () => {
    expect(items([lookup({ request_id: "q" })], metric)).toStrictEqual([
      {
        id: "source_lookup_zero_result_rate:line-1:src/a.ts",
        rank: 60,
        metric,
        scope: "event",
        target: "src/a.ts",
        reason: "This source-linked lookup returned zero results.",
        action:
          "Inspect the source, refresh its symbol links if stale, then repeat search followed by exact query.",
        event: {
          logLine: 1,
          requestId: "q",
          timestamp: null,
          tool: "kb_query",
          sessionId: null,
          actorId: null,
        },
      },
    ]);
    expect(
      lines(
        items(
          [
            lookup({ tool: "kb_search", zero_results: false, result_count: 0 }),
            lookup({ status: undefined, success: true }),
          ],
          metric,
        ),
      ),
    ).toEqual([1, 2]);
  });

  test("ignores lookups that do not qualify", () => {
    expect(
      items(
        [
          lookup({ tool: "kb_status" }),
          lookup({ status: "error" }),
          lookup({ business_args: { sourceFile: 1 } }),
          lookup({ zero_results: false, result_count: 2 }),
          lookup({ zero_results: undefined }),
        ],
        metric,
      ),
    ).toEqual([]);
    expect(items([lookup(), lookup()], metric, { eventLimit: 1 })).toHaveLength(
      1,
    );
  });
});

describe("coverage evidence", () => {
  const coverage = (extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_coverage",
    status: "success",
    coverage_scope_complete: true,
    coverage_proof_gap_count: 3,
    coverage_receipt_gap_count: 2,
    ...extra,
  });
  const both = {
    proof_gap_recovery: "failed",
    e2e_receipt_freshness: "failed",
  };

  test("cites the latest complete requirement coverage", () => {
    const events = [
      coverage({ coverage_proof_gap_count: 9 }),
      coverage({ coverage_by: "req", request_id: "c" }),
      coverage({ coverage_by: "symbol" }),
      coverage({ coverage_scope_complete: false }),
      coverage({ status: "error" }),
      coverage({ tool: "kb_status" }),
      coverage({ coverage_proof_gap_count: undefined }),
    ];
    const reference = {
      logLine: 2,
      requestId: "c",
      timestamp: null,
      tool: "kb_coverage",
      sessionId: null,
      actorId: null,
    };
    expect(run(events, both).items).toStrictEqual([
      {
        id: "e2e_receipt_freshness:line-2:coverage:req",
        rank: 40,
        metric: "e2e_receipt_freshness",
        scope: "event",
        target: "coverage:req",
        reason: "The latest complete report has 2 receipt gaps.",
        action:
          "Run `kibi prove` for the cited requirements or integrations; receipts append idempotently with preserved history, then sync and rerun coverage.",
        event: reference,
      },
      {
        id: "proof_gap_recovery:line-2:coverage:req",
        rank: 50,
        metric: "proof_gap_recovery",
        scope: "event",
        target: "coverage:req",
        reason:
          "The latest complete report has 3 proof gaps without demonstrated recovery.",
        action:
          "Apply one reviewed repair batch and rerun complete requirement coverage.",
        event: reference,
      },
    ]);
    expect(
      lines(run([coverage({ status: undefined, success: true })], both).items),
    ).toEqual([1, 1]);
  });

  test("reports missing coverage evidence", () => {
    const expected: TelemetryRemediationItem[] = [
      {
        id: "e2e_receipt_freshness:report:coverage:req",
        rank: 40,
        metric: "e2e_receipt_freshness",
        scope: "report",
        target: "coverage:req",
        reason:
          "No complete requirement coverage event contains receipt-freshness evidence.",
        action:
          "Run complete requirement coverage after attaching fresh E2E verification receipts.",
        event: null,
      },
      {
        id: "proof_gap_recovery:report:coverage:req",
        rank: 50,
        metric: "proof_gap_recovery",
        scope: "report",
        target: "coverage:req",
        reason:
          "No complete requirement coverage event contains proof-gap evidence.",
        action:
          "Run kb_coverage by req with complete scope and diagnostic telemetry.",
        event: null,
      },
    ];
    expect(
      run([coverage({ coverage_by: "symbol" })], both).items,
    ).toStrictEqual(expected);
    expect(
      run([coverage(), coverage({ request_id: "x" })], both, { eventLimit: 0 })
        .items,
    ).toStrictEqual(expected);
    const noReceipts = run(
      [coverage({ coverage_receipt_gap_count: undefined })],
      both,
    ).items;
    expect(noReceipts.map((item) => item.scope)).toEqual(["report", "event"]);
  });
});

describe("repeated mutation failures", () => {
  const metric = "repeated_mutation_failures";
  const attempt = (outcome: "error" | "success" | "none", id = "A") => ({
    tool: "kb_upsert",
    ...(outcome === "none" ? {} : { status: outcome }),
    business_args: { type: "req", id },
  });

  test("cites every event of a streak at the threshold", () => {
    const found = items(
      [
        attempt("error"),
        attempt("error", "B"),
        attempt("none"),
        { ...attempt("none"), success: false },
        attempt("error"),
        attempt("success"),
        attempt("error", "B"),
      ],
      metric,
    );
    expect(lines(found)).toEqual([1, 4, 5]);
    expect(found[0]).toStrictEqual({
      id: "repeated_mutation_failures:line-1:req:A",
      rank: 10,
      metric,
      scope: "event",
      target: "req:A",
      reason:
        "This event belongs to a mutation-failure streak at or above the retry threshold.",
      action:
        "Stop retrying; inspect endpoints and the exact preflight result, then make one repaired attempt.",
      event: {
        logLine: 1,
        requestId: null,
        timestamp: null,
        tool: "kb_upsert",
        sessionId: null,
        actorId: null,
      },
    });
  });

  test("resets a streak on success and flushes open streaks", () => {
    expect(
      items(
        [
          attempt("error"),
          attempt("error"),
          { ...attempt("none"), success: true },
          attempt("error"),
          attempt("error"),
        ],
        metric,
      ),
    ).toEqual([]);
    expect(
      lines(
        items(
          [attempt("error"), attempt("error"), attempt("error", "B")],
          metric,
          { repeatedMutationFailureThreshold: 2 },
        ),
      ),
    ).toEqual([1, 2]);
    expect(
      items(
        [
          attempt("error"),
          attempt("error"),
          { ...attempt("error"), tool: "kb_delete" },
        ],
        metric,
      ),
    ).toEqual([]);
    expect(
      items([attempt("error"), attempt("error"), attempt("error")], metric, {
        eventLimit: 2,
      }),
    ).toEqual([]);
  });
});

describe("inactive metrics", () => {
  test("stay silent even when their evidence is present", () => {
    const events: TelemetryUsageEvent[] = [
      hook({
        hook_action: "edited",
        session_id: "s",
        requirement_ids: ["REQ-1"],
        path: "src/a.ts",
      }),
      {
        tool: "kb_query",
        status: "success",
        business_args: { sourceFile: "src/a.ts" },
        zero_results: true,
        telemetry: {},
      },
      ...[1, 2, 3].map(() => ({
        tool: "kb_upsert",
        status: "error",
        business_args: { type: "fact", id: "F" },
        telemetry: {},
      })),
    ];
    expect(
      run(events, {
        lookup_before_first_edit: "passed",
        source_lookup_zero_result_rate: "passed",
        repeated_mutation_failures: "passed",
        validation_before_upsert: "passed",
        advisor_before_requirement_write: "passed",
        telemetry_completeness: "passed",
      }).items,
    ).toEqual([]);
  });
});

describe("timestamps near the epoch", () => {
  const preflight = (timestamp?: string) => ({
    tool: "kb_validate_upsert",
    status: "success",
    business_args: { id: "X" },
    ...(timestamp === undefined ? {} : { timestamp }),
  });
  const upsert = (timestamp?: string) => ({
    tool: "kb_upsert",
    status: "success",
    business_args: { id: "X" },
    ...(timestamp === undefined ? {} : { timestamp }),
  });

  test("never treat a missing time as zero", () => {
    const metric = "validation_before_upsert";
    expect(
      lines(items([preflight(), upsert("1970-01-01T00:10:00.000Z")], metric)),
    ).toEqual([2]);
    expect(
      lines(items([preflight("1970-01-01T00:00:00.000Z"), upsert()], metric)),
    ).toEqual([2]);
    expect(
      items(
        [
          preflight("1970-01-01T00:00:00.000Z"),
          upsert("1970-01-01T00:10:00.000Z"),
        ],
        metric,
      ),
    ).toEqual([]);
  });
});

describe("advisor ids", () => {
  test("ignore a non-string requirement id", () => {
    const metric = "advisor_before_requirement_write";
    expect(
      lines(
        items(
          [
            {
              tool: "kb_semantic_advisor",
              status: "success",
              business_args: { requirementId: 7 },
              timestamp: at(0),
            },
            {
              tool: "kb_upsert",
              status: "success",
              business_args: { type: "req", requirementId: 7 },
              timestamp: at(1),
            },
          ],
          metric,
        ),
      ),
    ).toEqual([2]);
  });
});

describe("correlation from callable telemetry", () => {
  test("reads only record telemetry", () => {
    const telemetry = Object.assign(() => undefined, { session_id: "fn" });
    expect(
      items(
        [{ tool: "a", telemetry_status: "missing", telemetry }],
        "telemetry_completeness",
      )[0]?.event?.sessionId,
    ).toBeNull();
  });
});

describe("mutation streak flushing", () => {
  test("a success without earlier failures starts no streak", () => {
    expect(
      items(
        [{ tool: "kb_upsert", status: "success", business_args: { id: "A" } }],
        "repeated_mutation_failures",
        { repeatedMutationFailureThreshold: 0 },
      ),
    ).toEqual([]);
  });

  test("streaks flushed in any order are cited in log order", () => {
    const attempt = (id: string, status: string) => ({
      tool: "kb_upsert",
      status,
      business_args: { id },
    });
    expect(
      lines(
        items(
          [
            attempt("A", "error"),
            attempt("A", "error"),
            attempt("B", "error"),
            attempt("B", "error"),
            attempt("B", "success"),
          ],
          "repeated_mutation_failures",
          { repeatedMutationFailureThreshold: 2 },
        ),
      ),
    ).toEqual([1, 2, 3, 4]);
  });
});

describe("ordering", () => {
  test("orders by rank, then log line, with report items last", () => {
    const events: TelemetryUsageEvent[] = [
      { tool: "kb_upsert", status: "error", business_args: { id: "A" } },
      { tool: "kb_status" },
      { tool: "kb_upsert", status: "error", business_args: { id: "A" } },
      { tool: "kb_upsert", status: "error", business_args: { id: "A" } },
    ];
    const report = remediateTelemetryAcceptance(
      events,
      acceptance(
        {
          telemetry_completeness: "failed",
          repeated_mutation_failures: "failed",
        },
        false,
      ),
      policy({ minimumEvents: 9 }),
    );
    expect(
      report.items.map((item) => [item.rank, item.event?.logLine]),
    ).toEqual([
      [5, undefined],
      [10, 1],
      [10, 3],
      [10, 4],
      [70, 1],
      [70, 2],
      [70, 3],
      [70, 4],
      [70, undefined],
    ]);
    expect(report.summary).toStrictEqual({
      total: 9,
      eventItems: 7,
      reportItems: 2,
    });
  });
});
