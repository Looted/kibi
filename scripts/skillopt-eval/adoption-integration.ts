import {
  type AdoptionReceipt,
  type AutoAdoptionInput,
  adoptSkillOptCandidate,
} from "./adoption";
import type {
  CorpusRoots,
  HeldOutEvaluation,
  TrainingInput,
  TrainingOutput,
} from "./real-workflow-types";
import { canonicalHash } from "./real-workflow-types";
import type { FrozenVariant } from "./variants";

// implements REQ-skillopt-automatic-adoption
// covered_by TEST-skillopt-automatic-adoption
export async function adoptEligibleCandidate(
  input: Readonly<{
    training: TrainingInput;
    trained: TrainingOutput;
    candidate: FrozenVariant;
    heldOut: HeldOutEvaluation;
    roots: CorpusRoots;
    adopt?: (input: AutoAdoptionInput) => Promise<AdoptionReceipt>;
  }>,
): Promise<AdoptionReceipt | Readonly<{ status: "unchanged" }>> {
  if (input.heldOut.eligibility !== "eligible") return { status: "unchanged" };
  const { training, trained, candidate, roots } = input;
  const eligibility = {
    runId: training.runId,
    signedEligibilityId: trained.trainerCheckpointHash,
    heldOutEligibility: input.heldOut.eligibility,
    candidateHash: candidate.bodyHash,
    authorizedRootSet: roots,
    lineage: {
      candidateHash: candidate.bodyHash,
      signedEligibilityId: trained.trainerCheckpointHash,
      authorizedRootSet: roots,
    },
  };
  return (input.adopt ?? adoptSkillOptCandidate)({
    repoRoot: training.sourceWorktree,
    candidate,
    frontmatterHash: candidate.frontmatterHash,
    resourcesHash: candidate.resourcesHash,
    eligibility: {
      ...eligibility,
      sealedEvidenceHash: canonicalHash({
        ...eligibility,
        lineage: eligibility.lineage,
      }),
    },
  });
}
