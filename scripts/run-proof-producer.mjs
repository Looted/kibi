#!/usr/bin/env node

// Command-proof step runner for the repository self-proof integration.
// kibi prove launches this process with KIBI_PROOF_TEST_IDS and evaluates the
// aggregate exit code against each selected test's proof contract. Every
// declared step runs once; a passing retry must never hide a failed attempt.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
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
        env,
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

/** Execute all selected contracts sequentially with complete attempt history. */
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
  const attempts = [];
  const write = options.write ?? ((line) => console.log(line));
  let failed = 0;

  for (const entry of selected) {
    for (const [index, argv] of entry.steps.entries()) {
      const label = `${entry.test_id} step ${index + 1}: ${argv.join(" ")}`;
      write(`[proof] ${label}`);
      const result = await runProofStep(argv, {
        ...options,
        cwd: workspaceRoot,
        env,
      });
      const attempt = {
        test_id: entry.test_id,
        step_index: index + 1,
        attempt: 1,
        command: argv,
        ...result,
      };
      attempts.push(attempt);
      write(`[proof] attempt ${JSON.stringify(attempt)}`);
      if (result.outcome !== "passed") failed += 1;
    }
  }

  if (attempts.length === 0) {
    throw new Error("run-proof-producer: selected contracts produced no steps");
  }
  if (failed > 0) write(`[proof] ${failed} step(s) failed`);
  else write(`[proof] all steps passed for ${selected.length} test(s)`);
  return { exitCode: failed > 0 ? 1 : 0, selected, attempts };
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
