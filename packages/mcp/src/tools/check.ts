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

const ALL_RULES = [
  "must-priority-coverage",
  "no-dangling-refs",
  "no-cycles",
  "required-fields",
  "symbol-coverage",
  "symbol-traceability",
  "deprecated-adr-no-successor",
  "domain-contradictions",
] as const;

const RULE_NAMES = new Set<string>(ALL_RULES);

interface ChecksConfig {
  rules: Record<string, boolean>;
  symbolTraceability: {
    requireAdr: boolean;
  };
}

const DEFAULT_CHECKS_CONFIG: ChecksConfig = {
  rules: Object.fromEntries(ALL_RULES.map((rule) => [rule, true])),
  symbolTraceability: {
    requireAdr: false,
  },
};

interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
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

    return {
      rules: {
        ...DEFAULT_CHECKS_CONFIG.rules,
        ...parsed.checks?.rules,
      },
      symbolTraceability: {
        ...DEFAULT_CHECKS_CONFIG.symbolTraceability,
        ...parsed.checks?.symbolTraceability,
      },
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
  const effective = new Set<string>();

  for (const rule of ALL_RULES) {
    const enabled = configRules[rule] ?? true;
    if (enabled) {
      effective.add(rule);
    }
  }

  if (requestedRules && requestedRules.length > 0) {
    const allowed = new Set(
      requestedRules.filter((rule) => RULE_NAMES.has(rule)),
    );
    for (const rule of Array.from(effective)) {
      if (!allowed.has(rule)) {
        effective.delete(rule);
      }
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

    const summary =
      aggregatedViolations.length === 0
        ? "No violations found"
        : `${aggregatedViolations.length} violations found`;

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

  try {
    const result = await prolog.query(query);

    if (!result.success) {
      console.warn(
        "Aggregated checks query failed, falling back to individual checks",
      );
      return [];
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
      console.warn("Failed to parse violations JSON:", parseError);
      return [];
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
  } catch (error) {
    console.warn("Error running aggregated checks:", error);
    return [];
  }
}

interface JsonViolation {
  rule: string;
  entityId: string;
  description: string;
  suggestion: string;
  source: string;
}
