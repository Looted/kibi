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
import type { KibiLevel } from "kibi-agent-core/kibi-level";
import type { ExtractionResult } from "../extractors/markdown.js";
import type { PrologProcess } from "../prolog.js";
import { toPrologAtom } from "../prolog/codec.js";
import type { Violation } from "../public/check-types.js";
import {
  isCurrentAuthoredEntity,
  readAuthoredEntity,
} from "../public/operations/entity-context.js";
import {
  EVIDENCE_FLOOR_RULE,
  EVIDENCE_FLOOR_SCHEMA_VERSION,
  REQUIREMENT_PROOF_RULES,
  collectEvidenceFloorViolations,
} from "../public/operations/evidence-floor.js";
import { nodeFilesystem, nodeGit } from "../public/operations/node-ports.js";
import { branchStorePath } from "../utils/branch-store-locator.js";
import { getRuleLayer, layerRunsAtLevel } from "../utils/rule-registry.js";
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
/**
 * The current requirements the commit adds: staged documents with no
 * version in the base tree.
 */
export function addedRequirementIds(
  stagedFiles: readonly Readonly<{ path: string; content?: string }>[],
  readBase: (path: string) => string | null,
): Set<string> {
  const ids = new Set<string>();
  for (const file of stagedFiles) {
    if (file.content === undefined || readBase(file.path) !== null) continue;
    const staged = readAuthoredEntity(file.content, file.path);
    if (staged === null || staged.type !== "req") continue;
    if (isCurrentAuthoredEntity(staged, new Set())) ids.add(staged.id);
  }
  return ids;
}

/**
 * The staged floor findings split by what they stop. At level test a
 * requirement the commit adds may still be below its floor: the commit that
 * records it is reported, not refused, so the requirement can land before
 * the scenario and test that lift it. Every other finding blocks.
 */
export function partitionStagedFloorFindings(
  findings: readonly Violation[],
  added: ReadonlySet<string>,
): { blocking: Violation[]; reported: Violation[] } {
  const blocking: Violation[] = [];
  const reported: Violation[] = [];
  for (const finding of findings)
    (finding.rule === EVIDENCE_FLOOR_RULE && added.has(finding.entityId)
      ? reported
      : blocking
    ).push(finding);
  return { blocking, reported };
}

/**
 * The requirement-proof rules the staged gate runs at a Kibi level: the
 * unapproved-requirement rule belongs to the knowledge layer and runs at
 * every level, the evidence floor (verification) only at level test.
 */
export function stagedRequirementProofRules(level: KibiLevel): Set<string> {
  return new Set(
    REQUIREMENT_PROOF_RULES.filter((rule) =>
      layerRunsAtLevel(getRuleLayer(rule) ?? "verification", level),
    ),
  );
}

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
    /** The requirement-proof rules the project's Kibi level runs. */
    rules: ReadonlySet<string>;
  }>,
): Promise<Violation[]> {
  if (
    input.requirementIds.length === 0 ||
    input.rules.size === 0 ||
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
      input.rules,
      // Only the staged requirements are judged, so only their proofs are
      // evaluated: every requirement's took minutes on a large store.
      { requirementIds: [...held] },
    );
    return findings.filter((finding) => held.has(finding.entityId));
  } finally {
    await cleanupTempKb(ctx.tempDir);
  }
}
