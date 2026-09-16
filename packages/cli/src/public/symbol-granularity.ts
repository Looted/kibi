import {
  ALLOWED_GRANULARITY_REASONS,
  ALLOWED_GRANULARITY_REASONS_PROSE,
  COARSE_GRANULARITY_REASONS,
  COARSE_GRANULARITY_REASONS_PARENTHESIZED,
  COARSE_GRANULARITY_REASONS_PROSE,
  ROLE_INFERENCE,
  SYMBOL_ROLES,
  TRACEABILITY_RELATIONSHIP_TYPES,
  type CoarseGranularityReason,
  type GranularityReason,
  type SymbolRole,
  type TraceabilityRelationshipType,
} from "./symbol-granularity.generated.js";

// The vocabulary is GENERATED from packages/core/schema/symbol-classification.json
// (scripts/generate-symbol-classification.mjs) so the TS constants, the manifest
// gate copy, the sync failure suggestions, and the Prolog facts share one source.
export {
  ALLOWED_GRANULARITY_REASONS,
  ALLOWED_GRANULARITY_REASONS_PROSE,
  COARSE_GRANULARITY_REASONS,
  COARSE_GRANULARITY_REASONS_PARENTHESIZED,
  COARSE_GRANULARITY_REASONS_PROSE,
  ROLE_INFERENCE,
  SYMBOL_ROLES,
  TRACEABILITY_RELATIONSHIP_TYPES,
};
export type {
  CoarseGranularityReason,
  GranularityReason,
  SymbolRole,
  TraceabilityRelationshipType,
} from "./symbol-granularity.generated.js";

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
  return ROLE_INFERENCE[kind] ?? "unknown";
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
