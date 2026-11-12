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
import type { MigrationPlan } from "./migration-plan.js";

export interface CheckDiagnostic {
  readonly category: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly file?: string;
  readonly suggestion?: string;
}

/**
 * What a check run evaluated, so "no violations" can be told apart from
 * "nothing evaluated": the rules that ran, and for `domain-contradictions`
 * how many pairs of requirement facts it compared.
 */
export interface CheckEvaluated {
  readonly rules: readonly string[];
  readonly domainContradictions?: Readonly<{ factPairsExamined: number }>;
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

export function formatViolationText(
  violations: readonly Violation[],
  unverifiedRequirements: readonly string[] = [],
): string {
  if (violations.length === 0) {
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

  return `${violations.length} violations found\n${details.join("\n")}`;
}

export function buildStructuredContent(input: {
  violations: readonly Violation[];
  evaluated: CheckEvaluated;
  diagnostics: readonly CheckDiagnostic[];
  qualityDiagnostics?: readonly QualityDiagnostic[];
  impactResult: ChangedFileImpactResult | undefined;
  migrationPlan?: MigrationPlan;
}): CheckStructuredContent {
  const qualityDiagnostics = qualityDiagnosticsBesideImpact(
    input.qualityDiagnostics ?? [],
    input.impactResult,
  );
  return {
    violations: [...input.violations],
    count: input.violations.length,
    evaluated: {
      rules: [...input.evaluated.rules],
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
    ...(input.migrationPlan !== undefined
      ? { migrationPlan: input.migrationPlan }
      : {}),
  };
}

/** One line saying what the check evaluated, so a clean result is readable. */
export function formatEvaluatedText(evaluated: CheckEvaluated): string {
  const rules =
    evaluated.rules.length === 0
      ? "Evaluated no rules"
      : `Evaluated ${evaluated.rules.length} rule${evaluated.rules.length === 1 ? "" : "s"}`;
  const pairs = evaluated.domainContradictions;
  if (pairs === undefined) return `${rules}.`;
  return `${rules}; domain-contradictions compared ${pairs.factPairsExamined} fact pair${pairs.factPairsExamined === 1 ? "" : "s"}${pairs.factPairsExamined === 0 ? " (no two current requirements constrain the same subject or predicate case)" : ""}.`;
}

export function buildSummary(input: {
  readonly violations: readonly Violation[];
  readonly evaluated?: CheckEvaluated;
  readonly impactResult: ChangedFileImpactResult | undefined;
  readonly qualityDiagnostics: readonly QualityDiagnostic[];
}): string {
  const sections = [
    formatViolationText(input.violations, unverifiedRequirementIds(input)),
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
  return sections.join("\n");
}
