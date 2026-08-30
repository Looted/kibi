import { diagnosticMutationFingerprint } from "./diagnostic-usage.js";
import {
  DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  type TelemetryAcceptancePolicy,
  type TelemetryAcceptanceReport,
  type TelemetryMetricId,
  type TelemetryUsageEvent,
  analyzeTelemetryAcceptance,
} from "./telemetry-acceptance.js";

export const TELEMETRY_REMEDIATION_VERSION =
  "kibi.telemetry-remediation.v1" as const;

export interface TelemetryRemediationEventReference {
  readonly logLine: number;
  readonly requestId: string | null;
  readonly timestamp: string | null;
  readonly tool: string | null;
  readonly sessionId: string | null;
  readonly actorId: string | null;
}

export interface TelemetryRemediationItem {
  readonly id: string;
  readonly rank: number;
  readonly metric: TelemetryMetricId | "evidence_freshness";
  readonly scope: "event" | "report";
  readonly target: string;
  readonly reason: string;
  readonly action: string;
  readonly event: TelemetryRemediationEventReference | null;
}

export interface TelemetryRemediationReport {
  readonly version: typeof TELEMETRY_REMEDIATION_VERSION;
  readonly status: "clear" | "action_required";
  readonly acceptance: TelemetryAcceptanceReport;
  readonly summary: Readonly<{
    total: number;
    eventItems: number;
    reportItems: number;
  }>;
  readonly items: readonly TelemetryRemediationItem[];
}

type IndexedEvent = {
  readonly event: TelemetryUsageEvent;
  readonly index: number;
  readonly time: number | null;
};

const RANKS: Readonly<
  Record<TelemetryMetricId | "evidence_freshness", number>
> = {
  repeated_mutation_failures: 10,
  validation_before_upsert: 20,
  advisor_before_requirement_write: 30,
  e2e_receipt_freshness: 40,
  proof_gap_recovery: 50,
  source_lookup_zero_result_rate: 60,
  telemetry_completeness: 70,
  evidence_freshness: 5,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function args(event: TelemetryUsageEvent): Readonly<Record<string, unknown>> {
  return event.business_args ?? event.args ?? {};
}

function succeeded(event: TelemetryUsageEvent): boolean {
  return event.status === "success" || event.success === true;
}

function failed(event: TelemetryUsageEvent): boolean {
  return event.status === "error" || event.success === false;
}

function telemetryProvided(event: TelemetryUsageEvent): boolean {
  if (event.telemetry_status === "provided") return true;
  if (event.telemetry_status === "missing") return false;
  return event.telemetry !== null && event.telemetry !== undefined;
}

function correlationValue(
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

function compatible(left: TelemetryUsageEvent, right: TelemetryUsageEvent) {
  return (["session_id", "actor_id"] as const).every((key) => {
    const leftValue = correlationValue(left, key);
    const rightValue = correlationValue(right, key);
    return (
      leftValue === undefined ||
      rightValue === undefined ||
      leftValue === rightValue
    );
  });
}

function withinAge(
  earlier: number | null,
  later: number | null,
  seconds: number,
): boolean {
  return (
    earlier !== null &&
    later !== null &&
    earlier <= later &&
    later - earlier <= seconds * 1_000
  );
}

function fingerprint(event: TelemetryUsageEvent): string {
  return (
    event.mutation_fingerprint ?? diagnosticMutationFingerprint(args(event))
  );
}

function target(event: TelemetryUsageEvent): string {
  if (event.mutation_target) return event.mutation_target;
  const eventArgs = args(event);
  const type = typeof eventArgs.type === "string" ? eventArgs.type : "unknown";
  const id =
    typeof eventArgs.id === "string" ? eventArgs.id : fingerprint(event);
  return `${type}:${id}`;
}

function reference(entry: IndexedEvent): TelemetryRemediationEventReference {
  return {
    logLine: entry.index + 1,
    requestId: entry.event.request_id ?? null,
    timestamp: entry.event.timestamp ?? null,
    tool: entry.event.tool ?? null,
    sessionId: correlationValue(entry.event, "session_id") ?? null,
    actorId: correlationValue(entry.event, "actor_id") ?? null,
  };
}

function eventItem(
  metric: TelemetryMetricId,
  entry: IndexedEvent,
  itemTarget: string,
  reason: string,
  action: string,
): TelemetryRemediationItem {
  return {
    id: `${metric}:line-${entry.index + 1}:${itemTarget}`,
    rank: RANKS[metric],
    metric,
    scope: "event",
    target: itemTarget,
    reason,
    action,
    event: reference(entry),
  };
}

function reportItem(
  metric: TelemetryMetricId | "evidence_freshness",
  itemTarget: string,
  reason: string,
  action: string,
): TelemetryRemediationItem {
  return {
    id: `${metric}:report:${itemTarget}`,
    rank: RANKS[metric],
    metric,
    scope: "report",
    target: itemTarget,
    reason,
    action,
    event: null,
  };
}

function isActionable(
  acceptance: TelemetryAcceptanceReport,
  metric: TelemetryMetricId,
): boolean {
  const status = acceptance.metrics.find(
    (candidate) => candidate.id === metric,
  )?.status;
  return status === "failed" || status === "insufficient_evidence";
}

export function buildTelemetryRemediationReport(
  events: readonly TelemetryUsageEvent[],
  now: Date = new Date(),
  policy: TelemetryAcceptancePolicy = DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
): TelemetryRemediationReport {
  const acceptance = analyzeTelemetryAcceptance(events, now, policy);
  const all: IndexedEvent[] = events.map((event, index) => ({
    event,
    index,
    time:
      event.timestamp === undefined ||
      !Number.isFinite(Date.parse(event.timestamp))
        ? null
        : Date.parse(event.timestamp),
  }));
  const recentStart = Math.max(0, all.length - policy.eventLimit);
  const recent = all.slice(recentStart);
  const items: TelemetryRemediationItem[] = [];

  if (!acceptance.scope.fresh) {
    items.push(
      reportItem(
        "evidence_freshness",
        ".kb/usage.log",
        "The acceptance window has no current timestamped evidence.",
        "Run the current workflow in diagnostic mode, then regenerate this report.",
      ),
    );
  }

  if (isActionable(acceptance, "telemetry_completeness")) {
    for (const entry of recent.filter(
      ({ event }) => !telemetryProvided(event),
    )) {
      items.push(
        eventItem(
          "telemetry_completeness",
          entry,
          entry.event.tool ?? "unknown tool",
          "Diagnostic telemetry is missing for this event.",
          "Repeat this operation in diagnostic mode with complete _diagnostic_telemetry.",
        ),
      );
    }
    if (recent.length < policy.minimumEvents) {
      items.push(
        reportItem(
          "telemetry_completeness",
          "acceptance window",
          `Only ${recent.length}/${policy.minimumEvents} required events are available.`,
          "Capture enough current diagnostic events to satisfy the minimum evidence window.",
        ),
      );
    }
  }

  if (isActionable(acceptance, "validation_before_upsert")) {
    const preflights = new Map<string, IndexedEvent[]>();
    for (const entry of all) {
      if (
        entry.event.tool === "kb_validate_upsert" &&
        succeeded(entry.event) &&
        entry.event.validation_valid !== false
      ) {
        const matches = preflights.get(fingerprint(entry.event)) ?? [];
        matches.push(entry);
        preflights.set(fingerprint(entry.event), matches);
        continue;
      }
      if (entry.index < recentStart || entry.event.tool !== "kb_upsert")
        continue;
      const match = (preflights.get(fingerprint(entry.event)) ?? []).findLast(
        (candidate) =>
          compatible(candidate.event, entry.event) &&
          withinAge(candidate.time, entry.time, policy.preflightMaxAgeSeconds),
      );
      if (match === undefined) {
        items.push(
          eventItem(
            "validation_before_upsert",
            entry,
            target(entry.event),
            "No recent successful preflight matches this exact payload and correlation context.",
            "Run kb_validate_upsert for this exact payload in the same session/actor context before retrying once.",
          ),
        );
      }
    }
  }

  if (isActionable(acceptance, "advisor_before_requirement_write")) {
    const advisors = new Map<string, IndexedEvent[]>();
    for (const entry of all) {
      const eventArgs = args(entry.event);
      const id =
        typeof eventArgs.id === "string"
          ? eventArgs.id
          : typeof eventArgs.requirementId === "string"
            ? eventArgs.requirementId
            : undefined;
      if (
        entry.event.tool === "kb_semantic_advisor" &&
        succeeded(entry.event) &&
        id
      ) {
        const matches = advisors.get(id) ?? [];
        matches.push(entry);
        advisors.set(id, matches);
        continue;
      }
      if (
        entry.index < recentStart ||
        entry.event.tool !== "kb_upsert" ||
        eventArgs.type !== "req"
      ) {
        continue;
      }
      const requirementId = id ?? target(entry.event);
      const match = (advisors.get(requirementId) ?? []).findLast(
        (candidate) =>
          compatible(candidate.event, entry.event) &&
          (candidate.event.semantic_source_hash === undefined ||
            entry.event.semantic_source_hash === undefined ||
            candidate.event.semantic_source_hash ===
              entry.event.semantic_source_hash) &&
          withinAge(candidate.time, entry.time, policy.advisorMaxAgeSeconds),
      );
      if (match === undefined) {
        items.push(
          eventItem(
            "advisor_before_requirement_write",
            entry,
            requirementId,
            "No recent semantic-advisor event matches this requirement, source hash, and correlation context.",
            "Run kb_semantic_advisor on the complete prose in the same session/actor context before the next upsert.",
          ),
        );
      }
    }
  }

  if (isActionable(acceptance, "source_lookup_zero_result_rate")) {
    for (const entry of recent) {
      const sourceFile = args(entry.event).sourceFile;
      if (
        (entry.event.tool === "kb_query" || entry.event.tool === "kb_search") &&
        succeeded(entry.event) &&
        typeof sourceFile === "string" &&
        (entry.event.zero_results === true || entry.event.result_count === 0)
      ) {
        items.push(
          eventItem(
            "source_lookup_zero_result_rate",
            entry,
            sourceFile,
            "This source-linked lookup returned zero results.",
            "Inspect the source, refresh its symbol links if stale, then repeat search followed by exact query.",
          ),
        );
      }
    }
  }

  const completeCoverage = recent.filter(
    ({ event }) =>
      event.tool === "kb_coverage" &&
      succeeded(event) &&
      (event.coverage_by ?? "req") === "req" &&
      event.coverage_scope_complete === true &&
      typeof event.coverage_proof_gap_count === "number",
  );
  const latestCoverage = completeCoverage.at(-1);
  if (isActionable(acceptance, "proof_gap_recovery")) {
    items.push(
      latestCoverage
        ? eventItem(
            "proof_gap_recovery",
            latestCoverage,
            "coverage:req",
            `The latest complete report has ${latestCoverage.event.coverage_proof_gap_count} proof gaps without demonstrated recovery.`,
            "Apply one reviewed repair batch and rerun complete requirement coverage.",
          )
        : reportItem(
            "proof_gap_recovery",
            "coverage:req",
            "No complete requirement coverage event contains proof-gap evidence.",
            "Run kb_coverage by req with complete scope and diagnostic telemetry.",
          ),
    );
  }
  if (isActionable(acceptance, "e2e_receipt_freshness")) {
    items.push(
      latestCoverage &&
        latestCoverage.event.coverage_receipt_gap_count !== undefined
        ? eventItem(
            "e2e_receipt_freshness",
            latestCoverage,
            "coverage:req",
            `The latest complete report has ${latestCoverage.event.coverage_receipt_gap_count} receipt gaps.`,
            "Run `kibi prove` for the cited requirements or integrations; receipts append idempotently with preserved history, then sync and rerun coverage.",
          )
        : reportItem(
            "e2e_receipt_freshness",
            "coverage:req",
            "No complete requirement coverage event contains receipt-freshness evidence.",
            "Run complete requirement coverage after attaching fresh E2E verification receipts.",
          ),
    );
  }

  if (isActionable(acceptance, "repeated_mutation_failures")) {
    const streaks = new Map<string, IndexedEvent[]>();
    const offending: IndexedEvent[][] = [];
    const flush = (itemTarget: string) => {
      const streak = streaks.get(itemTarget) ?? [];
      if (streak.length >= policy.repeatedMutationFailureThreshold) {
        offending.push(streak);
      }
      streaks.set(itemTarget, []);
    };
    for (const entry of recent) {
      if (entry.event.tool !== "kb_upsert") continue;
      const itemTarget = target(entry.event);
      if (failed(entry.event)) {
        const streak = streaks.get(itemTarget) ?? [];
        streak.push(entry);
        streaks.set(itemTarget, streak);
      } else if (succeeded(entry.event)) {
        flush(itemTarget);
      }
    }
    for (const itemTarget of streaks.keys()) flush(itemTarget);
    for (const streak of offending) {
      for (const entry of streak) {
        items.push(
          eventItem(
            "repeated_mutation_failures",
            entry,
            target(entry.event),
            "This event belongs to a mutation-failure streak at or above the retry threshold.",
            "Stop retrying; inspect endpoints and the exact preflight result, then make one repaired attempt.",
          ),
        );
      }
    }
  }

  items.sort(
    (left, right) =>
      left.rank - right.rank ||
      (left.event?.logLine ?? Number.MAX_SAFE_INTEGER) -
        (right.event?.logLine ?? Number.MAX_SAFE_INTEGER) ||
      left.id.localeCompare(right.id),
  );
  return {
    version: TELEMETRY_REMEDIATION_VERSION,
    status: items.length === 0 ? "clear" : "action_required",
    acceptance,
    summary: {
      total: items.length,
      eventItems: items.filter((item) => item.scope === "event").length,
      reportItems: items.filter((item) => item.scope === "report").length,
    },
    items,
  };
}
