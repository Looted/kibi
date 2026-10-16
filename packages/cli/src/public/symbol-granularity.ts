import {
  ALLOWED_GRANULARITY_REASONS,
  ALLOWED_GRANULARITY_REASONS_PROSE,
  COARSE_GRANULARITY_REASONS,
  COARSE_GRANULARITY_REASONS_PARENTHESIZED,
  COARSE_GRANULARITY_REASONS_PROSE,
  type CoarseGranularityReason,
  type GranularityReason,
  ROLE_INFERENCE,
  SYMBOL_ROLES,
  type SymbolRole,
  TRACEABILITY_RELATIONSHIP_TYPES,
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

/**
 * The behavioral candidates' names, the place a coarse link should move to:
 * functions, methods and accessors first, then properties (behavioral in the
 * schema, but usually plain fields), each group sorted by name.
 */
// implements REQ-kibi-symbol-link-guidance
export function getBehavioralSymbolNames(
  candidates: GranularSymbolCandidate[],
): string[] {
  const behavioral = candidates.filter(isBehavioralSymbol);
  const names = (properties: boolean) =>
    behavioral
      .filter((candidate) => (candidate.kind === "property") === properties)
      .map((candidate) => candidate.name)
      .sort();
  return [...new Set([...names(false), ...names(true)])];
}

/**
 * The candidates that are narrower than a manifest symbol: members of it
 * (`Title.member`), or, when the source declares no symbol named like it,
 * every other declaration in the file.
 */
// implements REQ-symbol-behavioral-anchors, REQ-cli-schema-migration
export function narrowerSymbols<T extends { name: string }>(
  manifestSymbolName: string,
  candidates: readonly T[],
  sourceSymbols: readonly { name: string }[],
): T[] {
  const declared = sourceSymbols.some(
    (symbol) => symbol.name === manifestSymbolName,
  );
  return candidates.filter(
    (candidate) =>
      candidate.name !== manifestSymbolName &&
      (candidate.name.startsWith(`${manifestSymbolName}.`) || !declared),
  );
}

/**
 * The behavioral symbols that make a traceability link on
 * `manifestSymbolName` coarse: the staged granularity gate blocks such a
 * link unless it carries a granularity_reason, and `kibi migrate` marks
 * exactly these links legacy-link. Empty when the link is narrow enough.
 */
// implements REQ-symbol-behavioral-anchors, REQ-cli-schema-migration
export function coarseLinkBehavioralNames(
  manifestSymbolName: string,
  sourceSymbols: readonly GranularSymbolCandidate[],
): string[] {
  return getBehavioralSymbolNames(
    narrowerSymbols(manifestSymbolName, sourceSymbols, sourceSymbols),
  );
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
