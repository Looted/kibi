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

import type { KibiLevel } from "kibi-agent-core/kibi-level";
import {
  listLaneMarkdownFiles,
  readText,
} from "../../operations/migration/kb-sources.js";
import type { Violation } from "../../utils/rule-registry.js";
import { authoredSupersedes } from "./decision-firmness.js";
import {
  type AuthoredEntity,
  isCurrentAuthoredEntity,
  readAuthoredEntity,
} from "./entity-context.js";

/**
 * At level remember a requirement may still name a tested or proved floor:
 * the level does not check it, so the finding says so (non-blocking).
 */
export const REQUIRED_EVIDENCE_ABOVE_LEVEL_RULE =
  "required-evidence-above-level";

/** The floors only level test checks. */
export const VERIFIED_EVIDENCE_LEVELS: readonly string[] = ["tested", "proved"];

function authoredRequirements(workspaceRoot: string): AuthoredEntity[] {
  const requirements: AuthoredEntity[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, ["requirements"])) {
    const content = readText(file.absolutePath);
    const entity =
      content === null ? null : readAuthoredEntity(content, file.relativePath);
    if (entity?.type === "req") requirements.push(entity);
  }
  return requirements;
}

/**
 * The current requirements whose required_evidence asks for a floor the
 * project's Kibi level does not check, one finding each, naming the level.
 */
export function collectRequiredEvidenceAboveLevelViolations(
  rules: ReadonlySet<string>,
  workspaceRoot: string,
  level: KibiLevel,
): Violation[] {
  if (level !== "remember" || !rules.has(REQUIRED_EVIDENCE_ABOVE_LEVEL_RULE))
    return [];
  const requirements = authoredRequirements(workspaceRoot);
  const superseded = new Set(
    [...authoredSupersedes(workspaceRoot, requirements).values()].flatMap(
      (targets) => [...targets],
    ),
  );
  return requirements
    .filter(
      (requirement) =>
        isCurrentAuthoredEntity(requirement, superseded) &&
        VERIFIED_EVIDENCE_LEVELS.includes(
          String(requirement.data.required_evidence),
        ),
    )
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((requirement) => ({
      rule: REQUIRED_EVIDENCE_ABOVE_LEVEL_RULE,
      entityId: requirement.id,
      description: `${requirement.id} has required_evidence ${String(requirement.data.required_evidence)}, but the project's Kibi level is remember, which does not check scenarios, tests or proofs, so this floor is not enforced.`,
      suggestion:
        "Ask the person whether the project should move to Kibi level test (kibi.level in package.json, or level in .kb/setup.json), which enforces the floor. Do not change the level or the requirement's required_evidence yourself.",
      source: requirement.path,
    }));
}
