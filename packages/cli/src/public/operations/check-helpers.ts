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
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getKbPlPathOverride } from "../../env.js";
import { resolveKbPlPath } from "../../prolog.js";
import {
  DEFAULT_CHECKS_CONFIG,
  RULE_NAMES,
  type ChecksConfig,
  type Violation,
  getEffectiveRules,
} from "../../utils/rule-registry.js";
import { analyzePrologQueryPlanSafety } from "../../utils/prolog-query-plan-safety.js";
import {
  type ChangedFileImpactResult,
  type QualityDiagnostic,
  analyzeChangedFileImpact,
} from "../impact-diagnostics.js";
import type { CheckInput } from "./check-executor.js";

export { RULE_NAMES, getEffectiveRules };

function resolveChecksPlPath(): string {
  const override = getKbPlPathOverride();
  return path.join(path.dirname(override ?? resolveKbPlPath()), "checks.pl");
}

// implements REQ-mcp-tool-check
export function collectQueryPlanSafetyViolations(): Violation[] {
  const checksPlPath = resolveChecksPlPath();
  const source = readFileSync(checksPlPath, "utf8");
  return analyzePrologQueryPlanSafety(source).map((v) => ({
    rule: "query-plan-safety",
    entityId: v.predicate,
    description: v.description,
    suggestion: v.suggestion,
    source: `${checksPlPath}:${v.line}`,
  }));
}

// implements REQ-mcp-tool-check
export async function loadChecksConfig(
  workspaceRoot: string,
): Promise<ChecksConfig> {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  try {
    const content = await readFile(configPath, "utf8");
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
      }
    }

    const parsedSt = parsed.checks?.symbolTraceability;
    const normalizedSt = { ...DEFAULT_CHECKS_CONFIG.symbolTraceability };
    if (
      parsedSt &&
      typeof parsedSt === "object" &&
      typeof parsedSt.requireAdr === "boolean"
    ) {
      normalizedSt.requireAdr = parsedSt.requireAdr;
    }

    return { rules: normalizedRules, symbolTraceability: normalizedSt };
  } catch {
    return DEFAULT_CHECKS_CONFIG;
  }
}

// implements REQ-mcp-tool-check
export function hasImpactOptions(args: CheckInput): boolean {
  return Boolean(
    args.includeImpactDiagnostics ||
      args.staged ||
      args.includeWorkingTreeDiff ||
      (args.sourceFiles !== undefined && args.sourceFiles.length > 0),
  );
}

// implements REQ-mcp-tool-check
export function analyzeKbCheckImpact(
  workspaceRoot: string,
  args: CheckInput,
): ChangedFileImpactResult | undefined {
  if (!hasImpactOptions(args)) {
    return undefined;
  }
  return analyzeChangedFileImpact({
    workspaceRoot,
    ...(args.sourceFiles !== undefined
      ? { sourceFiles: args.sourceFiles }
      : {}),
    ...(args.staged !== undefined ? { staged: args.staged } : {}),
    ...(args.includeWorkingTreeDiff !== undefined
      ? { includeWorkingTreeDiff: args.includeWorkingTreeDiff }
      : {}),
    ...(args.includeImpactDiagnostics !== undefined
      ? { includeImpactDiagnostics: args.includeImpactDiagnostics }
      : {}),
    ...(args.maxDiagnostics !== undefined
      ? { maxDiagnostics: args.maxDiagnostics }
      : {}),
  });
}

// implements REQ-mcp-tool-check
export function qualityDiagnosticsFromImpact(
  impactResult: ChangedFileImpactResult | undefined,
): readonly QualityDiagnostic[] {
  if (impactResult === undefined) return [];
  return impactResult.impactDiagnostics.filter(
    (d) => !d.blocking && d.severity !== "error",
  );
}
