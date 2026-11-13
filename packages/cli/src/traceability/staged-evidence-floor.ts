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

import { EngineClient } from "../engine.js";
import type { Violation } from "../public/check-types.js";
import {
  isCurrentAuthoredEntity,
  readAuthoredEntity,
} from "../public/operations/entity-context.js";
import {
  EVIDENCE_FLOOR_SCHEMA_VERSION,
  REQUIREMENT_PROOF_RULES,
  collectEvidenceFloorViolations,
} from "../public/operations/evidence-floor.js";
import { nodeFilesystem, nodeGit } from "../public/operations/node-ports.js";

/**
 * The front matter that sets a requirement's evidence floor or decides
 * whether agent-requirement-unapproved-implemented applies to it.
 */
const FLOOR_FIELDS = [
  "status",
  "priority",
  "firmness",
  "required_evidence",
  "origin",
] as const;

/**
 * The current requirements the commit adds, or whose floor fields it
 * changes. Only these are judged at commit time: a requirement whose floor
 * did not move keeps whatever full `kibi check` says about it.
 */
export function floorChangedRequirementIds(
  stagedFiles: readonly Readonly<{ path: string; content?: string }>[],
  readBase: (path: string) => string | null,
): string[] {
  const ids: string[] = [];
  for (const file of stagedFiles) {
    if (file.content === undefined) continue;
    const staged = readAuthoredEntity(file.content, file.path);
    if (staged === null || staged.type !== "req") continue;
    if (!isCurrentAuthoredEntity(staged, new Set())) continue;
    const baseContent = readBase(file.path);
    const base =
      baseContent === null ? null : readAuthoredEntity(baseContent, file.path);
    if (
      base === null ||
      FLOOR_FIELDS.some(
        (field) =>
          JSON.stringify(staged.data[field]) !==
          JSON.stringify(base.data[field]),
      )
    )
      ids.push(staged.id);
  }
  return ids;
}

/**
 * evidence-floor and agent-requirement-unapproved-implemented for the given
 * requirements. Their evidence (tests, symbols and proof receipts) lives in
 * the synced branch store, so the rules read it there, as `kibi check` does;
 * a requirement the store does not hold yet is not judged.
 */
export async function collectStagedEvidenceFloorViolations(
  input: Readonly<{
    workspaceRoot: string;
    branch: string;
    requirementIds: readonly string[];
    schemaVersion: number | undefined;
  }>,
): Promise<Violation[]> {
  if (
    input.requirementIds.length === 0 ||
    input.schemaVersion === undefined ||
    input.schemaVersion < EVIDENCE_FLOOR_SCHEMA_VERSION
  )
    return [];
  const engine = new EngineClient({
    workspaceRoot: input.workspaceRoot,
    branch: input.branch,
    timeout: 120_000,
  });
  try {
    await engine.start();
    const findings = await collectEvidenceFloorViolations(
      {
        workspaceRoot: input.workspaceRoot,
        signal: new AbortController().signal,
        clock: () => new Date(),
        git: nodeGit,
        fs: nodeFilesystem,
        prolog: {
          query: (goal) => engine.query(goal),
          queryEntities: engine.queryEntities.bind(engine),
          nextSolution: async () => null,
          invalidateCache: () => engine.invalidateCache(),
          save: () => engine.query("kb_save"),
        },
      },
      new Set(REQUIREMENT_PROOF_RULES),
    );
    const ids = new Set(input.requirementIds);
    return findings.filter((finding) => ids.has(finding.entityId));
  } finally {
    await engine.terminate();
  }
}
