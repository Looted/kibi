import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { contractHash } from "./contracts/common";
import { runCodexSkillOptStep } from "./runtime/codex-optimizer";

const SkillSchema = z.enum([
  "kibi-usage",
  "kibi-freshness",
  "kibi-traceability",
  "init-kibi",
]);
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
const OptimizerResultSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-optimizer-result"),
    requestHash: Sha256Schema,
    body: z.string().min(1).max(100_000),
    development: DevelopmentGateSchema,
  })
  .strict();

const CODEX_RUNTIME_ENV = "KIBI_SKILLOPT_CODEX_EXECUTABLE";
const BWRAP_RUNTIME_ENV = "KIBI_SKILLOPT_BWRAP_EXECUTABLE";

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (value === undefined || value.length === 0) {
    throw new Error(`missing_${name.slice(2)}`);
  }
  return value;
}

const requestPath = resolve(argument("--request"));
const resultPath = resolve(argument("--result"));
const request = OptimizerRequestSchema.parse(
  JSON.parse(await readFile(requestPath, "utf8")),
);
const result = process.argv.includes("--fake")
  ? { body: request.currentBody, development: request.previousDevelopment }
  : await runCodexSkillOptStep({
      sourceWorktree: resolve(import.meta.dir, "../.."),
      artifactRoot: resolve(dirname(resultPath), "optimizer-artifacts"),
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
    });
const payload = OptimizerResultSchema.parse({
  schemaVersion: "1.0.0",
  artifactType: "skillopt-optimizer-result",
  requestHash: contractHash(request),
  body: result.body,
  development: result.development,
});
await mkdir(dirname(resultPath), { recursive: true, mode: 0o700 });
await writeFile(resultPath, `${JSON.stringify(payload)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
