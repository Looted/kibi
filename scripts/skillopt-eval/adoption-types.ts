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

type AdoptionPhase =
  | "prepared"
  | "canonical-installed"
  | "mirrors-synced"
  | "receipt-installed";

export type AdoptionDependencies = Readonly<{
  runMirrorSync: RunMirrorSync;
  durabilityObserver?: DurabilityObserver;
  afterPhase?: (phase: AdoptionPhase) => Promise<void>;
}>;

export type PredicateEligibilityReceipt = Readonly<{
  runId: string;
  signedEligibilityId: string;
  heldOutEligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
  candidateHash: string;
  authorizedRootSet: PredicateRoots;
  lineage: Readonly<{
    candidateHash: string;
    signedEligibilityId: string;
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
