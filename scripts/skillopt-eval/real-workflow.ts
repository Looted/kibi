import type { ArtifactPath } from "./artifact-path";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
} from "../../packages/cli/src/public/skills";
import { withSharedAdoptionLock } from "./adoption-lock";
import { validateCompleteCandidateBody } from "./candidate-body";
import type { CanonicalSkill } from "./catalog";
import { defaultEvaluateHeldOut } from "./held-out-evaluation";
import { RunStore } from "./orchestration-store";
import { sourceWorktreeIsClean } from "./preflight";
import {
  predicateRoots,
  publicSkillDescriptors,
  taskScopedPublicSkillDescriptors,
} from "./real-workflow-setup";
import {
  type DevelopmentEvaluation,
  type RealOptimizationDependencies,
  type RealOptimizationOptions,
  type RealOptimizationResult,
  ReviewSchema,
  type TrainingInput,
  canonicalHash,
} from "./real-workflow-types";
import { CodexOptimizerError } from "./runtime/codex-optimizer";
import { readTargetEpisodeBudget } from "./target-episode-budget";
import {
  defaultEvaluateDevelopment,
  defaultTrain,
  oneShotVariant,
} from "./training-setup";
import {
  type FrozenVariant,
  createBaselineVariant,
  freezeCandidateVariant,
} from "./variants";

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
  return [gate.hardPasses, gate.mean, gate.worstFamilyMean];
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

type FinalCandidateSource = "baseline" | "one-shot" | "trained";

type FinalCandidate = Readonly<{
  source: FinalCandidateSource;
  variant: FrozenVariant;
  development: DevelopmentEvaluation;
}>;

function isSecuritySafe(development: DevelopmentEvaluation): boolean {
  return (development.securityFailures ?? 0) === 0;
}

function chooseBestFinalCandidate(
  candidates: readonly [FinalCandidate, ...FinalCandidate[]],
): FinalCandidate {
  let winner = candidates[0];
  for (const candidate of candidates.slice(1)) {
    if (
      isSecuritySafe(candidate.development) &&
      compareDevelopment(
        developmentRank(candidate.development),
        developmentRank(winner.development),
      ) > 0
    ) {
      winner = candidate;
    }
  }
  return winner;
}

function normalizedDevelopment(
  development: DevelopmentEvaluation,
): DevelopmentEvaluation & { securityFailures: number } {
  return {
    ...development,
    securityFailures: development.securityFailures ?? 0,
  };
}

async function persistRejectedCandidate(
  artifactRoot: string,
  source: Exclude<FinalCandidateSource, "baseline">,
  body: string,
  reason: string,
  development?: DevelopmentEvaluation,
): Promise<void> {
  const filePrefix =
    source === "trained" ? "rejected-candidate" : "rejected-one-shot-candidate";
  await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
  await writeFile(join(artifactRoot, `${filePrefix}_skill.md`), body, {
    encoding: "utf8",
    mode: 0o600,
  });
  await writeFile(
    join(artifactRoot, `${filePrefix}.json`),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-rejected-candidate",
      source,
      bodyHash: canonicalHash(body),
      bodyBytes: Buffer.byteLength(body, "utf8"),
      reason,
      ...(development === undefined
        ? {}
        : { development: normalizedDevelopment(development) }),
    })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

function materializeFinalCandidate(
  winner: FinalCandidate,
  baseline: FrozenVariant,
  trainerCheckpointHash: string,
): FrozenVariant {
  if (winner.source === "trained") return winner.variant;
  return freezeCandidateVariant({
    skill: baseline.skill,
    variant: "skillopt",
    body: winner.variant.body,
    frontmatterHash: baseline.frontmatterHash,
    resourcesHash: baseline.resourcesHash,
    provenance: "skillopt",
    sourceRequestHash: canonicalHash({
      artifactType: "skillopt-final-winner",
      source: winner.source,
      bodyHash: winner.variant.bodyHash,
      trainerCheckpointHash,
    }),
  });
}

async function loadSeedCandidate(
  path: string,
  baseline: ReturnType<typeof createBaselineVariant>,
) {
  const body = await readFile(resolve(path), "utf8");
  validateCompleteCandidateBody(body);
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
    candidate: {
      mean: number;
      hardPasses: number;
      worstFamilyMean: number;
      securityFailures?: number;
    };
    baseline: { mean: number; hardPasses: number; worstFamilyMean: number };
    oneShot: { mean: number; hardPasses: number; worstFamilyMean: number };
  }>,
): boolean {
  return (
    input.candidate.mean > input.baseline.mean &&
    input.candidate.hardPasses >= input.baseline.hardPasses &&
    input.candidate.worstFamilyMean >= input.baseline.worstFamilyMean &&
    (input.candidate.securityFailures ?? 0) === 0
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
        securityFailures: number;
      };
      developmentComparators: {
        baseline: DevelopmentEvaluation;
        oneShot: DevelopmentEvaluation;
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
      let oneShotFailed = false;
      const oneShot = await (async () => {
        const fallback = () =>
          freezeCandidateVariant({
            skill,
            variant: "one-shot",
            body: baseline.body,
            frontmatterHash: baseline.frontmatterHash,
            resourcesHash: baseline.resourcesHash,
            // Distinct provenance so metrics can tell a paid optimizer run
            // from the fail-open baseline fallback recorded in
            // one-shot-failure.json.
            provenance: "codex-one-shot-unavailable" as const,
          });
        try {
          const generated = await (dependencies.oneShot ?? oneShotVariant)(
            training,
          );
          try {
            validateCompleteCandidateBody(generated.body);
            return generated;
          } catch (error) {
            oneShotFailed = true;
            await persistRejectedCandidate(
              training.artifactRoot,
              "one-shot",
              generated.body,
              error instanceof Error ? error.message : String(error),
            );
            await mkdir(training.artifactRoot, {
              recursive: true,
              mode: 0o700,
            });
            await writeFile(
              join(training.artifactRoot, "one-shot-failure.json"),
              `${JSON.stringify({
                schemaVersion: "1.0.0",
                artifactType: "skillopt-one-shot-failure",
                runId: options.runId,
                skill,
                error: error instanceof Error ? error.message : String(error),
              })}\n`,
              { encoding: "utf8", mode: 0o600 },
            );
            return fallback();
          }
        } catch (error) {
          if (!(error instanceof CodexOptimizerError)) throw error;
          oneShotFailed = true;
          await mkdir(training.artifactRoot, {
            recursive: true,
            mode: 0o700,
          });
          await writeFile(
            join(training.artifactRoot, "one-shot-failure.json"),
            `${JSON.stringify({
              schemaVersion: "1.0.0",
              artifactType: "skillopt-one-shot-failure",
              runId: options.runId,
              skill,
              error: error.message,
            })}\n`,
            { encoding: "utf8", mode: 0o600 },
          );
          return fallback();
        }
      })();
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
      const oneShotDevelopment = oneShotFailed
        ? baselineDevelopment
        : await evaluateDevelopment({
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
          ? !oneShotFailed &&
            isSecuritySafe(oneShotDevelopment) &&
            compareDevelopment(
              developmentRank(oneShotDevelopment),
              developmentRank(baselineDevelopment),
            ) > 0
            ? oneShot
            : baseline
          : seedCandidate;
      const trained = await (dependencies.train ?? defaultTrain)({
        ...training,
        initialVariant,
      });
      let trainedCandidate: FrozenVariant | undefined;
      let trainedDevelopment: DevelopmentEvaluation | undefined;
      try {
        validateCompleteCandidateBody(trained.candidateBody);
        trainedCandidate = freezeCandidateVariant({
          skill,
          variant: "skillopt",
          body: trained.candidateBody,
          frontmatterHash: baseline.frontmatterHash,
          resourcesHash: baseline.resourcesHash,
          provenance: "skillopt",
          sourceRequestHash: trained.trainerCheckpointHash,
        });
      } catch (error) {
        await persistRejectedCandidate(
          training.artifactRoot,
          "trained",
          trained.candidateBody,
          error instanceof Error ? error.message : String(error),
          trained.development,
        );
      }
      // The trainer's development value is a selection-loop score. It is
      // useful for the optimizer, but it is not independently authenticated
      // evidence for the paid workflow: the trainer may use a different
      // rollout lane, cache, or stochastic target invocation. Re-run every
      // complete final candidate through the authoritative evaluator before
      // applying the admission gate.
      if (trainedCandidate !== undefined) {
        trainedDevelopment = await evaluateDevelopment({
          skill,
          candidate: trainedCandidate,
          descriptors: training.developmentDescriptors,
          sourceWorktree: training.sourceWorktree,
          artifactRoot: training.artifactRoot,
          runId: options.runId,
          env,
          ...(options.cellRuntime === undefined
            ? {}
            : { runtime: options.cellRuntime }),
        });
      }
      const finalCandidates: FinalCandidate[] = [
        {
          source: "baseline",
          variant: baseline,
          development: baselineDevelopment,
        },
        ...(oneShotFailed
          ? []
          : [
              {
                source: "one-shot" as const,
                variant: oneShot,
                development: oneShotDevelopment,
              },
            ]),
        ...(trainedCandidate === undefined || trainedDevelopment === undefined
          ? []
          : [
              {
                source: "trained" as const,
                variant: trainedCandidate,
                development: trainedDevelopment,
              },
            ]),
      ];
      const winner = chooseBestFinalCandidate(
        finalCandidates as [FinalCandidate, ...FinalCandidate[]],
      );
      const candidate = materializeFinalCandidate(
        winner,
        baseline,
        trained.trainerCheckpointHash,
      );
      if (winner.source !== "trained" && trainedCandidate !== undefined) {
        await persistRejectedCandidate(
          training.artifactRoot,
          "trained",
          trainedCandidate.body,
          "not_best_safe_complete_candidate",
          trainedDevelopment,
        );
      }
      if (winner.source !== "one-shot" && !oneShotFailed) {
        await persistRejectedCandidate(
          training.artifactRoot,
          "one-shot",
          oneShot.body,
          "not_best_safe_complete_candidate",
          oneShotDevelopment,
        );
      }
      const development = winner.development;
      const reviewDevelopment = normalizedDevelopment(development);
      const reviewBaselineDevelopment = {
        ...normalizedDevelopment(baselineDevelopment),
      };
      const reviewOneShotDevelopment = {
        ...normalizedDevelopment(oneShotDevelopment),
      };
      const developmentEligible = passesDevelopmentGate({
        candidate: development,
        baseline: baselineDevelopment,
        oneShot: oneShotDevelopment,
      });
      const developmentOnly = options.developmentOnly === true;
      const heldOut =
        developmentEligible && !developmentOnly
          ? await (dependencies.evaluateHeldOut ?? defaultEvaluateHeldOut)({
              skill,
              variants: [baseline, oneShot, candidate],
              sourceWorktree: training.sourceWorktree,
              artifactRoot: training.artifactRoot,
              runId: options.runId,
              roots,
              env,
              includeBundle: false,
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
        development: reviewDevelopment,
        developmentComparators: {
          baseline: reviewBaselineDevelopment,
          oneShot: reviewOneShotDevelopment,
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
    const developmentComplete = candidates.every(
      (candidate) => candidate.developmentEligible,
    );
    const reviewStage =
      heldOutEligibility === "not-run" ? "development" : "held-out";
    const reviewStatus = options.developmentOnly
      ? developmentComplete
        ? "evaluated"
        : "blocked"
      : heldOutEligibility === "eligible"
        ? "evaluated"
        : "blocked";
    const heldOutSkipReason = options.developmentOnly
      ? "development-only"
      : developmentComplete && heldOutEligibility !== "not-run"
        ? undefined
        : developmentComplete
          ? undefined
          : "development-gate-ineligible";
    const review = ReviewSchema.parse({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-optimization-review",
      runId: options.runId,
      status: reviewStatus,
      artifactRoot: root,
      skills: [...options.skills],
      candidates,
      sourceModified: false,
      stage: reviewStage,
      ...(heldOutSkipReason === undefined ? {} : { heldOutSkipReason }),
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
    const targetEpisodeBudget = await readTargetEpisodeBudget(
      env,
      options.sourceWorktree,
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
      stage: reviewStage,
      // This workflow has no independently authenticated aggregate model-call
      // receipt. Target reservations are reported separately below.
      paidModelCalls: "unknown",
      ...(targetEpisodeBudget === undefined ? {} : { targetEpisodeBudget }),
      ...(heldOutEligibility === "not-run"
        ? {
            reason: options.developmentOnly
              ? ("development_only" as const)
              : ("development_gate_ineligible" as const),
          }
        : {}),
    };
  } finally {
    await store.release();
  }
}
