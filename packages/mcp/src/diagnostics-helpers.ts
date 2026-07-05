import { createHash } from "node:crypto";

import type {
  DiagnosticErrorFields,
  DiagnosticToolCall,
  ToolCallPayload,
} from "./diagnostics.js";

const SECRET_LIKE_KEY_RE =
  /(token|secret|password|authorization|api[_-]?key|bearer)/i;

const DIAGNOSTIC_PHASE_BY_STAGE: Record<string, string> = {
  persistence: "persistence",
  prolog_runtime: "runtime",
  prolog_lifecycle: "runtime",
  tool_timeout: "runtime",
  validation: "validation",
  handler: "handler",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function redactSecretLikeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecretLikeValue);
  if (!isPlainObject(value)) return value;
  const redacted: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    redacted[key] = SECRET_LIKE_KEY_RE.test(key)
      ? "[REDACTED]"
      : redactSecretLikeValue(nestedValue);
  }
  return redacted;
}

function canonicalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJsonValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeJsonValue(value[key])]),
  );
}

function stableJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalizeJsonValue(value));
}

export function redactDiagnosticArgs(args: unknown): unknown {
  return redactSecretLikeValue(args);
}

export function deriveDiagnosticRetryKey(
  toolName: string,
  args: unknown,
): string {
  const hash = createHash("sha256")
    .update(toolName)
    .update("\0")
    .update(stableJsonStringify(redactDiagnosticArgs(args)))
    .digest("hex");
  return `retry_${hash.slice(0, 16)}`;
}

export function classifyDiagnosticError(error: unknown): DiagnosticErrorFields {
  const err = error instanceof Error ? error : new Error(String(error));
  const lower = err.message.toLowerCase();

  if (lower.includes("stale_snapshot"))
    return buildErrorFields(
      err,
      "stale_snapshot",
      "persistence",
      "KB snapshot is stale; refresh/retry after the latest KB state is attached.",
    );
  if (lower.includes("unknown option") && lower.includes("h for help"))
    return buildErrorFields(
      err,
      "prolog_unknown_option",
      "prolog_runtime",
      "Prolog rejected startup/module/query options; inspect MCP package wiring and Prolog invocation.",
    );
  if (lower.includes("prolog process not started"))
    return buildErrorFields(
      err,
      "prolog_process_not_started",
      "prolog_lifecycle",
      "Prolog process is unavailable; restart the MCP server before retrying.",
    );
  if (
    lower.includes("resetting prolog worker") ||
    lower.includes("prolog worker reset")
  )
    return buildErrorFields(
      err,
      "prolog_worker_reset",
      "prolog_lifecycle",
      "Prolog worker was reset so the next MCP call can start from a fresh worker.",
    );
  if (
    /timed out after \d+ms/i.test(err.message) ||
    lower.includes("tool timeout")
  )
    return buildErrorFields(
      err,
      "tool_timeout",
      "tool_timeout",
      "MCP tool execution exceeded its bounded timeout.",
    );
  if (lower.includes("coarsely while granular symbols are available"))
    return buildErrorFields(
      err,
      "coarse_symbol_linkage",
      "validation",
      "Symbol traceability targeted a coarse file/module while narrower exported symbols exist.",
    );
  if (err.message.startsWith("Entity validation failed:"))
    return buildErrorFields(
      err,
      "entity_validation_failed",
      "validation",
      "Entity payload failed schema validation.",
    );
  if (err.message.startsWith("Relationship validation failed"))
    return buildErrorFields(
      err,
      "relationship_validation_failed",
      "validation",
      "Relationship payload failed schema validation.",
    );
  if (
    err.message.startsWith("Relationship source must match the upserted entity")
  )
    return buildErrorFields(
      err,
      "relationship_source_mismatch",
      "validation",
      "Relationship source did not match the entity being upserted.",
    );
  if (lower.includes("contradiction detected for requirement")) {
    const fields = buildErrorFields(
      err,
      "semantic_contradiction",
      "validation",
      "Requirement prose/facts contradict existing contradiction-ready requirements.",
    );
    return {
      ...fields,
      semantic_outcome: "conflict-blocked",
      ...semanticContradictionIds(err.message),
    };
  }
  if (lower.includes("module load failed"))
    return buildErrorFields(
      err,
      "prolog_module_load_failed",
      "prolog_runtime",
      "Prolog failed to load an execution module.",
    );
  if (lower.includes("query failed"))
    return buildErrorFields(
      err,
      "prolog_query_failed",
      "prolog_runtime",
      "Prolog query execution failed.",
    );
  return buildErrorFields(
    err,
    "handler_error",
    "handler",
    "Unhandled MCP handler error.",
  );
}

function semanticContradictionIds(message: string): {
  semantic_checked_req_id?: string;
  semantic_conflicting_req_ids?: string[];
} {
  const checked = message.match(
    /Contradiction detected for requirement\s+([^:\s]+)/i,
  );
  const conflicts = [
    ...message.matchAll(/Conflicts with\s+([^:\s]+)/gi),
  ].flatMap((match) => (match[1] ? [match[1]] : []));
  return {
    ...(checked?.[1] ? { semantic_checked_req_id: checked[1] } : {}),
    ...(conflicts.length > 0
      ? { semantic_conflicting_req_ids: conflicts }
      : {}),
  };
}

export function deriveDiagnosticHints(input: {
  tool: string;
  error: unknown;
  businessArgs?: Record<string, unknown> | null;
}): string {
  const error =
    input.error instanceof Error ? input.error : new Error(String(input.error));
  const message = error.message.toLowerCase();
  if (message.includes("invalid value 'implemented'"))
    return "invalid_status: use one of the schema-accepted statuses (for example open, active, accepted, passing).";
  if (message.includes("additional properties"))
    return "additional_properties: remove unsupported fields from the payload and retry with schema-only arguments.";

  const { error_category, error_stage, error_summary } =
    classifyDiagnosticError(error);
  const mappedStage = DIAGNOSTIC_PHASE_BY_STAGE[error_stage] ?? error_stage;
  if (error_category === "tool_timeout")
    return `tool_timeout ${mappedStage}: retry the same request after reducing payload size or scope.`;
  if (error_category === "relationship_source_mismatch")
    return `relationship_source_mismatch ${mappedStage}: align the relationship source with the upserted entity id.`;
  if (error_category === "semantic_contradiction")
    return `semantic_contradiction ${mappedStage}: add a supersedes relationship to the conflicting requirement, deprecate the older requirement, or align the modeled facts.`;
  if (error_category === "prolog_process_not_started")
    return `prolog_process_not_started ${mappedStage}: restart the MCP server before retrying the tool call.`;
  if (error_category === "prolog_query_failed")
    return `prolog_query_failed ${mappedStage}: inspect the Prolog query or workspace state and retry.`;
  return `${error_category} ${mappedStage}: ${error_summary}`;
}

export function buildDiagnosticToolCall(input: {
  tool: string;
  requestId: string;
  args: unknown;
  diagnosticPhase: string;
  error?: unknown;
  telemetry?: Record<string, unknown> | null;
}): DiagnosticToolCall {
  const diagnosticError = input.error
    ? classifyDiagnosticError(input.error)
    : null;
  const payload = isPlainObject(input.args)
    ? extractToolCallPayload(input.args)
    : { businessArgs: null, telemetry: null };
  return {
    schema_version: 1,
    canonical_tool: input.tool,
    request_id: input.requestId,
    diagnostic_phase: input.diagnosticPhase,
    business_args: payload.businessArgs,
    raw_args_redacted: redactDiagnosticArgs(input.args),
    retry_key: deriveDiagnosticRetryKey(input.tool, input.args),
    hint: deriveDiagnosticHints({
      tool: input.tool,
      error: input.error ?? new Error("diagnostic tool call"),
      businessArgs: payload.businessArgs,
    }),
    diagnostic_error: diagnosticError,
    diagnostic_telemetry: input.telemetry ?? payload.telemetry,
  };
}

export function extractToolCallPayload(
  args: Record<string, unknown>,
): ToolCallPayload {
  const { _diagnostic_telemetry, ...businessArgs } = args;
  const telemetry =
    _diagnostic_telemetry && typeof _diagnostic_telemetry === "object"
      ? (_diagnostic_telemetry as Record<string, unknown>)
      : null;
  return { businessArgs, telemetry };
}

function buildErrorFields(
  error: Error,
  category: string,
  stage: string,
  summary: string,
): DiagnosticErrorFields {
  return {
    error_name: error.name,
    error_message: error.message,
    error_category: category,
    error_stage: stage,
    error_summary: summary,
  };
}
