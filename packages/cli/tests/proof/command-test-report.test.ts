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
  PROOF_TEST_REPORT_VERSION,
  attributeCommandRun,
  parseProofTestReport,
  proofTestReportPath,
} from "../../src/proof/command-test-report.js";

type Step = {
  step_index: number;
  command: string[];
  outcome: string;
  exit_code: number | null;
};

function step(
  index: number,
  outcome = "passed",
  exitCode: number | null = 0,
): Step {
  return {
    step_index: index,
    command: ["bun", "test", `step-${index}`],
    outcome,
    exit_code: exitCode,
  };
}

function report(
  tests: Array<{ test_id: string; outcome: string; steps: Step[] }>,
): Record<string, unknown> {
  return { version: PROOF_TEST_REPORT_VERSION, tests };
}

const SELECTED = ["TEST-a", "TEST-b", "TEST-c"];

describe("attributeCommandRun", () => {
  test("isolates a failing step to the test that owns it", () => {
    const attribution = attributeCommandRun({
      selectedTestIds: SELECTED,
      exitCode: 1,
      report: report([
        { test_id: "TEST-a", outcome: "passed", steps: [step(1), step(2)] },
        {
          test_id: "TEST-b",
          outcome: "failed",
          steps: [step(1), step(2, "failed", 7)],
        },
        { test_id: "TEST-c", outcome: "passed", steps: [step(1)] },
      ]),
    });
    expect(attribution).toEqual({
      attribution: "per_test",
      partitions: [
        {
          outcome: "passed",
          testIds: ["TEST-a", "TEST-c"],
          exitCode: 0,
          failedSteps: [],
        },
        {
          outcome: "failed",
          testIds: ["TEST-b"],
          exitCode: 7,
          failedSteps: [
            {
              testId: "TEST-b",
              stepIndex: 2,
              command: ["bun", "test", "step-2"],
              outcome: "failed",
              exitCode: 7,
            },
          ],
        },
      ],
      failedSteps: [
        {
          testId: "TEST-b",
          stepIndex: 2,
          command: ["bun", "test", "step-2"],
          outcome: "failed",
          exitCode: 7,
        },
      ],
    });
  });

  test("keeps each failing outcome in its own partition, in a fixed order", () => {
    const attribution = attributeCommandRun({
      selectedTestIds: ["TEST-c", "TEST-b", "TEST-a"],
      exitCode: 1,
      report: report([
        {
          test_id: "TEST-a",
          outcome: "timed_out",
          steps: [step(1, "timed_out", null)],
        },
        { test_id: "TEST-b", outcome: "failed", steps: [step(1, "failed", 2)] },
        { test_id: "TEST-c", outcome: "passed", steps: [step(1)] },
      ]),
    });
    expect(attribution.attribution).toBe("per_test");
    if (attribution.attribution !== "per_test") return;
    expect(
      attribution.partitions.map((partition) => [
        partition.outcome,
        partition.testIds,
        partition.exitCode,
      ]),
    ).toEqual([
      ["passed", ["TEST-c"], 0],
      ["failed", ["TEST-b"], 2],
      // A timed-out step has no exit code; the process exit code stands in.
      ["timed_out", ["TEST-a"], 1],
    ]);
  });

  test("keeps the whole run failed when there is no report", () => {
    const attribution = attributeCommandRun({
      selectedTestIds: SELECTED,
      exitCode: 2,
      report: undefined,
    });
    expect(attribution.attribution).toBe("aggregate");
    expect(attribution.failedSteps).toEqual([]);
    if (attribution.attribution === "aggregate") {
      expect(attribution.reason).toContain("exited 2 without a");
    }
  });

  test("fails closed when the process failed but the report blames no test", () => {
    const attribution = attributeCommandRun({
      selectedTestIds: ["TEST-a"],
      exitCode: 1,
      report: report([
        { test_id: "TEST-a", outcome: "passed", steps: [step(1)] },
      ]),
    });
    expect(attribution.attribution).toBe("aggregate");
    if (attribution.attribution === "aggregate") {
      expect(attribution.reason).toContain("attributes the failure to no test");
    }
  });

  test("fails closed on a report that does not cover the selection", () => {
    const attribution = attributeCommandRun({
      selectedTestIds: SELECTED,
      exitCode: 1,
      report: report([
        { test_id: "TEST-a", outcome: "passed", steps: [step(1)] },
        { test_id: "TEST-b", outcome: "failed", steps: [step(1, "failed", 1)] },
      ]),
    });
    expect(attribution.attribution).toBe("aggregate");
    if (attribution.attribution === "aggregate") {
      expect(attribution.reason).toContain("omits selected test(s): TEST-c");
    }
  });

  test("treats a fully passing report as the historical passing run", () => {
    const attribution = attributeCommandRun({
      selectedTestIds: ["TEST-a"],
      exitCode: 0,
      report: report([
        { test_id: "TEST-a", outcome: "passed", steps: [step(1)] },
      ]),
    });
    expect(attribution).toEqual({
      attribution: "aggregate",
      reason: "the integration passed",
      failedSteps: [],
    });
  });
});

describe("parseProofTestReport", () => {
  const cases: Array<[string, unknown, string]> = [
    ["a wrong version", { version: "v0", tests: [] }, "report version must be"],
    [
      "an unselected test",
      report([{ test_id: "TEST-x", outcome: "passed", steps: [step(1)] }]),
      "'TEST-x' was not selected",
    ],
    [
      "a duplicated test",
      report([
        { test_id: "TEST-a", outcome: "passed", steps: [step(1)] },
        { test_id: "TEST-a", outcome: "passed", steps: [step(1)] },
      ]),
      "'TEST-a' is reported twice",
    ],
    [
      "an unknown outcome",
      report([{ test_id: "TEST-a", outcome: "flaky", steps: [step(1)] }]),
      ".outcome must be one of",
    ],
    [
      "a test without steps",
      report([{ test_id: "TEST-a", outcome: "passed", steps: [] }]),
      ".steps must be a non-empty array",
    ],
    [
      "a pass claimed over a failing step",
      report([
        {
          test_id: "TEST-a",
          outcome: "passed",
          steps: [step(1), step(2, "failed", 1)],
        },
      ]),
      "reported passed but one of its steps did not pass",
    ],
    [
      "a pass claimed over a non-zero exit",
      report([
        { test_id: "TEST-a", outcome: "passed", steps: [step(1, "passed", 3)] },
      ]),
      "reported passed but one of its steps did not pass",
    ],
    [
      "a failure claimed when every step passed",
      report([{ test_id: "TEST-a", outcome: "failed", steps: [step(1)] }]),
      "reported failed but every one of its steps passed",
    ],
  ];

  for (const [label, value, message] of cases) {
    test(`rejects ${label}`, () => {
      expect(() => parseProofTestReport(value, ["TEST-a"])).toThrow(message);
    });
  }
});

describe("proofTestReportPath", () => {
  test("sits next to the run artifact", () => {
    expect(proofTestReportPath("/w/.kb/proof/runs/self-proof.json")).toBe(
      "/w/.kb/proof/runs/self-proof.tests.json",
    );
    expect(proofTestReportPath("/w/out/run")).toBe("/w/out/run.tests.json");
  });
});
