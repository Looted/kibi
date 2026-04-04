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
export function initializeDiagnosticMode(): void {
  if (DIAGNOSTIC_MODE_ENABLED) {
    const workspaceRoot = resolveWorkspaceRoot();
    diagnosticUsageLogPath = path.join(workspaceRoot, ".kb", "usage.log");
    process.env.KIBI_MCP_DIAGNOSTIC_MODE = "1";
  }
}

/**
 * Append a JSON line to the usage.log file.
 * No-op if diagnostic mode is not enabled.
 */
export function appendUsageLogLine(entry: Record<string, unknown>): void {
  if (!DIAGNOSTIC_MODE_ENABLED || !diagnosticUsageLogPath) {
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
