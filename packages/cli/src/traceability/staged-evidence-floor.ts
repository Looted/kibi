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

import { existsSync } from "node:fs";
import type { ExtractionResult } from "../extractors/markdown.js";
import { toPrologAtom } from "../prolog/codec.js";
import type { PrologProcess } from "../prolog.js";
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
import { branchStorePath } from "../utils/branch-store-locator.js";
import {
  cleanupTempKb,
  createTempKb,
  projectStagedEntities,
} from "./temp-kb.js";

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

/** The ids among `ids` that the attached store holds as requirements. */
async function heldRequirementIds(
  prolog: PrologProcess,
  ids: readonly string[],
): Promise<Set<string>> {
  const held = new Set<string>();
  for (const id of ids) {
    const result = await prolog.query(`kb_entity(${toPrologAtom(id)}, req, _)`);
    if (result.success) held.add(id);
  }
  return held;
}

/**
 * evidence-floor and agent-requirement-unapproved-implemented for the given
 * requirements, judged on the staged bytes of their documents. Their
 * evidence (tests, symbols and proof receipts) lives in the synced branch
 * store, so the rules read a private copy of it with each staged
 * requirement's front matter and links projected over the synced ones: an
 * edit not synced yet is judged as it will be committed, in both
 * directions. A requirement the store does not hold yet is not judged.
 */
export async function collectStagedEvidenceFloorViolations(
  input: Readonly<{
    workspaceRoot: string;
    branch: string;
    requirementIds: readonly string[];
    schemaVersion: number | undefined;
    /** The staged documents; those of `requirementIds` are projected. */
    stagedEntities: readonly ExtractionResult[];
  }>,
): Promise<Violation[]> {
  if (
    input.requirementIds.length === 0 ||
    input.schemaVersion === undefined ||
    input.schemaVersion < EVIDENCE_FLOOR_SCHEMA_VERSION
  )
    return [];
  const storePath = branchStorePath(input.workspaceRoot, input.branch);
  if (!existsSync(storePath)) return [];
  const ctx = await createTempKb(storePath);
  try {
    const held = await heldRequirementIds(ctx.prolog, input.requirementIds);
    await projectStagedEntities(
      ctx.prolog,
      input.stagedEntities.filter(
        (result) => result.entity.type === "req" && held.has(result.entity.id),
      ),
    );
    const findings = await collectEvidenceFloorViolations(
      {
        workspaceRoot: input.workspaceRoot,
        signal: new AbortController().signal,
        clock: () => new Date(),
        git: nodeGit,
        fs: nodeFilesystem,
        prolog: {
          // A started process: a module load and its goal share a session.
          oneShotMode: false,
          query: (goal) => ctx.prolog.query(goal),
          nextSolution: async () => null,
          invalidateCache: () => ctx.prolog.invalidateCache(),
          save: () => ctx.prolog.query("kb_save"),
        },
      },
      new Set(REQUIREMENT_PROOF_RULES),
    );
    return findings.filter((finding) => held.has(finding.entityId));
  } finally {
    await cleanupTempKb(ctx.tempDir);
  }
}
