import { z } from "zod";
import type { AdoptionReceipt, AutoAdoptionInput } from "./adoption";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import { JsonValueSchema, contractHash } from "./contracts/common";
import type { FrozenVariant } from "./variants";

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const RootsSchema = z
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
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export type CorpusRoots = z.infer<typeof RootsSchema>;
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const TrainResultSchema = z.looseObject({
  codex_candidate_body: z.string().min(1),
  codex_candidate_body_hash: z.string().regex(/^[a-f0-9]{64}$/),
  trainer_checkpoint_hash: z.string().regex(/^[a-f0-9]{64}$/),
  trajectory_hashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)),
  corpus_roots: RootsSchema,
});
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export const ReviewSchema = z
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
            heldOutCellCount: z.number().int().positive(),
            adoption: z.enum(["adopted", "unchanged", "blocked"]),
          })
          .strict(),
      )
      .min(1),
    sourceModified: z.boolean(),
    generatedAt: z.iso.datetime(),
  })
  .strict();
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export type PredicateDescriptor = Readonly<{
  id: string;
  family: string;
  split: "train" | "development";
  publicClaim: unknown;
}>;
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export type DevelopmentGate = Readonly<{
  mean: number;
  hardPasses: number;
  worstFamilyMean: number;
}>;
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export type TrainingInput = Readonly<{
  runId: string;
  skill: CanonicalSkill;
  sourceWorktree: string;
  artifactRoot: string;
  maxSteps: number;
  baseline: FrozenVariant;
  trainDescriptors: readonly PredicateDescriptor[];
  developmentDescriptors: readonly PredicateDescriptor[];
  corpusRoots: CorpusRoots;
  env: NodeJS.ProcessEnv;
  cellRuntime?: CodexCellRuntime;
}>;
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export type TrainingOutput = Readonly<{
  status: "frozen";
  candidateBody: string;
  trainerCheckpointHash: string;
  trajectoryHashes: readonly string[];
}>;
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
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
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export type RealOptimizationOptions = Readonly<{
  runId: string;
  artifactRoot: string;
  sourceWorktree: string;
  skills: readonly CanonicalSkill[];
  maxSteps: number;
  env?: NodeJS.ProcessEnv;
  cellRuntime?: CodexCellRuntime;
}>;
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
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
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export type HeldOutEvaluation = Readonly<{
  eligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE";
  cellCount: number;
}>;
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
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
  adopt: (input: AutoAdoptionInput) => Promise<AdoptionReceipt>;
}>;
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function canonicalHash(value: unknown): string {
  return contractHash(JsonValueSchema.parse(value));
}
// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export function requireRuntime(
  runtime: CodexCellRuntime | undefined,
): CodexCellRuntime {
  if (runtime === undefined) throw new Error("codex_cell_runtime_required");
  return runtime;
}
