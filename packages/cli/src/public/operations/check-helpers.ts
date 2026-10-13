import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
import { getKbPlPathOverride } from "../../env.js";
import { resolveKbPlPath } from "../../prolog.js";
import { getStagedFiles } from "../../traceability/git-staged.js";
import { createStagedEntityIdStyleDiagnostics } from "../../traceability/staged-entity-id-style.js";
import { analyzePrologQueryPlanSafety } from "../../utils/prolog-query-plan-safety.js";
import {
  RULE_NAMES,
  type Violation,
  getEffectiveRules,
  getRuleDefinition,
  getRuleEnforcementClass,
} from "../../utils/rule-registry.js";
import {
  type ChangedFileImpactResult,
  type QualityDiagnostic,
  analyzeChangedFileImpact,
} from "../impact-diagnostics.js";
import type { CheckInput } from "./check-executor.js";

export { RULE_NAMES, getEffectiveRules };

/**
 * Split Prolog/check findings by enforcement class so advisory and
 * migration results cannot gate canonical health.
 *
 * Canonical findings stay in `violations` (blocking). Advisory findings
 * always become non-blocking quality diagnostics. Migration findings are
 * also non-blocking and only appear when that rule was selected to run.
 */
// implements REQ-cli-check, REQ-mcp-tool-check
export function partitionCheckFindings(findings: readonly Violation[]): {
  violations: Violation[];
  qualityDiagnostics: QualityDiagnostic[];
} {
  const violations: Violation[] = [];
  const qualityDiagnostics: QualityDiagnostic[] = [];

  for (const finding of findings) {
    const enforcement = getRuleEnforcementClass(finding.rule) ?? "canonical";
    if (enforcement === "canonical") {
      violations.push(finding);
      continue;
    }

    const definition = getRuleDefinition(finding.rule);
    qualityDiagnostics.push({
      id: `rule.${finding.rule}`,
      severity: definition?.diagnosticSeverity ?? "warning",
      blocking: false,
      category: definition?.category ?? "integrity",
      ...(finding.entityId !== undefined ? { entityId: finding.entityId } : {}),
      ...(finding.source !== undefined ? { source: finding.source } : {}),
      message: finding.description,
      suggestion: finding.suggestion ?? "",
      ...(finding.evidence !== undefined ? { evidence: finding.evidence } : {}),
    });
  }

  return { violations, qualityDiagnostics };
}

export const SCOPED_CHECK_OMITTED_ID = "scoped_check_omitted_quality";
const OMITTED_RULES_SHOWN = 5;

/**
 * Advisory rule findings of a check scoped to `sourceFiles` that concern
 * those files: findings on an entity a changed file's symbols link to (or on
 * those symbols) and findings whose source is one of the files. The KB-wide rest (unapproved requirements elsewhere,
 * unrelated scenarios) is reduced to one info diagnostic with per-rule counts,
 * so a check after a small edit answers about that edit; kb_check without
 * sourceFiles still lists every finding.
 */
// implements REQ-cli-check
export function scopeQualityDiagnosticsToImpact(
  diagnostics: readonly QualityDiagnostic[],
  impactResult: ChangedFileImpactResult,
): QualityDiagnostic[] {
  const normalizePath = (value: string) =>
    value.replace(/\\/g, "/").replace(/^\.\//, "");
  const files = new Set(impactResult.sourceFiles.map(normalizePath));
  const entityIds = new Set<string>();
  for (const linked of impactResult.linkedEntities) {
    entityIds.add(linked.id);
    entityIds.add(linked.sourceSymbolId);
  }
  const inScope = (diagnostic: QualityDiagnostic) =>
    (diagnostic.entityId !== undefined && entityIds.has(diagnostic.entityId)) ||
    (diagnostic.source !== undefined &&
      files.has(normalizePath(diagnostic.source))) ||
    (diagnostic.files ?? []).some((file) => files.has(normalizePath(file)));

  const kept: QualityDiagnostic[] = [];
  const omittedByRule = new Map<string, number>();
  for (const diagnostic of diagnostics) {
    if (inScope(diagnostic)) {
      kept.push(diagnostic);
      continue;
    }
    const rule = diagnostic.id.replace(/^rule\./, "");
    omittedByRule.set(rule, (omittedByRule.get(rule) ?? 0) + 1);
  }
  if (omittedByRule.size === 0) return kept;

  const omitted = [...omittedByRule.values()].reduce((a, b) => a + b, 0);
  const rules = [...omittedByRule.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const shown = rules
    .slice(0, OMITTED_RULES_SHOWN)
    .map(([rule, count]) => `${rule} ×${count}`);
  if (rules.length > OMITTED_RULES_SHOWN) {
    shown.push(`${rules.length - OMITTED_RULES_SHOWN} more rules`);
  }
  kept.push({
    id: SCOPED_CHECK_OMITTED_ID,
    severity: "info",
    blocking: false,
    category: "integrity",
    message: `This check is scoped to ${files.size} source ${files.size === 1 ? "file" : "files"}; ${omitted} advisory ${omitted === 1 ? "finding" : "findings"} elsewhere in the KB ${omitted === 1 ? "is" : "are"} not listed (${shown.join(", ")}). None of them concerns the checked files.`,
    suggestion:
      "Run kb_check without sourceFiles for the full KB audit when it matters to the task.",
    evidence: { omitted, byRule: Object.fromEntries(rules) },
  });
  return kept;
}

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

/**
 * Resolve the rules for one check invocation.
 *
 * Enforcement policy is Kibi-owned: repositories cannot disable canonical
 * checks. `args.rules` is an invocation-time diagnostic selector that never
 * persists and never redefines project health.
 */
// implements REQ-mcp-tool-check
export function resolveCheckRules(
  args: Pick<CheckInput, "rules">,
): Set<string> {
  if (args.rules === undefined) {
    return getEffectiveRules();
  }
  if (args.rules.length === 0) {
    return new Set<string>();
  }
  return getEffectiveRules(args.rules);
}

/**
 * Read whether the workspace still carries a legacy `.kb/config.json`.
 * Retained only so check summaries can point operators at migration; the
 * document never alters rule selection.
 */
// implements REQ-mcp-tool-check
export async function readLegacyChecksHint(
  workspaceRoot: string,
): Promise<string | null> {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  try {
    await readFile(configPath, "utf8");
  } catch {
    return null;
  }
  return `Legacy ${path.join(".kb", "config.json")} is present. Kibi no longer reads project check or path configuration; run 'kibi migrate' to adopt the canonical .kb/ layout and retire this file.`;
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
export async function analyzeKbCheckImpact(
  workspaceRoot: string,
  args: CheckInput,
): Promise<ChangedFileImpactResult | undefined> {
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

/**
 * Advisory naming-style review for entity Markdown staged as new. Runs only
 * for `staged: true`, the creation boundary where a purely numeric ID can
 * still be renamed cheaply; committed legacy entities are never evaluated.
 */
// implements REQ-kibi-entity-id-style
export function stagedEntityIdStyleDiagnostics(
  workspaceRoot: string,
  args: Pick<CheckInput, "staged">,
): readonly QualityDiagnostic[] {
  if (args.staged !== true) return [];
  try {
    return createStagedEntityIdStyleDiagnostics(
      getStagedFiles((command, options) =>
        execSync(command, { ...options, cwd: workspaceRoot }),
      ),
    );
  } catch {
    // Outside a Git work tree there is no staged creation boundary.
    return [];
  }
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
