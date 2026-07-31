import { canonicalJson, contractHash } from "./contracts/common";
import {
  type HeldOutPhysicalCell,
  evaluateHeldOutGateOutcomes,
} from "./held-out-eligibility";
import {
  type HeldOutTerminalReceipt,
  HeldOutTerminalReceiptSchema,
} from "./held-out-evidence";
import type { ReservedPredicateMatrix } from "./held-out-evidence";
import type { HeldOutEvaluation } from "./real-workflow-types";

export type HeldOutEligibilityReceipt = Readonly<{
  eligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
  evidenceId: string;
  receiptBytes: string;
  terminalReceipt: HeldOutTerminalReceipt;
}>;

export function evaluateHeldOutMatrix(
  input: Readonly<{
    reservation: ReservedPredicateMatrix;
    physicalCells: readonly HeldOutPhysicalCell[];
  }>,
): HeldOutEligibilityReceipt {
  const outcome = evaluateHeldOutGateOutcomes(input);
  const terminalReceipt = HeldOutTerminalReceiptSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "held-out-terminal-eligibility-receipt",
    ...outcome,
  });
  return {
    eligibility: terminalReceipt.eligibility,
    evidenceId: contractHash(terminalReceipt),
    receiptBytes: canonicalJson(terminalReceipt),
    terminalReceipt,
  };
}

export function heldOutEvaluationFromReceipt(
  receipt: HeldOutTerminalReceipt,
): HeldOutEvaluation {
  return receipt.eligibility === "eligible"
    ? {
        eligibility: receipt.eligibility,
        cellCount: receipt.physicalCellCount,
        productionAdoption: "external-verdict-required",
      }
    : {
        eligibility: receipt.eligibility,
        cellCount: receipt.physicalCellCount,
      };
}

export function reviewHeldOutMatrix(
  input: Readonly<{
    reservation: ReservedPredicateMatrix;
    physicalCells: readonly HeldOutPhysicalCell[];
  }>,
): HeldOutEvaluation {
  return heldOutEvaluationFromReceipt(
    evaluateHeldOutMatrix(input).terminalReceipt,
  );
}
