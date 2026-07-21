import { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  JsonValueSchema,
  NonEmptyStringSchema,
  Sha256Schema,
  TimestampSchema,
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
export const EvidenceIndexSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    artifactType: z.literal("evidence-index"),
    runId: z.uuid(),
    episodeId: z.uuid(),
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
  });

// implements REQ-skillopt-codex-optimization
export type EvidenceIndex = Readonly<z.infer<typeof EvidenceIndexSchema>>;
