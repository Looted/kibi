import { escapeAtom } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import type { RelationshipInput } from "./types.js";

export function scenarioCoverageWarning(entityId: string): readonly string[] {
  return [
    `Scenario-backed coverage: verified_by(${entityId},test) is valid but will not satisfy symbol-coverage because ${entityId} has specified_by a scenario. Use verified_by(scenario,test) or validates(test,scenario) instead.`,
  ];
}

// implements REQ-kibi-operation-interface-parity
export async function scenarioCoverageWarnings(
  prolog: PrologPort,
  relationships: readonly RelationshipInput[],
  entityType: string,
  entityId: string,
): Promise<readonly string[]> {
  if (entityType !== "req") return [];
  for (const relationship of relationships) {
    if (relationship.type !== "verified_by") continue;
    const result = await prolog.query(
      `once(kb_relationship(specified_by, '${escapeAtom(entityId)}', ScenarioId))`,
    );
    if (result.success) return scenarioCoverageWarning(entityId);
  }
  return [];
}
