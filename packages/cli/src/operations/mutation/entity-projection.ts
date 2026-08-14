import { RELATIONSHIP_TYPES } from "./relationships.js";

/**
 * Convert a query-shaped entity back into writable properties.
 *
 * Discovery queries project relationship predicates alongside entity
 * properties for convenience. Feeding that projection back to an upsert would
 * accidentally treat those predicates as authored properties and can create
 * duplicate or stale edges. Keep this helper shared by every query-to-write
 * path so relationship history remains owned by the relationship input lane.
 */
export function projectEntityProperties(
  entity: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const relationshipKeys = new Set<string>(RELATIONSHIP_TYPES);
  return Object.fromEntries(
    Object.entries(entity).filter(
      ([key]) => key !== "id" && key !== "type" && !relationshipKeys.has(key),
    ),
  );
}
