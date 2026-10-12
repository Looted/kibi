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

// implements REQ-kibi-operation-interface-parity
export function symbolCoverageWarning(entityId: string): readonly string[] {
  return [
    `Production symbol ${entityId} has implements but no covered_by: kb_check will report symbol-coverage. Add covered_by: TEST-<area>-<behavior> to a test that validates the requirement's scenario (or verified_by(req,test) when the requirement has no scenario).`,
  ];
}

// implements REQ-kibi-operation-interface-parity
/**
 * A production symbol (one that implements a requirement) needs a covered_by
 * edge to a test that covers that requirement, or kb_check reports
 * symbol-coverage once it is written. Warn before and after the write so the
 * agent learns it from the upsert, not from the next check. An executable
 * test symbol (executable_for) is not production code, and a symbol that
 * already has a stored covered_by edge is left for kb_check to judge.
 */
export async function symbolCoverageWarnings(
  prolog: PrologPort,
  relationships: readonly RelationshipInput[],
  entityType: string,
  entityId: string,
): Promise<readonly string[]> {
  if (entityType !== "symbol") return [];
  const own = relationships.filter(
    (relationship) =>
      relationship.from === undefined || relationship.from === entityId,
  );
  const has = (type: string) =>
    own.some((relationship) => relationship.type === type);
  if (!has("implements") || has("covered_by") || has("executable_for"))
    return [];
  const id = escapeAtom(entityId);
  const stored = await prolog.query(
    `once((kb_relationship(covered_by, '${id}', _) ; kb_relationship(executable_for, '${id}', _)))`,
  );
  return stored.success ? [] : symbolCoverageWarning(entityId);
}
