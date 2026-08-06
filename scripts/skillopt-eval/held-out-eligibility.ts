import type { EpisodeRequest } from "./contracts/episode";
import {
  bindPhysicalCells,
  bundleGate,
  frozenHashes,
  predicateGate,
  skillGate,
} from "./held-out-cell-binding";
import {
  episodeHashes,
  evidenceHashes,
  isCompleteHeldOutEvaluation,
} from "./held-out-completeness";
import type { ReservedPredicateMatrix } from "./held-out-evidence";
import type { CodexEpisodeReceipt } from "./runtime/codex-episode";
import type { PredicateCaseEvidence } from "./scoring/cell";

// implements REQ-skillopt-predicate-first-requirements
type PhysicalCellKind = "predicate" | "skill" | "bundle";

export type HeldOutPhysicalCell = Readonly<{
  kind: PhysicalCellKind;
  taskId: string;
  family: string;
  request: EpisodeRequest;
  receipt: CodexEpisodeReceipt;
  predicateEvidence?: PredicateCaseEvidence;
}>;
export type HeldOutGateOutcomes = Readonly<{
  eligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
  reservationHash: string;
  authorizationRootHash: string;
  physicalCellCount: number;
  frozenVariantHashes: Readonly<{
    baseline: string;
    oneShot: string;
    skillopt: string;
  }> | null;
  episodeHashes: readonly string[];
  evidenceHashes: readonly string[];
  gateOutcomes: Readonly<{
    predicate: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
    skill: Readonly<{
      outcome: "pass" | "fail" | "ambiguous";
      adoptionEligible: boolean;
    }>;
    bundle: Readonly<{
      outcome: "pass" | "fail" | "ambiguous";
      adoptionEligible: boolean;
    }>;
  }>;
}>;

export function evaluateHeldOutGateOutcomes(
  input: Readonly<{
    reservation: ReservedPredicateMatrix;
    physicalCells: readonly HeldOutPhysicalCell[];
  }>,
): HeldOutGateOutcomes {
  const boundCells = bindPhysicalCells(input.physicalCells);
  const predicate = boundCells.filter((cell) => cell.kind === "predicate");
  const skill = boundCells.filter((cell) => cell.kind === "skill");
  const bundle = boundCells.filter((cell) => cell.kind === "bundle");
  const predicateVerdict = predicateGate(predicate);
  const representativePredicate = predicate.filter(
    (cell) => cell.request.replicate === 1,
  );
  const skillVerdict = skillGate(representativePredicate, skill);
  const bundleVerdict = bundleGate(bundle);
  const hashes = frozenHashes(boundCells);
  const complete =
    boundCells.length === input.physicalCells.length &&
    isCompleteHeldOutEvaluation({
      reservation: input.reservation,
      cells: boundCells,
      predicate,
      skill,
      bundle,
    }) &&
    hashes !== null &&
    input.reservation.matchesFrozenCandidateHashes(hashes);
  const eligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE" =
    complete &&
    predicateVerdict.eligibility === "eligible" &&
    skillVerdict.adoptionEligible &&
    bundleVerdict.adoptionEligible
      ? "eligible"
      : "HELD_OUT_MATRIX_INELIGIBLE";
  return {
    eligibility,
    reservationHash: input.reservation.reservationHash,
    authorizationRootHash: input.reservation.authorizationRootHash,
    physicalCellCount: input.physicalCells.length,
    frozenVariantHashes: hashes,
    episodeHashes: episodeHashes(boundCells),
    evidenceHashes: evidenceHashes(boundCells),
    gateOutcomes: {
      predicate: predicateVerdict.eligibility,
      skill: {
        outcome: skillVerdict.outcome,
        adoptionEligible: skillVerdict.adoptionEligible,
      },
      bundle: {
        outcome: bundleVerdict.outcome,
        adoptionEligible: bundleVerdict.adoptionEligible,
      },
    },
  };
}
