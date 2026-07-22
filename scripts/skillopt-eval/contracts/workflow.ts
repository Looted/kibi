import { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  NonEmptyStringSchema,
  PriceEquivalentEstimateSchema,
  Sha256Schema,
  TimestampSchema,
  UsageSchema,
  boundedContractSchema,
} from "./common";
import { SkillSchema, VariantSchema } from "./episode";

// implements REQ-skillopt-codex-optimization
export const LedgerEntrySchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("ledger-entry"),
      runId: z.uuid(),
      sequence: z.int().nonnegative(),
      previousEntryHash: Sha256Schema.nullable(),
      entryHash: Sha256Schema,
      occurredAt: TimestampSchema,
      episodeId: z.uuid().optional(),
      category: z.enum([
        "preflight",
        "development",
        "optimization",
        "held-out",
        "bundle",
        "infrastructure",
      ]),
      model: z.enum(["gpt-5.4-mini", "gpt-5.5", "none"]),
      usage: UsageSchema,
      priceEquivalentEstimate: PriceEquivalentEstimateSchema,
    })
    .strict()
    .superRefine((entry, context) => {
      const validLink =
        entry.sequence === 0
          ? entry.previousEntryHash === null
          : entry.previousEntryHash !== null;
      if (!validLink)
        context.addIssue({
          code: "custom",
          message: "ledger sequence/link mismatch",
        });
    }),
);

// implements REQ-skillopt-codex-optimization
export const RunStateSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("run-state"),
      runId: z.uuid(),
      runLockHash: Sha256Schema,
      phase: z.enum([
        "preflight",
        "development",
        "optimization",
        "held-out",
        "bundle",
        "review",
        "complete",
        "no-go",
      ]),
      completedEpisodeIds: z
        .array(z.uuid())
        .refine(
          (ids) => new Set(ids).size === ids.length,
          "completed episode ids must be unique",
        ),
      ledgerHeadHash: Sha256Schema.nullable(),
      updatedAt: TimestampSchema,
      interrupted: z.boolean(),
    })
    .strict()
    .superRefine((state, context) => {
      if (state.phase === "complete" && state.interrupted) {
        context.addIssue({
          code: "custom",
          message: "complete run state cannot be interrupted",
        });
      }
    }),
);

const LegacyReportSchema = boundedContractSchema(
  z
    .object({
      runId: z.uuid(),
      skill: NonEmptyStringSchema,
      variants: z.tuple([
        z.literal("baseline"),
        z.literal("one-shot"),
        z.literal("skillopt"),
      ]),
      cells: z.array(z.json()).min(1),
      costUsd: z.number().min(0).max(400),
      verdict: z.enum(["pass", "fail", "no-go"]),
    })
    .strict(),
);

// implements REQ-skillopt-codex-optimization
export const ReportV1Schema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("report"),
      runId: NonEmptyStringSchema,
      runLockHash: Sha256Schema,
      skill: SkillSchema,
      variants: z
        .tuple([VariantSchema, VariantSchema, VariantSchema])
        .refine(
          (variants) =>
            variants[0] === "baseline" &&
            variants[1] === "one-shot" &&
            variants[2] === "skillopt",
          "variants must use canonical order",
        ),
      cells: z
        .array(Sha256Schema)
        .min(1)
        .refine(
          (cells) => new Set(cells).size === cells.length,
          "cells must be unique",
        ),
      priceEquivalentEstimate: PriceEquivalentEstimateSchema,
      verdict: z.enum(["pass", "fail", "no-go"]),
      generatedAt: TimestampSchema,
      gateResults: z
        .object({
          aggregate: z.boolean(),
          bootstrap: z.boolean(),
          family: z.boolean(),
          security: z.boolean(),
          bundle: z.boolean().nullable(),
        })
        .strict(),
    })
    .strict(),
);

// implements REQ-skillopt-codex-optimization
export const ReportSchema = boundedContractSchema(
  z.union([ReportV1Schema, LegacyReportSchema]),
);
// implements REQ-skillopt-codex-optimization
export type Report = Readonly<z.infer<typeof ReportSchema>>;
