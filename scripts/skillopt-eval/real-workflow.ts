import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  loadBundledSkill,
  readBundledSkillResource,
} from "../../packages/cli/src/public/skills";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import { JsonValueSchema, contractHash } from "./contracts/common";
import {
  PREDICATE_CASES,
  PREDICATE_HELD_OUT_CASE_IDS,
} from "./fixtures/predicate-cases";
import { materializePredicateCorpus } from "./fixtures/predicate-corpus";
import { parsePrivateEvaluatorManifest } from "./fixtures/private";
import { RunStore } from "./orchestration-store";
import { sourceWorktreeIsClean } from "./preflight";
import { runCodexCell } from "./runtime/codex-cell-runner";
import { runCodexSkillOptStep } from "./runtime/codex-optimizer";
import { runBoundedProcess } from "./runtime/process";
import {
  type FrozenVariant,
  createBaselineVariant,
  freezeCandidateVariant,
} from "./variants";

const RootsSchema = z
  .object({
    corpus: z.string().regex(/^[a-f0-9]{64}$/),
    evaluator: z.string().regex(/^[a-f0-9]{64}$/),
    querySet: z.string().regex(/^[a-f0-9]{64}$/),
    baseline: z.string().regex(/^[a-f0-9]{64}$/),
    catalog: z.string().regex(/^[a-f0-9]{64}$/),
    verifier: z.string().regex(/^[a-f0-9]{64}$/),
    publicRoot: z.string().regex(/^[a-f0-9]{64}$/),
    privateRoot: z.string().regex(/^[a-f0-9]{64}$/),
    artifactSchema: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const TrainResultSchema = z
  .object({
    codex_candidate_body: z.string().min(1),
    codex_candidate_body_hash: z.string().regex(/^[a-f0-9]{64}$/),
    trainer_checkpoint_hash: z.string().regex(/^[a-f0-9]{64}$/),
    trajectory_hashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)),
    corpus_roots: RootsSchema,
  })
  .strict()
  .passthrough();

const ReviewSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-optimization-review"),
    runId: z.string().min(1),
    status: z.enum(["evaluated", "blocked"]),
    artifactRoot: z.string().min(1),
    skills: z.array(z.enum(CANONICAL_SKILLS)).min(1),
    candidates: z
      .array(
        z
          .object({
            skill: z.enum(CANONICAL_SKILLS),
            baselineBodyHash: z.string().regex(/^[a-f0-9]{64}$/),
            candidateBodyHash: z.string().regex(/^[a-f0-9]{64}$/),
            trainerCheckpointHash: z.string().regex(/^[a-f0-9]{64}$/),
            development: z
              .object({
                mean: z.number().min(0).max(1),
                hardPasses: z.number().int().min(0),
                worstFamilyMean: z.number().min(0).max(1),
              })
              .strict(),
            heldOutEligibility: z.enum([
              "eligible",
              "HELD_OUT_MATRIX_INELIGIBLE",
            ]),
            heldOutCellCount: z.literal(36),
            adoption: z.literal("unchanged"),
          })
          .strict(),
      )
      .min(1),
    sourceModified: z.literal(false),
    generatedAt: z.iso.datetime(),
  })
  .strict();

type PredicateDescriptor = Readonly<{
  id: string;
  family: string;
  split: "train" | "development";
  publicClaim: unknown;
}>;

type DevelopmentGate = Readonly<{
  mean: number;
  hardPasses: number;
  worstFamilyMean: number;
}>;

type TrainingInput = Readonly<{
  runId: string;
  skill: CanonicalSkill;
  sourceWorktree: string;
  artifactRoot: string;
  maxSteps: number;
  baseline: FrozenVariant;
  trainDescriptors: readonly PredicateDescriptor[];
  developmentDescriptors: readonly PredicateDescriptor[];
  corpusRoots: z.infer<typeof RootsSchema>;
  env: NodeJS.ProcessEnv;
  cellRuntime?: CodexCellRuntime;
}>;

type TrainingOutput = Readonly<{
  status: "frozen";
  candidateBody: string;
  trainerCheckpointHash: string;
  trajectoryHashes: readonly string[];
}>;

export type CodexCellRuntime = Readonly<{
  fixtureRoot: string;
  evaluatorManifestPath: string;
  codexExecutable?: string;
  bwrapExecutable?: string;
  pricingHash?: string;
  priceAmount?: number;
  timeoutMs?: number;
  hiddenMarkers?: readonly string[];
}>;

export type RealOptimizationOptions = Readonly<{
  runId: string;
  artifactRoot: string;
  sourceWorktree: string;
  skills: readonly CanonicalSkill[];
  maxSteps: number;
  env?: NodeJS.ProcessEnv;
  cellRuntime?: CodexCellRuntime;
}>;

export type RealOptimizationResult = Readonly<{
  status: "evaluated" | "blocked";
  runId: string;
  skills: readonly CanonicalSkill[];
  candidates: readonly Readonly<{
    skill: CanonicalSkill;
    candidateBodyHash: string;
  }>[];
  heldOutEligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
  paidModelCalls: number;
}>;

type HeldOutEvaluation = Readonly<{
  eligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
  cellCount: 36;
}>;

export type RealOptimizationDependencies = Readonly<{
  sourceClean: (
    sourceWorktree: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<boolean>;
  train: (input: TrainingInput) => Promise<TrainingOutput>;
  evaluateDevelopment: (
    input: Readonly<{
      skill: CanonicalSkill;
      candidate: FrozenVariant;
      descriptors: readonly PredicateDescriptor[];
      runtime?: CodexCellRuntime;
      sourceWorktree: string;
      artifactRoot: string;
      runId: string;
      env: NodeJS.ProcessEnv;
    }>,
  ) => Promise<DevelopmentGate>;
  evaluateHeldOut: (
    input: Readonly<{
      skill: CanonicalSkill;
      variants: readonly [FrozenVariant, FrozenVariant, FrozenVariant];
      runtime?: CodexCellRuntime;
      sourceWorktree: string;
      artifactRoot: string;
      runId: string;
      env: NodeJS.ProcessEnv;
    }>,
  ) => Promise<HeldOutEvaluation>;
  oneShot: (input: TrainingInput) => Promise<FrozenVariant>;
}>;

function canonicalHash(value: unknown): string {
  return contractHash(JsonValueSchema.parse(value));
}

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

async function predicateRoots(
  artifactRoot: string,
): Promise<z.infer<typeof RootsSchema>> {
  const corpusRoot = join(artifactRoot, "predicate-corpus");
  const manifestPath = join(corpusRoot, "candidate-root-manifest.json");
  if (!existsSync(manifestPath)) {
    return materializePredicateCorpus({ artifactRoot: corpusRoot }).roots;
  }
  const manifest = z
    .object({ roots: RootsSchema })
    .passthrough()
    .parse(JSON.parse(await readFile(manifestPath, "utf8")));
  return manifest.roots;
}

function requireRuntime(
  runtime: CodexCellRuntime | undefined,
): CodexCellRuntime {
  if (runtime === undefined) throw new Error("codex_cell_runtime_required");
  return runtime;
}

async function defaultTrain(input: TrainingInput): Promise<TrainingOutput> {
  const runtime = requireRuntime(input.cellRuntime);
  const requestPath = join(input.artifactRoot, "trainer-request.json");
  const resultPath = join(input.artifactRoot, "trainer-result.json");
  await mkdir(input.artifactRoot, { recursive: true, mode: 0o700 });
  await writeFile(
    requestPath,
    `${JSON.stringify({
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
      bridgeCommand: [
        "bun",
        "run",
        "scripts/skillopt-eval/bridge-cli.ts",
        "--source-worktree",
        input.sourceWorktree,
        "--artifact-root",
        join(input.artifactRoot, "cells"),
        "--fixture-root",
        runtime.fixtureRoot,
        "--evaluator-manifest",
        runtime.evaluatorManifestPath,
      ],
      optimizerBridgeCommand: [
        "bun",
        "run",
        "scripts/skillopt-eval/optimizer-bridge-cli.ts",
      ],
      bridgeCwd: input.sourceWorktree,
    })}\n`,
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
  if (candidateBodyHash !== output.codex_candidate_body_hash) {
    throw new Error("reflact_candidate_body_hash_mismatch");
  }
  const lineageHash = canonicalHash({
    candidateBodyHash,
    corpusRoots: output.corpus_roots,
    trajectoryHashes: output.trajectory_hashes,
  });
  if (lineageHash !== output.trainer_checkpoint_hash) {
    throw new Error("reflact_checkpoint_lineage_mismatch");
  }
  if (canonicalHash(output.corpus_roots) !== canonicalHash(input.corpusRoots)) {
    throw new Error("reflact_corpus_roots_mismatch");
  }
  return {
    status: "frozen",
    candidateBody: output.codex_candidate_body,
    trainerCheckpointHash: output.trainer_checkpoint_hash,
    trajectoryHashes: output.trajectory_hashes,
  };
}

async function defaultEvaluateDevelopment(
  input: Readonly<{
    skill: CanonicalSkill;
    candidate: FrozenVariant;
    descriptors: readonly PredicateDescriptor[];
    runtime?: CodexCellRuntime;
    sourceWorktree: string;
    artifactRoot: string;
    runId: string;
    env: NodeJS.ProcessEnv;
  }>,
): Promise<DevelopmentGate> {
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
      episodeId: randomUUID(),
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
    finalStateRequests: [{ tool: "kb_status", args: {} }],
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
}

async function defaultEvaluateHeldOut(
  input: Readonly<{
    skill: CanonicalSkill;
    variants: readonly [FrozenVariant, FrozenVariant, FrozenVariant];
    runtime?: CodexCellRuntime;
    sourceWorktree: string;
    artifactRoot: string;
    runId: string;
    env: NodeJS.ProcessEnv;
  }>,
): Promise<HeldOutEvaluation> {
  const runtime = requireRuntime(input.runtime);
  const manifest = parsePrivateEvaluatorManifest(
    await readFile(runtime.evaluatorManifestPath, "utf8"),
  );
  let allHardPass = true;
  for (let repetition = 1; repetition <= 3; repetition += 1) {
    for (const variant of input.variants) {
      for (const taskId of PREDICATE_HELD_OUT_CASE_IDS) {
        const completed = await runCodexCell({
          request: {
            schemaVersion: "1.0.0",
            artifactType: "episode-request",
            episodeId: randomUUID(),
            runId: input.runId,
            runLockHash: variant.bodyHash,
            variant: variant.variant,
            skill: input.skill,
            taskId,
            attempt: repetition,
            prompt: variant.body,
            workspaceFixtureHash: manifest.workspaceHash,
          },
          fixtureRoot: runtime.fixtureRoot,
          sourceWorktree: input.sourceWorktree,
          artifactRoot: input.artifactRoot,
          targetSkill: input.skill,
          candidate: { body: variant.body },
          codexExecutable: runtime.codexExecutable ?? "codex",
          bwrapExecutable: runtime.bwrapExecutable ?? "/usr/bin/bwrap",
          env: input.env,
          finalStateRequests: [{ tool: "kb_status", args: {} }],
          evaluatorManifest: manifest,
          hiddenMarkers: runtime.hiddenMarkers ?? [],
          pricingHash: runtime.pricingHash ?? "0".repeat(64),
          priceAmount: runtime.priceAmount ?? 0,
          timeoutMs: runtime.timeoutMs ?? 180_000,
        });
        allHardPass = allHardPass && completed.receipt.result.hardPass;
      }
    }
  }
  return {
    eligibility: allHardPass ? "eligible" : "HELD_OUT_MATRIX_INELIGIBLE",
    cellCount: 36,
  };
}

async function oneShotVariant(input: TrainingInput): Promise<FrozenVariant> {
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
}

// implements REQ-skillopt-codex-optimization
export async function runRealOptimization(
  options: RealOptimizationOptions,
  dependencies: Partial<RealOptimizationDependencies> = {},
): Promise<RealOptimizationResult> {
  const root = resolve(options.artifactRoot);
  const env = options.env ?? process.env;
  const sourceClean =
    dependencies.sourceClean ??
    ((source, currentEnv) => sourceWorktreeIsClean(source, currentEnv));
  if (!(await sourceClean(resolve(options.sourceWorktree), env))) {
    throw new Error("source_not_clean");
  }
  const store = new RunStore(root, options.runId);
  await store.acquire();
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const roots = await predicateRoots(root);
    const train = dependencies.train ?? defaultTrain;
    const evaluateDevelopment =
      dependencies.evaluateDevelopment ?? defaultEvaluateDevelopment;
    const evaluateHeldOut =
      dependencies.evaluateHeldOut ?? defaultEvaluateHeldOut;
    const candidates: Array<{
      skill: CanonicalSkill;
      baselineBodyHash: string;
      candidateBodyHash: string;
      trainerCheckpointHash: string;
      development: DevelopmentGate;
      heldOutEligibility: HeldOutEvaluation["eligibility"];
      heldOutCellCount: 36;
      adoption: "unchanged";
    }> = [];
    for (const skill of options.skills) {
      const loaded = await surface(skill);
      const baseline = createBaselineVariant({ skill, ...loaded });
      const trainingInput: TrainingInput = {
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
      const trained = await train(trainingInput);
      const candidate = freezeCandidateVariant({
        skill,
        variant: "skillopt",
        body: trained.candidateBody,
        frontmatterHash: baseline.frontmatterHash,
        resourcesHash: baseline.resourcesHash,
        provenance: "skillopt",
        sourceRequestHash: trained.trainerCheckpointHash,
      });
      const development = await evaluateDevelopment({
        skill,
        candidate,
        descriptors: trainingInput.developmentDescriptors,
        sourceWorktree: trainingInput.sourceWorktree,
        artifactRoot: trainingInput.artifactRoot,
        runId: options.runId,
        env,
        ...(options.cellRuntime === undefined
          ? {}
          : { runtime: options.cellRuntime }),
      });
      const oneShot = await (dependencies.oneShot ?? oneShotVariant)(
        trainingInput,
      );
      const heldOut = await evaluateHeldOut({
        skill,
        variants: [baseline, oneShot, candidate],
        sourceWorktree: trainingInput.sourceWorktree,
        artifactRoot: trainingInput.artifactRoot,
        runId: options.runId,
        env,
        ...(options.cellRuntime === undefined
          ? {}
          : { runtime: options.cellRuntime }),
      });
      await mkdir(trainingInput.artifactRoot, { recursive: true, mode: 0o700 });
      await writeFile(
        join(trainingInput.artifactRoot, "candidate_skill.md"),
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
        adoption: "unchanged",
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
