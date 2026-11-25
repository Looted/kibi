import { execFileSync, execSync } from "node:child_process";
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
import type { KibiLevel } from "kibi-agent-core/kibi-level";
import { resolveKbPlPath } from "../../prolog.js";
import { getStagedFiles } from "../../traceability/git-staged.js";
import { createStagedEntityIdStyleDiagnostics } from "../../traceability/staged-entity-id-style.js";
import { analyzePrologQueryPlanSafety } from "../../utils/prolog-query-plan-safety.js";
import {
  RULE_NAMES,
  type RuleDefinition,
  type Violation,
  getEffectiveRules,
  getRuleDefinition,
  getRuleEnforcementClass,
} from "../../utils/rule-registry.js";
import {
  type ChangedFileImpactOptions,
  type ChangedFileImpactResult,
  type QualityDiagnostic,
  analyzeChangedFileImpact,
} from "../impact-diagnostics.js";
import type { CheckInput } from "./check-executor.js";
import { readAuthoredEntity } from "./entity-context.js";

export { RULE_NAMES, getEffectiveRules };

/**
 * Split Prolog/check findings by enforcement class so advisory and
 * migration results cannot gate canonical health.
 *
 * Canonical findings stay in `violations` (blocking). Advisory findings
 * always become non-blocking quality diagnostics. Migration findings are
 * also non-blocking and only appear when that rule was selected to run.
 */
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

    // Only a registered rule has a non-canonical enforcement class.
    const definition = getRuleDefinition(finding.rule) as RuleDefinition;
    qualityDiagnostics.push({
      id: `rule.${finding.rule}`,
      severity: definition.diagnosticSeverity ?? "warning",
      blocking: false,
      category: definition.category,
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
  // Linked entity and symbol ids are strings, so a missing entityId is never
  // among them.
  const inScope = (diagnostic: QualityDiagnostic) =>
    entityIds.has(diagnostic.entityId as string) ||
    (diagnostic.source !== undefined &&
      files.has(normalizePath(diagnostic.source))) ||
    diagnostic.files?.some((file) => files.has(normalizePath(file))) === true;

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

/**
 * Rules whose findings describe the store or the KB as a whole (the compiled
 * store, joint consistency, source/compile parity). They are never scoped
 * out: an edit anywhere can cause them, and a scoped check that hid them
 * could read as a pass.
 */
const UNSCOPED_RULES: ReadonlySet<string> = new Set([
  "branch-store-not-compiled",
  "kb-consistency",
  "source-relationship-parity",
]);

/** Blocking findings a scoped check left out, by rule. */
export type OmittedViolations = {
  readonly total: number;
  readonly byRule: Readonly<Record<string, number>>;
};

/**
 * The entity id a `.kb/<kind>/<file>.md` path from Git holds, or undefined:
 * the `id` in the document's front matter, or the file name when the
 * document is gone or names no id.
 */
function kbDocumentEntityId(
  workspaceRoot: string,
  file: string,
): string | undefined {
  // Git prints paths with forward slashes on every platform, relative to the
  // repository; the `.kb/...` part is relative to the workspace.
  const match = /(?:^|\/)(\.kb\/[^/]+\/([^/]+)\.md)$/.exec(file);
  if (!match) return undefined;
  const relative = match[1] as string;
  try {
    const entity = readAuthoredEntity(
      readFileSync(path.join(workspaceRoot, relative), "utf8"),
      relative,
    );
    if (entity) return entity.id;
  } catch {
    // Deleted: the file name is all that is left.
  }
  return match[2];
}

/**
 * Ids of the KB entities whose authored document differs from HEAD: staged,
 * unstaged or untracked `.kb/<kind>/<file>.md` files, by the id their front
 * matter names. These are the agent's own
 * writes, so a scoped check always reports their findings. Outside a Git
 * work tree there is nothing to compare with, and none is returned.
 */
export function changedKbEntityIds(workspaceRoot: string): Set<string> {
  const ids = new Set<string>();
  let output: string;
  try {
    output = execFileSync(
      "git",
      ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ".kb"],
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        // rationale: stdin and stderr only keep Git quiet; the ids read from
        // stdout are the same whichever streams are piped.
        // Stryker disable next-line ArrayDeclaration,StringLiteral
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
  } catch {
    return ids;
  }
  const entries = output.split("\0");
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as string;
    // A rename or copy lists its old path as the next entry.
    if (
      entry[0] === "R" ||
      // rationale: Git lists a copy only when its source changed too, so the
      // source's own entry names the same id whether or not this skips.
      // Stryker disable next-line ConditionalExpression,EqualityOperator,StringLiteral
      entry[0] === "C"
    )
      index += 1;
    const id = kbDocumentEntityId(workspaceRoot, entry.slice(3));
    if (id !== undefined) ids.add(id);
  }
  return ids;
}

/**
 * The blocking findings of a check scoped to `sourceFiles` that concern the
 * change: findings on an entity the changed symbols link to (or on those
 * symbols), on an entity whose KB document changed, on a relationship with
 * either end among them, or whose source is a checked file, plus every
 * store-level finding. The rest is counted by rule, so the result says how
 * many blocking findings the unfiltered check still reports.
 */
export function scopeViolationsToImpact(
  violations: readonly Violation[],
  impactResult: ChangedFileImpactResult,
  changedEntityIds: ReadonlySet<string>,
): { kept: Violation[]; omitted: OmittedViolations | undefined } {
  const normalizePath = (value: string) =>
    value.replace(/\\/g, "/").replace(/^\.\//, "");
  const files = new Set(impactResult.sourceFiles.map(normalizePath));
  const ids = new Set<string>(changedEntityIds);
  for (const linked of impactResult.linkedEntities) {
    ids.add(linked.id);
    ids.add(linked.sourceSymbolId);
  }
  for (const symbol of impactResult.extractedSymbols) ids.add(symbol.id);
  const endpoints = (violation: Violation): unknown[] => {
    const relationship = (
      violation.evidence as { relationship?: { from?: unknown; to?: unknown } }
    )?.relationship;
    return [relationship?.from, relationship?.to];
  };
  const inScope = (violation: Violation) =>
    !violation.entityId ||
    UNSCOPED_RULES.has(violation.rule) ||
    ids.has(violation.entityId) ||
    // A non-string endpoint is never an id in the set.
    endpoints(violation).some((endpoint) => ids.has(endpoint as string)) ||
    (violation.source !== undefined &&
      files.has(normalizePath(violation.source)));

  const kept: Violation[] = [];
  const byRule = new Map<string, number>();
  for (const violation of violations) {
    if (inScope(violation)) {
      kept.push(violation);
    } else {
      byRule.set(violation.rule, (byRule.get(violation.rule) ?? 0) + 1);
    }
  }
  if (byRule.size === 0) return { kept, omitted: undefined };
  const rules = [...byRule.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  return {
    kept,
    omitted: {
      total: rules.reduce((sum, [, count]) => sum + count, 0),
      byRule: Object.fromEntries(rules),
    },
  };
}

function resolveChecksPlPath(): string {
  // resolveKbPlPath honours KIBI_KB_PL_PATH and treats an empty one as unset.
  return path.join(path.dirname(resolveKbPlPath()), "checks.pl");
}

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
 * Enforcement policy is Kibi-owned: repositories cannot disable a single
 * check rule; the project's Kibi level selects whether the verification
 * layer runs. `args.rules` is an invocation-time diagnostic selector that never
 * persists and never redefines project health.
 */
export function resolveCheckRules(
  args: Pick<CheckInput, "rules">,
  level: KibiLevel = "test",
): Set<string> {
  // No selection runs the level's default rules; an empty one runs none.
  return getEffectiveRules(args.rules, level);
}

/**
 * Read whether the workspace still carries a legacy `.kb/config.json`.
 * Retained only so check summaries can point operators at migration; the
 * document never alters rule selection.
 */
export async function readLegacyChecksHint(
  workspaceRoot: string,
): Promise<string | null> {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  try {
    await readFile(configPath);
  } catch {
    return null;
  }
  return `Legacy ${path.join(".kb", "config.json")} is present. Kibi no longer reads project check or path configuration; run 'kibi migrate' to adopt the canonical .kb/ layout and retire this file.`;
}

export function hasImpactOptions(args: CheckInput): boolean {
  return Boolean(
    args.includeImpactDiagnostics ||
      args.staged ||
      args.includeWorkingTreeDiff ||
      (args.sourceFiles !== undefined && args.sourceFiles.length > 0),
  );
}

export async function analyzeKbCheckImpact(
  workspaceRoot: string,
  args: CheckInput,
): Promise<ChangedFileImpactResult | undefined> {
  if (!hasImpactOptions(args)) {
    return undefined;
  }
  // Every option the analyzer reads treats undefined as absent.
  return analyzeChangedFileImpact({
    workspaceRoot,
    sourceFiles: args.sourceFiles,
    staged: args.staged,
    includeWorkingTreeDiff: args.includeWorkingTreeDiff,
    includeImpactDiagnostics: args.includeImpactDiagnostics,
    maxDiagnostics: args.maxDiagnostics,
  } as ChangedFileImpactOptions);
}

/**
 * Advisory naming-style review for entity Markdown staged as new. Runs only
 * for `staged: true`, the creation boundary where a purely numeric ID can
 * still be renamed cheaply; committed legacy entities are never evaluated.
 */
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

export function qualityDiagnosticsFromImpact(
  impactResult: ChangedFileImpactResult | undefined,
): readonly QualityDiagnostic[] {
  if (impactResult === undefined) return [];
  return impactResult.impactDiagnostics.filter(
    (d) => !d.blocking && d.severity !== "error",
  );
}
