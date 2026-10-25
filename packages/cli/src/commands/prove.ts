import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { executeIngestProof } from "../operations/proof/ingest-proof.js";
import type { IngestProofResult } from "../operations/proof/ingest-proof.js";
import {
  type FailedProofStep,
  PROOF_TEST_REPORT_ENV,
  PROOF_TEST_REPORT_VERSION,
  type ProofRunAttribution,
  attributeCommandRun,
  proofTestReportPath,
} from "../proof/command-test-report.js";
import type { ProofIntegration } from "../proof/integrations.js";
import {
  PROOF_RUNS_DIR,
  loadProofIntegrations,
  resolveIntegration,
} from "../proof/integrations.js";
import { convertJUnitXml } from "../proof/producers/junit-adapter.js";
import { convertTap } from "../proof/producers/tap-adapter.js";
import { loadEntities } from "../public/operations/discovery-entities.js";
import {
  runOperationJsonQuery,
  toPrologAtom,
} from "../public/operations/prolog-json.js";
import type {
  OperationContext,
  OperationRuntime,
} from "../public/operations/runtime-types.js";
import { ingestProofSpec } from "../public/operations/specs/proof.js";
import {
  currentProofBindingMode,
  perContractTestBindings,
} from "../public/operations/specs/reporting.js";
import { readWorkspaceSnapshot } from "../public/operations/workspace-snapshot.js";
import { PROOF_CERTIFICATES_ENV } from "../public/proof-certificates.js";
import {
  PROOF_RUN_VERSION,
  type ProofContract,
  type ProofResult,
  type ProofRunArtifact,
  proofBindingsErrors,
  proofRunArtifactErrors,
} from "../public/proof-protocol.js";
import { PROOF_RECEIPT_MAX_AGE_SECONDS } from "../public/proof-receipt.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

// implements REQ-kibi-verification-evidence-contract
export type ProveCommandOptions = Readonly<{
  testId?: string;
  requirement?: string;
  integration?: string;
  integrationExcept?: string;
  all?: boolean;
  /** Keep only selected tests without a current passing receipt. */
  stale?: boolean;
  /** Skip integrations an interrupted run already ingested at this snapshot. */
  resume?: boolean;
  workspaceRoot?: string;
}>;

// implements REQ-kibi-verification-evidence-contract
export type ProveCommandDependencies = Readonly<{
  runtime?: OperationRuntime;
  ingestProof?: typeof executeIngestProof;
}>;

type SelectedTest = Record<string, unknown>;

/**
 * Describe which paths moved when a proof snapshot refusal fires, so
 * consumers can see what kibi thinks changed instead of diffing by hand.
 * Snapshot-relevant changes come first (receipt-only and ignored edits do
 * not affect the hash), and the list is capped to keep the error readable.
 */
// implements REQ-kibi-verification-evidence-contract
export function describeWorkspaceDrift(
  snapshot: Awaited<ReturnType<typeof readWorkspaceSnapshot>>,
): string {
  if (!snapshot.available) return " (workspace snapshot unavailable)";
  const changes = snapshot.snapshot.changes ?? [];
  const relevant = changes.filter((change) => change.snapshotRelevant);
  const pool =
    relevant.length > 0
      ? relevant
      : changes.filter((change) => !change.snapshotRelevant);
  if (pool.length === 0) {
    return " (git reported no workspace changes; the hash drift may come from file content that git treats as unchanged)";
  }
  const maxPaths = 10;
  const listed = pool
    .slice(0, maxPaths)
    .map((change) => `${change.status.trim() || "M"} ${change.path}`);
  const more = pool.length - listed.length;
  return `; changed: ${listed.join(", ")}${more > 0 ? ` (+${more} more)` : ""}`;
}

/**
 * Parse a comma-separated integration selector ("a", "a,b,c") into a set of
 * trimmed, non-empty ids. Empty selectors yield an empty set; blank items
 * fail fast instead of silently narrowing the selection.
 */
// implements REQ-kibi-verification-evidence-contract
export function parseIntegrationSelector(
  value: string | undefined,
  flagName: string,
): Set<string> {
  if (value === undefined || value.trim() === "") return new Set();
  const ids = new Set<string>();
  for (const raw of value.split(",")) {
    const id = raw.trim();
    if (id === "")
      throw new Error(`prove: ${flagName} contains an empty integration id`);
    ids.add(id);
  }
  return ids;
}

function withId(entity: Record<string, unknown>): SelectedTest {
  if (typeof entity.id !== "string" || entity.id === "")
    throw new Error("prove: loaded test entity is missing an id");
  return entity;
}

export function testId(test: SelectedTest): string {
  return String(test.id);
}

function parseContract(test: Record<string, unknown>): ProofContract | null {
  const contract = test.proof_contract;
  if (
    contract === null ||
    typeof contract !== "object" ||
    Array.isArray(contract)
  )
    return null;
  return contract as ProofContract;
}

/** Run a proof integration's command and resolve with its exit code. */
// implements REQ-kibi-verification-evidence-contract
export async function runChild(
  commandArgv: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<number> {
  const [command, ...args] = commandArgv;
  if (!command)
    throw new Error("prove: integration command argv must be non-empty");
  return await new Promise((resolve, reject) => {
    // The producer runs in its own process group, so stopping kibi prove
    // stops the whole suite it started (a test runner and its workers), not
    // only kibi prove itself.
    const ownGroup = process.platform !== "win32";
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: "inherit",
      detached: ownGroup,
    });
    const forward = (signal: NodeJS.Signals) => {
      const pid = child.pid;
      try {
        if (ownGroup && pid !== undefined) process.kill(-pid, signal);
        else child.kill(signal);
      } catch {
        // The producer already exited.
      }
      process.exit(signal === "SIGINT" ? 130 : 143);
    };
    const onInt = () => forward("SIGINT");
    const onTerm = () => forward("SIGTERM");
    const onHup = () => forward("SIGHUP");
    process.once("SIGINT", onInt);
    process.once("SIGTERM", onTerm);
    process.once("SIGHUP", onHup);
    const settle = () => {
      process.removeListener("SIGINT", onInt);
      process.removeListener("SIGTERM", onTerm);
      process.removeListener("SIGHUP", onHup);
    };
    child.once("error", (error) => {
      settle();
      reject(error);
    });
    child.once("close", (code) => {
      settle();
      resolve(code ?? 1);
    });
  });
}

// implements REQ-kibi-verification-evidence-contract
export function commandEnvironment(
  integration: ProofIntegration,
  commandArgv: readonly string[],
  snapshot: string,
  workspaceRoot: string,
  testIds: readonly string[],
  outputPath: string,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    KIBI_PROOF_RUN: "1",
    KIBI_PROOF_OUTPUT: outputPath,
    KIBI_PROOF_SNAPSHOT: snapshot,
    KIBI_PROOF_COMMAND_ARGV: JSON.stringify(commandArgv),
    KIBI_PROOF_INTEGRATION: integration.id,
    KIBI_PROOF_WORKSPACE: workspaceRoot,
    KIBI_PROOF_TEST_IDS: JSON.stringify(testIds),
  };
}

/** Where `kibi prove` records which integrations it has ingested. */
export const PROVE_PROGRESS_FILE = "prove-progress.json";

type ProveProgress = {
  version: "kibi.prove-progress.v1";
  snapshot: string;
  /** Integration id to the test ids whose receipts it wrote. */
  ingested: Record<string, string[]>;
};

/** Read the progress file; anything unreadable counts as no progress. */
export async function readProveProgress(
  runsDir: string,
): Promise<ProveProgress | null> {
  try {
    const parsed = JSON.parse(
      await readFile(path.join(runsDir, PROVE_PROGRESS_FILE), "utf8"),
    ) as Partial<ProveProgress>;
    if (
      parsed.version !== "kibi.prove-progress.v1" ||
      typeof parsed.snapshot !== "string" ||
      parsed.ingested === null ||
      typeof parsed.ingested !== "object"
    )
      return null;
    return parsed as ProveProgress;
  } catch {
    return null;
  }
}

/** Start a fresh progress record for a run that is not resuming. */
async function recordProgressReset(
  runsDir: string,
  progress: ProveProgress,
): Promise<void> {
  await writeFile(
    path.join(runsDir, PROVE_PROGRESS_FILE),
    `${JSON.stringify(progress, null, 2)}\n`,
    "utf8",
  );
}

/**
 * Integrations a resumed run can skip: ingested at the same snapshot, for
 * every test this run selects for them.
 */
export function resumableIntegrations(
  progress: ProveProgress | null,
  snapshot: string,
  groups: ReadonlyMap<string, readonly SelectedTest[]>,
): Set<string> {
  const skip = new Set<string>();
  if (progress === null || progress.snapshot !== snapshot) return skip;
  for (const [integrationId, tests] of groups) {
    const done = new Set(progress.ingested[integrationId] ?? []);
    if (done.size > 0 && tests.every((test) => done.has(String(test.id))))
      skip.add(integrationId);
  }
  return skip;
}

/**
 * Narrow a Playwright integration's command to the spec files the selected
 * tests are bound to, so `kibi prove --test X` runs X's specs instead of the
 * whole suite. Only a direct `playwright test` invocation is narrowed, and
 * only when every selected test names its `proof_bindings[].source_file`;
 * otherwise the command runs unchanged and the reason says why.
 */
// implements REQ-kibi-verification-evidence-contract
export function narrowedPlaywrightCommand(
  command: readonly string[],
  tests: readonly SelectedTest[],
): { argv: string[]; narrowed: boolean; reason?: string } {
  const argv = [...command];
  const runner = argv.findIndex(
    (arg, index) =>
      /(^|[\\/])playwright(\.c?js)?$/.test(arg) && argv[index + 1] === "test",
  );
  if (runner < 0)
    return {
      argv,
      narrowed: false,
      reason:
        "the command is not a direct `playwright test` invocation; narrow it from KIBI_PROOF_SOURCE_FILES",
    };
  const files = new Set<string>();
  for (const test of tests) {
    const own = proofSourceFiles(test);
    if (own.length === 0)
      return {
        argv,
        narrowed: false,
        reason: `test ${String(test.id)} has no proof_bindings[].source_file`,
      };
    for (const file of own) files.add(file);
  }
  return { argv: [...argv, ...[...files].sort()], narrowed: true };
}

function proofSourceFiles(test: SelectedTest): string[] {
  const raw = test.proof_bindings;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const file =
      entry !== null && typeof entry === "object"
        ? (entry as Record<string, unknown>).source_file
        : undefined;
    return typeof file === "string" && file !== "" ? [file] : [];
  });
}

function collectBindings(tests: readonly SelectedTest[]): {
  symbol_id: string;
  target: string;
  native_id?: string;
  aliases?: string[];
}[] {
  const bindings: {
    symbol_id: string;
    target: string;
    native_id?: string;
    aliases?: string[];
  }[] = [];
  for (const test of tests) {
    const raw = test.proof_bindings;
    if (raw === undefined || raw === null) continue;
    if (!Array.isArray(raw)) continue;
    const errors = proofBindingsErrors(raw);
    if (errors.length > 0)
      throw new Error(
        `prove: test ${test.id} has invalid proof_bindings: ${errors.join("; ")}`,
      );
    for (const entry of raw) {
      const row = entry as Record<string, unknown>;
      bindings.push({
        symbol_id: String(row.symbol_id),
        target: String(row.target),
        ...(row.native_id !== undefined
          ? { native_id: String(row.native_id) }
          : {}),
        ...(row.aliases !== undefined
          ? { aliases: (row.aliases as unknown[]).map(String) }
          : {}),
      });
    }
  }
  return bindings;
}

function dedupeObligations(tests: readonly SelectedTest[]): ProofResult[] {
  const seen = new Set<string>();
  const results: ProofResult[] = [];
  for (const test of tests) {
    const contract = parseContract(test);
    if (!contract) continue;
    for (const obligation of contract.required_proofs) {
      const key = `${obligation.target}\0${obligation.symbol_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        symbol_id: obligation.symbol_id,
        target: obligation.target,
        outcome: "passed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      });
    }
  }
  return results;
}

function markAggregateFailure(results: ProofResult[]): ProofResult[] {
  return results.map((result) => ({ ...result, outcome: "failed" as const }));
}

/**
 * Receipt state per proof-bearing test under the binding mode reports use.
 * `passed` means the test already has a current passing receipt; anything
 * else (missing, stale, contract_mismatch, invalid, failed) needs a run.
 */
// implements REQ-kibi-verification-evidence-contract
export async function readTestReceiptStates(
  context: OperationContext,
): Promise<ReadonlyMap<string, string>> {
  const snapshotEvidence = await readWorkspaceSnapshot(context);
  const snapshot = snapshotEvidence.available
    ? snapshotEvidence.snapshot.hash
    : "unknown";
  const bindingsDict = await perContractTestBindings(context);
  const bindingMode =
    bindingsDict !== null ? "per_contract" : currentProofBindingMode();
  const payload = await runOperationJsonQuery<{
    states?: Record<string, string>;
  }>(
    context.prolog as never,
    "discovery.pl",
    `discovery:test_receipt_states_json(${bindingMode}, ${bindingsDict ?? "_{}"}, ${toPrologAtom(snapshot)}, ${toPrologAtom(context.clock().toISOString())}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}, JsonString)`,
    "prove --stale",
  );
  return new Map(Object.entries(payload.states ?? {}));
}

async function selectTests(
  context: OperationContext,
  options: ProveCommandOptions,
): Promise<SelectedTest[]> {
  const selected = await selectTestsBySelector(context, options);
  if (!options.stale || selected.length === 0) return selected;
  const states = await readTestReceiptStates(context);
  return selected.filter(
    (entity) => states.get(String(entity.id)) !== "passed",
  );
}

async function selectTestsBySelector(
  context: OperationContext,
  options: ProveCommandOptions,
): Promise<SelectedTest[]> {
  // Contract plus bindings only. Receipt histories are loaded again at ingest
  // and blow the Prolog output buffer when selected up front. JUnit and TAP
  // conversion needs the bindings before that reload.
  const loadAll = async (): Promise<Record<string, unknown>[]> =>
    loadEntities(context.prolog as never, {
      type: "test",
      projection: "proof_contract",
    });
  let candidates: SelectedTest[] = [];
  if (options.testId) {
    const found = await loadEntities(context.prolog as never, {
      id: options.testId,
      type: "test",
      projection: "proof_contract",
    });
    candidates = found.map(withId);
  } else if (options.requirement) {
    const requirementId = options.requirement;
    const scenarioResult = await context.prolog?.query(
      `findall([S,T], (kb_relationship(specified_by, '${requirementId}', S), (kb_relationship(verified_by, S, T) ; kb_relationship(validates, T, S))), Rows)`,
    );
    const rowsRaw = scenarioResult?.success
      ? scenarioResult.bindings.Rows
      : undefined;
    const ids = new Set<string>();
    if (typeof rowsRaw === "string") {
      for (const match of rowsRaw.matchAll(
        /\[['"]?([^,\]]+)['"]?,['"]?([^,\]]+)['"]?\]/g,
      )) {
        const test = match[2];
        if (test) ids.add(test.trim());
      }
    }
    const directResult = await context.prolog?.query(
      `findall(T, kb_relationship(validates, T, '${requirementId}'), Rows)`,
    );
    const directRaw = directResult?.success
      ? directResult.bindings.Rows
      : undefined;
    if (typeof directRaw === "string") {
      for (const match of directRaw.matchAll(
        /\[?['"]?([A-Za-z0-9_-]+)['"]?\]?/g,
      )) {
        const candidate: string | undefined = match[1];
        if (candidate?.startsWith("TEST-")) ids.add(candidate);
      }
    }
    const all = await loadAll();
    candidates = all.filter((entity) => ids.has(String(entity.id))).map(withId);
  } else {
    candidates = (await loadAll()).map(withId);
  }
  const selected = candidates.filter(
    (entity) => parseContract(entity) !== null,
  );
  const includeIds = parseIntegrationSelector(
    options.integration,
    "--integration",
  );
  const excludeIds = parseIntegrationSelector(
    options.integrationExcept,
    "--integration-except",
  );
  if (includeIds.size === 0 && excludeIds.size === 0) return selected;
  const filtered = selected.filter((entity) => {
    const contract = parseContract(entity);
    if (!contract) return false;
    if (includeIds.size > 0 && !includeIds.has(contract.integration))
      return false;
    if (excludeIds.size > 0 && excludeIds.has(contract.integration))
      return false;
    return true;
  });
  if (filtered.length === 0 && includeIds.size + excludeIds.size > 0) {
    const requested = [
      ...(includeIds.size > 0
        ? [`integrations: ${[...includeIds].sort().join(", ")}`]
        : []),
      ...(excludeIds.size > 0
        ? [`excluding: ${[...excludeIds].sort().join(", ")}`]
        : []),
    ].join("; ");
    throw new Error(
      `prove: no proof-bearing tests match the integration selector (${requested})`,
    );
  }
  return filtered;
}

// implements REQ-kibi-claim-bound-proofs
// One line per claim a certificate test names in proves: derived (with its
// scope), attested, or rejected with the reason.
function claimBindingLines(result: IngestProofResult): string[] {
  return result.results.flatMap((row) =>
    (row.claimBindings ?? []).map(
      (binding) =>
        `${row.testId} ${binding.claim_key}${binding.requirement_id ? ` (${binding.requirement_id})` : ""}: ${binding.binding}${binding.binding === "derived" && binding.scope ? `, ${binding.scope} scope` : ""}${binding.reason ? `: ${binding.reason}` : ""}`,
    ),
  );
}

function summarize(result: IngestProofResult): string {
  const parts = [`passed ${result.passed}`, `failed ${result.failed}`];
  if (result.unchanged > 0) parts.push(`unchanged ${result.unchanged}`);
  return parts.join(", ");
}

// implements REQ-kibi-verification-evidence-contract
export async function proveCommand(
  options: ProveCommandOptions,
  deps: ProveCommandDependencies = {},
): Promise<{ exitCode: number }> {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const ingestProof = deps.ingestProof ?? executeIngestProof;
  const runtime =
    deps.runtime ??
    createCliRuntime(
      options.workspaceRoot === undefined ? {} : { workspaceRoot },
    );
  const context = await runtime.open(ingestProofSpec, {
    ...(options.workspaceRoot === undefined ? {} : { workspaceRoot }),
  });
  let completed = false;
  try {
    const integrations = loadProofIntegrations(context.workspaceRoot);
    if (!integrations.available)
      throw new Error(`prove: ${integrations.error}`);
    const selected = await selectTests(context, options);
    if (selected.length === 0) {
      process.stdout.write(
        `${JSON.stringify({ proved: 0, failed: 0, message: options.stale ? "every selected test already has a current passing receipt" : "no proof-bearing tests selected" })}\n`,
      );
      completed = true;
      return { exitCode: 0 };
    }
    const before = await readWorkspaceSnapshot(context);
    if (!before.available) throw new Error(`prove: ${before.error}`);
    const snapshot = before.snapshot.hash;
    // Packed contracts run in separate processes; one shared packed-tarball
    // cache area per campaign snapshot replaces dozens of repeated packs and
    // installs with a single population. The snapshot hash is the provenance
    // key: different workspace state never sees another campaign's artifacts.
    process.env.KIBI_E2E_PACK_CACHE_KEY ??= snapshot;

    const groups = new Map<string, SelectedTest[]>();
    for (const test of selected) {
      const contract = parseContract(test);
      if (!contract) continue;
      const list = groups.get(contract.integration) ?? [];
      list.push(test as SelectedTest);
      groups.set(contract.integration, list);
    }

    const runsDir = path.join(context.workspaceRoot, PROOF_RUNS_DIR);
    await mkdir(runsDir, { recursive: true });

    // Each integration's receipts are written as soon as it finishes; the
    // progress file lets an interrupted run continue with --resume.
    const previous = options.resume ? await readProveProgress(runsDir) : null;
    const skipped = options.resume
      ? resumableIntegrations(previous, snapshot, groups)
      : new Set<string>();
    if (options.resume && previous !== null && previous.snapshot !== snapshot)
      process.stderr.write(
        "prove: the workspace changed since the interrupted run; running every selected integration\n",
      );
    const progress: ProveProgress = {
      version: "kibi.prove-progress.v1",
      snapshot,
      ingested:
        previous !== null && previous.snapshot === snapshot
          ? { ...previous.ingested }
          : {},
    };
    const recordProgress = async (
      integrationId: string,
      testIds: readonly string[],
    ): Promise<void> => {
      const done = new Set(progress.ingested[integrationId] ?? []);
      for (const id of testIds) done.add(id);
      progress.ingested[integrationId] = [...done].sort();
      await writeFile(
        path.join(runsDir, PROVE_PROGRESS_FILE),
        `${JSON.stringify(progress, null, 2)}\n`,
        "utf8",
      );
    };
    if (!options.resume) await recordProgressReset(runsDir, progress);
    if (skipped.size > 0)
      process.stderr.write(
        `prove: resuming; skipping integrations already ingested at this snapshot: ${[...skipped].join(", ")}\n`,
      );
    const narrowSelection = Boolean(
      options.testId || options.requirement || options.stale,
    );
    const pending = [...groups].filter(([id]) => !skipped.has(id));

    const ingestResults: IngestProofResult[] = [];
    const runAttribution = new Map<IngestProofResult, EvaluatedRun>();
    const failures: string[] = [];
    for (const [index, [integrationId, tests]] of pending.entries()) {
      process.stderr.write(
        `prove: running integration '${integrationId}' (${index + 1}/${pending.length}, ${tests.length} test${tests.length === 1 ? "" : "s"})\n`,
      );
      const integration = resolveIntegration(
        integrations.integrations,
        integrationId,
      );
      if (!integration) {
        failures.push(
          `integration '${integrationId}' (required by ${tests.map((t) => t.id).join(", ")}) is not configured in .kb/proof/integrations.json; plan it with kibi proof inspect --update ${integrationId} --json and apply the plan with kb_apply_plan`,
        );
        continue;
      }
      let commandArgv = [...integration.command];
      if (narrowSelection && integration.producer === "playwright") {
        const narrowed = narrowedPlaywrightCommand(commandArgv, tests);
        commandArgv = narrowed.argv;
        if (!narrowed.narrowed)
          process.stderr.write(
            `prove: running the whole '${integrationId}' integration: ${narrowed.reason}\n`,
          );
      }
      const artifactPath = path.resolve(
        context.workspaceRoot,
        integration.artifact ??
          path.join(PROOF_RUNS_DIR, `${integrationId}.json`),
      );
      await mkdir(path.dirname(artifactPath), { recursive: true });
      await rm(artifactPath, { force: true });
      const selectedTestIds = tests.map((test) => String(test.id));
      // Command integrations may attribute their run per test; any report
      // left by an earlier run must never be read as this run's evidence.
      const testReportPath =
        integration.producer === "command"
          ? proofTestReportPath(artifactPath)
          : undefined;
      if (testReportPath !== undefined)
        await rm(testReportPath, { force: true });
      const env = commandEnvironment(
        integration,
        commandArgv,
        snapshot,
        context.workspaceRoot,
        selectedTestIds,
        artifactPath,
      );
      if (testReportPath !== undefined)
        env[PROOF_TEST_REPORT_ENV] = testReportPath;
      env.KIBI_PROOF_SOURCE_FILES = JSON.stringify(
        [...new Set(tests.flatMap(proofSourceFiles))].sort(),
      );
      // Certificate-kind tests leave one certificate per test here; any left
      // by an earlier run must never be read as this run's proof.
      const certificateDir = path.join(runsDir, "certificates", integrationId);
      await rm(certificateDir, { recursive: true, force: true });
      await mkdir(certificateDir, { recursive: true });
      env[PROOF_CERTIFICATES_ENV] = certificateDir;
      const startedAt = new Date().toISOString();
      let exitCode: number;
      try {
        exitCode = await runChild(commandArgv, context.workspaceRoot, env);
      } catch (error) {
        failures.push(
          `integration '${integrationId}' failed to start: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      const finishedAt = new Date().toISOString();

      let evaluated: EvaluatedRun;
      try {
        evaluated =
          testReportPath === undefined
            ? {
                artifacts: [
                  {
                    artifact: await buildArtifact({
                      integration,
                      commandArgv,
                      exitCode,
                      startedAt,
                      finishedAt,
                      artifactPath,
                      snapshot,
                      tests,
                    }),
                    testIds: selectedTestIds,
                  },
                ],
              }
            : buildCommandRunArtifacts({
                integration,
                commandArgv,
                exitCode,
                startedAt,
                finishedAt,
                snapshot,
                tests,
                attribution: await readCommandAttribution(
                  testReportPath,
                  selectedTestIds,
                  exitCode,
                ),
              });
      } catch (error) {
        failures.push(
          `integration '${integrationId}': ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      try {
        evaluated = attachCertificates(
          evaluated,
          await readCertificateDir(certificateDir),
        );
      } catch (error) {
        failures.push(
          `integration '${integrationId}': ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      const artifactErrors = [
        ...(evaluated.wholeRun === undefined ? [] : [evaluated.wholeRun]),
        ...evaluated.artifacts.map((entry) => entry.artifact),
      ].flatMap((artifact) => proofRunArtifactErrors(artifact));
      if (artifactErrors.length > 0) {
        failures.push(
          `integration '${integrationId}' produced an invalid kibi.proof-run.v1 artifact: ${artifactErrors.join("; ")}`,
        );
        continue;
      }
      await mkdir(path.dirname(artifactPath), { recursive: true });
      await writeFile(
        artifactPath,
        `${JSON.stringify(evaluated.wholeRun ?? evaluated.artifacts[0]?.artifact, null, 2)}\n`,
        "utf8",
      );
      if (evaluated.wholeRun !== undefined) {
        for (const entry of evaluated.artifacts) {
          await writeFile(
            partitionArtifactPath(artifactPath, entry.artifact.run.outcome),
            `${JSON.stringify(entry.artifact, null, 2)}\n`,
            "utf8",
          );
        }
      }
      const afterRun = await readWorkspaceSnapshot(context);
      if (!afterRun.available || afterRun.snapshot.hash !== snapshot) {
        failures.push(
          `integration '${integrationId}' changed the tracked workspace during proof execution; proof is bound to snapshot ${snapshot}${describeWorkspaceDrift(afterRun)}`,
        );
        continue;
      }
      // One ingest per partition: each test is evaluated only against the
      // slice of the run its own steps produced.
      const partitionResults: IngestProofResult[] = [];
      for (const entry of evaluated.artifacts) {
        const ingested = await ingestProof(
          {
            snapshot,
            artifact: entry.artifact as unknown as Record<string, unknown>,
            testIds: entry.testIds,
          },
          context,
        );
        partitionResults.push(ingested.structuredContent);
      }
      const merged = mergeIngestResults(partitionResults);
      if (merged !== undefined) {
        ingestResults.push(merged);
        runAttribution.set(merged, evaluated);
        await recordProgress(integrationId, selectedTestIds);
        process.stderr.write(
          `prove: ingested integration '${integrationId}' (${summarize(merged)})\n`,
        );
        for (const line of claimBindingLines(merged))
          process.stderr.write(`prove: ${line}\n`);
      }
      const afterIngest = await readWorkspaceSnapshot(context);
      if (!afterIngest.available || afterIngest.snapshot.hash !== snapshot) {
        failures.push(
          `the tracked workspace changed while receipts were applied; re-run kibi prove${describeWorkspaceDrift(afterIngest)}`,
        );
      }
    }

    const passed = ingestResults.reduce(
      (sum, result) => sum + result.passed,
      0,
    );
    const failed = ingestResults.reduce(
      (sum, result) => sum + result.failed,
      0,
    );
    const unchanged = ingestResults.reduce(
      (sum, result) => sum + result.unchanged,
      0,
    );
    const summary = {
      proved: passed,
      failed,
      unchanged,
      runs: ingestResults.map((result) => {
        const attribution = runAttribution.get(result)?.attribution;
        return {
          integration: result.integration,
          summary: summarize(result),
          ...(attribution === undefined
            ? {}
            : {
                attribution: attribution.attribution,
                ...(attribution.attribution === "aggregate"
                  ? { attributionReason: attribution.reason }
                  : {}),
                ...(attribution.failedSteps.length > 0
                  ? { failedSteps: attribution.failedSteps }
                  : {}),
              }),
          results: result.results,
        };
      }),
      ...(failures.length > 0 ? { failures } : {}),
    };
    if (failures.length > 0 && Object.keys(progress.ingested).length > 0)
      process.stderr.write(
        "prove: integrations that failed to produce receipts run again with the same selector plus --resume\n",
      );
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    completed = true;
    await runtime.afterSuccess(ingestProofSpec, context);
    return { exitCode: failures.length > 0 || failed > 0 ? 1 : 0 };
  } finally {
    await runtime.close(
      context,
      completed
        ? { status: "success", result: 0 }
        : { status: "error", error: 1 },
    );
  }
}

/** Read every certificate a run left in its certificate directory. */
// implements REQ-kibi-code-proof-kinds
export async function readCertificateDir(
  directory: string,
): Promise<Record<string, unknown>[]> {
  let names: string[];
  try {
    names = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
  const certificates: Record<string, unknown>[] = [];
  for (const name of names.sort()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(path.join(directory, name), "utf8"));
    } catch {
      throw new Error(`certificate ${name} is not valid JSON`);
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error(`certificate ${name} is not a JSON object`);
    certificates.push(parsed as Record<string, unknown>);
  }
  return certificates;
}

/**
 * Give each artifact the certificates of its own tests, so a partition is
 * never evaluated against another test's certificate. A test may leave at
 * most one certificate per run.
 */
// implements REQ-kibi-code-proof-kinds
export function attachCertificates(
  evaluated: EvaluatedRun,
  certificates: readonly Record<string, unknown>[],
): EvaluatedRun {
  if (certificates.length === 0) return evaluated;
  const seen = new Set<string>();
  for (const certificate of certificates) {
    const id = String(certificate.test_id ?? "");
    if (seen.has(id))
      throw new Error(`the run left more than one certificate for ${id}`);
    seen.add(id);
  }
  const withOwn = (
    artifact: ProofRunArtifact,
    testIds: readonly string[],
  ): ProofRunArtifact => {
    const own = certificates.filter((certificate) =>
      testIds.includes(String(certificate.test_id ?? "")),
    );
    return own.length === 0
      ? artifact
      : {
          ...artifact,
          certificates: [...(artifact.certificates ?? []), ...own],
        };
  };
  return {
    ...evaluated,
    artifacts: evaluated.artifacts.map((entry) => ({
      ...entry,
      artifact: withOwn(entry.artifact, entry.testIds),
    })),
    ...(evaluated.wholeRun === undefined
      ? {}
      : {
          wholeRun: withOwn(
            evaluated.wholeRun,
            evaluated.artifacts.flatMap((entry) => entry.testIds),
          ),
        }),
  };
}

/** The artifacts one integration run is evaluated through. */
// implements REQ-kibi-fresh-verification-receipts-v2
export type EvaluatedRun = Readonly<{
  /** Each artifact is ingested against exactly its own tests. */
  artifacts: readonly Readonly<{
    artifact: ProofRunArtifact;
    testIds: readonly string[];
  }>[];
  /** The whole process run, kept when the evidence was partitioned. */
  wholeRun?: ProofRunArtifact;
  attribution?: ProofRunAttribution;
}>;

/** Read a command integration's optional per-test report and attribute it. */
// implements REQ-kibi-fresh-verification-receipts-v2
export async function readCommandAttribution(
  reportPath: string,
  selectedTestIds: readonly string[],
  exitCode: number,
): Promise<ProofRunAttribution> {
  let raw: string;
  try {
    raw = await readFile(reportPath, "utf8");
  } catch {
    return attributeCommandRun({
      selectedTestIds,
      exitCode,
      report: undefined,
    });
  }
  let report: unknown;
  try {
    report = JSON.parse(raw);
  } catch (error) {
    return {
      attribution: "aggregate",
      reason: `the ${PROOF_TEST_REPORT_VERSION} is not valid JSON (${error instanceof Error ? error.message : String(error)}), so the run is evaluated as one unit`,
      failedSteps: [],
    };
  }
  return attributeCommandRun({ selectedTestIds, exitCode, report });
}

/** Where a partition's evaluated artifact is kept next to the run artifact. */
// implements REQ-kibi-fresh-verification-receipts-v2
export function partitionArtifactPath(
  artifactPath: string,
  outcome: string,
): string {
  const stem = artifactPath.endsWith(".json")
    ? artifactPath.slice(0, -".json".length)
    : artifactPath;
  return `${stem}.${outcome}.json`;
}

function describeFailedStep(step: FailedProofStep): string {
  return `${step.testId} step ${step.stepIndex} ${step.outcome}${step.exitCode === null ? "" : ` (exit ${step.exitCode})`}: ${step.command.join(" ")}`;
}

/**
 * Build the kibi.proof-run.v1 evidence of a `command` integration run.
 *
 * Without per-test attribution the run is one unit, exactly as before: a
 * failing process fails every selected test. With a valid
 * kibi.proof-test-report.v1 the run is split into one artifact per test
 * outcome: tests whose own steps all passed are evaluated against a passing
 * slice (exit code 0, the aggregate result of their own steps), and each
 * failing outcome gets a failing slice that names the steps that failed. The
 * whole-process artifact is kept alongside for audit.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export function buildCommandRunArtifacts(input: {
  integration: ProofIntegration;
  commandArgv: readonly string[];
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  snapshot: string;
  tests: readonly SelectedTest[];
  attribution: ProofRunAttribution;
}): EvaluatedRun {
  const { integration, exitCode, tests, attribution } = input;
  const base = (
    run: ProofRunArtifact["run"],
    proofResults: ProofResult[],
    diagnostics: readonly string[],
  ): ProofRunArtifact => ({
    version: PROOF_RUN_VERSION,
    producer: {
      name: "kibi-command-producer",
      ...(integration.producer_version !== undefined
        ? { version: integration.producer_version }
        : {}),
    },
    integration: integration.id,
    command_argv: [...input.commandArgv],
    code_snapshot: input.snapshot,
    environment: {
      os: process.platform,
      arch: process.arch,
      runtime: { name: "node", version: process.version },
    },
    run,
    proof_results: proofResults,
    ...(diagnostics.length > 0 ? { diagnostics: [...diagnostics] } : {}),
  });
  const timing = { started_at: input.startedAt, finished_at: input.finishedAt };
  const allTestIds = tests.map((test) => String(test.id));
  const wholeResults = dedupeObligations(tests);
  const failedLines = attribution.failedSteps.map(describeFailedStep);

  if (attribution.attribution === "aggregate") {
    const passedRun = exitCode === 0;
    const artifact = base(
      {
        outcome: passedRun ? "passed" : "failed",
        exit_code: exitCode,
        ...timing,
      },
      passedRun ? wholeResults : markAggregateFailure(wholeResults),
      passedRun ? [] : [attribution.reason, ...failedLines],
    );
    return {
      artifacts: [{ artifact, testIds: allTestIds }],
      attribution,
    };
  }

  const byId = new Map(tests.map((test) => [String(test.id), test]));
  const artifacts = attribution.partitions.map((partition) => {
    const partitionTests = partition.testIds.map(
      (testId) => byId.get(testId) as SelectedTest,
    );
    const results = dedupeObligations(partitionTests).map((result) => ({
      ...result,
      outcome: partition.outcome,
    }));
    const artifact = base(
      {
        outcome: partition.outcome,
        exit_code: partition.exitCode,
        ...timing,
        ...(partition.outcome === "passed"
          ? {}
          : { failure_phase: "execution" as const }),
      },
      results,
      [
        `per-test attribution: ${partition.testIds.length} of ${allTestIds.length} selected test(s) whose own steps ${partition.outcome === "passed" ? "all passed" : `ended ${partition.outcome}`}; the integration process exited ${exitCode}`,
        ...partition.failedSteps.map(describeFailedStep),
      ],
    );
    return { artifact, testIds: partition.testIds };
  });
  const wholeRun = base(
    {
      outcome: exitCode === 0 ? "passed" : "failed",
      exit_code: exitCode,
      ...timing,
    },
    exitCode === 0 ? wholeResults : markAggregateFailure(wholeResults),
    [
      `evaluated per test: ${attribution.partitions.map((partition) => `${partition.testIds.length} ${partition.outcome}`).join(", ")}`,
      ...failedLines,
    ],
  );
  return { artifacts, wholeRun, attribution };
}

function mergeIngestResults(
  results: readonly IngestProofResult[],
): IngestProofResult | undefined {
  const [first] = results;
  if (first === undefined) return undefined;
  if (results.length === 1) return first;
  return {
    ...first,
    passed: results.reduce((sum, result) => sum + result.passed, 0),
    failed: results.reduce((sum, result) => sum + result.failed, 0),
    unchanged: results.reduce((sum, result) => sum + result.unchanged, 0),
    results: results.flatMap((result) => result.results),
  };
}

async function buildArtifact(input: {
  integration: ProofIntegration;
  commandArgv: readonly string[];
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  artifactPath: string;
  snapshot: string;
  tests: readonly SelectedTest[];
}): Promise<ProofRunArtifact> {
  const {
    integration,
    commandArgv,
    exitCode,
    startedAt,
    finishedAt,
    artifactPath,
    snapshot,
    tests,
  } = input;
  const run = (outcome: ProofRunArtifact["run"]["outcome"]) => ({
    outcome,
    exit_code: exitCode,
    started_at: startedAt,
    finished_at: finishedAt,
  });
  // `command` integrations never reach this function: proveCommand builds
  // their artifacts with buildCommandRunArtifacts (per-test attribution).
  if (integration.producer === "junit" || integration.producer === "tap") {
    const nativePath = integration.artifact;
    if (!nativePath)
      throw new Error(
        `producer '${integration.producer}' requires an artifact path in .kb/proof/integrations.json`,
      );
    let native: string;
    try {
      native = await readFile(path.resolve(context_path(nativePath)), "utf8");
    } catch {
      throw new Error(
        `producer '${integration.producer}' did not produce its native report at ${nativePath}`,
      );
    }
    const bindings = collectBindings(tests);
    const conversion =
      integration.producer === "junit"
        ? convertJUnitXml(native, bindings)
        : convertTap(native, bindings);
    if (conversion.fatal) {
      throw new Error(
        `producer '${integration.producer}' rejected its native report${conversion.diagnostics.length > 0 ? `: ${conversion.diagnostics.join("; ")}` : ""}`,
      );
    }
    if (conversion.results.length === 0)
      throw new Error(
        `producer '${integration.producer}' produced no bound proof results${conversion.diagnostics.length > 0 ? `: ${conversion.diagnostics.join("; ")}` : ""}`,
      );
    return {
      version: PROOF_RUN_VERSION,
      producer: {
        name: `kibi-${integration.producer}-adapter`,
        ...(integration.producer_version !== undefined
          ? { version: integration.producer_version }
          : {}),
      },
      integration: integration.id,
      command_argv: [...commandArgv],
      code_snapshot: snapshot,
      environment: {
        os: process.platform,
        arch: process.arch,
        runtime: { name: "node", version: process.version },
      },
      run: run(
        conversion.results.every((result) => result.outcome === "passed")
          ? "passed"
          : "failed",
      ),
      proof_results: conversion.results,
      ...(conversion.diagnostics.length > 0
        ? { diagnostics: conversion.diagnostics }
        : {}),
    };
  }
  // Self-emitting producers (playwright and custom): read the emitted
  // kibi.proof-run.v1 artifact and enforce the process outcome.
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(await readFile(artifactPath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      `producer '${integration.producer}' did not emit a readable kibi.proof-run.v1 artifact at ${artifactPath}`,
    );
  }
  const artifact = parsed as unknown as ProofRunArtifact;
  const runRecord = parsed.run as Record<string, unknown> | undefined;
  const reportedOutcome = runRecord?.outcome;
  if (exitCode !== 0) {
    if (reportedOutcome === "passed") {
      throw new Error(
        `producer '${integration.producer}' reported run.outcome 'passed' but the process exited with code ${exitCode}`,
      );
    }
  }
  return artifact;
}

function context_path(nativePath: string): string {
  return path.isAbsolute(nativePath)
    ? nativePath
    : path.join(process.cwd(), nativePath);
}
