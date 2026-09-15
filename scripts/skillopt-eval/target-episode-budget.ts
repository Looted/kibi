import { lstat, realpath } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";
import { type ArtifactPath, prepareArtifactPath } from "./artifact-path";
import { Sha256Schema, contractHash } from "./contracts/common";
import { withHeldOutExecutionLease } from "./held-out-execution-lease";

export const TARGET_EPISODE_BUDGET_ROOT_ENV =
  "KIBI_SKILLOPT_TARGET_BUDGET_ROOT" as const;
export const MAX_TARGET_EPISODES_ENV =
  "KIBI_SKILLOPT_MAX_TARGET_EPISODES" as const;

const BUDGET_FILE = "target-episode-budget.json";
const LOCK_DIRECTORY = ".target-episode-budget-lock";
const MAX_TARGET_EPISODES = 256;
const MAX_BUDGET_FILE_BYTES = 16_384;
const SCHEMA_VERSION = "1.0.0" as const;
const ARTIFACT_TYPE = "skillopt-target-episode-budget" as const;

const BudgetFileSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    artifactType: z.literal(ARTIFACT_TYPE),
    runRoot: z.string().min(1),
    limit: z.number().int().positive().max(MAX_TARGET_EPISODES),
    reservedCount: z.number().int().nonnegative(),
    countHash: Sha256Schema,
  })
  .strict();

type BudgetFile = z.infer<typeof BudgetFileSchema>;

export type TargetEpisodeBudgetEnvironment = Readonly<{
  [TARGET_EPISODE_BUDGET_ROOT_ENV]: string;
  [MAX_TARGET_EPISODES_ENV]: string;
}>;

export type TargetEpisodeBudgetReport = Readonly<{
  schemaVersion: typeof SCHEMA_VERSION;
  artifactType: typeof ARTIFACT_TYPE;
  runRoot: string;
  limit: number;
  reservedCount: number;
  remainingCount: number;
}>;

export type TargetEpisodeBudgetErrorCode =
  | "target_episode_budget_partial_config"
  | "target_episode_budget_invalid_root"
  | "target_episode_budget_invalid_limit"
  | "target_episode_budget_root_not_canonical"
  | "target_episode_budget_root_not_initialized"
  | "target_episode_budget_file_missing"
  | "target_episode_budget_file_invalid"
  | "target_episode_budget_file_not_private"
  | "target_episode_budget_file_mismatch"
  | "target_episode_budget_count_invalid"
  | "target_episode_budget_exhausted";

export class TargetEpisodeBudgetError extends Error {
  readonly name = "TargetEpisodeBudgetError";

  constructor(readonly code: TargetEpisodeBudgetErrorCode) {
    super(code);
  }
}

type BudgetConfig = Readonly<{
  root: string;
  limit: number;
}>;

function invalid(code: TargetEpisodeBudgetErrorCode): never {
  throw new TargetEpisodeBudgetError(code);
}

function parseLimit(value: string): number {
  if (!/^[1-9][0-9]*$/.test(value))
    invalid("target_episode_budget_invalid_limit");
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_TARGET_EPISODES)
    invalid("target_episode_budget_invalid_limit");
  return limit;
}

function assertLimit(limit: number): void {
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_TARGET_EPISODES
  ) {
    invalid("target_episode_budget_invalid_limit");
  }
}

function configuredBudget(env: NodeJS.ProcessEnv): BudgetConfig | undefined {
  const root = env[TARGET_EPISODE_BUDGET_ROOT_ENV];
  const limit = env[MAX_TARGET_EPISODES_ENV];
  if (root === undefined && limit === undefined) return undefined;
  if (root === undefined || limit === undefined)
    invalid("target_episode_budget_partial_config");
  if (root.length === 0 || root.includes("\0"))
    invalid("target_episode_budget_invalid_root");
  return { root: resolve(root), limit: parseLimit(limit) };
}

function countBinding(
  state: Pick<
    BudgetFile,
    "schemaVersion" | "artifactType" | "runRoot" | "limit" | "reservedCount"
  >,
) {
  return {
    schemaVersion: state.schemaVersion,
    artifactType: state.artifactType,
    runRoot: state.runRoot,
    limit: state.limit,
    reservedCount: state.reservedCount,
  } as const;
}

function countHash(state: BudgetFile): string {
  return contractHash(countBinding(state));
}

function assertState(state: BudgetFile, runRoot: string): BudgetFile {
  if (
    state.runRoot !== runRoot ||
    state.reservedCount > state.limit ||
    state.countHash !== countHash(state)
  ) {
    invalid(
      state.reservedCount > state.limit
        ? "target_episode_budget_count_invalid"
        : "target_episode_budget_file_mismatch",
    );
  }
  return state;
}

function report(state: BudgetFile): TargetEpisodeBudgetReport {
  return {
    schemaVersion: state.schemaVersion,
    artifactType: state.artifactType,
    runRoot: state.runRoot,
    limit: state.limit,
    reservedCount: state.reservedCount,
    remainingCount: state.limit - state.reservedCount,
  };
}

async function assertExistingRoot(path: string): Promise<void> {
  try {
    await lstat(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      invalid("target_episode_budget_root_not_initialized");
    throw error;
  }
}

async function openRoot(
  root: string,
  sourceWorktree: string,
  requireExisting: boolean,
): Promise<ArtifactPath> {
  const requestedRoot = resolve(root);
  const physicalParent = await realpath(dirname(requestedRoot));
  if (join(physicalParent, basename(requestedRoot)) !== requestedRoot)
    invalid("target_episode_budget_root_not_canonical");
  if (requireExisting) await assertExistingRoot(requestedRoot);
  const artifact = await prepareArtifactPath({
    artifactRoot: requestedRoot,
    sourceRoot: sourceWorktree,
    canonicalRoots: [sourceWorktree],
  });
  if (artifact.path !== requestedRoot) {
    await artifact.close();
    invalid("target_episode_budget_root_not_canonical");
  }
  return artifact;
}

async function openLockRoot(
  root: string,
  sourceWorktree: string,
  requireExisting: boolean,
): Promise<string> {
  const lockRoot = join(root, LOCK_DIRECTORY);
  if (requireExisting) await assertExistingRoot(lockRoot);
  const artifact = await openRoot(lockRoot, sourceWorktree, false);
  try {
    return artifact.path;
  } finally {
    await artifact.close();
  }
}

async function readBudgetFile(
  artifact: ArtifactPath,
  expectedRoot: string,
  allowMissing: boolean,
): Promise<BudgetFile | undefined> {
  let metadata: Awaited<ReturnType<typeof lstat>>;
  try {
    metadata = await lstat(join(artifact.path, BUDGET_FILE));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      if (allowMissing) return undefined;
      invalid("target_episode_budget_file_missing");
    }
    throw error;
  }
  const euid = process.geteuid?.();
  if (
    euid === undefined ||
    metadata.isSymbolicLink() ||
    !metadata.isFile() ||
    metadata.uid !== euid ||
    (metadata.mode & 0o077) !== 0 ||
    metadata.size > MAX_BUDGET_FILE_BYTES
  ) {
    invalid("target_episode_budget_file_not_private");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await artifact.readText(BUDGET_FILE));
  } catch {
    invalid("target_episode_budget_file_invalid");
  }
  const result = BudgetFileSchema.safeParse(parsed);
  if (!result.success) invalid("target_episode_budget_file_invalid");
  return assertState(result.data, expectedRoot);
}

async function writeBudgetFile(
  artifact: ArtifactPath,
  state: BudgetFile,
): Promise<void> {
  await artifact.writeText(BUDGET_FILE, `${JSON.stringify(state)}\n`);
}

async function withBudgetLock<T>(
  artifact: ArtifactPath,
  sourceWorktree: string,
  operation: (state: BudgetFile | undefined) => Promise<T>,
  allowMissing: boolean,
): Promise<T> {
  const lockRoot = await openLockRoot(
    artifact.path,
    sourceWorktree,
    !allowMissing,
  );
  return withHeldOutExecutionLease(lockRoot, async () => {
    const state = await readBudgetFile(artifact, artifact.path, allowMissing);
    return operation(state);
  });
}

/**
 * Create the per-run budget binding once and return the two environment values
 * that must be forwarded through the trainer process to target cells.
 */
export async function initializeTargetEpisodeBudget(
  root: string,
  limit: number,
): Promise<TargetEpisodeBudgetEnvironment> {
  assertLimit(limit);
  const sourceWorktree = process.cwd();
  const artifact = await openRoot(root, sourceWorktree, false);
  try {
    const canonicalRoot = artifact.path;
    await withBudgetLock(
      artifact,
      sourceWorktree,
      async (existing) => {
        if (existing !== undefined) {
          if (existing.limit !== limit)
            invalid("target_episode_budget_file_mismatch");
          return;
        }
        const initial: BudgetFile = {
          schemaVersion: SCHEMA_VERSION,
          artifactType: ARTIFACT_TYPE,
          runRoot: canonicalRoot,
          limit,
          reservedCount: 0,
          countHash: "0".repeat(64),
        };
        await writeBudgetFile(artifact, {
          ...initial,
          countHash: countHash(initial),
        });
      },
      true,
    );
    return Object.freeze({
      [TARGET_EPISODE_BUDGET_ROOT_ENV]: canonicalRoot,
      [MAX_TARGET_EPISODES_ENV]: String(limit),
    });
  } finally {
    await artifact.close();
  }
}

/** Reserve one target attempt before any cell setup or model launch. */
export async function reserveTargetEpisode(
  env: NodeJS.ProcessEnv,
  sourceWorktree: string,
): Promise<TargetEpisodeBudgetReport | undefined> {
  const config = configuredBudget(env);
  if (config === undefined) return undefined;

  const artifact = await openRoot(config.root, sourceWorktree, true);
  try {
    return await withBudgetLock(
      artifact,
      sourceWorktree,
      async (current) => {
        if (current === undefined)
          invalid("target_episode_budget_file_missing");
        if (current.limit !== config.limit)
          invalid("target_episode_budget_file_mismatch");
        if (current.reservedCount >= current.limit)
          invalid("target_episode_budget_exhausted");
        const next: BudgetFile = {
          ...current,
          reservedCount: current.reservedCount + 1,
          countHash: "0".repeat(64),
        };
        await writeBudgetFile(artifact, {
          ...next,
          countHash: countHash(next),
        });
        return report(next);
      },
      false,
    );
  } finally {
    await artifact.close();
  }
}

/** Read counters without reserving or launching a model. */
export async function readTargetEpisodeBudget(
  env: NodeJS.ProcessEnv,
  sourceWorktree = process.cwd(),
): Promise<TargetEpisodeBudgetReport | undefined> {
  const config = configuredBudget(env);
  if (config === undefined) return undefined;

  const artifact = await openRoot(config.root, sourceWorktree, true);
  try {
    return await withBudgetLock(
      artifact,
      sourceWorktree,
      async (current) => {
        if (current === undefined)
          invalid("target_episode_budget_file_missing");
        if (current.limit !== config.limit)
          invalid("target_episode_budget_file_mismatch");
        return report(current);
      },
      false,
    );
  } finally {
    await artifact.close();
  }
}
