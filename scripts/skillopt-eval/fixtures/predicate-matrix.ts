import { buildHeldOutReservation } from "../held-out-evidence";
import type { ReservedPredicateMatrix } from "../held-out-evidence";
import type {
  FrozenCandidateHashes,
  PredicateMaterialization,
} from "./predicate-corpus";
export type {
  PredicateMatrixCell,
  PredicateReplicate,
  PredicateVariant,
  ReservedPredicateMatrix,
} from "../held-out-evidence";

// implements REQ-skillopt-predicate-first-requirements

export function reservePredicateMatrix(options: {
  readonly corpus: PredicateMaterialization;
  readonly candidateHashes: FrozenCandidateHashes;
  readonly runId: string;
  readonly fixtureClaimRoot: string;
}): ReservedPredicateMatrix {
  return buildHeldOutReservation({
    roots: options.corpus.roots,
    candidateHashes: options.candidateHashes,
    heldOutCaseIds: options.corpus.heldOutCaseIds,
    runId: options.runId,
    skill: "kibi-usage",
    fixtureClaimRoot: options.fixtureClaimRoot,
  });
}
