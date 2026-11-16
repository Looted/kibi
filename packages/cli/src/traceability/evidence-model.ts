/**
 * Stable contract for staged Kibi impact evidence.
 *
 * This module is intentionally explicit and non-heuristic. Upstream staged-file
 * analysis decides whether a source edit is behavior-changing; this contract only
 * records that decision and the staged KB artifacts that cover it.
 */

export const KIBI_STAGED_IMPACT_EVIDENCE_DOC =
  "docs/cli-reference.md#staged-impact-evidence";

export const KIBI_ENTITY_SCHEMA_DOC = "docs/entity-schema.md";

/** Canonical symbols manifest path used by staged traceability enforcement. */
export const KIBI_SYMBOLS_MANIFEST_PATH = ".kb/symbols.yaml";

/** Canonical symbol coordinates artifact used by staged traceability enforcement. */
export const KIBI_SYMBOL_COORDINATES_PATH = ".kb/symbol-coordinates.yaml";

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
 * Per-file explanation of why symbol evidence does not match extraction.
 *
 * Titles come from comparing the extractor's view of the staged source content
 * against the staged manifest+coordinates records for the same path, so the
 * diagnostic can name the exact symbols a commit's evidence is missing.
 */
export interface KibiImpactSymbolsManifestFileDetail {
  /** Repo-relative staged source path the diff describes. */
  path: string;
  /** Symbol count extraction finds in the staged source content. */
  expectedCount: number;
  /**
   * Extracted symbols that have a matching staged symbols manifest entry
   * (`expectedCount - missing.length`); evidence-only entries in `extra` are
   * not counted.
   */
  coveredCount: number;
  /**
   * Extracted symbols with no evidence entry that the commit is judged on
   * (title + definition line): declarations it adds or changes, and
   * declarations whose record it removes.
   */
  missing: Array<{ title: string; line: number }>;
  /**
   * Evidence entries naming no extracted declaration that the commit is
   * judged on: records of declarations it removes or renames, and records
   * it adds or changes.
   */
  extra: string[];
  /** Declarations the commit adds or changes in the file. */
  changedCount?: number;
  /**
   * Gaps the commit did not cause: unchanged declarations with no record and
   * untouched records with no declaration. Reported, never blocking.
   */
  inherited?: {
    missing: Array<{ title: string; line: number }>;
    extra: string[];
  };
}

/**
 * Whether the staged symbol manifest covers the declarations the commit adds
 * or changes in the staged behavior files. Coordinates are derived from
 * source, so only titles count.
 *
 * - `not_required`: the listed files declare nothing and own no records.
 * - `fresh`: every declaration the commit adds or changes in the listed files
 *   has a manifest record and no record the commit is judged on names a gone
 *   declaration; this is evidence for their behavior edits.
 * - `stale`: some listed file has such a gap. `coveredSourcePaths` still
 *   names the files without one.
 */
export interface KibiImpactSymbolsManifest {
  /** Canonical repo-relative symbol manifest path. */
  path: string;
  /** Explicit manifest coverage state. */
  state: "not_required" | "fresh" | "stale";
  /** Repo-relative staged source paths whose symbol output this state describes. */
  sourcePaths: string[];
  /**
   * Per-file extraction-vs-evidence diffs for the paths this state describes.
   * Present only when extraction output changed; lets diagnostics name the
   * uncovered symbols instead of reporting a bare "stale" verdict.
   */
  fileDetails?: readonly KibiImpactSymbolsManifestFileDetail[];
  /**
   * Staged source paths whose judged declarations are all covered, whatever
   * the overall state: per-file evidence for their behavior edits.
   */
  coveredSourcePaths?: string[];
}

/** Explicit evidence state: staged KB artifacts are present. */
export interface KibiImpactKbChangesMode {
  kind: "kb_changes";
  /** Staged KB markdown artifacts linked to staged source changes. */
  kbArtifacts: KibiImpactKbArtifact[];
}

/** Explicit evidence state: no staged KB evidence exists. */
export interface KibiImpactMissingMode {
  kind: "missing";
}

/** Discriminated union describing how the staged change-set is justified. */
export type KibiImpactMode = KibiImpactKbChangesMode | KibiImpactMissingMode;

/**
 * Full evidence snapshot for staged Kibi impact enforcement.
 *
 * `sourceChanges` is always required so diagnostics can cite exact staged source
 * files. `mode` captures whether those files are backed by KB changes or by
 * nothing. `symbolsManifest` records whether a
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

/** Returns staged source paths whose declarations the symbol manifest covers. */
export function getFreshSymbolsManifestSourcePaths(
  evidence: KibiImpactEvidence,
): string[] {
  const { symbolsManifest } = evidence;
  if (symbolsManifest.coveredSourcePaths !== undefined) {
    return [...symbolsManifest.coveredSourcePaths].sort();
  }
  if (symbolsManifest.state !== "fresh") {
    return [];
  }

  return [...symbolsManifest.sourcePaths].sort();
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
