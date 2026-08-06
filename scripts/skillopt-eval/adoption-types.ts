import type { DurabilityObserver } from "./adoption-durable";
import type { ValidateApprovalInput } from "./approval";
import type { CanonicalSkill } from "./catalog";
import type { PredicateRoots } from "./fixtures/predicate-corpus";
import type { FrozenVariant } from "./variants";

export type AdoptionInput = ValidateApprovalInput &
  Readonly<{
    repoRoot: string;
  }>;

export type AdoptionPlan = Readonly<{
  skill: CanonicalSkill;
  canonicalPath: string;
  currentBodyHash: string;
  candidateBodyHash: string;
  mutationRequired: boolean;
}>;

export type AdoptionReceipt = AdoptionPlan &
  Readonly<{
    status: "adopted" | "unchanged" | "blocked";
    adoptionId?: string;
  }>;

export type RunMirrorSync = (repoRoot: string) => Promise<void>;

/**
 * Opaque, independently authenticated authorization for production mutation.
 * Repository-local evidence is deliberately absent from this contract: it may
 * support review, but cannot authorize an install.
 */
export type ExternalAdoptionVerdict = Readonly<{
  verdictId: string;
  authentication: string;
  sourceCanonicalPreimageHash: string;
  rootAuthorization: PredicateRoots;
  supervisorParentId: string;
  invocationId: string;
  runId: string;
  skill: CanonicalSkill;
  matrixId: string;
  fixtureClaimHash: string;
  candidateHash: string;
  terminalEvidenceHash: string;
  targetSet: readonly string[];
}>;

export type ExternalAdoptionVerdictVerifier = (
  verdict: ExternalAdoptionVerdict,
) => Promise<boolean>;

type AdoptionPhase =
  | "prepared"
  | "canonical-installed"
  | "mirrors-synced"
  | "receipt-installed";

export type AdoptionDependencies = Readonly<{
  runMirrorSync: RunMirrorSync;
  /**
   * Supplied by the production installer boundary. There is intentionally no
   * repository-hosted verifier or permissive default.
   */
  verifyExternalAdoptionVerdict?: ExternalAdoptionVerdictVerifier;
  durabilityObserver?: DurabilityObserver;
  afterPhase?: (phase: AdoptionPhase) => Promise<void>;
}>;

/**
 * Local integration seam for the held-out terminal eligibility receipt.
 * The terminal evaluator owns how it is produced; adoption only consumes it.
 */
export interface TerminalEligibilityReceipt {
  readonly eligibilityReceiptId: string;
  readonly heldOutEligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
  readonly candidateHash: string;
  readonly authorizedRootSet: PredicateRoots;
  readonly sealedEvidenceHash: string;
}

export type PredicateEligibilityReceipt = TerminalEligibilityReceipt &
  Readonly<{
    runId: string;
    lineage: Readonly<{
      candidateHash: string;
      trainerCheckpointHash: string;
      authorizedRootSet: PredicateRoots;
    }>;
  }>;

export type AutoAdoptionInput = Readonly<{
  repoRoot: string;
  candidate: FrozenVariant;
  frontmatterHash: string;
  resourcesHash: string;
  eligibility: PredicateEligibilityReceipt;
}>;

export class AdoptionIntegrityError extends Error {
  readonly name = "AdoptionIntegrityError";
}

export class AdoptionTransactionError extends Error {
  readonly name = "AdoptionTransactionError";

  constructor(readonly transactionCause: unknown) {
    super("adoption transaction failed", { cause: transactionCause });
  }
}
