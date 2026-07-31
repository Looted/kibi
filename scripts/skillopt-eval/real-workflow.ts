import type { ArtifactPath } from "./artifact-path";

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
} from "../../packages/cli/src/public/skills";
import { withSharedAdoptionLock } from "./adoption-lock";
import type { CanonicalSkill } from "./catalog";
import { defaultEvaluateHeldOut } from "./held-out-evaluation";
import { RunStore } from "./orchestration-store";
import { sourceWorktreeIsClean } from "./preflight";
import {
  predicateDescriptors,
  predicateRoots,
  taskScopedDescriptors,
} from "./real-workflow-setup";
import {
  type RealOptimizationDependencies,
  type RealOptimizationOptions,
  type RealOptimizationResult,
  ReviewSchema,
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

export async function surface(
  sourceRepoRoot: string,
  skill: CanonicalSkill,
): Promise<{
  readonly body: string;
  readonly frontmatterHash: string;
  readonly resourcesHash: string;
}> {
  return withSharedAdoptionLock(sourceRepoRoot, async () => {
    const skillsDir = join(
      resolve(sourceRepoRoot),
      "packages/cli/src/public/skills",
    );
    const bundle = loadBundledSkillFrom(skillsDir, skill);
    const resources = Object.fromEntries(
      await Promise.all(
        [...(bundle.manifest.resources ?? [])]
          .sort()
          .map(async (resource) => [
            resource,
            readBundledSkillResourceFrom(skillsDir, skill, resource),
          ]),
      ),
    );
    return {
      body: bundle.body,
      frontmatterHash: canonicalHash(bundle.manifest),
      resourcesHash: canonicalHash(resources),
    };
  });
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function runRealOptimization(
  options: RealOptimizationOptions,
  dependencies: Partial<RealOptimizationDependencies> = {},
): Promise<RealOptimizationResult> {
  const [skill] = options.skills;
  if (skill !== "kibi-usage" || options.skills.length !== 1)
    throw new Error("real optimization accepts only kibi-usage");
  const root = resolve(options.artifactRoot);
  const env = options.env ?? process.env;
  const sourceClean =
    dependencies.sourceClean ??
    ((source, currentEnv) => sourceWorktreeIsClean(source, currentEnv));
  if (!(await sourceClean(resolve(options.sourceWorktree), env)))
    throw new Error("source_not_clean");
  const store = new RunStore(root, options.runId, options.artifactPath);
  await store.acquire();
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const roots = await predicateRoots(root);
    const trainDescriptors =
      options.cellRuntime === undefined
        ? predicateDescriptors("train")
        : await taskScopedDescriptors(
            "train",
            options.cellRuntime.fixtureRunRoot,
          );
    const developmentDescriptors =
      options.cellRuntime === undefined
        ? predicateDescriptors("development")
        : await taskScopedDescriptors(
            "development",
            options.cellRuntime.fixtureRunRoot,
          );
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
      productionAdoption: "external-verdict-required";
    }> = [];
    for (const skill of options.skills) {
      const baseline = createBaselineVariant({
        skill,
        ...(await surface(resolve(options.sourceWorktree), skill)),
      });
      const training: TrainingInput = {
        runId: options.runId,
        skill,
        sourceWorktree: resolve(options.sourceWorktree),
        artifactRoot: join(root, "skills", skill),
        maxSteps: options.maxSteps,
        baseline,
        trainDescriptors,
        developmentDescriptors,
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
        roots,
        env,
        ...(options.cellRuntime === undefined
          ? {}
          : { runtime: options.cellRuntime }),
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
        productionAdoption: "external-verdict-required",
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
      sourceModified: false,
      generatedAt: new Date().toISOString(),
    });
    const reviewJson = `${JSON.stringify(review, null, 2)}\n`;
    if (options.artifactPath !== undefined) {
      await options.artifactPath.writeText(
        "optimization-review.json",
        reviewJson,
      );
    } else {
      await writeFile(join(root, "optimization-review.json"), reviewJson, {
        encoding: "utf8",
        mode: 0o600,
      });
    }
    return {
      status: review.status,
      runId: options.runId,
      skills: [...options.skills],
      candidates: candidates.map(({ skill, candidateBodyHash }) => ({
        skill,
        candidateBodyHash,
      })),
      heldOutEligibility,
      // This review workflow has no independently authenticated invocation
      // receipt. Never infer paid usage from requested work; report only
      // measured receipt-backed calls.
      paidModelCalls: 0,
    };
  } finally {
    await store.release();
  }
}
