import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  ArtifactIdSchema,
  CONTRACT_SCHEMA_VERSION,
  ContractIntegrityError,
  JsonValueSchema,
  NonEmptyStringSchema,
  Sha256Schema,
  boundedContractSchema,
  contractHash,
  parseJsonText,
} from "./common";
import { CodexGatesSchema } from "./gates";

const ModelPricingSchema = z
  .object({
    inputPerMillionTokens: z.number().nonnegative(),
    cachedInputPerMillionTokens: z.number().nonnegative(),
    outputPerMillionTokens: z.number().nonnegative(),
  })
  .strict();

export const SourceLockSchema = z
  .object({
    package: z.literal("skillopt"),
    version: NonEmptyStringSchema,
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    repository: z.url(),
    license: NonEmptyStringSchema,
    retrievedAt: z.iso.date(),
    python: NonEmptyStringSchema,
  })
  .strict();

const DEFAULT_SOURCE_LOCK_PATH = resolve(
  import.meta.dir,
  "../../../tools/skillopt/source-lock.json",
);

// implements REQ-skillopt-codex-optimization
export function loadSkillOptSourceLock(path = DEFAULT_SOURCE_LOCK_PATH) {
  return SourceLockSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

// implements REQ-skillopt-codex-optimization
export const SKILLOPT_SOURCE_LOCK = loadSkillOptSourceLock();

const ExecutableIdentitySchema = z
  .object({
    path: NonEmptyStringSchema,
    version: NonEmptyStringSchema,
    sha256: Sha256Schema,
  })
  .strict();

const SkillSurfaceHashesSchema = z
  .object({
    bodyHash: Sha256Schema,
    frontmatterHash: Sha256Schema,
    resourcesHash: Sha256Schema,
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export const PricingTableSchema = z
  .object({
    name: z.literal("price-equivalent-estimates"),
    effectiveFrom: z.iso.date(),
    currency: z.literal("USD"),
    source: NonEmptyStringSchema,
    models: z
      .object({
        "gpt-5.4-mini": ModelPricingSchema,
        "gpt-5.6-sol": ModelPricingSchema,
      })
      .strict(),
  })
  .strict();

const DirtyStateSchema = z.discriminatedUnion("isDirty", [
  z.object({ isDirty: z.literal(false), diffHash: z.null() }).strict(),
  z.object({ isDirty: z.literal(true), diffHash: Sha256Schema }).strict(),
]);

// implements REQ-skillopt-codex-optimization
export function createRunLockSchema(sourceLockPath = DEFAULT_SOURCE_LOCK_PATH) {
  loadSkillOptSourceLock(sourceLockPath);
  return boundedContractSchema(
    z
      .object({
        schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
        artifactType: z.literal("run-lock"),
        runId: ArtifactIdSchema,
        repositoryHashAlgorithm: z.enum(["sha1", "sha256"]),
        repositoryCommit: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/),
        dirtyState: DirtyStateSchema,
        codexCliVersion: NonEmptyStringSchema,
        codexExecutable: ExecutableIdentitySchema,
        cliArgs: z.array(NonEmptyStringSchema).min(1),
        artifactRoot: NonEmptyStringSchema,
        targetModel: z.literal("gpt-5.4-mini"),
        optimizerModel: z.literal("gpt-5.6-sol"),
        skillopt: z
          .object({
            package: z.literal("skillopt"),
            version: NonEmptyStringSchema,
            commit: z.string().regex(/^[a-f0-9]{40}$/),
            repository: z.url(),
            license: NonEmptyStringSchema,
            retrievedAt: z.iso.date(),
            python: NonEmptyStringSchema,
            packageHash: Sha256Schema,
            sourceHash: Sha256Schema,
            uvLockHash: Sha256Schema,
          })
          .strict(),
        sourceLockHash: Sha256Schema,
        catalogHash: Sha256Schema,
        fixtureHash: Sha256Schema,
        fixtureGeneratorHash: Sha256Schema,
        pricing: PricingTableSchema,
        pricingHash: Sha256Schema,
        baselineSkillHashes: z
          .object({
            "kibi-usage": SkillSurfaceHashesSchema,
            "kibi-freshness": SkillSurfaceHashesSchema,
            "kibi-traceability": SkillSurfaceHashesSchema,
            "kibi-bootstrap": SkillSurfaceHashesSchema,
          })
          .strict(),
        seed: z.int().nonnegative(),
        authMode: z.literal("existing-login"),
        hosts: z.tuple([z.literal("codex")]),
        gates: CodexGatesSchema,
      })
      .strict()
      .superRefine((lock, context) => {
        const expectedLength =
          lock.repositoryHashAlgorithm === "sha1" ? 40 : 64;
        if (lock.repositoryCommit.length !== expectedLength) {
          context.addIssue({
            code: "custom",
            message: `${lock.repositoryHashAlgorithm} object ID must be ${expectedLength} characters`,
            path: ["repositoryCommit"],
          });
        }
      }),
  );
}

// implements REQ-skillopt-codex-optimization
export const RunLockSchema = createRunLockSchema();

// implements REQ-skillopt-codex-optimization
export type RunLock = Readonly<z.infer<typeof RunLockSchema>>;

// implements REQ-skillopt-codex-optimization
export function parseRunLockText(
  text: string,
  sourceLockPath = DEFAULT_SOURCE_LOCK_PATH,
): RunLock {
  const lock = RunLockSchema.parse(parseJsonText(text));
  const pricing = JsonValueSchema.parse(lock.pricing);
  if (contractHash(pricing) !== lock.pricingHash) {
    throw new ContractIntegrityError("pricing hash mismatch", "pricingHash");
  }
  const sourceLock = loadSkillOptSourceLock(sourceLockPath);
  const expectedPin = JsonValueSchema.parse(sourceLock);
  const actualPin = JsonValueSchema.parse({
    package: lock.skillopt.package,
    version: lock.skillopt.version,
    commit: lock.skillopt.commit,
    repository: lock.skillopt.repository,
    license: lock.skillopt.license,
    retrievedAt: lock.skillopt.retrievedAt,
    python: lock.skillopt.python,
  });
  if (contractHash(actualPin) !== contractHash(expectedPin)) {
    throw new ContractIntegrityError("source lock mismatch", "skillopt");
  }
  if (contractHash(expectedPin) !== lock.sourceLockHash) {
    throw new ContractIntegrityError(
      "source lock hash mismatch",
      "sourceLockHash",
    );
  }
  return lock;
}

// implements REQ-skillopt-codex-optimization
export function runLockHash(lock: RunLock): string {
  return contractHash(JsonValueSchema.parse(lock));
}

// implements REQ-skillopt-codex-optimization
export function assertRunLockMatches(expected: RunLock, actual: RunLock): void {
  if (expected.dirtyState.isDirty || actual.dirtyState.isDirty) {
    throw new ContractIntegrityError("dirty run lock", "dirtyState");
  }
  assertMatchingRunLockHash(expected, actual);
}

export function assertMatchingRunLockHash(
  expected: RunLock,
  actual: RunLock,
): void {
  if (runLockHash(expected) !== runLockHash(actual)) {
    throw new ContractIntegrityError("immutable run lock mismatch", "runLock");
  }
}
