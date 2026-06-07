/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import fs from "node:fs";
import path from "node:path";
import { resolveWorkspaceRoot } from "./workspace.js";

const DIAGNOSTIC_MODE_FLAG = "--diagnostic-mode";

/**
 * Whether diagnostic mode is enabled via CLI flag.
 * Set during server startup and never changes at runtime.
 */
export const DIAGNOSTIC_MODE_ENABLED =
  process.argv.includes(DIAGNOSTIC_MODE_FLAG);

/**
 * Path to the diagnostic usage log file.
 * Only valid when DIAGNOSTIC_MODE_ENABLED is true.
 */
let diagnosticUsageLogPath: string | null = null;

/**
 * Initialize diagnostic mode: set up usage.log path.
 * Called once during server startup.
 */
// implements REQ-008
export function initializeDiagnosticMode(
  enabled: boolean = DIAGNOSTIC_MODE_ENABLED,
): void {
  diagnosticUsageLogPath = null;

  if (!enabled) {
    process.env.KIBI_MCP_DIAGNOSTIC_MODE = "0";
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot();
  diagnosticUsageLogPath = path.join(workspaceRoot, ".kb", "usage.log");
  process.env.KIBI_MCP_DIAGNOSTIC_MODE = "1";
}

/**
 * Append a JSON line to the usage.log file.
 * No-op if diagnostic mode is not enabled.
 */
// implements REQ-008
export function appendUsageLogLine(entry: Record<string, unknown>): void {
  if (!diagnosticUsageLogPath) {
    return;
  }
  const logDir = path.dirname(diagnosticUsageLogPath);
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(diagnosticUsageLogPath, `${JSON.stringify(entry)}\n`, {
    encoding: "utf8",
  });
}

/**
 * Schema for _diagnostic_telemetry field added to tool inputs in diagnostic mode.
 */
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
  },
};

/**
 * Tool call metadata extracted from args.
 */
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
}

// implements REQ-002
export function classifyDiagnosticError(error: unknown): DiagnosticErrorFields {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message;
  const lower = message.toLowerCase();

  if (lower.includes("stale_snapshot")) {
    return buildErrorFields(
      err,
      "stale_snapshot",
      "persistence",
      "KB snapshot is stale; refresh/retry after the latest KB state is attached.",
    );
  }

  if (lower.includes("unknown option") && lower.includes("h for help")) {
    return buildErrorFields(
      err,
      "prolog_unknown_option",
      "prolog_runtime",
      "Prolog rejected startup/module/query options; inspect MCP package wiring and Prolog invocation.",
    );
  }

  if (lower.includes("prolog process not started")) {
    return buildErrorFields(
      err,
      "prolog_process_not_started",
      "prolog_lifecycle",
      "Prolog process is unavailable; restart the MCP server before retrying.",
    );
  }

  if (
    lower.includes("resetting prolog worker") ||
    lower.includes("prolog worker reset")
  ) {
    return buildErrorFields(
      err,
      "prolog_worker_reset",
      "prolog_lifecycle",
      "Prolog worker was reset so the next MCP call can start from a fresh worker.",
    );
  }

  if (
    /timed out after \d+ms/i.test(message) ||
    lower.includes("tool timeout")
  ) {
    return buildErrorFields(
      err,
      "tool_timeout",
      "tool_timeout",
      "MCP tool execution exceeded its bounded timeout.",
    );
  }

  if (lower.includes("coarsely while granular symbols are available")) {
    return buildErrorFields(
      err,
      "coarse_symbol_linkage",
      "validation",
      "Symbol traceability targeted a coarse file/module while narrower exported symbols exist.",
    );
  }

  if (message.startsWith("Entity validation failed:")) {
    return buildErrorFields(
      err,
      "entity_validation_failed",
      "validation",
      "Entity payload failed schema validation.",
    );
  }

  if (message.startsWith("Relationship validation failed")) {
    return buildErrorFields(
      err,
      "relationship_validation_failed",
      "validation",
      "Relationship payload failed schema validation.",
    );
  }

  if (
    message.startsWith("Relationship source must match the upserted entity")
  ) {
    return buildErrorFields(
      err,
      "relationship_source_mismatch",
      "validation",
      "Relationship source did not match the entity being upserted.",
    );
  }

  if (lower.includes("module load failed")) {
    return buildErrorFields(
      err,
      "prolog_module_load_failed",
      "prolog_runtime",
      "Prolog failed to load an execution module.",
    );
  }

  if (lower.includes("query failed")) {
    return buildErrorFields(
      err,
      "prolog_query_failed",
      "prolog_runtime",
      "Prolog query execution failed.",
    );
  }

  return buildErrorFields(
    err,
    "handler_error",
    "handler",
    "Unhandled MCP handler error.",
  );
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

// implements REQ-002
export function deriveDiagnosticFields(
  toolName: string,
  args: Record<string, unknown>,
  telemetry: Record<string, unknown> | null,
  result: unknown,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    telemetry_status: telemetry ? "provided" : "missing",
  };

  if (telemetry) {
    fields.telemetry_is_autonomous = telemetry.is_autonomous ?? null;
    fields.telemetry_confidence_score = telemetry.confidence_score ?? null;
    fields.telemetry_attempt_number = telemetry.attempt_number ?? null;
  }

  const structuredContent =
    result && typeof result === "object" && "structuredContent" in result
      ? (result as { structuredContent?: Record<string, unknown> })
          .structuredContent
      : undefined;

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

  if (!fields.result_summary) {
    fields.result_summary = `${toolName} completed`;
  }

  return fields;
}

/**
 * Extract business args and telemetry from tool call arguments.
 */
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
