import { describe, expect, test } from "bun:test";

import {
  DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  type TelemetryAcceptancePolicy,
  type TelemetryAcceptanceReport,
  type TelemetryUsageEvent,
  analyzeTelemetryAcceptance,
  createTelemetryAcceptanceDiagnostics,
  firstLinkedEdits,
  parseTelemetryUsageLog,
  partitionTelemetryUsage,
} from "../../src/public/telemetry-acceptance.js";
import { expectGolden } from "./helpers/golden.js";

const BASE = Date.parse("2026-01-01T00:00:00.000Z");
const at = (seconds: number) => new Date(BASE + seconds * 1_000).toISOString();
const NOW = new Date(BASE + 10_000);

const policy = (
  overrides: Partial<TelemetryAcceptancePolicy> = {},
): TelemetryAcceptancePolicy => ({
  ...DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  ...overrides,
});

const analyze = (
  events: readonly TelemetryUsageEvent[],
  overrides: Partial<TelemetryAcceptancePolicy> = {},
  now: Date = NOW,
) => analyzeTelemetryAcceptance(events, now, policy(overrides));

const metric = (
  events: readonly TelemetryUsageEvent[],
  id: string,
  overrides: Partial<TelemetryAcceptancePolicy> = {},
  now: Date = NOW,
) => {
  const found = analyze(events, overrides, now).metrics.find(
    (entry) => entry.id === id,
  );
  if (found === undefined) throw new Error(`missing metric ${id}`);
  return found;
};

const hook = (event: Record<string, unknown>) =>
  ({ interface: "hook", ...event }) as TelemetryUsageEvent;

describe("usage log parsing", () => {
  test("keeps log lines for operations and hook rows", () => {
    const parsed = parseTelemetryUsageLog(
      `\n{"tool":"a"}\n{"interface":"hook","hook_action":"x"}\n\n{"tool":"b"}\n`,
    );
    expect(parsed).toEqual([{ tool: "a" }, { tool: "b" }]);
    const partition = partitionTelemetryUsage(parsed);
    expect(partition.operations).toBe(parsed);
    expect(partition.operationLines).toEqual([2, 5]);
    expect(partition.hookRows).toEqual([
      {
        event: { interface: "hook", hook_action: "x" } as TelemetryUsageEvent,
        logLine: 3,
        operationsBefore: 1,
      },
    ]);
  });

  test("names the failing line", () => {
    expect(() => parseTelemetryUsageLog('{"tool":"a"}\n{oops')).toThrow(
      /^Failed to parse \.kb\/usage\.log line 2: (?!expected object)\S/,
    );
    expect(() => parseTelemetryUsageLog('{"tool":"a"}\r\n[1]')).toThrow(
      "Failed to parse .kb/usage.log line 2: expected object",
    );
  });

  test("splits in-memory events by position", () => {
    const events = [
      hook({ hook_action: "x" }),
      { tool: "a" },
      hook({ hook_action: "y" }),
      { tool: "b" },
    ];
    const partition = partitionTelemetryUsage(events);
    expect(partition.operations).toEqual([{ tool: "a" }, { tool: "b" }]);
    expect(partition.operationLines).toEqual([2, 4]);
    expect(
      partition.hookRows.map((row) => [row.logLine, row.operationsBefore]),
    ).toEqual([
      [1, 0],
      [3, 1],
    ]);
  });
});

describe("telemetry completeness", () => {
  test("counts provided telemetry and omits an undefined rate", () => {
    const found = metric(
      [
        { tool: "a", telemetry_status: "missing", telemetry: {} },
        { tool: "b", telemetry: null },
        { tool: "c" },
        { tool: "d", telemetry: {} },
        { tool: "e", telemetry_status: "provided" },
        { tool: "f", telemetry: {} },
      ],
      "telemetry_completeness",
      { minimumEvents: 6 },
    );
    expect(found).toStrictEqual({
      id: "telemetry_completeness",
      status: "failed",
      numerator: 3,
      denominator: 6,
      rate: 0.5,
      threshold: { operator: ">=", value: 0.95 },
      message: "3/6 recent events include diagnostic telemetry.",
    });
    expect(
      metric([], "telemetry_completeness", { minimumEvents: 0 }),
    ).toStrictEqual({
      id: "telemetry_completeness",
      status: "not_applicable",
      numerator: 0,
      denominator: 0,
      threshold: { operator: ">=", value: 0.95 },
      message: "0/0 recent events include diagnostic telemetry.",
    });
  });
});

describe("validation before upsert", () => {
  const preflight = (seconds: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_validate_upsert",
    success: true,
    timestamp: at(seconds),
    business_args: { type: "req", id: "R", list: [{ b: 1, a: 2 }] },
    ...extra,
  });
  const upsert = (seconds: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_upsert",
    status: "success",
    timestamp: at(seconds),
    business_args: { list: [{ a: 2, b: 1 }], id: "R", type: "req" },
    ...extra,
  });
  const validated = (events: readonly TelemetryUsageEvent[], extra = {}) =>
    metric(events, "validation_before_upsert", extra).numerator;

  test("matches canonical payloads within the age", () => {
    expect(validated([preflight(0), upsert(5)])).toBe(1);
    expect(validated([preflight(5), upsert(5)])).toBe(1);
    expect(validated([preflight(6), upsert(5)])).toBe(0);
    expect(
      validated([
        preflight(0, { status: "error", success: undefined }),
        upsert(5),
      ]),
    ).toBe(0);
    expect(validated([preflight(0, { success: undefined }), upsert(5)])).toBe(
      0,
    );
  });

  test("never treats a missing time as the epoch", () => {
    const epoch = (seconds: number) => new Date(seconds * 1_000).toISOString();
    expect(
      validated([
        preflight(0, { timestamp: undefined }),
        upsert(0, { timestamp: epoch(10) }),
      ]),
    ).toBe(0);
    expect(
      validated([
        preflight(0, { timestamp: epoch(0) }),
        upsert(0, { timestamp: undefined }),
      ]),
    ).toBe(0);
    expect(
      validated([
        preflight(0, { timestamp: epoch(0) }),
        upsert(0, { timestamp: epoch(10) }),
      ]),
    ).toBe(1);
  });

  test("checks correlation ids from the event or its telemetry", () => {
    expect(
      validated([
        preflight(0, { telemetry: { session_id: "a" } }),
        upsert(5, { telemetry: { session_id: "b" } }),
      ]),
    ).toBe(0);
    expect(
      validated([
        preflight(0, { session_id: "", telemetry: { session_id: "a" } }),
        upsert(5, { session_id: "a" }),
      ]),
    ).toBe(1);
    expect(
      validated([
        preflight(0, { telemetry: { session_id: 1 } }),
        upsert(5, { session_id: "a" }),
      ]),
    ).toBe(1);
    expect(validated([preflight(0), upsert(5, { actor_id: "x" })])).toBe(1);
    expect(validated([preflight(0, { actor_id: "x" }), upsert(5)])).toBe(1);
  });

  test("counts recent upserts from the window start", () => {
    const events = [
      preflight(0),
      upsert(1),
      upsert(2, { business_args: { x: 1 } }),
    ];
    expect(
      metric(events, "validation_before_upsert", { eventLimit: 2 }),
    ).toMatchObject({ numerator: 1, denominator: 2 });
  });

  test("lists at most twenty sorted unvalidated targets", () => {
    const events = Array.from({ length: 22 }, (_, index) =>
      upsert(index, {
        mutation_target: `T${String(21 - index).padStart(2, "0")}`,
      }),
    );
    const found = metric(
      [...events, upsert(30, { business_args: { type: "fact", id: "F" } })],
      "validation_before_upsert",
    );
    const targets = (found.evidence as { unvalidatedTargets: string[] })
      .unvalidatedTargets;
    expect(targets).toHaveLength(20);
    expect(targets[0]).toBe("T00");
    expect(targets[19]).toBe("T19");
    expect(
      (
        metric(
          [upsert(1, { business_args: { type: "fact", id: "F" } })],
          "validation_before_upsert",
        ).evidence as { unvalidatedTargets: string[] }
      ).unvalidatedTargets,
    ).toEqual(["fact:F"]);
  });

  test("omits the rate without attempts", () => {
    expect(metric([], "validation_before_upsert")).not.toHaveProperty("rate");
  });
});

describe("advisor before requirement write", () => {
  const advisor = (seconds: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_semantic_advisor",
    status: "success",
    timestamp: at(seconds),
    business_args: { id: "REQ-1" },
    ...extra,
  });
  const write = (seconds: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_upsert",
    status: "success",
    timestamp: at(seconds),
    business_args: { type: "req", id: "REQ-1" },
    ...extra,
  });
  const advised = (events: readonly TelemetryUsageEvent[], extra = {}) =>
    metric(events, "advisor_before_requirement_write", extra);

  test("matches by id, requirement id and source hash", () => {
    expect(advised([advisor(0), write(5)]).numerator).toBe(1);
    expect(
      advised([advisor(0), write(5, { semantic_source_hash: "h" })]).numerator,
    ).toBe(1);
    expect(
      advised([
        advisor(0, { semantic_source_hash: "h" }),
        write(5, { semantic_source_hash: "g" }),
      ]).numerator,
    ).toBe(0);
    expect(
      advised([
        advisor(0, { business_args: { requirementId: 7 } }),
        write(5, { business_args: { type: "req", requirementId: 7 } }),
      ]).numerator,
    ).toBe(0);
    expect(
      advised([
        advisor(0, { business_args: {} }),
        write(5, { business_args: { type: "req" }, mutation_target: "req:x" }),
      ]).numerator,
    ).toBe(0);
  });

  test("matches an advisor hash against a write without one", () => {
    expect(
      advised([advisor(0, { semantic_source_hash: "h" }), write(5)]),
    ).toMatchObject({ numerator: 1, denominator: 1, rate: 1 });
  });

  test("counts recent requirement writes only", () => {
    expect(
      advised([advisor(0), write(1), write(2)], { eventLimit: 1 }),
    ).toMatchObject({ numerator: 1, denominator: 1 });
  });

  test("lists at most twenty sorted unadvised requirements", () => {
    const writes = Array.from({ length: 21 }, (_, index) =>
      write(index, {
        business_args: {
          type: "req",
          id: `REQ-${String(20 - index).padStart(2, "0")}`,
        },
      }),
    );
    const list = (
      advised(writes).evidence as { unadvisedRequirements: string[] }
    ).unadvisedRequirements;
    expect(list).toHaveLength(20);
    expect(list[0]).toBe("REQ-00");
    expect(list[19]).toBe("REQ-19");
    expect(advised([])).not.toHaveProperty("rate");
  });
});

describe("first linked edits", () => {
  const row = (
    event: Record<string, unknown>,
    logLine: number,
    operationsBefore = 0,
  ) => ({
    event: { interface: "hook", ...event } as never,
    logLine,
    operationsBefore,
  });

  test("tracks the first edit of each session", () => {
    const edits = firstLinkedEdits(
      [
        row(
          { hook_action: "edited", session_id: "", requirement_ids: ["R"] },
          1,
          2,
        ),
        row(
          { hook_action: "edited", session_id: 5, requirement_ids: ["R"] },
          1,
          2,
        ),
        row(
          {
            hook_action: "kb_usage",
            kb_operation: "kb_status",
            session_id: "s",
            requirement_ids: ["R"],
          },
          2,
        ),
        row(
          {
            hook_action: "edited",
            kb_operation: "kb_search",
            session_id: "s",
            requirement_ids: ["R"],
          },
          3,
          2,
        ),
        row(
          {
            hook_action: "kb_usage",
            kb_operation: "kb_query",
            session_id: "t",
            host: "h",
          },
          4,
        ),
        row(
          {
            hook_action: "edited",
            session_id: "t",
            host: "h",
            requirement_ids: ["R"],
          },
          5,
          2,
        ),
      ],
      2,
    );
    expect(
      edits.map((edit) => [edit.session, edit.edit.logLine, edit.lookedUp]),
    ).toEqual([
      ["unknown:s", 3, false],
      ["h:t", 5, true],
    ]);
    expect(
      firstLinkedEdits(
        [
          row(
            { hook_action: "edited", session_id: "s", requirement_ids: ["R"] },
            1,
            1,
          ),
        ],
        2,
      ),
    ).toEqual([]);
  });

  test("lists unguided paths, falling back to unknown", () => {
    const events = [
      { tool: "kb_status", timestamp: at(0) },
      ...Array.from({ length: 21 }, (_, index) =>
        hook({
          hook_action: "edited",
          session_id: `s${index}`,
          requirement_ids: ["R"],
          path: `p${String(20 - index).padStart(2, "0")}`,
        }),
      ),
      hook({ hook_action: "edited", session_id: "z", requirement_ids: ["R"] }),
    ];
    const found = metric(events, "lookup_before_first_edit");
    const paths = (found.evidence as { unguidedEditPaths: string[] })
      .unguidedEditPaths;
    expect(paths).toHaveLength(20);
    expect(paths[0]).toBe("p00");
    expect(
      (
        metric(
          [
            hook({
              hook_action: "edited",
              session_id: "z",
              requirement_ids: ["R"],
            }),
          ],
          "lookup_before_first_edit",
        ).evidence as { unguidedEditPaths: string[] }
      ).unguidedEditPaths,
    ).toEqual(["unknown path"]);
    expect(metric([], "lookup_before_first_edit")).not.toHaveProperty("rate");
  });
});

describe("source lookup zero results", () => {
  const lookup = (extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_query",
    status: "success",
    business_args: { sourceFile: "src/a.ts" },
    result_count: 0,
    ...extra,
  });
  const zero = (events: readonly TelemetryUsageEvent[], extra = {}) =>
    metric(events, "source_lookup_zero_result_rate", extra);

  test("counts readable source-linked lookups", () => {
    const found = zero([
      lookup(),
      lookup({
        tool: "kb_search",
        result_count: undefined,
        zero_results: true,
      }),
      lookup({ result_count: 3 }),
      lookup({ result_count: undefined, zero_results: false }),
      lookup({ tool: "kb_status" }),
      lookup({ status: "error" }),
      lookup({ business_args: {} }),
      lookup({ result_count: undefined }),
      lookup({
        result_count: undefined,
        zero_results: "yes" as unknown as boolean,
      }),
    ]);
    expect(found).toMatchObject({
      status: "failed",
      numerator: 2,
      denominator: 4,
      rate: 0.5,
      message:
        "2/4 source-linked lookups returned zero results. 2 source-linked lookups recorded no readable result count.",
    });
  });

  test("reports unreadable lookups as insufficient evidence", () => {
    expect(zero([lookup({ result_count: undefined })])).toStrictEqual({
      id: "source_lookup_zero_result_rate",
      status: "insufficient_evidence",
      numerator: 0,
      denominator: 0,
      threshold: { operator: "<=", value: 0.2 },
      message: "1 source-linked lookups recorded no readable result count.",
      evidence: { zeroResultSourceFiles: [] },
    });
    expect(zero([])).toMatchObject({
      status: "not_applicable",
      message:
        "No source-linked query or search calls occurred in the evaluated window.",
    });
    expect(zero([lookup({ result_count: 2 })])).toMatchObject({
      status: "passed",
      message: "0/1 source-linked lookups returned zero results.",
    });
  });

  test("ranks zero-result files by count, then name", () => {
    const files = ["a", "b", "c", "c", "d", "d", "d"].map((file) =>
      lookup({ business_args: { sourceFile: file } }),
    );
    const many = Array.from({ length: 22 }, (_, index) =>
      lookup({
        business_args: { sourceFile: `m${String(index).padStart(2, "0")}` },
      }),
    );
    expect(
      (
        zero(files).evidence as {
          zeroResultSourceFiles: { sourceFile: string; count: number }[];
        }
      ).zeroResultSourceFiles,
    ).toEqual([
      { sourceFile: "d", count: 3 },
      { sourceFile: "c", count: 2 },
      { sourceFile: "a", count: 1 },
      { sourceFile: "b", count: 1 },
    ]);
    expect(
      (zero(many).evidence as { zeroResultSourceFiles: unknown[] })
        .zeroResultSourceFiles,
    ).toHaveLength(20);
  });
});

describe("coverage metrics", () => {
  const coverage = (proof: number, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_coverage",
    status: "success",
    coverage_scope_complete: true,
    coverage_proof_gap_count: proof,
    ...extra,
  });

  test("ignores other tools", () => {
    expect(
      metric([coverage(0, { tool: "kb_status" })], "proof_gap_recovery").status,
    ).toBe("insufficient_evidence");
  });

  test("measures recovery to zero and stalled recovery", () => {
    expect(
      metric([coverage(5), coverage(0)], "proof_gap_recovery"),
    ).toMatchObject({
      status: "passed",
      numerator: 5,
      denominator: 5,
    });
    expect(metric([coverage(0)], "proof_gap_recovery")).toMatchObject({
      numerator: 0,
      denominator: 0,
    });
    expect(
      metric([coverage(4), coverage(4)], "proof_gap_recovery"),
    ).toMatchObject({
      status: "failed",
      message:
        "Proof gaps did not recover: the previous complete report had 4 and the latest has 4.",
    });
  });

  test("reads receipt freshness from the latest complete coverage", () => {
    expect(metric([], "e2e_receipt_freshness")).toMatchObject({
      status: "insufficient_evidence",
    });
    expect(metric([coverage(5)], "e2e_receipt_freshness")).toMatchObject({
      status: "insufficient_evidence",
      denominator: 0,
    });
    expect(
      metric(
        [coverage(5, { coverage_receipt_gap_count: 2 })],
        "e2e_receipt_freshness",
      ),
    ).toMatchObject({ status: "failed", numerator: 2, denominator: 5 });
    expect(
      metric(
        [coverage(5, { coverage_receipt_gap_count: 0 })],
        "e2e_receipt_freshness",
      ),
    ).toMatchObject({
      status: "passed",
      message:
        "The latest complete requirement coverage event has no receipt-specific gaps.",
    });
  });
});

describe("repeated mutation failures", () => {
  const attempt = (target: string, extra: TelemetryUsageEvent = {}) => ({
    tool: "kb_upsert",
    status: "error",
    mutation_target: target,
    ...extra,
  });
  const failures = (events: readonly TelemetryUsageEvent[], extra = {}) =>
    metric(events, "repeated_mutation_failures", extra).evidence as {
      targets: {
        target: string;
        consecutiveFailures: number;
        errorCategories: string[];
      }[];
    };

  test("keeps streaks across neutral events and sorts categories", () => {
    expect(
      failures([
        attempt("A", { error_category: "z" }),
        attempt("A", { status: undefined }),
        attempt("A", { error_category: "a" }),
        attempt("A"),
        attempt("B", { status: undefined, success: false }),
        attempt("B"),
        attempt("B"),
      ]).targets,
    ).toStrictEqual([
      { target: "A", consecutiveFailures: 3, errorCategories: ["a", "z"] },
      { target: "B", consecutiveFailures: 3, errorCategories: [] },
    ]);
  });

  test("ranks by streak length and caps the list", () => {
    const ranked = failures([
      attempt("C"),
      attempt("C"),
      attempt("C"),
      attempt("A"),
      attempt("A"),
      attempt("A"),
      attempt("A"),
      attempt("B"),
      attempt("B"),
      attempt("B"),
    ]).targets.map((entry) => entry.target);
    expect(ranked).toEqual(["A", "B", "C"]);
    const many = Array.from({ length: 21 }, (_, index) => [
      attempt(`T${index}`),
      attempt(`T${index}`),
      attempt(`T${index}`),
    ]).flat();
    expect(failures(many).targets).toHaveLength(20);
  });
});

describe("freshness", () => {
  test("separates stale from future-dated evidence", () => {
    expect(analyze([], { maxFutureSkewSeconds: -10 }).diagnostics).toEqual([
      "usage_log_empty",
      "usage_log_stale",
    ]);
    const events = [{ tool: "a", timestamp: at(0) }];
    expect(
      analyze(events, { maxEvidenceAgeSeconds: 5 }, new Date(BASE + 200_000))
        .diagnostics,
    ).toEqual(["usage_log_stale"]);
    expect(
      analyze(events, { maxEvidenceAgeSeconds: 5 }, new Date(BASE + 100_000))
        .diagnostics,
    ).toEqual(["usage_log_stale"]);
    expect(analyze(events, {}, new Date(BASE - 1_000_000)).diagnostics).toEqual(
      ["usage_log_future_dated"],
    );
    expect(
      analyze(
        events,
        { maxEvidenceAgeSeconds: -400, maxFutureSkewSeconds: 300 },
        new Date(BASE - 300_000),
      ).diagnostics,
    ).toEqual(["usage_log_stale"]);
  });
});

describe("acceptance diagnostics", () => {
  const ids = [
    "telemetry_completeness",
    "advisor_before_requirement_write",
    "validation_before_upsert",
    "lookup_before_first_edit",
    "source_lookup_zero_result_rate",
    "proof_gap_recovery",
    "e2e_receipt_freshness",
    "repeated_mutation_failures",
  ];
  const report = (
    statuses: readonly string[],
    scope: Record<string, unknown>,
  ): TelemetryAcceptanceReport =>
    ({
      version: "kibi.telemetry-acceptance.v1",
      scope,
      diagnostics: ["usage_log_stale"],
      metrics: [
        ...ids.map((id, index) => ({
          id,
          status: statuses[index],
          message: `${id} message`,
        })),
        { id: "unknown_metric", status: "failed", message: "x" },
      ],
    }) as unknown as TelemetryAcceptanceReport;

  test("explain every failed metric", () => {
    expectGolden(
      "telemetry-acceptance-diagnostics",
      createTelemetryAcceptanceDiagnostics(
        report(
          ids.map(() => "failed"),
          { fresh: false, lastTimestamp: "2026-01-01T00:00:00.000Z" },
        ),
      ),
    );
  });

  test("explain missing evidence", () => {
    expectGolden(
      "telemetry-acceptance-diagnostics-insufficient",
      createTelemetryAcceptanceDiagnostics(
        report(
          ids.map((_, index) =>
            index % 2 === 0 ? "insufficient_evidence" : "passed",
          ),
          { fresh: false, lastTimestamp: null },
        ),
      ),
    );
    expect(
      createTelemetryAcceptanceDiagnostics(
        report(
          ids.map(() => "passed"),
          { fresh: true, lastTimestamp: null },
        ),
      ),
    ).toEqual([]);
  });
});
