import type { StrictWriteSet } from "../../utils/strict-modeling.js";

export function confidenceBand(value: number): string {
  return value >= 0.9 ? "high" : value >= 0.8 ? "medium" : "low";
}

export function slug(value: string, limit = 80): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, limit);
}

export function upsert<
  T extends { readonly type?: unknown; readonly id?: unknown },
>(
  entity: T,
  relationships: readonly {
    readonly type: string;
    readonly from: string;
    readonly to: string;
  }[] = [],
): Readonly<Record<string, unknown>> {
  const { type, id, ...properties } = entity;
  return {
    type: String(type ?? ""),
    id: String(id ?? ""),
    properties,
    relationships,
  };
}

export function strictPlan(
  writeSet: StrictWriteSet,
): readonly Readonly<Record<string, unknown>>[] {
  if (!writeSet.isStrict) {
    return [
      {
        type: "fact",
        id: writeSet.observationFact.id,
        properties: writeSet.observationFact.properties,
        relationships: [],
      },
    ];
  }
  return [
    {
      type: "fact",
      id: writeSet.subjectFact.id,
      properties: writeSet.subjectFact.properties,
      relationships: [],
    },
    {
      type: "fact",
      id: writeSet.propertyFact.id,
      properties: writeSet.propertyFact.properties,
      relationships: [],
    },
    {
      type: "req",
      id: writeSet.req.id,
      properties: writeSet.req.properties,
      relationships: writeSet.relationships.map(({ type, from, to }) => ({
        type,
        from,
        to,
      })),
    },
  ];
}
