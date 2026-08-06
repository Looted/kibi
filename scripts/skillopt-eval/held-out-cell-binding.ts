import { JsonValueSchema, contractHash } from "./contracts/common";
import { type EpisodeRequest, EpisodeRequestSchema } from "./contracts/episode";
import type { HeldOutPhysicalCell } from "./held-out-eligibility";
import type { CodexEpisodeReceipt } from "./runtime/codex-episode";
import { CodexEpisodeReceiptSchema } from "./runtime/codex-episode";
import type { PredicateCaseEvidence } from "./scoring/cell";
import {
  type GateCell,
  evaluateBundleGate,
  evaluateHeldOutPredicateGate,
  evaluateSkillGate,
} from "./scoring/gates";

export type MatrixVariant = "baseline" | "one-shot" | "skillopt";
export type BoundPhysicalCell = Omit<
  HeldOutPhysicalCell,
  "request" | "receipt"
> &
  Readonly<{
    request: EpisodeRequest;
    receipt: CodexEpisodeReceipt;
  }>;
export type GateMatrix = Readonly<{
  candidate: readonly GateCell[];
  baseline: readonly GateCell[];
  oneShot: readonly GateCell[];
}>;

function terminalCategory(receipt: CodexEpisodeReceipt): string | null {
  switch (receipt.result.status) {
    case "completed":
      return receipt.result.hardPass ? null : "behavioral_failure";
    case "behavioral-failure":
      return "behavioral_failure";
    case "infrastructure-failure":
      return "incomplete_evidence";
    case "interrupted":
      return "pre_action_infrastructure_failure";
    case "budget-exhausted":
      return "budget_stop";
    case "evidence-conflict":
      return "evidence_conflict";
    default:
      return receipt.result.status satisfies never;
  }
}

function gateCell(cell: BoundPhysicalCell): GateCell {
  const result = cell.receipt.result;
  const passing = result.status === "completed" && result.hardPass;
  const ambiguous =
    result.status === "infrastructure-failure" ||
    result.status === "interrupted" ||
    result.status === "budget-exhausted" ||
    result.status === "evidence-conflict";
  return {
    taskId: cell.taskId,
    family: cell.family,
    score: result.score,
    hard: passing ? 1 : 0,
    outcome: passing ? "pass" : ambiguous ? "ambiguous" : "fail",
    terminalCategory: terminalCategory(cell.receipt),
    criticalFailureCount: result.criticalFailures.length,
  };
}

function predicateReplicate(request: EpisodeRequest): 1 | 2 | 3 | null {
  const replicate = request.replicate;
  return replicate === 1 || replicate === 2 || replicate === 3
    ? replicate
    : null;
}

function predicateGateCell(cell: BoundPhysicalCell) {
  const replicate = predicateReplicate(cell.request);
  const evidence: PredicateCaseEvidence = cell.predicateEvidence ?? {
    outcome: "fail" as const,
    caseId: cell.taskId,
    failure: "malformed-snapshot" as const,
  };
  return {
    ...gateCell(cell),
    caseId: cell.taskId,
    variant: cell.request.variant,
    ...(replicate === null ? {} : { replicate }),
    predicateEvidence: evidence,
  };
}

export function bindPhysicalCells(
  cells: readonly HeldOutPhysicalCell[],
): readonly BoundPhysicalCell[] {
  return cells.flatMap((cell) => {
    const request = EpisodeRequestSchema.safeParse(cell.request);
    const receipt = CodexEpisodeReceiptSchema.safeParse(cell.receipt);
    return request.success && receipt.success
      ? [{ ...cell, request: request.data, receipt: receipt.data }]
      : [];
  });
}

export function predicateGate(
  cells: readonly BoundPhysicalCell[],
): ReturnType<typeof evaluateHeldOutPredicateGate> {
  return evaluateHeldOutPredicateGate(cells.map(predicateGateCell));
}

export function skillGate(
  predicate: readonly BoundPhysicalCell[],
  skill: readonly BoundPhysicalCell[],
): ReturnType<typeof evaluateSkillGate> {
  return evaluateSkillGate(matrix([...predicate, ...skill]));
}

export function bundleGate(
  cells: readonly BoundPhysicalCell[],
): ReturnType<typeof evaluateBundleGate> {
  return evaluateBundleGate(matrix(cells));
}

export function frozenHashes(
  cells: readonly BoundPhysicalCell[],
): Readonly<{ baseline: string; oneShot: string; skillopt: string }> | null {
  const hashFor = (variant: MatrixVariant): string | null => {
    const hashes = cells
      .filter((cell) => cell.request.variant === variant)
      .map((cell) => cell.request.runLockHash);
    const first = hashes[0];
    return first === undefined || hashes.some((hash) => hash !== first)
      ? null
      : first;
  };
  const baseline = hashFor("baseline");
  const oneShot = hashFor("one-shot");
  const skillopt = hashFor("skillopt");
  return baseline === null || oneShot === null || skillopt === null
    ? null
    : { baseline, oneShot, skillopt };
}

function matrix(cells: readonly BoundPhysicalCell[]): GateMatrix {
  const cellsFor = (variant: MatrixVariant): readonly GateCell[] =>
    cells.filter((cell) => cell.request.variant === variant).map(gateCell);
  return {
    candidate: cellsFor("skillopt"),
    baseline: cellsFor("baseline"),
    oneShot: cellsFor("one-shot"),
  };
}

export function receiptBindsCell(cell: BoundPhysicalCell): boolean {
  const { request, receipt } = cell;
  return (
    request.taskId === cell.taskId &&
    receipt.result.episodeId === request.episodeId &&
    receipt.result.runId === request.runId &&
    receipt.result.runLockHash === request.runLockHash &&
    Object.values(receipt.result.reconciliation).every(Boolean) &&
    receipt.result.evidenceIndexHash ===
      contractHash(JsonValueSchema.parse(receipt.evidenceIndex))
  );
}

export function predicateReplicateFor(
  request: EpisodeRequest,
): 1 | 2 | 3 | null {
  return predicateReplicate(request);
}
