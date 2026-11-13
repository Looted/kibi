/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { readKbManifest } from "../../utils/kb-manifest.js";
import type { Violation } from "../../utils/rule-registry.js";
import {
  authoredSupersededIds,
  isCurrentAuthoredEntity,
  listContextAuthoredEntities,
} from "./entity-context.js";
import { runOperationJsonQuery } from "./prolog-json.js";
import type { OperationContext } from "./runtime-types.js";

/**
 * A current must requirement states its positive behaviour: a scenario that
 * specifies it, expects success, and assumes a fact on one of its subjects.
 * scenario-feasibility can then refuse that behaviour when another current
 * requirement on the subject forbids it.
 */
export const POSITIVE_SCENARIO_RULE = "must-positive-scenario";

/**
 * The schema from which a must requirement owes a positive scenario. Its
 * upgrade records every current must requirement, so only must requirements
 * written after it are judged.
 */
export const POSITIVE_SCENARIO_SCHEMA_VERSION = 17;

export type PositiveScenarioGapReason =
  | "no_subjects"
  | "no_success_scenario"
  | "no_subject_assumption";

/** A current must requirement without a positive scenario. */
export type PositiveScenarioGap = Readonly<{
  id: string;
  reason: PositiveScenarioGapReason;
  /** The subjects the requirement is about. */
  subjects: readonly string[];
  /** Active success scenarios that specify it. */
  successScenarios: readonly string[];
}>;

export type PositiveScenarioPayload = Readonly<{
  rows?: readonly PositiveScenarioGap[];
  evaluated?: number;
}>;

function listed(ids: readonly string[]): string {
  const shown = ids.slice(0, 8).join(", ");
  return ids.length > 8 ? `${shown} (+${ids.length - 8} more)` : shown;
}

function describeGap(gap: PositiveScenarioGap): string {
  switch (gap.reason) {
    case "no_subjects":
      return `Must requirement ${gap.id} is about no subject, so no scenario can state the behaviour it promises in terms other requirements share`;
    case "no_success_scenario":
      return `Must requirement ${gap.id} has no scenario that expects success, so nothing states the behaviour it promises on ${listed(gap.subjects)}`;
    default:
      return `Must requirement ${gap.id} has success scenarios (${listed(gap.successScenarios)}), but none assumes a fact on its subjects (${listed(gap.subjects)}), so its positive behaviour cannot be compared with other requirements`;
  }
}

function suggestGap(gap: PositiveScenarioGap): string {
  const scenario = `a scenario with expects: success that specifies ${gap.id} (specified_by) and assumes the facts its behaviour relies on`;
  switch (gap.reason) {
    case "no_subjects":
      return `Name the subjects ${gap.id} is about (link a subject fact through constrains, or list subjects on its unmodeled claims), then add ${scenario}. kb_query with factKind subject and subjectKey shows what else governs each subject.`;
    case "no_success_scenario":
      return `Add ${scenario}, as facts on ${listed(gap.subjects)} or a narrower subject. scenario-feasibility then refuses the scenario when a current requirement forbids that behaviour.`;
    default:
      return `Link at least one of those scenarios, or a new one, through assumes to a fact on ${listed(gap.subjects)} or a narrower subject that states what the behaviour relies on. scenario-feasibility then refuses the scenario when a current requirement forbids that behaviour.`;
  }
}

/**
 * One finding per gap whose requirement the schema 17 upgrade did not
 * record. Recorded requirements stay exempt: the upgrade never invents the
 * behaviour a requirement promises.
 */
export function positiveScenarioViolations(
  gaps: readonly PositiveScenarioGap[],
  acknowledged: ReadonlySet<string>,
): Violation[] {
  return gaps
    .filter((gap) => !acknowledged.has(gap.id))
    .map((gap) => ({
      rule: POSITIVE_SCENARIO_RULE,
      entityId: gap.id,
      description: describeGap(gap),
      suggestion: suggestGap(gap),
      evidence: {
        reason: gap.reason,
        subjects: gap.subjects,
        successScenarios: gap.successScenarios,
      },
    }));
}

/** Every current must requirement without a positive scenario, from the store. */
export async function readPositiveScenarioGaps(
  context: Pick<OperationContext, "prolog" | "ensureProlog">,
): Promise<PositiveScenarioPayload> {
  const prolog = context.prolog ?? (await context.ensureProlog?.());
  if (prolog === undefined) return {};
  return runOperationJsonQuery<PositiveScenarioPayload>(
    prolog,
    "domain_subjects.pl",
    "domain_subjects:positive_scenario_gaps_json(JsonString)",
    "Positive scenario evaluation",
  );
}

/** Evaluate must-positive-scenario against the attached store. */
export async function collectPositiveScenarioViolations(
  context: OperationContext,
  rules: ReadonlySet<string>,
): Promise<Violation[]> {
  if (!rules.has(POSITIVE_SCENARIO_RULE) || context.prolog === undefined)
    return [];
  const manifest = readKbManifest(context.workspaceRoot);
  if (
    manifest === null ||
    manifest.schemaVersion < POSITIVE_SCENARIO_SCHEMA_VERSION
  )
    return [];
  const payload = await readPositiveScenarioGaps(context);
  return positiveScenarioViolations(
    payload.rows ?? [],
    new Set(manifest.positiveScenarioAcknowledged ?? []),
  );
}

/** Whether an authored priority reads as must, as the coverage rule reads it. */
export function isMustPriority(priority: unknown): boolean {
  return typeof priority === "string" && priority.trim().endsWith("must");
}

/**
 * The current must requirements the schema 17 upgrade records, read from
 * authored sources so the migration needs no synced store. Each keeps its
 * exemption from must-positive-scenario; a must requirement written later
 * owes a positive scenario.
 */
export function planPositiveScenarioAcknowledgement(
  workspaceRoot: string,
): string[] {
  const entities = listContextAuthoredEntities(workspaceRoot);
  const superseded = authoredSupersededIds(workspaceRoot, entities);
  return entities
    .filter(
      (entity) =>
        entity.type === "req" &&
        isMustPriority(entity.data.priority) &&
        isCurrentAuthoredEntity(entity, superseded),
    )
    .map((entity) => entity.id)
    .sort();
}
