import { constants } from "node:fs";
import { cp, lstat, mkdir, open, rename } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import {
  JsonValueSchema,
  contractHash,
  parseContractText,
} from "./contracts/common";
import {
  TrustPlaneBindingError,
  parseRootAuthorization,
  parseSupervisorParent,
} from "./contracts/trust-plane";
import {
  buildOfflineReviewArtifacts,
  planOfflineAdoption,
  writeOfflineReviewArtifacts,
} from "./offline-artifacts";
import { runOfflineWorkflow } from "./orchestration";
import { PreflightReceiptSchema } from "./preflight-contracts";
import {
  PreflightInputError,
  assertComponentsAreNotSymlinks,
  readNoFollow,
} from "./preflight-io";
import { PreparedRootError, assertPreparedRoot } from "./prepared-root";
import {
  SourceTreeHashError,
  hashAuthorizedSourceTree,
} from "./source-tree-hash";
import {
  type VerificationHarnessCliOptions,
  VerificationHarnessOptionsError,
  hasTraversal,
  parseVerificationHarnessCli,
} from "./verification-harness-options";

export type VerificationHarnessOptions = Readonly<
  VerificationHarnessCliOptions & { sourceRoot: string }
>;

type VerificationReview = Readonly<{
  schemaVersion: "1.0.0";
  artifactType: "skillopt-verification-review";
  mode: "fake-local";
  runId: string;
  skill: "kibi-usage";
  sourceRoot: string;
  preflightReceiptHash: string;
  rootAuthorizationHash: string;
  preparedArtifactHash: string;
  verificationParentHash: string;
  paidModelCalls: 0;
  reportHash: string;
  productionAdoption: "external-verdict-required";
  sourceModified: false;
  targetModified: false;
}>;

export class VerificationHarnessError extends Error {
  readonly name = "VerificationHarnessError";

  constructor(
    readonly check: string,
    options?: ErrorOptions,
  ) {
    super(check, options);
  }
}

async function readContract<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const loaded = await readNoFollow(path, "lock");
  return parseContractText(schema, loaded.text);
}

async function readJson(path: string): Promise<unknown> {
  const loaded = await readNoFollow(path, "lock");
  return parseContractText(JsonValueSchema, loaded.text);
}

function rootsOverlap(left: string, right: string): boolean {
  return [relative(left, right), relative(right, left)].some(
    (path) =>
      path === "" || (!path.startsWith(`..${sep}`) && !isAbsolute(path)),
  );
}

async function validateRootBoundaries(
  options: VerificationHarnessOptions,
): Promise<void> {
  const sourceRoot = resolve(options.sourceRoot);
  const targetRoot = resolve(options.targetRoot);
  const artifactRoot = resolve(options.artifactRoot);
  if (hasTraversal(options.sourceRoot) || hasTraversal(options.targetRoot))
    throw new VerificationHarnessError("path-traversal");
  if (rootsOverlap(sourceRoot, targetRoot))
    throw new VerificationHarnessError("target-root-boundary");
  if (
    rootsOverlap(sourceRoot, artifactRoot) ||
    rootsOverlap(targetRoot, artifactRoot)
  )
    throw new VerificationHarnessError("artifact-root-boundary");
  await assertComponentsAreNotSymlinks(dirname(artifactRoot));
  await assertComponentsAreNotSymlinks(dirname(targetRoot));
  if (dirname(resolve(options.output)) !== artifactRoot)
    throw new VerificationHarnessError("output-parent");
}

async function materializeRoots(
  options: VerificationHarnessOptions,
): Promise<void> {
  const sourceRoot = resolve(options.sourceRoot);
  const targetRoot = resolve(options.targetRoot);
  const artifactRoot = resolve(options.artifactRoot);
  try {
    await assertComponentsAreNotSymlinks(targetRoot);
    const targetStats = await lstat(targetRoot);
    if (!targetStats.isDirectory())
      throw new VerificationHarnessError("target-root-directory");
  } catch (error) {
    if (error instanceof VerificationHarnessError) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await cp(sourceRoot, targetRoot, { recursive: true, dereference: false });
    } else throw error;
  }
  await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
  await assertComponentsAreNotSymlinks(artifactRoot);
  const artifactStats = await lstat(artifactRoot);
  if (!artifactStats.isDirectory())
    throw new VerificationHarnessError("artifact-root-directory");
}

// implements REQ-skillopt-codex-optimization
export async function runVerificationHarness(
  options: VerificationHarnessOptions,
): Promise<VerificationReview> {
  await validateRootBoundaries(options);
  const [preflight, rootValue, parentValue, preparedValue, source] =
    await Promise.all([
      readContract(options.preflightReceipt, PreflightReceiptSchema),
      readJson(options.rootAuthorization),
      readJson(options.verificationParent),
      readJson(join(options.preparedRoot, "prepared-root.json")),
      hashAuthorizedSourceTree(options.sourceRoot),
    ]);
  if (preflight.status !== "qualified" || preflight.code !== "OK")
    throw new VerificationHarnessError("preflight-not-qualified");
  const root = parseRootAuthorization(rootValue);
  const parent = parseSupervisorParent(parentValue, root);
  const prepared = assertPreparedRoot(preparedValue);
  if (parent.sourceRoot !== source.sha256)
    throw new VerificationHarnessError("source-root-mismatch");
  if (prepared.sourceRoot !== source.sha256)
    throw new VerificationHarnessError("prepared_source_root_mismatch");
  if (prepared.runId !== options.runId)
    throw new VerificationHarnessError("prepared_run_id_mismatch");
  if (
    parent.candidateHashes.baseline !== prepared.candidateHashes.baseline ||
    parent.candidateHashes.oneShot !== prepared.candidateHashes.oneShot ||
    parent.candidateHashes.skillopt !== prepared.candidateHashes.skillopt
  )
    throw new VerificationHarnessError("candidate_binding_mismatch");
  if (parent.invocationHash !== prepared.invocationHash)
    throw new VerificationHarnessError("invocation_binding_mismatch");
  if (parent.matrixId !== prepared.matrixId)
    throw new VerificationHarnessError("matrix_binding_mismatch");
  await materializeRoots(options);
  const artifacts = await buildOfflineReviewArtifacts(
    resolve(options.targetRoot),
    options.runId,
    resolve(options.artifactRoot),
  );
  await writeOfflineReviewArtifacts(resolve(options.artifactRoot), artifacts);
  await runOfflineWorkflow({
    root: join(resolve(options.artifactRoot), "verification-workflow"),
    runId: options.runId,
    runLockHash: "0".repeat(64),
  });
  await planOfflineAdoption(resolve(options.targetRoot), artifacts);
  const review: VerificationReview = {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-verification-review",
    mode: "fake-local",
    runId: options.runId,
    skill: options.skill,
    sourceRoot: source.sha256,
    preflightReceiptHash: contractHash(JsonValueSchema.parse(preflight)),
    rootAuthorizationHash: contractHash(JsonValueSchema.parse(root)),
    preparedArtifactHash: contractHash(JsonValueSchema.parse(prepared)),
    verificationParentHash: contractHash(JsonValueSchema.parse(parent)),
    paidModelCalls: 0,
    reportHash: artifacts.report.reportHash,
    productionAdoption: "external-verdict-required",
    sourceModified: false,
    targetModified: false,
  };
  const destination = resolve(options.output);
  const temporary = `${destination}.${process.pid}.tmp`;
  const handle = await open(
    temporary,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(`${JSON.stringify(review, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, destination);
  return review;
}

// implements REQ-skillopt-codex-optimization
export async function verifyHarnessMain(
  argv: readonly string[],
  sourceRoot = process.cwd(),
): Promise<number> {
  try {
    const options = parseVerificationHarnessCli(argv);
    const review = await runVerificationHarness({ ...options, sourceRoot });
    process.stdout.write(`${JSON.stringify(review)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof VerificationHarnessError) {
      process.stderr.write(`${error.check}\n`);
      return 2;
    }
    if (error instanceof VerificationHarnessOptionsError) {
      process.stderr.write(`${error.check}\n`);
      return 2;
    }
    if (error instanceof PreflightInputError) {
      process.stderr.write(`${error.check}\n`);
      return 2;
    }
    if (
      error instanceof SourceTreeHashError ||
      error instanceof TrustPlaneBindingError ||
      error instanceof PreparedRootError ||
      error instanceof z.ZodError
    ) {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

if (import.meta.main)
  process.exitCode = await verifyHarnessMain(process.argv.slice(2));
