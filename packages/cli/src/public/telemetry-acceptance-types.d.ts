// implements REQ-kibi-telemetry-acceptance-gate
export type TelemetryMetricStatus =
  | "passed"
  | "failed"
  | "insufficient_evidence"
  | "not_applicable";

export type TelemetryAcceptanceStatus =
  | "passed"
  | "failed"
  | "insufficient_evidence";

export type TelemetryMetricId =
  | "telemetry_completeness"
  | "advisor_before_requirement_write"
  | "validation_before_upsert"
  | "source_lookup_zero_result_rate"
  | "proof_gap_recovery"
  | "e2e_receipt_freshness"
  | "repeated_mutation_failures";

export interface TelemetryUsageEvent {
  readonly timestamp?: string;
  readonly request_id?: string;
  readonly session_id?: string;
  readonly actor_id?: string;
  readonly tool?: string;
  readonly status?: string;
  readonly success?: boolean;
  readonly telemetry?: unknown;
  readonly telemetry_status?: string;
  readonly business_args?: Readonly<Record<string, unknown>>;
  readonly args?: Readonly<Record<string, unknown>>;
  readonly mutation_fingerprint?: string;
  readonly mutation_target?: string;
  readonly validation_valid?: boolean;
  readonly semantic_source_hash?: string;
  readonly coverage_by?: string;
  readonly coverage_scope_complete?: boolean;
  readonly coverage_proof_gap_count?: number;
  readonly coverage_receipt_gap_count?: number;
  readonly coverage_receipt_gaps?: readonly Readonly<{
    readonly requirementId: string;
    readonly testIds: readonly string[];
    readonly codes: readonly string[];
  }>[];
  readonly coverage_receipt_gap_total?: number;
  readonly coverage_receipt_gaps_truncated?: boolean;
  readonly zero_results?: boolean;
  readonly result_count?: number;
  readonly error_category?: string;
}

export interface TelemetryAcceptancePolicy {
  readonly eventLimit: number;
  readonly minimumEvents: number;
  readonly maxEvidenceAgeSeconds: number;
  readonly maxFutureSkewSeconds: number;
  readonly telemetryCompletenessMinimum: number;
  readonly validationBeforeUpsertMinimum: number;
  readonly advisorBeforeRequirementWriteMinimum: number;
  readonly sourceLookupZeroResultMaximum: number;
  readonly preflightMaxAgeSeconds: number;
  readonly advisorMaxAgeSeconds: number;
  readonly repeatedMutationFailureThreshold: number;
}

export interface TelemetryAcceptanceMetric {
  readonly id: TelemetryMetricId;
  readonly status: TelemetryMetricStatus;
  readonly numerator: number;
  readonly denominator: number;
  readonly rate?: number;
  readonly threshold?: Readonly<{
    operator: ">=" | "<=" | "<";
    value: number;
  }>;
  readonly message: string;
  readonly evidence?: Readonly<Record<string, unknown>>;
}

export interface TelemetryAcceptanceReport {
  readonly version: "kibi.telemetry-acceptance.v1";
  readonly status: TelemetryAcceptanceStatus;
  readonly evaluatedAt: string;
  readonly policy: TelemetryAcceptancePolicy;
  readonly scope: Readonly<{
    totalEvents: number;
    evaluatedEvents: number;
    truncated: boolean;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
    evidenceAgeSeconds: number | null;
    fresh: boolean;
  }>;
  readonly metrics: readonly TelemetryAcceptanceMetric[];
  readonly diagnostics: readonly string[];
}
