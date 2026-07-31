import { z } from "zod";
import {
  ArtifactIdSchema,
  CONTRACT_SCHEMA_VERSION,
  NonEmptyStringSchema,
  PriceEquivalentEstimateSchema,
  Sha256Schema,
  TimestampSchema,
  UsageSchema,
  boundedContractSchema,
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
export const EpisodeRequestSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("episode-request"),
      episodeId: ArtifactIdSchema,
      runId: ArtifactIdSchema,
      runLockHash: Sha256Schema,
      variant: VariantSchema,
      skill: SkillSchema,
      taskId: NonEmptyStringSchema,
      attempt: z.int().min(1).max(2),
      replicate: z.int().min(1).max(3).optional(),
      prompt: z.string().min(1).max(100_000),
      workspaceFixtureHash: Sha256Schema,
    })
    .strict(),
);

// implements REQ-skillopt-codex-optimization
export const EpisodeResultSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("episode-result"),
      episodeId: ArtifactIdSchema,
      runId: ArtifactIdSchema,
      runLockHash: Sha256Schema,
      status: z.enum([
        "completed",
        "behavioral-failure",
        "infrastructure-failure",
        "interrupted",
        "budget-exhausted",
        "evidence-conflict",
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
          message:
            "completed result requires exit zero and reconciled evidence",
        });
      }
      if (new Date(result.finishedAt) < new Date(result.startedAt)) {
        context.addIssue({
          code: "custom",
          message: "finished timestamp precedes started timestamp",
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
      if (
        result.status !== "completed" &&
        (result.hardPass || result.score >= 85)
      ) {
        context.addIssue({
          code: "custom",
          message: "non-completed result cannot claim passing outcome",
        });
      }
    }),
);

// implements REQ-skillopt-codex-optimization
export type EpisodeRequest = Readonly<z.infer<typeof EpisodeRequestSchema>>;
// implements REQ-skillopt-codex-optimization
export type EpisodeResult = Readonly<z.infer<typeof EpisodeResultSchema>>;
