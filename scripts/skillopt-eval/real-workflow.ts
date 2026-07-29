import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  loadBundledSkill,
  readBundledSkillResource,
} from "../../packages/cli/src/public/skills";
import { adoptEligibleCandidate } from "./adoption-integration";
import type { CanonicalSkill } from "./catalog";
import { PREDICATE_CASES } from "./fixtures/predicate-cases";
import { materializePredicateCorpus } from "./fixtures/predicate-corpus";
import { defaultEvaluateHeldOut } from "./held-out-evaluation";
import { RunStore } from "./orchestration-store";
import { sourceWorktreeIsClean } from "./preflight";
import {
  type CorpusRoots,
  type PredicateDescriptor,
  type RealOptimizationDependencies,
  type RealOptimizationOptions,
  type RealOptimizationResult,
  ReviewSchema,
  RootsSchema,
  type TrainingInput,
  canonicalHash,
} from "./real-workflow-types";
import {
  defaultEvaluateDevelopment,
  defaultTrain,
  oneShotVariant,
} from "./training-setup";
import { createBaselineVariant, freezeCandidateVariant } from "./variants";

export type {
  CodexCellRuntime,
  RealOptimizationDependencies,
  RealOptimizationOptions,
  RealOptimizationResult,
} from "./real-workflow-types";

async function surface(skill: CanonicalSkill): Promise<{
  readonly body: string;
  readonly frontmatterHash: string;
  readonly resourcesHash: string;
}> {
  const bundle = loadBundledSkill(skill);
  const resources = Object.fromEntries(
    await Promise.all(
      [...(bundle.manifest.resources ?? [])]
        .sort()
        .map(async (resource) => [
          resource,
          readBundledSkillResource(skill, resource),
        ]),
    ),
  );
  return {
    body: bundle.body,
    frontmatterHash: canonicalHash(bundle.manifest),
    resourcesHash: canonicalHash(resources),
  };
}

function publicDescriptors(
  split: "train" | "development",
): readonly PredicateDescriptor[] {
  return PREDICATE_CASES.filter((entry) => entry.split === split).map(
    (entry) => ({
      id: entry.caseId,
      family: entry.semanticClass,
      split,
      publicClaim: entry.publicClaim,
    }),
  );
}

async function predicateRoots(artifactRoot: string): Promise<CorpusRoots> {
  const corpusRoot = join(artifactRoot, "predicate-corpus");
  const manifestPath = join(corpusRoot, "candidate-root-manifest.json");
  if (!existsSync(manifestPath))
    return materializePredicateCorpus({ artifactRoot: corpusRoot }).roots;
  const persisted = RootsSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")).roots,
  );
  const currentRoot = `${corpusRoot}.current`;
  try {
    const current = materializePredicateCorpus({
      artifactRoot: currentRoot,
    }).roots;
    if (canonicalHash(persisted) !== canonicalHash(current))
      throw new Error("predicate_root_drift");
    return current;
  } finally {
    await rm(currentRoot, { recursive: true, force: true });
  }
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function runRealOptimization(
  options: RealOptimizationOptions,
  dependencies: Partial<RealOptimizationDependencies> = {},
): Promise<RealOptimizationResult> {
  const root = resolve(options.artifactRoot);
  const env = options.env ?? process.env;
  const sourceClean =
    dependencies.sourceClean ??
    ((source, currentEnv) => sourceWorktreeIsClean(source, currentEnv));
  if (!(await sourceClean(resolve(options.sourceWorktree), env)))
    throw new Error("source_not_clean");
  const store = new RunStore(root, options.runId);
  await store.acquire();
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const roots = await predicateRoots(root);
    const candidates: Array<{
      skill: CanonicalSkill;
      baselineBodyHash: string;
      candidateBodyHash: string;
      trainerCheckpointHash: string;
      development: {
        mean: number;
        hardPasses: number;
        worstFamilyMean: number;
      };
      heldOutEligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
      heldOutCellCount: number;
      adoption: "adopted" | "unchanged" | "blocked";
    }> = [];
    for (const skill of options.skills) {
      const baseline = createBaselineVariant({
        skill,
        ...(await surface(skill)),
      });
      const training: TrainingInput = {
        runId: options.runId,
        skill,
        sourceWorktree: resolve(options.sourceWorktree),
        artifactRoot: join(root, "skills", skill),
        maxSteps: options.maxSteps,
        baseline,
        trainDescriptors: publicDescriptors("train"),
        developmentDescriptors: publicDescriptors("development"),
        corpusRoots: roots,
        env,
        ...(options.cellRuntime === undefined
          ? {}
          : { cellRuntime: options.cellRuntime }),
      };
      const trained = await (dependencies.train ?? defaultTrain)(training);
      const candidate = freezeCandidateVariant({
        skill,
        variant: "skillopt",
        body: trained.candidateBody,
        frontmatterHash: baseline.frontmatterHash,
        resourcesHash: baseline.resourcesHash,
        provenance: "skillopt",
        sourceRequestHash: trained.trainerCheckpointHash,
      });
      const development = await (
        dependencies.evaluateDevelopment ?? defaultEvaluateDevelopment
      )({
        skill,
        candidate,
        descriptors: training.developmentDescriptors,
        sourceWorktree: training.sourceWorktree,
        artifactRoot: training.artifactRoot,
        runId: options.runId,
        env,
        ...(options.cellRuntime === undefined
          ? {}
          : { runtime: options.cellRuntime }),
      });
      const oneShot = await (dependencies.oneShot ?? oneShotVariant)(training);
      const heldOut = await (
        dependencies.evaluateHeldOut ?? defaultEvaluateHeldOut
      )({
        skill,
        variants: [baseline, oneShot, candidate],
        sourceWorktree: training.sourceWorktree,
        artifactRoot: training.artifactRoot,
        runId: options.runId,
        env,
        ...(options.cellRuntime === undefined
          ? {}
          : { runtime: options.cellRuntime }),
      });
      const adoption = await adoptEligibleCandidate({
        training,
        trained,
        candidate,
        heldOut,
        roots,
        adopt: dependencies.adopt,
      });
      await mkdir(training.artifactRoot, { recursive: true, mode: 0o700 });
      await writeFile(
        join(training.artifactRoot, "candidate_skill.md"),
        candidate.body,
        { encoding: "utf8", mode: 0o600 },
      );
      candidates.push({
        skill,
        baselineBodyHash: baseline.bodyHash,
        candidateBodyHash: candidate.bodyHash,
        trainerCheckpointHash: trained.trainerCheckpointHash,
        development,
        heldOutEligibility: heldOut.eligibility,
        heldOutCellCount: heldOut.cellCount,
        adoption: adoption.status,
      });
    }
    const heldOutEligibility = candidates.every(
      (candidate) => candidate.heldOutEligibility === "eligible",
    )
      ? "eligible"
      : "HELD_OUT_MATRIX_INELIGIBLE";
    const review = ReviewSchema.parse({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-optimization-review",
      runId: options.runId,
      status: heldOutEligibility === "eligible" ? "evaluated" : "blocked",
      artifactRoot: root,
      skills: [...options.skills],
      candidates,
      sourceModified: candidates.some(
        (candidate) => candidate.adoption === "adopted",
      ),
      generatedAt: new Date().toISOString(),
    });
    await writeFile(
      join(root, "optimization-review.json"),
      `${JSON.stringify(review, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    return {
      status: review.status,
      runId: options.runId,
      skills: [...options.skills],
      candidates: candidates.map(({ skill, candidateBodyHash }) => ({
        skill,
        candidateBodyHash,
      })),
      heldOutEligibility,
      paidModelCalls: options.skills.length * (options.maxSteps + 1),
    };
  } finally {
    await store.release();
  }
}
