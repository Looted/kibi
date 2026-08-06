import { createHash } from "node:crypto";
import { z } from "zod";
import {
  JsonValueSchema,
  Sha256Schema,
  canonicalJson,
  contractHash,
} from "../contracts/common";

const SplitSchema = z.enum(["train", "development", "held-out"]);

/**
 * Independent fixture authorization claim.
 * Local materialization is non-authorizing; an authorized claim must bind
 * identity, split/family, public/private hashes, and the claim root.
 */
export const FixtureAuthorizationClaimSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-fixture-authorization-claim"),
    taskId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
    split: SplitSchema,
    family: z.string().regex(/^[a-z0-9-]+$/),
    publicManifestHash: Sha256Schema,
    workspaceHash: Sha256Schema,
    evaluatorManifestHash: Sha256Schema,
    authorizedClaimRoot: Sha256Schema,
  })
  .strict();

export type FixtureAuthorizationClaim = z.infer<
  typeof FixtureAuthorizationClaimSchema
>;

export class FixtureClaimError extends Error {
  readonly name = "FixtureClaimError";

  constructor(readonly code: string) {
    super(code);
  }
}

export function hashFixtureClaimRoot(
  claim: Omit<FixtureAuthorizationClaim, "authorizedClaimRoot">,
): string {
  return contractHash(JsonValueSchema.parse(claim));
}

export function buildFixtureAuthorizationClaim(input: {
  readonly taskId: string;
  readonly split: "train" | "development" | "held-out";
  readonly family: string;
  readonly publicManifestHash: string;
  readonly workspaceHash: string;
  readonly evaluatorManifestHash: string;
}): FixtureAuthorizationClaim {
  const binding = {
    schemaVersion: "1.0.0" as const,
    artifactType: "skillopt-fixture-authorization-claim" as const,
    taskId: input.taskId,
    split: input.split,
    family: input.family,
    publicManifestHash: input.publicManifestHash,
    workspaceHash: input.workspaceHash,
    evaluatorManifestHash: input.evaluatorManifestHash,
  };
  return FixtureAuthorizationClaimSchema.parse({
    ...binding,
    authorizedClaimRoot: hashFixtureClaimRoot(binding),
  });
}

export function assertFixtureAuthorizationClaim(
  value: unknown,
  expected: Readonly<{
    taskId: string;
    split: "train" | "development" | "held-out";
    family: string;
    publicManifestHash: string;
    workspaceHash: string;
    evaluatorManifestHash: string;
  }>,
): FixtureAuthorizationClaim {
  const claim = FixtureAuthorizationClaimSchema.parse(value);
  const rebuilt = buildFixtureAuthorizationClaim(expected);
  if (canonicalJson(claim) !== canonicalJson(rebuilt)) {
    throw new FixtureClaimError("fixture_claim_mismatch");
  }
  if (claim.authorizedClaimRoot !== rebuilt.authorizedClaimRoot) {
    throw new FixtureClaimError("fixture_claim_root_mismatch");
  }
  return claim;
}

export function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
