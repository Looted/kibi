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
import { PROOF_RECEIPT_MAX_AGE_SECONDS } from "../proof-receipt.js";
import { runOperationJsonQuery, toPrologAtom } from "./prolog-json.js";
import type { OperationContext } from "./runtime-types.js";
import { readWorkspaceSnapshot } from "./workspace-snapshot.js";

/**
 * The schema version from which a current requirement's evidence level must
 * reach its floor; older KBs get the floor with their schema upgrade, whose
 * migration records the floor of firm requirements without a proof path.
 */
// implements REQ-kibi-evidence-floors
export const EVIDENCE_FLOOR_SCHEMA_VERSION = 11;

/** A current requirement's evidence level must reach its floor. */
// implements REQ-kibi-evidence-floors
export const EVIDENCE_FLOOR_RULE = "evidence-floor";

// implements REQ-kibi-evidence-floors
export type EvidenceFloorRow = Readonly<{
  id: string;
  evidenceLevel: string;
  requiredEvidence: string;
  requiredEvidenceSource: string;
  status: "below" | "pending_reproof";
  proofStatus: string;
  proofGaps: readonly string[];
}>;

type EvidenceFloorPayload = {
  readonly evaluated?: number;
  readonly rows?: readonly EvidenceFloorRow[];
};

export type EvidenceFloorOptions = Readonly<{
  /**
   * Judge receipts as they are: stale receipts no longer count as pending
   * re-proof, and the proof snapshot must be clean. CI uses it right after
   * `kibi prove --all`.
   */
  freshEvidence?: boolean;
}>;

function floorSource(row: EvidenceFloorRow): string {
  return row.requiredEvidenceSource === "explicit"
    ? "its required_evidence"
    : row.requiredEvidence === "tested"
      ? "the floor of a firm requirement"
      : "its floor";
}

function suggestionFor(row: EvidenceFloorRow): string {
  if (row.status === "pending_reproof")
    return `Run kibi prove for the tests behind ${row.id} so its receipts match the current code, then rerun kibi check --fresh-evidence.`;
  switch (row.requiredEvidence) {
    case "proved":
      return `Give ${row.id} evidence a second program can re-check (a proof kind that issues a certificate), or lower required_evidence with the reason in the requirement.`;
    case "tested":
      return `Link ${row.id} to a scenario with an end-to-end test that has a proof contract, run kibi prove, and fix the proof gaps kibi proof explain ${row.id} lists (${row.proofGaps.join(", ") || "none listed"}); or lower required_evidence if a person decides it does not need tests.`;
    default:
      return `Have a person approve ${row.id} (origin.approved_by) or state it as firm with origin.ref to their words, or lower required_evidence.`;
  }
}

/** One finding per current requirement whose evidence is below its floor. */
// implements REQ-kibi-evidence-floors
export function evidenceFloorViolations(
  rows: readonly EvidenceFloorRow[],
  options: EvidenceFloorOptions = {},
): Violation[] {
  return rows
    .filter((row) => options.freshEvidence === true || row.status === "below")
    .map((row) => ({
      rule: EVIDENCE_FLOOR_RULE,
      entityId: row.id,
      description:
        row.status === "pending_reproof"
          ? `${row.id} is ${row.evidenceLevel} but needs ${row.requiredEvidence} (${floorSource(row)}); its receipts are older than the code`
          : `${row.id} is ${row.evidenceLevel} but needs ${row.requiredEvidence} (${floorSource(row)})`,
      suggestion: suggestionFor(row),
      evidence: {
        evidenceLevel: row.evidenceLevel,
        requiredEvidence: row.requiredEvidence,
        requiredEvidenceSource: row.requiredEvidenceSource,
        status: row.status,
        proofStatus: row.proofStatus,
        proofGaps: row.proofGaps,
      },
    }));
}

/**
 * Evaluate the evidence-floor rule against the attached store, with the same
 * per-contract receipt binding kb_coverage uses.
 */
// implements REQ-kibi-evidence-floors
export async function collectEvidenceFloorViolations(
  context: OperationContext,
  rules: ReadonlySet<string>,
  options: EvidenceFloorOptions = {},
): Promise<Violation[]> {
  if (!rules.has(EVIDENCE_FLOOR_RULE) || context.prolog === undefined)
    return [];
  // A store without a manifest predates schema 11 as much as an old one.
  const schemaVersion = readKbManifest(context.workspaceRoot)?.schemaVersion;
  if (
    schemaVersion === undefined ||
    schemaVersion < EVIDENCE_FLOOR_SCHEMA_VERSION
  )
    return [];
  const snapshotEvidence = await readWorkspaceSnapshot(context);
  const snapshot = snapshotEvidence.available
    ? snapshotEvidence.snapshot.hash
    : "unknown";
  const { perContractTestBindings } = await import("./specs/reporting.js");
  const bindings = await perContractTestBindings(context);
  const checkedAt = context.clock().toISOString();
  const goal = `discovery:evidence_floor_json(${bindings === null ? "strict_snapshot, _{}" : `per_contract, ${bindings}`}, ${toPrologAtom(snapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`;
  const payload = await runOperationJsonQuery<EvidenceFloorPayload>(
    context.prolog,
    "discovery.pl",
    goal,
    "Evidence floor evaluation",
  );
  const violations = evidenceFloorViolations(payload.rows ?? [], options);
  if (options.freshEvidence === true) {
    const clean =
      snapshotEvidence.available && snapshotEvidence.snapshot.dirty === false;
    if (!clean)
      violations.unshift({
        rule: EVIDENCE_FLOOR_RULE,
        entityId: "proof-snapshot",
        description: snapshotEvidence.available
          ? "--fresh-evidence needs a clean proof snapshot, but the working tree has uncommitted changes"
          : `--fresh-evidence needs a proof snapshot, but none is available: ${snapshotEvidence.error}`,
        suggestion:
          "Commit or stash working-tree changes (or run inside a Git checkout), run kibi prove, then rerun kibi check --fresh-evidence.",
      });
  }
  return violations;
}
