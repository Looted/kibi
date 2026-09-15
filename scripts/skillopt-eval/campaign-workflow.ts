import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { z } from "zod";
import {
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
} from "../../packages/cli/src/public/skills";
import type { BaselineInsertionPlan } from "./baseline-insertion";
import {
  CampaignArtifactError,
  CampaignArtifactStore,
  type CampaignManifest,
  CampaignManifestSchema,
  type CampaignModelProvenance,
  type CampaignSourceSurface,
  type PublicFeedback,
  type SourceFence,
  composeCampaignManifest,
  feedbackTrajectories,
  manifestHash,
  parsePublicFeedback,
  sha256Text,
  validateCampaignManifestAgainstSurface,
} from "./campaign-artifacts";
import {
  CANONICAL_SKILLS,
  type CanonicalSkill,
  buildSkillCatalog,
} from "./catalog";
import {
  JsonValueSchema,
  Sha256Schema,
  contractHash,
} from "./contracts/common";
import { type EpisodeRequest, EpisodeRequestSchema } from "./contracts/episode";
import { EvidenceIndexSchema } from "./contracts/evidence";
import {
  type ScreenCell,
  type ScreenSample,
  runDevelopmentScreen,
} from "./development-screen";
import { probeFixtureReadiness } from "./fixture-readiness";
import { materializeFixtureRun } from "./fixtures/materialize";
import {
  runCapabilityCanary,
  runPreflight,
  sourceWorktreeIsClean,
} from "./preflight";
import { surface } from "./real-workflow";
import { taskScopedPublicSkillDescriptors } from "./real-workflow-setup";
import {
  type PublicTaskDescriptor,
  canonicalHash,
} from "./real-workflow-types";
import {
  type CompletedCodexCell,
  runCodexCell,
} from "./runtime/codex-cell-runner";
import {
  type CodexEpisodeReceipt,
  CodexEpisodeReceiptSchema,
} from "./runtime/codex-episode";
import { deterministicVariantLabel } from "./runtime/codex-events";
import {
  type CodexOptimizerOptions,
  runCodexSkillOptStep,
} from "./runtime/codex-optimizer";
import { createCodexRuntimeLease } from "./runtime/codex-runtime";
import { PublicTaskClaimSchema } from "./runtime/file-bridge";
import { taskFinalStateRequests } from "./runtime/final-state-requests";
import {
  type CapabilityCanaryReceipt,
  OPTIMIZER_MODEL,
  OPTIMIZER_REASONING_EFFORT,
  TARGET_EFFORT,
  TARGET_MODEL,
} from "./runtime/permissions";
import {
  type SkillAssemblyReceipt,
  assembleCanonicalSkills,
} from "./runtime/skill-assembly";
import { resolveTaskFixture } from "./runtime/task-fixture";
import { initializeTargetEpisodeBudget } from "./target-episode-budget";

export const CAMPAIGN_MODEL_PROFILE = {
  targetModel: TARGET_MODEL,
  targetReasoningEffort: TARGET_EFFORT,
  optimizerModel: OPTIMIZER_MODEL,
  optimizerReasoningEffort: OPTIMIZER_REASONING_EFFORT,
} as const;

type CampaignCommand =
  | "revise"
  | "compose"
  | "evaluate"
  | "confirm"
  | "package";
type EvaluationCommand = "evaluate" | "confirm";

export type CampaignCell = Readonly<{
  runId: string;
  pairKey: string;
  taskId: string;
  family: string;
  localRep: 1 | 2 | 3;
  variant: "baseline" | `candidate-${number}`;
  bodyHash: string;
  score: number;
  hardPass: boolean;
  criticalFailures: readonly string[];
  securityFailures: readonly string[];
  receiptStatus: CodexEpisodeReceipt["result"]["status"];
  receiptPath: string;
  receiptSha256: string;
  artifactDirectory: string;
  artifactRefs: readonly CampaignArtifactRef[];
  requestPath: string;
  requestSha256: string;
  requestHash: string;
  bodyLabel: string;
  runLockHash: string;
  usage: z.infer<typeof JsonValueSchema>;
  violations: readonly string[];
  isolationSentinels: readonly string[];
}>;

type CampaignArtifactRef = Readonly<{
  name: string;
  path: string;
  sha256: string;
}>;

type CampaignSample = ScreenSample & {
  receiptStatus: CodexEpisodeReceipt["result"]["status"];
  receiptSha256: string;
  artifactDirectory: string;
  artifactRefs: readonly CampaignArtifactRef[];
  requestPath: string;
  requestSha256: string;
  requestHash: string;
  bodyLabel: string;
  runLockHash: string;
  usage: z.infer<typeof JsonValueSchema>;
  violations: readonly string[];
  isolationSentinels: readonly string[];
};

type CampaignEvidenceFields = Omit<CampaignSample, keyof ScreenSample>;

const CampaignArtifactRefSchema = z
  .object({
    name: z.string().min(1),
    path: z.string().min(1),
    sha256: Sha256Schema,
  })
  .strict();

const CampaignRequestBindingSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-campaign-request-binding"),
    request: EpisodeRequestSchema,
    requestHash: Sha256Schema,
    bodyHash: Sha256Schema,
    bodyLabel: z.string().regex(/^variant-[a-f0-9]{16}$/),
  })
  .strict();

const CampaignCellSchema = zCellSchema();
const FamilyAggregateSchema = zFamilyAggregateSchema();
const ArmAggregateSchema = zArmAggregateSchema();
const CampaignEvaluationSchema = zEvaluationSchema();

export type CampaignEvaluation = ReturnType<
  typeof CampaignEvaluationSchema.parse
>;
type CampaignState = Readonly<{
  schemaVersion: "1.0.0";
  artifactType: "skillopt-campaign-state";
  command: CampaignCommand;
  runId: string;
  status: "running" | "failed";
  attemptedCells: number;
  cells: readonly CampaignCell[];
  error?: string;
}>;

class CampaignScreenFailure extends Error {
  readonly name = "CampaignScreenFailure";

  constructor(
    readonly attemptedCells: number,
    readonly cells: readonly CampaignCell[],
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
  }
}

export type CampaignRuntime = Readonly<{
  fixtureRunRoot: string;
  codexExecutable: string;
  bwrapExecutable: string;
  hiddenMarkers?: readonly string[];
  pricingHash?: string;
  priceAmount?: number;
  timeoutMs?: number;
}>;

type EvaluateSampleInput = Readonly<{
  variant: Parameters<typeof runDevelopmentScreen>[0]["variants"][number];
  task: PublicTaskDescriptor;
  replicate: 1 | 2 | 3;
  skill: CanonicalSkill;
  sourceWorktree: string;
  artifactRoot: string;
  runId: string;
  runLockHash: string;
  env: NodeJS.ProcessEnv;
  runtime: CampaignRuntime;
  runCell: typeof runCodexCell;
  resolveFixture: typeof resolveTaskFixture;
}>;

export type CampaignDependencies = Readonly<{
  sourceClean: typeof sourceWorktreeIsClean;
  sourceFence: (root: string) => Promise<SourceFence>;
  surface: typeof surface;
  runPreflight: typeof runPreflight;
  runCanary: typeof runCapabilityCanary;
  fixtureReadiness: (workspace: string, cliRoot: string) => Promise<void>;
  materializeFixtures: (input: {
    runRoot: string;
    sourceRoot: string;
    skill: CanonicalSkill;
  }) => Promise<string>;
  initializeBudget: typeof initializeTargetEpisodeBudget;
  createRuntimeLease: typeof createCodexRuntimeLease;
  developmentTasks: (
    fixtureRunRoot: string,
    skill: CanonicalSkill,
  ) => Promise<readonly PublicTaskDescriptor[]>;
  evaluateSample: (input: EvaluateSampleInput) => Promise<CampaignSample>;
  runCell: typeof runCodexCell;
  resolveFixture: typeof resolveTaskFixture;
  verifyCell: (
    cell: CampaignCell,
    artifactRoot: string,
    expectedRunLockHash: string,
  ) => Promise<void>;
  runOptimizerStep: typeof runCodexSkillOptStep;
  readOptimizerParagraph: (artifactRoot: string) => Promise<string>;
  readModelReceipt: (
    artifactRoot: string,
  ) => Promise<Record<string, z.infer<typeof JsonValueSchema>>>;
  assemble: typeof assembleCanonicalSkills;
}>;

function zCellSchema() {
  return z
    .object({
      runId: z.string().min(1),
      pairKey: z.string().min(1),
      taskId: z.string().min(1),
      family: z.string().min(1),
      localRep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      variant: z.string().regex(/^(?:baseline|candidate-[1-3])$/),
      bodyHash: Sha256Schema,
      score: z.number().min(0).max(100),
      hardPass: z.boolean(),
      criticalFailures: z.array(z.string()),
      securityFailures: z.array(z.string()),
      receiptStatus: z.enum([
        "completed",
        "behavioral-failure",
        "infrastructure-failure",
        "interrupted",
        "budget-exhausted",
        "evidence-conflict",
      ]),
      receiptPath: z.string().min(1),
      receiptSha256: Sha256Schema,
      artifactDirectory: z.string().min(1),
      artifactRefs: z.array(CampaignArtifactRefSchema),
      requestPath: z.string().min(1),
      requestSha256: Sha256Schema,
      requestHash: Sha256Schema,
      bodyLabel: z.string().regex(/^variant-[a-f0-9]{16}$/),
      runLockHash: Sha256Schema,
      usage: JsonValueSchema,
      violations: z.array(z.string()),
      isolationSentinels: z.array(z.string()),
    })
    .strict();
}

function zFamilyAggregateSchema() {
  return z
    .object({
      mean: z.number().min(0).max(100),
      hardPasses: z.number().int().nonnegative(),
      cells: z.number().int().nonnegative(),
    })
    .strict();
}

function zArmAggregateSchema() {
  return z
    .object({
      variant: z.string().regex(/^(?:baseline|candidate-[1-3])$/),
      bodyHash: Sha256Schema,
      mean: z.number().min(0).max(100),
      hardPasses: z.number().int().nonnegative(),
      securityFailures: z.number().int().nonnegative(),
      cells: z.number().int().nonnegative(),
      families: z.record(z.string(), FamilyAggregateSchema),
    })
    .strict();
}

function zEvaluationSchema() {
  const context = z
    .object({
      sourceHead: z.string().regex(/^[0-9a-f]{7,64}$/),
      sourceTreeHash: Sha256Schema,
      sourceFileCount: z.number().int().positive(),
      baselineBodyHash: Sha256Schema,
      frontmatterHash: Sha256Schema,
      resourcesHash: Sha256Schema,
      repeats: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      maxTargetEpisodes: z.number().int().positive(),
      taskCatalogHash: Sha256Schema,
      cohortBindingHash: Sha256Schema,
      model: z
        .object({
          targetModel: z.literal(TARGET_MODEL),
          targetReasoningEffort: z.literal(TARGET_EFFORT),
          optimizerModel: z.literal(OPTIMIZER_MODEL),
          optimizerReasoningEffort: z.literal(OPTIMIZER_REASONING_EFFORT),
        })
        .strict(),
    })
    .strict();
  return z
    .object({
      schemaVersion: z.literal("1.0.0"),
      artifactType: z.literal("skillopt-campaign-evaluation"),
      command: z.union([z.literal("evaluate"), z.literal("confirm")]),
      status: z.union([z.literal("complete"), z.literal("failed")]),
      runId: z.string().min(1),
      skill: z.enum(CANONICAL_SKILLS),
      baselineBody: z.string().min(1),
      candidates: z.array(CampaignManifestSchema).min(1).max(3),
      context,
      cells: z.array(CampaignCellSchema),
      aggregate: z
        .object({
          baseline: ArmAggregateSchema,
          candidates: z.array(ArmAggregateSchema).min(1).max(3),
          noRegression: z.boolean(),
          regressions: z.array(z.string()),
        })
        .strict(),
      runs: z
        .array(
          z
            .object({
              runId: z.string().min(1),
              kind: z.enum(["new", "prior"]),
              cellCount: z.number().int().nonnegative(),
              repeats: z.union([z.literal(1), z.literal(2), z.literal(3)]),
              artifactRoot: z.string().min(1),
            })
            .strict(),
        )
        .min(1),
      pairings: z.array(
        z
          .object({
            runId: z.string().min(1),
            taskId: z.string().min(1),
            localRep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            candidateIndex: z.number().int().min(1).max(3),
            baselineBodyHash: Sha256Schema,
            candidateBodyHash: Sha256Schema,
          })
          .strict(),
      ),
      contentHash: Sha256Schema,
    })
    .strict();
}

function assertNoPaidFlag(): never {
  throw new CampaignArtifactError("allow_paid_required");
}

function sameFence(left: SourceFence, right: SourceFence): boolean {
  return (
    left.head === right.head &&
    left.treeHash === right.treeHash &&
    left.files === right.files
  );
}

function campaignPairKey(
  runId: string,
  taskId: string,
  localRep: number,
): string {
  return `${runId}:${taskId}:${localRep}`;
}

function campaignCells(
  runId: string,
  cells: readonly (ScreenCell & Partial<CampaignEvidenceFields>)[],
  baselineHash: string,
  candidateHashes: readonly string[],
  expectedRunLockHash: string,
): CampaignCell[] {
  return cells.map((cell) => {
    if (
      !Number.isInteger(cell.replicate) ||
      cell.replicate < 1 ||
      cell.replicate > 3
    ) {
      throw new CampaignArtifactError("cell_replicate_invalid");
    }
    const candidateIndex = candidateHashes.indexOf(cell.bodyHash);
    const variant =
      cell.bodyHash === baselineHash
        ? "baseline"
        : candidateIndex >= 0
          ? (`candidate-${candidateIndex + 1}` as const)
          : undefined;
    if (variant === undefined)
      throw new CampaignArtifactError("cell_body_unbound");
    const evidence = cell as ScreenCell & CampaignEvidenceFields;
    if (
      evidence.receiptStatus === undefined ||
      evidence.receiptSha256 === undefined ||
      evidence.artifactDirectory === undefined ||
      evidence.artifactRefs === undefined ||
      evidence.requestPath === undefined ||
      evidence.requestSha256 === undefined ||
      evidence.requestHash === undefined ||
      evidence.bodyLabel === undefined ||
      evidence.runLockHash === undefined ||
      evidence.usage === undefined ||
      evidence.violations === undefined ||
      evidence.isolationSentinels === undefined
    ) {
      throw new CampaignArtifactError("cell_evidence_missing");
    }
    if (evidence.runLockHash !== expectedRunLockHash)
      throw new CampaignArtifactError("cell_run_lock_mismatch");
    return {
      runId,
      pairKey: campaignPairKey(runId, cell.taskId, cell.replicate),
      taskId: cell.taskId,
      family: cell.family,
      localRep: cell.replicate as 1 | 2 | 3,
      variant,
      bodyHash: cell.bodyHash,
      score: cell.score,
      hardPass: cell.hardPass,
      criticalFailures: [...cell.criticalFailures],
      securityFailures: [...(cell.securityFailures ?? [])],
      receiptStatus: evidence.receiptStatus,
      receiptPath: cell.receiptPath,
      receiptSha256: evidence.receiptSha256,
      artifactDirectory: evidence.artifactDirectory,
      artifactRefs: [...evidence.artifactRefs],
      requestPath: evidence.requestPath,
      requestSha256: evidence.requestSha256,
      requestHash: evidence.requestHash,
      bodyLabel: evidence.bodyLabel,
      runLockHash: evidence.runLockHash,
      usage: JsonValueSchema.parse(evidence.usage),
      violations: [...evidence.violations],
      isolationSentinels: [...evidence.isolationSentinels],
    };
  });
}

function summarizeArm(
  variant: string,
  bodyHash: string,
  cells: readonly CampaignCell[],
): z.infer<typeof ArmAggregateSchema> {
  const scoped = cells.filter((cell) => cell.variant === variant);
  const families: Record<string, z.infer<typeof FamilyAggregateSchema>> = {};
  for (const family of new Set(scoped.map((cell) => cell.family))) {
    const familyCells = scoped.filter((cell) => cell.family === family);
    families[family] = {
      mean:
        familyCells.reduce((sum, cell) => sum + cell.score, 0) /
        familyCells.length,
      hardPasses: familyCells.filter((cell) => cell.hardPass).length,
      cells: familyCells.length,
    };
  }
  return {
    variant,
    bodyHash,
    mean:
      scoped.length === 0
        ? 0
        : scoped.reduce((sum, cell) => sum + cell.score, 0) / scoped.length,
    hardPasses: scoped.filter((cell) => cell.hardPass).length,
    securityFailures: scoped.filter((cell) => cell.securityFailures.length > 0)
      .length,
    cells: scoped.length,
    families,
  };
}

function compareAggregates(
  baseline: z.infer<typeof ArmAggregateSchema>,
  candidates: readonly z.infer<typeof ArmAggregateSchema>[],
): { noRegression: boolean; regressions: string[] } {
  const regressions: string[] = [];
  for (const candidate of candidates) {
    if (candidate.mean < baseline.mean)
      regressions.push(`${candidate.variant}:mean`);
    if (candidate.hardPasses < baseline.hardPasses)
      regressions.push(`${candidate.variant}:hardPasses`);
    if (candidate.securityFailures > 0)
      regressions.push(`${candidate.variant}:security`);
    for (const [family, base] of Object.entries(baseline.families)) {
      const current = candidate.families[family];
      if (
        current === undefined ||
        current.mean < base.mean ||
        current.hardPasses < base.hardPasses
      ) {
        regressions.push(`${candidate.variant}:family:${family}`);
      }
    }
  }
  return { noRegression: regressions.length === 0, regressions };
}

function buildPairings(
  cells: readonly CampaignCell[],
  candidateHashes: readonly string[],
  baselineHash: string,
): z.infer<ReturnType<typeof zEvaluationSchema>>["pairings"] {
  const pairings: Array<{
    runId: string;
    taskId: string;
    localRep: 1 | 2 | 3;
    candidateIndex: number;
    baselineBodyHash: string;
    candidateBodyHash: string;
  }> = [];
  for (const runId of new Set(cells.map((cell) => cell.runId))) {
    const scoped = cells.filter((cell) => cell.runId === runId);
    for (const candidateHash of candidateHashes) {
      const candidateIndex = candidateHashes.indexOf(candidateHash) + 1;
      for (const base of scoped.filter(
        (cell) => cell.bodyHash === baselineHash,
      )) {
        const candidate = scoped.find(
          (cell) =>
            cell.taskId === base.taskId &&
            cell.localRep === base.localRep &&
            cell.bodyHash === candidateHash,
        );
        if (candidate === undefined)
          throw new CampaignArtifactError("pairing_missing");
        pairings.push({
          runId,
          taskId: base.taskId,
          localRep: base.localRep,
          candidateIndex,
          baselineBodyHash: base.bodyHash,
          candidateBodyHash: candidate.bodyHash,
        });
      }
    }
  }
  return pairings;
}

type CampaignCohort = Readonly<{
  runId: string;
  repeats: 1 | 2 | 3;
  artifactRoot: string;
}>;

function validateCellSet(
  cells: readonly CampaignCell[],
  cohorts: readonly CampaignCohort[],
  tasks: readonly PublicTaskDescriptor[],
  baselineHash: string,
  candidateHashes: readonly string[],
): void {
  const expected = cohorts.reduce(
    (total, cohort) =>
      total + cohort.repeats * tasks.length * (candidateHashes.length + 1),
    0,
  );
  if (cells.length !== expected)
    throw new CampaignArtifactError("cell_count_mismatch");
  const keys = new Set<string>();
  for (const cell of cells) {
    const cohort = cohorts.find((candidate) => candidate.runId === cell.runId);
    if (cohort === undefined)
      throw new CampaignArtifactError("cell_run_unbound");
    if (cell.localRep > cohort.repeats)
      throw new CampaignArtifactError("cell_repeat_unbound");
    if (!tasks.some((task) => task.id === cell.taskId))
      throw new CampaignArtifactError("cell_task_unbound");
    if (
      cell.pairKey !== campaignPairKey(cell.runId, cell.taskId, cell.localRep)
    ) {
      throw new CampaignArtifactError("cell_pair_key_mismatch");
    }
    const variantHash =
      cell.variant === "baseline"
        ? baselineHash
        : candidateHashes[Number(cell.variant.slice(-1)) - 1];
    if (variantHash !== cell.bodyHash)
      throw new CampaignArtifactError("cell_hash_binding_mismatch");
    const unique = `${cell.runId}:${cell.taskId}:${cell.localRep}:${cell.variant}`;
    if (keys.has(unique)) throw new CampaignArtifactError("cell_duplicate");
    keys.add(unique);
  }
}

function evaluationBinding(evaluation: CampaignEvaluation) {
  return {
    skill: evaluation.skill,
    baselineBody: evaluation.baselineBody,
    candidates: evaluation.candidates.map((candidate) => ({
      skill: candidate.skill,
      baselineBodyHash: candidate.baselineBodyHash,
      frontmatterHash: candidate.frontmatterHash,
      resourcesHash: candidate.resourcesHash,
      frozenBodyHash: candidate.frozenBodyHash,
    })),
    context: {
      sourceHead: evaluation.context.sourceHead,
      sourceTreeHash: evaluation.context.sourceTreeHash,
      sourceFileCount: evaluation.context.sourceFileCount,
      baselineBodyHash: evaluation.context.baselineBodyHash,
      frontmatterHash: evaluation.context.frontmatterHash,
      resourcesHash: evaluation.context.resourcesHash,
      taskCatalogHash: evaluation.context.taskCatalogHash,
      model: evaluation.context.model,
    },
  } as const;
}

function sealEvaluation(
  input: Readonly<Record<string, unknown>>,
): CampaignEvaluation {
  const contentHash = contractHash(JsonValueSchema.parse(input));
  return CampaignEvaluationSchema.parse({ ...input, contentHash });
}

export function parseCompleteCampaignEvaluation(
  value: unknown,
): CampaignEvaluation {
  const parsed = CampaignEvaluationSchema.parse(value);
  if (parsed.status !== "complete")
    throw new CampaignArtifactError("evaluation_not_complete");
  const { contentHash: _contentHash, ...body } = parsed;
  if (contractHash(JsonValueSchema.parse(body)) !== parsed.contentHash) {
    throw new CampaignArtifactError("evaluation_content_hash_mismatch");
  }
  return parsed;
}

export async function readCompleteCampaignEvaluation(
  path: string,
): Promise<CampaignEvaluation> {
  try {
    return parseCompleteCampaignEvaluation(
      JSON.parse(await readFile(resolve(path), "utf8")),
    );
  } catch (error) {
    if (error instanceof CampaignArtifactError) throw error;
    throw new CampaignArtifactError("evaluation_invalid");
  }
}

function pathWithin(parent: string, child: string): boolean {
  const path = relative(resolve(parent), resolve(child));
  return path === "" || (!path.startsWith("../") && path !== "..");
}

function requestVariant(
  variant: CampaignCell["variant"] | "baseline" | "one-shot" | "skillopt",
): "baseline" | "skillopt" {
  return variant === "baseline" ? "baseline" : "skillopt";
}

function readAssembledSkillSurface(
  workspace: string,
  skill: CanonicalSkill,
): CampaignSourceSurface {
  const skillsDir = join(workspace, ".agents/skills");
  const bundle = loadBundledSkillFrom(skillsDir, skill);
  const resources = Object.fromEntries(
    [...(bundle.manifest.resources ?? [])]
      .sort()
      .map((resource) => [
        resource,
        readBundledSkillResourceFrom(skillsDir, skill, resource),
      ]),
  );
  return {
    body: bundle.body,
    frontmatterHash: canonicalHash(bundle.manifest),
    resourcesHash: canonicalHash(resources),
  };
}

type VerifiedCampaignArtifacts = Readonly<{
  receipt: CodexEpisodeReceipt;
  receiptStatus: CodexEpisodeReceipt["result"]["status"];
  receiptSha256: string;
  artifactDirectory: string;
  artifactRefs: readonly CampaignArtifactRef[];
  requestPath: string;
  requestSha256: string;
  requestHash: string;
  bodyLabel: string;
  runLockHash: string;
  score: number;
  hardPass: boolean;
  criticalFailures: readonly string[];
  usage: z.infer<typeof JsonValueSchema>;
  violations: readonly string[];
  isolationSentinels: readonly string[];
}>;

async function readHashedArtifact(
  artifactDirectory: string,
  path: string,
): Promise<{ text: string; sha256: string }> {
  if (!pathWithin(artifactDirectory, join(artifactDirectory, path)))
    throw new CampaignArtifactError("cell_artifact_path_escape");
  const physicalRoot = await realpath(artifactDirectory);
  const physicalPath = await realpath(join(artifactDirectory, path));
  if (!pathWithin(physicalRoot, physicalPath))
    throw new CampaignArtifactError("cell_artifact_symlink_escape");
  const text = await readFile(physicalPath, "utf8");
  return { text, sha256: sha256Text(text) };
}

async function readConfinedText(
  artifactDirectory: string,
  path: string,
  errorCode: string,
): Promise<string> {
  const physicalRoot = await realpath(artifactDirectory);
  const physicalPath = await realpath(path);
  if (!pathWithin(physicalRoot, physicalPath))
    throw new CampaignArtifactError(errorCode);
  return readFile(physicalPath, "utf8");
}

async function verifyCompletedCellArtifacts(
  input: Readonly<{
    completed: Pick<
      CompletedCodexCell,
      "receipt" | "artifactDirectory" | "receiptPath"
    >;
    request: EpisodeRequest;
    bodyHash: string;
    requestPath: string;
    expectedRequestHash: string;
    expectedBodyLabel: string;
  }>,
): Promise<VerifiedCampaignArtifacts> {
  const artifactDirectory = resolve(input.completed.artifactDirectory);
  const receiptPath = resolve(input.completed.receiptPath);
  if (receiptPath !== join(artifactDirectory, "episode-receipt.json"))
    throw new CampaignArtifactError("cell_receipt_path_mismatch");
  const storedReceipt = await readConfinedText(
    artifactDirectory,
    receiptPath,
    "cell_receipt_symlink_escape",
  );
  const receipt = CodexEpisodeReceiptSchema.parse(JSON.parse(storedReceipt));
  if (
    contractHash(JsonValueSchema.parse(receipt)) !==
    contractHash(JsonValueSchema.parse(input.completed.receipt))
  ) {
    throw new CampaignArtifactError("cell_receipt_memory_mismatch");
  }
  const requestText = await readConfinedText(
    artifactDirectory,
    input.requestPath,
    "cell_request_symlink_escape",
  );
  const requestBinding = CampaignRequestBindingSchema.parse(
    JSON.parse(requestText),
  );
  const requestHash = contractHash(
    JsonValueSchema.parse(EpisodeRequestSchema.parse(requestBinding.request)),
  );
  if (
    requestHash !== requestBinding.requestHash ||
    requestHash !== input.expectedRequestHash ||
    contractHash(JsonValueSchema.parse(input.request)) !== requestHash ||
    requestBinding.bodyHash !== input.bodyHash ||
    requestBinding.bodyLabel !== input.expectedBodyLabel
  ) {
    throw new CampaignArtifactError("cell_request_binding_mismatch");
  }
  if (
    receipt.result.episodeId !== input.request.episodeId ||
    receipt.result.runId !== input.request.runId ||
    receipt.result.runLockHash !== input.request.runLockHash ||
    receipt.evidenceIndex.episodeId !== input.request.episodeId ||
    receipt.evidenceIndex.runId !== input.request.runId ||
    receipt.evidenceIndex.runLockHash !== input.request.runLockHash ||
    receipt.variantLabel !== input.expectedBodyLabel ||
    receipt.variantLabel !==
      deterministicVariantLabel(
        input.request.runLockHash,
        input.request.episodeId,
        input.request.variant,
      )
  ) {
    throw new CampaignArtifactError("cell_receipt_binding_mismatch");
  }
  if (
    receipt.result.evidenceIndexHash !==
    contractHash(JsonValueSchema.parse(receipt.evidenceIndex))
  ) {
    throw new CampaignArtifactError("cell_evidence_index_hash_mismatch");
  }
  const artifactRefs = Object.entries(receipt.artifacts).map(
    ([name, reference]) => ({
      name,
      path: reference.path,
      sha256: reference.sha256,
    }),
  );
  for (const reference of Object.values(receipt.artifacts)) {
    const artifact = await readHashedArtifact(
      artifactDirectory,
      reference.path,
    );
    if (artifact.sha256 !== reference.sha256)
      throw new CampaignArtifactError("cell_artifact_hash_mismatch");
    if (reference.path === receipt.artifacts.evidenceIndex.path) {
      const evidenceIndex = EvidenceIndexSchema.parse(
        JSON.parse(artifact.text),
      );
      if (
        contractHash(JsonValueSchema.parse(evidenceIndex)) !==
        receipt.result.evidenceIndexHash
      ) {
        throw new CampaignArtifactError(
          "cell_evidence_index_artifact_mismatch",
        );
      }
    }
  }
  return {
    receipt,
    receiptStatus: receipt.result.status,
    receiptSha256: sha256Text(storedReceipt),
    artifactDirectory,
    artifactRefs,
    requestPath: resolve(input.requestPath),
    requestSha256: sha256Text(requestText),
    requestHash,
    bodyLabel: receipt.variantLabel,
    runLockHash: receipt.result.runLockHash,
    score: receipt.result.score,
    hardPass: receipt.result.hardPass,
    criticalFailures: receipt.result.criticalFailures,
    usage: receipt.result.usage,
    violations: receipt.violations,
    isolationSentinels: receipt.result.criticalFailures.filter((failure) =>
      /^(?:isolation|sentinel)(?:-|$)/.test(failure),
    ),
  };
}

async function verifyPersistedCampaignCell(
  cell: CampaignCell,
  artifactRoot: string,
  expectedRunLockHash: string,
): Promise<void> {
  if (cell.runLockHash !== expectedRunLockHash)
    throw new CampaignArtifactError("prior_cell_run_lock_mismatch");
  if (!pathWithin(artifactRoot, cell.artifactDirectory))
    throw new CampaignArtifactError("prior_cell_artifact_root_mismatch");
  const physicalArtifactRoot = await realpath(artifactRoot);
  const physicalArtifactDirectory = await realpath(cell.artifactDirectory);
  if (!pathWithin(physicalArtifactRoot, physicalArtifactDirectory))
    throw new CampaignArtifactError("prior_cell_artifact_symlink_escape");
  const requestText = await readConfinedText(
    cell.artifactDirectory,
    cell.requestPath,
    "prior_cell_request_symlink_escape",
  );
  const requestBinding = CampaignRequestBindingSchema.parse(
    JSON.parse(requestText),
  );
  const request = requestBinding.request;
  const verified = await verifyCompletedCellArtifacts({
    completed: {
      receipt: CodexEpisodeReceiptSchema.parse(
        JSON.parse(await readFile(cell.receiptPath, "utf8")),
      ),
      artifactDirectory: cell.artifactDirectory,
      receiptPath: cell.receiptPath,
    },
    request,
    bodyHash: cell.bodyHash,
    requestPath: cell.requestPath,
    expectedRequestHash: cell.requestHash,
    expectedBodyLabel: cell.bodyLabel,
  });
  if (
    verified.receiptStatus !== cell.receiptStatus ||
    verified.receiptSha256 !== cell.receiptSha256 ||
    verified.requestSha256 !== cell.requestSha256 ||
    verified.requestHash !== cell.requestHash ||
    verified.bodyLabel !== cell.bodyLabel ||
    verified.runLockHash !== cell.runLockHash ||
    verified.score !== cell.score ||
    verified.hardPass !== cell.hardPass ||
    contractHash(JsonValueSchema.parse(verified.criticalFailures)) !==
      contractHash(JsonValueSchema.parse(cell.criticalFailures)) ||
    contractHash(JsonValueSchema.parse(verified.usage)) !==
      contractHash(JsonValueSchema.parse(cell.usage)) ||
    contractHash(JsonValueSchema.parse(verified.violations)) !==
      contractHash(JsonValueSchema.parse(cell.violations)) ||
    contractHash(JsonValueSchema.parse(verified.artifactRefs)) !==
      contractHash(JsonValueSchema.parse(cell.artifactRefs))
  ) {
    throw new CampaignArtifactError("prior_cell_evidence_mismatch");
  }
  if (
    request.runId !== cell.runId ||
    request.taskId !== cell.taskId ||
    request.replicate !== cell.localRep ||
    request.variant !== requestVariant(cell.variant)
  ) {
    throw new CampaignArtifactError("prior_cell_request_mismatch");
  }
}

async function defaultEvaluateSample(
  input: EvaluateSampleInput,
): Promise<CampaignSample> {
  const publicClaim = PublicTaskClaimSchema.parse(input.task.publicClaim);
  const fixture = await input.resolveFixture({
    fixtureRunRoot: input.runtime.fixtureRunRoot,
    taskId: input.task.id,
    publicClaim,
  });
  const request = EpisodeRequestSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "episode-request",
    episodeId: randomUUID(),
    runId: input.runId,
    runLockHash: input.runLockHash,
    variant: requestVariant(input.variant.variant),
    skill: input.skill,
    taskId: input.task.id,
    attempt: 1,
    replicate: input.replicate,
    prompt: fixture.publicClaim.text,
    workspaceFixtureHash: fixture.workspaceHash,
  });
  const artifactDirectory = join(
    input.artifactRoot,
    "episodes",
    request.episodeId,
  );
  const bodyLabel = deterministicVariantLabel(
    request.runLockHash,
    request.episodeId,
    request.variant,
  );
  const requestHash = contractHash(JsonValueSchema.parse(request));
  const requestBinding = CampaignRequestBindingSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "skillopt-campaign-request-binding",
    request,
    requestHash,
    bodyHash: input.variant.bodyHash,
    bodyLabel,
  });
  const requestPath = join(artifactDirectory, "campaign-request.json");
  const requestText = `${JSON.stringify(requestBinding)}\n`;
  await mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
  await writeFile(requestPath, requestText, { encoding: "utf8", mode: 0o600 });
  const completed = await input.runCell({
    request,
    fixtureRoot: fixture.workspaceRoot,
    sourceWorktree: input.sourceWorktree,
    artifactRoot: input.artifactRoot,
    targetSkill: input.skill,
    candidate: { body: input.variant.body },
    codexExecutable: input.runtime.codexExecutable,
    bwrapExecutable: input.runtime.bwrapExecutable,
    env: input.env,
    finalStateRequests: taskFinalStateRequests(
      input.task.id,
      fixture.evaluatorManifest.protocolContract !== undefined,
    ),
    evaluatorManifest: fixture.evaluatorManifest,
    hiddenMarkers: input.runtime.hiddenMarkers ?? [],
    pricingHash: input.runtime.pricingHash ?? "0".repeat(64),
    priceAmount: input.runtime.priceAmount ?? 0,
    timeoutMs: input.runtime.timeoutMs ?? 180_000,
  });
  const physicalArtifactRoot = await realpath(input.artifactRoot);
  const physicalArtifactDirectory = await realpath(completed.artifactDirectory);
  if (!pathWithin(physicalArtifactRoot, physicalArtifactDirectory))
    throw new CampaignArtifactError("cell_artifact_root_mismatch");
  const verified = await verifyCompletedCellArtifacts({
    completed,
    request,
    bodyHash: input.variant.bodyHash,
    requestPath,
    expectedRequestHash: requestHash,
    expectedBodyLabel: bodyLabel,
  });
  const securityFailures = [
    ...new Set([...verified.violations, ...verified.isolationSentinels]),
  ];
  return {
    score: verified.score,
    hardPass: verified.hardPass,
    criticalFailures: [...verified.criticalFailures],
    securityFailures,
    receiptPath: completed.receiptPath,
    usage: verified.usage,
    receiptStatus: verified.receiptStatus,
    receiptSha256: verified.receiptSha256,
    artifactDirectory: verified.artifactDirectory,
    artifactRefs: verified.artifactRefs,
    requestPath: verified.requestPath,
    requestSha256: verified.requestSha256,
    requestHash: verified.requestHash,
    bodyLabel: verified.bodyLabel,
    runLockHash: verified.runLockHash,
    violations: [...verified.violations],
    isolationSentinels: [...verified.isolationSentinels],
  };
}

export const defaultCampaignDependencies: CampaignDependencies = {
  sourceClean: sourceWorktreeIsClean,
  sourceFence: async (root) => {
    const { defaultSourceFence } = await import("./campaign-artifacts");
    return defaultSourceFence(root);
  },
  surface,
  runPreflight,
  runCanary: runCapabilityCanary,
  fixtureReadiness: probeFixtureReadiness,
  materializeFixtures: async ({ runRoot, sourceRoot, skill }) => {
    return materializeFixtureRun({
      runRoot,
      canonicalSkillRoot: join(sourceRoot, "packages/cli/src/public/skills"),
      publicTasks: buildSkillCatalog(skill).filter(
        (task) => task.split !== "held-out",
      ),
      heldOutTasks: [],
    }).roots.runRoot;
  },
  initializeBudget: initializeTargetEpisodeBudget,
  createRuntimeLease: createCodexRuntimeLease,
  developmentTasks: (fixtureRunRoot, skill) =>
    taskScopedPublicSkillDescriptors("development", fixtureRunRoot, skill),
  evaluateSample: defaultEvaluateSample,
  runCell: runCodexCell,
  resolveFixture: resolveTaskFixture,
  verifyCell: verifyPersistedCampaignCell,
  runOptimizerStep: runCodexSkillOptStep,
  readOptimizerParagraph: (artifactRoot) =>
    readFile(join(artifactRoot, "accepted-output/model-paragraph.md"), "utf8"),
  readModelReceipt: async (artifactRoot) =>
    JSON.parse(
      await readFile(
        join(artifactRoot, "accepted-output/receipt.json"),
        "utf8",
      ),
    ),
  assemble: assembleCanonicalSkills,
};

function requirePaid(allowPaid: boolean): void {
  if (!allowPaid) assertNoPaidFlag();
}

function validateDevelopmentTasks(
  tasks: readonly PublicTaskDescriptor[],
  skill: CanonicalSkill,
): void {
  const expected = buildSkillCatalog(skill).filter(
    (task) => task.split === "development",
  );
  if (
    tasks.length !== expected.length ||
    tasks.some((task) => task.split !== "development") ||
    new Set(tasks.map((task) => task.id)).size !== tasks.length ||
    tasks.some(
      (task) =>
        task.family.length === 0 ||
        !PublicTaskClaimSchema.safeParse(task.publicClaim).success,
    )
  ) {
    throw new CampaignArtifactError("development_task_set_invalid");
  }
}

async function paidPreparation(
  input: Readonly<{
    store: CampaignArtifactStore;
    sourceRoot: string;
    runId: string;
    skill: CanonicalSkill;
    maxTargetEpisodes?: number;
    allowTargetBudget: boolean;
    surfaceBefore: CampaignSourceSurface;
    env: NodeJS.ProcessEnv;
    dependencies: CampaignDependencies;
    beforeCanary?: (input: {
      tasks: readonly PublicTaskDescriptor[];
      fence: SourceFence;
      surface: CampaignSourceSurface;
    }) => Promise<void>;
  }>,
): Promise<
  Readonly<{
    beforeFence: SourceFence;
    fixtureRunRoot?: string;
    budgetEnv: NodeJS.ProcessEnv;
    tasks?: readonly PublicTaskDescriptor[];
    preflight: Awaited<ReturnType<typeof runPreflight>>;
    canary: CapabilityCanaryReceipt;
  }>
> {
  const { store, sourceRoot, runId, skill, dependencies } = input;
  if (!(await dependencies.sourceClean(sourceRoot, input.env))) {
    throw new CampaignArtifactError("source_not_clean");
  }
  const beforeFence = await dependencies.sourceFence(sourceRoot);
  const readinessRoot = join(store.root, `fixture-readiness-${randomUUID()}`);
  await dependencies.fixtureReadiness(
    readinessRoot,
    join(sourceRoot, "packages/cli"),
  );
  let fixtureRunRoot: string | undefined;
  let budgetEnv: NodeJS.ProcessEnv = {};
  let tasks: readonly PublicTaskDescriptor[] | undefined;
  if (input.allowTargetBudget) {
    if (input.maxTargetEpisodes === undefined)
      throw new CampaignArtifactError("target_budget_required");
    fixtureRunRoot = join(store.root, `fixtures-${randomUUID()}`);
    fixtureRunRoot = await dependencies.materializeFixtures({
      runRoot: fixtureRunRoot,
      sourceRoot,
      skill,
    });
    tasks = await dependencies.developmentTasks(fixtureRunRoot, skill);
    validateDevelopmentTasks(tasks, skill);
    budgetEnv = await dependencies.initializeBudget(
      join(store.root, "target-budget"),
      input.maxTargetEpisodes,
    );
  }
  const preflight = await dependencies.runPreflight({
    runId,
    sourceWorktree: sourceRoot,
    artifactRoot: store.root,
    env: input.env,
  });
  await store.writeJson("preflight.json", preflight);
  if (preflight.verdict !== "pass")
    throw new CampaignArtifactError("preflight_no_go");
  const preflightFence = await dependencies.sourceFence(sourceRoot);
  if (!sameFence(beforeFence, preflightFence))
    throw new CampaignArtifactError("source_fence_changed");
  if (!(await dependencies.sourceClean(sourceRoot, input.env)))
    throw new CampaignArtifactError("source_not_clean_before_canary");
  const preCanarySurface = await dependencies.surface(sourceRoot, skill);
  if (
    preCanarySurface.body !== input.surfaceBefore.body ||
    preCanarySurface.frontmatterHash !== input.surfaceBefore.frontmatterHash ||
    preCanarySurface.resourcesHash !== input.surfaceBefore.resourcesHash
  ) {
    throw new CampaignArtifactError("surface_changed");
  }
  if (input.beforeCanary !== undefined && tasks !== undefined) {
    await input.beforeCanary({
      tasks,
      fence: preflightFence,
      surface: preCanarySurface,
    });
  }
  const canary = await dependencies.runCanary({
    runId,
    sourceWorktree: sourceRoot,
    artifactRoot: store.root,
    env: input.env,
  });
  await store.writeJson("canary.json", canary);
  if (canary.verdict !== "pass")
    throw new CampaignArtifactError("canary_no_go");
  const afterFence = await dependencies.sourceFence(sourceRoot);
  if (!sameFence(beforeFence, afterFence))
    throw new CampaignArtifactError("source_fence_changed");
  if (!(await dependencies.sourceClean(sourceRoot, input.env)))
    throw new CampaignArtifactError("source_not_clean_after_canary");
  const current = await dependencies.surface(sourceRoot, skill);
  if (
    current.body !== input.surfaceBefore.body ||
    current.frontmatterHash !== input.surfaceBefore.frontmatterHash ||
    current.resourcesHash !== input.surfaceBefore.resourcesHash
  ) {
    throw new CampaignArtifactError("surface_changed");
  }
  return {
    beforeFence,
    ...(fixtureRunRoot === undefined ? {} : { fixtureRunRoot }),
    ...(tasks === undefined ? {} : { tasks }),
    budgetEnv,
    preflight,
    canary,
  };
}

async function openRunningStore(
  command: CampaignCommand,
  runId: string,
  sourceRoot: string,
  artifactRoot: string,
): Promise<CampaignArtifactStore> {
  const store = await CampaignArtifactStore.open({ artifactRoot, sourceRoot });
  await store.writeJson("campaign.json", {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-campaign",
    command,
    runId,
    status: "running",
  });
  return store;
}

async function persistFailure(
  store: CampaignArtifactStore,
  command: CampaignCommand,
  runId: string,
  error: unknown,
  attemptedCells: number,
  cells: readonly CampaignCell[],
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const state: CampaignState = {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-campaign-state",
    command,
    runId,
    status: "failed",
    attemptedCells,
    cells,
    error: message,
  };
  await store.writeJson("campaign-state.json", state);
  await store.writeJson("campaign.json", {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-campaign",
    command,
    runId,
    status: "failed",
    error: message,
  });
}

async function executeScreen(
  input: Readonly<{
    store: CampaignArtifactStore;
    command: EvaluationCommand;
    runId: string;
    skill: CanonicalSkill;
    variants: readonly Parameters<
      typeof runDevelopmentScreen
    >[0]["variants"][number][];
    tasks: readonly PublicTaskDescriptor[];
    repeats: 1 | 2 | 3;
    maxTargetEpisodes: number;
    runLockHash: string;
    sourceRoot: string;
    env: NodeJS.ProcessEnv;
    runtime: CampaignRuntime;
    dependencies: CampaignDependencies;
  }>,
): Promise<readonly CampaignCell[]> {
  let latestCells: readonly CampaignCell[] = [];
  let latestAttemptedCells = 0;
  let result: Awaited<ReturnType<typeof runDevelopmentScreen>>;
  try {
    result = await runDevelopmentScreen({
      variants: input.variants,
      tasks: input.tasks,
      repeats: input.repeats,
      maxCells: input.maxTargetEpisodes,
      evaluate: (variant, task, replicate) =>
        input.dependencies.evaluateSample({
          variant,
          task,
          replicate,
          skill: input.skill,
          sourceWorktree: input.sourceRoot,
          artifactRoot: input.store.root,
          runId: input.runId,
          runLockHash: input.runLockHash,
          env: input.env,
          runtime: input.runtime,
          runCell: input.dependencies.runCell,
          resolveFixture: input.dependencies.resolveFixture,
        }),
      checkpoint: async (state) => {
        latestAttemptedCells = state.attemptedCells;
        latestCells = campaignCells(
          input.runId,
          state.cells,
          input.variants[0]?.bodyHash ?? "",
          input.variants.slice(1).map((variant) => variant.bodyHash),
          input.runLockHash,
        );
        await input.store.writeJson("campaign-state.json", {
          schemaVersion: "1.0.0",
          artifactType: "skillopt-campaign-state",
          command: input.command,
          runId: input.runId,
          status: state.status === "failed" ? "failed" : "running",
          attemptedCells: state.attemptedCells,
          cells: latestCells,
          ...(state.error === undefined ? {} : { error: state.error }),
        });
      },
    });
  } catch (error) {
    throw new CampaignScreenFailure(latestAttemptedCells, latestCells, error);
  }
  return campaignCells(
    input.runId,
    result.cells,
    input.variants[0]?.bodyHash ?? "",
    input.variants.slice(1).map((variant) => variant.bodyHash),
    input.runLockHash,
  );
}

async function buildEvaluation(
  input: Readonly<{
    command: EvaluationCommand;
    runId: string;
    skill: CanonicalSkill;
    baselineBody: string;
    candidates: readonly CampaignManifest[];
    context: z.infer<ReturnType<typeof zEvaluationSchema>>["context"];
    cells: readonly CampaignCell[];
    runs: readonly {
      runId: string;
      kind: "new" | "prior";
      cellCount: number;
      repeats: 1 | 2 | 3;
      artifactRoot: string;
    }[];
  }>,
): Promise<CampaignEvaluation> {
  const baselineHash = sha256Text(input.baselineBody);
  const candidateHashes = input.candidates.map(
    (candidate) => candidate.frozenBodyHash,
  );
  const baseline = summarizeArm("baseline", baselineHash, input.cells);
  const candidates = candidateHashes.map((hash, index) =>
    summarizeArm(`candidate-${index + 1}`, hash, input.cells),
  );
  const comparison = compareAggregates(baseline, candidates);
  const pairings = buildPairings(input.cells, candidateHashes, baselineHash);
  return sealEvaluation({
    schemaVersion: "1.0.0",
    artifactType: "skillopt-campaign-evaluation",
    command: input.command,
    status: "complete",
    runId: input.runId,
    skill: input.skill,
    baselineBody: input.baselineBody,
    candidates: [...input.candidates],
    context: input.context,
    cells: [...input.cells],
    aggregate: { baseline, candidates, ...comparison },
    runs: input.runs,
    pairings,
  });
}

function taskCatalogHash(tasks: readonly PublicTaskDescriptor[]): string {
  return canonicalHash(
    tasks.map((task) => ({
      id: task.id,
      family: task.family,
      split: task.split,
      publicClaim: task.publicClaim,
    })),
  );
}

type CampaignIdentity = Readonly<{
  skill: CanonicalSkill;
  baselineBody: string;
  candidates: readonly Readonly<{
    skill: CanonicalSkill;
    baselineBodyHash: string;
    frontmatterHash: string;
    resourcesHash: string;
    frozenBodyHash: string;
  }>[];
  context: Readonly<{
    sourceHead: string;
    sourceTreeHash: string;
    sourceFileCount: number;
    baselineBodyHash: string;
    frontmatterHash: string;
    resourcesHash: string;
    taskCatalogHash: string;
    model: typeof CAMPAIGN_MODEL_PROFILE;
  }>;
}>;

function campaignIdentity(
  input: Readonly<{
    skill: CanonicalSkill;
    surface: CampaignSourceSurface;
    manifests: readonly CampaignManifest[];
    fence: SourceFence;
    tasks: readonly PublicTaskDescriptor[];
  }>,
): CampaignIdentity {
  return {
    skill: input.skill,
    baselineBody: input.surface.body,
    candidates: input.manifests.map((manifest) => ({
      skill: manifest.skill,
      baselineBodyHash: manifest.baselineBodyHash,
      frontmatterHash: manifest.frontmatterHash,
      resourcesHash: manifest.resourcesHash,
      frozenBodyHash: manifest.frozenBodyHash,
    })),
    context: {
      sourceHead: input.fence.head,
      sourceTreeHash: input.fence.treeHash,
      sourceFileCount: input.fence.files,
      baselineBodyHash: sha256Text(input.surface.body),
      frontmatterHash: input.surface.frontmatterHash,
      resourcesHash: input.surface.resourcesHash,
      taskCatalogHash: taskCatalogHash(input.tasks),
      model: CAMPAIGN_MODEL_PROFILE,
    },
  };
}

function campaignCohortHash(identity: CampaignIdentity, runId: string): string {
  return contractHash(JsonValueSchema.parse({ identity, cohortRunId: runId }));
}

export async function loadVerifiedCampaignEvaluation(
  input: Readonly<{
    evaluation: unknown;
    sourceRoot: string;
    candidateManifests: readonly CampaignManifest[];
    dependencies: Pick<
      CampaignDependencies,
      "sourceFence" | "surface" | "verifyCell"
    >;
  }>,
): Promise<CampaignEvaluation> {
  const evaluation = parseCompleteCampaignEvaluation(input.evaluation);
  const fence = await input.dependencies.sourceFence(input.sourceRoot);
  const current = await input.dependencies.surface(
    input.sourceRoot,
    evaluation.skill,
  );
  if (
    evaluation.baselineBody !== current.body ||
    evaluation.context.sourceHead !== fence.head ||
    evaluation.context.sourceTreeHash !== fence.treeHash ||
    evaluation.context.sourceFileCount !== fence.files ||
    evaluation.context.baselineBodyHash !== sha256Text(current.body) ||
    evaluation.context.frontmatterHash !== current.frontmatterHash ||
    evaluation.context.resourcesHash !== current.resourcesHash
  ) {
    throw new CampaignArtifactError("package_evidence_context_stale");
  }
  if (
    contractHash(JsonValueSchema.parse(evaluation.context.model)) !==
    contractHash(JsonValueSchema.parse(CAMPAIGN_MODEL_PROFILE))
  ) {
    throw new CampaignArtifactError("package_evidence_model_mismatch");
  }
  if (
    input.candidateManifests.length !== evaluation.candidates.length ||
    input.candidateManifests.some((manifest) => {
      const recorded = evaluation.candidates.find(
        (candidate) => candidate.skill === manifest.skill,
      );
      return (
        recorded === undefined ||
        manifestHash(recorded) !== manifestHash(manifest)
      );
    })
  ) {
    throw new CampaignArtifactError("package_evidence_candidate_mismatch");
  }
  for (const manifest of evaluation.candidates)
    validateCampaignManifestAgainstSurface(manifest, current);

  const identity: CampaignIdentity = {
    skill: evaluation.skill,
    baselineBody: evaluation.baselineBody,
    candidates: evaluation.candidates.map((manifest) => ({
      skill: manifest.skill,
      baselineBodyHash: manifest.baselineBodyHash,
      frontmatterHash: manifest.frontmatterHash,
      resourcesHash: manifest.resourcesHash,
      frozenBodyHash: manifest.frozenBodyHash,
    })),
    context: {
      sourceHead: fence.head,
      sourceTreeHash: fence.treeHash,
      sourceFileCount: fence.files,
      baselineBodyHash: sha256Text(current.body),
      frontmatterHash: current.frontmatterHash,
      resourcesHash: current.resourcesHash,
      taskCatalogHash: evaluation.context.taskCatalogHash,
      model: CAMPAIGN_MODEL_PROFILE,
    },
  };
  if (
    evaluation.context.cohortBindingHash !==
    campaignCohortHash(identity, evaluation.runId)
  ) {
    throw new CampaignArtifactError("package_evidence_cohort_mismatch");
  }

  const expectedBodyHashes = new Set([
    sha256Text(evaluation.baselineBody),
    ...evaluation.candidates.map((candidate) => candidate.frozenBodyHash),
  ]);
  const seenRunIds = new Set<string>();
  let expectedCellCount = 0;
  for (const run of evaluation.runs) {
    if (seenRunIds.has(run.runId))
      throw new CampaignArtifactError("package_evidence_duplicate_run");
    seenRunIds.add(run.runId);
    const runCells = evaluation.cells.filter(
      (cell) => cell.runId === run.runId,
    );
    if (runCells.length !== run.cellCount)
      throw new CampaignArtifactError("package_evidence_cell_count_mismatch");
    expectedCellCount += run.cellCount;
    const expectedRunLockHash = campaignCohortHash(identity, run.runId);
    for (const cell of runCells) {
      if (
        cell.runLockHash !== expectedRunLockHash ||
        !expectedBodyHashes.has(cell.bodyHash)
      ) {
        throw new CampaignArtifactError("package_evidence_cell_unbound");
      }
      await input.dependencies.verifyCell(
        cell as CampaignCell,
        run.artifactRoot,
        expectedRunLockHash,
      );
    }
  }
  if (expectedCellCount !== evaluation.cells.length)
    throw new CampaignArtifactError("package_evidence_foreign_cell");
  return evaluation;
}

async function verifyPriorCampaignBeforeCanary(
  input: Readonly<{
    prior: CampaignEvaluation;
    identity: CampaignIdentity;
    tasks: readonly PublicTaskDescriptor[];
    candidateHashes: readonly string[];
    dependencies: CampaignDependencies;
  }>,
): Promise<void> {
  if (
    contractHash(JsonValueSchema.parse(evaluationBinding(input.prior))) !==
    contractHash(JsonValueSchema.parse(input.identity))
  ) {
    throw new CampaignArtifactError("confirmation_binding_mismatch");
  }
  if (
    input.prior.context.cohortBindingHash !==
    campaignCohortHash(input.identity, input.prior.runId)
  ) {
    throw new CampaignArtifactError("prior_cohort_binding_mismatch");
  }
  const runIds = new Set<string>();
  const priorCells: CampaignCell[] = input.prior.cells.map((cell) => ({
    ...cell,
    variant: cell.variant as CampaignCell["variant"],
    criticalFailures: [...cell.criticalFailures],
    securityFailures: [...cell.securityFailures],
    artifactRefs: [...cell.artifactRefs],
    violations: [...cell.violations],
    isolationSentinels: [...cell.isolationSentinels],
  }));
  const cohorts: CampaignCohort[] = input.prior.runs.map((run) => {
    if (runIds.has(run.runId))
      throw new CampaignArtifactError("prior_cohort_duplicate");
    runIds.add(run.runId);
    return {
      runId: run.runId,
      repeats: run.repeats,
      artifactRoot: run.artifactRoot,
    };
  });
  if (!runIds.has(input.prior.runId))
    throw new CampaignArtifactError("prior_cohort_missing");
  validateCellSet(
    priorCells,
    cohorts,
    input.tasks,
    sha256Text(input.identity.baselineBody),
    input.candidateHashes,
  );
  for (const cell of priorCells) {
    const cohort = cohorts.find((candidate) => candidate.runId === cell.runId);
    if (cohort === undefined)
      throw new CampaignArtifactError("prior_cell_cohort_missing");
    await input.dependencies.verifyCell(
      cell,
      cohort.artifactRoot,
      campaignCohortHash(input.identity, cohort.runId),
    );
  }
}

function assertSameCandidateSurface(
  manifests: readonly CampaignManifest[],
  skill: CanonicalSkill,
): void {
  if (manifests.length < 1 || manifests.length > 3)
    throw new CampaignArtifactError("candidate_count_invalid");
  if (manifests.some((manifest) => manifest.skill !== skill))
    throw new CampaignArtifactError("candidate_skill_mismatch");
  if (
    new Set(manifests.map((manifest) => manifest.frozenBodyHash)).size !==
    manifests.length
  ) {
    throw new CampaignArtifactError("candidate_duplicate");
  }
}

export async function runReviseCampaign(
  input: Readonly<{
    sourceRoot: string;
    artifactRoot: string;
    skill: CanonicalSkill;
    objective: string;
    feedback?: PublicFeedback;
    headingAnchor: string;
    allowPaid: boolean;
    runId?: string;
    env?: NodeJS.ProcessEnv;
    dependencies?: Partial<CampaignDependencies>;
  }>,
): Promise<CampaignManifest> {
  requirePaid(input.allowPaid);
  const dependencies = {
    ...defaultCampaignDependencies,
    ...input.dependencies,
  };
  const runId = input.runId ?? randomUUID();
  const store = await openRunningStore(
    "revise",
    runId,
    input.sourceRoot,
    input.artifactRoot,
  );
  try {
    const feedback =
      input.feedback === undefined
        ? undefined
        : parsePublicFeedback(input.feedback);
    const current = await dependencies.surface(input.sourceRoot, input.skill);
    const objective = input.objective.trim().replace(/\s+/g, " ");
    if (objective.length === 0 || objective.length > 1_000)
      throw new CampaignArtifactError("objective_invalid");
    const plan: BaselineInsertionPlan = {
      currentBaselineBodyHash: sha256Text(current.body),
      frontmatterHash: current.frontmatterHash,
      resourcesHash: current.resourcesHash,
      headingAnchor: input.headingAnchor,
      objective,
    };
    await store.writeJson("frozen-bodies.json", {
      baselineBodyHash: sha256Text(current.body),
      candidateBodyHashes: [],
    });
    const preparation = await paidPreparation({
      store,
      sourceRoot: input.sourceRoot,
      runId,
      skill: input.skill,
      surfaceBefore: current,
      allowTargetBudget: false,
      env: input.env ?? process.env,
      dependencies,
    });
    const result = await dependencies.runOptimizerStep({
      sourceWorktree: input.sourceRoot,
      artifactRoot: store.root,
      runId,
      env: input.env ?? process.env,
      request: {
        skill: input.skill,
        step: 1,
        maxSteps: 1,
        currentBody: current.body,
        trainTrajectories:
          feedback === undefined ? [] : feedbackTrajectories(feedback),
        previousDevelopment: { mean: 0, hardPasses: 0, worstFamilyMean: 0 },
      },
      baselineInsertion: plan,
    } satisfies CodexOptimizerOptions);
    const paragraph = await dependencies.readOptimizerParagraph(store.root);
    const receipt = await dependencies.readModelReceipt(store.root);
    const receiptBindings = {
      bodyHash: sha256Text(result.body),
      modelParagraphHash: sha256Text(paragraph),
      objectiveHash: sha256Text(objective),
      baselineBodyHash: sha256Text(current.body),
      currentBaselineBodyHash: sha256Text(current.body),
      frontmatterHash: current.frontmatterHash,
      resourcesHash: current.resourcesHash,
    };
    if (
      Object.entries(receiptBindings).some(
        ([key, expected]) => receipt[key] !== expected,
      )
    ) {
      throw new CampaignArtifactError("optimizer_receipt_mismatch");
    }
    const provenance: CampaignModelProvenance = {
      kind: "model",
      modelSource: "runCodexSkillOptStep",
      objectiveHash: sha256Text(objective),
      modelReceipt: receipt,
    };
    const manifest = composeCampaignManifest({
      skill: input.skill,
      surface: current,
      insertions: [{ headingAnchor: input.headingAnchor, paragraph }],
      provenance,
    });
    if (manifest.frozenBody !== result.body)
      throw new CampaignArtifactError("optimizer_body_mismatch");
    await store.writeJson("manifest.json", manifest);
    await store.writeText("frozen-body.md", manifest.frozenBody);
    if (feedback !== undefined)
      await store.writeJson("public-feedback.json", feedback);
    await store.writeJson("campaign.json", {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-campaign",
      command: "revise",
      runId,
      status: "complete",
      manifestHash: manifestHash(manifest),
      sourceHead: preparation.beforeFence.head,
    });
    return manifest;
  } catch (error) {
    await persistFailure(store, "revise", runId, error, 0, []);
    throw error;
  } finally {
    await store.close();
  }
}

export async function runComposeCampaign(
  input: Readonly<{
    sourceRoot: string;
    artifactRoot: string;
    skill: CanonicalSkill;
    insertions: readonly { headingAnchor: string; paragraph: string }[];
    runId?: string;
    dependencies?: Partial<CampaignDependencies>;
  }>,
): Promise<CampaignManifest> {
  const dependencies = {
    ...defaultCampaignDependencies,
    ...input.dependencies,
  };
  const runId = input.runId ?? randomUUID();
  const store = await openRunningStore(
    "compose",
    runId,
    input.sourceRoot,
    input.artifactRoot,
  );
  try {
    const current = await dependencies.surface(input.sourceRoot, input.skill);
    const manifest = composeCampaignManifest({
      skill: input.skill,
      surface: current,
      insertions: input.insertions,
      provenance: { kind: "host-composed", modelSource: "none" },
    });
    await store.writeJson("manifest.json", manifest);
    await store.writeText("frozen-body.md", manifest.frozenBody);
    await store.writeJson("campaign.json", {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-campaign",
      command: "compose",
      runId,
      status: "complete",
      manifestHash: manifestHash(manifest),
    });
    return manifest;
  } catch (error) {
    await persistFailure(store, "compose", runId, error, 0, []);
    throw error;
  } finally {
    await store.close();
  }
}

async function evaluateWithPreparation(
  input: Readonly<{
    command: EvaluationCommand;
    sourceRoot: string;
    artifactRoot: string;
    skill: CanonicalSkill;
    manifests: readonly CampaignManifest[];
    repeats: 1 | 2 | 3;
    maxTargetEpisodes: number;
    allowPaid: boolean;
    runId: string;
    dependencies: CampaignDependencies;
    env?: NodeJS.ProcessEnv;
    prior?: CampaignEvaluation;
  }>,
): Promise<CampaignEvaluation> {
  requirePaid(input.allowPaid);
  const store = await openRunningStore(
    input.command,
    input.runId,
    input.sourceRoot,
    input.artifactRoot,
  );
  try {
    const current = await input.dependencies.surface(
      input.sourceRoot,
      input.skill,
    );
    for (const manifest of input.manifests)
      validateCampaignManifestAgainstSurface(manifest, current);
    assertSameCandidateSurface(input.manifests, input.skill);
    const developmentTaskCount = buildSkillCatalog(input.skill).filter(
      (task) => task.split === "development",
    ).length;
    const requiredCells =
      input.repeats * (input.manifests.length + 1) * developmentTaskCount;
    if (input.maxTargetEpisodes < requiredCells) {
      throw new CampaignArtifactError(
        "target_budget_insufficient_before_canary",
      );
    }
    // Freeze every body before any preflight/canary dispatch.
    await store.writeJson("frozen-bodies.json", {
      baselineBodyHash: sha256Text(current.body),
      candidateBodyHashes: input.manifests.map(
        (manifest) => manifest.frozenBodyHash,
      ),
    });
    const preparation = await paidPreparation({
      store,
      sourceRoot: input.sourceRoot,
      runId: input.runId,
      skill: input.skill,
      surfaceBefore: current,
      maxTargetEpisodes: input.maxTargetEpisodes,
      allowTargetBudget: true,
      env: input.env ?? process.env,
      dependencies: input.dependencies,
      beforeCanary:
        input.prior === undefined
          ? undefined
          : async ({ tasks, fence }) => {
              await verifyPriorCampaignBeforeCanary({
                prior: input.prior as CampaignEvaluation,
                identity: campaignIdentity({
                  skill: input.skill,
                  surface: current,
                  manifests: input.manifests,
                  fence,
                  tasks,
                }),
                tasks,
                candidateHashes: input.manifests.map(
                  (manifest) => manifest.frozenBodyHash,
                ),
                dependencies: input.dependencies,
              });
            },
    });
    if (preparation.fixtureRunRoot === undefined)
      throw new CampaignArtifactError("fixture_root_missing");
    if (preparation.tasks === undefined)
      throw new CampaignArtifactError("development_tasks_missing");
    const runtimeLease = await input.dependencies.createRuntimeLease({
      artifactRoot: store.root,
    });
    try {
      const runtime: CampaignRuntime = {
        fixtureRunRoot: preparation.fixtureRunRoot,
        codexExecutable: runtimeLease.codexExecutable,
        bwrapExecutable: runtimeLease.bwrapExecutable,
      };
      const tasks = preparation.tasks;
      const identity = campaignIdentity({
        skill: input.skill,
        surface: current,
        manifests: input.manifests,
        fence: preparation.beforeFence,
        tasks,
      });
      const runLockHash = campaignCohortHash(identity, input.runId);
      const baseline = {
        schemaVersion: "1.0.0" as const,
        artifactType: "skillopt-variant" as const,
        skill: input.skill,
        variant: "baseline" as const,
        status: "frozen" as const,
        body: current.body,
        bodyHash: sha256Text(current.body),
        frontmatterHash: current.frontmatterHash,
        resourcesHash: current.resourcesHash,
        provenance: "canonical" as const,
      };
      const candidates = input.manifests.map((manifest) => ({
        schemaVersion: "1.0.0" as const,
        artifactType: "skillopt-variant" as const,
        skill: manifest.skill,
        variant: "skillopt" as const,
        status: "frozen" as const,
        body: manifest.frozenBody,
        bodyHash: manifest.frozenBodyHash,
        frontmatterHash: manifest.frontmatterHash,
        resourcesHash: manifest.resourcesHash,
        provenance: "skillopt" as const,
      }));
      const cells = await executeScreen({
        store,
        command: input.command,
        runId: input.runId,
        skill: input.skill,
        variants: [baseline, ...candidates],
        tasks,
        repeats: input.repeats,
        maxTargetEpisodes: input.maxTargetEpisodes,
        runLockHash,
        sourceRoot: input.sourceRoot,
        env: { ...(input.env ?? process.env), ...preparation.budgetEnv },
        runtime,
        dependencies: input.dependencies,
      });
      const priorCells: CampaignCell[] =
        input.prior?.cells.map((cell) => ({
          ...cell,
          variant: cell.variant as CampaignCell["variant"],
          criticalFailures: [...cell.criticalFailures],
          securityFailures: [...cell.securityFailures],
        })) ?? [];
      const allCells: CampaignCell[] =
        input.prior === undefined ? [...cells] : [...priorCells, ...cells];
      const cohorts: CampaignCohort[] = [
        ...(input.prior?.runs.map((run) => ({
          runId: run.runId,
          repeats: run.repeats,
          artifactRoot: run.artifactRoot,
        })) ?? []),
        {
          runId: input.runId,
          repeats: input.repeats,
          artifactRoot: store.root,
        },
      ];
      validateCellSet(
        allCells,
        cohorts,
        tasks,
        baseline.bodyHash,
        input.manifests.map((manifest) => manifest.frozenBodyHash),
      );
      const sourceFence = await input.dependencies.sourceFence(
        input.sourceRoot,
      );
      const finalSurface = await input.dependencies.surface(
        input.sourceRoot,
        input.skill,
      );
      if (
        !sameFence(preparation.beforeFence, sourceFence) ||
        finalSurface.body !== current.body ||
        finalSurface.frontmatterHash !== current.frontmatterHash ||
        finalSurface.resourcesHash !== current.resourcesHash
      ) {
        throw new CampaignArtifactError("source_or_surface_changed");
      }
      if (
        !(await input.dependencies.sourceClean(
          input.sourceRoot,
          input.env ?? process.env,
        ))
      )
        throw new CampaignArtifactError("source_not_clean_after_screen");
      const context = {
        sourceHead: sourceFence.head,
        sourceTreeHash: sourceFence.treeHash,
        sourceFileCount: sourceFence.files,
        baselineBodyHash: baseline.bodyHash,
        frontmatterHash: current.frontmatterHash,
        resourcesHash: current.resourcesHash,
        repeats: input.repeats,
        maxTargetEpisodes: input.maxTargetEpisodes,
        taskCatalogHash: taskCatalogHash(tasks),
        cohortBindingHash: runLockHash,
        model: CAMPAIGN_MODEL_PROFILE,
      } as const;
      const evaluation = await buildEvaluation({
        command: input.command,
        runId: input.runId,
        skill: input.skill,
        baselineBody: current.body,
        candidates: input.manifests,
        context,
        cells: allCells,
        runs:
          input.prior === undefined
            ? [
                {
                  runId: input.runId,
                  kind: "new",
                  cellCount: cells.length,
                  repeats: input.repeats,
                  artifactRoot: store.root,
                },
              ]
            : [
                ...input.prior.runs.map((run) => ({
                  ...run,
                  kind: "prior" as const,
                })),
                {
                  runId: input.runId,
                  kind: "new" as const,
                  cellCount: cells.length,
                  repeats: input.repeats,
                  artifactRoot: store.root,
                },
              ],
      });
      await store.writeJson("evaluation.json", evaluation);
      await store.writeJson("campaign.json", {
        schemaVersion: "1.0.0",
        artifactType: "skillopt-campaign",
        command: input.command,
        runId: input.runId,
        status: "complete",
        evaluationHash: evaluation.contentHash,
      });
      if (input.command === "confirm" && !evaluation.aggregate.noRegression)
        throw new CampaignArtifactError("confirmation_noregression_failed");
      return evaluation;
    } finally {
      await runtimeLease.cleanup();
    }
  } catch (error) {
    await persistFailure(
      store,
      input.command,
      input.runId,
      error,
      error instanceof CampaignScreenFailure ? error.attemptedCells : 0,
      error instanceof CampaignScreenFailure ? error.cells : [],
    );
    throw error;
  } finally {
    await store.close();
  }
}

export async function runEvaluateCampaign(
  input: Readonly<{
    sourceRoot: string;
    artifactRoot: string;
    skill: CanonicalSkill;
    manifests: readonly CampaignManifest[];
    repeats: 1 | 2 | 3;
    maxTargetEpisodes: number;
    allowPaid: boolean;
    runId?: string;
    env?: NodeJS.ProcessEnv;
    dependencies?: Partial<CampaignDependencies>;
  }>,
): Promise<CampaignEvaluation> {
  const dependencies = {
    ...defaultCampaignDependencies,
    ...input.dependencies,
  };
  return evaluateWithPreparation({
    command: "evaluate",
    sourceRoot: input.sourceRoot,
    artifactRoot: input.artifactRoot,
    skill: input.skill,
    manifests: input.manifests,
    repeats: input.repeats,
    maxTargetEpisodes: input.maxTargetEpisodes,
    allowPaid: input.allowPaid,
    runId: input.runId ?? randomUUID(),
    dependencies,
    env: input.env,
  });
}

export async function runConfirmCampaign(
  input: Readonly<{
    sourceRoot: string;
    artifactRoot: string;
    previousEvaluation: unknown;
    repeats: 1 | 2 | 3;
    maxTargetEpisodes: number;
    allowPaid: boolean;
    runId?: string;
    env?: NodeJS.ProcessEnv;
    dependencies?: Partial<CampaignDependencies>;
  }>,
): Promise<CampaignEvaluation> {
  const prior = parseCompleteCampaignEvaluation(input.previousEvaluation);
  const dependencies = {
    ...defaultCampaignDependencies,
    ...input.dependencies,
  };
  return evaluateWithPreparation({
    command: "confirm",
    sourceRoot: input.sourceRoot,
    artifactRoot: input.artifactRoot,
    skill: prior.skill,
    manifests: prior.candidates,
    repeats: input.repeats,
    maxTargetEpisodes: input.maxTargetEpisodes,
    allowPaid: input.allowPaid,
    runId: input.runId ?? randomUUID(),
    dependencies,
    prior,
    env: input.env,
  });
}

export async function runPackageCampaign(
  input: Readonly<{
    sourceRoot: string;
    artifactRoot: string;
    manifests: readonly CampaignManifest[];
    evaluation?: unknown;
    runId?: string;
    dependencies?: Partial<CampaignDependencies>;
  }>,
): Promise<SkillAssemblyReceipt> {
  const dependencies = {
    ...defaultCampaignDependencies,
    ...input.dependencies,
  };
  const runId = input.runId ?? randomUUID();
  if (input.manifests.length < 1 || input.manifests.length > 4)
    throw new CampaignArtifactError("package_candidate_count_invalid");
  const skills = input.manifests.map((manifest) => manifest.skill);
  if (new Set(skills).size !== skills.length)
    throw new CampaignArtifactError("package_duplicate_skill");
  const store = await openRunningStore(
    "package",
    runId,
    input.sourceRoot,
    input.artifactRoot,
  );
  try {
    const sourceFenceBefore = await dependencies.sourceFence(input.sourceRoot);
    const currentSurfaces = new Map<CanonicalSkill, CampaignSourceSurface>();
    for (const skill of CANONICAL_SKILLS) {
      currentSurfaces.set(
        skill,
        await dependencies.surface(input.sourceRoot, skill),
      );
    }
    for (const manifest of input.manifests) {
      const source = currentSurfaces.get(manifest.skill);
      if (source === undefined)
        throw new CampaignArtifactError("package_foreign_skill");
      validateCampaignManifestAgainstSurface(manifest, source);
    }
    const workspace = join(store.root, `package-workspace-${randomUUID()}`);
    await mkdir(workspace, { recursive: true, mode: 0o700 });
    const candidates = Object.fromEntries(
      input.manifests.map((manifest) => [
        manifest.skill,
        { body: manifest.frozenBody },
      ]),
    ) as Partial<Record<CanonicalSkill, { body: string }>>;
    const receipt = await dependencies.assemble({
      sourceRepoRoot: input.sourceRoot,
      workspace,
      targetSkill: input.manifests[0]?.skill ?? CANONICAL_SKILLS[0],
      candidates,
    });
    if (
      receipt.skills.length !== CANONICAL_SKILLS.length ||
      new Set(receipt.skills.map((entry) => entry.id)).size !==
        CANONICAL_SKILLS.length ||
      receipt.skills.some((entry) => !CANONICAL_SKILLS.includes(entry.id))
    ) {
      throw new CampaignArtifactError("package_skill_set_invalid");
    }
    const assembledSurfaces = new Map<CanonicalSkill, CampaignSourceSurface>();
    for (const skill of CANONICAL_SKILLS) {
      const actual = readAssembledSkillSurface(workspace, skill);
      const source = currentSurfaces.get(skill);
      if (source === undefined)
        throw new CampaignArtifactError("package_source_surface_missing");
      if (
        actual.frontmatterHash !== source.frontmatterHash ||
        actual.resourcesHash !== source.resourcesHash
      ) {
        throw new CampaignArtifactError("package_assembled_surface_mismatch");
      }
      assembledSurfaces.set(skill, actual);
    }
    const sourceFenceAfter = await dependencies.sourceFence(input.sourceRoot);
    if (!sameFence(sourceFenceBefore, sourceFenceAfter))
      throw new CampaignArtifactError("package_source_fence_changed");

    for (const skill of CANONICAL_SKILLS) {
      const entry = receipt.skills.find((candidate) => candidate.id === skill);
      const actual = assembledSurfaces.get(skill);
      const source = currentSurfaces.get(skill);
      if (entry === undefined || actual === undefined || source === undefined)
        throw new CampaignArtifactError("package_skill_set_invalid");
      const manifest = input.manifests.find(
        (candidate) => candidate.skill === skill,
      );
      const expectedBody = manifest?.frozenBody ?? source.body;
      const bodyChanged = actual.body !== source.body;
      if (
        actual.body !== expectedBody ||
        entry.bodyHash !== sha256Text(actual.body) ||
        entry.frontmatterHash !== actual.frontmatterHash ||
        entry.resourcesHash !== actual.resourcesHash ||
        entry.bodyChanged !== bodyChanged
      ) {
        throw new CampaignArtifactError("package_assembly_identity_mismatch");
      }
      if (manifest === undefined && bodyChanged)
        throw new CampaignArtifactError("package_unrequested_body_change");
    }
    let evidenceValid = false;
    if (input.evaluation !== undefined) {
      const evaluation = await loadVerifiedCampaignEvaluation({
        evaluation: input.evaluation,
        sourceRoot: input.sourceRoot,
        candidateManifests: input.manifests,
        dependencies,
      });
      evidenceValid = evaluation.aggregate.noRegression;
    }
    await store.writeJson("package-receipt.json", {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-campaign-package",
      status: "ready-for-review",
      manifestReadiness: {
        valid: true,
        candidateSkills: skills,
        onlyCandidateBodiesChanged: CANONICAL_SKILLS.filter((skill) => {
          const actual = assembledSurfaces.get(skill);
          const source = currentSurfaces.get(skill);
          return (
            actual !== undefined &&
            source !== undefined &&
            actual.body !== source.body
          );
        }),
      },
      evidenceValid,
      productionAdoption: "not-performed",
      assembly: receipt,
    });
    await store.writeJson("campaign.json", {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-campaign",
      command: "package",
      runId,
      status: "complete",
    });
    return receipt;
  } catch (error) {
    await persistFailure(store, "package", runId, error, 0, []);
    throw error;
  } finally {
    await store.close();
  }
}
