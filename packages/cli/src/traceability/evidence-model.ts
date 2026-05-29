/**
 * Stable contract for staged Kibi impact evidence.
 *
 * This module is intentionally explicit and non-heuristic. Upstream staged-file
 * analysis decides whether a source edit is behavior-changing; this contract only
 * records that decision and the staged KB artifacts that cover it.
 */

/** User-facing KB schema documentation cited by staged diagnostics. */
export const KIBI_ENTITY_SCHEMA_DOC = "docs/entity-schema.md";

/** Canonical symbols manifest path used by staged traceability enforcement. */
export const KIBI_SYMBOLS_MANIFEST_PATH = "documentation/symbols.yaml";

/** Canonical symbol coordinates artifact used by staged traceability enforcement. */
export const KIBI_SYMBOL_COORDINATES_PATH =
  "documentation/symbol-coordinates.yaml";

/** Explicit declaration string for audited no-impact overrides. */
export const KIBI_NO_IMPACT_DECLARATION = "Kibi-Impact: none";

/** Canonical Kibi entity types that can provide staged evidence. */
export type KibiEntityType =
  | "req"
  | "scenario"
  | "test"
  | "adr"
  | "flag"
  | "event"
  | "symbol"
  | "fact";

/**
 * Explicit source-edit classification from upstream staged analysis.
 *
 * - `behavior_source_edit`: a supported staged source change already classified
 *   as behavior-changing or traceability-relevant by the caller.
 * - `non_behavior_source_edit`: a supported staged source change that remains in
 *   scope for auditing but does not require KB changes.
 */
export type SourceChangeKind =
  | "behavior_source_edit"
  | "non_behavior_source_edit";

/** One staged source file participating in Kibi impact evaluation. */
export interface KibiImpactSourceChange {
  /** Repo-relative staged source path. */
  path: string;
  /** Explicit upstream classification; this module does not infer it. */
  kind: SourceChangeKind;
}

/**
 * Staged KB markdown evidence linked to one or more staged source files.
 *
 * Evidence is explicit only when the staged artifact names concrete KB entities
 * and lists the staged source paths it is intended to cover.
 */
export interface KibiImpactKbArtifact {
  /** Artifact category. Kept narrow to avoid heuristic interpretation. */
  kind: "entity_markdown" | "symbols_manifest";
  /** Repo-relative staged KB artifact path. */
  path: string;
  /** Canonical Kibi entity types present in the staged artifact. */
  entityTypes: KibiEntityType[];
  /** Concrete KB entities updated by the staged artifact. */
  entityIds: string[];
  /** Repo-relative source paths explicitly covered by this artifact. */
  sourcePaths: string[];
}

/**
 * Deterministic symbol coordinates artifact state for the staged change-set.
 *
 * - `not_required`: symbol extraction output did not change for the listed
 *   staged source paths.
 * - `fresh`: a staged coordinate refresh covers the listed source paths.
 * - `stale`: coordinate artifact content is reverted, outdated, or otherwise does not match
 *   the staged symbol extraction result.
 * - `missing`: a refresh is required but no staged coordinate artifact exists.
 */
export interface KibiImpactSymbolsManifest {
  /** Canonical repo-relative symbol coordinate artifact path. */
  path: string;
  /** Explicit manifest freshness state. */
  state: "not_required" | "fresh" | "stale" | "missing";
  /** Repo-relative staged source paths whose symbol output this state describes. */
  sourcePaths: string[];
}

/** Supported audited reasons for a no-impact override. */
export type KibiNoImpactReason =
  | "false_positive"
  | "non_behavioral_source_edit";

/**
 * Explicit no-impact override record.
 *
 * Overrides are only valid for non-behavioral edits or classifier false
 * positives. They never satisfy real behavior-changing source edits.
 */
export interface KibiNoImpactOverride {
  /** Required literal declaration. */
  declaration: typeof KIBI_NO_IMPACT_DECLARATION;
  /** Repo-relative staged record path carrying the override. */
  path: string;
  /** Repo-relative source paths covered by the override record. */
  sourcePaths: string[];
  /** Audited reason for allowing the override. */
  reason: KibiNoImpactReason;
  /** Human-readable justification stored with the override record. */
  rationale: string;
}

/** Explicit evidence state: staged KB artifacts are present. */
export interface KibiImpactKbChangesMode {
  kind: "kb_changes";
  /** Staged KB markdown artifacts linked to staged source changes. */
  kbArtifacts: KibiImpactKbArtifact[];
}

/** Explicit evidence state: a staged no-impact override is being used. */
export interface KibiImpactNoImpactOverrideMode {
  kind: "no_impact_override";
  /** Staged override record for false positives or non-behavioral edits. */
  override: KibiNoImpactOverride;
}

/** Explicit evidence state: no staged KB evidence or override exists. */
export interface KibiImpactMissingMode {
  kind: "missing";
}

/** Discriminated union describing how the staged change-set is justified. */
export type KibiImpactMode =
  | KibiImpactKbChangesMode
  | KibiImpactNoImpactOverrideMode
  | KibiImpactMissingMode;

/**
 * Full evidence snapshot for staged Kibi impact enforcement.
 *
 * `sourceChanges` is always required so diagnostics can cite exact staged source
 * files. `mode` captures whether those files are backed by KB changes, by an
 * audited no-impact override, or by nothing. `symbolsManifest` records whether a
 * staged manifest refresh is part of that evidence.
 */
export interface KibiImpactEvidence {
  /** All staged source files in scope for Kibi impact enforcement. */
  sourceChanges: KibiImpactSourceChange[];
  /** Deterministic staged symbols manifest state for the same change-set. */
  symbolsManifest: KibiImpactSymbolsManifest;
  /** Explicit evidence mode for the staged change-set. */
  mode: KibiImpactMode;
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

/** Returns staged behavior-changing source paths only. */
export function getBehaviorSourcePaths(evidence: KibiImpactEvidence): string[] {
  return evidence.sourceChanges
    .filter((change) => change.kind === "behavior_source_edit")
    .map((change) => change.path)
    .sort();
}

/** Returns staged source paths covered by explicit KB artifacts. */
export function getKbCoveredSourcePaths(
  evidence: KibiImpactEvidence,
): string[] {
  if (evidence.mode.kind !== "kb_changes") {
    return [];
  }

  return uniqueSorted(
    evidence.mode.kbArtifacts.flatMap((artifact) => artifact.sourcePaths),
  );
}

/** Returns staged source paths covered by a fresh symbol coordinate refresh. */
export function getFreshSymbolsManifestSourcePaths(
  evidence: KibiImpactEvidence,
): string[] {
  if (evidence.symbolsManifest.state !== "fresh") {
    return [];
  }

  return [...evidence.symbolsManifest.sourcePaths].sort();
}

/**
 * Returns all staged evidence file paths that a later CLI integration can cite
 * in diagnostics or logs.
 */
export function getKbEvidencePaths(evidence: KibiImpactEvidence): string[] {
  const paths: string[] = [];

  if (evidence.mode.kind === "kb_changes") {
    paths.push(...evidence.mode.kbArtifacts.map((artifact) => artifact.path));
  }

  if (evidence.symbolsManifest.state === "fresh") {
    paths.push(evidence.symbolsManifest.path);
  }

  return uniqueSorted(paths);
}

/** True when a staged no-impact override includes a non-empty rationale. */
export function hasOverrideRationale(evidence: KibiImpactEvidence): boolean {
  return (
    evidence.mode.kind === "no_impact_override" &&
    evidence.mode.override.rationale.trim().length > 0
  );
}

/**
 * Returns behavior-changing staged source files that still lack valid Kibi
 * impact evidence.
 */
export function getMissingBehaviorSourcePaths(
  evidence: KibiImpactEvidence,
): string[] {
  const behaviorPaths = getBehaviorSourcePaths(evidence);
  const coveredPaths = new Set<string>([
    ...getKbCoveredSourcePaths(evidence),
    ...getFreshSymbolsManifestSourcePaths(evidence),
  ]);

  return behaviorPaths.filter((path) => !coveredPaths.has(path));
}
