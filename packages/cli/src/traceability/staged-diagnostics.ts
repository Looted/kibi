import type { QualityDiagnostic } from "../public/impact/types.js";
import {
  KIBI_STAGED_IMPACT_EVIDENCE_DOC,
  KIBI_SYMBOLS_MANIFEST_PATH,
  KIBI_SYMBOL_COORDINATES_PATH,
  type KibiImpactEvidence,
  getBehaviorSourcePaths,
  getMissingBehaviorSourcePaths,
  hasOverrideRationale,
} from "./evidence-model.js";

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
}

function formatFileList(paths: string[]): string {
  return paths.join(", ");
}

function createMissingEvidenceDiagnostic(
  paths: string[],
): KibiImpactDiagnostic {
  return {
    id: "kibi_impact_evidence_missing",
    severity: "error",
    blocking: true,
    category: "fact",
    files: [...paths],
    docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
    message: `Behavior-changing staged files are missing staged Kibi impact evidence (see ${KIBI_STAGED_IMPACT_EVIDENCE_DOC}): ${formatFileList(paths)}`,
    suggestion: `Query Kibi via MCP before deciding. MCP writes update KB state but do not stage tracked evidence; also stage requirement/scenario/test/fact/symbol markdown, authored ${KIBI_SYMBOLS_MANIFEST_PATH} metadata, or refreshed ${KIBI_SYMBOL_COORDINATES_PATH}. Re-run kibi check --staged after staging tracked evidence.`,
  };
}

function createSymbolsManifestStaleDiagnostic(
  paths: string[],
): KibiImpactDiagnostic {
  return {
    id: "symbols_manifest_stale",
    severity: "error",
    blocking: true,
    category: "symbol",
    files: [KIBI_SYMBOL_COORDINATES_PATH, ...paths],
    docs: [KIBI_STAGED_IMPACT_EVIDENCE_DOC],
    message: `${KIBI_SYMBOL_COORDINATES_PATH} is stale or missing for staged source files: ${formatFileList(paths)}`,
    suggestion: `Run kibi sync --refresh-symbol-coordinates && git add ${KIBI_SYMBOL_COORDINATES_PATH} ${KIBI_SYMBOLS_MANIFEST_PATH}, then re-run kibi check --staged.`,
  };
}

function createMissingOverrideRationaleDiagnostic(
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
): KibiImpactDiagnostic[] {
  const diagnostics: KibiImpactDiagnostic[] = [];

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
    diagnostics.push(
      createSymbolsManifestStaleDiagnostic(
        [...evidence.symbolsManifest.sourcePaths].sort(),
      ),
    );
  }

  const missingBehaviorPaths = getMissingBehaviorSourcePaths(evidence);
  if (missingBehaviorPaths.length > 0) {
    diagnostics.push(createMissingEvidenceDiagnostic(missingBehaviorPaths));
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
