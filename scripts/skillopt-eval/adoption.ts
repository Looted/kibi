import {
  adoptApprovedSnapshot,
  defaultRunMirrorSync,
} from "./adoption-approved";
import { withExclusiveAdoptionLock } from "./adoption-lock";
import {
  canonicalTargetSet,
  deriveAdoptionId,
  loadCanonicalSnapshot,
  loadCanonicalSurface,
  publicPlan,
  validatePredicateEligibility,
} from "./adoption-snapshot";
import {
  executeExactAdoption,
  recoverAdoptionWals,
} from "./adoption-transaction";
import type {
  AdoptionDependencies,
  AdoptionInput,
  AdoptionPlan,
  AdoptionReceipt,
  AutoAdoptionInput,
} from "./adoption-types";

export {
  AdoptionIntegrityError,
  AdoptionTransactionError,
} from "./adoption-types";
export type {
  AdoptionDependencies,
  AdoptionInput,
  AdoptionPlan,
  AdoptionReceipt,
  AutoAdoptionInput,
  PredicateEligibilityReceipt,
  RunMirrorSync,
} from "./adoption-types";
export { deriveAdoptionId } from "./adoption-snapshot";

const REQUIRED_CANONICAL_GUIDANCE = [
  "npx --no-install kibi",
  "bunx --no-install kibi",
  "Do not read or edit files inside `.kb` directly",
] as const;

export async function planSkillAdoption(
  input: AdoptionInput,
): Promise<AdoptionPlan> {
  return publicPlan(await loadCanonicalSnapshot(input));
}

export async function adoptApprovedSkill(
  input: AdoptionInput,
  dependencies: AdoptionDependencies = { runMirrorSync: defaultRunMirrorSync },
): Promise<AdoptionReceipt> {
  return adoptApprovedSnapshot(
    input.repoRoot,
    await loadCanonicalSnapshot(input),
    dependencies,
  );
}

// implements REQ-skillopt-automatic-adoption
export async function adoptSkillOptCandidate(
  input: AutoAdoptionInput,
  dependencies: AdoptionDependencies = { runMirrorSync: defaultRunMirrorSync },
): Promise<AdoptionReceipt> {
  validatePredicateEligibility(input);
  return withExclusiveAdoptionLock(input.repoRoot, async () => {
    await recoverAdoptionWals(input.repoRoot, dependencies);
    const snapshot = await loadCanonicalSurface(input);
    const adoptionId = deriveId(input, snapshot);
    const baselineBody = snapshot.markdown.slice(snapshot.frontmatter.length);
    if (dropsRequiredGuidance(baselineBody, input.candidate.body)) {
      return { ...publicPlan(snapshot), status: "blocked", adoptionId };
    }
    return executeExactAdoption(
      {
        repoRoot: input.repoRoot,
        adoptionId,
        plan: publicPlan(snapshot),
        canonicalBefore: snapshot.markdown,
        candidateMarkdown: snapshot.candidateMarkdown,
        canonicalIdentity: snapshot.canonicalIdentity,
      },
      dependencies,
    );
  });
}

function deriveId(
  input: AutoAdoptionInput,
  snapshot: Awaited<ReturnType<typeof loadCanonicalSurface>>,
): string {
  return deriveAdoptionId(
    input.eligibility,
    canonicalTargetSet(input.repoRoot, snapshot),
  );
}

function dropsRequiredGuidance(
  baselineBody: string,
  candidateBody: string,
): boolean {
  return REQUIRED_CANONICAL_GUIDANCE.some(
    (phrase) =>
      baselineBody.includes(phrase) && !candidateBody.includes(phrase),
  );
}
