import { createHash } from "node:crypto";
import { z } from "zod";
import { prepareArtifactPath } from "./artifact-path";
import {
  ArtifactIdSchema,
  JsonValueSchema,
  contractHash,
} from "./contracts/common";
import { hashAuthorizedSourceTree } from "./source-tree-hash";

const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const CandidateHashesSchema = z
  .object({
    baseline: DigestSchema,
    oneShot: DigestSchema,
    skillopt: DigestSchema,
  })
  .strict();
export const PreparedRootSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-prepared-root"),
    runId: ArtifactIdSchema,
    sourceRoot: DigestSchema,
    candidateHashes: CandidateHashesSchema,
    invocationHash: DigestSchema,
    matrixId: ArtifactIdSchema,
    generatedArtifactRoot: DigestSchema,
  })
  .strict();
export type PreparedRoot = z.infer<typeof PreparedRootSchema>;
export class PreparedRootError extends Error {
  readonly name = "PreparedRootError";
}

const hashBytes = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export type PreparedCandidateBodies = Readonly<{
  baseline: string;
  oneShot: string;
  skillopt: string;
}>;

function candidateHashesFromBodies(
  bodies: PreparedCandidateBodies,
): z.infer<typeof CandidateHashesSchema> {
  return {
    baseline: hashBytes(bodies.baseline),
    oneShot: hashBytes(bodies.oneShot),
    skillopt: hashBytes(bodies.skillopt),
  };
}

function binding(
  runId: string,
  sourceRoot: string,
  candidateHashes: z.infer<typeof CandidateHashesSchema>,
) {
  return {
    schemaVersion: "1.0.0" as const,
    artifactType: "skillopt-prepared-root" as const,
    runId,
    sourceRoot,
    candidateHashes,
    invocationHash: hashBytes(
      `invocation:${runId}:${candidateHashes.skillopt}`,
    ),
    matrixId: runId,
  };
}

/**
 * Persist and fsync baseline/one-shot/SkillOpt candidate bytes before hashing.
 * Requires an absent target tree under the prepared root; rejects source/target
 * drift after the durable writes.
 */
export async function prepareArtifact(
  input: Readonly<{
    preparedRoot: string;
    runId: string;
    sourceRoot: string;
    candidates: PreparedCandidateBodies;
    rootAuthorization?: string;
  }>,
): Promise<PreparedRoot> {
  const source = await hashAuthorizedSourceTree(input.sourceRoot);
  const root = await prepareArtifactPath({
    artifactRoot: input.preparedRoot,
    sourceRoot: input.sourceRoot,
  });
  try {
    const bodies = input.candidates;
    await root.writeText("candidate-baseline.md", bodies.baseline);
    await root.writeText("candidate-one-shot.md", bodies.oneShot);
    await root.writeText("candidate-skillopt.md", bodies.skillopt);

    const writtenHashes = candidateHashesFromBodies(bodies);
    const rehashedSource = await hashAuthorizedSourceTree(input.sourceRoot);
    if (rehashedSource.sha256 !== source.sha256) {
      throw new PreparedRootError("prepared_source_drift");
    }

    const value = binding(input.runId, source.sha256, writtenHashes);
    if (
      input.rootAuthorization !== undefined &&
      input.rootAuthorization !==
        contractHash(JsonValueSchema.parse(value.candidateHashes))
    ) {
      throw new PreparedRootError("prepared_root_authorization_mismatch");
    }
    const prepared = PreparedRootSchema.parse({
      ...value,
      generatedArtifactRoot: contractHash(JsonValueSchema.parse(value)),
    });
    await root.writeText("prepared-root.json", `${JSON.stringify(prepared)}\n`);
    return prepared;
  } finally {
    await root.close();
  }
}

export function assertPreparedRoot(value: unknown): PreparedRoot {
  const prepared = PreparedRootSchema.parse(value);
  const { generatedArtifactRoot, ...preparedBinding } = prepared;
  if (
    generatedArtifactRoot !==
    contractHash(JsonValueSchema.parse(preparedBinding))
  )
    throw new PreparedRootError("prepared_root_mismatch");
  return prepared;
}
