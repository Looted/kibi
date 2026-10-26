#!/usr/bin/env node

// Command-proof step runner for the repository self-proof integration.
// kibi prove launches this process with KIBI_PROOF_TEST_IDS and evaluates the
// aggregate exit code against each selected test's proof contract. Every
// declared step runs once; a passing retry must never hide a failed attempt.

import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_STEP_TIMEOUT_MS = 15 * 60_000;
const PROCESS_GROUP_TERM_GRACE_MS = 250;

/** Parse and validate the complete declarative proof step file. */
export function validateProofSteps(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      "run-proof-producer: proof steps must be a non-empty array",
    );
  }
  const ids = new Set();
  return value.map((entry, entryIndex) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(
        `run-proof-producer: entry ${entryIndex} must be an object`,
      );
    }
    const row = entry;
    if (typeof row.test_id !== "string" || row.test_id.trim() === "") {
      throw new Error(
        `run-proof-producer: entry ${entryIndex} has an empty test_id`,
      );
    }
    const testId = row.test_id.trim();
    if (ids.has(testId)) {
      throw new Error(
        `run-proof-producer: duplicate test_id ${JSON.stringify(testId)}`,
      );
    }
    ids.add(testId);
    if (!Array.isArray(row.steps) || row.steps.length === 0) {
      throw new Error(
        `run-proof-producer: ${testId} must declare at least one step`,
      );
    }
    const steps = row.steps.map((argv, stepIndex) => {
      if (
        !Array.isArray(argv) ||
        argv.length === 0 ||
        typeof argv[0] !== "string" ||
        argv[0].trim() === "" ||
        argv.slice(1).some((part) => typeof part !== "string")
      ) {
        throw new Error(
          `run-proof-producer: ${testId} step ${stepIndex + 1} must be a non-empty string argv array`,
        );
      }
      return [...argv];
    });
    return { test_id: testId, steps };
  });
}

export function loadProofSteps(workspaceRoot) {
  const stepsPath = path.join(workspaceRoot, "proof", "steps.json");
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(stepsPath, "utf8"));
  } catch (error) {
    throw new Error(
      `run-proof-producer: unable to read ${stepsPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return validateProofSteps(parsed);
}

/** Parse the exact requested contract IDs, rejecting empty and duplicate IDs. */
export function validateRequestedTestIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      "run-proof-producer: KIBI_PROOF_TEST_IDS must be a non-empty JSON array",
    );
  }
  const ids = value.map((id, index) => {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error(
        `run-proof-producer: requested test ID ${index} must be a non-empty string`,
      );
    }
    return id.trim();
  });
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) {
    throw new Error(
      `run-proof-producer: duplicate requested test ID ${JSON.stringify(duplicate)}`,
    );
  }
  return ids;
}

/** Select exactly the requested contracts; never silently drop a typo. */
export function selectExactProofSteps(entries, requestedIds) {
  const byId = new Map(entries.map((entry) => [entry.test_id, entry]));
  const missing = requestedIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(
      `run-proof-producer: no proof steps found for ${JSON.stringify(missing)}`,
    );
  }
  return requestedIds.map((id) => byId.get(id));
}

function positiveTimeout(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_STEP_TIMEOUT_MS;
}

/** Terminate only the detached process group owned by this proof step. */
export function terminateStepProcess(child, signal = "SIGTERM") {
  const pid = Number(child?.pid);
  let signalled = false;
  if (process.platform !== "win32" && Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(-pid, signal);
      signalled = true;
    } catch {
      // The child may have exited between timeout and group lookup.
    }
  }
  if (!signalled && typeof child?.kill === "function") {
    try {
      child.kill(signal);
      signalled = true;
    } catch {
      // The child may have exited while being cleaned up.
    }
  }
  return signalled;
}

/**
 * Usage-telemetry opt-ins an operator may export globally. Proof steps are
 * hermetic: with telemetry on, the MCP server advertises extra
 * `_diagnostic_telemetry` schema fields and writes usage logs, so steps that
 * compare frozen contracts would fail for reasons unrelated to the code.
 */
const TELEMETRY_OPT_IN_KEYS = [
  "KIBI_DIAGNOSTIC_MODE",
  "KIBI_CLI_DIAGNOSTIC_MODE",
];

/**
 * The environment a proof step runs with: the caller's, minus telemetry
 * opt-ins and the outer run's per-test report path (a step that runs a nested
 * producer must never write the report kibi prove reads for this run).
 */
function proofStepEnv(env = process.env) {
  const stepEnv = { ...env };
  for (const key of [...TELEMETRY_OPT_IN_KEYS, "KIBI_PROOF_TEST_REPORT"]) {
    delete stepEnv[key];
  }
  return stepEnv;
}

/** Run one step once and return an explicit attempt result. */
export function runProofStep(commandArgv, options = {}) {
  const [command, ...args] = commandArgv;
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const timeoutMs = positiveTimeout(
    options.timeoutMs ?? env.KIBI_PROOF_STEP_TIMEOUT_MS,
  );
  const spawnProcess = options.spawnProcess ?? spawn;
  const startedAt = Date.now();

  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    // biome-ignore lint/style/useConst: assigned after spawn so synchronous spawn errors can settle first.
    let timeoutHandle;
    let killHandle;
    const finish = (status, signal, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      // Keep the escalation timer alive after a timed-out parent exits. A
      // grandchild may ignore TERM, and clearing this timer here would leak it
      // even though the direct command has already closed.
      if (!timedOut) clearTimeout(killHandle);
      const outcome = timedOut
        ? "timed_out"
        : error || status !== 0
          ? "failed"
          : "passed";
      resolve({
        outcome,
        exit_code: typeof status === "number" ? status : null,
        signal: signal ?? null,
        error: error ? String(error.message ?? error) : null,
        timed_out: timedOut,
        duration_ms: Date.now() - startedAt,
      });
    };

    let child;
    try {
      child = spawnProcess(command, args, {
        cwd,
        env: proofStepEnv(env),
        shell: false,
        stdio: "inherit",
        detached: process.platform !== "win32",
      });
    } catch (error) {
      finish(null, null, error);
      return;
    }

    timeoutHandle = setTimeout(() => {
      timedOut = true;
      terminateStepProcess(child, "SIGTERM");
      killHandle = setTimeout(() => {
        terminateStepProcess(child, "SIGKILL");
      }, PROCESS_GROUP_TERM_GRACE_MS);
    }, timeoutMs);

    child.once("error", (error) => finish(null, null, error));
    // `close` waits for stdio handles as well as the direct process. Using
    // `exit` here can report success while a child still owns inherited I/O.
    child.once("close", (status, signal) => finish(status, signal));
  });
}

/** Positive pool size. Unset, zero, and junk stay sequential. */
// implements REQ-kibi-verification-evidence-contract
export function proofStepConcurrency(env = process.env) {
  const parsed = Number(env.KIBI_PROOF_STEP_CONCURRENCY);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

/**
 * Identical argv is one execution. Contracts that declare it share that
 * attempt; a different flag is a different command.
 */
// implements REQ-kibi-verification-evidence-contract
export function groupProofSteps(selected) {
  const pending = [];
  const groups = [];
  const byKey = new Map();
  for (const entry of selected) {
    for (const [index, argv] of entry.steps.entries()) {
      const key = JSON.stringify(argv);
      const slot = {
        test_id: entry.test_id,
        step_index: index + 1,
        command: argv,
      };
      pending.push(slot);
      let group = byKey.get(key);
      if (!group) {
        group = { key, command: argv, slots: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      group.slots.push(slot);
    }
  }
  return { pending, groups };
}

const UNIT_TEST_RESULTS_VERSION = "kibi.unit-test-results.v1";
const DEFAULT_UNIT_RESULTS_WAIT_MS = 20 * 60_000;
const UNIT_RESULTS_POLL_MS = 2_000;
const TEST_FILE_PATTERN = /[._](?:test|spec)\.[cm]?[jt]sx?$/;
const REUSABLE_BUN_FLAGS = new Set([
  "--isolate",
  "--max-concurrency=1",
  "--retry=0",
]);

function testFilesUnder(workspaceRoot, relative) {
  const absolute = path.join(workspaceRoot, relative);
  if (!existsSync(absolute)) return null;
  if (statSync(absolute).isFile()) return [relative];
  return readdirSync(absolute, { recursive: true, encoding: "utf8" })
    .map((entry) => entry.split(path.sep).join("/"))
    .filter(
      (entry) =>
        !entry.split("/").includes("node_modules") &&
        TEST_FILE_PATTERN.test(entry),
    )
    .map((entry) => path.posix.join(relative, entry))
    .sort();
}

const PROOF_TEST_FILE_PATTERN = /\.proof\.test\.[cm]?[jt]sx?$/;

/**
 * The test files a `bun test` step runs, when the step is nothing more than
 * whole files under the allowed flags. Name filters, other flags or a missing
 * path make the step non-reusable (null). Directories expand to every file a
 * test runner could pick up there, so reuse can only ever ask for more
 * evidence than the step itself would produce, never less. A step that runs
 * a `*.proof.test.*` file is never reusable: it must leave its certificate.
 */
// implements REQ-kibi-verification-evidence-contract
export function reusableBunTestFiles(argv, workspaceRoot = process.cwd()) {
  if (argv[0] !== "bun" || argv[1] !== "test") return null;
  const files = new Set();
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--timeout" && /^\d+$/.test(argv[index + 1] ?? "")) {
      index += 1;
      continue;
    }
    if (REUSABLE_BUN_FLAGS.has(arg)) continue;
    if (!arg.startsWith("./") || arg.includes("..")) return null;
    const expanded = testFilesUnder(
      workspaceRoot,
      path.posix.normalize(arg.slice(2)).replace(/\/$/, ""),
    );
    if (expanded === null) return null;
    for (const file of expanded) files.add(file);
  }
  // A proof test leaves a code certificate for kibi prove; reused evidence
  // would leave none, so a step that runs one always runs.
  if ([...files].some((file) => PROOF_TEST_FILE_PATTERN.test(file)))
    return null;
  return files.size > 0 ? [...files].sort() : null;
}

function gitOutput(workspaceRoot, args) {
  return execFileSync("git", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/**
 * Accept a unit test results ledger only for the exact commit being proven on
 * a clean tracked tree. Returns the clean files, or a reason it was rejected.
 */
// implements REQ-kibi-verification-evidence-contract
export function acceptUnitResultsLedger(ledger, identity) {
  if (ledger === null || typeof ledger !== "object" || Array.isArray(ledger))
    return { files: null, reason: "unit results are malformed" };
  if (typeof ledger.unavailable === "string")
    return {
      files: null,
      reason: `unit results unavailable: ${ledger.unavailable}`,
    };
  if (ledger.version !== UNIT_TEST_RESULTS_VERSION)
    return { files: null, reason: "unit results have an unknown version" };
  if (typeof ledger.commit !== "string" || ledger.commit === "")
    return {
      files: null,
      reason: "unit results are not bound to a clean commit",
    };
  if (identity.commit !== ledger.commit)
    return {
      files: null,
      reason: `unit results are for ${ledger.commit}, not ${identity.commit ?? "an unknown commit"}`,
    };
  if (identity.dirty)
    return { files: null, reason: "tracked files differ from the commit" };
  if (ledger.files === null || typeof ledger.files !== "object")
    return { files: null, reason: "unit results list no files" };
  const files = new Set();
  for (const [file, result] of Object.entries(ledger.files)) {
    if (
      result !== null &&
      typeof result === "object" &&
      Number.isSafeInteger(result.tests) &&
      result.tests > 0 &&
      result.failures === 0 &&
      result.skipped === 0
    )
      files.add(file);
  }
  return { files, reason: null };
}

function workspaceIdentity(workspaceRoot) {
  try {
    const commit = gitOutput(workspaceRoot, ["rev-parse", "HEAD"]).trim();
    const status = gitOutput(workspaceRoot, [
      "status",
      "--porcelain",
      "--untracked-files=no",
    ]);
    return { commit, dirty: status.trim() !== "" };
  } catch {
    return { commit: null, dirty: true };
  }
}

function nonNegativeMs(value, fallback) {
  const parsed = Number(value);
  return value !== undefined &&
    value !== "" &&
    Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : fallback;
}

/**
 * Reuse of test-file evidence for `bun test` steps: a file counts as verified
 * when the unit results ledger for this commit recorded it clean, or when a
 * step of this run already ran it and passed. The ledger is read once, after
 * waiting (bounded) for it to appear when KIBI_PROOF_UNIT_RESULTS names a path.
 */
// implements REQ-kibi-verification-evidence-contract
export function createTestFileReuse(options = {}) {
  const env = options.env ?? process.env;
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const write = options.write ?? (() => {});
  const identity = options.identity ?? (() => workspaceIdentity(workspaceRoot));
  const sleep =
    options.sleep ??
    ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const ledgerPath = env.KIBI_PROOF_UNIT_RESULTS;
  const waitMs = nonNegativeMs(
    env.KIBI_PROOF_UNIT_RESULTS_WAIT_MS,
    DEFAULT_UNIT_RESULTS_WAIT_MS,
  );
  const passedInRun = new Set();
  let ledgerFiles;

  async function readLedger() {
    if (typeof ledgerPath !== "string" || ledgerPath.trim() === "") return null;
    const resolved = path.resolve(workspaceRoot, ledgerPath);
    const deadline = Date.now() + waitMs;
    while (!existsSync(resolved)) {
      if (Date.now() >= deadline) {
        write(`[proof] unit results not reused: ${resolved} did not appear`);
        return null;
      }
      await sleep(UNIT_RESULTS_POLL_MS);
    }
    let ledger;
    try {
      ledger = JSON.parse(readFileSync(resolved, "utf8"));
    } catch {
      ledger = null;
    }
    const accepted = acceptUnitResultsLedger(ledger, identity());
    write(
      accepted.files === null
        ? `[proof] unit results not reused: ${accepted.reason}`
        : `[proof] unit results accepted for ${ledger.commit}: ${accepted.files.size} clean test file(s)`,
    );
    return accepted.files;
  }

  return {
    /** Where the evidence for every file comes from, or null to run the step. */
    async source(files) {
      if (files.every((file) => passedInRun.has(file))) return "this-run";
      ledgerFiles ??= readLedger();
      const ledger = await ledgerFiles;
      if (
        ledger !== null &&
        files.every((file) => passedInRun.has(file) || ledger.has(file))
      )
        return "unit-coverage";
      return null;
    },
    recordPassed(files) {
      for (const file of files) passedInRun.add(file);
    },
  };
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await fn(items[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/** Execute all selected contracts with complete attempt history. */
export async function runProofProducer(options = {}) {
  const env = options.env ?? process.env;
  const workspaceRoot =
    options.workspaceRoot ?? env.KIBI_PROOF_WORKSPACE ?? process.cwd();
  const requestedIds = options.testIds
    ? validateRequestedTestIds(options.testIds)
    : validateRequestedTestIds(JSON.parse(env.KIBI_PROOF_TEST_IDS ?? "null"));
  const entries = options.entries
    ? validateProofSteps(options.entries)
    : loadProofSteps(workspaceRoot);
  const selected = selectExactProofSteps(entries, requestedIds);
  const write = options.write ?? ((line) => console.log(line));
  const { pending, groups } = groupProofSteps(selected);
  const concurrency = Math.min(
    proofStepConcurrency(env),
    options.concurrency ?? Number.POSITIVE_INFINITY,
  );
  const reuse =
    options.reuse ?? createTestFileReuse({ env, workspaceRoot, write });
  for (const group of groups) {
    group.files = reusableBunTestFiles(group.command, workspaceRoot);
  }
  // Steps whose evidence may be reused go last, so the evidence they can
  // reuse (the unit results ledger, or earlier steps of this run) is ready.
  const ordered = [
    ...groups.filter((group) => group.files === null),
    // Wider steps first, so a later narrower step can reuse their pass.
    ...groups
      .filter((group) => group.files !== null)
      .sort((a, b) => b.files.length - a.files.length),
  ];

  const executed = await mapPool(ordered, concurrency, async (group) => {
    const shared =
      group.slots.length > 1 ? ` (shared by ${group.slots.length} tests)` : "";
    const first = group.slots[0];
    const label = `[proof] ${first.test_id} step ${first.step_index}: ${group.command.join(" ")}${shared}`;
    const source =
      group.files === null ? null : await reuse.source(group.files);
    if (source !== null) {
      write(`${label} reused (${source})`);
      return {
        outcome: "passed",
        exit_code: 0,
        signal: null,
        error: null,
        timed_out: false,
        duration_ms: 0,
        reused: source,
      };
    }
    write(label);
    const result = await runProofStep(group.command, {
      ...options,
      cwd: workspaceRoot,
      env,
    });
    if (group.files !== null && result.outcome === "passed") {
      reuse.recordPassed(group.files);
    }
    return result;
  });

  const resultByKey = new Map(
    ordered.map((group, index) => [group.key, executed[index]]),
  );
  const attempts = [];
  let failed = 0;
  for (const slot of pending) {
    const result = resultByKey.get(JSON.stringify(slot.command));
    const attempt = {
      test_id: slot.test_id,
      step_index: slot.step_index,
      attempt: 1,
      command: slot.command,
      ...result,
    };
    attempts.push(attempt);
    write(`[proof] attempt ${JSON.stringify(attempt)}`);
    if (result.outcome !== "passed") failed += 1;
  }

  if (attempts.length === 0) {
    throw new Error("run-proof-producer: selected contracts produced no steps");
  }
  const report = buildProofTestReport(selected, attempts);
  const reportPath = options.testReportPath ?? env.KIBI_PROOF_TEST_REPORT;
  if (typeof reportPath === "string" && reportPath.trim() !== "") {
    writeProofTestReport(reportPath, report);
  }
  if (failed > 0) {
    const failing = report.tests.filter((entry) => entry.outcome !== "passed");
    write(
      `[proof] ${failed} step(s) failed in ${failing.length} of ${selected.length} test(s): ${failing.map((entry) => entry.test_id).join(", ")}`,
    );
  } else write(`[proof] all steps passed for ${selected.length} test(s)`);
  const reusedSteps = executed.filter((result) => result.reused).length;
  if (reusedSteps > 0)
    write(
      `[proof] ${reusedSteps} of ${ordered.length} distinct step(s) reused test file results`,
    );
  return { exitCode: failed > 0 ? 1 : 0, selected, attempts, report };
}

/**
 * Per-test attribution for kibi prove (kibi.proof-test-report.v1): each
 * selected test with the outcome of its own declared steps. kibi prove then
 * fails only the tests whose steps failed instead of every test in the run.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export function buildProofTestReport(selected, attempts) {
  return {
    version: "kibi.proof-test-report.v1",
    tests: selected.map((entry) => {
      const steps = attempts
        .filter((attempt) => attempt.test_id === entry.test_id)
        .map((attempt) => ({
          step_index: attempt.step_index,
          command: attempt.command,
          outcome: attempt.outcome,
          exit_code: attempt.exit_code,
        }));
      const firstFailure = steps.find((step) => step.outcome !== "passed");
      return {
        test_id: entry.test_id,
        outcome:
          firstFailure === undefined
            ? "passed"
            : firstFailure.outcome === "timed_out"
              ? "timed_out"
              : "failed",
        steps,
      };
    }),
  };
}

/** Write the report atomically so kibi prove never reads a partial file. */
// implements REQ-kibi-fresh-verification-receipts-v2
export function writeProofTestReport(reportPath, report) {
  mkdirSync(path.dirname(reportPath), { recursive: true });
  const temporary = `${reportPath}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  renameSync(temporary, reportPath);
}

/** Reusable entry point for tests and the CLI wrapper. */
export async function main(options = {}) {
  return (await runProofProducer(options)).exitCode;
}

export async function runProofProducerIfEntrypoint(
  invokedPath = process.argv[1],
  moduleUrl = import.meta.url,
  start = main,
) {
  if (!invokedPath || path.resolve(invokedPath) !== fileURLToPath(moduleUrl)) {
    return;
  }
  try {
    process.exitCode = await start();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

await runProofProducerIfEntrypoint();
