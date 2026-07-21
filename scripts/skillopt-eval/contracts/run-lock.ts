import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  ContractIntegrityError,
  JsonValueSchema,
  NonEmptyStringSchema,
  Sha256Schema,
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

const SourceLockSchema = z
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

// implements REQ-skillopt-codex-optimization
export const SKILLOPT_SOURCE_LOCK = SourceLockSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(import.meta.dir, "../../../tools/skillopt/source-lock.json"),
      "utf8",
    ),
  ),
);

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
        "gpt-5.5": ModelPricingSchema,
      })
      .strict(),
  })
  .strict();

const DirtyStateSchema = z.discriminatedUnion("isDirty", [
  z.object({ isDirty: z.literal(false), diffHash: z.null() }).strict(),
  z.object({ isDirty: z.literal(true), diffHash: Sha256Schema }).strict(),
]);

// implements REQ-skillopt-codex-optimization
export const RunLockSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    artifactType: z.literal("run-lock"),
    runId: z.uuid(),
    repositoryCommit: Sha256Schema,
    dirtyState: DirtyStateSchema,
    codexCliVersion: NonEmptyStringSchema,
    codexExecutable: ExecutableIdentitySchema,
    cliArgs: z.array(NonEmptyStringSchema).min(1),
    artifactRoot: NonEmptyStringSchema,
    targetModel: z.literal("gpt-5.4-mini"),
    optimizerModel: z.literal("gpt-5.5"),
    skillopt: z
      .object({
        package: z.literal("skillopt"),
        version: z.literal(SKILLOPT_SOURCE_LOCK.version),
        commit: z.literal(SKILLOPT_SOURCE_LOCK.commit),
        repository: z.literal(SKILLOPT_SOURCE_LOCK.repository),
        license: z.literal(SKILLOPT_SOURCE_LOCK.license),
        retrievedAt: z.literal(SKILLOPT_SOURCE_LOCK.retrievedAt),
        python: z.literal(SKILLOPT_SOURCE_LOCK.python),
        packageHash: Sha256Schema,
        sourceHash: Sha256Schema,
        uvLockHash: Sha256Schema,
      })
      .strict(),
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
        "init-kibi": SkillSurfaceHashesSchema,
      })
      .strict(),
    seed: z.int().nonnegative(),
    authMode: z.literal("existing-login"),
    hosts: z.tuple([z.literal("codex")]),
    gates: CodexGatesSchema,
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export type RunLock = Readonly<z.infer<typeof RunLockSchema>>;

// implements REQ-skillopt-codex-optimization
export function parseRunLockText(text: string): RunLock {
  const lock = RunLockSchema.parse(parseJsonText(text));
  const pricing = JsonValueSchema.parse(lock.pricing);
  if (contractHash(pricing) !== lock.pricingHash) {
    throw new ContractIntegrityError("pricing hash mismatch", "pricingHash");
  }
  return lock;
}

// implements REQ-skillopt-codex-optimization
export function runLockHash(lock: RunLock): string {
  return contractHash(JsonValueSchema.parse(lock));
}

// implements REQ-skillopt-codex-optimization
export function assertRunLockMatches(expected: RunLock, actual: RunLock): void {
  if (runLockHash(expected) !== runLockHash(actual)) {
    throw new ContractIntegrityError("immutable run lock mismatch", "runLock");
  }
}
