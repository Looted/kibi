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

/** Pins to write, plus the firm requirements that keep the tested floor. */
export type EvidenceFloorPlan = BodyContextPlan &
  Readonly<{
    kept: readonly string[];
    /**
     * Whether the floors were decided by the evidence ladder on the compiled
     * store (`ladder`) or only from authored receipts (`authored`), because
     * no synced store could be read.
     */
    decidedBy: "ladder" | "authored";
  }>;

/**
 * The evidence ladder's verdict on the current store: requirement id to the
 * evidence-floor status of every requirement below a tested floor
 * (`below`, or `pending_reproof` when only receipts older than the code
 * stand in the way). Requirements absent from the map meet the floor.
 */
export type LadderFloorVerdicts = ReadonlyMap<
  string,
  "below" | "pending_reproof"
>;

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
 * An end-to-end test with a proof contract whose newest receipt passed: the
 * least a requirement needs to have been tested, judged on the receipt the
 * evidence ladder reads. A contract that was never run through kibi prove,
 * one whose latest run failed, or a unit-scoped one cannot reach tested.
 */
function hasPassingProof(entity: AuthoredEntity): boolean {
  if (entity.data.proof_contract === undefined) return false;
  if (entity.data.verification_scope !== "end_to_end") return false;
  const receipts = entity.data.proof_receipts;
  if (!Array.isArray(receipts) || receipts.length === 0) return false;
  const latest = receipts.reduce<{ at: string; outcome: unknown } | null>(
    (best, receipt, index) => {
      if (receipt === null || typeof receipt !== "object") return best;
      const record = receipt as Record<string, unknown>;
      // Finish times increase strictly; history order is the fallback.
      const at =
        typeof record.finished_at === "string"
          ? record.finished_at
          : String(index).padStart(12, "0");
      return best === null || at >= best.at
        ? { at, outcome: record.outcome }
        : best;
    },
    null,
  );
  return latest?.outcome === "passed";
}

/**
 * Requirement ids with a proof path: a linked scenario (specified_by) that an
 * end-to-end test with a proof contract and a passing receipt verifies
 * (scenario verified_by test, or test validates scenario), read from authored
 * links and relationship shards.
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
    if (hasPassingProof(entity)) contracted.add(entity.id);
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
 * Current firm requirements without required_evidence and without a proof
 * path that has passed. From schema 11 a firm requirement needs tested
 * evidence, which these have not reached, so the migration records their
 * floor as asserted in the requirement itself, where a reviewer sees it and
 * can raise it later. Requirements with a passing proof path keep the tested
 * floor; `kept` lists them, since remaining gaps (a stale receipt, a missing
 * covered_by) still show in kibi check. Read-only.
 */
// implements REQ-kibi-evidence-floors, REQ-cli-schema-migration
export function planEvidenceFloorPins(
  workspaceRoot: string,
  ladder?: LadderFloorVerdicts | null,
): EvidenceFloorPlan {
  const files = authoredEntities(workspaceRoot, "requirements").filter(
    ({ entity }) => entity.type === "req",
  );
  const requirements = files.map(({ entity }) => entity);
  const superseded = authoredSupersededIds(workspaceRoot, requirements);
  const withPath = requirementsWithProofPath(workspaceRoot, requirements);
  const targets: BodyContextTarget[] = [];
  const kept: string[] = [];
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
      ) !== "firm"
    )
      continue;
    // The ladder on the compiled store judges every gap (failed latest
    // receipts, missing coverage or coordinates), so a requirement it puts
    // below the tested floor is pinned even with a passing receipt; one
    // without any authored proof path is pinned whatever the store says,
    // since the store may predate the authored sources.
    if (withPath.has(entity.id) && ladder?.get(entity.id) !== "below") {
      kept.push(entity.id);
      continue;
    }
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
  return {
    targets,
    skipped,
    kept,
    decidedBy: ladder === undefined || ladder === null ? "authored" : "ladder",
  };
}

/** Write the planned floors; returns how many requirements were rewritten. */
// implements REQ-kibi-evidence-floors, REQ-cli-schema-migration
export function applyEvidenceFloorPins(
  workspaceRoot: string,
  ladder?: LadderFloorVerdicts | null,
): number {
  const plan = planEvidenceFloorPins(workspaceRoot, ladder);
  for (const target of plan.targets)
    writeFileAtomically(path.join(workspaceRoot, target.path), target.after);
  return plan.targets.length;
}

/**
 * Read the evidence ladder's floor verdicts from the branch's compiled store,
 * so the migration keeps the tested floor only where kibi check will accept
 * it. Returns null when no healthy, synced store is attached (never synced,
 * damaged, another branch's store) or the evaluation fails; the migration
 * then decides from authored receipts alone and says so.
 */
// implements REQ-kibi-evidence-floors, REQ-cli-schema-migration
export async function readLadderFloorVerdicts(
  workspaceRoot: string,
): Promise<LadderFloorVerdicts | null> {
  try {
    const [
      { createCliRuntime },
      { executeOperation },
      { statusSpec },
      { readEvidenceFloorRows },
    ] = await Promise.all([
      import("../../runtime/cli-runtime.js"),
      import("../../public/operations/runtime-types.js"),
      import("../../public/operations/specs/discovery.js"),
      import("../../public/operations/evidence-floor.js"),
    ]);
    const runtime = createCliRuntime({ workspaceRoot });
    const status = (await executeOperation(runtime, statusSpec, {}))
      .structuredContent;
    if (
      status?.branchStore?.state !== "healthy" ||
      status?.snapshotId === "missing" ||
      status?.branchAttachment?.kind !== "exact"
    )
      return null;
    const rows = await executeOperation(
      runtime,
      {
        name: "kb_migrate_evidence_floor_preview",
        effects: ["kb-read"],
        requiresProlog: true,
        execute: (_input: unknown, context) => readEvidenceFloorRows(context),
      },
      {},
    );
    const verdicts = new Map<string, "below" | "pending_reproof">();
    for (const row of rows)
      if (row.requiredEvidence === "tested") verdicts.set(row.id, row.status);
    return verdicts;
  } catch {
    return null;
  }
}
