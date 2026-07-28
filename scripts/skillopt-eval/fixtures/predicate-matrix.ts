import { createHash } from "node:crypto";
import { type JsonValue, canonicalJson } from "../contracts/common";
import type {
  FrozenCandidateHashes,
  OrchestrationEligibility,
  PredicateMaterialization,
} from "./predicate-corpus";

// implements REQ-skillopt-predicate-first-requirements

class PredicateMatrixError extends Error {
  readonly name = "PredicateMatrixError";
}

export type MatrixState = "pending" | "running" | "terminal";

export type PredicateMatrixReceipt = Readonly<{
  matrixId: string;
  cellCount: number;
  reservedBeforeCellOne: boolean;
  receiptBytes: string;
}>;

export type ReservedPredicateMatrix = Readonly<{
  matrixId: string;
  cellCount: number;
  reservedBeforeCellOne: boolean;
  receiptBytes: string;
  transition: (next: MatrixState) => boolean;
  orchestrationView: () => "eligible" | "ineligible";
}>;

const RESERVED_MATRIXES = new Map<string, ReservedPredicateMatrix>();
const TERMINAL_CORPORA = new Map<string, FrozenCandidateHashes>();

/** Convert readonly/structured values into mutable JSON for JCS canonicalization. */
function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

/**
 * Reserve the complete 36-cell terminal matrix (3 candidates × 4 held-out
 * cases × 3 variants) before cell one executes. One matrix id transitions
 * pending→running→terminal once. Retries return the byte-identical cached
 * aggregate receipt. Adaptive candidates after a terminal matrix are rejected.
 * Orchestration sees only generic aggregate views, never per-case detail.
 */
export function reservePredicateMatrix(options: {
  readonly corpus: PredicateMaterialization;
  readonly candidateHashes: FrozenCandidateHashes;
}): ReservedPredicateMatrix {
  const { corpus, candidateHashes } = options;
  const terminalKey = corpus.roots.baseline;
  const terminalCandidates = TERMINAL_CORPORA.get(terminalKey);
  if (
    terminalCandidates !== undefined &&
    (candidateHashes.skillopt !== terminalCandidates.skillopt ||
      candidateHashes.baseline !== terminalCandidates.baseline ||
      candidateHashes.oneShot !== terminalCandidates.oneShot)
  ) {
    throw new PredicateMatrixError(
      "adaptive candidate after held-out is ineligible: a terminal matrix already exists for this corpus with a different frozen candidate set",
    );
  }
  if (
    candidateHashes.skillopt !== corpus.frozenCandidateHashes.skillopt ||
    candidateHashes.baseline !== corpus.frozenCandidateHashes.baseline ||
    candidateHashes.oneShot !== corpus.frozenCandidateHashes.oneShot
  ) {
    throw new PredicateMatrixError(
      "adaptive candidate after held-out is ineligible: candidate hashes must match the frozen set",
    );
  }
  const matrixKey = `${terminalKey}:${candidateHashes.baseline}:${candidateHashes.oneShot}:${candidateHashes.skillopt}`;
  const cached = RESERVED_MATRIXES.get(matrixKey);
  if (cached !== undefined) {
    return cached;
  }
  return buildAndCacheMatrix(corpus, candidateHashes, matrixKey);
}

function buildAndCacheMatrix(
  corpus: PredicateMaterialization,
  candidateHashes: FrozenCandidateHashes,
  matrixKey: string,
): ReservedPredicateMatrix {
  const heldOutCaseIds = corpus.heldOutCaseIds;
  if (heldOutCaseIds.length !== 4) {
    throw new PredicateMatrixError(
      `held-out matrix requires exactly 4 held-out cases; got ${heldOutCaseIds.length}`,
    );
  }
  const variants = ["baseline", "one-shot", "skillopt"] as const;
  const cells: { candidate: string; caseId: string; variant: string }[] = [];
  for (const candidate of variants) {
    for (const caseId of heldOutCaseIds) {
      for (const variant of variants) {
        cells.push({ candidate, caseId, variant });
      }
    }
  }
  if (cells.length !== 36) {
    throw new PredicateMatrixError(
      `terminal matrix must contain 36 cells; got ${cells.length}`,
    );
  }
  const matrixId = deterministicMatrixId(matrixKey);
  const receiptBytes = canonicalJson(
    toJsonValue({
      matrixId,
      cellCount: cells.length,
      reservedBeforeCellOne: true,
      roots: corpus.roots,
      candidateHashes,
      cells: cells.map((cell) => ({
        candidate: cell.candidate,
        caseId: "HELD_OUT_CASE",
        variant: cell.variant,
      })),
    }),
  );
  let state: MatrixState = "pending";
  const reserved: ReservedPredicateMatrix = {
    matrixId,
    cellCount: cells.length,
    reservedBeforeCellOne: true,
    receiptBytes,
    transition(next: MatrixState) {
      const order: readonly MatrixState[] = ["pending", "running", "terminal"];
      if (order.indexOf(next) !== order.indexOf(state) + 1) {
        return false;
      }
      state = next;
      if (state === "terminal") {
        TERMINAL_CORPORA.set(corpus.roots.baseline, candidateHashes);
      }
      return true;
    },
    orchestrationView: () =>
      state === "terminal" && corpus.eligibility().eligible
        ? "eligible"
        : "ineligible",
  };
  RESERVED_MATRIXES.set(matrixKey, reserved);
  return reserved;
}

function deterministicMatrixId(matrixKey: string): string {
  const digest = createHash("sha256").update(matrixKey).digest("hex");
  const hex = digest.slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export function __resetPredicateMatrixCacheForTests(): void {
  RESERVED_MATRIXES.clear();
  TERMINAL_CORPORA.clear();
}

// Re-export types that consumers import from this entry point.
export type { OrchestrationEligibility } from "./predicate-corpus";
