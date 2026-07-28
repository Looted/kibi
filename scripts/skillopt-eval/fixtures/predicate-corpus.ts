import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  type JsonValue,
  canonicalJson,
  contractHash,
} from "../contracts/common";
import {
  PREDICATE_CASES,
  PREDICATE_DEVELOPMENT_CASE_ID,
  PREDICATE_HELD_OUT_CASE_IDS,
  PREDICATE_SEMANTIC_CLASSES,
  PREDICATE_TRAIN_CASE_IDS,
  type PredicateCase,
  type PrivateExpectation,
  assertDistinctSemanticClasses,
} from "./predicate-cases";
import { freezeMaterialization } from "./predicate-materialization";

// implements REQ-skillopt-predicate-first-requirements

class PredicateCorpusError extends Error {
  readonly name = "PredicateCorpusError";
}

export {
  PREDICATE_DEVELOPMENT_CASE_ID,
  PREDICATE_HELD_OUT_CASE_IDS,
  PREDICATE_SEMANTIC_CLASSES,
  PREDICATE_TRAIN_CASE_IDS,
} from "./predicate-cases";
export type { PredicateCase } from "./predicate-cases";
export {
  reservePredicateMatrix,
  __resetPredicateMatrixCacheForTests,
} from "./predicate-matrix";
export type {
  MatrixState,
  ReservedPredicateMatrix,
  PredicateMatrixReceipt,
} from "./predicate-matrix";

export type PredicateRoots = Readonly<{
  corpus: string;
  evaluator: string;
  querySet: string;
  baseline: string;
  catalog: string;
  verifier: string;
  publicRoot: string;
  privateRoot: string;
  artifactSchema: string;
}>;

export type CandidateRootManifest = Readonly<{
  schemaVersion: string;
  artifactType: "predicate-candidate-root-manifest";
  roots: PredicateRoots;
  signedByRootAuthority: boolean;
  unsignedRationale: string;
}>;

export type FrozenCandidateHashes = Readonly<{
  baseline: string;
  oneShot: string;
  skillopt: string;
}>;

export type OrchestrationEligibility = Readonly<{ eligible: boolean }>;

type PrivateCaseMap = ReadonlyMap<string, PrivateExpectation>;

export type PredicateMaterialization = Readonly<{
  roots: PredicateRoots;
  candidateRootManifest: CandidateRootManifest;
  frozenCandidateHashes: FrozenCandidateHashes;
  trainCaseIds: readonly string[];
  developmentCaseId: string;
  heldOutCaseIds: readonly string[];
  privateCaseMap: PrivateCaseMap;
  publicRootDir: string;
  privateRootDir: string;
  assertAuthorized: () => never;
  eligibility: () => OrchestrationEligibility;
  injectLeak: (token: string) => never;
  injectDuplicateClaim: () => never;
  mutateRootByte: (root: keyof PredicateRoots) => never;
  withAdaptiveCandidate: () => PredicateMaterialization;
}>;

const ROOT_KEYS: readonly (keyof PredicateRoots)[] = [
  "corpus",
  "evaluator",
  "querySet",
  "baseline",
  "catalog",
  "verifier",
  "publicRoot",
  "privateRoot",
  "artifactSchema",
];

export const DETERMINISTIC_CANDIDATES: FrozenCandidateHashes = {
  baseline: createHash("sha256")
    .update("predicate-baseline-bytes")
    .digest("hex"),
  oneShot: createHash("sha256")
    .update("predicate-one-shot-bytes")
    .digest("hex"),
  skillopt: createHash("sha256")
    .update("predicate-skillopt-bytes")
    .digest("hex"),
};

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function rootDigest(value: unknown): string {
  return contractHash(toJsonValue(value));
}

function writeJson(filePath: string, value: unknown): string {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const text = `${canonicalJson(toJsonValue(value))}\n`;
  writeFileSync(filePath, text);
  return text;
}

function publicCaseView(entry: PredicateCase): JsonValue {
  return toJsonValue({
    caseId: entry.caseId,
    split: entry.split,
    semanticClass: entry.semanticClass,
    publicClaim: entry.publicClaim,
  });
}

function privateCaseView(entry: PredicateCase): JsonValue {
  return toJsonValue({
    caseId: entry.caseId,
    split: entry.split,
    semanticClass: entry.semanticClass,
    privateExpectation: entry.privateExpectation,
  });
}

/**
 * Materialize the seven-case predicate corpus. Emits JCS roots for public/private
 * corpus, baseline, evaluator/query set, catalog, and verifier release plus an
 * UNSIGNED candidate-root manifest. Root Authority signature is external.
 */
export function materializePredicateCorpus(options: {
  readonly artifactRoot: string;
}): PredicateMaterialization {
  assertDistinctSemanticClasses();
  if (existsSync(options.artifactRoot)) {
    throw new PredicateCorpusError("artifact root must not already exist");
  }
  const stageRoot = `${options.artifactRoot}.staging`;
  rmSync(stageRoot, { recursive: true, force: true });
  try {
    const roots = writeArtifactsAndComputeRoots(stageRoot);
    const candidateRootManifest: CandidateRootManifest = {
      schemaVersion: "predicate-candidate-root-manifest-1.0.0",
      artifactType: "predicate-candidate-root-manifest",
      roots,
      signedByRootAuthority: false,
      unsignedRationale:
        "Root Authority signature is an external prerequisite; unsigned roots cannot authorize training or evaluation.",
    };
    writeJson(
      path.join(stageRoot, "candidate-root-manifest.json"),
      candidateRootManifest,
    );
    rmSync(options.artifactRoot, { recursive: true, force: true });
    renameSync(stageRoot, options.artifactRoot);
    const privateCaseMap: PrivateCaseMap = new Map(
      PREDICATE_CASES.map((e) => [e.caseId, e.privateExpectation] as const),
    );
    return freezeMaterialization({
      roots,
      candidateRootManifest,
      trainCaseIds: [...PREDICATE_TRAIN_CASE_IDS],
      developmentCaseId: PREDICATE_DEVELOPMENT_CASE_ID,
      heldOutCaseIds: [...PREDICATE_HELD_OUT_CASE_IDS],
      privateCaseMap,
      publicRootDir: path.join(options.artifactRoot, "public"),
      privateRootDir: path.join(options.artifactRoot, "private"),
    });
  } catch (error) {
    rmSync(stageRoot, { recursive: true, force: true });
    rmSync(options.artifactRoot, { recursive: true, force: true });
    throw error;
  }
}

function writeArtifactsAndComputeRoots(stageRoot: string): PredicateRoots {
  const trainCaseIds = [...PREDICATE_TRAIN_CASE_IDS];
  const developmentCaseId = PREDICATE_DEVELOPMENT_CASE_ID;
  const heldOutCaseIds = [...PREDICATE_HELD_OUT_CASE_IDS];
  const publicCorpus = PREDICATE_CASES.map(publicCaseView);
  const privateCorpus = PREDICATE_CASES.map(privateCaseView);
  const evaluatorSet = PREDICATE_CASES.map((e) => ({
    caseId: e.caseId,
    split: e.split,
    semanticClass: e.semanticClass,
  }));
  const baseline = {
    schemaVersion: "predicate-baseline-1.0.0",
    trainCaseIds,
    developmentCaseId,
    heldOutCaseIds,
    semanticClasses: [...PREDICATE_SEMANTIC_CLASSES.entries()].map(
      ([caseId, semanticClass]) => ({ caseId, semanticClass }),
    ),
  };
  const catalog = {
    schemaVersion: "predicate-catalog-1.0.0",
    totalCases: PREDICATE_CASES.length,
    allocation: { train: 2, development: 1, heldOut: 4 },
    trainCaseIds,
    developmentCaseId,
    heldOutCaseIds,
  };
  const verifierRelease = {
    schemaVersion: "predicate-verifier-1.0.0",
    unsignedRootsOnly: true,
    heldOutCaseIds,
    variants: ["baseline", "one-shot", "skillopt"],
  };
  writeJson(path.join(stageRoot, "public", "corpus.json"), publicCorpus);
  for (const entry of PREDICATE_CASES) {
    writeJson(
      path.join(stageRoot, "public", "cases", `${entry.caseId}.json`),
      publicCaseView(entry),
    );
  }
  writeJson(path.join(stageRoot, "private", "case-map.json"), privateCorpus);
  writeJson(path.join(stageRoot, "baseline", "baseline.json"), baseline);
  writeJson(
    path.join(stageRoot, "evaluator", "evaluator-set.json"),
    evaluatorSet,
  );
  writeJson(path.join(stageRoot, "query", "query-set.json"), evaluatorSet);
  writeJson(path.join(stageRoot, "catalog", "catalog.json"), catalog);
  writeJson(
    path.join(stageRoot, "verifier", "verifier-release.json"),
    verifierRelease,
  );
  return {
    corpus: rootDigest(publicCorpus),
    evaluator: rootDigest(evaluatorSet),
    querySet: rootDigest(evaluatorSet),
    baseline: rootDigest(baseline),
    catalog: rootDigest(catalog),
    verifier: rootDigest(verifierRelease),
    publicRoot: rootDigest(publicCorpus),
    privateRoot: rootDigest(privateCorpus),
    artifactSchema: rootDigest({
      schemaVersion: "predicate-artifact-schema-1.0.0",
      rootKeys: ROOT_KEYS,
    }),
  };
}

export { freezeMaterialization } from "./predicate-materialization";
