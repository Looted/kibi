import type { QualityDiagnostic } from "./impact/types.js";
import type {
  TelemetryAcceptanceMetric,
  TelemetryAcceptancePolicy,
  TelemetryAcceptanceReport,
  TelemetryAcceptanceStatus,
  TelemetryMetricId,
  TelemetryMetricStatus,
  TelemetryUsageEvent,
} from "./telemetry-acceptance-types.js";

export type {
  TelemetryAcceptanceMetric,
  TelemetryAcceptancePolicy,
  TelemetryAcceptanceReport,
  TelemetryAcceptanceStatus,
  TelemetryMetricId,
  TelemetryMetricStatus,
  TelemetryUsageEvent,
} from "./telemetry-acceptance-types.js";

export const TELEMETRY_ACCEPTANCE_VERSION =
  "kibi.telemetry-acceptance.v1" as const;

export const DEFAULT_TELEMETRY_ACCEPTANCE_POLICY = {
  eventLimit: 200,
  minimumEvents: 20,
  maxEvidenceAgeSeconds: 7 * 24 * 60 * 60,
  maxFutureSkewSeconds: 5 * 60,
  telemetryCompletenessMinimum: 0.95,
  validationBeforeUpsertMinimum: 1,
  advisorBeforeRequirementWriteMinimum: 1,
  lookupBeforeFirstEditMinimum: 1,
  sourceLookupZeroResultMaximum: 0.2,
  preflightMaxAgeSeconds: 60 * 60,
  advisorMaxAgeSeconds: 24 * 60 * 60,
  repeatedMutationFailureThreshold: 3,
} as const satisfies TelemetryAcceptancePolicy;

type MutableMetric = Omit<TelemetryAcceptanceMetric, "evidence"> & {
  evidence?: Record<string, unknown>;
};

type TimedEvent = {
  readonly event: TelemetryUsageEvent;
  readonly index: number;
  readonly time: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// implements REQ-kibi-telemetry-acceptance-gate, REQ-claude-hook-usage-telemetry
/**
 * A row written by a host plugin hook (`interface: "hook"`). Hooks record
 * agent activity around Kibi calls: which Kibi operation a tool call ran
 * (`hook_action: "kb_usage"`) and which files an edit tool changed, with the
 * requirements those files' symbols implement (`hook_action: "edited"`).
 */
export interface TelemetryHookEvent extends TelemetryUsageEvent {
  readonly interface?: string;
  readonly host?: string;
  readonly hook_action?: string;
  readonly path?: string | null;
  readonly requirement_ids?: readonly string[];
  readonly kb_operation?: string | null;
}

// implements REQ-kibi-telemetry-acceptance-gate, REQ-claude-hook-usage-telemetry
/** A host hook row and where it sits relative to the operation events. */
export interface TelemetryHookRow {
  readonly event: TelemetryHookEvent;
  /** 1-based `.kb/usage.log` line (array position for in-memory events). */
  readonly logLine: number;
  /** Operation events that precede this row in the log. */
  readonly operationsBefore: number;
}

// implements REQ-kibi-telemetry-acceptance-gate, REQ-claude-hook-usage-telemetry
/** Operation events and host hook rows of one usage log, kept apart. */
export interface TelemetryUsagePartition {
  readonly operations: readonly TelemetryUsageEvent[];
  /** 1-based `.kb/usage.log` line of each operation event. */
  readonly operationLines: readonly number[];
  readonly hookRows: readonly TelemetryHookRow[];
}

/**
 * Hook rows and line numbers of every array `parseTelemetryUsageLog`
 * returned. The array itself keeps its operation-only shape, so callers that
 * pass it straight to the analyzers need no change.
 */
const parsedUsageLogs = new WeakMap<
  readonly TelemetryUsageEvent[],
  Omit<TelemetryUsagePartition, "operations">
>();

/**
 * Parse Kibi operation events from `.kb/usage.log`.
 *
 * Host plugin hooks share the log and tag their rows `interface: "hook"`.
 * Those rows describe agent activity around Kibi calls, not Kibi operations,
 * so they are left out of the returned array: otherwise a busy editing
 * session would push every operation out of the bounded acceptance window.
 * They stay attached to the array for `partitionTelemetryUsage`, which is how
 * the `lookup_before_first_edit` metric reads them.
 */
export function parseTelemetryUsageLog(
  contents: string,
): TelemetryUsageEvent[] {
  const events: TelemetryUsageEvent[] = [];
  const operationLines: number[] = [];
  const hookRows: TelemetryHookRow[] = [];
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to parse .kb/usage.log line ${index + 1}: ${message}`,
      );
    }
    if (!isRecord(parsed)) {
      throw new Error(
        `Failed to parse .kb/usage.log line ${index + 1}: expected object`,
      );
    }
    if (parsed.interface === "hook") {
      hookRows.push({
        event: parsed as TelemetryHookEvent,
        logLine: index + 1,
        operationsBefore: events.length,
      });
      continue;
    }
    events.push(parsed as TelemetryUsageEvent);
    operationLines.push(index + 1);
  }
  parsedUsageLogs.set(events, { operationLines, hookRows });
  return events;
}

// implements REQ-kibi-telemetry-acceptance-gate, REQ-claude-hook-usage-telemetry
/**
 * Split events into Kibi operations and host hook rows. Arrays from
 * `parseTelemetryUsageLog` carry their hook rows and log lines; any other
 * array is split on `interface: "hook"`, with positions as line numbers.
 */
export function partitionTelemetryUsage(
  events: readonly TelemetryUsageEvent[],
): TelemetryUsagePartition {
  const parsed = parsedUsageLogs.get(events);
  if (parsed !== undefined) return { operations: events, ...parsed };
  const operations: TelemetryUsageEvent[] = [];
  const operationLines: number[] = [];
  const hookRows: TelemetryHookRow[] = [];
  for (const [index, event] of events.entries()) {
    if ((event as TelemetryHookEvent).interface === "hook") {
      hookRows.push({
        event: event as TelemetryHookEvent,
        logLine: index + 1,
        operationsBefore: operations.length,
      });
    } else {
      operations.push(event);
      operationLines.push(index + 1);
    }
  }
  return { operations, operationLines, hookRows };
}

function eventArgs(
  event: TelemetryUsageEvent,
): Readonly<Record<string, unknown>> {
  return event.business_args ?? event.args ?? {};
}

function eventSucceeded(event: TelemetryUsageEvent): boolean {
  return event.status === "success" || event.success === true;
}

function eventFailed(event: TelemetryUsageEvent): boolean {
  return event.status === "error" || event.success === false;
}

function telemetryProvided(event: TelemetryUsageEvent): boolean {
  if (event.telemetry_status === "provided") return true;
  if (event.telemetry_status === "missing") return false;
  return event.telemetry !== null && event.telemetry !== undefined;
}

function timestampMillis(timestamp: string | undefined): number | null {
  if (timestamp === undefined) return null;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "_diagnostic_telemetry")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalValue(child)]),
  );
}

function mutationFingerprint(event: TelemetryUsageEvent): string {
  return (
    event.mutation_fingerprint ??
    JSON.stringify(canonicalValue(eventArgs(event)))
  );
}

function mutationTarget(event: TelemetryUsageEvent): string {
  if (event.mutation_target) return event.mutation_target;
  const args = eventArgs(event);
  const type = typeof args.type === "string" ? args.type : "unknown";
  const id = typeof args.id === "string" ? args.id : mutationFingerprint(event);
  return `${type}:${id}`;
}

function rate(numerator: number, denominator: number): number | undefined {
  return denominator === 0 ? undefined : numerator / denominator;
}

export function thresholdStatus(
  actual: number | undefined,
  operator: ">=" | "<=" | "<",
  expected: number,
): TelemetryMetricStatus {
  if (actual === undefined) return "not_applicable";
  if (operator === ">=") return actual >= expected ? "passed" : "failed";
  if (operator === "<=") return actual <= expected ? "passed" : "failed";
  return actual < expected ? "passed" : "failed";
}

function withinAge(
  earlier: number | null,
  later: number | null,
  maxAgeSeconds: number,
): boolean {
  if (earlier === null || later === null || earlier > later) return false;
  return later - earlier <= maxAgeSeconds * 1_000;
}

function telemetryCorrelationValue(
  event: TelemetryUsageEvent,
  key: "session_id" | "actor_id",
): string | undefined {
  if (typeof event[key] === "string" && event[key].length > 0) {
    return event[key];
  }
  return isRecord(event.telemetry) && typeof event.telemetry[key] === "string"
    ? event.telemetry[key]
    : undefined;
}

function correlationCompatible(
  evidence: TelemetryUsageEvent,
  action: TelemetryUsageEvent,
): boolean {
  for (const key of ["session_id", "actor_id"] as const) {
    const evidenceValue = telemetryCorrelationValue(evidence, key);
    const actionValue = telemetryCorrelationValue(action, key);
    if (
      evidenceValue !== undefined &&
      actionValue !== undefined &&
      evidenceValue !== actionValue
    ) {
      return false;
    }
  }
  return true;
}

function telemetryCompletenessMetric(
  recent: readonly TimedEvent[],
  policy: TelemetryAcceptancePolicy,
): MutableMetric {
  const complete = recent.filter(({ event }) =>
    telemetryProvided(event),
  ).length;
  const actual = rate(complete, recent.length);
  const enoughEvidence = recent.length >= policy.minimumEvents;
  return {
    id: "telemetry_completeness",
    status: enoughEvidence
      ? thresholdStatus(actual, ">=", policy.telemetryCompletenessMinimum)
      : "insufficient_evidence",
    numerator: complete,
    denominator: recent.length,
    ...(actual !== undefined ? { rate: actual } : {}),
    threshold: {
      operator: ">=",
      value: policy.telemetryCompletenessMinimum,
    },
    message: enoughEvidence
      ? `${complete}/${recent.length} recent events include diagnostic telemetry.`
      : `Only ${recent.length}/${policy.minimumEvents} required recent events are available.`,
  };
}

function validationBeforeUpsertMetric(
  all: readonly TimedEvent[],
  recentStart: number,
  policy: TelemetryAcceptancePolicy,
): MutableMetric {
  const validPreflights = new Map<string, TimedEvent[]>();
  let attempts = 0;
  let validated = 0;
  const unvalidatedTargets = new Set<string>();

  for (const current of all) {
    if (
      current.event.tool === "kb_validate_upsert" &&
      eventSucceeded(current.event) &&
      current.event.validation_valid !== false
    ) {
      const fingerprint = mutationFingerprint(current.event);
      const matches = validPreflights.get(fingerprint) ?? [];
      matches.push(current);
      validPreflights.set(fingerprint, matches);
      continue;
    }
    if (current.event.tool !== "kb_upsert" || current.index < recentStart) {
      continue;
    }
    attempts += 1;
    const fingerprint = mutationFingerprint(current.event);
    const match = (validPreflights.get(fingerprint) ?? []).findLast(
      (candidate) =>
        correlationCompatible(candidate.event, current.event) &&
        withinAge(candidate.time, current.time, policy.preflightMaxAgeSeconds),
    );
    if (match !== undefined) {
      validated += 1;
    } else {
      unvalidatedTargets.add(mutationTarget(current.event));
    }
  }

  const actual = rate(validated, attempts);
  return {
    id: "validation_before_upsert",
    status: thresholdStatus(actual, ">=", policy.validationBeforeUpsertMinimum),
    numerator: validated,
    denominator: attempts,
    ...(actual !== undefined ? { rate: actual } : {}),
    threshold: {
      operator: ">=",
      value: policy.validationBeforeUpsertMinimum,
    },
    message:
      attempts === 0
        ? "No upsert attempts occurred in the evaluated window."
        : `${validated}/${attempts} upsert attempts had a recent successful preflight for the exact payload.`,
    evidence: {
      unvalidatedTargets: [...unvalidatedTargets].sort().slice(0, 20),
      preflightMaxAgeSeconds: policy.preflightMaxAgeSeconds,
    },
  };
}

function advisorBeforeRequirementWriteMetric(
  all: readonly TimedEvent[],
  recentStart: number,
  policy: TelemetryAcceptancePolicy,
): MutableMetric {
  const advisors = new Map<
    string,
    Array<{
      readonly entry: TimedEvent;
      readonly sourceHash?: string;
    }>
  >();
  let attempts = 0;
  let advised = 0;
  const unadvisedRequirements = new Set<string>();

  for (const current of all) {
    const args = eventArgs(current.event);
    const id =
      typeof args.id === "string"
        ? args.id
        : typeof args.requirementId === "string"
          ? args.requirementId
          : undefined;
    if (
      current.event.tool === "kb_semantic_advisor" &&
      eventSucceeded(current.event) &&
      id !== undefined
    ) {
      const matches = advisors.get(id) ?? [];
      matches.push({
        entry: current,
        ...(current.event.semantic_source_hash !== undefined
          ? { sourceHash: current.event.semantic_source_hash }
          : {}),
      });
      advisors.set(id, matches);
      continue;
    }
    if (
      current.event.tool !== "kb_upsert" ||
      current.index < recentStart ||
      args.type !== "req"
    ) {
      continue;
    }
    attempts += 1;
    const requirementId = id ?? mutationTarget(current.event);
    const advisor = (advisors.get(requirementId) ?? []).findLast(
      (candidate) =>
        (candidate.sourceHash === undefined ||
          current.event.semantic_source_hash === undefined ||
          candidate.sourceHash === current.event.semantic_source_hash) &&
        correlationCompatible(candidate.entry.event, current.event) &&
        withinAge(
          candidate.entry.time,
          current.time,
          policy.advisorMaxAgeSeconds,
        ),
    );
    if (advisor !== undefined) {
      advised += 1;
    } else {
      unadvisedRequirements.add(requirementId);
    }
  }

  const actual = rate(advised, attempts);
  return {
    id: "advisor_before_requirement_write",
    status: thresholdStatus(
      actual,
      ">=",
      policy.advisorBeforeRequirementWriteMinimum,
    ),
    numerator: advised,
    denominator: attempts,
    ...(actual !== undefined ? { rate: actual } : {}),
    threshold: {
      operator: ">=",
      value: policy.advisorBeforeRequirementWriteMinimum,
    },
    message:
      attempts === 0
        ? "No requirement upsert attempts occurred in the evaluated window."
        : `${advised}/${attempts} requirement upserts followed a recent semantic-advisor pass for the same requirement and source hash when observable.`,
    evidence: {
      unadvisedRequirements: [...unadvisedRequirements].sort().slice(0, 20),
      advisorMaxAgeSeconds: policy.advisorMaxAgeSeconds,
    },
  };
}

// implements REQ-kibi-telemetry-acceptance-gate
/** Kibi operations that count as looking up requirements before an edit. */
export const LOOKUP_BEFORE_EDIT_OPERATIONS = ["kb_query", "kb_search"] as const;

// implements REQ-kibi-telemetry-acceptance-gate
/** The first requirement-linked edit of one host session. */
export interface FirstLinkedEdit {
  /** `<host>:<session_id>` of the session. */
  readonly session: string;
  readonly edit: TelemetryHookRow;
  /** True when kb_search or kb_query ran earlier in the same session. */
  readonly lookedUp: boolean;
}

function hookSession(event: TelemetryHookEvent): string | undefined {
  const sessionId = event.session_id;
  if (typeof sessionId !== "string" || sessionId.length === 0) return undefined;
  return `${event.host ?? "unknown"}:${sessionId}`;
}

// implements REQ-kibi-telemetry-acceptance-gate, REQ-claude-hook-usage-telemetry
/**
 * For each host session, its first edit of a file whose symbols implement a
 * requirement and whether a Kibi lookup (MCP or CLI) preceded it. Rows
 * without a session id cannot be ordered within a session and are skipped;
 * sessions whose first linked edit predates the evaluated window are left
 * out.
 */
export function firstLinkedEdits(
  hookRows: readonly TelemetryHookRow[],
  recentStart: number,
): FirstLinkedEdit[] {
  const lookedUp = new Set<string>();
  const edited = new Set<string>();
  const firstEdits: FirstLinkedEdit[] = [];
  for (const row of hookRows) {
    const session = hookSession(row.event);
    if (session === undefined) continue;
    const { hook_action: action, kb_operation: operation } = row.event;
    if (
      action === "kb_usage" &&
      LOOKUP_BEFORE_EDIT_OPERATIONS.some((candidate) => candidate === operation)
    ) {
      lookedUp.add(session);
      continue;
    }
    if (
      action !== "edited" ||
      edited.has(session) ||
      !Array.isArray(row.event.requirement_ids) ||
      row.event.requirement_ids.length === 0
    ) {
      continue;
    }
    edited.add(session);
    if (row.operationsBefore < recentStart) continue;
    firstEdits.push({ session, edit: row, lookedUp: lookedUp.has(session) });
  }
  return firstEdits;
}

function lookupBeforeFirstEditMetric(
  hookRows: readonly TelemetryHookRow[],
  recentStart: number,
  policy: TelemetryAcceptancePolicy,
): MutableMetric {
  const firstEdits = firstLinkedEdits(hookRows, recentStart);
  const attempts = firstEdits.length;
  const guided = firstEdits.filter((entry) => entry.lookedUp).length;
  const unguidedEditPaths = new Set(
    firstEdits
      .filter((entry) => !entry.lookedUp)
      .map((entry) => entry.edit.event.path ?? "unknown path"),
  );

  const actual = rate(guided, attempts);
  return {
    id: "lookup_before_first_edit",
    status: thresholdStatus(actual, ">=", policy.lookupBeforeFirstEditMinimum),
    numerator: guided,
    denominator: attempts,
    ...(actual !== undefined ? { rate: actual } : {}),
    threshold: {
      operator: ">=",
      value: policy.lookupBeforeFirstEditMinimum,
    },
    message:
      attempts === 0
        ? "No host hook recorded an edit of a requirement-linked file in the evaluated window."
        : `${guided}/${attempts} sessions ran kb_search or kb_query before their first edit of a requirement-linked file.`,
    evidence: {
      unguidedEditPaths: [...unguidedEditPaths].sort().slice(0, 20),
      lookupOperations: [...LOOKUP_BEFORE_EDIT_OPERATIONS],
    },
  };
}

function sourceLookupMessage(
  zeroResults: number,
  lookups: number,
  unobservable: number,
): string {
  const unreadable =
    unobservable > 0
      ? `${unobservable} source-linked lookups recorded no readable result count.`
      : "";
  if (lookups === 0) {
    return (
      unreadable ||
      "No source-linked query or search calls occurred in the evaluated window."
    );
  }
  const observed = `${zeroResults}/${lookups} source-linked lookups returned zero results.`;
  return unreadable ? `${observed} ${unreadable}` : observed;
}

function sourceLookupMetric(
  recent: readonly TimedEvent[],
  policy: TelemetryAcceptancePolicy,
): MutableMetric {
  const sourceLinked = recent.filter(({ event }) => {
    if (
      (event.tool !== "kb_query" && event.tool !== "kb_search") ||
      !eventSucceeded(event)
    ) {
      return false;
    }
    return typeof eventArgs(event).sourceFile === "string";
  });
  // A row whose count could not be read is unobservable, not a hit.  Counting
  // it as a non-zero result would let a broken logger report a healthy rate.
  const lookups = sourceLinked.filter(
    ({ event }) =>
      typeof event.result_count === "number" ||
      typeof event.zero_results === "boolean",
  );
  const unobservable = sourceLinked.length - lookups.length;
  const zeroResults = lookups.filter(
    ({ event }) => event.zero_results === true || event.result_count === 0,
  );
  const actual = rate(zeroResults.length, lookups.length);
  const sourceCounts = new Map<string, number>();
  for (const { event } of zeroResults) {
    const sourceFile = String(eventArgs(event).sourceFile);
    sourceCounts.set(sourceFile, (sourceCounts.get(sourceFile) ?? 0) + 1);
  }
  return {
    id: "source_lookup_zero_result_rate",
    status:
      lookups.length === 0 && unobservable > 0
        ? "insufficient_evidence"
        : thresholdStatus(actual, "<=", policy.sourceLookupZeroResultMaximum),
    numerator: zeroResults.length,
    denominator: lookups.length,
    ...(actual !== undefined ? { rate: actual } : {}),
    threshold: {
      operator: "<=",
      value: policy.sourceLookupZeroResultMaximum,
    },
    message: sourceLookupMessage(
      zeroResults.length,
      lookups.length,
      unobservable,
    ),
    evidence: {
      zeroResultSourceFiles: [...sourceCounts.entries()]
        .sort(
          ([leftFile, leftCount], [rightFile, rightCount]) =>
            rightCount - leftCount || leftFile.localeCompare(rightFile),
        )
        .slice(0, 20)
        .map(([sourceFile, count]) => ({ sourceFile, count })),
    },
  };
}

function completeRequirementCoverageEvents(
  recent: readonly TimedEvent[],
): readonly TimedEvent[] {
  return recent.filter(
    ({ event }) =>
      event.tool === "kb_coverage" &&
      eventSucceeded(event) &&
      (event.coverage_by ?? "req") === "req" &&
      event.coverage_scope_complete === true &&
      typeof event.coverage_proof_gap_count === "number",
  );
}

function proofGapRecoveryMetric(recent: readonly TimedEvent[]): MutableMetric {
  const coverage = completeRequirementCoverageEvents(recent);
  const latest = coverage.at(-1)?.event.coverage_proof_gap_count;
  const previous = coverage.at(-2)?.event.coverage_proof_gap_count;
  if (latest === undefined) {
    return {
      id: "proof_gap_recovery",
      status: "insufficient_evidence",
      numerator: 0,
      denominator: 0,
      message:
        "No complete requirement coverage event with proof-gap telemetry is available.",
    };
  }
  if (latest === 0) {
    return {
      id: "proof_gap_recovery",
      status: "passed",
      numerator: previous === undefined ? 0 : Math.max(0, previous - latest),
      denominator: previous ?? latest,
      message:
        "The latest complete requirement coverage event has zero proof gaps.",
      evidence: { previousGapCount: previous ?? null, latestGapCount: latest },
    };
  }
  if (previous === undefined) {
    return {
      id: "proof_gap_recovery",
      status: "insufficient_evidence",
      numerator: 0,
      denominator: latest,
      message: `The latest complete coverage event reports ${latest} proof gaps, but no comparable earlier event is available.`,
      evidence: { previousGapCount: null, latestGapCount: latest },
    };
  }
  const recovered = Math.max(0, previous - latest);
  return {
    id: "proof_gap_recovery",
    status: latest < previous ? "passed" : "failed",
    numerator: recovered,
    denominator: previous,
    rate: previous === 0 ? 0 : recovered / previous,
    threshold: { operator: "<", value: previous },
    message:
      latest < previous
        ? `Proof gaps decreased from ${previous} to ${latest}.`
        : `Proof gaps did not recover: the previous complete report had ${previous} and the latest has ${latest}.`,
    evidence: { previousGapCount: previous, latestGapCount: latest },
  };
}

function receiptFreshnessMetric(recent: readonly TimedEvent[]): MutableMetric {
  const latest = completeRequirementCoverageEvents(recent).at(-1)?.event;
  if (latest === undefined || latest.coverage_receipt_gap_count === undefined) {
    return {
      id: "e2e_receipt_freshness",
      status: "insufficient_evidence",
      numerator: 0,
      denominator: 0,
      message:
        "No complete requirement coverage event with receipt-freshness telemetry is available.",
    };
  }
  const gapCount = latest.coverage_receipt_gap_count;
  return {
    id: "e2e_receipt_freshness",
    status: gapCount === 0 ? "passed" : "failed",
    numerator: gapCount,
    denominator: Number(latest.coverage_proof_gap_count ?? gapCount),
    threshold: { operator: "<=", value: 0 },
    message:
      gapCount === 0
        ? "The latest complete requirement coverage event has no receipt-specific gaps."
        : `The latest complete requirement coverage event has ${gapCount} missing, stale, failed, invalid, or uncheckable receipt gaps.`,
    evidence: {
      receiptGaps: latest.coverage_receipt_gaps ?? [],
      receiptGapTotal:
        latest.coverage_receipt_gap_total ??
        latest.coverage_receipt_gaps?.length ??
        0,
      receiptGapsTruncated: latest.coverage_receipt_gaps_truncated ?? false,
    },
  };
}

function repeatedMutationFailuresMetric(
  recent: readonly TimedEvent[],
  policy: TelemetryAcceptancePolicy,
): MutableMetric {
  const streaks = new Map<string, number>();
  const maxima = new Map<string, number>();
  const categories = new Map<string, Set<string>>();
  let attempts = 0;

  for (const { event } of recent) {
    if (event.tool !== "kb_upsert") continue;
    attempts += 1;
    const target = mutationTarget(event);
    if (eventFailed(event)) {
      const next = (streaks.get(target) ?? 0) + 1;
      streaks.set(target, next);
      maxima.set(target, Math.max(maxima.get(target) ?? 0, next));
      if (event.error_category) {
        const targetCategories = categories.get(target) ?? new Set<string>();
        targetCategories.add(event.error_category);
        categories.set(target, targetCategories);
      }
    } else if (eventSucceeded(event)) {
      streaks.set(target, 0);
    }
  }

  const repeated = [...maxima.entries()]
    .filter(([, count]) => count >= policy.repeatedMutationFailureThreshold)
    .sort(
      ([leftTarget, leftCount], [rightTarget, rightCount]) =>
        rightCount - leftCount || leftTarget.localeCompare(rightTarget),
    );
  return {
    id: "repeated_mutation_failures",
    status:
      attempts === 0
        ? "not_applicable"
        : repeated.length === 0
          ? "passed"
          : "failed",
    numerator: repeated.length,
    denominator: attempts,
    threshold: {
      operator: "<",
      value: policy.repeatedMutationFailureThreshold,
    },
    message:
      attempts === 0
        ? "No upsert attempts occurred in the evaluated window."
        : repeated.length === 0
          ? `No target reached ${policy.repeatedMutationFailureThreshold} consecutive mutation failures.`
          : `${repeated.length} target(s) reached at least ${policy.repeatedMutationFailureThreshold} consecutive mutation failures.`,
    evidence: {
      targets: repeated.slice(0, 20).map(([target, count]) => ({
        target,
        consecutiveFailures: count,
        errorCategories: [...(categories.get(target) ?? [])].sort(),
      })),
    },
  };
}

function reportStatus(
  metrics: readonly TelemetryAcceptanceMetric[],
  fresh: boolean,
): TelemetryAcceptanceStatus {
  if (!fresh) return "insufficient_evidence";
  if (metrics.some((metric) => metric.status === "failed")) return "failed";
  if (metrics.some((metric) => metric.status === "insufficient_evidence")) {
    return "insufficient_evidence";
  }
  return "passed";
}

export function analyzeTelemetryAcceptance(
  events: readonly TelemetryUsageEvent[],
  now: Date = new Date(),
  policy: TelemetryAcceptancePolicy = DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
): TelemetryAcceptanceReport {
  const { operations, hookRows } = partitionTelemetryUsage(events);
  const all = operations.map((event, index) => ({
    event,
    index,
    time: timestampMillis(event.timestamp),
  }));
  const recentStart = Math.max(0, all.length - policy.eventLimit);
  const recent = all.slice(recentStart);
  const validTimes = recent
    .map((entry) => entry.time)
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  const firstTime = validTimes[0] ?? null;
  const lastTime = validTimes.at(-1) ?? null;
  const ageSeconds =
    lastTime === null ? null : Math.round((now.getTime() - lastTime) / 1_000);
  const fresh =
    ageSeconds !== null &&
    ageSeconds <= policy.maxEvidenceAgeSeconds &&
    ageSeconds >= -policy.maxFutureSkewSeconds;

  const metrics: readonly TelemetryAcceptanceMetric[] = [
    telemetryCompletenessMetric(recent, policy),
    advisorBeforeRequirementWriteMetric(all, recentStart, policy),
    validationBeforeUpsertMetric(all, recentStart, policy),
    lookupBeforeFirstEditMetric(hookRows, recentStart, policy),
    sourceLookupMetric(recent, policy),
    proofGapRecoveryMetric(recent),
    receiptFreshnessMetric(recent),
    repeatedMutationFailuresMetric(recent, policy),
  ];
  const diagnostics: string[] = [];
  if (operations.length === 0) diagnostics.push("usage_log_empty");
  if (lastTime === null && operations.length > 0) {
    diagnostics.push("usage_log_timestamps_unavailable");
  } else if (!fresh) {
    diagnostics.push(
      ageSeconds !== null && ageSeconds < -policy.maxFutureSkewSeconds
        ? "usage_log_future_dated"
        : "usage_log_stale",
    );
  }

  return {
    version: TELEMETRY_ACCEPTANCE_VERSION,
    status: reportStatus(metrics, fresh),
    evaluatedAt: now.toISOString(),
    policy,
    scope: {
      totalEvents: operations.length,
      evaluatedEvents: recent.length,
      truncated: operations.length > recent.length,
      firstTimestamp:
        firstTime === null ? null : new Date(firstTime).toISOString(),
      lastTimestamp:
        lastTime === null ? null : new Date(lastTime).toISOString(),
      evidenceAgeSeconds: ageSeconds,
      fresh,
    },
    metrics,
    diagnostics,
  };
}

type DiagnosticDefinition = {
  readonly id: string;
  readonly severity: "warning" | "review";
  readonly rank: number;
  readonly suggestion: string;
};

const METRIC_DIAGNOSTICS: Readonly<
  Record<TelemetryMetricId, DiagnosticDefinition>
> = {
  telemetry_completeness: {
    id: "telemetry_completeness_low",
    severity: "warning",
    rank: 70,
    suggestion:
      "Enable diagnostic mode and supply complete _diagnostic_telemetry on every MCP operation, then rerun the workflow.",
  },
  advisor_before_requirement_write: {
    id: "semantic_advisor_bypassed",
    severity: "warning",
    rank: 30,
    suggestion:
      "Run kb_model with mode analyze (CLI: semantic-advisor) on the complete current requirement prose before its next upsert, preserve the returned source hash, and recheck telemetry.",
  },
  validation_before_upsert: {
    id: "mutation_validation_bypassed",
    severity: "warning",
    rank: 20,
    suggestion:
      "Run kb_upsert with dryRun true (CLI: validate-upsert) for the exact payload no more than one hour before each sequential kb_upsert attempt.",
  },
  lookup_before_first_edit: {
    id: "lookup_before_first_edit_bypassed",
    severity: "warning",
    rank: 35,
    suggestion:
      "Before a session's first edit of a requirement-linked file, run kb_search for the change (or kb_query with sourceFile for the file) and read the requirements it names; host hook rows in diagnostic mode record the order.",
  },
  source_lookup_zero_result_rate: {
    id: "source_lookup_zero_result_rate_high",
    severity: "warning",
    rank: 60,
    suggestion:
      "Inspect the cited source files, refresh symbol/source links when stale, and repeat focused kb_search then exact kb_query lookups.",
  },
  proof_gap_recovery: {
    id: "proof_gap_recovery_stalled",
    severity: "warning",
    rank: 50,
    suggestion:
      "Run complete requirement coverage, apply one reviewed ready repair batch per requirement, and rerun coverage to demonstrate a smaller gap count.",
  },
  e2e_receipt_freshness: {
    id: "e2e_receipt_freshness_low",
    severity: "warning",
    rank: 40,
    suggestion:
      "Run the configured proof integrations with kibi prove against the live snapshot; receipts append idempotently with preserved history, then rerun complete coverage.",
  },
  repeated_mutation_failures: {
    id: "repeated_mutation_failures",
    severity: "warning",
    rank: 10,
    suggestion:
      "Stop retrying the failing target; query current endpoints, preflight the exact reduced payload, repair runtime health if needed, and retry once.",
  },
};

export function createTelemetryAcceptanceDiagnostics(
  report: TelemetryAcceptanceReport,
): readonly QualityDiagnostic[] {
  const diagnostics: Array<QualityDiagnostic & { readonly rank: number }> = [];
  if (!report.scope.fresh) {
    diagnostics.push({
      id: "telemetry_evidence_stale",
      severity: "review",
      blocking: false,
      category: "telemetry",
      source: ".kb/usage.log",
      message:
        report.scope.lastTimestamp === null
          ? "Telemetry acceptance has no valid timestamped evidence, so current workflow quality is unresolved."
          : `Telemetry evidence is not current (latest ${report.scope.lastTimestamp}); historical metrics cannot prove current workflow quality.`,
      suggestion:
        "Run the current Kibi workflow in diagnostic mode, then rerun kibi usage-metrics --require-acceptance and an unfiltered kb_check.",
      evidence: {
        version: report.version,
        rank: 5,
        scope: report.scope,
        diagnostics: report.diagnostics,
      },
      rank: 5,
    });
  }

  const insufficient = report.metrics.filter(
    (metric) => metric.status === "insufficient_evidence",
  );
  if (insufficient.length > 0) {
    diagnostics.push({
      id: "telemetry_acceptance_incomplete",
      severity: "review",
      blocking: false,
      category: "telemetry",
      source: ".kb/usage.log",
      message: `Telemetry cannot evaluate ${
        insufficient.length
      } required metric(s): ${insufficient
        .map((metric) => metric.id)
        .join(", ")}.`,
      suggestion:
        "Capture complete diagnostic events, including a complete requirement coverage run, then rerun the telemetry acceptance report.",
      evidence: {
        version: report.version,
        rank: 80,
        metrics: insufficient,
      },
      rank: 80,
    });
  }

  for (const metric of report.metrics) {
    if (metric.status !== "failed") continue;
    const definition = METRIC_DIAGNOSTICS[metric.id];
    if (!definition) continue;
    diagnostics.push({
      id: definition.id,
      severity: definition.severity,
      blocking: false,
      category: "telemetry",
      source: ".kb/usage.log",
      message: metric.message,
      suggestion: definition.suggestion,
      evidence: {
        version: report.version,
        rank: definition.rank,
        metric,
        scope: report.scope,
      },
      rank: definition.rank,
    });
  }

  return diagnostics
    .sort(
      (left, right) =>
        left.rank - right.rank || left.id.localeCompare(right.id),
    )
    .map(({ rank: _rank, ...diagnostic }) => diagnostic);
}
