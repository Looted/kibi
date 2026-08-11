/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { resolveWorkspaceRoot } from "./workspace.js";
export {
  buildDiagnosticToolCall,
  classifyDiagnosticError,
  deriveDiagnosticHints,
  deriveDiagnosticRetryKey,
  extractToolCallPayload,
  redactDiagnosticArgs,
} from "./diagnostics-helpers.js";

const DIAGNOSTIC_MODE_FLAG = "--diagnostic-mode";

export const DIAGNOSTIC_MODE_ENABLED =
  process.argv.includes(DIAGNOSTIC_MODE_FLAG);

let diagnosticUsageLogPath: string | null = null;

export function initializeDiagnosticMode(
  enabled: boolean = DIAGNOSTIC_MODE_ENABLED
): void {
  diagnosticUsageLogPath = null;
  if (!enabled) {
    process.env.KIBI_MCP_DIAGNOSTIC_MODE = "0";
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot();
  // Evaluators may run an independent read-only verification client in the
  // same fixture workspace after the model.  Allow that client to use a
  // separate receipt so model-originated usage can be reconciled without
  // accidentally treating verifier calls as model evidence.  Normal Kibi
  // operation remains rooted at `.kb/usage.log`.
  diagnosticUsageLogPath =
    process.env.KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH ??
    path.join(workspaceRoot, ".kb", "usage.log");
  process.env.KIBI_MCP_DIAGNOSTIC_MODE = "1";
}

export function appendUsageLogLine(entry: Record<string, unknown>): void {
  if (!diagnosticUsageLogPath) return;
  fs.mkdirSync(path.dirname(diagnosticUsageLogPath), { recursive: true });
  fs.appendFileSync(diagnosticUsageLogPath, `${JSON.stringify(entry)}\n`, {
    encoding: "utf8",
  });
}

export const DIAGNOSTIC_TELEMETRY_SCHEMA = {
  type: "object",
  description:
    "REQUIRED when diagnostic mode is on. Provide self-reflection metadata about this tool call.",
  properties: {
    is_autonomous: {
      type: "boolean",
      description:
        "Set to TRUE if you are calling this tool on your own initiative to retrieve context. Set to FALSE if the user explicitly commanded you to use the knowledge base.",
    },
    reasoning: {
      type: "string",
      description:
        "A brief, 1-2 sentence internal thought explaining exactly why you are calling this tool right now and what information you expect to get.",
    },
    confidence_score: {
      type: "number",
      description:
        "A score from 0.0 to 1.0 representing your confidence that the exact parameters, IDs, or tags you provided will yield a successful result.",
    },
    attempt_number: {
      type: "integer",
      description:
        "If you are retrying this exact task because a previous tool call failed or returned empty results, increment this number (start at 1).",
    },
    missing_context: {
      type: "string",
      description:
        "If you had to split your task into multiple steps because this tool lacks a specific filtering or querying capability, describe what parameter is missing. Otherwise, leave empty.",
    },
    session_id: {
      type: "string",
      description:
        "Optional opaque workflow-session identifier used to correlate advisor, preflight, mutation, coverage, and verification evidence. Do not put personal data in this field.",
    },
    actor_id: {
      type: "string",
      description:
        "Optional opaque actor identifier used to prevent evidence from a different actor being correlated with this call. Do not put personal data in this field.",
    },
  },
} as const;

export interface ToolCallPayload {
  businessArgs: Record<string, unknown>;
  telemetry: Record<string, unknown> | null;
}

export interface DiagnosticErrorFields {
  error_name: string;
  error_message: string;
  error_category: string;
  error_stage: string;
  error_summary: string;
  semantic_outcome?: string;
  semantic_checked_req_id?: string;
  semantic_conflicting_req_ids?: string[];
}

export interface DiagnosticToolCall {
  schema_version: number;
  canonical_tool: string;
  request_id: string;
  diagnostic_phase: string;
  business_args: Record<string, unknown> | null;
  raw_args_redacted: unknown;
  retry_key: string;
  hint: string;
  diagnostic_error: DiagnosticErrorFields | null;
  diagnostic_telemetry: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function structuredContentFrom(
  result: unknown
): Record<string, unknown> | undefined {
  if (!isRecord(result)) return undefined;
  const structuredContent = result.structuredContent;
  return isRecord(structuredContent) ? structuredContent : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function suggestionKindsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.kind !== "string") return [];
    return [item.kind];
  });
}

function appendSemanticAdvisorFields(
  fields: Record<string, unknown>,
  receipt: unknown
): void {
  if (!isRecord(receipt)) return;
  const readiness = receipt.logic_readiness;
  const lane = receipt.candidate_lane;
  const suggestionKinds = suggestionKindsFrom(receipt.suggestions);

  if (typeof readiness === "string") {
    fields.semantic_logic_readiness = readiness;
  }
  if (typeof lane === "string") {
    fields.semantic_candidate_lane = lane;
  }
  fields.semantic_suggestion_kinds = suggestionKinds;
  fields.semantic_suggestion_count = suggestionKinds.length;
  fields.semantic_next_tools = stringArray(receipt.suggested_next_tools);
  const inventoryContract = receipt.inventory_contract;
  if (
    isRecord(inventoryContract) &&
    typeof inventoryContract.source_hash === "string"
  ) {
    fields.semantic_source_hash = inventoryContract.source_hash;
  }
}

function canonicalDiagnosticValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalDiagnosticValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "_diagnostic_telemetry")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalDiagnosticValue(child)])
  );
}

function mutationFingerprint(args: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalDiagnosticValue(args)))
    .digest("hex");
}

function appendMutationFields(
  fields: Record<string, unknown>,
  args: Record<string, unknown>
): void {
  fields.mutation_fingerprint = mutationFingerprint(args);
  const type = typeof args.type === "string" ? args.type : "unknown";
  const id = typeof args.id === "string" ? args.id : "unknown";
  fields.mutation_target = `${type}:${id}`;
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
  args: Record<string, unknown>,
  structuredContent: Record<string, unknown>
): void {
  const rows = Array.isArray(structuredContent.rows)
    ? structuredContent.rows.filter(isRecord)
    : [];
  const summary = isRecord(structuredContent.summary)
    ? structuredContent.summary
    : {};
  const gapCodes = rows.flatMap((row) => stringArray(row.proofGaps));
  const uniqueGapCodes = [...new Set(gapCodes)].sort();
  const repairPlan = isRecord(structuredContent.repairPlan)
    ? structuredContent.repairPlan
    : undefined;
  const scope = isRecord(repairPlan?.scope) ? repairPlan.scope : undefined;
  fields.coverage_by = typeof args.by === "string" ? args.by : "req";
  fields.coverage_requirement_count = Number(summary.total ?? rows.length);
  fields.coverage_proven_count = Number(summary.proofProven ?? 0);
  fields.coverage_proof_missing_count = Number(summary.proofMissing ?? 0);
  fields.coverage_proof_gap_count = gapCodes.length;
  fields.coverage_gap_codes = uniqueGapCodes;
  fields.coverage_receipt_gap_count = gapCodes.filter((gap) =>
    RECEIPT_GAP_CODES.has(gap)
  ).length;
  if (typeof scope?.complete === "boolean") {
    fields.coverage_scope_complete = scope.complete;
  }
  const metadata = isRecord(structuredContent.meta)
    ? structuredContent.meta
    : undefined;
  if (typeof metadata?.verificationSnapshot === "string") {
    fields.coverage_verification_snapshot = metadata.verificationSnapshot;
  }
}

function appendPredicateSuggestionFields(
  fields: Record<string, unknown>,
  structuredContent: Record<string, unknown>
): void {
  const candidates = Array.isArray(structuredContent.candidates)
    ? structuredContent.candidates
    : [];
  const topCandidate = candidates.find(isRecord);
  fields.predicate_candidate_count = candidates.length;
  if (topCandidate) {
    if (typeof topCandidate.predicate_name === "string") {
      fields.predicate_top_name = topCandidate.predicate_name;
    }
    if (typeof topCandidate.score === "number") {
      fields.predicate_top_score = topCandidate.score;
    }
  }
  if (typeof structuredContent.recommendedAction === "string") {
    fields.predicate_recommended_action = structuredContent.recommendedAction;
  }
  fields.predicate_relationship_plan = isRecord(
    structuredContent.relationshipPlan
  );
}

function appendContradictionCheckFields(
  fields: Record<string, unknown>,
  contradictionCheck: unknown
): void {
  if (!isRecord(contradictionCheck)) return;
  const outcome = contradictionCheck.outcome;
  if (typeof outcome === "string") {
    fields.semantic_contradiction_outcome = outcome;
  }
  const checkedReqId = contradictionCheck.checked_req_id;
  if (typeof checkedReqId === "string") {
    fields.semantic_checked_req_id = checkedReqId;
  }
  const strictReadiness = contradictionCheck.strict_readiness;
  if (typeof strictReadiness === "string") {
    fields.semantic_strict_readiness = strictReadiness;
  }
  const subjectKey = contradictionCheck.subject_key;
  if (typeof subjectKey === "string") {
    fields.semantic_subject_key = subjectKey;
  }
  const propertyKey = contradictionCheck.property_key;
  if (typeof propertyKey === "string") {
    fields.semantic_property_key = propertyKey;
  }
}

export function deriveDiagnosticFields(
  toolName: string,
  args: Record<string, unknown>,
  telemetry: Record<string, unknown> | null,
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

  const structuredContent = structuredContentFrom(result);

  if (toolName === "kb_query" || toolName === "kb_search") {
    const resultCount = Number(structuredContent?.count ?? 0);
    fields.result_count = resultCount;
    fields.zero_results = resultCount === 0;
    fields.result_summary =
      resultCount === 0 ? "0 results" : `${resultCount} results`;
  }

  if (toolName === "kb_check") {
    const violationCount = Number(structuredContent?.count ?? 0);
    fields.violation_count = violationCount;
    fields.requested_rules = Array.isArray(args.rules) ? args.rules : [];
    fields.result_summary =
      violationCount === 0 ? "0 violations" : `${violationCount} violations`;
  }

  if (toolName === "kb_coverage" && structuredContent) {
    appendCoverageFields(fields, args, structuredContent);
    fields.result_summary = `${String(
      fields.coverage_proven_count
    )} proven; ${String(fields.coverage_proof_gap_count)} proof gaps`;
  }

  if (toolName === "kb_semantic_advisor" && structuredContent) {
    appendSemanticAdvisorFields(fields, structuredContent.receipt);
    const readiness = fields.semantic_logic_readiness;
    const lane = fields.semantic_candidate_lane;
    if (typeof readiness === "string" && typeof lane === "string") {
      fields.result_summary = `semantic advisor ${readiness} via ${lane}`;
    }
  }

  if (toolName === "kb_suggest_predicates" && structuredContent) {
    appendPredicateSuggestionFields(fields, structuredContent);
    const count = Number(fields.predicate_candidate_count ?? 0);
    const topName = fields.predicate_top_name;
    fields.result_summary =
      typeof topName === "string"
        ? `${count} predicate candidates; top=${topName}`
        : `${count} predicate candidates`;
  }

  if (toolName === "kb_upsert" && structuredContent) {
    appendMutationFields(fields, args);
    const created = Number(structuredContent.created ?? 0);
    const updated = Number(structuredContent.updated ?? 0);
    fields.upsert_created = created;
    fields.upsert_updated = updated;
    fields.upsert_relationships_created = Number(
      structuredContent.relationships_created ?? 0
    );
    appendContradictionCheckFields(
      fields,
      structuredContent.contradictionCheck
    );
    appendSemanticAdvisorFields(fields, structuredContent.semanticAdvisor);
    const readiness = fields.semantic_logic_readiness;
    if (typeof readiness === "string") {
      fields.result_summary = `upsert ${
        created > 0 ? "created" : "updated"
      }; semantic ${readiness}`;
    }
  }

  if (toolName === "kb_validate_upsert" && structuredContent) {
    appendMutationFields(fields, args);
    fields.validation_valid = structuredContent.valid === true;
    appendSemanticAdvisorFields(fields, structuredContent.semanticAdvisor);
    fields.result_summary =
      structuredContent.valid === true
        ? "upsert payload valid"
        : "upsert payload invalid";
  }

  if (!fields.result_summary) {
    fields.result_summary = `${toolName} completed`;
  }

  return fields;
}
