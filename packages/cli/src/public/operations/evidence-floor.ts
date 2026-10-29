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
  /** The tests and symbols behind the gaps; empty lists are left out. */
  gapDetails?: Readonly<Record<string, readonly string[]>>;
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
  /**
   * The instant and workspace snapshot the whole check judges receipts at,
   * so the floor reads the same requirement proofs the coverage evidence
   * read instead of computing them again.
   */
  checkedAt?: string;
  snapshotEvidence?: Awaited<ReturnType<typeof readWorkspaceSnapshot>>;
}>;

function floorSource(row: EvidenceFloorRow): string {
  return row.requiredEvidenceSource === "explicit"
    ? "its required_evidence"
    : row.requiredEvidence === "tested"
      ? "the floor of a firm requirement"
      : "its floor";
}

const GAP_DETAIL_LABELS: Readonly<Record<string, string>> = {
  failedReceiptTests: "failing receipts",
  missingReceiptTests: "no receipt",
  staleReceiptTests: "stale receipts",
  invalidReceiptTests: "invalid receipts",
  contractMismatchReceiptTests: "receipts for an older contract",
  uncoveredSymbols: "production symbols without qualifying coverage",
  missingCoordinateSymbols: "symbols without source coordinates",
  unprovedClaims: "claims no certificate derives",
};

/** The entities behind the gaps, for a person reading kibi check's text. */
// implements REQ-kibi-evidence-floors
export function gapDetailLines(row: EvidenceFloorRow): string[] {
  return Object.entries(row.gapDetails ?? {}).flatMap(([key, ids]) =>
    ids.length === 0
      ? []
      : [
          `${GAP_DETAIL_LABELS[key] ?? key}: ${ids.slice(0, 8).join(", ")}${ids.length > 8 ? ` (+${ids.length - 8} more)` : ""}`,
        ],
  );
}

function suggestionFor(row: EvidenceFloorRow): string {
  if (row.status === "pending_reproof")
    return `Run kibi prove for the tests behind ${row.id} so its receipts match the current code, then rerun kibi check --fresh-evidence.`;
  switch (row.requiredEvidence) {
    case "proved":
      return `Prove every applicable claim of ${row.id}${(row.gapDetails?.unprovedClaims ?? []).length > 0 ? ` (unproved: ${(row.gapDetails?.unprovedClaims ?? []).join(", ")})` : ""}: model each as a set fact (prove it with exhaustive or typecheck), a numeric fact (arithmetic or smt), a rule, predicate or set fact about a predicate (rule or state_machine) or a string fact (regex), name it in a certificate test's proof_contract.proves, and run kibi prove; kibi proof explain ${row.id} shows each claim's bindings. A claim with no such fact can only be attested, so lower required_evidence to tested with the reason in the requirement if that is enough.`;
    case "tested":
      return `Link ${row.id} to a scenario with an end-to-end test that has a proof contract, run kibi prove, and fix its proof gaps (${row.proofGaps.join(", ") || "none listed"}${gapDetailLines(row).length > 0 ? `; ${gapDetailLines(row).join("; ")}` : ""}); kibi proof explain ${row.id} shows each one. Or lower required_evidence if a person decides it does not need tests.`;
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
        ...(row.gapDetails === undefined ? {} : { gapDetails: row.gapDetails }),
      },
    }));
}

/**
 * Every current requirement whose evidence is below its floor (status below
 * or pending_reproof), judged on the attached store with the same
 * per-contract receipt binding kb_coverage uses. Unlike the check rule this
 * ignores the schema version, so a migration can read the floor the ladder
 * will apply before it records the new schema.
 */
// implements REQ-kibi-evidence-floors
export async function readEvidenceFloorRows(
  context: OperationContext,
  snapshotEvidence?: Awaited<ReturnType<typeof readWorkspaceSnapshot>>,
  checkedAt: string = context.clock().toISOString(),
): Promise<readonly EvidenceFloorRow[]> {
  const prolog = context.prolog ?? (await context.ensureProlog?.());
  if (prolog === undefined) return [];
  const evidence = snapshotEvidence ?? (await readWorkspaceSnapshot(context));
  const snapshot = evidence.available ? evidence.snapshot.hash : "unknown";
  const { perContractTestBindings } = await import("./specs/reporting.js");
  const bindings = await perContractTestBindings({ ...context, prolog });
  const goal = `discovery:evidence_floor_json(${bindings === null ? "strict_snapshot, _{}" : `per_contract, ${bindings}`}, ${toPrologAtom(snapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`;
  const payload = await runOperationJsonQuery<EvidenceFloorPayload>(
    prolog,
    "discovery.pl",
    goal,
    "Evidence floor evaluation",
  );
  return payload.rows ?? [];
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
  const snapshotEvidence =
    options.snapshotEvidence ?? (await readWorkspaceSnapshot(context));
  const rows = await readEvidenceFloorRows(
    context,
    snapshotEvidence,
    options.checkedAt,
  );
  const violations = evidenceFloorViolations(rows, options);
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
