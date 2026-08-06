import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { CanonicalSkill } from "./catalog";
import { contractHash } from "./contracts/common";
import {
  type ProcessOptions,
  type ProcessResult,
  runBoundedProcess,
} from "./runtime/process";
import { persistSkillOptArtifacts } from "./skillopt-artifacts";
import {
  CandidateValidationError,
  createBaselineVariant,
  freezeCandidateVariant,
} from "./variants";
import type { FrozenVariant, VariantSurface } from "./variants";

export type TrainTrajectory = Readonly<{
  taskId: string;
  family: string;
  reflection: string;
  status?: "completed" | "behavioral-failure";
  soft?: number;
  hard?: 0 | 1;
  failureCategories?: readonly string[];
  toolSequence?: readonly string[];
  finalStateSummary?: string;
}>;

export type DevelopmentGate = Readonly<{
  mean: number;
  hardPasses: number;
  worstFamilyMean: number;
}>;

export type PublicEvidenceSummary = Readonly<{
  attempts: number;
  hardPasses: number;
  families: readonly Readonly<{
    family: string;
    attempts: number;
    hardPasses: number;
    meanSoft: number;
    failureCounts: readonly Readonly<{
      category: string;
      count: number;
    }>[];
  }>[];
}>;

export type SkillOptStepRequest = Readonly<{
  skill: CanonicalSkill;
  step: number;
  maxSteps: number;
  currentBody: string;
  trainTrajectories: readonly TrainTrajectory[];
  publicEvidenceSummary?: PublicEvidenceSummary;
  previousDevelopment: DevelopmentGate;
}>;

export type SkillOptStepResult = Readonly<{
  body: string;
  development: DevelopmentGate;
}>;

export type SkillOptStepRunner = Readonly<{
  runStep: (request: SkillOptStepRequest) => Promise<SkillOptStepResult>;
}>;

export type PinnedSkillOptRunnerOptions = Readonly<{
  command: readonly [string, ...string[]];
  cwd: string;
  artifactRoot: string;
  sourceLockHash: string;
  timeoutMs?: number;
  runProcess?: (options: ProcessOptions) => Promise<ProcessResult>;
}>;

export type OptimizationCheckpoint = Readonly<{
  completedSteps: number;
  previousWorstFamilyMean: number;
  bestBody: string;
  bestMean: number;
}>;

export type OptimizationStep = Readonly<{
  step: number;
  candidate: FrozenVariant;
  development: DevelopmentGate;
}>;

export type OptimizationResult =
  | Readonly<{
      status: "frozen";
      bestSkill: FrozenVariant;
      steps: readonly OptimizationStep[];
      checkpoint: OptimizationCheckpoint;
      runtimeState: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      status: "invalid";
      score: 0;
      failureCategory: "invalid_variant";
      steps: readonly OptimizationStep[];
      error: string;
    }>;

const PinnedStepResultSchema = z
  .object({
    body: z.string().min(1),
    development: z
      .object({
        mean: z.number(),
        hardPasses: z.number().int(),
        worstFamilyMean: z.number(),
      })
      .strict(),
  })
  .strict();

function processEnvironment(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? "/usr/bin",
    LANG: "C",
    LC_ALL: "C",
  };
}

// implements REQ-skillopt-codex-optimization
export function createPinnedSkillOptRunner(
  input: PinnedSkillOptRunnerOptions,
): SkillOptStepRunner {
  const runProcess = input.runProcess ?? runBoundedProcess;
  return {
    async runStep(request) {
      const requestsRoot = join(input.artifactRoot, "requests");
      await mkdir(requestsRoot, { recursive: true, mode: 0o700 });
      const requestPath = join(requestsRoot, `step-${request.step}.json`);
      const requestPayload = {
        schemaVersion: "1.0.0",
        artifactType: "skillopt-step-request",
        sourceLockHash: input.sourceLockHash,
        outRoot: input.artifactRoot,
        skill: request.skill,
        step: request.step,
        maxSteps: request.maxSteps,
        currentBody: request.currentBody,
        trainTrajectories: request.trainTrajectories.map((trajectory) => ({
          ...trajectory,
        })),
        ...(request.publicEvidenceSummary === undefined
          ? {}
          : { publicEvidenceSummary: request.publicEvidenceSummary }),
        previousDevelopment: request.previousDevelopment,
      };
      await writeFile(requestPath, `${JSON.stringify(requestPayload)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      const firstCommand = input.command[0];
      if (firstCommand === undefined)
        throw new Error("skillopt_command_missing");
      const argv = [...input.command, "--step-request", requestPath] as [
        string,
        ...string[],
      ];
      const result = await runProcess({
        argv,
        cwd: input.cwd,
        env: processEnvironment(),
        timeoutMs: input.timeoutMs ?? 15 * 60 * 1000,
      });
      if (result.exitCode !== 0) {
        throw new Error(`skillopt_step_exit:${result.exitCode}`);
      }
      const parsed = PinnedStepResultSchema.parse(JSON.parse(result.stdout));
      return parsed;
    },
  };
}

function assertPublicTaskIds(trajectories: readonly TrainTrajectory[]): void {
  if (trajectories.length === 0) {
    throw new Error("optimization_requires_train_trajectories");
  }
  if (
    trajectories.some(({ taskId }) =>
      /held[- ]?out|heldout|private|hidden/i.test(taskId),
    )
  ) {
    throw new Error("held-out task ids are not optimization inputs");
  }
}

function assertDevelopmentGate(gate: DevelopmentGate): void {
  if (
    !Number.isFinite(gate.mean) ||
    !Number.isFinite(gate.worstFamilyMean) ||
    !Number.isInteger(gate.hardPasses) ||
    gate.mean < 0 ||
    gate.mean > 100 ||
    gate.worstFamilyMean < 0 ||
    gate.worstFamilyMean > 100 ||
    gate.hardPasses < 0
  ) {
    throw new Error("invalid_development_gate");
  }
}

// implements REQ-skillopt-codex-optimization
export async function optimizeSkillOptVariant(
  input: Readonly<{
    skill: CanonicalSkill;
    baselineBody: string;
    baselineDevelopment: DevelopmentGate;
    trainTrajectories: readonly TrainTrajectory[];
    maxSteps: number;
    checkpoint?: OptimizationCheckpoint;
    artifactRoot?: string;
  }> &
    VariantSurface,
  runner: SkillOptStepRunner,
): Promise<OptimizationResult> {
  if (
    !Number.isInteger(input.maxSteps) ||
    input.maxSteps < 1 ||
    input.maxSteps > 4
  ) {
    throw new Error("maxSteps must be between 1 and 4");
  }
  assertPublicTaskIds(input.trainTrajectories);
  assertDevelopmentGate(input.baselineDevelopment);

  const checkpoint = input.checkpoint;
  const startStep = (checkpoint?.completedSteps ?? 0) + 1;
  let bestBody = checkpoint?.bestBody ?? input.baselineBody;
  let bestMean = checkpoint?.bestMean ?? input.baselineDevelopment.mean;
  let previousWorstFamilyMean =
    checkpoint?.previousWorstFamilyMean ??
    input.baselineDevelopment.worstFamilyMean;
  let lowImprovementStreak = 0;
  const steps: OptimizationStep[] = [];

  for (let step = startStep; step <= input.maxSteps; step += 1) {
    let stepResult: SkillOptStepResult | undefined;
    let candidate: FrozenVariant | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const nextStepResult = await runner.runStep({
        skill: input.skill,
        step,
        maxSteps: input.maxSteps,
        currentBody: bestBody,
        trainTrajectories: input.trainTrajectories,
        previousDevelopment: {
          mean: bestMean,
          hardPasses: input.baselineDevelopment.hardPasses,
          worstFamilyMean: previousWorstFamilyMean,
        },
      });
      assertDevelopmentGate(nextStepResult.development);

      try {
        candidate = freezeCandidateVariant({
          skill: input.skill,
          variant: "skillopt",
          body: nextStepResult.body,
          frontmatterHash: input.frontmatterHash,
          resourcesHash: input.resourcesHash,
          provenance: "skillopt",
          sourceRequestHash: contractHash({
            skill: input.skill,
            step,
            trainTaskIds: input.trainTrajectories.map(({ taskId }) => taskId),
          }),
        });
        stepResult = nextStepResult;
        break;
      } catch (error) {
        if (attempt === 0 && error instanceof CandidateValidationError)
          continue;
        return {
          status: "invalid",
          score: 0,
          failureCategory: "invalid_variant",
          steps,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    if (stepResult === undefined || candidate === undefined) {
      return {
        status: "invalid",
        score: 0,
        failureCategory: "invalid_variant",
        steps,
        error: "candidate_validation_retry_exhausted",
      };
    }

    steps.push({ step, candidate, development: stepResult.development });

    if (stepResult.development.mean > bestMean) {
      bestBody = stepResult.body;
      bestMean = stepResult.development.mean;
    }
    const improvement =
      stepResult.development.worstFamilyMean - previousWorstFamilyMean;
    lowImprovementStreak = improvement < 1 ? lowImprovementStreak + 1 : 0;
    previousWorstFamilyMean = stepResult.development.worstFamilyMean;
    if (lowImprovementStreak >= 2) break;
  }

  const bestSkill =
    bestBody === input.baselineBody
      ? createBaselineVariant({
          skill: input.skill,
          body: bestBody,
          frontmatterHash: input.frontmatterHash,
          resourcesHash: input.resourcesHash,
        })
      : freezeCandidateVariant({
          skill: input.skill,
          variant: "skillopt",
          body: bestBody,
          frontmatterHash: input.frontmatterHash,
          resourcesHash: input.resourcesHash,
          provenance: "skillopt",
          sourceRequestHash: contractHash({
            skill: input.skill,
            completedSteps: steps.map(({ step }) => step),
            bestBody,
          }),
        });
  const result: Extract<OptimizationResult, { status: "frozen" }> = {
    status: "frozen",
    bestSkill,
    steps,
    checkpoint: {
      completedSteps: steps.at(-1)?.step ?? checkpoint?.completedSteps ?? 0,
      previousWorstFamilyMean,
      bestBody,
      bestMean,
    },
    runtimeState: {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-runtime-state",
      skill: input.skill,
      nextStep: (steps.at(-1)?.step ?? checkpoint?.completedSteps ?? 0) + 1,
      bestSkillHash: bestSkill.bodyHash,
      candidateCount: steps.length,
    },
  };
  if (input.artifactRoot !== undefined) {
    await persistSkillOptArtifacts(input.artifactRoot, {
      baselineBody: input.baselineBody,
      bestSkill: result.bestSkill,
      steps: result.steps,
      runtimeState: result.runtimeState,
    });
  }
  return result;
}
