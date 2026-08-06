import { JsonValueSchema, contractHash } from "./contracts/common";
import {
  type BoundPhysicalCell,
  type MatrixVariant,
  predicateReplicateFor,
  receiptBindsCell,
} from "./held-out-cell-binding";
import type { ReservedPredicateMatrix } from "./held-out-evidence";

const Variants = ["baseline", "one-shot", "skillopt"] as const;

function completeVariantCells(
  cells: readonly BoundPhysicalCell[],
  expectedTaskCount: number,
): boolean {
  const keys = (variant: MatrixVariant): string =>
    cells
      .filter((cell) => cell.request.variant === variant)
      .map((cell) => `${cell.taskId}\u0000${cell.family}`)
      .sort()
      .join("\u0001");
  return (
    cells.length === expectedTaskCount * Variants.length &&
    new Set(cells.map((cell) => `${cell.taskId}\u0000${cell.request.variant}`))
      .size === cells.length &&
    Variants.every(
      (variant) =>
        cells.filter((cell) => cell.request.variant === variant).length ===
        expectedTaskCount,
    ) &&
    keys("baseline") === keys("one-shot") &&
    keys("baseline") === keys("skillopt")
  );
}

function completePredicateCells(
  reservation: ReservedPredicateMatrix,
  cells: readonly BoundPhysicalCell[],
): boolean {
  return (
    cells.length === 36 &&
    cells.every((cell) => {
      const replicate = predicateReplicateFor(cell.request);
      const evidence = cell.predicateEvidence;
      return (
        replicate !== null &&
        evidence !== undefined &&
        evidence.caseId === cell.taskId &&
        reservation.isReservedCell({
          caseId: cell.taskId,
          variant: cell.request.variant,
          replicate,
        })
      );
    }) &&
    new Set(
      cells.map(
        (cell) =>
          `${cell.taskId}\u0000${cell.request.variant}\u0000${cell.request.replicate}`,
      ),
    ).size === 36
  );
}

export function isCompleteHeldOutEvaluation(
  input: Readonly<{
    reservation: ReservedPredicateMatrix;
    cells: readonly BoundPhysicalCell[];
    predicate: readonly BoundPhysicalCell[];
    skill: readonly BoundPhysicalCell[];
    bundle: readonly BoundPhysicalCell[];
  }>,
): boolean {
  const predicateTaskIds = new Set(input.predicate.map((cell) => cell.taskId));
  return (
    input.cells.length === 96 &&
    new Set(input.cells.map((cell) => cell.receipt.result.episodeId)).size ===
      96 &&
    input.cells.every(receiptBindsCell) &&
    completePredicateCells(input.reservation, input.predicate) &&
    completeVariantCells(input.skill, 12) &&
    completeVariantCells(input.bundle, 8) &&
    input.skill.every(
      (cell) =>
        cell.request.replicate === undefined &&
        !predicateTaskIds.has(cell.taskId),
    ) &&
    input.bundle.every((cell) => cell.request.replicate === undefined)
  );
}

export function evidenceHashes(
  cells: readonly BoundPhysicalCell[],
): readonly string[] {
  return [
    ...new Set(
      cells.flatMap((cell) => [
        cell.receipt.result.evidenceIndexHash,
        cell.receipt.evidenceIndex.brokerTraceHash,
        cell.receipt.evidenceIndex.diagnosticReceiptHash,
        cell.receipt.evidenceIndex.finalStateHash,
      ]),
    ),
  ].sort();
}

export function episodeHashes(
  cells: readonly BoundPhysicalCell[],
): readonly string[] {
  return cells
    .map((cell) => contractHash(JsonValueSchema.parse(cell.receipt)))
    .sort();
}
