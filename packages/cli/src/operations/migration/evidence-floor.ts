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

import path from "node:path";
import { effectiveFirmness } from "../../decision-firmness.js";
import {
  type AuthoredEntity,
  authoredSupersededIds,
  isCurrentAuthoredEntity,
  readAuthoredEntity,
} from "../../public/operations/entity-context.js";
import { readAllShards } from "../../relationships/shards.js";
import type {
  BodyContextPlan,
  BodyContextTarget,
} from "./entity-body-context.js";
import {
  listLaneMarkdownFiles,
  readText,
  withTopLevelField,
  writeFileAtomically,
} from "./kb-sources.js";

/** Schema 11: record the floor of firm requirements that had no proof path. */
// implements REQ-kibi-evidence-floors, REQ-cli-schema-migration
export const EVIDENCE_FLOOR_PIN_CODE = "evidence_floor_pin";

/** The floor the migration records: a person stands behind the requirement. */
const PINNED_FLOOR = "asserted";

function linkTargets(entity: AuthoredEntity, type: string): string[] {
  const links = entity.data.links;
  if (!Array.isArray(links)) return [];
  return links.flatMap((link) =>
    link !== null &&
    typeof link === "object" &&
    (link as { type?: unknown }).type === type &&
    typeof (link as { target?: unknown }).target === "string"
      ? [(link as { target: string }).target]
      : [],
  );
}

function authoredEntities(
  workspaceRoot: string,
  lane: "requirements" | "scenarios" | "tests",
): { entity: AuthoredEntity; content: string; relativePath: string }[] {
  const entities = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, [lane])) {
    const content = readText(file.absolutePath);
    if (content === null) continue;
    const entity = readAuthoredEntity(content, file.relativePath);
    if (entity !== null)
      entities.push({ entity, content, relativePath: file.relativePath });
  }
  return entities;
}

/**
 * Requirement ids with a proof path: a linked scenario (specified_by) that a
 * test carrying a proof_contract verifies (scenario verified_by test, or test
 * validates scenario), read from authored links and relationship shards.
 */
function requirementsWithProofPath(
  workspaceRoot: string,
  requirements: readonly AuthoredEntity[],
): Set<string> {
  const scenariosOf = new Map<string, Set<string>>();
  const testsOf = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, from: string, to: string) => {
    const set = map.get(from) ?? new Set<string>();
    set.add(to);
    map.set(from, set);
  };
  for (const requirement of requirements)
    for (const target of linkTargets(requirement, "specified_by"))
      add(scenariosOf, requirement.id, target);
  for (const { entity } of authoredEntities(workspaceRoot, "scenarios"))
    for (const target of linkTargets(entity, "verified_by"))
      add(testsOf, entity.id, target);
  const contracted = new Set<string>();
  for (const { entity } of authoredEntities(workspaceRoot, "tests")) {
    if (entity.data.proof_contract !== undefined) contracted.add(entity.id);
    for (const target of linkTargets(entity, "validates"))
      add(testsOf, target, entity.id);
  }
  try {
    for (const relationship of readAllShards(path.join(workspaceRoot, ".kb"))) {
      if (relationship.type === "specified_by")
        add(scenariosOf, relationship.from, relationship.to);
      else if (relationship.type === "verified_by")
        add(testsOf, relationship.from, relationship.to);
      else if (relationship.type === "validates")
        add(testsOf, relationship.to, relationship.from);
    }
  } catch {
    // Malformed shards fail sync with their own diagnostic.
  }
  const withPath = new Set<string>();
  for (const [requirementId, scenarios] of scenariosOf)
    for (const scenarioId of scenarios)
      for (const testId of testsOf.get(scenarioId) ?? [])
        if (contracted.has(testId)) withPath.add(requirementId);
  return withPath;
}

/**
 * Current firm requirements without required_evidence and without any proof
 * path. From schema 11 a firm requirement needs tested evidence, which these
 * cannot reach, so the migration records their floor as asserted in the
 * requirement itself, where a reviewer sees it and can raise it later.
 * Requirements with a proof path keep the tested floor. Read-only.
 */
// implements REQ-kibi-evidence-floors, REQ-cli-schema-migration
export function planEvidenceFloorPins(workspaceRoot: string): BodyContextPlan {
  const files = authoredEntities(workspaceRoot, "requirements").filter(
    ({ entity }) => entity.type === "req",
  );
  const requirements = files.map(({ entity }) => entity);
  const superseded = authoredSupersededIds(workspaceRoot, requirements);
  const withPath = requirementsWithProofPath(workspaceRoot, requirements);
  const targets: BodyContextTarget[] = [];
  const skipped: { id: string; path: string; reason: string }[] = [];
  for (const { entity, content, relativePath } of files) {
    if (
      entity.data.required_evidence !== undefined ||
      entity.data.proof_exempt === true ||
      !isCurrentAuthoredEntity(entity, superseded) ||
      effectiveFirmness(
        entity.type,
        entity.data.firmness,
        entity.data.origin,
      ) !== "firm" ||
      withPath.has(entity.id)
    )
      continue;
    const after = withTopLevelField(content, "required_evidence", PINNED_FLOOR);
    if (after === null) {
      skipped.push({
        id: entity.id,
        path: relativePath,
        reason: "required_evidence could not be edited safely",
      });
      continue;
    }
    targets.push({
      id: entity.id,
      type: entity.type,
      path: relativePath,
      before: content,
      after,
    });
  }
  return { targets, skipped };
}

/** Write the planned floors; returns how many requirements were rewritten. */
// implements REQ-kibi-evidence-floors, REQ-cli-schema-migration
export function applyEvidenceFloorPins(workspaceRoot: string): number {
  const plan = planEvidenceFloorPins(workspaceRoot);
  for (const target of plan.targets)
    writeFileAtomically(path.join(workspaceRoot, target.path), target.after);
  return plan.targets.length;
}
