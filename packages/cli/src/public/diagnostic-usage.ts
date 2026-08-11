import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export interface DiagnosticUsageInput {
  readonly workspaceRoot: string;
  readonly tool: string;
  readonly businessArgs: Readonly<Record<string, unknown>>;
  readonly telemetry: Readonly<Record<string, unknown>> | null;
  readonly startedAt: Date;
  readonly finishedAt?: Date;
  readonly status: "success" | "error";
  readonly result?: unknown;
  readonly error?: string;
  readonly requestId?: string;
  readonly logPath?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resultRecord(result: unknown): Record<string, unknown> | undefined {
  if (!isRecord(result)) return undefined;
  return isRecord(result.structuredContent) ? result.structuredContent : result;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "_diagnostic_telemetry")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalValue(child)])
  );
}

export function diagnosticMutationFingerprint(
  args: Readonly<Record<string, unknown>>
): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(args)))
    .digest("hex");
}

function appendMutationFields(
  fields: Record<string, unknown>,
  args: Readonly<Record<string, unknown>>
): void {
  fields.mutation_fingerprint = diagnosticMutationFingerprint(args);
  const type = typeof args.type === "string" ? args.type : "unknown";
  const id = typeof args.id === "string" ? args.id : "unknown";
  fields.mutation_target = `${type}:${id}`;
}

function appendSemanticFields(
  fields: Record<string, unknown>,
  receipt: unknown
): void {
  if (!isRecord(receipt)) return;
  const inventory = isRecord(receipt.inventory_contract)
    ? receipt.inventory_contract
    : undefined;
  if (typeof inventory?.source_hash === "string") {
    fields.semantic_source_hash = inventory.source_hash;
  }
  if (typeof receipt.logic_readiness === "string") {
    fields.semantic_logic_readiness = receipt.logic_readiness;
  }
  if (typeof receipt.candidate_lane === "string") {
    fields.semantic_candidate_lane = receipt.candidate_lane;
  }
}

const RECEIPT_GAP_CODES = new Set([
  "missing_verification_receipt",
  "stale_verification_receipt",
  "failed_verification_receipt",
  "invalid_verification_receipt",
  "verification_snapshot_unavailable",
]);

function appendCoverageFields(
  fields: Record<string, unknown>,
  args: Readonly<Record<string, unknown>>,
  result: Record<string, unknown>
): void {
  const rows = Array.isArray(result.rows) ? result.rows.filter(isRecord) : [];
  const summary = isRecord(result.summary) ? result.summary : {};
  const gapCodes = rows.flatMap((row) => stringArray(row.proofGaps));
  const repairPlan = isRecord(result.repairPlan)
    ? result.repairPlan
    : undefined;
  const scope = isRecord(repairPlan?.scope) ? repairPlan.scope : undefined;
  fields.coverage_by = typeof args.by === "string" ? args.by : "req";
  fields.coverage_requirement_count = Number(summary.total ?? rows.length);
  fields.coverage_proven_count = Number(summary.proofProven ?? 0);
  fields.coverage_proof_missing_count = Number(summary.proofMissing ?? 0);
  fields.coverage_proof_gap_count = gapCodes.length;
  fields.coverage_gap_codes = [...new Set(gapCodes)].sort();
  fields.coverage_receipt_gap_count = gapCodes.filter((code) =>
    RECEIPT_GAP_CODES.has(code)
  ).length;
  if (typeof scope?.complete === "boolean") {
    fields.coverage_scope_complete = scope.complete;
  }
}

export function deriveDiagnosticUsageFields(
  tool: string,
  args: Readonly<Record<string, unknown>>,
  telemetry: Readonly<Record<string, unknown>> | null,
  result: unknown
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    telemetry_status: telemetry ? "provided" : "missing",
  };
  if (telemetry) {
    fields.telemetry_is_autonomous = telemetry.is_autonomous ?? null;
    fields.telemetry_confidence_score = telemetry.confidence_score ?? null;
    fields.telemetry_attempt_number = telemetry.attempt_number ?? null;
    if (typeof telemetry.session_id === "string") {
      fields.session_id = telemetry.session_id;
    }
    if (typeof telemetry.actor_id === "string") {
      fields.actor_id = telemetry.actor_id;
    }
  }

  const structured = resultRecord(result);
  if (tool === "kb_query" || tool === "kb_search") {
    const resultCount = Number(structured?.count ?? 0);
    fields.result_count = resultCount;
    fields.zero_results = resultCount === 0;
    fields.result_summary =
      resultCount === 0 ? "0 results" : `${resultCount} results`;
  }
  if (tool === "kb_check") {
    const count = Number(structured?.count ?? 0);
    fields.violation_count = count;
    fields.requested_rules = Array.isArray(args.rules) ? args.rules : [];
    fields.result_summary =
      count === 0 ? "0 violations" : `${count} violations`;
  }
  if (tool === "kb_coverage" && structured) {
    appendCoverageFields(fields, args, structured);
    fields.result_summary = `${String(
      fields.coverage_proven_count
    )} proven; ${String(fields.coverage_proof_gap_count)} proof gaps`;
  }
  if (tool === "kb_semantic_advisor" && structured) {
    appendSemanticFields(fields, structured.receipt);
  }
  if (tool === "kb_validate_upsert") {
    appendMutationFields(fields, args);
    fields.validation_valid = structured?.valid === true;
    appendSemanticFields(fields, structured?.semanticAdvisor);
  }
  if (tool === "kb_upsert") {
    appendMutationFields(fields, args);
    appendSemanticFields(fields, structured?.semanticAdvisor);
  }
  if (!fields.result_summary) fields.result_summary = `${tool} completed`;
  return fields;
}

export function appendCliDiagnosticUsage(input: DiagnosticUsageInput): void {
  const finishedAt = input.finishedAt ?? new Date();
  const requestId = input.requestId ?? `cli-${randomUUID()}`;
  const logPath =
    input.logPath ??
    process.env.KIBI_CLI_DIAGNOSTIC_USAGE_LOG_PATH ??
    path.join(input.workspaceRoot, ".kb", "usage.log");
  mkdirSync(path.dirname(logPath), { recursive: true });
  appendFileSync(
    logPath,
    `${JSON.stringify({
      timestamp: finishedAt.toISOString(),
      request_id: requestId,
      tool: input.tool,
      interface: "cli_json",
      telemetry: input.telemetry,
      business_args: input.businessArgs,
      status: input.status,
      started_at: input.startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - input.startedAt.getTime(),
      active_branch: process.env.KIBI_BRANCH ?? null,
      ...(input.error ? { error_message: input.error } : {}),
      ...deriveDiagnosticUsageFields(
        input.tool,
        input.businessArgs,
        input.telemetry,
        input.result
      ),
    })}\n`,
    "utf8"
  );
}
