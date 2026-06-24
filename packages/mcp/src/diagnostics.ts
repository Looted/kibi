/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

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
