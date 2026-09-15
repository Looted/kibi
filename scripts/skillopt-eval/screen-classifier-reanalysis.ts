import { createHash } from "node:crypto";
import { lstat, mkdir, readFile } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { z } from "zod";
import { prepareArtifactPath } from "./artifact-path";
import {
  CONTRACT_SCHEMA_VERSION,
  JsonValueSchema,
  Sha256Schema,
  contractHash,
} from "./contracts/common";
import { EvidenceIndexSchema } from "./contracts/evidence";
import {
  type ScreenCell,
  summarizeScreen,
  validateScreenPlan,
} from "./development-screen";
import type { PublicTaskDescriptor } from "./real-workflow-types";
import { sealDefaultCellEvidence } from "./runtime/codex-cell-defaults";
import {
  type CodexEpisodeReceipt,
  CodexEpisodeReceiptSchema,
} from "./runtime/codex-episode";
import {
  deterministicVariantLabel,
  normalizeCodexJsonl,
} from "./runtime/codex-events";
import { PublicTaskClaimSchema } from "./runtime/file-bridge";
import {
  type FinalStateReceipt,
  FinalStateReceiptSchema,
} from "./runtime/final-state";
import { taskFinalStateRequests } from "./runtime/final-state-requests";
import {
  TaskFixtureResolutionError,
  resolveTaskFixture,
} from "./runtime/task-fixture";
import { type CellReceipt, scoreCell } from "./scoring/cell";
import type { FrozenVariant } from "./variants";

const ArtifactNameSchema = z
  .object({ path: z.string().min(1), sha256: Sha256Schema })
  .strict();

const SurfaceSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-variant"),
    skill: z.string().min(1),
    variant: z.enum(["baseline", "one-shot", "skillopt"]),
    status: z.literal("frozen"),
    bodyHash: Sha256Schema,
    frontmatterHash: Sha256Schema,
    resourcesHash: Sha256Schema,
    provenance: z.enum([
      "canonical",
      "codex-one-shot",
      "codex-one-shot-unavailable",
      "skillopt",
    ]),
    sourceRequestHash: Sha256Schema.optional(),
  })
  .strict();

const LockSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-development-screen-lock"),
    runId: z.uuid(),
    sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
    skill: z.string().min(1),
    repeats: z.number().int().positive(),
    maxCells: z.number().int().positive(),
    surfaces: z.array(SurfaceSchema).min(2).max(4),
    tasks: z
      .array(
        z
          .object({
            id: z.string().min(1),
            family: z.string().min(1),
            split: z.literal("development"),
            publicClaim: PublicTaskClaimSchema,
          })
          .strict(),
      )
      .length(4),
    lockHash: Sha256Schema,
    productionAdoption: z.literal("external-verdict-required"),
  })
  .passthrough();

const ReviewCellSchema = z
  .object({
    score: z.number().min(0).max(100),
    hardPass: z.boolean(),
    criticalFailures: z.array(z.string()),
    securityFailures: z.array(z.string()).optional(),
    receiptPath: z.string().min(1),
    usage: z.unknown(),
    bodyHash: Sha256Schema,
    taskId: z.string().min(1),
    family: z.string().min(1),
    replicate: z.number().int().positive(),
  })
  .strict();

const ReviewSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("skillopt-development-screen-review"),
    runId: z.uuid(),
    lockHash: Sha256Schema,
    attemptedCells: z.number().int().nonnegative(),
    cells: z.array(ReviewCellSchema),
    status: z.enum(["running", "completed", "failed"]),
    smokeModelInvocationAttempts: z.number().int().nonnegative(),
    targetEpisodesAttempted: z.number().int().nonnegative(),
    targetEpisodesCompleted: z.number().int().nonnegative(),
    summaries: z.array(z.unknown()),
    heldOut: z.literal("not-run"),
    productionAdoption: z.literal("external-verdict-required"),
  })
  .strict();

const ARTIFACT_NAMES = {
  rawTranscript: "raw-host.jsonl",
  rawStderr: "raw-stderr.log",
  normalizedEvents: "normalized-events.jsonl",
  brokerTrace: "broker-trace.jsonl",
  diagnosticReceipt: "diagnostic-receipt.jsonl",
  finalState: "final-state.json",
  evidenceIndex: "evidence-index.json",
} as const;

type ArtifactKey = keyof typeof ARTIFACT_NAMES;
type ParsedLock = z.infer<typeof LockSchema>;
type ParsedReview = z.infer<typeof ReviewSchema>;
type ReviewCell = ParsedReview["cells"][number];
type ReceiptArtifacts = Record<ArtifactKey, string>;

export class OfflineReanalysisError extends Error {
  readonly name = "OfflineReanalysisError";

  constructor(readonly code: string) {
    super(code);
  }
}

export type ReceiptComparison = Readonly<{
  oldScore: number;
  correctedScore: number;
  oldHardPass: boolean;
  correctedHardPass: boolean;
  oldStatus: CodexEpisodeReceipt["result"]["status"];
  correctedStatus: CodexEpisodeReceipt["result"]["status"];
  oldViolations: readonly string[];
  correctedViolations: readonly string[];
  oldDirectKbAccess: boolean;
  correctedDirectKbAccess: boolean;
  latent: Readonly<{
    score: number;
    hardPass: boolean;
    terminalCategory: CellReceipt["terminalCategory"];
    components: CellReceipt["components"];
    criticalFailures: readonly string[];
  }>;
}>;

export type OfflineReanalysisOptions = Readonly<{
  sourceRoot: string;
  fixtureRunRoot: string;
  artifactRoot: string;
}>;

const REANALYSIS_REPO_ROOT = resolve(import.meta.dir, "../..");

export const REANALYSIS_SOURCE_FILES = {
  "scripts/skillopt-eval/screen-classifier-reanalysis.ts": join(
    REANALYSIS_REPO_ROOT,
    "scripts/skillopt-eval/screen-classifier-reanalysis.ts",
  ),
  "scripts/skillopt-eval/runtime/codex-events.ts": join(
    REANALYSIS_REPO_ROOT,
    "scripts/skillopt-eval/runtime/codex-events.ts",
  ),
  "scripts/skillopt-eval/runtime/codex-episode.ts": join(
    REANALYSIS_REPO_ROOT,
    "scripts/skillopt-eval/runtime/codex-episode.ts",
  ),
  "scripts/skillopt-eval/runtime/codex-cell-defaults.ts": join(
    REANALYSIS_REPO_ROOT,
    "scripts/skillopt-eval/runtime/codex-cell-defaults.ts",
  ),
  "scripts/skillopt-eval/scoring/cell.ts": join(
    REANALYSIS_REPO_ROOT,
    "scripts/skillopt-eval/scoring/cell.ts",
  ),
  "scripts/skillopt-eval/development-screen.ts": join(
    REANALYSIS_REPO_ROOT,
    "scripts/skillopt-eval/development-screen.ts",
  ),
  "scripts/skillopt-eval/runtime/task-fixture.ts": join(
    REANALYSIS_REPO_ROOT,
    "scripts/skillopt-eval/runtime/task-fixture.ts",
  ),
  "scripts/skillopt-eval/runtime/final-state-requests.ts": join(
    REANALYSIS_REPO_ROOT,
    "scripts/skillopt-eval/runtime/final-state-requests.ts",
  ),
} as const;

export type ReanalysisSourceHashes = Readonly<
  Record<keyof typeof REANALYSIS_SOURCE_FILES, string>
>;

export type OfflineReanalysisReport = Readonly<{
  schemaVersion: typeof CONTRACT_SCHEMA_VERSION;
  artifactType: "offline-classifier-reanalysis";
  mode: "offline-classifier-reanalysis";
  status: "completed" | "limited";
  sourceRunId: string;
  sourceCommit: string;
  sourceRoot: string;
  fixtureRunRoot: string;
  sourceLockHash: string;
  sourceHashes: Readonly<{
    screenLock: string;
    screenReview: string;
    bodies: Readonly<Record<string, string>>;
  }>;
  reanalysisSourceHashes: ReanalysisSourceHashes;
  cells: readonly Readonly<Record<string, unknown>>[];
  summaries: Readonly<{
    old: readonly unknown[];
    corrected: readonly unknown[];
  }>;
  productionAdoption: "external-verdict-required";
  paidModelCalls: 0;
  heldOut: "not-read";
  generatedAt: string;
  limitedReason?: string;
}>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isWithin(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function fail(code: string): never {
  throw new OfflineReanalysisError(code);
}

async function assertComponentsAreNotSymlinks(path: string): Promise<void> {
  let current: string = sep;
  for (const part of resolve(path).split(sep).filter(Boolean)) {
    current = resolve(current, part);
    let stats: Awaited<ReturnType<typeof lstat>>;
    try {
      stats = await lstat(current);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        fail("source_artifact_missing");
      fail("source_artifact_unavailable");
    }
    if (stats.isSymbolicLink()) fail("source_path_symlink");
  }
}

async function assertRegularFile(path: string): Promise<void> {
  let stats: Awaited<ReturnType<typeof lstat>>;
  try {
    stats = await lstat(path);
  } catch {
    fail("source_artifact_missing");
  }
  if (!stats.isFile() || stats.isSymbolicLink())
    fail("source_artifact_not_regular");
}

async function readSourceText(path: string, root: string): Promise<string> {
  const resolved = resolve(path);
  if (!isWithin(root, resolved)) fail("source_path_escape");
  await assertComponentsAreNotSymlinks(resolved);
  await assertRegularFile(resolved);
  return readFile(resolved, "utf8");
}

export async function hashReanalysisSourceFiles(): Promise<ReanalysisSourceHashes> {
  const entries = await Promise.all(
    Object.entries(REANALYSIS_SOURCE_FILES).map(
      async ([relativePath, path]) =>
        [
          relativePath,
          sha256(await readSourceText(path, REANALYSIS_REPO_ROOT)),
        ] as const,
    ),
  );
  return Object.fromEntries(entries) as ReanalysisSourceHashes;
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    [...left].every((entry) => right.includes(entry))
  );
}

function unionStrings(...sets: readonly (readonly string[])[]): string[] {
  return [...new Set(sets.flat())];
}

function orderedViolations(
  violations: readonly (
    | "hidden_data_leakage"
    | "direct_kb_access"
    | "forbidden_write"
    | "unauthorized_network"
  )[],
): string[] {
  const order = [
    "hidden_data_leakage",
    "direct_kb_access",
    "forbidden_write",
    "unauthorized_network",
  ] as const;
  return order.filter((entry) => violations.includes(entry));
}

function terminalStatusFor(
  latent: CellReceipt,
  violations: readonly string[],
): Readonly<{
  status: "completed" | "behavioral-failure";
  score: number;
  hardPass: boolean;
}> {
  if (violations.length > 0) {
    return { status: "behavioral-failure", score: 0, hardPass: false };
  }
  if (latent.terminalCategory === null) {
    return {
      status: "completed",
      score: latent.score,
      hardPass: latent.hard === 1,
    };
  }
  if (latent.terminalCategory === "behavioral_failure") {
    return {
      status: "behavioral-failure",
      score: latent.score,
      hardPass: false,
    };
  }
  return { status: "behavioral-failure", score: 0, hardPass: false };
}

function assertFullyCompletedTransport(
  receipt: CodexEpisodeReceipt,
  latent: CellReceipt,
): void {
  if (
    (receipt.result.status !== "completed" &&
      receipt.result.status !== "behavioral-failure") ||
    receipt.result.exitCode !== 0 ||
    !Object.values(receipt.result.reconciliation).every(Boolean) ||
    !receipt.evidenceIndex.events.some(
      ({ event }) => event.type === "turn.completed",
    ) ||
    latent.terminalCategory === "pre_action_infrastructure_failure" ||
    latent.terminalCategory === "incomplete_evidence" ||
    latent.terminalCategory === "budget_stop" ||
    latent.terminalCategory === "evidence_conflict" ||
    receipt.result.criticalFailures.some((failure) =>
      /(?:provider_budget_exhausted|missing_|timeout|nonzero_exit|required_mcp_startup|capacity|quota|interrupt|infrastructure|conflict)/i.test(
        failure,
      ),
    )
  ) {
    fail("cell_transport_unscorable");
  }
}

/**
 * Compares one saved receipt with a newly sealed evaluator result. This seam
 * deliberately accepts the latent score and the new direct-access bit only;
 * it never reconstructs the original auth or hidden-root policy.
 */
export function compareReceipt(
  input: Readonly<{
    receipt: CodexEpisodeReceipt;
    latent: CellReceipt;
    currentDirectKbAccess: boolean;
  }>,
): ReceiptComparison {
  const { receipt, latent, currentDirectKbAccess } = input;
  assertFullyCompletedTransport(receipt, latent);

  const oldViolations = orderedViolations(receipt.violations);
  const oldExpected = terminalStatusFor(latent, oldViolations);
  const oldCriticalFailures = unionStrings(
    oldViolations,
    latent.criticalFailures,
  );
  if (
    receipt.result.status !== oldExpected.status ||
    receipt.result.score !== oldExpected.score ||
    receipt.result.hardPass !== oldExpected.hardPass ||
    !sameStringSet(receipt.result.criticalFailures, oldCriticalFailures)
  ) {
    fail("original_score_mismatch");
  }

  const nonDirectViolations = oldViolations.filter(
    (violation) => violation !== "direct_kb_access",
  );
  const correctedViolations = orderedViolations([
    ...nonDirectViolations,
    ...(currentDirectKbAccess ? ["direct_kb_access"] : []),
  ] as typeof receipt.violations);
  const corrected = terminalStatusFor(latent, correctedViolations);
  return {
    oldScore: receipt.result.score,
    correctedScore: corrected.score,
    oldHardPass: receipt.result.hardPass,
    correctedHardPass: corrected.hardPass,
    oldStatus: receipt.result.status,
    correctedStatus: corrected.status,
    oldViolations,
    correctedViolations,
    oldDirectKbAccess: oldViolations.includes("direct_kb_access"),
    correctedDirectKbAccess: currentDirectKbAccess,
    latent: {
      score: latent.score,
      hardPass: latent.hard === 1,
      terminalCategory: latent.terminalCategory,
      components: latent.components,
      criticalFailures: latent.criticalFailures,
    },
  };
}

export async function verifyArtifactRef(
  episodeRoot: string,
  key: ArtifactKey,
  ref: z.infer<typeof ArtifactNameSchema>,
): Promise<string> {
  if (ref.path !== ARTIFACT_NAMES[key]) fail("artifact_ref_path_mismatch");
  const path = resolve(episodeRoot, ref.path);
  if (!isWithin(episodeRoot, path)) fail("artifact_ref_path_escape");
  await assertComponentsAreNotSymlinks(path);
  await assertRegularFile(path);
  const content = await readFile(path, "utf8");
  if (sha256(content) !== ref.sha256) fail("artifact_ref_hash_mismatch");
  return content;
}

async function verifyReceiptArtifacts(
  episodeRoot: string,
  receipt: CodexEpisodeReceipt,
): Promise<ReceiptArtifacts> {
  const contents = {} as ReceiptArtifacts;
  for (const key of Object.keys(ARTIFACT_NAMES) as ArtifactKey[]) {
    contents[key] = await verifyArtifactRef(
      episodeRoot,
      key,
      receipt.artifacts[key],
    );
  }
  const evidenceIndex = CodexEpisodeReceiptSchema.parse(receipt).evidenceIndex;
  const persistedIndex = (() => {
    try {
      return EvidenceIndexSchema.parse(JSON.parse(contents.evidenceIndex));
    } catch {
      fail("evidence_index_invalid");
    }
  })();
  if (
    contractHash(JsonValueSchema.parse(persistedIndex)) !==
    receipt.result.evidenceIndexHash
  ) {
    fail("evidence_index_hash_mismatch");
  }
  if (
    contractHash(JsonValueSchema.parse(persistedIndex)) !==
    contractHash(JsonValueSchema.parse(evidenceIndex))
  ) {
    fail("evidence_index_receipt_mismatch");
  }
  if (
    sha256(contents.brokerTrace) !== evidenceIndex.brokerTraceHash ||
    sha256(contents.diagnosticReceipt) !==
      evidenceIndex.diagnosticReceiptHash ||
    sha256(contents.finalState) !== evidenceIndex.finalStateHash
  ) {
    fail("evidence_hash_mismatch");
  }
  const normalized = evidenceIndex.events
    .map(({ sequence, event }) =>
      JSON.stringify({ sequence, type: event.type, payload: event.payload }),
    )
    .join("\n");
  if (contents.normalizedEvents !== normalized)
    fail("normalized_events_mismatch");
  return contents;
}

function assertFinalStateBinding(
  finalState: FinalStateReceipt,
  receipt: CodexEpisodeReceipt,
  manifest: ReturnType<
    typeof import("./fixtures/private").parsePrivateEvaluatorManifest
  >,
  taskId: string,
): void {
  const binding = finalState.binding;
  if (
    binding === undefined ||
    binding.caseId !== taskId ||
    binding.sequence !== 1 ||
    binding.roots.publicManifestHash !== manifest.publicManifestHash ||
    binding.roots.workspaceHash !== manifest.workspaceHash ||
    binding.roots.fixtureSeedHash !== manifest.fixtureSeedHash ||
    finalState.workspaceRoot.length === 0 ||
    receipt.evidenceIndex.runId !== receipt.result.runId ||
    receipt.evidenceIndex.episodeId !== receipt.result.episodeId ||
    receipt.evidenceIndex.runLockHash !== receipt.result.runLockHash
  ) {
    fail("evidence_root_binding_mismatch");
  }
}

function sameRequests(
  actual: FinalStateReceipt["requests"],
  expected: readonly Readonly<{
    tool: string;
    args: Record<string, unknown>;
  }>[],
): boolean {
  return (
    actual.length === expected.length &&
    expected.every(
      (request, index) =>
        actual[index]?.tool === request.tool &&
        JSON.stringify(actual[index]?.args) === JSON.stringify(request.args),
    )
  );
}

function buildVariants(
  lock: ParsedLock,
  bodies: Readonly<Record<string, string>>,
): FrozenVariant[] {
  return lock.surfaces.map((surface) => {
    const body = bodies[surface.bodyHash];
    if (body === undefined) fail("variant_body_missing");
    return { ...surface, body } as FrozenVariant;
  });
}

function bodyPath(sourceRoot: string, bodyHash: string): string {
  return join(sourceRoot, `body-${bodyHash}.md`);
}

async function resolveScreenTasks(
  lock: ParsedLock,
  fixtureRunRoot: string,
): Promise<
  Readonly<
    Record<
      string,
      ReturnType<typeof resolveTaskFixture> extends Promise<infer T> ? T : never
    >
  >
> {
  const entries = await Promise.all(
    lock.tasks.map(async (task) => {
      try {
        const fixture = await resolveTaskFixture({
          fixtureRunRoot,
          taskId: task.id,
          publicClaim: task.publicClaim,
        });
        if (
          fixture.fixtureClaim.split !== "development" ||
          fixture.fixtureClaim.family !== task.family
        ) {
          fail("screen_task_binding_mismatch");
        }
        return [task.id, fixture] as const;
      } catch (error) {
        if (error instanceof OfflineReanalysisError) throw error;
        if (error instanceof TaskFixtureResolutionError) {
          throw new OfflineReanalysisError("source_manifests_unavailable");
        }
        throw new OfflineReanalysisError("source_manifests_unavailable");
      }
    }),
  );
  return Object.fromEntries(entries);
}

function reportCell(
  sourceCell: ReviewCell,
  receipt: CodexEpisodeReceipt,
  comparison: ReceiptComparison,
  inputHashes: Readonly<Record<string, unknown>>,
  currentDirectSignal: Readonly<{ malformedLines: readonly number[] }>,
): Readonly<Record<string, unknown>> {
  return {
    taskId: sourceCell.taskId,
    family: sourceCell.family,
    replicate: sourceCell.replicate,
    bodyHash: sourceCell.bodyHash,
    episodeId: receipt.result.episodeId,
    old: {
      score: comparison.oldScore,
      hardPass: comparison.oldHardPass,
      status: comparison.oldStatus,
      violations: comparison.oldViolations,
      directKbAccess: comparison.oldDirectKbAccess,
      criticalFailures: receipt.result.criticalFailures,
    },
    corrected: {
      score: comparison.correctedScore,
      hardPass: comparison.correctedHardPass,
      status: comparison.correctedStatus,
      violations: comparison.correctedViolations,
      directKbAccess: comparison.correctedDirectKbAccess,
      criticalFailures: unionStrings(
        comparison.correctedViolations,
        comparison.latent.criticalFailures,
      ),
    },
    latent: comparison.latent,
    currentDetector: {
      directKbAccess: comparison.correctedDirectKbAccess,
      malformedLines: currentDirectSignal.malformedLines,
      nonDirectViolationsIgnored: true,
    },
    inputHashes,
  };
}

async function analyzeSource(
  options: Readonly<{
    sourceRoot: string;
    fixtureRunRoot: string;
    reanalysisSourceHashes: ReanalysisSourceHashes;
  }>,
): Promise<OfflineReanalysisReport> {
  const sourceRoot = resolve(options.sourceRoot);
  const fixtureRunRoot = resolve(options.fixtureRunRoot);
  const lockPath = join(sourceRoot, "screen-lock.json");
  const reviewPath = join(sourceRoot, "screen-review.json");
  const lockText = await readSourceText(lockPath, sourceRoot);
  const reviewText = await readSourceText(reviewPath, sourceRoot);
  const lock = LockSchema.parse(JSON.parse(lockText));
  const review = ReviewSchema.parse(JSON.parse(reviewText));
  if (review.runId !== lock.runId || review.lockHash !== lock.lockHash) {
    fail("screen_review_binding_mismatch");
  }
  const { lockHash: ignoredLockHash, ...lockIdentity } = lock;
  if (contractHash(JsonValueSchema.parse(lockIdentity)) !== lock.lockHash)
    fail("screen_lock_hash_mismatch");
  if (
    basename(sourceRoot) !== lock.runId ||
    basename(dirname(sourceRoot)) !== "screen" ||
    basename(fixtureRunRoot) !== lock.runId ||
    basename(dirname(fixtureRunRoot)) !== "fixtures"
  ) {
    fail("screen_root_layout_invalid");
  }
  if (
    review.status !== "completed" ||
    review.attemptedCells !== lock.maxCells ||
    review.targetEpisodesAttempted !== lock.maxCells ||
    review.targetEpisodesCompleted !== lock.maxCells ||
    review.cells.length !== lock.maxCells ||
    lock.repeats * lock.tasks.length * lock.surfaces.length !== lock.maxCells
  ) {
    fail("screen_not_fully_completed");
  }

  let fixtures: Awaited<ReturnType<typeof resolveScreenTasks>>;
  try {
    fixtures = await resolveScreenTasks(lock, fixtureRunRoot);
  } catch (error) {
    if (
      error instanceof OfflineReanalysisError &&
      error.code === "source_manifests_unavailable"
    ) {
      return {
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        artifactType: "offline-classifier-reanalysis",
        mode: "offline-classifier-reanalysis",
        status: "limited",
        sourceRunId: lock.runId,
        sourceCommit: lock.sourceCommit,
        sourceRoot,
        fixtureRunRoot,
        sourceLockHash: lock.lockHash,
        sourceHashes: {
          screenLock: sha256(lockText),
          screenReview: sha256(reviewText),
          bodies: {},
        },
        reanalysisSourceHashes: options.reanalysisSourceHashes,
        cells: [],
        summaries: { old: [], corrected: [] },
        productionAdoption: "external-verdict-required",
        paidModelCalls: 0,
        heldOut: "not-read",
        generatedAt: new Date().toISOString(),
        limitedReason: "source_manifests_unavailable",
      };
    }
    throw error;
  }

  const bodies: Record<string, string> = {};
  for (const surface of lock.surfaces) {
    const text = await readSourceText(
      bodyPath(sourceRoot, surface.bodyHash),
      sourceRoot,
    );
    if (sha256(text) !== surface.bodyHash) fail("variant_body_hash_mismatch");
    bodies[surface.bodyHash] = text;
  }
  const variants = buildVariants(lock, bodies);
  const tasks: PublicTaskDescriptor[] = lock.tasks.map((task) => task);
  validateScreenPlan({
    variants,
    tasks,
    repeats: lock.repeats,
    maxCells: lock.maxCells,
  });

  const oldCells: ScreenCell[] = [];
  const correctedCells: ScreenCell[] = [];
  const reportCells: Readonly<Record<string, unknown>>[] = [];
  for (const sourceCell of review.cells) {
    const fixture = fixtures[sourceCell.taskId];
    if (fixture === undefined) fail("screen_task_missing");
    const surface = lock.surfaces.find(
      ({ bodyHash }) => bodyHash === sourceCell.bodyHash,
    );
    if (surface === undefined) fail("screen_variant_missing");
    const episodePath = resolve(sourceCell.receiptPath);
    const expectedEpisodeParent = join(sourceRoot, "episodes");
    if (!isWithin(expectedEpisodeParent, episodePath))
      fail("receipt_path_escape");
    const receiptText = await readSourceText(
      sourceCell.receiptPath,
      sourceRoot,
    );
    const receipt = CodexEpisodeReceiptSchema.parse(JSON.parse(receiptText));
    if (
      receipt.result.runId !== lock.runId ||
      receipt.result.runLockHash !== lock.lockHash ||
      receipt.result.episodeId !== basename(dirname(episodePath)) ||
      receipt.variantLabel !==
        deterministicVariantLabel(
          lock.lockHash,
          receipt.result.episodeId,
          surface.variant,
        )
    ) {
      fail("episode_binding_mismatch");
    }
    const episodeRoot = join(sourceRoot, "episodes", receipt.result.episodeId);
    if (episodePath !== join(episodeRoot, "episode-receipt.json"))
      fail("receipt_path_mismatch");
    const contents = await verifyReceiptArtifacts(episodeRoot, receipt);
    const finalState = FinalStateReceiptSchema.parse(
      JSON.parse(contents.finalState),
    );
    const expectedRequests = taskFinalStateRequests(
      sourceCell.taskId,
      fixture.evaluatorManifest.protocolContract !== undefined,
    );
    if (!sameRequests(finalState.requests, expectedRequests))
      fail("final_state_requests_mismatch");
    assertFinalStateBinding(
      finalState,
      receipt,
      fixture.evaluatorManifest,
      sourceCell.taskId,
    );

    const evidence = sealDefaultCellEvidence(
      {
        evaluatorManifest: fixture.evaluatorManifest,
        finalStateRequests: expectedRequests,
      },
      {
        finalState: contents.finalState,
        brokerTrace: contents.brokerTrace,
        diagnosticReceipt: contents.diagnosticReceipt,
      },
    );
    const latent = scoreCell(fixture.evaluatorManifest, evidence);
    const current = normalizeCodexJsonl(contents.rawTranscript, {
      hiddenMarkers: [],
      forbiddenRoots: [],
    });
    const comparison = compareReceipt({
      receipt,
      latent,
      currentDirectKbAccess: current.violations.includes("direct_kb_access"),
    });

    const oldSecurityFailures =
      sourceCell.securityFailures ?? sourceCell.criticalFailures;
    const correctedSecurityFailures = unionStrings(
      oldSecurityFailures.filter((failure) => failure !== "direct_kb_access"),
      comparison.correctedDirectKbAccess ? ["direct_kb_access"] : [],
    );
    if (
      sourceCell.score !== comparison.oldScore ||
      sourceCell.hardPass !== comparison.oldHardPass ||
      !sameStringSet(
        sourceCell.criticalFailures,
        receipt.result.criticalFailures,
      ) ||
      !sameStringSet(
        oldSecurityFailures,
        unionStrings(
          receipt.violations,
          receipt.result.criticalFailures.filter((failure) =>
            /^(?:isolation|sentinel)-/.test(failure),
          ),
        ),
      )
    ) {
      fail("screen_review_cell_mismatch");
    }
    const inputHashes = {
      receipt: sha256(receiptText),
      body: sourceCell.bodyHash,
      lock: lock.lockHash,
      evidenceIndex: receipt.result.evidenceIndexHash,
      artifacts: Object.fromEntries(
        (Object.keys(receipt.artifacts) as ArtifactKey[]).map((key) => [
          key,
          receipt.artifacts[key].sha256,
        ]),
      ),
      publicManifest: fixture.fixtureClaim.publicManifestHash,
      workspace: fixture.fixtureClaim.workspaceHash,
      evaluatorManifest: fixture.fixtureClaim.evaluatorManifestHash,
    };
    reportCells.push(
      reportCell(sourceCell, receipt, comparison, inputHashes, {
        malformedLines: current.malformedLines,
      }),
    );
    oldCells.push({
      score: comparison.oldScore,
      hardPass: comparison.oldHardPass,
      criticalFailures: receipt.result.criticalFailures,
      securityFailures: oldSecurityFailures,
      receiptPath: sourceCell.receiptPath,
      usage: sourceCell.usage,
      bodyHash: sourceCell.bodyHash,
      taskId: sourceCell.taskId,
      family: sourceCell.family,
      replicate: sourceCell.replicate,
    });
    correctedCells.push({
      score: comparison.correctedScore,
      hardPass: comparison.correctedHardPass,
      criticalFailures: unionStrings(
        comparison.correctedViolations,
        latent.criticalFailures,
      ),
      securityFailures: correctedSecurityFailures,
      receiptPath: sourceCell.receiptPath,
      usage: sourceCell.usage,
      bodyHash: sourceCell.bodyHash,
      taskId: sourceCell.taskId,
      family: sourceCell.family,
      replicate: sourceCell.replicate,
    });
  }

  const oldSummaries = summarizeScreen(oldCells, variants);
  if (
    contractHash(JsonValueSchema.parse(review.summaries)) !==
    contractHash(JsonValueSchema.parse(oldSummaries))
  ) {
    fail("screen_review_summary_mismatch");
  }
  const correctedSummaries = summarizeScreen(correctedCells, variants);
  return {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    artifactType: "offline-classifier-reanalysis",
    mode: "offline-classifier-reanalysis",
    status: "completed",
    sourceRunId: lock.runId,
    sourceCommit: lock.sourceCommit,
    sourceRoot,
    fixtureRunRoot,
    sourceLockHash: lock.lockHash,
    sourceHashes: {
      screenLock: sha256(lockText),
      screenReview: sha256(reviewText),
      bodies: Object.fromEntries(
        Object.entries(bodies).map(([hash]) => [hash, hash]),
      ),
    },
    reanalysisSourceHashes: options.reanalysisSourceHashes,
    cells: reportCells,
    summaries: { old: oldSummaries, corrected: correctedSummaries },
    productionAdoption: "external-verdict-required",
    paidModelCalls: 0,
    heldOut: "not-read",
    generatedAt: new Date().toISOString(),
  };
}

async function assertNewArtifactRoot(
  artifactRoot: string,
  protectedRoots: readonly string[],
): Promise<void> {
  const resolved = resolve(artifactRoot);
  if (
    protectedRoots.some(
      (root) =>
        isWithin(resolve(root), resolved) || isWithin(resolved, resolve(root)),
    )
  ) {
    fail("artifact_root_overlaps_source");
  }
  try {
    await lstat(resolved);
    fail("artifact_root_not_new");
  } catch (error) {
    if (error instanceof OfflineReanalysisError) throw error;
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      fail("artifact_root_unavailable");
    }
  }
  await mkdir(dirname(resolved), { recursive: true, mode: 0o700 });
}

export async function runOfflineClassifierReanalysis(
  options: OfflineReanalysisOptions,
): Promise<Readonly<{ report: OfflineReanalysisReport; reportPath: string }>> {
  const sourceRoot = resolve(options.sourceRoot);
  const fixtureRunRoot = resolve(options.fixtureRunRoot);
  const artifactRoot = resolve(options.artifactRoot);
  await assertNewArtifactRoot(artifactRoot, [
    sourceRoot,
    fixtureRunRoot,
    REANALYSIS_REPO_ROOT,
  ]);
  const reanalysisSourceHashes = await hashReanalysisSourceFiles();
  const artifacts = await prepareArtifactPath({
    artifactRoot,
    sourceRoot,
    canonicalRoots: [fixtureRunRoot],
  });
  try {
    const report = await analyzeSource({
      sourceRoot,
      fixtureRunRoot,
      reanalysisSourceHashes,
    });
    const reportPath = join(
      artifacts.path,
      "offline-classifier-reanalysis.json",
    );
    await artifacts.writeText(
      "offline-classifier-reanalysis.json",
      `${JSON.stringify(report, null, 2)}\n`,
    );
    return { report, reportPath };
  } finally {
    await artifacts.close();
  }
}

export function parseOfflineReanalysisArgs(
  args: readonly string[],
): OfflineReanalysisOptions {
  const values: Partial<
    Record<"source-root" | "fixture-run-root" | "artifact-root", string>
  > = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (
      flag !== "--source-root" &&
      flag !== "--fixture-run-root" &&
      flag !== "--artifact-root"
    ) {
      throw new OfflineReanalysisError("invalid_reanalysis_option");
    }
    if (values[flag.slice(2) as keyof typeof values] !== undefined) {
      throw new OfflineReanalysisError("duplicate_reanalysis_option");
    }
    const value = args[++index];
    if (value === undefined || value.startsWith("--")) {
      throw new OfflineReanalysisError("reanalysis_option_requires_value");
    }
    values[flag.slice(2) as keyof typeof values] = value;
  }
  if (
    values["source-root"] === undefined ||
    values["fixture-run-root"] === undefined ||
    values["artifact-root"] === undefined
  ) {
    throw new OfflineReanalysisError("reanalysis_requires_explicit_roots");
  }
  return {
    sourceRoot: values["source-root"],
    fixtureRunRoot: values["fixture-run-root"],
    artifactRoot: values["artifact-root"],
  };
}

export async function main(args: readonly string[]): Promise<number> {
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(
      "Usage: screen-classifier-reanalysis.ts --source-root PATH --fixture-run-root PATH --artifact-root PATH\nOffline classifier reanalysis only; no model, canary, auth, or held-out calls.\n",
    );
    return 0;
  }
  try {
    const result = await runOfflineClassifierReanalysis(
      parseOfflineReanalysisArgs(args),
    );
    process.stdout.write(
      `${JSON.stringify({
        status: result.report.status,
        reportPath: result.reportPath,
        sourceRunId: result.report.sourceRunId,
        sourceLockHash: result.report.sourceLockHash,
        paidModelCalls: 0,
        productionAdoption: "external-verdict-required",
      })}\n`,
    );
    return result.report.status === "completed" ? 0 : 1;
  } catch (error) {
    const reason =
      error instanceof OfflineReanalysisError
        ? error.code
        : "offline_reanalysis_failed";
    process.stderr.write(
      `${JSON.stringify({ status: "failed", reason, paidModelCalls: 0 })}\n`,
    );
    return 1;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
