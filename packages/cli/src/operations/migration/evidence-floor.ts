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
import { effectiveFirmness, isFirmness } from "../../decision-firmness.js";
import { normalizeDateLike } from "../../extractors/markdown.js";
import { readEntityOrigin } from "../../public/entity-origin.js";
import type { StatusPayload } from "../../public/operations/discovery-executors.js";
import {
  type AuthoredEntity,
  authoredSupersededIds,
  isCurrentAuthoredEntity,
  readAuthoredEntity,
} from "../../public/operations/entity-context.js";
import {
  UNAPPROVED_IMPLEMENTED_GRACE_DAYS,
  approvalClock,
  pastApprovalGrace,
} from "../../public/operations/evidence-floor.js";
import { isMustPriority } from "../../public/operations/positive-scenario.js";
import { readAllShards } from "../../relationships/shards.js";
import type {
  BodyContextPlan,
  BodyContextTarget,
} from "./entity-body-context.js";
import {
  listLaneMarkdownSources,
  withTopLevelField,
  writeFileAtomically,
} from "./kb-sources.js";

/** Schema 11: record the floor of firm requirements that had no proof path. */
export const EVIDENCE_FLOOR_PIN_CODE = "evidence_floor_pin";

/**
 * Schema 15: record the floor of approved requirements (origin.approved_by,
 * no explicit firmness) that had no proof path.
 */
export const APPROVAL_FLOOR_PIN_CODE = "approval_floor_pin";

/**
 * Which default tested floors a migration records pins for: `firm` (schema
 * 11) and `approved` (schema 15). An upgrade across both pins both.
 */
export type EvidenceFloorPinScope = Readonly<{
  firm: boolean;
  approved: boolean;
}>;

/** Pins to write, plus the requirements that keep the tested floor. */
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
  // Reading a field of a scalar link gives undefined, so only null needs care.
  return (links as ({ type?: unknown; target?: unknown } | null)[])
    .filter((link) => link?.type === type && typeof link.target === "string")
    .map((link) => link?.target as string);
}

function authoredEntities(
  workspaceRoot: string,
  lane: "requirements" | "scenarios" | "tests",
): { entity: AuthoredEntity; content: string; relativePath: string }[] {
  return listLaneMarkdownSources(workspaceRoot, [lane]).flatMap(
    ({ content, relativePath }) => {
      const entity = readAuthoredEntity(content, relativePath);
      return entity === null ? [] : [{ entity, content, relativePath }];
    },
  );
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
  // An empty history reduces to null below.
  if (!Array.isArray(receipts)) return false;
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
  const proven = new Set(
    [...testsOf]
      .filter(([, tests]) => [...tests].some((test) => contracted.has(test)))
      .map(([scenario]) => scenario),
  );
  return new Set(
    [...scenariosOf]
      .filter(([, scenarios]) => [...scenarios].some((id) => proven.has(id)))
      .map(([requirement]) => requirement),
  );
}

/**
 * Which default tested floor applies to a requirement without
 * required_evidence: `firm` (firmness firm, stated or implied by a non-agent
 * origin), `approved` (no stated firmness and origin.approved_by set, from
 * schema 15), or undefined when it has no floor.
 */
export function defaultTestedFloor(
  entity: AuthoredEntity,
): "firm" | "approved" | undefined {
  if (
    effectiveFirmness(entity.type, entity.data.firmness, entity.data.origin) ===
    "firm"
  )
    return "firm";
  if (isFirmness(entity.data.firmness)) return undefined;
  return readEntityOrigin(entity.data.origin)?.approved_by === undefined
    ? undefined
    : "approved";
}

/**
 * Current requirements without required_evidence whose default floor is
 * tested (firm from schema 11, approved from schema 15, as `scope` selects)
 * and without a proof path that has passed. These have not reached tested,
 * so the migration records their floor as asserted in the requirement
 * itself, where a reviewer sees it and can raise it later. Requirements with
 * a passing proof path keep the tested floor; `kept` lists them, since
 * remaining gaps (a stale receipt, a missing covered_by) still show in kibi
 * check. Read-only.
 */
export function planEvidenceFloorPins(
  workspaceRoot: string,
  ladder?: LadderFloorVerdicts | null,
  scope: EvidenceFloorPinScope = { firm: true, approved: false },
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
      !isCurrentAuthoredEntity(entity, superseded)
    )
      continue;
    const floor = defaultTestedFloor(entity);
    if (floor === undefined || !scope[floor === "firm" ? "firm" : "approved"])
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
export function applyEvidenceFloorPins(
  workspaceRoot: string,
  ladder?: LadderFloorVerdicts | null,
  scope?: EvidenceFloorPinScope,
): number {
  const plan = planEvidenceFloorPins(workspaceRoot, ladder, scope);
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
    // A missing payload or field throws, and the catch returns null for it.
    const { branchStore, snapshotId, branchAttachment } = (
      await executeOperation(runtime, statusSpec, {})
    ).structuredContent as Required<StatusPayload>;
    if (
      branchStore.state !== "healthy" ||
      snapshotId === "missing" ||
      branchAttachment.kind !== "exact"
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

/** An agent's must requirement no person approved, as the upgrade lists it. */
export type UnapprovedAgentMust = Readonly<{
  id: string;
  /** When its wait for approval started, or empty when nothing records it. */
  since: string;
}>;

/**
 * Schema 15: the current must requirements an agent wrote (origin.kind
 * agent) that no person approved (origin.approved_by) and whose approval
 * clock (origin.recorded_at, else the created_at the document states) is
 * missing or older than the grace period at `checkedAt`. From the upgrade on,
 * agent-requirement-unapproved-implemented fails kibi check on each one
 * production code implements, so the migration lists them up front. Read
 * from authored sources; sorted by id.
 */
export function planUnapprovedAgentMusts(
  workspaceRoot: string,
  checkedAt: string,
): UnapprovedAgentMust[] {
  const files = authoredEntities(workspaceRoot, "requirements").filter(
    ({ entity }) => entity.type === "req",
  );
  const superseded = authoredSupersededIds(
    workspaceRoot,
    files.map(({ entity }) => entity),
  );
  const found: UnapprovedAgentMust[] = [];
  for (const { entity, relativePath } of files) {
    const origin = readEntityOrigin(entity.data.origin);
    if (
      origin?.kind !== "agent" ||
      origin.approved_by !== undefined ||
      !isMustPriority(entity.data.priority) ||
      !isCurrentAuthoredEntity(entity, superseded)
    )
      continue;
    const clock = approvalClock(
      { recordedAt: origin.recorded_at ?? "", source: relativePath },
      () => normalizeDateLike(entity.data.created_at),
    );
    if (pastApprovalGrace(clock.since, checkedAt))
      found.push({ id: entity.id, since: clock.since });
  }
  return found.sort((left, right) => left.id.localeCompare(right.id));
}

/** The upgrade's note on {@link planUnapprovedAgentMusts}' requirements. */
export function unapprovedAgentMustNote(
  requirements: readonly UnapprovedAgentMust[],
  dryRun: boolean,
): string {
  const shown = requirements
    .slice(0, 10)
    .map(({ id, since }) =>
      since === "" ? `${id} (no origin.recorded_at or created_at)` : id,
    )
    .join(", ");
  const more =
    requirements.length > 10 ? ` (+${requirements.length - 10} more)` : "";
  return `${dryRun ? "dry run: " : ""}${requirements.length} must requirement(s) an agent wrote have no person's approval (origin.approved_by) and waited longer than ${UNAPPROVED_IMPLEMENTED_GRACE_DAYS} days or record no date: ${shown}${more}. From schema 15 kibi check fails on each one production code implements (agent-requirement-unapproved-implemented): have a person review them and record origin.approved_by, or lower their priority.`;
}
