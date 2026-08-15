import type { ArtifactPath } from "./artifact-path";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
} from "../../packages/cli/src/public/skills";
import { withSharedAdoptionLock } from "./adoption-lock";
import type { CanonicalSkill } from "./catalog";
import { DEVELOPMENT_ADMISSION_GATE } from "./contracts/gates";
import { defaultEvaluateHeldOut } from "./held-out-evaluation";
import { RunStore } from "./orchestration-store";
import { sourceWorktreeIsClean } from "./preflight";
import {
  predicateRoots,
  publicSkillDescriptors,
  taskScopedPublicSkillDescriptors,
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

function developmentRank(gate: {
  mean: number;
  hardPasses: number;
  worstFamilyMean: number;
}): readonly [number, number, number] {
  return [gate.mean, gate.hardPasses, gate.worstFamilyMean];
}

function compareDevelopment(
  left: ReturnType<typeof developmentRank>,
  right: ReturnType<typeof developmentRank>,
): number {
  for (let index = 0; index < left.length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

async function loadSeedCandidate(
  path: string,
  baseline: ReturnType<typeof createBaselineVariant>,
) {
  const body = await readFile(resolve(path), "utf8");
  const candidate = freezeCandidateVariant({
    skill: baseline.skill,
    variant: "skillopt",
    body,
    frontmatterHash: baseline.frontmatterHash,
    resourcesHash: baseline.resourcesHash,
    provenance: "skillopt",
    sourceRequestHash: canonicalHash({
      artifactType: "skillopt-resume-seed",
      bodyHash: canonicalHash(body),
    }),
  });
  return candidate;
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function passesDevelopmentGate(
  input: Readonly<{
    candidate: { mean: number; hardPasses: number; worstFamilyMean: number };
    baseline: { mean: number; hardPasses: number; worstFamilyMean: number };
    oneShot: { mean: number; hardPasses: number; worstFamilyMean: number };
  }>,
): boolean {
  const stronger =
    compareDevelopment(
      developmentRank(input.baseline),
      developmentRank(input.oneShot),
    ) >= 0
      ? input.baseline
      : input.oneShot;
  return (
    input.candidate.mean >= DEVELOPMENT_ADMISSION_GATE.meanMinimum &&
    input.candidate.hardPasses >=
      DEVELOPMENT_ADMISSION_GATE.hardPassesMinimum &&
    input.candidate.worstFamilyMean >=
      DEVELOPMENT_ADMISSION_GATE.worstFamilyMeanMinimum &&
    input.candidate.mean > stronger.mean &&
    input.candidate.hardPasses >= stronger.hardPasses &&
    input.candidate.worstFamilyMean >= stronger.worstFamilyMean
  );
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function runRealOptimization(
  options: RealOptimizationOptions,
  dependencies: Partial<RealOptimizationDependencies> = {},
): Promise<RealOptimizationResult> {
  const [skill] = options.skills;
  if (skill === undefined || options.skills.length !== 1)
    throw new Error("real optimization accepts exactly one canonical skill");
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
        ? publicSkillDescriptors("train", skill)
        : await taskScopedPublicSkillDescriptors(
            "train",
            options.cellRuntime.fixtureRunRoot,
            skill,
          );
    const developmentDescriptors =
      options.cellRuntime === undefined
        ? publicSkillDescriptors("development", skill)
        : await taskScopedPublicSkillDescriptors(
            "development",
            options.cellRuntime.fixtureRunRoot,
            skill,
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
      developmentComparators: {
        baseline: { mean: number; hardPasses: number; worstFamilyMean: number };
        oneShot: { mean: number; hardPasses: number; worstFamilyMean: number };
      };
      developmentEligible: boolean;
      heldOutEligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE" | "not-run";
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
      const oneShot = await (dependencies.oneShot ?? oneShotVariant)(training);
      const evaluateDevelopment =
        dependencies.evaluateDevelopment ?? defaultEvaluateDevelopment;
      const baselineDevelopment = await evaluateDevelopment({
        skill,
        candidate: baseline,
        descriptors: training.developmentDescriptors,
        sourceWorktree: training.sourceWorktree,
        artifactRoot: training.artifactRoot,
        runId: options.runId,
        env,
        ...(options.cellRuntime === undefined
          ? {}
          : { runtime: options.cellRuntime }),
      });
      const oneShotDevelopment = await evaluateDevelopment({
        skill,
        candidate: oneShot,
        descriptors: training.developmentDescriptors,
        sourceWorktree: training.sourceWorktree,
        artifactRoot: training.artifactRoot,
        runId: options.runId,
        env,
        ...(options.cellRuntime === undefined
          ? {}
          : { runtime: options.cellRuntime }),
      });
      const seedCandidate =
        options.seedCandidatePath === undefined
          ? undefined
          : await loadSeedCandidate(options.seedCandidatePath, baseline);
      if (seedCandidate !== undefined) {
        await mkdir(training.artifactRoot, { recursive: true, mode: 0o700 });
        await writeFile(
          join(training.artifactRoot, "seed-candidate.json"),
          `${JSON.stringify({
            schemaVersion: "1.0.0",
            artifactType: "skillopt-resume-seed",
            bodyHash: seedCandidate.bodyHash,
            bodyBytes: Buffer.byteLength(seedCandidate.body, "utf8"),
          })}\n`,
          { encoding: "utf8", mode: 0o600 },
        );
      }
      const initialVariant =
        seedCandidate === undefined
          ? compareDevelopment(
              developmentRank(baselineDevelopment),
              developmentRank(oneShotDevelopment),
            ) >= 0
            ? baseline
            : oneShot
          : seedCandidate;
      const trained = await (dependencies.train ?? defaultTrain)({
        ...training,
        initialVariant,
      });
      const candidate = freezeCandidateVariant({
        skill,
        variant: "skillopt",
        body: trained.candidateBody,
        frontmatterHash: baseline.frontmatterHash,
        resourcesHash: baseline.resourcesHash,
        provenance: "skillopt",
        sourceRequestHash: trained.trainerCheckpointHash,
      });
      // The trainer's development value is a selection-loop score. It is
      // useful for the optimizer, but it is not independently authenticated
      // evidence for the paid workflow: the trainer may use a different
      // rollout lane, cache, or stochastic target invocation. Re-run the
      // frozen candidate through the authoritative cell evaluator before
      // applying the admission gate. This keeps selection feedback separate
      // from the evidence that can authorize held-out evaluation.
      const development = await evaluateDevelopment({
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
      const developmentEligible = passesDevelopmentGate({
        candidate: development,
        baseline: baselineDevelopment,
        oneShot: oneShotDevelopment,
      });
      const heldOut = developmentEligible
        ? await (dependencies.evaluateHeldOut ?? defaultEvaluateHeldOut)({
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
          })
        : ({ eligibility: "not-run", cellCount: 0 } as const);
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
        developmentComparators: {
          baseline: baselineDevelopment,
          oneShot: oneShotDevelopment,
        },
        developmentEligible,
        heldOutEligibility: heldOut.eligibility,
        heldOutCellCount: heldOut.cellCount,
        productionAdoption: "external-verdict-required",
      });
    }
    const heldOutEligibility = candidates.every(
      (candidate) => candidate.heldOutEligibility === "eligible",
    )
      ? "eligible"
      : candidates.some(
            (candidate) => candidate.heldOutEligibility === "not-run",
          )
        ? "not-run"
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
      ...(heldOutEligibility === "not-run"
        ? { reason: "development_gate_ineligible" as const }
        : {}),
    };
  } finally {
    await store.release();
  }
}
