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
 * Per-test attribution for `command` proof integrations.
 *
 * A command integration is one process that runs the steps of every selected
 * test. Its exit code alone cannot say which test a failure belongs to, so a
 * single unrelated failing step used to fail every receipt of the run. The
 * command may instead write a kibi.proof-test-report.v1 file to the path in
 * KIBI_PROOF_TEST_REPORT, naming each selected test's own step outcomes. Kibi
 * then evaluates every test against the slice of the run its own steps
 * produced. Attribution fails closed: a missing, malformed or incomplete
 * report, or a failed process whose report blames no test, keeps the whole
 * run failed exactly as before.
 */

// implements REQ-kibi-fresh-verification-receipts-v2
export const PROOF_TEST_REPORT_VERSION = "kibi.proof-test-report.v1" as const;

/** Environment variable carrying the report path to a command integration. */
// implements REQ-kibi-fresh-verification-receipts-v2
export const PROOF_TEST_REPORT_ENV = "KIBI_PROOF_TEST_REPORT" as const;

// implements REQ-kibi-fresh-verification-receipts-v2
export const PROOF_TEST_REPORT_OUTCOMES = [
  "passed",
  "failed",
  "timed_out",
  "errored",
  "interrupted",
] as const;

// implements REQ-kibi-fresh-verification-receipts-v2
export type ProofTestReportOutcome =
  (typeof PROOF_TEST_REPORT_OUTCOMES)[number];

// implements REQ-kibi-fresh-verification-receipts-v2
export type ProofTestReportStep = Readonly<{
  step_index: number;
  command: readonly string[];
  outcome: string;
  exit_code: number | null;
}>;

// implements REQ-kibi-fresh-verification-receipts-v2
export type ProofTestReportEntry = Readonly<{
  test_id: string;
  outcome: ProofTestReportOutcome;
  steps: readonly ProofTestReportStep[];
}>;

/** One failing step, as the `kibi prove` run summary lists it. */
// implements REQ-kibi-fresh-verification-receipts-v2
export type FailedProofStep = Readonly<{
  testId: string;
  stepIndex: number;
  command: readonly string[];
  outcome: string;
  exitCode: number | null;
}>;

/** Tests whose own steps ended with the same outcome, evaluated together. */
// implements REQ-kibi-fresh-verification-receipts-v2
export type ProofRunPartition = Readonly<{
  outcome: ProofTestReportOutcome;
  testIds: readonly string[];
  exitCode: number;
  failedSteps: readonly FailedProofStep[];
}>;

// implements REQ-kibi-fresh-verification-receipts-v2
export type ProofRunAttribution =
  | Readonly<{
      attribution: "per_test";
      partitions: readonly ProofRunPartition[];
      failedSteps: readonly FailedProofStep[];
    }>
  | Readonly<{
      attribution: "aggregate";
      reason: string;
      failedSteps: readonly FailedProofStep[];
    }>;

/** The report path written next to an integration's run artifact. */
// implements REQ-kibi-fresh-verification-receipts-v2
export function proofTestReportPath(artifactPath: string): string {
  return artifactPath.endsWith(".json")
    ? `${artifactPath.slice(0, -".json".length)}.tests.json`
    : `${artifactPath}.tests.json`;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseStep(value: unknown, label: string): ProofTestReportStep {
  const row = record(value);
  if (!row) throw new Error(`${label} must be an object`);
  if (!Number.isSafeInteger(row.step_index) || Number(row.step_index) < 1)
    throw new Error(`${label}.step_index must be a positive integer`);
  if (
    !Array.isArray(row.command) ||
    row.command.length === 0 ||
    !row.command.every((part) => typeof part === "string")
  )
    throw new Error(`${label}.command must be a non-empty string argv array`);
  if (typeof row.outcome !== "string" || row.outcome.trim() === "")
    throw new Error(`${label}.outcome must be a non-empty string`);
  if (row.exit_code !== null && !Number.isSafeInteger(row.exit_code))
    throw new Error(`${label}.exit_code must be an integer or null`);
  return {
    step_index: Number(row.step_index),
    command: [...(row.command as string[])],
    outcome: row.outcome,
    exit_code: row.exit_code === null ? null : Number(row.exit_code),
  };
}

/**
 * Validate a kibi.proof-test-report.v1 against the exact selection. Every
 * selected test must appear once with at least one step, and a test may only
 * be reported `passed` when every one of its steps passed.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export function parseProofTestReport(
  value: unknown,
  selectedTestIds: readonly string[],
): ReadonlyMap<string, ProofTestReportEntry> {
  const report = record(value);
  if (!report) throw new Error("report must be an object");
  if (report.version !== PROOF_TEST_REPORT_VERSION)
    throw new Error(`report version must be ${PROOF_TEST_REPORT_VERSION}`);
  if (!Array.isArray(report.tests))
    throw new Error("report tests must be an array");
  const selected = new Set(selectedTestIds);
  const entries = new Map<string, ProofTestReportEntry>();
  report.tests.forEach((raw, index) => {
    const label = `tests[${index}]`;
    const row = record(raw);
    if (!row) throw new Error(`${label} must be an object`);
    const testId = typeof row.test_id === "string" ? row.test_id.trim() : "";
    if (!selected.has(testId))
      throw new Error(`${label}.test_id '${testId}' was not selected`);
    if (entries.has(testId))
      throw new Error(`${label}.test_id '${testId}' is reported twice`);
    if (
      !(PROOF_TEST_REPORT_OUTCOMES as readonly string[]).includes(
        String(row.outcome),
      )
    )
      throw new Error(
        `${label}.outcome must be one of ${PROOF_TEST_REPORT_OUTCOMES.join(", ")}`,
      );
    if (!Array.isArray(row.steps) || row.steps.length === 0)
      throw new Error(`${label}.steps must be a non-empty array`);
    const steps = row.steps.map((step, stepIndex) =>
      parseStep(step, `${label}.steps[${stepIndex}]`),
    );
    const outcome = row.outcome as ProofTestReportOutcome;
    if (
      outcome === "passed" &&
      steps.some((step) => step.outcome !== "passed" || step.exit_code !== 0)
    )
      throw new Error(
        `${label} is reported passed but one of its steps did not pass`,
      );
    if (
      outcome !== "passed" &&
      steps.every((step) => step.outcome === "passed")
    )
      throw new Error(
        `${label} is reported ${outcome} but every one of its steps passed`,
      );
    entries.set(testId, { test_id: testId, outcome, steps });
  });
  const missing = selectedTestIds.filter((testId) => !entries.has(testId));
  if (missing.length > 0)
    throw new Error(`report omits selected test(s): ${missing.join(", ")}`);
  return entries;
}

function failedStepsOf(
  entries: Iterable<ProofTestReportEntry>,
): FailedProofStep[] {
  const failed: FailedProofStep[] = [];
  for (const entry of entries) {
    for (const step of entry.steps) {
      if (step.outcome === "passed") continue;
      failed.push({
        testId: entry.test_id,
        stepIndex: step.step_index,
        command: step.command,
        outcome: step.outcome,
        exitCode: step.exit_code,
      });
    }
  }
  return failed;
}

/**
 * Decide how a finished command run is attributed. `per_test` partitions the
 * selected tests by their own outcome; `aggregate` keeps the historical
 * whole-run semantics (and is always the answer for a passing process
 * without a report, so a fully green run stays byte-identical).
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export function attributeCommandRun(input: {
  readonly selectedTestIds: readonly string[];
  readonly exitCode: number;
  /** Parsed report JSON, or undefined when the command wrote none. */
  readonly report: unknown;
}): ProofRunAttribution {
  const { selectedTestIds, exitCode, report } = input;
  if (report === undefined) {
    return {
      attribution: "aggregate",
      reason:
        exitCode === 0
          ? "the integration passed"
          : `the integration exited ${exitCode} without a ${PROOF_TEST_REPORT_VERSION}, so the failure cannot be attributed to a test`,
      failedSteps: [],
    };
  }
  let entries: ReadonlyMap<string, ProofTestReportEntry>;
  try {
    entries = parseProofTestReport(report, selectedTestIds);
  } catch (error) {
    return {
      attribution: "aggregate",
      reason: `the ${PROOF_TEST_REPORT_VERSION} was rejected (${error instanceof Error ? error.message : String(error)}), so the run is evaluated as one unit`,
      failedSteps: [],
    };
  }
  const failedSteps = failedStepsOf(entries.values());
  const failing = [...entries.values()].filter(
    (entry) => entry.outcome !== "passed",
  );
  if (exitCode !== 0 && failing.length === 0) {
    return {
      attribution: "aggregate",
      reason: `the integration exited ${exitCode} but its ${PROOF_TEST_REPORT_VERSION} attributes the failure to no test`,
      failedSteps,
    };
  }
  if (failing.length === 0) {
    return {
      attribution: "aggregate",
      reason: "the integration passed",
      failedSteps,
    };
  }
  const groups = new Map<ProofTestReportOutcome, ProofTestReportEntry[]>();
  for (const testId of selectedTestIds) {
    const entry = entries.get(testId) as ProofTestReportEntry;
    const group = groups.get(entry.outcome) ?? [];
    group.push(entry);
    groups.set(entry.outcome, group);
  }
  const partitions: ProofRunPartition[] = [];
  for (const outcome of PROOF_TEST_REPORT_OUTCOMES) {
    const group = groups.get(outcome);
    if (!group) continue;
    const groupFailedSteps = failedStepsOf(group);
    const firstNonZero = groupFailedSteps.find(
      (step) => step.exitCode !== null && step.exitCode !== 0,
    )?.exitCode;
    partitions.push({
      outcome,
      testIds: group.map((entry) => entry.test_id),
      exitCode: outcome === "passed" ? 0 : (firstNonZero ?? (exitCode || 1)),
      failedSteps: groupFailedSteps,
    });
  }
  return { attribution: "per_test", partitions, failedSteps };
}
