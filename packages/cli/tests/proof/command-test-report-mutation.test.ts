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

import { describe, expect, test } from "bun:test";
import {
  PROOF_TEST_REPORT_ENV,
  PROOF_TEST_REPORT_OUTCOMES,
  PROOF_TEST_REPORT_VERSION,
  attributeCommandRun,
  parseProofTestReport,
  proofTestReportPath,
} from "../../src/proof/command-test-report.js";

type Row = Record<string, unknown>;

const ok = (index = 1): Row => ({
  step_index: index,
  command: ["run", String(index)],
  outcome: "passed",
  exit_code: 0,
});

function wrap(tests: unknown): Row {
  return { version: PROOF_TEST_REPORT_VERSION, tests };
}

function single(steps: unknown, outcome = "passed", testId: unknown = "T-a") {
  return wrap([{ test_id: testId, outcome, steps }]);
}

function rejection(value: unknown, selected: readonly string[] = ["T-a"]) {
  try {
    parseProofTestReport(value, selected);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected a rejection");
}

describe("proof test report constants", () => {
  test("names the version, environment variable and outcomes", () => {
    expect(PROOF_TEST_REPORT_VERSION).toBe("kibi.proof-test-report.v1");
    expect(PROOF_TEST_REPORT_ENV).toBe("KIBI_PROOF_TEST_REPORT");
    expect(PROOF_TEST_REPORT_OUTCOMES).toStrictEqual([
      "passed",
      "failed",
      "timed_out",
      "errored",
      "interrupted",
    ]);
  });

  test("derives the report path from the artifact path", () => {
    expect(proofTestReportPath("a/run.json")).toBe("a/run.tests.json");
    expect(proofTestReportPath("a/run.jsonl")).toBe("a/run.jsonl.tests.json");
    expect(proofTestReportPath("dir/self-proof.json")).toBe(
      "dir/self-proof.tests.json",
    );
  });
});

describe("parseProofTestReport rejections", () => {
  test("rejects non-object reports", () => {
    for (const value of [null, [], "x", 3, undefined]) {
      expect(rejection(value)).toBe("report must be an object");
    }
  });

  test("rejects a wrong version and missing tests", () => {
    expect(rejection({ version: "v0", tests: [] })).toBe(
      "report version must be kibi.proof-test-report.v1",
    );
    expect(rejection({ version: PROOF_TEST_REPORT_VERSION })).toBe(
      "report tests must be an array",
    );
    expect(rejection(wrap({}))).toBe("report tests must be an array");
  });

  test("rejects non-object test rows", () => {
    expect(rejection(wrap([null]))).toBe("tests[0] must be an object");
    expect(rejection(wrap([[]]))).toBe("tests[0] must be an object");
    expect(
      rejection(
        wrap([{ test_id: "T-a", outcome: "passed", steps: [ok()] }, 5]),
      ),
    ).toBe("tests[1] must be an object");
  });

  test("trims test ids and treats non-strings as empty", () => {
    expect(rejection(single([ok()], "passed", 5))).toBe(
      "tests[0].test_id '' was not selected",
    );
    expect(rejection(single([ok()], "passed", " T-b "))).toBe(
      "tests[0].test_id 'T-b' was not selected",
    );
    const entries = parseProofTestReport(single([ok()], "passed", " T-a "), [
      "T-a",
    ]);
    expect([...entries.keys()]).toStrictEqual(["T-a"]);
    expect([
      ...parseProofTestReport(single([ok()], "passed", 5), [""]).keys(),
    ]).toStrictEqual([""]);
  });

  test("names every allowed outcome", () => {
    expect(rejection(single([ok()], "flaky"))).toBe(
      "tests[0].outcome must be one of passed, failed, timed_out, errored, interrupted",
    );
    expect(rejection(single(undefined))).toBe(
      "tests[0].steps must be a non-empty array",
    );
  });

  test("rejects malformed steps with their full label", () => {
    const step = (patch: Row) => single([ok(), { ...ok(2), ...patch }]);
    expect(rejection(single([ok(), null]))).toBe(
      "tests[0].steps[1] must be an object",
    );
    expect(rejection(single([[]]))).toBe("tests[0].steps[0] must be an object");
    for (const index of [0, -1, 1.5, "2", null]) {
      expect(rejection(step({ step_index: index }))).toBe(
        "tests[0].steps[1].step_index must be a positive integer",
      );
    }
    for (const command of ["run", [], [1], ["run", 1], undefined]) {
      expect(rejection(step({ command }))).toBe(
        "tests[0].steps[1].command must be a non-empty string argv array",
      );
    }
    for (const outcome of [5, "", "   ", undefined]) {
      expect(rejection(step({ outcome }))).toBe(
        "tests[0].steps[1].outcome must be a non-empty string",
      );
    }
    for (const exit_code of [1.5, "0", undefined]) {
      expect(rejection(step({ exit_code }))).toBe(
        "tests[0].steps[1].exit_code must be an integer or null",
      );
    }
  });

  test("rejects a pass over a step that did not pass", () => {
    const message =
      "tests[0] is reported passed but one of its steps did not pass";
    expect(rejection(single([ok(), { ...ok(2), exit_code: 1 }]))).toBe(message);
    expect(rejection(single([{ ...ok(), outcome: "failed" }]))).toBe(message);
    expect(rejection(single([{ ...ok(), exit_code: null }]))).toBe(message);
    expect(rejection(single([ok()], "errored"))).toBe(
      "tests[0] is reported errored but every one of its steps passed",
    );
  });

  test("rejects duplicates and empty step lists", () => {
    const row = { test_id: "T-a", outcome: "passed", steps: [ok()] };
    expect(rejection(wrap([row, row]))).toBe(
      "tests[1].test_id 'T-a' is reported twice",
    );
    expect(rejection(single([]))).toBe(
      "tests[0].steps must be a non-empty array",
    );
    expect(rejection(single([], "failed"))).toBe(
      "tests[0].steps must be a non-empty array",
    );
  });

  test("lists every omitted test", () => {
    expect(rejection(wrap([]), ["T-a", "T-b"])).toBe(
      "report omits selected test(s): T-a, T-b",
    );
  });

  test("returns normalised entries", () => {
    const entries = parseProofTestReport(
      single(
        [
          {
            step_index: 1,
            command: ["a", "b"],
            outcome: "failed",
            exit_code: null,
          },
          { step_index: 2, command: ["c"], outcome: "passed", exit_code: 0 },
        ],
        "failed",
      ),
      ["T-a"],
    );
    expect(entries.get("T-a")).toStrictEqual({
      test_id: "T-a",
      outcome: "failed",
      steps: [
        {
          step_index: 1,
          command: ["a", "b"],
          outcome: "failed",
          exit_code: null,
        },
        { step_index: 2, command: ["c"], outcome: "passed", exit_code: 0 },
      ],
    });
  });
});

describe("attributeCommandRun reasons and exit codes", () => {
  test("explains aggregate runs without a report", () => {
    expect(
      attributeCommandRun({
        selectedTestIds: ["T-a"],
        exitCode: 0,
        report: undefined,
      }),
    ).toStrictEqual({
      attribution: "aggregate",
      reason: "the integration passed",
      failedSteps: [],
    });
    expect(
      attributeCommandRun({
        selectedTestIds: ["T-a"],
        exitCode: 3,
        report: undefined,
      }),
    ).toStrictEqual({
      attribution: "aggregate",
      reason:
        "the integration exited 3 without a kibi.proof-test-report.v1, so the failure cannot be attributed to a test",
      failedSteps: [],
    });
  });

  test("explains a rejected report", () => {
    expect(
      attributeCommandRun({
        selectedTestIds: ["T-a"],
        exitCode: 1,
        report: null,
      }),
    ).toStrictEqual({
      attribution: "aggregate",
      reason:
        "the kibi.proof-test-report.v1 was rejected (report must be an object), so the run is evaluated as one unit",
      failedSteps: [],
    });
  });

  test("fails closed when the report blames no test", () => {
    expect(
      attributeCommandRun({
        selectedTestIds: ["T-a"],
        exitCode: 4,
        report: single([ok()]),
      }),
    ).toStrictEqual({
      attribution: "aggregate",
      reason:
        "the integration exited 4 but its kibi.proof-test-report.v1 attributes the failure to no test",
      failedSteps: [],
    });
  });

  test("attributes a fully passing run per test", () => {
    expect(
      attributeCommandRun({
        selectedTestIds: ["T-a"],
        exitCode: 0,
        report: single([ok()]),
      }),
    ).toStrictEqual({
      attribution: "per_test",
      partitions: [
        { outcome: "passed", testIds: ["T-a"], exitCode: 0, failedSteps: [] },
      ],
      failedSteps: [],
    });
  });

  function partitionExit(steps: Row[], exitCode: number) {
    const attribution = attributeCommandRun({
      selectedTestIds: ["T-a"],
      exitCode,
      report: single(steps, "failed"),
    });
    if (attribution.attribution !== "per_test") throw new Error("aggregate");
    return attribution.partitions[0]?.exitCode;
  }

  test("uses the first non-zero step exit code", () => {
    const failed = (index: number, exit: number | null) => ({
      ...ok(index),
      outcome: "failed",
      exit_code: exit,
    });
    expect(partitionExit([failed(1, null), failed(2, 4)], 9)).toBe(4);
    expect(partitionExit([failed(1, 0), failed(2, 5)], 9)).toBe(5);
    expect(partitionExit([failed(1, null)], 7)).toBe(7);
    expect(partitionExit([failed(1, null)], 0)).toBe(1);
    expect(partitionExit([failed(1, 0)], 0)).toBe(1);
  });

  test("lists failed steps with null exit codes", () => {
    const attribution = attributeCommandRun({
      selectedTestIds: ["T-a"],
      exitCode: 1,
      report: single(
        [{ ...ok(), outcome: "timed_out", exit_code: null }],
        "timed_out",
      ),
    });
    expect(attribution).toStrictEqual({
      attribution: "per_test",
      partitions: [
        {
          outcome: "timed_out",
          testIds: ["T-a"],
          exitCode: 1,
          failedSteps: [
            {
              testId: "T-a",
              stepIndex: 1,
              command: ["run", "1"],
              outcome: "timed_out",
              exitCode: null,
            },
          ],
        },
      ],
      failedSteps: [
        {
          testId: "T-a",
          stepIndex: 1,
          command: ["run", "1"],
          outcome: "timed_out",
          exitCode: null,
        },
      ],
    });
  });
});
