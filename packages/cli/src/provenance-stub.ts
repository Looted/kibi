/**
 * A bootstrap provider fact that records only where an entry came from.
 *
 * Deterministic providers (source modules, repository metadata, layout
 * roots) find entries whose source states no claim. Kibi keeps their
 * provenance so a later schema version or a reviewer can trace the origin,
 * but such a fact is not knowledge: it is written as `fact_kind: meta` with
 * this tag, ranked after every other search match, kept out of the answer
 * layer's notes and not counted by gap and coverage reports. It stays
 * readable through `kb_query` (filter by this tag).
 */
// implements REQ-bootstrap-provenance-stubs
export const PROVENANCE_STUB_TAG = "bootstrap:provenance-stub";

function tagList(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Whether an entity row (projected or complete) is a provenance stub. */
// implements REQ-bootstrap-provenance-stubs
export function isProvenanceStub(
  entity: Readonly<Record<string, unknown>> | null | undefined,
): boolean {
  if (!entity) return false;
  const type = String(entity.type ?? "");
  if (type !== "" && type !== "fact") return false;
  return tagList(entity.tags).includes(PROVENANCE_STUB_TAG);
}
