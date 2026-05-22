import {
  KIBI_ENTITY_SCHEMA_DOC,
  KIBI_SYMBOL_COORDINATES_PATH,
  KIBI_SYMBOLS_MANIFEST_PATH,
  getBehaviorSourcePaths,
  getMissingBehaviorSourcePaths,
  hasOverrideRationale,
  type KibiImpactEvidence,
} from "./evidence-model.js";

export type KibiImpactDiagnosticId =
  | "kibi_impact_evidence_missing"
  | "symbols_manifest_stale"
  | "kibi_impact_override_missing_rationale";

export interface KibiImpactDiagnostic {
  /** Stable staged-enforcement diagnostic identifier. */
  id: KibiImpactDiagnosticId;
  /** Hard-gate severity for staged enforcement. */
  severity: "error";
  /** Repo-relative files that explain why the diagnostic fired. */
  files: string[];
  /** User-facing docs that explain the policy. */
  docs: string[];
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
    files: [...paths],
    docs: [KIBI_ENTITY_SCHEMA_DOC],
    message: `Behavior-changing staged files are missing Kibi impact evidence (see ${KIBI_ENTITY_SCHEMA_DOC}): ${formatFileList(paths)}`,
    suggestion:
      `Query Kibi via MCP before deciding, then stage requirement/scenario/test/fact/symbol markdown evidence, staged authored ${KIBI_SYMBOLS_MANIFEST_PATH} metadata, or refreshed ${KIBI_SYMBOL_COORDINATES_PATH}. Re-run kibi check --staged after staging the evidence.`,
  };
}

function createSymbolsManifestStaleDiagnostic(
  paths: string[],
): KibiImpactDiagnostic {
  return {
    id: "symbols_manifest_stale",
    severity: "error",
    files: [KIBI_SYMBOL_COORDINATES_PATH, ...paths],
    docs: [KIBI_ENTITY_SCHEMA_DOC],
    message: `${KIBI_SYMBOL_COORDINATES_PATH} is stale or missing for staged source files: ${formatFileList(paths)}`,
    suggestion:
      `Run kibi sync --refresh-symbol-coordinates && git add ${KIBI_SYMBOL_COORDINATES_PATH} ${KIBI_SYMBOLS_MANIFEST_PATH}, then re-run kibi check --staged.`,
  };
}

function createMissingOverrideRationaleDiagnostic(
  evidence: KibiImpactEvidence,
): KibiImpactDiagnostic {
  if (evidence.mode.kind !== "no_impact_override") {
    throw new Error("Override rationale diagnostic requires a no-impact override");
  }

  const paths = [...evidence.mode.override.sourcePaths].sort();

  return {
    id: "kibi_impact_override_missing_rationale",
    severity: "error",
    files: [evidence.mode.override.path, ...paths],
    docs: [KIBI_ENTITY_SCHEMA_DOC],
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
