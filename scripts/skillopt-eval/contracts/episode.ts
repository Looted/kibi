import { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  NonEmptyStringSchema,
  PriceEquivalentEstimateSchema,
  Sha256Schema,
  TimestampSchema,
  UsageSchema,
} from "./common";

// implements REQ-skillopt-codex-optimization
export const VariantSchema = z.enum(["baseline", "one-shot", "skillopt"]);
// implements REQ-skillopt-codex-optimization
export const SkillSchema = z.enum([
  "kibi-usage",
  "kibi-freshness",
  "kibi-traceability",
  "init-kibi",
  "bundle",
]);

// implements REQ-skillopt-codex-optimization
export const EpisodeRequestSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    artifactType: z.literal("episode-request"),
    episodeId: z.uuid(),
    runId: z.uuid(),
    runLockHash: Sha256Schema,
    variant: VariantSchema,
    skill: SkillSchema,
    taskId: NonEmptyStringSchema,
    attempt: z.int().min(1).max(2),
    prompt: z.string().min(1).max(100_000),
    workspaceFixtureHash: Sha256Schema,
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export const EpisodeResultSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    artifactType: z.literal("episode-result"),
    episodeId: z.uuid(),
    runId: z.uuid(),
    runLockHash: Sha256Schema,
    status: z.enum([
      "completed",
      "behavioral-failure",
      "infrastructure-failure",
      "interrupted",
    ]),
    startedAt: TimestampSchema,
    finishedAt: TimestampSchema,
    exitCode: z.int().nullable(),
    score: z.number().min(0).max(100),
    hardPass: z.boolean(),
    criticalFailures: z
      .array(NonEmptyStringSchema)
      .refine(
        (failures) => new Set(failures).size === failures.length,
        "critical failures must be unique",
      ),
    evidenceIndexHash: Sha256Schema,
    reconciliation: z
      .object({
        brokerTrace: z.boolean(),
        diagnosticReceipt: z.boolean(),
        finalStateQuery: z.boolean(),
      })
      .strict(),
    usage: UsageSchema,
    priceEquivalentEstimate: PriceEquivalentEstimateSchema,
  })
  .strict()
  .superRefine((result, context) => {
    const reconciled = Object.values(result.reconciliation).every(Boolean);
    if (
      result.status === "completed" &&
      (!reconciled || result.exitCode !== 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "completed result requires exit zero and reconciled evidence",
      });
    }
    if (
      result.hardPass &&
      (result.score < 85 || result.criticalFailures.length > 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "hard pass requires score >= 85 and no critical failures",
      });
    }
  });

// implements REQ-skillopt-codex-optimization
export type EpisodeRequest = Readonly<z.infer<typeof EpisodeRequestSchema>>;
// implements REQ-skillopt-codex-optimization
export type EpisodeResult = Readonly<z.infer<typeof EpisodeResultSchema>>;
