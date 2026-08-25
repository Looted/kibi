export const SYMBOL_ROLES = [
  "behavioral",
  "structural",
  "type-shape",
  "config",
  "module",
  "unknown",
] as const;

export type SymbolRole = (typeof SYMBOL_ROLES)[number];

export const TRACEABILITY_RELATIONSHIP_TYPES = [
  "implements",
  "covered_by",
  "executable_for",
] as const;

export type TraceabilityRelationshipType =
  (typeof TRACEABILITY_RELATIONSHIP_TYPES)[number];

export const ALLOWED_GRANULARITY_REASONS = [
  "config-artifact",
  "module-level-behavior",
  "extractor-miss",
  "legacy-link",
  "test-suite",
] as const;

export type GranularityReason = (typeof ALLOWED_GRANULARITY_REASONS)[number];

/**
 * Granularity reasons that document coarse file/module-level coverage for which
 * generated per-symbol coordinates are not expected. These anchors legitimately
 * carry no coordinate artifact entries. `legacy-link` is intentionally excluded:
 * it is a canonical reason but still coordinates a real extractable symbol.
 */
export const COARSE_GRANULARITY_REASONS = [
  "config-artifact",
  "module-level-behavior",
  "extractor-miss",
  "test-suite",
] as const;

export type CoarseGranularityReason =
  (typeof COARSE_GRANULARITY_REASONS)[number];

export type SymbolKind =
  | "function"
  | "class"
  | "method"
  | "property"
  | "accessor"
  | "interface"
  | "type"
  | "variable"
  | "enum"
  | "unknown";

export type SourceSymbolKind = SymbolKind;

export interface GranularSymbolCandidate {
  name: string;
  kind?: SymbolKind;
  role?: SymbolRole;
}

const traceabilityRelationshipTypeSet: ReadonlySet<string> = new Set(
  TRACEABILITY_RELATIONSHIP_TYPES,
);
const allowedGranularityReasonSet: ReadonlySet<string> = new Set(
  ALLOWED_GRANULARITY_REASONS,
);
const coarseGranularityReasonSet: ReadonlySet<string> = new Set(
  COARSE_GRANULARITY_REASONS,
);

export function inferSymbolRole(kind: SymbolKind): SymbolRole {
  switch (kind) {
    case "function":
    case "class":
    case "method":
    case "property":
    case "accessor":
      return "behavioral";
    case "interface":
    case "type":
    case "enum":
      return "type-shape";
    case "variable":
    case "unknown":
      return "unknown";
  }
}

export const inferSymbolRoleFromKind = inferSymbolRole;

export function isSymbolRole(value: unknown): value is SymbolRole {
  return (
    typeof value === "string" && SYMBOL_ROLES.some((role) => role === value)
  );
}

export function isTraceabilityRelationshipType(
  value: unknown,
): value is TraceabilityRelationshipType {
  return (
    typeof value === "string" && traceabilityRelationshipTypeSet.has(value)
  );
}

export function isAllowedGranularityReason(
  value: unknown,
): value is GranularityReason {
  return typeof value === "string" && allowedGranularityReasonSet.has(value);
}

export function isCoarseGranularityReason(
  value: unknown,
): value is CoarseGranularityReason {
  return typeof value === "string" && coarseGranularityReasonSet.has(value);
}

export function getSymbolRole(candidate: GranularSymbolCandidate): SymbolRole {
  if (candidate.role) return candidate.role;
  if (candidate.kind) return inferSymbolRole(candidate.kind);
  return "unknown";
}

export function isBehavioralSymbol(
  candidate: GranularSymbolCandidate,
): boolean {
  return getSymbolRole(candidate) === "behavioral";
}

export function getBehavioralSymbolNames(
  candidates: GranularSymbolCandidate[],
): string[] {
  return [
    ...new Set(
      candidates.filter(isBehavioralSymbol).map((candidate) => candidate.name),
    ),
  ].sort();
}

export function getNonBehavioralSymbolNames(
  candidates: GranularSymbolCandidate[],
): string[] {
  return [
    ...new Set(
      candidates
        .filter((candidate) => !isBehavioralSymbol(candidate))
        .map((candidate) => candidate.name),
    ),
  ].sort();
}
