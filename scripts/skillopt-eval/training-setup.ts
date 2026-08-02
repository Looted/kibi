import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertCellInfrastructureHealthy,
  parseEvaluationInfrastructureMarker,
} from "./evaluation-infrastructure";
import {
  type DevelopmentGate,
  type RealOptimizationDependencies,
  TrainResultSchema,
  type TrainingInput,
  type TrainingOutput,
  canonicalHash,
  requireRuntime,
} from "./real-workflow-types";
import { runCodexCell } from "./runtime/codex-cell-runner";
import { runCodexSkillOptStep } from "./runtime/codex-optimizer";
import { PublicTaskClaimSchema } from "./runtime/file-bridge";
import { type ProcessResult, runBoundedProcess } from "./runtime/process";
import { resolveTaskFixture } from "./runtime/task-fixture";
import { freezeCandidateVariant } from "./variants";

const SKILLOPT_PROJECT_DIR = "tools/skillopt";

export const BRIDGE_SOURCE_WORKTREE_ENV = "KIBI_SKILLOPT_SOURCE_WORKTREE";
export const BRIDGE_ARTIFACT_ROOT_ENV = "KIBI_SKILLOPT_ARTIFACT_ROOT";
export const BRIDGE_FIXTURE_RUN_ROOT_ENV = "KIBI_SKILLOPT_FIXTURE_RUN_ROOT";
export const BRIDGE_CODEX_EXECUTABLE_ENV = "KIBI_SKILLOPT_CODEX_EXECUTABLE";
export const BRIDGE_BWRAP_EXECUTABLE_ENV = "KIBI_SKILLOPT_BWRAP_EXECUTABLE";

export type TrainerRequestPayload = Readonly<{
  runId: string;
  skill: string;
  runRoot: string;
  outRoot: string;
  maxSteps: number;
  sourceLockHash: string;
  corpusRoots: TrainingInput["corpusRoots"];
  trainDescriptors: TrainingInput["trainDescriptors"];
  developmentDescriptors: TrainingInput["developmentDescriptors"];
}>;

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function skilloptModuleArgv(
  moduleArgs: readonly string[],
): readonly [string, ...string[]] {
  // uv adds the project directory to import path; --directory keeps that
  // rooted at tools/skillopt even when the process cwd is the repo root.
  return [
    "uv",
    "run",
    "--directory",
    SKILLOPT_PROJECT_DIR,
    "python",
    "-m",
    "kibi_skillopt",
    ...moduleArgs,
  ];
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function buildTrainerRequest(
  input: TrainingInput,
): TrainerRequestPayload {
  return {
    runId: input.runId,
    skill: input.skill,
    runRoot: join(input.artifactRoot, "trainer-run"),
    outRoot: join(input.artifactRoot, "trainer-output"),
    maxSteps: input.maxSteps,
    sourceLockHash: canonicalHash({
      skill: input.skill,
      roots: input.corpusRoots,
    }),
    corpusRoots: input.corpusRoots,
    trainDescriptors: input.trainDescriptors,
    developmentDescriptors: input.developmentDescriptors,
  };
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function seedTrainerInitialSkill(
  outRoot: string,
  baselineBody: string,
): Promise<string> {
  if (baselineBody.trim().length === 0) {
    throw new Error("trainer_initial_skill_empty");
  }
  await mkdir(outRoot, { recursive: true, mode: 0o700 });
  const initialSkillPath = join(outRoot, "initial-skill.md");
  await writeFile(initialSkillPath, baselineBody, {
    encoding: "utf8",
    mode: 0o600,
  });
  return initialSkillPath;
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function trainerBridgeEnvironment(
  input: TrainingInput,
  runtime: ReturnType<typeof requireRuntime>,
): NodeJS.ProcessEnv {
  return {
    ...input.env,
    [BRIDGE_SOURCE_WORKTREE_ENV]: input.sourceWorktree,
    [BRIDGE_ARTIFACT_ROOT_ENV]: join(input.artifactRoot, "cells"),
    [BRIDGE_FIXTURE_RUN_ROOT_ENV]: runtime.fixtureRunRoot,
    [BRIDGE_CODEX_EXECUTABLE_ENV]: runtime.codexExecutable,
    [BRIDGE_BWRAP_EXECUTABLE_ENV]: runtime.bwrapExecutable,
  };
}

function trainerFailureDetail(result: ProcessResult): string {
  const detail = (result.stderr.trim() || result.stdout.trim()).replace(
    /\s+/g,
    " ",
  );
  return detail.length > 0 ? detail.slice(0, 2_000) : "no_output";
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const defaultTrain: RealOptimizationDependencies["train"] = async (
  input: TrainingInput,
): Promise<TrainingOutput> => {
  const runtime = requireRuntime(input.cellRuntime);
  const requestPath = join(input.artifactRoot, "trainer-request.json");
  const resultPath = join(input.artifactRoot, "trainer-result.json");
  const stderrPath = join(input.artifactRoot, "trainer-stderr.log");
  await mkdir(input.artifactRoot, { recursive: true, mode: 0o700 });
  const request = buildTrainerRequest(input);
  await writeFile(requestPath, `${JSON.stringify(request)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await seedTrainerInitialSkill(request.outRoot, input.baseline.body);
  const result = await runBoundedProcess({
    argv: skilloptModuleArgv([
      "train",
      "--request",
      requestPath,
      "--result",
      resultPath,
    ]),
    cwd: input.sourceWorktree,
    env: trainerBridgeEnvironment(input, runtime),
    timeoutMs: 15 * 60 * 1000,
  });
  if (result.exitCode !== 0) {
    await writeFile(stderrPath, result.stderr || result.stdout, {
      encoding: "utf8",
      mode: 0o600,
    });
    const infrastructureFailure = parseEvaluationInfrastructureMarker(
      result.stderr || result.stdout,
    );
    if (infrastructureFailure !== null) throw infrastructureFailure;
    throw new Error(
      `reflact_trainer_exit:${result.exitCode}:${stderrPath}:${trainerFailureDetail(result)}`,
    );
  }
  const output = TrainResultSchema.parse(
    JSON.parse(await readFile(resultPath, "utf8")),
  );
  const candidateBodyHash = canonicalHash(output.codex_candidate_body);
  if (candidateBodyHash !== output.codex_candidate_body_hash)
    throw new Error("reflact_candidate_body_hash_mismatch");
  const lineageHash = canonicalHash({
    candidateBodyHash,
    corpusRoots: output.corpus_roots,
    trajectoryHashes: output.trajectory_hashes,
  });
  if (lineageHash !== output.trainer_checkpoint_hash)
    throw new Error("reflact_checkpoint_lineage_mismatch");
  if (canonicalHash(output.corpus_roots) !== canonicalHash(input.corpusRoots))
    throw new Error("reflact_corpus_roots_mismatch");
  return {
    status: "frozen",
    candidateBody: output.codex_candidate_body,
    trainerCheckpointHash: output.trainer_checkpoint_hash,
    trajectoryHashes: output.trajectory_hashes,
  };
};

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const defaultEvaluateDevelopment: RealOptimizationDependencies["evaluateDevelopment"] =
  async (input): Promise<DevelopmentGate> => {
    const runtime = requireRuntime(input.runtime);
    if (input.descriptors.length === 0)
      throw new Error("development_descriptor_missing");
    const cellRunner = input.cellRunner ?? runCodexCell;
    const completed = [];
    for (const descriptor of input.descriptors) {
      const publicClaim = PublicTaskClaimSchema.parse(descriptor.publicClaim);
      const fixture = await resolveTaskFixture({
        fixtureRunRoot: runtime.fixtureRunRoot,
        taskId: descriptor.id,
        publicClaim,
      });
      const cell = await cellRunner({
        request: {
          schemaVersion: "1.0.0",
          artifactType: "episode-request",
          episodeId: crypto.randomUUID(),
          runId: input.runId,
          runLockHash: input.candidate.bodyHash,
          variant: "skillopt",
          skill: input.skill,
          taskId: descriptor.id,
          attempt: 1,
          prompt: fixture.publicClaim.text,
          workspaceFixtureHash: fixture.workspaceHash,
        },
        fixtureRoot: fixture.workspaceRoot,
        sourceWorktree: input.sourceWorktree,
        artifactRoot: input.artifactRoot,
        targetSkill: input.skill,
        candidate: { body: input.candidate.body },
        codexExecutable: runtime.codexExecutable,
        bwrapExecutable: runtime.bwrapExecutable,
        env: input.env,
        finalStateRequests: [
          { tool: "kb_query", args: {} },
          { tool: "kb_check", args: {} },
          { tool: "kb_status", args: {} },
        ],
        evaluatorManifest: fixture.evaluatorManifest,
        hiddenMarkers: runtime.hiddenMarkers ?? [],
        pricingHash: runtime.pricingHash ?? "0".repeat(64),
        priceAmount: runtime.priceAmount ?? 0,
        timeoutMs: runtime.timeoutMs ?? 180_000,
      });
      assertCellInfrastructureHealthy(cell, {
        stage: "development",
        taskId: descriptor.id,
        variant: "skillopt",
      });
      completed.push(cell);
    }
    const hardPasses = completed.filter(
      (cell) => cell.receipt.result.hardPass,
    ).length;
    const mean = hardPasses / completed.length;
    return {
      mean,
      hardPasses,
      worstFamilyMean: mean,
    };
  };

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const oneShotVariant: RealOptimizationDependencies["oneShot"] = async (
  input,
) => {
  const step = await runCodexSkillOptStep({
    sourceWorktree: input.sourceWorktree,
    artifactRoot: join(input.artifactRoot, "one-shot"),
    runId: `${input.runId}-one-shot`,
    env: input.env,
    request: {
      skill: input.skill,
      step: 1,
      maxSteps: 1,
      currentBody: input.baseline.body,
      trainTrajectories: input.trainDescriptors.map((descriptor) => ({
        taskId: descriptor.id,
        family: descriptor.family,
        reflection: JSON.stringify(descriptor.publicClaim),
      })),
      previousDevelopment: { mean: 0, hardPasses: 0, worstFamilyMean: 0 },
    },
  });
  return freezeCandidateVariant({
    skill: input.skill,
    variant: "one-shot",
    body: step.body,
    frontmatterHash: input.baseline.frontmatterHash,
    resourcesHash: input.baseline.resourcesHash,
    provenance: "codex-one-shot",
  });
};
