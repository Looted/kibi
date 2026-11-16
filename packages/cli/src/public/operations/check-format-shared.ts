import { getDefaultRules } from "../../utils/rule-registry.js";
import type { Violation } from "../check-types.js";
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
import type { ChangedFileImpactResult } from "../impact-diagnostics.js";
import type { QualityDiagnostic } from "../impact-diagnostics.js";
import type { OmittedViolations } from "./check-helpers.js";
import type { MigrationPlan } from "./migration-plan.js";
import type { SymbolDebt } from "./symbol-debt.js";

export interface CheckDiagnostic {
  readonly category: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly file?: string;
  readonly suggestion?: string;
}

/**
 * What a check run evaluated, so "no violations" can be told apart from
 * "nothing evaluated": how many rules ran, their names when some default
 * rule did not run, and for `domain-contradictions` how many pairs of
 * requirement facts it compared.
 */
export interface CheckEvaluated {
  readonly ruleCount: number;
  /** The rules that ran, listed only when a default rule did not. */
  readonly rules?: readonly string[];
  readonly domainContradictions?: Readonly<{ factPairsExamined: number }>;
}

/**
 * The rules a run evaluated as a count, with their names only when some
 * default rule was skipped: a full run is one number, a narrowed one says
 * which rules it covered.
 */
export function describeEvaluatedRules(
  rules: Iterable<string>,
): Pick<CheckEvaluated, "ruleCount" | "rules"> {
  const ran = [...rules];
  const ranSet = new Set(ran);
  const skipped = [...getDefaultRules()].some((rule) => !ranSet.has(rule));
  return { ruleCount: ran.length, ...(skipped ? { rules: ran } : {}) };
}

export interface CheckStructuredContent {
  readonly violations: readonly Violation[];
  readonly count: number;
  readonly evaluated: CheckEvaluated;
  readonly diagnostics: readonly CheckDiagnostic[];
  readonly qualityDiagnostics?: readonly QualityDiagnostic[];
  readonly impactDiagnostics?: ChangedFileImpactResult["impactDiagnostics"];
  readonly sourceFiles?: ChangedFileImpactResult["sourceFiles"];
  readonly extractedSymbols?: ChangedFileImpactResult["extractedSymbols"];
  readonly linkedEntities?: ChangedFileImpactResult["linkedEntities"];
  readonly nextActions?: ChangedFileImpactResult["nextActions"];
  readonly migrationPlan?: MigrationPlan;
  /** A scoped check's plan, summarized unless includeMigrationPlan was set. */
  readonly migrationPlanSummary?: MigrationPlanSummary;
  /** Blocking findings a scoped check left out; `count` still includes them. */
  readonly omittedViolations?: OmittedViolations;
  /** Listed blocking findings past the size budget, grouped by rule. */
  readonly violationGroups?: readonly ViolationGroup[];
  /** Set when the result was cut to its size budget. */
  readonly truncated?: true;
  readonly truncation?: Readonly<{ budgetChars: number; hint: string }>;
  /**
   * Declarations without a symbol record in files that have at least one,
   * reported by a check with no rule or file scope as counts, listed per
   * file only with includeSymbolDebt. Never blocking.
   */
  readonly symbolDebt?: SymbolDebt;
}

/** A migration plan reduced to what a scoped check needs to say. */
export type MigrationPlanSummary = Readonly<{
  planHash: string;
  status: MigrationPlan["status"];
  summary: MigrationPlan["summary"];
  actionsByCode: Readonly<Record<string, number>>;
  blockedActionIds: readonly string[];
  hint: string;
}>;

/** Blocking findings of one rule listed by entity id only. */
export type ViolationGroup = Readonly<{
  rule: string;
  count: number;
  entityIds: readonly string[];
  description: string;
  suggestion?: string;
}>;

const SHOWN_BLOCKED_ACTION_IDS = 10;

/**
 * The plan's hash, status and counts, without its actions. A scoped check
 * answers about an edit; the actions (one per finding, each repeating it)
 * are for the full plan that kb_apply_plan applies.
 */
export function summarizeMigrationPlan(
  plan: MigrationPlan,
): MigrationPlanSummary {
  const actionsByCode: Record<string, number> = {};
  for (const action of plan.actions) {
    actionsByCode[action.code] = (actionsByCode[action.code] ?? 0) + 1;
  }
  return {
    planHash: plan.planHash,
    status: plan.status,
    summary: plan.summary,
    actionsByCode,
    blockedActionIds: plan.actions
      .filter((action) => action.state === "blocked")
      .slice(0, SHOWN_BLOCKED_ACTION_IDS)
      .map((action) => action.id),
    hint: "Pass includeMigrationPlan: true for the full plan with its actions (kb_apply_plan needs it).",
  };
}

/** Characters a check's structured result may take, scoped or not. */
export const SCOPED_CHECK_BUDGET_CHARS = 24_000;
const GROUP_ENTITY_IDS_SHOWN = 20;

const sizeOf = (value: unknown) => JSON.stringify(value).length;

/**
 * `content` cut to `budget` characters for a check without a rule
 * selection, scoped to sourceFiles or not: advisory quality diagnostics are
 * reduced to counts first, then a migration plan nobody asked for in full
 * to its summary, then the blocking findings past the budget are listed by
 * rule and entity id instead of in full. A blocking finding's rule is never
 * dropped, `count` keeps the full number, and impact diagnostics (what the
 * check says about the edit) are kept.
 */
export function fitScopedCheckToBudget(
  content: CheckStructuredContent,
  budget: number = SCOPED_CHECK_BUDGET_CHARS,
  scoped = true,
  keepPlan = false,
): CheckStructuredContent {
  if (sizeOf(content) <= budget) return content;
  const truncation = {
    budgetChars: budget,
    hint: `The result was cut to its size budget. ${scoped ? "Narrow sourceFiles, or pass" : "Pass"} rules to list those rules' findings in full; kibi check --format json lists every finding.`,
  };
  let fitted: CheckStructuredContent = {
    ...content,
    truncated: true,
    truncation,
  };
  // Telemetry acceptance is a state of the whole project, read from an
  // unfiltered check, not a per-entity finding: it is always kept.
  const quality = content.qualityDiagnostics ?? [];
  const telemetry = quality.filter(
    (diagnostic) => diagnostic.category === "telemetry",
  );
  const advisory = quality.filter(
    (diagnostic) => diagnostic.category !== "telemetry",
  );
  if (advisory.length > 0) {
    const byId: Record<string, number> = {};
    for (const diagnostic of advisory) {
      byId[diagnostic.id] = (byId[diagnostic.id] ?? 0) + 1;
    }
    fitted = {
      ...fitted,
      qualityDiagnostics: [
        {
          id: "check_quality_truncated",
          severity: "info",
          blocking: false,
          category: "integrity",
          message: `${advisory.length} advisory ${advisory.length === 1 ? "finding is" : "findings are"} not listed, to keep this result within its size budget.`,
          suggestion:
            "Run kibi check --format json to list every advisory finding.",
          evidence: { omitted: advisory.length, byId },
        },
        ...telemetry,
      ],
    };
  }
  if (sizeOf(fitted) <= budget) return fitted;
  if (fitted.migrationPlan !== undefined && !keepPlan) {
    const { migrationPlan, ...withoutPlan } = fitted;
    fitted = {
      ...withoutPlan,
      migrationPlanSummary: summarizeMigrationPlan(migrationPlan),
    };
    if (sizeOf(fitted) <= budget) return fitted;
  }

  // List blocking findings in full while they fit, then by rule and id.
  const base = sizeOf({ ...fitted, violations: [], diagnostics: [] });
  const detailed: Violation[] = [];
  const detailedDiagnostics: unknown[] = [];
  let used = base;
  let index = 0;
  for (; index < content.violations.length; index += 1) {
    const violation = content.violations[index] as Violation;
    const diagnostic = content.diagnostics[index];
    // A finding without a diagnostic costs only its own text.
    const cost =
      sizeOf(violation) +
      (diagnostic === undefined ? 0 : sizeOf(diagnostic)) +
      2;
    // Leave a fifth of the budget for the grouped rest.
    if (used + cost > budget * 0.8) break;
    detailed.push(violation);
    if (diagnostic !== undefined) detailedDiagnostics.push(diagnostic);
    used += cost;
  }
  const groups = new Map<
    string,
    { count: number; first: Violation; ids: string[] }
  >();
  for (const violation of content.violations.slice(index)) {
    const group = groups.get(violation.rule) ?? {
      count: 0,
      first: violation,
      ids: [],
    };
    group.count += 1;
    if (
      group.ids.length < GROUP_ENTITY_IDS_SHOWN &&
      violation.entityId &&
      !group.ids.includes(violation.entityId)
    ) {
      group.ids.push(violation.entityId);
    }
    groups.set(violation.rule, group);
  }
  return {
    ...fitted,
    violations: detailed,
    diagnostics: detailedDiagnostics as CheckDiagnostic[],
    violationGroups: [...groups.entries()].map(([rule, group]) => ({
      rule,
      count: group.count,
      entityIds: group.ids,
      description: group.first.description,
      ...(group.first.suggestion !== undefined
        ? { suggestion: group.first.suggestion }
        : {}),
    })),
  };
}

function formatDiagnostics(diagnostics: readonly CheckDiagnostic[]) {
  return diagnostics.map((d) => ({
    category: d.category,
    severity: d.severity,
    message: d.message,
    ...(d.file !== undefined ? { file: d.file } : {}),
    ...(d.suggestion !== undefined ? { suggestion: d.suggestion } : {}),
  }));
}

type ImpactDiagnostic = ChangedFileImpactResult["impactDiagnostics"][number];

function impactDiagnosticFiles(diagnostic: ImpactDiagnostic): string {
  return diagnostic.files.length > 0
    ? diagnostic.files.join(", ")
    : "unknown-source";
}

/**
 * Impact diagnostics in order, with those that share a check, a severity, the
 * same files and the same suggestion gathered under the first of them.
 */
function groupImpactDiagnostics(
  diagnostics: readonly ImpactDiagnostic[],
): ImpactDiagnostic[][] {
  const groups = new Map<string, ImpactDiagnostic[]>();
  for (const diagnostic of diagnostics) {
    const key = JSON.stringify([
      diagnostic.id,
      diagnostic.severity,
      diagnostic.files,
      diagnostic.suggestion,
    ]);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [diagnostic]);
    else group.push(diagnostic);
  }
  return [...groups.values()];
}

/**
 * The impact diagnostics as text. A suggestion that many diagnostics share
 * (one changed file often yields the same review advice for every changed
 * symbol) is written once, above the messages it applies to.
 */
export function formatImpactText(
  impactResult: ChangedFileImpactResult,
): string {
  if (impactResult.impactDiagnostics.length === 0) {
    return "No impact diagnostics found";
  }

  const details = groupImpactDiagnostics(impactResult.impactDiagnostics).map(
    (group) => {
      const first = group[0] as ImpactDiagnostic;
      const head = `- ${first.id} | ${first.severity} | ${impactDiagnosticFiles(first)} | `;
      if (group.length === 1) {
        return `${head}${first.message} Suggestion: ${first.suggestion}`;
      }
      const messages = group.map((diagnostic) => `  - ${diagnostic.message}`);
      return `${head}${group.length} diagnostics. Suggestion for each: ${first.suggestion}\n${messages.join("\n")}`;
    },
  );
  return `${impactResult.impactDiagnostics.length} impact diagnostics found\n${details.join("\n")}`;
}

/**
 * The quality diagnostics a result lists under `qualityDiagnostics`: those the
 * impact analysis did not already report. An impact diagnostic is in
 * `impactDiagnostics`, and repeating it would double a scoped check's result.
 */
export function qualityDiagnosticsBesideImpact<T extends object>(
  qualityDiagnostics: readonly T[],
  impactResult: ChangedFileImpactResult | undefined,
): readonly T[] {
  if (impactResult === undefined) return qualityDiagnostics;
  const reported = new Set<object>(impactResult.impactDiagnostics);
  return qualityDiagnostics.filter((diagnostic) => !reported.has(diagnostic));
}

function formatOptionalList(
  label: string,
  values: readonly string[] | undefined,
) {
  if (values === undefined || values.length === 0) {
    return [];
  }
  return [`${label}: ${values.join(", ")}`];
}

export function formatQualityDiagnosticsText(
  diagnostics: readonly QualityDiagnostic[],
): string {
  if (diagnostics.length === 0) {
    return "No quality diagnostics found";
  }

  const details = diagnostics.map((diagnostic) => {
    const parts = [
      diagnostic.id,
      diagnostic.severity,
      diagnostic.category,
      diagnostic.message,
    ];
    const metadata = [
      `Blocking: ${diagnostic.blocking ? "yes" : "no"}`,
      ...formatOptionalList("Files", diagnostic.files),
      ...formatOptionalList("Docs", diagnostic.docs),
      ...(diagnostic.entityId !== undefined
        ? [`Entity: ${diagnostic.entityId}`]
        : []),
      ...(diagnostic.source !== undefined
        ? [`Source: ${diagnostic.source}`]
        : []),
      `Suggestion: ${diagnostic.suggestion}`,
    ];
    return `- ${parts.join(" | ")}\n  ${metadata.join("\n  ")}`;
  });

  return `${diagnostics.length} quality diagnostic${diagnostics.length === 1 ? "" : "s"} found\n${details.join("\n")}`;
}

/**
 * Requirements the changed code implements whose statements the check did not
 * compare with the code (`requirement_statement_unverified`).
 */
function unverifiedRequirementIds(input: {
  readonly impactResult: ChangedFileImpactResult | undefined;
}): string[] {
  const ids = input.impactResult?.impactDiagnostics
    .filter(
      (diagnostic) => diagnostic.id === "requirement_statement_unverified",
    )
    .map((diagnostic) => diagnostic.entityId)
    .filter((id): id is string => id !== undefined);
  return ids ?? [];
}

/** What a scoped check left out of, or grouped in, its violation list. */
export type ViolationListing = Readonly<{
  violationGroups?: readonly ViolationGroup[];
  omittedViolations?: OmittedViolations;
}>;

function ruleCounts(byRule: Readonly<Record<string, number>>): string {
  const rules = Object.entries(byRule);
  const shown = rules.slice(0, 5).map(([rule, count]) => `${rule} ×${count}`);
  if (rules.length > 5) shown.push(`${rules.length - 5} more rules`);
  return shown.join(", ");
}

export function formatViolationText(
  violations: readonly Violation[],
  unverifiedRequirements: readonly string[] = [],
  listing: ViolationListing = {},
): string {
  const grouped = (listing.violationGroups ?? []).reduce(
    (sum, group) => sum + group.count,
    0,
  );
  const omitted = listing.omittedViolations?.total ?? 0;
  const total = violations.length + grouped + omitted;
  if (total === 0) {
    return unverifiedRequirements.length === 0
      ? "No violations found"
      : `No structural violations found. The changed code implements ${unverifiedRequirements.join(", ")}; Kibi did not compare the code with ${unverifiedRequirements.length === 1 ? "its statement" : "their statements"} (quoted under requirement_statement_unverified below), so confirm the change still does what each says, and ask the person before keeping a change that contradicts one`;
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
  for (const group of listing.violationGroups ?? []) {
    details.push(
      `- ${group.rule} ×${group.count} | ${group.entityIds.join(", ")}${group.count > group.entityIds.length ? ", …" : ""} | ${group.description}${group.suggestion ? ` | Suggestion: ${group.suggestion}` : ""}`,
    );
  }
  if (listing.omittedViolations !== undefined) {
    details.push(
      `- ${omitted} blocking ${omitted === 1 ? "violation" : "violations"} elsewhere in the KB ${omitted === 1 ? "is" : "are"} not listed here (${ruleCounts(listing.omittedViolations.byRule)}); ${omitted === 1 ? "it does" : "they do"} not concern the checked files, but ${omitted === 1 ? "it still blocks" : "they still block"} kb_check without sourceFiles.`,
    );
  }

  return `${total} violations found\n${details.join("\n")}`;
}

export function buildStructuredContent(input: {
  violations: readonly Violation[];
  evaluated: CheckEvaluated;
  diagnostics: readonly CheckDiagnostic[];
  qualityDiagnostics?: readonly QualityDiagnostic[];
  impactResult: ChangedFileImpactResult | undefined;
  migrationPlan?: MigrationPlan;
  /** Blocking findings a scoped check left out. */
  omittedViolations?: OmittedViolations;
  /** Summarize the plan instead of listing its actions. */
  summarizePlan?: boolean;
}): CheckStructuredContent {
  const qualityDiagnostics = qualityDiagnosticsBesideImpact(
    input.qualityDiagnostics ?? [],
    input.impactResult,
  );
  const plan = input.migrationPlan;
  return {
    violations: [...input.violations],
    count: input.violations.length + (input.omittedViolations?.total ?? 0),
    evaluated: {
      ruleCount: input.evaluated.ruleCount,
      ...(input.evaluated.rules !== undefined
        ? { rules: [...input.evaluated.rules] }
        : {}),
      ...(input.evaluated.domainContradictions !== undefined
        ? { domainContradictions: input.evaluated.domainContradictions }
        : {}),
    },
    diagnostics: formatDiagnostics(input.diagnostics),
    ...(qualityDiagnostics.length > 0
      ? { qualityDiagnostics: [...qualityDiagnostics] }
      : {}),
    ...(input.impactResult
      ? {
          impactDiagnostics: input.impactResult.impactDiagnostics,
          sourceFiles: input.impactResult.sourceFiles,
          extractedSymbols: input.impactResult.extractedSymbols,
          linkedEntities: input.impactResult.linkedEntities,
          nextActions: input.impactResult.nextActions,
        }
      : {}),
    ...(plan === undefined
      ? {}
      : input.summarizePlan === true
        ? { migrationPlanSummary: summarizeMigrationPlan(plan) }
        : { migrationPlan: plan }),
    ...(input.omittedViolations !== undefined
      ? { omittedViolations: input.omittedViolations }
      : {}),
  };
}

/** One line saying what the check evaluated, so a clean result is readable. */
export function formatEvaluatedText(evaluated: CheckEvaluated): string {
  const rules =
    evaluated.ruleCount === 0
      ? "Evaluated no rules"
      : `Evaluated ${evaluated.ruleCount} rule${evaluated.ruleCount === 1 ? "" : "s"}`;
  const pairs = evaluated.domainContradictions;
  if (pairs === undefined) return `${rules}.`;
  return `${rules}; domain-contradictions compared ${pairs.factPairsExamined} fact pair${pairs.factPairsExamined === 1 ? "" : "s"}${pairs.factPairsExamined === 0 ? " (no two current requirements constrain the same subject or predicate case)" : ""}.`;
}

export function buildSummary(
  input: {
    readonly violations: readonly Violation[];
    readonly evaluated?: CheckEvaluated;
    readonly impactResult: ChangedFileImpactResult | undefined;
    readonly qualityDiagnostics: readonly QualityDiagnostic[];
    readonly truncation?: Readonly<{ hint: string }>;
  } & ViolationListing,
): string {
  const sections = [
    formatViolationText(
      input.violations,
      unverifiedRequirementIds(input),
      input,
    ),
  ];
  if (input.evaluated !== undefined)
    sections.push(formatEvaluatedText(input.evaluated));
  if (input.impactResult !== undefined) {
    sections.push(formatImpactText(input.impactResult));
  }
  const qualityDiagnostics = qualityDiagnosticsBesideImpact(
    input.qualityDiagnostics,
    input.impactResult,
  );
  if (qualityDiagnostics.length > 0) {
    sections.push(formatQualityDiagnosticsText(qualityDiagnostics));
  }
  if (input.truncation !== undefined) sections.push(input.truncation.hint);
  return sections.join("\n");
}
