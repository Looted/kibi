import type { StrictWriteSet } from "../../public/check-types.js";

function toRelationshipPlanRows(
  relationships: StrictWriteSet["relationships"],
): Array<Record<string, unknown>> {
  return relationships.map((relationship) => ({
    type: relationship.type,
    from: relationship.from,
    to: relationship.to,
  }));
}

// implements REQ-002
export function strictWriteSetToApplyPlan(
  writeSet: StrictWriteSet,
): Array<Record<string, unknown>> {
  if (!writeSet.isStrict) {
    return [
      {
        type: writeSet.observationFact.type,
        id: writeSet.observationFact.id,
        properties: writeSet.observationFact.properties,
        relationships: [],
      },
    ];
  }
  return [
    {
      type: writeSet.subjectFact.type,
      id: writeSet.subjectFact.id,
      properties: writeSet.subjectFact.properties,
      relationships: [],
    },
    {
      type: writeSet.propertyFact.type,
      id: writeSet.propertyFact.id,
      properties: writeSet.propertyFact.properties,
      relationships: [],
    },
    {
      type: writeSet.req.type,
      id: writeSet.req.id,
      properties: writeSet.req.properties,
      relationships: toRelationshipPlanRows(writeSet.relationships),
    },
  ];
}

// implements REQ-002
export function writeSetPrimaryEntityId(writeSet: StrictWriteSet): string {
  return writeSet.isStrict ? writeSet.req.id : writeSet.observationFact.id;
}
