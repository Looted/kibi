import type { Violation } from "kibi-cli/public/check-types";
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
import type { ChangedFileImpactResult } from "kibi-cli/public/impact-diagnostics";
import type { QualityDiagnostic } from "kibi-cli/public/impact-diagnostics";
import type { CheckResult, Diagnostic } from "./check-types.js";

function formatDiagnosticsForMcp(diagnostics: readonly Diagnostic[]) {
  return diagnostics.map((d) => ({
    category: d.category,
    severity: d.severity,
    message: d.message,
    ...(d.file !== undefined ? { file: d.file } : {}),
    ...(d.suggestion !== undefined ? { suggestion: d.suggestion } : {}),
  }));
}

export function formatImpactText(
  impactResult: ChangedFileImpactResult,
): string {
  if (impactResult.impactDiagnostics.length === 0) {
    return "No impact diagnostics found";
  }

  const details = impactResult.impactDiagnostics.map((diagnostic) => {
    const files =
      diagnostic.files.length > 0
        ? diagnostic.files.join(", ")
        : "unknown-source";
    return `- ${diagnostic.id} | ${diagnostic.severity} | ${files} | ${diagnostic.message} Suggestion: ${diagnostic.suggestion}`;
  });
  return `${impactResult.impactDiagnostics.length} impact diagnostics found\n${details.join("\n")}`;
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

export function buildStructuredContent(input: {
  violations: readonly Violation[];
  diagnostics: readonly Diagnostic[];
  qualityDiagnostics?: readonly QualityDiagnostic[];
  impactResult: ChangedFileImpactResult | undefined;
}): NonNullable<CheckResult["structuredContent"]> {
  const qualityDiagnostics = input.qualityDiagnostics ?? [];
  return {
    violations: [...input.violations],
    count: input.violations.length,
    diagnostics: formatDiagnosticsForMcp(input.diagnostics),
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
  };
}

export function formatViolationText(violations: readonly Violation[]): string {
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
