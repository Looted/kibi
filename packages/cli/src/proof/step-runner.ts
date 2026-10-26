/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * A shipped step runner for `command` proof integrations.
 *
 * A project declares each proof-bearing test's steps (argv arrays) in a
 * steps file; `kibi proof run-steps` is the integration's command. It runs
 * the steps of the tests kibi prove selected (KIBI_PROOF_TEST_IDS), each
 * distinct argv once, and writes a kibi.proof-test-report.v1 to
 * KIBI_PROOF_TEST_REPORT so every test keeps its own receipt: one failing
 * step fails only the tests that declare it.
 */

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  PROOF_TEST_REPORT_ENV,
  PROOF_TEST_REPORT_VERSION,
} from "./command-test-report.js";

/** Where `kibi proof run-steps` reads steps when no file is given. */
// implements REQ-kibi-fresh-verification-receipts-v2
export const DEFAULT_PROOF_STEPS_PATH = "proof/steps.json";

const DEFAULT_STEP_TIMEOUT_MS = 15 * 60_000;
const TERM_GRACE_MS = 2_000;

// implements REQ-kibi-fresh-verification-receipts-v2
export type ProofStepEntry = Readonly<{
  test_id: string;
  steps: readonly (readonly string[])[];
}>;

// implements REQ-kibi-fresh-verification-receipts-v2
export type ProofStepAttempt = Readonly<{
  outcome: "passed" | "failed" | "timed_out";
  exit_code: number | null;
}>;

function fail(message: string): never {
  throw new Error(`kibi proof run-steps: ${message}`);
}

/** Validate a steps file: unique test ids, each with non-empty argv steps. */
// implements REQ-kibi-fresh-verification-receipts-v2
export function validateProofSteps(value: unknown): ProofStepEntry[] {
  if (!Array.isArray(value) || value.length === 0)
    fail("the steps file must be a non-empty JSON array of {test_id, steps}");
  const ids = new Set<string>();
  return value.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry))
      fail(`entry ${index} must be an object`);
    const row = entry as Record<string, unknown>;
    const testId = typeof row.test_id === "string" ? row.test_id.trim() : "";
    if (testId === "") fail(`entry ${index} has an empty test_id`);
    if (ids.has(testId)) fail(`duplicate test_id ${JSON.stringify(testId)}`);
    ids.add(testId);
    if (!Array.isArray(row.steps) || row.steps.length === 0)
      fail(`${testId} must declare at least one step`);
    const steps = row.steps.map((argv, stepIndex) => {
      if (
        !Array.isArray(argv) ||
        argv.length === 0 ||
        argv.some((part) => typeof part !== "string") ||
        (argv[0] as string).trim() === ""
      )
        fail(`${testId} step ${stepIndex + 1} must be a non-empty string argv array`);
      return [...(argv as string[])];
    });
    return { test_id: testId, steps };
  });
}

/** The selected tests' entries, in request order; a missing id is an error. */
// implements REQ-kibi-fresh-verification-receipts-v2
export function selectProofSteps(
  entries: readonly ProofStepEntry[],
  testIds: readonly string[],
): ProofStepEntry[] {
  const byId = new Map(entries.map((entry) => [entry.test_id, entry]));
  const missing = testIds.filter((id) => !byId.has(id));
  if (missing.length > 0)
    fail(`no steps declared for ${missing.join(", ")}`);
  return testIds.map((id) => byId.get(id) as ProofStepEntry);
}

/** Build the per-test report from each step's attempt (keyed by argv). */
// implements REQ-kibi-fresh-verification-receipts-v2
export function buildStepReport(
  selected: readonly ProofStepEntry[],
  attempts: ReadonlyMap<string, ProofStepAttempt>,
): Readonly<{
  version: typeof PROOF_TEST_REPORT_VERSION;
  tests: readonly Record<string, unknown>[];
}> {
  return {
    version: PROOF_TEST_REPORT_VERSION,
    tests: selected.map((entry) => {
      const steps = entry.steps.map((argv, index) => {
        const attempt = attempts.get(JSON.stringify(argv)) ?? {
          outcome: "failed" as const,
          exit_code: null,
        };
        return {
          step_index: index + 1,
          command: [...argv],
          outcome: attempt.outcome,
          exit_code: attempt.exit_code,
        };
      });
      const failure = steps.find((step) => step.outcome !== "passed");
      return {
        test_id: entry.test_id,
        outcome: failure === undefined ? "passed" : failure.outcome,
        steps,
      };
    }),
  };
}

const running = new Set<ReturnType<typeof spawn>>();

function signalGroup(
  child: ReturnType<typeof spawn>,
  signal: NodeJS.Signals,
): void {
  const pid = child.pid;
  if (process.platform !== "win32" && pid !== undefined) {
    try {
      process.kill(-pid, signal);
      return;
    } catch {
      // The group may already be gone.
    }
  }
  try {
    child.kill(signal);
  } catch {
    // Already exited.
  }
}

/** Run one step once, in its own process group, with a timeout. */
function runStep(
  argv: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<ProofStepAttempt> {
  const [command, ...args] = argv as [string, ...string[]];
  return new Promise((resolve) => {
    let timedOut = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, {
        cwd,
        env,
        shell: false,
        stdio: "inherit",
        detached: process.platform !== "win32",
      });
    } catch {
      resolve({ outcome: "failed", exit_code: null });
      return;
    }
    running.add(child);
    const timer = setTimeout(() => {
      timedOut = true;
      signalGroup(child, "SIGTERM");
      setTimeout(() => signalGroup(child, "SIGKILL"), TERM_GRACE_MS).unref();
    }, timeoutMs);
    const done = (code: number | null) => {
      clearTimeout(timer);
      running.delete(child);
      resolve({
        outcome: timedOut ? "timed_out" : code === 0 ? "passed" : "failed",
        exit_code: code,
      });
    };
    child.once("error", () => done(null));
    child.once("close", (code) => done(code));
  });
}

/**
 * Run the selected tests' steps (each distinct argv once, in declaration
 * order), write the per-test report when KIBI_PROOF_TEST_REPORT names a
 * path, and return the exit code: 0 only when every step passed. A step
 * never sees the outer report path, so a nested kibi prove cannot overwrite
 * the report this run writes. SIGINT and SIGTERM stop the running step's
 * whole process group before the runner exits.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export async function runProofSteps(options: {
  workspaceRoot: string;
  stepsPath?: string;
  testIds?: readonly string[];
  env?: NodeJS.ProcessEnv;
  write?: (line: string) => void;
}): Promise<number> {
  const env = options.env ?? process.env;
  const write = options.write ?? ((line: string) => console.error(line));
  const stepsPath = path.resolve(
    options.workspaceRoot,
    options.stepsPath ?? DEFAULT_PROOF_STEPS_PATH,
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(stepsPath, "utf8"));
  } catch (error) {
    fail(
      `cannot read ${stepsPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const entries = validateProofSteps(parsed);
  let testIds = options.testIds;
  if (testIds === undefined) {
    const raw = env.KIBI_PROOF_TEST_IDS;
    testIds =
      raw === undefined || raw.trim() === ""
        ? entries.map((entry) => entry.test_id)
        : (JSON.parse(raw) as string[]);
  }
  const selected = selectProofSteps(entries, testIds);
  const timeoutMs = (() => {
    const value = Number(env.KIBI_PROOF_STEP_TIMEOUT_MS);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_STEP_TIMEOUT_MS;
  })();
  const stepEnv: NodeJS.ProcessEnv = { ...env };
  delete stepEnv[PROOF_TEST_REPORT_ENV];

  const stop = (signal: NodeJS.Signals) => {
    for (const child of running) signalGroup(child, signal);
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  const onInt = () => stop("SIGINT");
  const onTerm = () => stop("SIGTERM");
  process.once("SIGINT", onInt);
  process.once("SIGTERM", onTerm);
  const attempts = new Map<string, ProofStepAttempt>();
  try {
    for (const entry of selected)
      for (const [index, argv] of entry.steps.entries()) {
        const key = JSON.stringify(argv);
        if (attempts.has(key)) continue;
        write(`[proof] ${entry.test_id} step ${index + 1}: ${argv.join(" ")}`);
        attempts.set(
          key,
          await runStep(argv, options.workspaceRoot, stepEnv, timeoutMs),
        );
      }
  } finally {
    process.removeListener("SIGINT", onInt);
    process.removeListener("SIGTERM", onTerm);
  }
  const report = buildStepReport(selected, attempts);
  const reportPath = env[PROOF_TEST_REPORT_ENV];
  if (typeof reportPath === "string" && reportPath.trim() !== "") {
    mkdirSync(path.dirname(reportPath), { recursive: true });
    const temporary = `${reportPath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    renameSync(temporary, reportPath);
  }
  const failing = report.tests.filter((test) => test.outcome !== "passed");
  write(
    failing.length === 0
      ? `[proof] every step passed for ${selected.length} test(s)`
      : `[proof] ${failing.length} of ${selected.length} test(s) have a failing step: ${failing.map((test) => test.test_id).join(", ")}`,
  );
  return failing.length === 0 ? 0 : 1;
}
