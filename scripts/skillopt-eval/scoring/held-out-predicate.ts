import { PREDICATE_HELD_OUT_CASE_IDS } from "../fixtures/predicate-cases";
import type { PredicateCaseEvidence } from "./cell";
import type { GateCell } from "./gates";

export type PredicateVariant = "baseline" | "one-shot" | "skillopt";
type PassingPredicateEvidence = Extract<
  PredicateCaseEvidence,
  Readonly<{ outcome: "pass" }>
>;

export type HeldOutPredicateGateCell = GateCell &
  Readonly<{
    caseId: string;
    variant: PredicateVariant;
    replicate?: 1 | 2 | 3;
    predicateEvidence: PredicateCaseEvidence;
  }>;

export type HeldOutPredicateGateVerdict = Readonly<{
  eligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
}>;

function isPassingPredicateEvidence(
  evidence: PredicateCaseEvidence,
): evidence is PassingPredicateEvidence {
  return evidence.outcome === "pass";
}

function isHardPassingHeldOutCell(cell: HeldOutPredicateGateCell): boolean {
  return (
    cell.score >= 85 &&
    cell.hard === 1 &&
    cell.outcome === "pass" &&
    cell.terminalCategory === null &&
    cell.criticalFailureCount === 0 &&
    isPassingPredicateEvidence(cell.predicateEvidence) &&
    cell.predicateEvidence.caseId === cell.caseId
  );
}

export function evaluateHeldOutPredicateGate(
  cells: readonly HeldOutPredicateGateCell[],
): HeldOutPredicateGateVerdict {
  const variants: readonly PredicateVariant[] = [
    "baseline",
    "one-shot",
    "skillopt",
  ];
  const replicates = [1, 2, 3] as const;
  const expectedCaseIds = new Set(PREDICATE_HELD_OUT_CASE_IDS);
  const complete =
    cells.length ===
      expectedCaseIds.size * variants.length * replicates.length &&
    cells.every((cell) => expectedCaseIds.has(cell.caseId)) &&
    cells.every((cell) =>
      replicates.some((replicate) => cell.replicate === replicate),
    ) &&
    new Set(
      cells.map(
        (cell) => `${cell.caseId}\u0000${cell.variant}\u0000${cell.replicate}`,
      ),
    ).size ===
      expectedCaseIds.size * variants.length * replicates.length;
  return {
    eligibility:
      complete && cells.every(isHardPassingHeldOutCell)
        ? "eligible"
        : "HELD_OUT_MATRIX_INELIGIBLE",
  };
}
