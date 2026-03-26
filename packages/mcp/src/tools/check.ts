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
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import {
  type ChecksConfig,
  DEFAULT_CHECKS_CONFIG,
  RULE_NAMES,
  type Violation,
} from "kibi-cli/public/check-types";
import { resolveWorkspaceRoot } from "../workspace.js";

const require = createRequire(import.meta.url);

function resolveChecksPlPath(): string {
  const overrideChecksPath = process.env.KIBI_CHECKS_PL_PATH;
  if (overrideChecksPath && existsSync(overrideChecksPath)) {
    return overrideChecksPath;
  }

  try {
    const installedChecksPl = require.resolve("kibi-core/src/checks.pl");
    if (existsSync(installedChecksPl)) {
      return installedChecksPl;
    }
  } catch {}

  const localChecksPl = path.join(process.cwd(), "packages/core/src/checks.pl");
  if (existsSync(localChecksPl)) {
    return localChecksPl;
  }

  throw new Error("Unable to resolve checks.pl path");
}

export interface CheckArgs {
  rules?: string[];
}

interface Diagnostic {
  category: string;
  severity: "error" | "warning";
  message: string;
  file?: string;
  suggestion?: string;
}

function formatDiagnosticsForMcp(diagnostics: Diagnostic[]) {
  return diagnostics.map((d) => ({
    category: d.category,
    severity: d.severity,
    message: d.message,
    file: d.file,
    suggestion: d.suggestion,
  }));
}

export interface CheckResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    violations: Violation[];
    count: number;
    diagnostics: Array<{
      category: string;
      severity: string;
      message: string;
      file?: string;
      suggestion?: string;
    }>;
  };
}

function formatViolationText(violations: Violation[]): string {
  if (violations.length === 0) {
    return "No violations found";
  }

  const details = violations.map((violation) => {
    const parts = [
      violation.rule,
      violation.entityId,
      violation.source ?? "unknown-source",
      violation.description,
    ];
    if (violation.suggestion) {
      parts.push(`Suggestion: ${violation.suggestion}`);
    }
    return `- ${parts.join(" | ")}`;
  });

  return `${violations.length} violations found\n${details.join("\n")}`;
}

// implements REQ-002
function loadChecksConfig(workspaceRoot: string): ChecksConfig {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");

  if (!existsSync(configPath)) {
    return DEFAULT_CHECKS_CONFIG;
  }

  try {
    const content = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(content) as {
      checks?: Partial<ChecksConfig>;
    };

    const parsedRules = parsed.checks?.rules;
    const normalizedRules: Record<string, boolean> = {
      ...DEFAULT_CHECKS_CONFIG.rules,
    };
    if (parsedRules && typeof parsedRules === "object") {
      for (const [key, value] of Object.entries(parsedRules)) {
        if (typeof value === "boolean") {
          normalizedRules[key] = value;
        }
        // Ignore non-boolean values (they are not added to normalizedRules, preserving defaults)
      }
    }

    const parsedSt = parsed.checks?.symbolTraceability;
    const normalizedSt = { ...DEFAULT_CHECKS_CONFIG.symbolTraceability };
    if (parsedSt && typeof parsedSt === "object") {
      if (
        typeof (parsedSt as { requireAdr?: unknown }).requireAdr === "boolean"
      ) {
        normalizedSt.requireAdr = (
          parsedSt as { requireAdr: boolean }
        ).requireAdr;
      }
    }

    return {
      rules: normalizedRules,
      symbolTraceability: normalizedSt,
    };
  } catch {
    return DEFAULT_CHECKS_CONFIG;
  }
}

// implements REQ-002
function getEffectiveRules(
  configRules: Record<string, boolean>,
  requestedRules?: string[],
): Set<string> {
  if (requestedRules && requestedRules.length > 0) {
    return new Set(requestedRules.filter((rule) => RULE_NAMES.has(rule)));
  }

  const effective = new Set<string>();

  for (const rule of RULE_NAMES) {
    const enabled = configRules[rule] ?? true;
    if (enabled) {
      effective.add(rule);
    }
  }

  return effective;
}

/**
 * Handle kb_check tool calls - run validation rules on the KB
 * Reuses validation logic from CLI check command
 */
// implements REQ-002
export async function handleKbCheck(
  prolog: PrologProcess,
  args: CheckArgs,
): Promise<CheckResult> {
  const { rules } = args;

  try {
    const workspaceRoot = resolveWorkspaceRoot();
    const checksConfig = loadChecksConfig(workspaceRoot);
    const rulesAllowlist = getEffectiveRules(checksConfig.rules, rules);

    if (rulesAllowlist.size === 0) {
      return {
        content: [{ type: "text", text: "No violations found" }],
        structuredContent: {
          violations: [],
          count: 0,
          diagnostics: [],
        },
      };
    }

    // Run aggregated checks using same approach as CLI
    // This now runs ALL rules including symbol-traceability
    const aggregatedViolations = await runAggregatedChecks(
      prolog,
      rulesAllowlist,
      checksConfig.symbolTraceability.requireAdr,
    );

    const diagnostics: Diagnostic[] = aggregatedViolations.map((v) => ({
      category: "SYNC_ERROR",
      severity: "error",
      message: v.description,
      file: v.source,
      suggestion: v.suggestion,
    }));

    const summary = formatViolationText(aggregatedViolations);

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      structuredContent: {
        violations: aggregatedViolations,
        count: aggregatedViolations.length,
        diagnostics: formatDiagnosticsForMcp(diagnostics),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Check execution failed: ${message}`);
  }
}

// implements REQ-002
async function runAggregatedChecks(
  prolog: PrologProcess,
  rulesAllowlist: Set<string>,
  requireAdr: boolean,
): Promise<Violation[]> {
  const violations: Violation[] = [];

  const checksPlPath = resolveChecksPlPath();
  const normalizedChecksPlPath = checksPlPath.replace(/\\/g, "/");
  const checksPlPathEscaped = normalizedChecksPlPath.replace(/'/g, "''");

  // Use check_all_json_with_options if available, otherwise fall back to check_all_json
  const requireAdrStr = requireAdr ? "true" : "false";
  const query = `(use_module('${checksPlPathEscaped}'),
    (   predicate_property(checks:check_all_json_with_options(_, _), _)
    ->  call(checks:check_all_json_with_options(JsonString, ${requireAdrStr}))
    ;   call(checks:check_all_json(JsonString))
    ))`;

  const result = await prolog.query(query);

  if (!result.success) {
    throw new Error(
      `Aggregated checks query failed: ${result.error || "Unknown error"}`,
    );
  }

  let violationsDict: Record<string, JsonViolation[]>;
  try {
    const jsonString = result.bindings.JsonString;
    if (!jsonString) {
      throw new Error("No JSON string in binding");
    }
    let parsed = JSON.parse(jsonString);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    violationsDict = parsed as Record<string, JsonViolation[]>;
  } catch (parseError) {
    throw new Error(
      `Failed to parse violations JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    );
  }

  for (const ruleViolations of Object.values(violationsDict)) {
    for (const v of ruleViolations) {
      const isAllowed = rulesAllowlist.has(v.rule);
      if (isAllowed) {
        violations.push({
          rule: v.rule,
          entityId: v.entityId,
          description: v.description,
          suggestion: v.suggestion || undefined,
          source: v.source || undefined,
        });
      }
    }
  }

  return violations;
}

interface JsonViolation {
  rule: string;
  entityId: string;
  description: string;
  suggestion: string;
  source: string;
}
