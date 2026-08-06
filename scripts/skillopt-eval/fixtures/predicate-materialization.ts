import { createHash } from "node:crypto";
import type { PrivateExpectation } from "./predicate-cases";
import type {
  CandidateRootManifest,
  FrozenCandidateHashes,
  PredicateMaterialization,
  PredicateRoots,
} from "./predicate-corpus";
import { DETERMINISTIC_CANDIDATES } from "./predicate-corpus";

// implements REQ-skillopt-predicate-first-requirements

class PredicateMaterializationError extends Error {
  readonly name = "PredicateMaterializationError";
}

type PrivateCaseMap = ReadonlyMap<string, PrivateExpectation>;

export type FrozenMaterializationInput = {
  readonly roots: PredicateRoots;
  readonly candidateRootManifest: CandidateRootManifest;
  readonly trainCaseIds: readonly string[];
  readonly developmentCaseId: string;
  readonly heldOutCaseIds: readonly string[];
  readonly privateCaseMap: PrivateCaseMap;
  readonly publicRootDir: string;
  readonly privateRootDir: string;
};

/**
 * Freeze a materialized corpus into an immutable PredicateMaterialization.
 * Unsigned manifests cannot authorize; leak/duplicate/root-drift guards reject
 * integrity violations; withAdaptiveCandidate produces a permanently-ineligible
 * copy whose differing skillopt hash blocks terminal-matrix reservation.
 */
export function freezeMaterialization(
  input: FrozenMaterializationInput,
): PredicateMaterialization {
  return {
    roots: input.roots,
    candidateRootManifest: input.candidateRootManifest,
    frozenCandidateHashes: DETERMINISTIC_CANDIDATES,
    trainCaseIds: input.trainCaseIds,
    developmentCaseId: input.developmentCaseId,
    heldOutCaseIds: input.heldOutCaseIds,
    privateCaseMap: input.privateCaseMap,
    publicRootDir: input.publicRootDir,
    privateRootDir: input.privateRootDir,
    assertAuthorized() {
      throw new PredicateMaterializationError(
        "EXTERNAL_PREREQUISITE_MISSING: unsigned candidate-root manifest cannot authorize training or evaluation",
      );
    },
    eligibility: () => ({
      eligible: input.candidateRootManifest.signedByRootAuthority,
    }),
    injectLeak: (_token: string): never => {
      throw new PredicateMaterializationError(
        "forbidden: public corpus must not carry expected outcome tokens",
      );
    },
    injectDuplicateClaim: (): never => {
      throw new PredicateMaterializationError(
        "duplicate: a duplicate human claim/assertion set is rejected before materialization",
      );
    },
    mutateRootByte: (rootKey: keyof PredicateRoots): never => {
      const current = (input.roots as Record<string, string>)[rootKey];
      if (typeof current !== "string" || !/^[a-f0-9]{64}$/.test(current)) {
        throw new PredicateMaterializationError(
          `root_drift: unknown root ${rootKey}`,
        );
      }
      throw new PredicateMaterializationError(
        `root_drift: ${rootKey} digest would change; any drift requires new authorization`,
      );
    },
    withAdaptiveCandidate(): PredicateMaterialization {
      const adaptiveHashes: FrozenCandidateHashes = {
        baseline: DETERMINISTIC_CANDIDATES.baseline,
        oneShot: DETERMINISTIC_CANDIDATES.oneShot,
        skillopt: createHash("sha256")
          .update("predicate-skillopt-bytes-adaptive")
          .digest("hex"),
      };
      return {
        ...freezeMaterialization(input),
        candidateRootManifest: {
          ...input.candidateRootManifest,
          unsignedRationale:
            "adaptive candidate after held-out outcome is forbidden; this manifest is permanently ineligible.",
        },
        frozenCandidateHashes: adaptiveHashes,
        eligibility: () => ({ eligible: false }),
        assertAuthorized: () => {
          throw new PredicateMaterializationError(
            "adaptive candidate after held-out is ineligible",
          );
        },
      };
    },
  };
}
