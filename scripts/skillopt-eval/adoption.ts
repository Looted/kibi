import {
  adoptApprovedSnapshot,
  defaultRunMirrorSync,
} from "./adoption-approved";
import {
  withExclusiveAdoptionLock,
  withSharedAdoptionLock,
} from "./adoption-lock";
import {
  canonicalTargetSet,
  deriveAdoptionId,
  loadCanonicalSnapshot,
  loadCanonicalSurface,
  publicPlan,
  validateExternalAdoptionVerdict,
} from "./adoption-snapshot";
import {
  executeExactAdoption,
  recoverAdoptionWals,
} from "./adoption-transaction";
import { AdoptionIntegrityError } from "./adoption-types";
import type {
  AdoptionDependencies,
  AdoptionInput,
  AdoptionPlan,
  AdoptionReceipt,
  AutoAdoptionInput,
  ExternalAdoptionVerdict,
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
  ExternalAdoptionVerdict,
  PredicateEligibilityReceipt,
  RunMirrorSync,
  TerminalEligibilityReceipt,
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
  return withSharedAdoptionLock(input.repoRoot, async () =>
    publicPlan(await loadCanonicalSnapshot(input)),
  );
}

export async function adoptApprovedSkill(
  input: AdoptionInput,
  dependencies: AdoptionDependencies = { runMirrorSync: defaultRunMirrorSync },
): Promise<AdoptionReceipt> {
  return withExclusiveAdoptionLock(input.repoRoot, async () =>
    adoptApprovedSnapshot(
      input.repoRoot,
      await loadCanonicalSnapshot(input),
      dependencies,
    ),
  );
}

// implements REQ-skillopt-automatic-adoption
export async function adoptSkillOptCandidate(
  input: AutoAdoptionInput,
  verdict: ExternalAdoptionVerdict | undefined,
  dependencies: AdoptionDependencies = { runMirrorSync: defaultRunMirrorSync },
): Promise<AdoptionReceipt> {
  return withExclusiveAdoptionLock(input.repoRoot, async () => {
    if (verdict === undefined)
      throw new AdoptionIntegrityError("external adoption verdict is required");
    await recoverAdoptionWals(input.repoRoot, dependencies);
    const snapshot = await loadCanonicalSurface(input);
    await validateExternalAdoptionVerdict(
      input,
      verdict,
      snapshot,
      dependencies.verifyExternalAdoptionVerdict,
    );
    const adoptionId = deriveId(input, verdict, snapshot);
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
  verdict: ExternalAdoptionVerdict,
  snapshot: Awaited<ReturnType<typeof loadCanonicalSurface>>,
): string {
  return deriveAdoptionId(
    verdict,
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
