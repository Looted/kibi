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

import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeDateLike } from "../../extractors/markdown.js";
import { readKbManifest } from "../../utils/kb-manifest.js";
import type { Violation } from "../../utils/rule-registry.js";
import { ISO_TIMESTAMP_PATTERN } from "../entity-origin.js";
import { PROOF_RECEIPT_MAX_AGE_SECONDS } from "../proof-receipt.js";
import { isWithinRoot } from "../skill-system/paths.js";
import { readAuthoredEntity } from "./entity-context.js";
import { runOperationJsonQuery, toPrologAtom } from "./prolog-json.js";
import type { OperationContext } from "./runtime-types.js";
import { readWorkspaceSnapshot } from "./workspace-snapshot.js";

/**
 * The schema version from which a current requirement's evidence level must
 * reach its floor; older KBs get the floor with their schema upgrade, whose
 * migration records the floor of firm requirements without a proof path.
 */
export const EVIDENCE_FLOOR_SCHEMA_VERSION = 11;

/**
 * The schema version from which a person's approval (origin.approved_by)
 * gives a requirement without required_evidence or an explicit firmness the
 * tested floor. The schema 15 upgrade records the floor of approved
 * requirements without a passing proof path.
 */
export const APPROVAL_FLOOR_SCHEMA_VERSION = 15;

/** A current requirement's evidence level must reach its floor. */
export const EVIDENCE_FLOOR_RULE = "evidence-floor";

/**
 * A must requirement an agent wrote that production code implements cannot
 * stay unapproved longer than {@link UNAPPROVED_IMPLEMENTED_GRACE_DAYS}.
 */
export const AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE =
  "agent-requirement-unapproved-implemented";

/** Days an implemented must requirement may wait for a person's approval. */
export const UNAPPROVED_IMPLEMENTED_GRACE_DAYS = 14;

/** The rules evaluated from the requirement proofs the floor reads. */
export const REQUIREMENT_PROOF_RULES = [
  EVIDENCE_FLOOR_RULE,
  AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE,
] as const;

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
  /** Claims a proof refuted: the test, the claim and what the test read. */
  refutations?: readonly Readonly<{
    test: string;
    claimKey: string;
    reason: string;
  }>[];
}>;

/** A must requirement an agent wrote, unapproved, that code implements. */
export type UnapprovedImplementedRow = Readonly<{
  id: string;
  /** Its origin.recorded_at, or empty when the origin records none. */
  recordedAt: string;
  /** Its authored document, or empty when the store records none. */
  source: string;
  /** Production symbols that implement it. */
  symbols: readonly string[];
}>;

/**
 * Where an unapproved requirement's wait for approval starts, read from
 * authored data only: its origin.recorded_at, else the created_at its own
 * document states, else nothing (`none`), which counts as older than the
 * grace period. The stored created_at is not read: sync stamps it with the
 * sync time when the front matter has none.
 */
export type ApprovalClock = Readonly<{
  since: string;
  field: "origin.recorded_at" | "created_at" | "none";
}>;

export type RequirementProofPayload = {
  readonly evaluated?: number;
  readonly rows?: readonly EvidenceFloorRow[];
  readonly unapprovedImplemented?: readonly UnapprovedImplementedRow[];
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
  if (row.requiredEvidenceSource === "explicit") return "its required_evidence";
  if (row.requiredEvidence !== "tested") return "its floor";
  return row.requiredEvidenceSource === "approval"
    ? "the floor of an approved requirement"
    : "the floor of a firm requirement";
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
export function gapDetailLines(row: EvidenceFloorRow): string[] {
  return Object.entries(row.gapDetails ?? {}).flatMap(([key, ids]) =>
    ids.length === 0
      ? []
      : [
          `${GAP_DETAIL_LABELS[key] ?? key}: ${ids.slice(0, 8).join(", ")}${ids.length > 8 ? ` (+${ids.length - 8} more)` : ""}`,
        ],
  );
}

/** Gaps a refuted claim leaves that a derived proof would have covered. */
const REFUTATION_GAPS = new Set(["happy_path_only", "uncovered_case"]);

/** Each refuted claim in plain words: which test refutes it and why. */
export function refutationText(row: EvidenceFloorRow): string | undefined {
  const refutations = row.refutations ?? [];
  if (refutations.length === 0) return undefined;
  return refutations
    .map(
      (refutation) =>
        `${refutation.test} refutes ${refutation.claimKey}: ${refutation.reason}`,
    )
    .join("; ");
}

function suggestionFor(row: EvidenceFloorRow): string {
  const refuted = refutationText(row);
  if (refuted !== undefined) {
    const following = row.proofGaps.filter((gap) => REFUTATION_GAPS.has(gap));
    return `The code breaks a claim of ${row.id} (${refuted}). Fix the code so it keeps the claim, or, with the person who owns the rule, change the requirement, then run kibi prove${following.length > 0 ? `; ${following.join(" and ")} ${following.length > 1 ? "clear" : "clears"} once the proof derives the claim` : ""}. kibi proof explain ${row.id} shows each claim's bindings.`;
  }
  if (row.status === "pending_reproof")
    return `Run kibi prove for the tests behind ${row.id} so its receipts match the current code, then rerun kibi check --fresh-evidence.`;
  switch (row.requiredEvidence) {
    case "proved": {
      const unproved = row.gapDetails?.unprovedClaims ?? [];
      return `Prove every applicable claim of ${row.id}${unproved.length > 0 ? ` (unproved: ${unproved.join(", ")})` : ""}: model each as a set fact (prove it with exhaustive or typecheck), a numeric fact (arithmetic or smt), a rule, predicate or set fact about a predicate (rule or state_machine) or a string fact (regex), name it in a certificate test's proof_contract.proves, and run kibi prove; kibi proof explain ${row.id} shows each claim's bindings. A claim with no such fact can only be attested, so lower required_evidence to tested with the reason in the requirement if that is enough.`;
    }
    case "tested":
      return `Link ${row.id} to a scenario with an end-to-end test that has a proof contract, run kibi prove, and fix its proof gaps (${row.proofGaps.join(", ") || "none listed"}${gapDetailLines(row).length > 0 ? `; ${gapDetailLines(row).join("; ")}` : ""}); kibi proof explain ${row.id} shows each one. Or lower required_evidence if a person decides it does not need tests.`;
    default:
      return `Have a person approve ${row.id} (origin.approved_by) or state it as firm with origin.ref to their words, or lower required_evidence.`;
  }
}

/** One finding per current requirement whose evidence is below its floor. */
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
          : `${row.id} is ${row.evidenceLevel} but needs ${row.requiredEvidence} (${floorSource(row)})${refutationText(row) === undefined ? "" : `; its proof refutes a claim: ${refutationText(row)}`}`,
      suggestion: suggestionFor(row),
      evidence: {
        evidenceLevel: row.evidenceLevel,
        requiredEvidence: row.requiredEvidence,
        requiredEvidenceSource: row.requiredEvidenceSource,
        status: row.status,
        proofStatus: row.proofStatus,
        proofGaps: row.proofGaps,
        ...(row.gapDetails === undefined ? {} : { gapDetails: row.gapDetails }),
        ...(row.refutations?.length ? { refutations: row.refutations } : {}),
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
export async function readEvidenceFloorRows(
  context: OperationContext,
  snapshotEvidence?: Awaited<ReturnType<typeof readWorkspaceSnapshot>>,
  checkedAt: string = context.clock().toISOString(),
): Promise<readonly EvidenceFloorRow[]> {
  return (
    (await readRequirementProofPayload(context, snapshotEvidence, checkedAt))
      .rows ?? []
  );
}

/**
 * The evidence-floor rows plus the rows of the other rules that read the
 * same requirement proofs, from one evaluation on the attached store.
 */
export async function readRequirementProofPayload(
  context: OperationContext,
  snapshotEvidence?: Awaited<ReturnType<typeof readWorkspaceSnapshot>>,
  checkedAt: string = context.clock().toISOString(),
): Promise<RequirementProofPayload> {
  const prolog = context.prolog ?? (await context.ensureProlog?.());
  if (prolog === undefined) return {};
  const evidence = snapshotEvidence ?? (await readWorkspaceSnapshot(context));
  const snapshot = evidence.available ? evidence.snapshot.hash : "unknown";
  const { perContractTestBindings } = await import("./specs/reporting.js");
  const bindings = await perContractTestBindings({ ...context, prolog });
  const goal = `discovery:evidence_floor_json(${bindings === null ? "strict_snapshot, _{}" : `per_contract, ${bindings}`}, ${toPrologAtom(snapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`;
  return runOperationJsonQuery<RequirementProofPayload>(
    prolog,
    "discovery.pl",
    goal,
    "Evidence floor evaluation",
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How far past the check an approval clock may start and still count as a
 * real date: a day absorbs clock skew between machines and a date written in
 * a time zone ahead of UTC.
 */
export const APPROVAL_CLOCK_SKEW_MS = DAY_MS;

const ISO_DATE_TIME = new RegExp(ISO_TIMESTAMP_PATTERN);

/**
 * The time an ISO 8601 date or timestamp names, or NaN when the value is not
 * one: free text such as "yesterday", or a calendar day or time that does not
 * exist (2026-02-30, 2026-13-45T00:00:00Z, 23:60).
 */
function isoDateTime(value: string): number {
  if (!ISO_DATE_TIME.test(value)) return Number.NaN;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  // Date.parse rolls a day past the month's end into the next month.
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day)
    return Number.NaN;
  return Date.parse(value);
}

/**
 * Why `value` cannot start a requirement's approval clock at `checkedAt`:
 * `not-a-date` when it is no ISO 8601 date, `future` when it lies more than
 * {@link APPROVAL_CLOCK_SKEW_MS} after the check. Undefined for a usable date.
 */
export function approvalDateProblem(
  value: string,
  checkedAt: string,
): "not-a-date" | "future" | undefined {
  const started = isoDateTime(value);
  if (Number.isNaN(started)) return "not-a-date";
  return started - Date.parse(checkedAt) > APPROVAL_CLOCK_SKEW_MS
    ? "future"
    : undefined;
}

/**
 * Whether a requirement whose approval clock started at `since` has waited
 * longer than the grace period at `checkedAt`. A missing date, one that is
 * not an ISO 8601 date and one in the future count as old: nothing shows the
 * requirement is new, and a date nobody could have recorded yet must not keep
 * the rule quiet.
 */
export function pastApprovalGrace(since: string, checkedAt: string): boolean {
  const checked = Date.parse(checkedAt);
  if (Number.isNaN(checked) || approvalDateProblem(since, checkedAt))
    return true;
  return (
    checked - isoDateTime(since) > UNAPPROVED_IMPLEMENTED_GRACE_DAYS * DAY_MS
  );
}

function readText(file: string): string | undefined {
  let text: string | undefined;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    // A document that cannot be read states no created_at.
  }
  return text;
}

/**
 * Read the created_at a requirement's own document states, each file at most
 * once. A source outside the workspace, a missing or unreadable document and
 * one without created_at give undefined.
 */
export function authoredCreatedAtReader(
  workspaceRoot: string,
): (source: string) => string | undefined {
  const cache = new Map<string, string | undefined>();
  return (source) => {
    if (cache.has(source)) return cache.get(source);
    const file = path.resolve(workspaceRoot, source);
    // An empty source resolves to the workspace itself, which no file read
    // accepts.
    const content = isWithinRoot(workspaceRoot, file)
      ? readText(file)
      : undefined;
    const createdAt =
      content === undefined
        ? undefined
        : normalizeDateLike(
            readAuthoredEntity(content, source)?.data.created_at,
          );
    const value = createdAt === "" ? undefined : createdAt;
    cache.set(source, value);
    return value;
  };
}

/** The approval clock of one row; see {@link ApprovalClock}. */
export function approvalClock(
  row: Pick<UnapprovedImplementedRow, "recordedAt" | "source">,
  createdAtOf: (source: string) => string | undefined,
): ApprovalClock {
  if (row.recordedAt !== "")
    return { since: row.recordedAt, field: "origin.recorded_at" };
  const createdAt = createdAtOf(row.source);
  return createdAt === undefined
    ? { since: "", field: "none" }
    : { since: createdAt, field: "created_at" };
}

function clockText(
  clock: ApprovalClock,
  problem: "not-a-date" | "future" | undefined,
): string {
  const old = `so it counts as older than ${UNAPPROVED_IMPLEMENTED_GRACE_DAYS} days`;
  if (clock.field === "none")
    return `and it records neither origin.recorded_at nor created_at, ${old}`;
  if (problem === "not-a-date")
    return `and its ${clock.field} ${JSON.stringify(clock.since)} is not an ISO 8601 date, ${old}`;
  if (problem === "future")
    return `and its ${clock.field} ${clock.since} lies in the future, ${old}`;
  return clock.field === "origin.recorded_at"
    ? `since it was recorded at ${clock.since}`
    : `since its created_at ${clock.since}`;
}

/**
 * agent-requirement-unapproved-implemented: one finding per must requirement
 * an agent wrote that production code implements and no person approved
 * within the grace period, counted from its approval clock.
 */
export function unapprovedImplementedViolations(
  rows: readonly UnapprovedImplementedRow[],
  checkedAt: string,
  createdAtOf: (source: string) => string | undefined = () => undefined,
): Violation[] {
  return rows.flatMap((row) => {
    const clock = approvalClock(row, createdAtOf);
    if (!pastApprovalGrace(clock.since, checkedAt)) return [];
    const problem =
      clock.field === "none"
        ? undefined
        : approvalDateProblem(clock.since, checkedAt);
    const shown = row.symbols.slice(0, 8).join(", ");
    const more =
      row.symbols.length > 8 ? ` (+${row.symbols.length - 8} more)` : "";
    return [
      {
        rule: AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE,
        entityId: row.id,
        description: `Must requirement ${row.id} was written by an agent and production code implements it (${shown}${more}), but no person has approved it ${clockText(clock, problem)}; shipped behavior rests on a requirement nobody confirmed`,
        suggestion: `Have a person review ${row.id}: when it states the intended behavior, record them in origin.approved_by (it then needs tested evidence unless required_evidence says otherwise); when it does not, fix the requirement and the code, or lower priority from must if the behavior is optional.`,
        evidence: {
          since: clock.since,
          sinceField: clock.field,
          ...(problem === undefined ? {} : { sinceProblem: problem }),
          symbols: row.symbols,
          graceDays: UNAPPROVED_IMPLEMENTED_GRACE_DAYS,
        },
      },
    ];
  });
}

/**
 * Evaluate the evidence-floor rule against the attached store, with the same
 * per-contract receipt binding kb_coverage uses.
 */
export async function collectEvidenceFloorViolations(
  context: OperationContext,
  rules: ReadonlySet<string>,
  options: EvidenceFloorOptions = {},
): Promise<Violation[]> {
  if (
    !REQUIREMENT_PROOF_RULES.some((rule) => rules.has(rule)) ||
    context.prolog === undefined
  )
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
  const checkedAt = options.checkedAt ?? context.clock().toISOString();
  const payload = await readRequirementProofPayload(
    context,
    snapshotEvidence,
    checkedAt,
  );
  const rows = payload.rows ?? [];
  const approvalFloor = schemaVersion >= APPROVAL_FLOOR_SCHEMA_VERSION;
  const findings: Violation[] = [];
  if (rules.has(AGENT_REQUIREMENT_UNAPPROVED_IMPLEMENTED_RULE) && approvalFloor)
    findings.push(
      ...unapprovedImplementedViolations(
        payload.unapprovedImplemented ?? [],
        checkedAt,
        authoredCreatedAtReader(context.workspaceRoot),
      ),
    );
  if (!rules.has(EVIDENCE_FLOOR_RULE)) return findings;
  // Before schema 15 an approval sets no floor; the upgrade pins the floor
  // of approved requirements without a passing proof path first.
  const violations = evidenceFloorViolations(
    approvalFloor
      ? rows
      : rows.filter((row) => row.requiredEvidenceSource !== "approval"),
    options,
  );
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
  return [...violations, ...findings];
}
