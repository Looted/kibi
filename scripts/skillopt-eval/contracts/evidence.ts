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

const EvidenceRootsSchema = z
  .object({
    publicManifestHash: Sha256Schema,
    workspaceHash: Sha256Schema,
    fixtureSeedHash: Sha256Schema,
  })
  .strict();

// implements REQ-skillopt-predicate-first-requirements
export const EvidenceBindingSchema = z
  .object({
    caseId: z.string().min(1),
    roots: EvidenceRootsSchema,
    sequence: z.int().positive(),
  })
  .strict();

const FinalStateFactSchema = z
  .object({
    id: z.string().min(1),
    factKind: z.enum([
      "subject",
      "property_value",
      "predicate",
      "predicate_schema",
      "rule_schema",
      "rule",
      "observation",
      "meta",
    ]),
    canonicalKey: z.string().min(1).optional(),
    predicateName: z.string().min(1).optional(),
    predicateArgs: z.array(z.string().min(1)).optional(),
    polarity: z.enum(["assert", "deny"]).optional(),
    ruleHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    semanticKey: z
      .string()
      .regex(/^SEM-[A-F0-9]{24}$/)
      .optional(),
    ruleSchemaId: z.string().min(1).optional(),
    claimKey: z
      .string()
      .regex(/^CLAIM-[A-F0-9]{16}$/)
      .optional(),
    claimText: z.string().min(1).optional(),
  })
  .strict();

const FinalStateRelationshipSchema = z
  .object({
    relationship: z.string().min(1),
    target: z.string().min(1),
  })
  .strict();

// implements REQ-skillopt-predicate-first-requirements
export const PredicateCaseSnapshotSchema = z
  .object({
    binding: EvidenceBindingSchema,
    facts: z.array(FinalStateFactSchema),
    relationships: z.array(FinalStateRelationshipSchema),
    logicClaims: z.array(z.string().regex(/^CLAIM-[A-F0-9]{16}$/)).default([]),
  })
  .strict();

// implements REQ-skillopt-predicate-first-requirements
export type EvidenceBinding = Readonly<z.infer<typeof EvidenceBindingSchema>>;
// implements REQ-skillopt-predicate-first-requirements
export type PredicateCaseSnapshot = Readonly<
  z.infer<typeof PredicateCaseSnapshotSchema>
>;

// implements REQ-skillopt-predicate-first-requirements
export class EvidenceBindingError extends Error {
  readonly name = "EvidenceBindingError";

  constructor(
    readonly reason:
      | "case-id"
      | "roots"
      | "sequence"
      | "snapshot-hash"
      | "malformed-snapshot",
  ) {
    super(`evidence_binding_${reason}`);
  }
}

// implements REQ-skillopt-predicate-first-requirements
export function decodePredicateCaseSnapshot(
  value: unknown,
  expected: EvidenceBinding,
): PredicateCaseSnapshot {
  const parsed = PredicateCaseSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    throw new EvidenceBindingError("malformed-snapshot");
  }
  if (parsed.data.binding.caseId !== expected.caseId) {
    throw new EvidenceBindingError("case-id");
  }
  if (
    parsed.data.binding.roots.publicManifestHash !==
      expected.roots.publicManifestHash ||
    parsed.data.binding.roots.workspaceHash !== expected.roots.workspaceHash ||
    parsed.data.binding.roots.fixtureSeedHash !== expected.roots.fixtureSeedHash
  ) {
    throw new EvidenceBindingError("roots");
  }
  if (parsed.data.binding.sequence !== expected.sequence) {
    throw new EvidenceBindingError("sequence");
  }
  return parsed.data;
}

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
