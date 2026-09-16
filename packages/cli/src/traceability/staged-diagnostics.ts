import * as path from "node:path";
import type { QualityDiagnostic } from "../public/impact/types.js";
import {
  KIBI_STAGED_IMPACT_EVIDENCE_DOC,
  KIBI_SYMBOLS_MANIFEST_PATH,
  type KibiImpactEvidence,
  type KibiImpactSymbolsManifestFileDetail,
  getBehaviorSourcePaths,
  getMissingBehaviorSourcePaths,
  hasOverrideRationale,
} from "./evidence-model.js";

function deriveCoordinatesPath(symbolsManifestPath: string): string {
  return path
    .join(path.dirname(symbolsManifestPath), "symbol-coordinates.yaml")
    .replace(/\\/g, "/");
}

export type KibiImpactDiagnosticId =
  | "kibi_impact_evidence_missing"
  | "symbols_manifest_stale"
  | "symbol_granularity_violation"
  | "symbol_semantic_review_needed"
  | "multi_requirement_symbol_review"
  | "duplicate_symbol_coordinate_review"
  | "component_mixed_purpose_review"
  | "broad_requirement_review"
  | "requirement_status_review"
  | "strict_fact_modeling_review"
  | "logical_coverage_review"
  | "kibi_impact_override_missing_rationale";

export interface KibiImpactDiagnostic extends QualityDiagnostic {
  /** Stable staged-enforcement diagnostic identifier. */
  id: KibiImpactDiagnosticId;
  category: QualityDiagnostic["category"];
  /** Repo-relative files that explain why the diagnostic fired. */
  files: readonly string[];
  /** User-facing docs that explain the policy. */
  docs: readonly string[];
  /** Exact CLI-facing diagnostic message. */
  message: string;
  /** Deterministic remediation guidance. */
  suggestion: string;
  /**
   * Cause-level lines (per file: extraction vs evidence symbol counts, the
   * uncovered symbol names) rendered between the Files and Docs lines so the
   * error names what to fix instead of only the verdict.
   */
  details?: readonly string[];
}

function formatFileList(paths: string[]): string {
  return paths.join(", ");
}

/** Max symbol names rendered per detail line before "+N more". */
const MAX_DETAIL_NAMES = 6;

function formatNameList(names: readonly string[]): string {
  const shown = names.slice(0, MAX_DETAIL_NAMES);
  const overflow = names.length - shown.length;
  const rendered = shown.join(", ");
  return overflow > 0 ? `${rendered} … and ${overflow} more` : rendered;
}

function symbolsManifestFileDetails(
  evidence: KibiImpactEvidence,
  paths: readonly string[],
): KibiImpactSymbolsManifestFileDetail[] {
  const pathSet = new Set(paths);
  return (evidence.symbolsManifest.fileDetails ?? []).filter((detail) =>
    pathSet.has(detail.path),
  );
}

function manifestDetailLines(
  detail: KibiImpactSymbolsManifestFileDetail,
  symbolsManifestPath: string,
): string[] {
  const lines = [
    `${detail.path} — extraction finds ${detail.expectedCount} symbol(s), evidence covers ${detail.coveredCount}.`,
  ];
  if (detail.missing.length > 0) {
    const names = detail.missing.map(
      (entry) => `${entry.title} (line ${entry.line})`,
    );
    lines.push(`    Not in ${symbolsManifestPath}: ${formatNameList(names)}`);
  }
  if (detail.extra.length > 0) {
    lines.push(
      `    Evidence without a matching symbol: ${formatNameList(detail.extra)}`,
    );
  }
  return lines;
}

function createMissingEvidenceDiagnostic(
  paths: string[],
  symbolsManifestPath: string,
  coordinatesPath: string,
  fileDetails: readonly KibiImpactSymbolsManifestFileDetail[] = [],
): KibiImpactDiagnostic {
  const uncoveredByPath = new Map(
    fileDetails
      .filter((detail) => detail.missing.length > 0)
      .map((detail) => [detail.path, detail]),
  );
  const details = paths.flatMap((filePath) => {
    const detail = uncoveredByPath.get(filePath);
    if (!detail) return [];
    return [
      `${filePath} — symbols without authored evidence: ${formatNameList(
        detail.missing.map((entry) => entry.title),
      )}`,
    ];
  });
  const suggestionSuffix =
    details.length > 0
      ? ` For symbol-level evidence, author ${symbolsManifestPath} entries (kibi upsert) for the listed uncovered symbols.`
      : "";
  return {
    id: "kibi_impact_evidence_missing",
    severity: "error",
    blocking: true,
    category: "fact",
    files: [...paths],
    docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
    message: `Behavior-changing staged files are missing staged Kibi impact evidence (see ${KIBI_STAGED_IMPACT_EVIDENCE_DOC}): ${formatFileList(paths)}`,
    suggestion: `Query Kibi via MCP before deciding. MCP writes update KB state but do not stage tracked evidence; also stage requirement/scenario/test/fact/symbol markdown, authored ${symbolsManifestPath} metadata, or refreshed ${coordinatesPath}. Re-run kibi check --staged after staging tracked evidence.${suggestionSuffix}`,
    ...(details.length > 0
      ? {
          details,
          evidence: {
            uncoveredSymbols: fileDetails.map((detail) => ({
              path: detail.path,
              titles: detail.missing.map((entry) => entry.title),
            })),
          },
        }
      : {}),
  };
}

function createSymbolsManifestStaleDiagnostic(
  paths: string[],
  symbolsManifestPath: string,
  coordinatesPath: string,
  fileDetails: readonly KibiImpactSymbolsManifestFileDetail[] = [],
): KibiImpactDiagnostic {
  const hasMissingSymbols = fileDetails.some(
    (detail) => detail.missing.length > 0,
  );
  const details = fileDetails.flatMap((detail) =>
    manifestDetailLines(detail, symbolsManifestPath),
  );
  const refreshSteps = `kibi sync --refresh-symbol-coordinates && git add ${coordinatesPath} ${symbolsManifestPath}, then re-run kibi check --staged.`;
  const suggestion = hasMissingSymbols
    ? `Author ${symbolsManifestPath} entries for the uncovered symbols (kibi upsert, with implements/covered_by links), then run ${refreshSteps}`
    : `Run ${refreshSteps}`;
  return {
    id: "symbols_manifest_stale",
    severity: "error",
    blocking: true,
    category: "symbol",
    files: [coordinatesPath, ...paths],
    docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
    message: `${coordinatesPath} is stale or missing for staged source files: ${formatFileList(paths)}`,
    suggestion,
    ...(fileDetails.length > 0
      ? {
          details,
          evidence: {
            symbolsManifest: fileDetails.map((detail) => ({
              path: detail.path,
              expectedCount: detail.expectedCount,
              coveredCount: detail.coveredCount,
              missing: detail.missing,
              extra: detail.extra,
            })),
          },
        }
      : {}),
  };
}

export function createMissingOverrideRationaleDiagnostic(
  evidence: KibiImpactEvidence,
): KibiImpactDiagnostic {
  if (evidence.mode.kind !== "no_impact_override") {
    throw new Error(
      "Override rationale diagnostic requires a no-impact override",
    );
  }

  const paths = [...evidence.mode.override.sourcePaths].sort();

  return {
    id: "kibi_impact_override_missing_rationale",
    severity: "error",
    blocking: true,
    category: "fact",
    files: [evidence.mode.override.path, ...paths],
    docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
    message: `Kibi-Impact: none override is missing rationale for staged source files: ${formatFileList(paths)}`,
    suggestion:
      "Add a non-empty rationale in the same staged override record, keep overrides limited to false positives or non-behavioral source edits, and re-run kibi check --staged.",
  };
}

/**
 * Collects deterministic staged diagnostics for Kibi impact enforcement.
 *
 * This function assumes upstream staged analysis has already classified source
 * files and manifest freshness. It only evaluates explicit predicates recorded in
 * `KibiImpactEvidence`.
 */
export function collectStagedKibiDiagnostics(
  evidence: KibiImpactEvidence,
  symbolsManifestPath: string = KIBI_SYMBOLS_MANIFEST_PATH,
): KibiImpactDiagnostic[] {
  const diagnostics: KibiImpactDiagnostic[] = [];
  const coordinatesPath =
    evidence.symbolsManifest.path || deriveCoordinatesPath(symbolsManifestPath);

  if (
    evidence.mode.kind === "no_impact_override" &&
    !hasOverrideRationale(evidence)
  ) {
    diagnostics.push(createMissingOverrideRationaleDiagnostic(evidence));
  }

  if (
    (evidence.symbolsManifest.state === "stale" ||
      evidence.symbolsManifest.state === "missing") &&
    evidence.symbolsManifest.sourcePaths.length > 0
  ) {
    const stalePaths = [...evidence.symbolsManifest.sourcePaths].sort();
    diagnostics.push(
      createSymbolsManifestStaleDiagnostic(
        stalePaths,
        symbolsManifestPath,
        coordinatesPath,
        symbolsManifestFileDetails(evidence, stalePaths),
      ),
    );
  }

  const missingBehaviorPaths = getMissingBehaviorSourcePaths(evidence);
  if (missingBehaviorPaths.length > 0) {
    diagnostics.push(
      createMissingEvidenceDiagnostic(
        missingBehaviorPaths,
        symbolsManifestPath,
        coordinatesPath,
        symbolsManifestFileDetails(evidence, missingBehaviorPaths),
      ),
    );
  }

  if (
    evidence.mode.kind === "no_impact_override" &&
    evidence.mode.override.sourcePaths.length === 0 &&
    getBehaviorSourcePaths(evidence).length === 0
  ) {
    return diagnostics;
  }

  return diagnostics;
}
