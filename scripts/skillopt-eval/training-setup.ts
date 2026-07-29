import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parsePrivateEvaluatorManifest } from "./fixtures/private";
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
import { runBoundedProcess } from "./runtime/process";
import { freezeCandidateVariant } from "./variants";

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const defaultTrain: RealOptimizationDependencies["train"] = async (
  input: TrainingInput,
): Promise<TrainingOutput> => {
  const runtime = requireRuntime(input.cellRuntime);
  const requestPath = join(input.artifactRoot, "trainer-request.json");
  const resultPath = join(input.artifactRoot, "trainer-result.json");
  await mkdir(input.artifactRoot, { recursive: true, mode: 0o700 });
  await writeFile(
    requestPath,
    `${JSON.stringify({ runId: input.runId, skill: input.skill, runRoot: join(input.artifactRoot, "trainer-run"), outRoot: join(input.artifactRoot, "trainer-output"), maxSteps: input.maxSteps, sourceLockHash: canonicalHash({ skill: input.skill, roots: input.corpusRoots }), corpusRoots: input.corpusRoots, trainDescriptors: input.trainDescriptors, developmentDescriptors: input.developmentDescriptors, bridgeCommand: ["bun", "run", "scripts/skillopt-eval/bridge-cli.ts", "--source-worktree", input.sourceWorktree, "--artifact-root", join(input.artifactRoot, "cells"), "--fixture-root", runtime.fixtureRoot, "--evaluator-manifest", runtime.evaluatorManifestPath], optimizerBridgeCommand: ["bun", "run", "scripts/skillopt-eval/optimizer-bridge-cli.ts"], bridgeCwd: input.sourceWorktree })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  const result = await runBoundedProcess({
    argv: [
      "uv",
      "run",
      "--project",
      "tools/skillopt",
      "python",
      "-m",
      "kibi_skillopt",
      "train",
      "--request",
      requestPath,
      "--result",
      resultPath,
    ],
    cwd: input.sourceWorktree,
    env: input.env,
    timeoutMs: 15 * 60 * 1000,
  });
  if (result.exitCode !== 0)
    throw new Error(`reflact_trainer_exit:${result.exitCode}`);
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
    const descriptor = input.descriptors[0];
    if (descriptor === undefined)
      throw new Error("development_descriptor_missing");
    const manifest = parsePrivateEvaluatorManifest(
      await readFile(runtime.evaluatorManifestPath, "utf8"),
    );
    const completed = await runCodexCell({
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
        prompt: input.candidate.body,
        workspaceFixtureHash: manifest.workspaceHash,
      },
      fixtureRoot: runtime.fixtureRoot,
      sourceWorktree: input.sourceWorktree,
      artifactRoot: input.artifactRoot,
      targetSkill: input.skill,
      candidate: { body: input.candidate.body },
      codexExecutable: runtime.codexExecutable ?? "codex",
      bwrapExecutable: runtime.bwrapExecutable ?? "/usr/bin/bwrap",
      env: input.env,
      finalStateRequests: [
        { tool: "kb_query", args: { type: "fact" } },
        { tool: "kb_check", args: {} },
        { tool: "kb_status", args: {} },
      ],
      evaluatorManifest: manifest,
      hiddenMarkers: runtime.hiddenMarkers ?? [],
      pricingHash: runtime.pricingHash ?? "0".repeat(64),
      priceAmount: runtime.priceAmount ?? 0,
      timeoutMs: runtime.timeoutMs ?? 180_000,
    });
    const hardPass = completed.receipt.result.hardPass;
    return {
      mean: hardPass ? 1 : 0,
      hardPasses: hardPass ? 1 : 0,
      worstFamilyMean: hardPass ? 1 : 0,
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
