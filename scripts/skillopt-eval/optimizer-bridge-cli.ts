import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { CANONICAL_SKILLS } from "./catalog";
import { contractHash } from "./contracts/common";
import { resolveIsolationArtifactRoot } from "./runtime/artifact-root";
import {
  CodexOptimizerError,
  runCodexSkillOptStep,
} from "./runtime/codex-optimizer";

const SkillSchema = z.enum(CANONICAL_SKILLS);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const CorpusRootsSchema = z
  .object({
    corpus: Sha256Schema,
    evaluator: Sha256Schema,
    querySet: Sha256Schema,
    baseline: Sha256Schema,
    catalog: Sha256Schema,
    verifier: Sha256Schema,
    publicRoot: Sha256Schema,
    privateRoot: Sha256Schema,
    artifactSchema: Sha256Schema,
  })
  .strict();
const DevelopmentGateSchema = z
  .object({
    mean: z.number().min(0).max(1),
    hardPasses: z.number().int().min(0),
    worstFamilyMean: z.number().min(0).max(1),
  })
  .strict();
const TrajectorySchema = z
  .object({
    taskId: z.string().min(1),
    family: z.string().min(1),
    reflection: z.string().min(1),
    status: z
      .enum(["completed", "behavioral-failure"])
      .default("behavioral-failure"),
    soft: z.number().min(0).max(1).default(0),
    hard: z.union([z.literal(0), z.literal(1)]).default(0),
    failureCategories: z.array(z.string().min(1)).max(100).default([]),
    toolSequence: z.array(z.string().min(1).max(20_000)).max(100).default([]),
    finalStateSummary: z.string().max(20_000).default("{}"),
  })
  .strict();
const PublicEvidenceSummarySchema = z
  .object({
    attempts: z.number().int().positive(),
    hardPasses: z.number().int().nonnegative(),
    families: z
      .array(
        z
          .object({
            family: z.string().min(1),
            attempts: z.number().int().positive(),
            hardPasses: z.number().int().nonnegative(),
            meanSoft: z.number().min(0).max(1),
            failureCounts: z.array(
              z
                .object({
                  category: z.string().min(1),
                  count: z.number().int().positive(),
                })
                .strict(),
            ),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const OptimizerRequestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-optimizer-request"),
    runId: z.string().uuid(),
    skill: SkillSchema,
    step: z.number().int().min(1),
    maxSteps: z.number().int().min(1).max(4),
    currentBody: z.string().min(1).max(100_000),
    trainTrajectories: z.array(TrajectorySchema).min(1).max(8),
    publicEvidenceSummary: PublicEvidenceSummarySchema,
    previousDevelopment: DevelopmentGateSchema,
    sourceLockHash: Sha256Schema,
    corpusRoots: CorpusRootsSchema,
  })
  .strict();
export const OptimizerRejectionReasonSchema = z.enum([
  "candidate_empty",
  "candidate_too_large",
  "candidate_invalid_utf8",
  "candidate_frontmatter_changed",
  "candidate_resources_changed",
  "candidate_direct_kb_guidance",
  "candidate_prohibited_host_or_provider_claim",
  "optimizer_output_missing_body",
  "optimizer_output_incomplete_body",
  "optimizer_output_repository_policy_leak",
]);
const OptimizerAcceptedResultSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-optimizer-result"),
    status: z.literal("accepted"),
    requestHash: Sha256Schema,
    body: z.string().min(1).max(100_000),
    development: DevelopmentGateSchema,
  })
  .strict();
const OptimizerRejectedResultSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-optimizer-result"),
    status: z.literal("rejected"),
    requestHash: Sha256Schema,
    reason: OptimizerRejectionReasonSchema,
  })
  .strict();
export const OptimizerResultSchema = z.discriminatedUnion("status", [
  OptimizerAcceptedResultSchema,
  OptimizerRejectedResultSchema,
]);

const CODEX_RUNTIME_ENV = "KIBI_SKILLOPT_CODEX_EXECUTABLE";
const BWRAP_RUNTIME_ENV = "KIBI_SKILLOPT_BWRAP_EXECUTABLE";

export type OptimizerRejectionReason = z.infer<
  typeof OptimizerRejectionReasonSchema
>;

export type OptimizerBridgeDependencies = Readonly<{
  runCodexSkillOptStep: typeof runCodexSkillOptStep;
}>;

export function knownOptimizerRejectionReason(
  error: unknown,
): OptimizerRejectionReason | undefined {
  if (!(error instanceof CodexOptimizerError)) return undefined;
  const parsed = OptimizerRejectionReasonSchema.safeParse(error.message);
  return parsed.success ? parsed.data : undefined;
}

async function persistOptimizerRejection(
  artifactRoot: string,
  sourceWorktree: string,
  input: Readonly<{
    runId: string;
    skill: string;
    step: number;
    requestHash: string;
    reason: OptimizerRejectionReason;
  }>,
): Promise<void> {
  const rejectedRoot = resolveIsolationArtifactRoot(
    resolve(artifactRoot, "rejected-output"),
    sourceWorktree,
  );
  await mkdir(rejectedRoot, { recursive: true, mode: 0o700 });
  await writeFile(
    resolve(rejectedRoot, "receipt.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-optimizer-rejection-receipt",
      runId: input.runId,
      skill: input.skill,
      step: input.step,
      requestHash: input.requestHash,
      reason: input.reason,
    })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

function argument(args: readonly string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value === undefined || value.length === 0) {
    throw new Error(`missing_${name.slice(2)}`);
  }
  return value;
}

export async function optimizerBridgeMain(
  args: readonly string[] = process.argv.slice(2),
  dependencies: OptimizerBridgeDependencies = { runCodexSkillOptStep },
): Promise<void> {
  const requestPath = resolve(argument(args, "--request"));
  const resultPath = resolve(argument(args, "--result"));
  const request = OptimizerRequestSchema.parse(
    JSON.parse(await readFile(requestPath, "utf8")),
  );
  const sourceWorktree = resolve(import.meta.dir, "../..");
  const artifactRoot = resolve(dirname(resultPath), "optimizer-artifacts");
  const requestHash = contractHash(request);
  const result = args.includes("--fake")
    ? {
        status: "accepted" as const,
        body: request.currentBody,
        development: request.previousDevelopment,
      }
    : await (async () => {
        try {
          return {
            status: "accepted" as const,
            ...(await dependencies.runCodexSkillOptStep({
              sourceWorktree,
              artifactRoot,
              runId: request.runId,
              request: {
                skill: request.skill,
                step: request.step,
                maxSteps: request.maxSteps,
                currentBody: request.currentBody,
                trainTrajectories: request.trainTrajectories,
                publicEvidenceSummary: request.publicEvidenceSummary,
                previousDevelopment: request.previousDevelopment,
              },
              env: process.env,
              ...(process.env[CODEX_RUNTIME_ENV] === undefined
                ? {}
                : { codexExecutable: process.env[CODEX_RUNTIME_ENV] }),
              ...(process.env[BWRAP_RUNTIME_ENV] === undefined
                ? {}
                : { bwrapExecutable: process.env[BWRAP_RUNTIME_ENV] }),
            })),
          };
        } catch (error) {
          const reason = knownOptimizerRejectionReason(error);
          if (reason === undefined) throw error;
          await persistOptimizerRejection(artifactRoot, sourceWorktree, {
            runId: request.runId,
            skill: request.skill,
            step: request.step,
            requestHash,
            reason,
          });
          return { status: "rejected" as const, reason };
        }
      })();
  const payload = OptimizerResultSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "skillopt-optimizer-result",
    requestHash,
    status: result.status,
    ...(result.status === "accepted"
      ? { body: result.body, development: result.development }
      : { reason: result.reason }),
  });
  await mkdir(dirname(resultPath), { recursive: true, mode: 0o700 });
  await writeFile(resultPath, `${JSON.stringify(payload)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

if (import.meta.main) await optimizerBridgeMain();
