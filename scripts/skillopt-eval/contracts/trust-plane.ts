export const TRUST_PLANE_MODULE = true;
import { z } from "zod";
import {
  ArtifactIdSchema,
  CONTRACT_SCHEMA_VERSION,
  JsonValueSchema,
  NonEmptyStringSchema,
  Sha256Schema,
  boundedContractSchema,
  contractHash,
} from "./common";

const PROTOCOL_VERSION = "kibi-skillopt-trust-v1" as const;

const RoleProofSchema = z
  .object({
    keyId: NonEmptyStringSchema,
    signature: Sha256Schema,
  })
  .strict();

export const RootAuthorizationSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      protocolVersion: z.literal(PROTOCOL_VERSION),
      artifactType: z.literal("immutable-root-authorization"),
      authorizationId: ArtifactIdSchema,
      immutableRoots: z
        .object({
          corpus: Sha256Schema,
          evaluator: Sha256Schema,
          querySet: Sha256Schema,
          baseline: Sha256Schema,
          verifierRelease: Sha256Schema,
          artifactSchema: Sha256Schema,
        })
        .strict(),
      rootAuthority: RoleProofSchema,
    })
    .strict(),
);

const RunCeilingsSchema = z
  .object({
    totalMicrousd: z.int().nonnegative(),
    maxRequests: z.int().positive(),
    models: z
      .array(z.enum(["gpt-5.4-mini", "gpt-5.6-sol"]))
      .min(1)
      .max(2),
    maxInputTokens: z.int().positive(),
    maxOutputTokens: z.int().positive(),
    maxRetries: z.int().nonnegative(),
    timeoutMs: z.int().positive(),
  })
  .strict();

const IntegerPricingSchema = z
  .object({
    currency: z.literal("USD-microusd"),
    inputPerMillionTokensMicrousd: z.int().nonnegative(),
    outputPerMillionTokensMicrousd: z.int().nonnegative(),
    pricingHash: Sha256Schema,
  })
  .strict();

export const SupervisorParentSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      protocolVersion: z.literal(PROTOCOL_VERSION),
      artifactType: z.literal("supervisor-run-parent"),
      parentId: ArtifactIdSchema,
      rootAuthorizationHash: Sha256Schema,
      sourceRoot: Sha256Schema,
      candidateHashes: z
        .object({
          baseline: Sha256Schema,
          oneShot: Sha256Schema,
          skillopt: Sha256Schema,
        })
        .strict(),
      invocationHash: Sha256Schema,
      matrixId: ArtifactIdSchema,
      artifactSchemaDigest: Sha256Schema,
      ceilings: RunCeilingsSchema,
      pricing: IntegerPricingSchema,
      providerSupervisor: RoleProofSchema,
    })
    .strict(),
);

const SealSchema = z.enum([
  "seal-grow",
  "seal-shrink",
  "seal-write",
  "seal-seal",
]);

export const LauncherSessionSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      protocolVersion: z.literal(PROTOCOL_VERSION),
      artifactType: z.literal("launcher-session"),
      peer: z
        .object({
          role: z.literal("provider-supervisor"),
          uid: z.literal(61101),
          pid: z.int().positive(),
          keyId: NonEmptyStringSchema,
        })
        .strict(),
      descriptors: z
        .object({
          controlSocketFd: z.int().nonnegative(),
          servicePidfd: z.int().nonnegative(),
          sealedAuthorizationFd: z.int().nonnegative(),
          sealedSnapshotArtifactFd: z.int().nonnegative(),
        })
        .strict(),
      connectedSocket: z.literal(true),
      pidfdAuthenticated: z.literal(true),
      authorizationSeals: z
        .array(SealSchema)
        .length(4)
        .refine((seals) => new Set(seals).size === 4, "seal_inventory_invalid"),
    })
    .strict()
    .superRefine((session, context) => {
      const descriptors = Object.values(session.descriptors);
      if (new Set(descriptors).size !== descriptors.length) {
        context.addIssue({ code: "custom", message: "fd_inventory_invalid" });
      }
      if (session.peer.keyId.length === 0) {
        context.addIssue({ code: "custom", message: "peer_key_missing" });
      }
    }),
);

export const GeneratedArtifactReceiptSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      protocolVersion: z.literal(PROTOCOL_VERSION),
      artifactType: z.literal("generated-artifact-receipt"),
      parentHash: Sha256Schema,
      generatedArtifactRoot: Sha256Schema,
      authorizationMicrousd: z.literal(0),
      evaluator: RoleProofSchema,
      verifier: RoleProofSchema,
    })
    .strict(),
);

export type RootAuthorization = Readonly<
  z.infer<typeof RootAuthorizationSchema>
>;
export type SupervisorParent = Readonly<z.infer<typeof SupervisorParentSchema>>;
export type LauncherSession = Readonly<z.infer<typeof LauncherSessionSchema>>;
export type GeneratedArtifactReceipt = Readonly<
  z.infer<typeof GeneratedArtifactReceiptSchema>
>;

export class TrustPlaneBindingError extends Error {
  readonly name = "TrustPlaneBindingError";
}

export function parseRootAuthorization(value: unknown): RootAuthorization {
  return RootAuthorizationSchema.parse(value);
}

export function parseSupervisorParent(
  value: unknown,
  root: RootAuthorization,
): SupervisorParent {
  const parent = SupervisorParentSchema.parse(value);
  const rootHash = contractHash(JsonValueSchema.parse(root));
  if (
    parent.rootAuthorizationHash !== rootHash ||
    parent.artifactSchemaDigest !== root.immutableRoots.artifactSchema
  ) {
    throw new TrustPlaneBindingError("immutable_root_mismatch");
  }
  if (parent.providerSupervisor.keyId === root.rootAuthority.keyId) {
    throw new TrustPlaneBindingError("role_key_reuse");
  }
  return parent;
}

export function parseLauncherSession(value: unknown): LauncherSession {
  return LauncherSessionSchema.parse(value);
}

export function parseGeneratedArtifactReceipt(
  value: unknown,
  root: RootAuthorization,
  parent: SupervisorParent,
): GeneratedArtifactReceipt {
  const receipt = GeneratedArtifactReceiptSchema.parse(value);
  const parentHash = contractHash(JsonValueSchema.parse(parent));
  const immutableRoots = Object.values(root.immutableRoots);
  const roleKeys = new Set([
    root.rootAuthority.keyId,
    parent.providerSupervisor.keyId,
    receipt.evaluator.keyId,
    receipt.verifier.keyId,
  ]);
  if (
    receipt.parentHash !== parentHash ||
    immutableRoots.includes(receipt.generatedArtifactRoot)
  ) {
    throw new TrustPlaneBindingError("generated_artifact_binding_invalid");
  }
  if (roleKeys.size !== 4) {
    throw new TrustPlaneBindingError("role_key_reuse");
  }
  return receipt;
}
