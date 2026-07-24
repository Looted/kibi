import { z } from "zod";
import {
  ArtifactIdSchema,
  CONTRACT_SCHEMA_VERSION,
  JsonValueSchema,
  Sha256Schema,
  TimestampSchema,
  boundedContractSchema,
} from "./common";

// implements REQ-skillopt-codex-optimization
export const EvidenceEnvelopeSchema = z
  .object({
    sequence: z.int().nonnegative(),
    receivedAt: TimestampSchema,
    event: z.record(z.string(), JsonValueSchema),
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export const EvidenceIndexSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("evidence-index"),
      runId: ArtifactIdSchema,
      episodeId: ArtifactIdSchema,
      runLockHash: Sha256Schema,
      events: z.array(EvidenceEnvelopeSchema).max(100_000),
      brokerTraceHash: Sha256Schema,
      diagnosticReceiptHash: Sha256Schema,
      finalStateHash: Sha256Schema,
      truncated: z.boolean(),
    })
    .strict()
    .superRefine((index, context) => {
      const sequences = index.events.map((event) => event.sequence);
      if (new Set(sequences).size !== sequences.length) {
        context.addIssue({
          code: "custom",
          message: "evidence sequences must be unique",
        });
      }
    }),
);

// implements REQ-skillopt-codex-optimization
export type EvidenceIndex = Readonly<z.infer<typeof EvidenceIndexSchema>>;
