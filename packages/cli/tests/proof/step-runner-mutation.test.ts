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

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DEFAULT_PROOF_STEPS_PATH,
  type ProofStepAttempt,
  buildStepReport,
  runProofSteps,
  selectProofSteps,
  validateProofSteps,
} from "../../src/proof/step-runner.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(steps: unknown, file = "steps.json"): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-step-mutation-"));
  roots.push(root);
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), JSON.stringify(steps));
  return root;
}

const baseEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  PATH: process.env.PATH,
  ...extra,
});

function rejection(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected a rejection");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("validateProofSteps", () => {
  const prefix = "kibi proof run-steps: ";

  test("rejects anything but a non-empty array", () => {
    for (const value of [[], {}, null, "x"]) {
      expect(rejection(() => validateProofSteps(value))).toBe(
        `${prefix}the steps file must be a non-empty JSON array of {test_id, steps}`,
      );
    }
  });

  test("rejects non-object entries", () => {
    for (const entry of [null, 3, "x", []]) {
      expect(
        rejection(() =>
          validateProofSteps([{ test_id: "T-a", steps: [["x"]] }, entry]),
        ),
      ).toBe(`${prefix}entry 1 must be an object`);
    }
  });

  test("rejects empty and non-string test ids", () => {
    for (const test_id of ["", "  ", 5, undefined]) {
      expect(
        rejection(() => validateProofSteps([{ test_id, steps: [["x"]] }])),
      ).toBe(`${prefix}entry 0 has an empty test_id`);
    }
  });

  test("rejects duplicate ids after trimming", () => {
    expect(
      rejection(() =>
        validateProofSteps([
          { test_id: "T-a", steps: [["x"]] },
          { test_id: " T-a ", steps: [["y"]] },
        ]),
      ),
    ).toBe(`${prefix}duplicate test_id "T-a"`);
  });

  test("rejects missing or empty step lists", () => {
    for (const steps of [undefined, [], "x"]) {
      expect(
        rejection(() => validateProofSteps([{ test_id: "T-a", steps }])),
      ).toBe(`${prefix}T-a must declare at least one step`);
    }
  });

  test("rejects malformed argv arrays with a one-based step number", () => {
    for (const argv of ["x", [], ["x", 1], [1, "x"], ["  ", "y"], [""]]) {
      expect(
        rejection(() =>
          validateProofSteps([{ test_id: "T-a", steps: [["ok"], argv] }]),
        ),
      ).toBe(`${prefix}T-a step 2 must be a non-empty string argv array`);
    }
  });

  test("returns trimmed ids and copied argv", () => {
    const argv = ["bun", " test "];
    const entries = validateProofSteps([
      { test_id: " T-a ", steps: [argv] },
      { test_id: "T-b", steps: [["x"], ["y", ""]] },
    ]);
    expect(entries).toStrictEqual([
      { test_id: "T-a", steps: [["bun", " test "]] },
      { test_id: "T-b", steps: [["x"], ["y", ""]] },
    ]);
    expect(entries[0]?.steps[0]).not.toBe(argv);
  });
});

describe("selectProofSteps", () => {
  const entries = validateProofSteps([
    { test_id: "T-a", steps: [["a"]] },
    { test_id: "T-b", steps: [["b"]] },
  ]);

  test("returns entries in request order", () => {
    expect(selectProofSteps(entries, ["T-b", "T-a"])).toStrictEqual([
      { test_id: "T-b", steps: [["b"]] },
      { test_id: "T-a", steps: [["a"]] },
    ]);
    expect(selectProofSteps(entries, [])).toStrictEqual([]);
  });

  test("names every missing id", () => {
    expect(
      rejection(() => selectProofSteps(entries, ["T-x", "T-a", "T-y"])),
    ).toBe("kibi proof run-steps: no steps declared for T-x, T-y");
  });
});

describe("buildStepReport", () => {
  test("marks unattempted steps failed and uses the first failing outcome", () => {
    const attempts = new Map<string, ProofStepAttempt>([
      [JSON.stringify(["ok"]), { outcome: "passed", exit_code: 0 }],
      [JSON.stringify(["slow"]), { outcome: "timed_out", exit_code: null }],
      [JSON.stringify(["bad"]), { outcome: "failed", exit_code: 2 }],
    ]);
    const report = buildStepReport(
      [
        { test_id: "T-a", steps: [["ok"]] },
        { test_id: "T-b", steps: [["ok"], ["slow"], ["bad"]] },
        { test_id: "T-c", steps: [["missing"]] },
      ],
      attempts,
    );
    expect(report).toStrictEqual({
      version: "kibi.proof-test-report.v1",
      tests: [
        {
          test_id: "T-a",
          outcome: "passed",
          steps: [
            { step_index: 1, command: ["ok"], outcome: "passed", exit_code: 0 },
          ],
        },
        {
          test_id: "T-b",
          outcome: "timed_out",
          steps: [
            { step_index: 1, command: ["ok"], outcome: "passed", exit_code: 0 },
            {
              step_index: 2,
              command: ["slow"],
              outcome: "timed_out",
              exit_code: null,
            },
            {
              step_index: 3,
              command: ["bad"],
              outcome: "failed",
              exit_code: 2,
            },
          ],
        },
        {
          test_id: "T-c",
          outcome: "failed",
          steps: [
            {
              step_index: 1,
              command: ["missing"],
              outcome: "failed",
              exit_code: null,
            },
          ],
        },
      ],
    });
  });
});

describe("runProofSteps", () => {
  test("reads the default steps file and logs through console.error", async () => {
    expect(DEFAULT_PROOF_STEPS_PATH).toBe("proof/steps.json");
    const root = workspace(
      [{ test_id: "T-a", steps: [["sh", "-c", "exit 0"]] }],
      DEFAULT_PROOF_STEPS_PATH,
    );
    const lines: unknown[] = [];
    const spy = spyOn(console, "error").mockImplementation((line: unknown) => {
      lines.push(line);
    });
    restores.push(() => spy.mockRestore());
    const saved = process.env.KIBI_PROOF_TEST_IDS;
    const savedReport = process.env.KIBI_PROOF_TEST_REPORT;
    delete process.env.KIBI_PROOF_TEST_IDS;
    delete process.env.KIBI_PROOF_TEST_REPORT;
    restores.push(() => {
      if (saved !== undefined) process.env.KIBI_PROOF_TEST_IDS = saved;
      if (savedReport !== undefined)
        process.env.KIBI_PROOF_TEST_REPORT = savedReport;
    });
    expect(await runProofSteps({ workspaceRoot: root })).toBe(0);
    expect(lines).toStrictEqual([
      "[proof] T-a step 1: sh -c exit 0",
      "[proof] every step passed for 1 test(s)",
    ]);
  });

  test("reports an unreadable or malformed steps file", async () => {
    const root = workspace([]);
    const missing = path.join(root, "nope.json");
    await expect(
      runProofSteps({
        workspaceRoot: root,
        stepsPath: "nope.json",
        env: baseEnv(),
      }),
    ).rejects.toThrow(
      `kibi proof run-steps: cannot read ${missing}: ENOENT: no such file or directory, open '${missing}'`,
    );
    writeFileSync(path.join(root, "bad.json"), "{");
    const error = await runProofSteps({
      workspaceRoot: root,
      stepsPath: "bad.json",
      env: baseEnv(),
    }).catch((caught: Error) => caught.message);
    expect(
      String(error).startsWith(
        `kibi proof run-steps: cannot read ${path.join(root, "bad.json")}: `,
      ),
    ).toBe(true);
    expect(String(error).length).toBeGreaterThan(
      `kibi proof run-steps: cannot read ${path.join(root, "bad.json")}: `
        .length,
    );
  });

  test("selects tests from KIBI_PROOF_TEST_IDS and runs shared argv once", async () => {
    const root = workspace([
      { test_id: "T-a", steps: [["sh", "-c", "echo a >> runs.log"]] },
      {
        test_id: "T-b",
        steps: [
          ["sh", "-c", "echo a >> runs.log"],
          ["sh", "-c", "echo b >> runs.log; exit 3"],
        ],
      },
      { test_id: "T-c", steps: [["sh", "-c", "echo c >> runs.log"]] },
    ]);
    const reportPath = path.join(root, "out", "deep", "report.json");
    const lines: string[] = [];
    const code = await runProofSteps({
      workspaceRoot: root,
      stepsPath: "steps.json",
      env: baseEnv({
        KIBI_PROOF_TEST_IDS: JSON.stringify(["T-b", "T-a"]),
        KIBI_PROOF_TEST_REPORT: reportPath,
      }),
      write: (line) => lines.push(line),
    });
    expect(code).toBe(1);
    expect(readFileSync(path.join(root, "runs.log"), "utf8")).toBe("a\nb\n");
    expect(lines).toStrictEqual([
      "[proof] T-b step 1: sh -c echo a >> runs.log",
      "[proof] T-b step 2: sh -c echo b >> runs.log; exit 3",
      "[proof] 1 of 2 test(s) have a failing step: T-b",
    ]);
    const report = {
      version: "kibi.proof-test-report.v1",
      tests: [
        {
          test_id: "T-b",
          outcome: "failed",
          steps: [
            {
              step_index: 1,
              command: ["sh", "-c", "echo a >> runs.log"],
              outcome: "passed",
              exit_code: 0,
            },
            {
              step_index: 2,
              command: ["sh", "-c", "echo b >> runs.log; exit 3"],
              outcome: "failed",
              exit_code: 3,
            },
          ],
        },
        {
          test_id: "T-a",
          outcome: "passed",
          steps: [
            {
              step_index: 1,
              command: ["sh", "-c", "echo a >> runs.log"],
              outcome: "passed",
              exit_code: 0,
            },
          ],
        },
      ],
    };
    expect(readFileSync(reportPath, "utf8")).toBe(
      `${JSON.stringify(report, null, 2)}\n`,
    );
    expect(readdirSync(path.dirname(reportPath))).toStrictEqual([
      "report.json",
    ]);
  });

  test.if(process.platform === "linux")(
    "a step writes to the runner's own output",
    async () => {
      const root = workspace([
        {
          test_id: "T-a",
          steps: [["sh", "-c", "readlink /proc/self/fd/2 > out.txt"]],
        },
      ]);
      expect(
        await runProofSteps({
          workspaceRoot: root,
          stepsPath: "steps.json",
          env: baseEnv({}),
          write: () => {},
        }),
      ).toBe(0);
      expect(readFileSync(path.join(root, "out.txt"), "utf8").trim()).toBe(
        readlinkSync("/proc/self/fd/2"),
      );
    },
  );

  test("lists every failing test", async () => {
    const root = workspace([
      { test_id: "T-a", steps: [["sh", "-c", "exit 1"]] },
      { test_id: "T-b", steps: [["sh", "-c", "exit 2"]] },
    ]);
    const lines: string[] = [];
    expect(
      await runProofSteps({
        workspaceRoot: root,
        stepsPath: "steps.json",
        env: baseEnv({ KIBI_PROOF_TEST_IDS: "  " }),
        write: (line) => lines.push(line),
      }),
    ).toBe(1);
    expect(lines.at(-1)).toBe(
      "[proof] 2 of 2 test(s) have a failing step: T-a, T-b",
    );
  });

  test("explicit test ids win over the environment", async () => {
    const root = workspace([
      { test_id: "T-a", steps: [["sh", "-c", "exit 0"]] },
      { test_id: "T-b", steps: [["sh", "-c", "exit 1"]] },
    ]);
    const lines: string[] = [];
    expect(
      await runProofSteps({
        workspaceRoot: root,
        stepsPath: "steps.json",
        testIds: ["T-a"],
        env: baseEnv({ KIBI_PROOF_TEST_IDS: JSON.stringify(["T-b"]) }),
        write: (line) => lines.push(line),
      }),
    ).toBe(0);
    expect(lines).toStrictEqual([
      "[proof] T-a step 1: sh -c exit 0",
      "[proof] every step passed for 1 test(s)",
    ]);
  });

  test("records a step that cannot be spawned at all as failed", async () => {
    const root = workspace([{ test_id: "T-a", steps: [["sh\u0000x"]] }]);
    const reportPath = path.join(root, "r.json");
    expect(
      await runProofSteps({
        workspaceRoot: root,
        stepsPath: "steps.json",
        env: baseEnv({ KIBI_PROOF_TEST_REPORT: reportPath }),
        write: () => {},
      }),
    ).toBe(1);
    expect(
      JSON.parse(readFileSync(reportPath, "utf8")).tests[0].steps[0],
    ).toStrictEqual({
      step_index: 1,
      command: ["sh\u0000x"],
      outcome: "failed",
      exit_code: null,
    });
  });

  test("clears the timer and forgets a finished step", async () => {
    const root = workspace([
      { test_id: "T-a", steps: [["sh", "-c", "exit 0"]] },
      { test_id: "T-b", steps: [["sh", "-c", "sleep 5"]] },
    ]);
    const kill = spyOn(process, "kill");
    restores.push(() => kill.mockRestore());
    const exit = spyOn(process, "exit").mockImplementation(
      (() => {}) as typeof process.exit,
    );
    restores.push(() => exit.mockRestore());
    expect(
      await runProofSteps({
        workspaceRoot: root,
        stepsPath: "steps.json",
        testIds: ["T-a"],
        env: baseEnv({ KIBI_PROOF_STEP_TIMEOUT_MS: "100" }),
        write: () => {},
      }),
    ).toBe(0);
    await sleep(250);
    expect(kill).not.toHaveBeenCalled();
    const run = runProofSteps({
      workspaceRoot: root,
      stepsPath: "steps.json",
      testIds: ["T-b"],
      env: baseEnv(),
      write: () => {},
    });
    await sleep(150);
    process.emit("SIGTERM", "SIGTERM");
    expect(await run).toBe(1);
    expect(kill).toHaveBeenCalledTimes(1);
  });

  test("hides the outer report path from steps and skips a blank report path", async () => {
    const root = workspace([
      {
        test_id: "T-a",
        steps: [
          [
            "sh",
            "-c",
            'printf "%s|%s" "${KIBI_PROOF_TEST_REPORT-unset}" "$KEEP" > env.txt',
          ],
        ],
      },
    ]);
    // A blank path would resolve against the working directory.
    const cwd = process.cwd();
    process.chdir(root);
    restores.push(() => process.chdir(cwd));
    expect(
      await runProofSteps({
        workspaceRoot: root,
        stepsPath: "steps.json",
        env: baseEnv({ KIBI_PROOF_TEST_REPORT: "   ", KEEP: "kept" }),
        write: () => {},
      }),
    ).toBe(0);
    expect(readFileSync(path.join(root, "env.txt"), "utf8")).toBe("unset|kept");
    expect(readdirSync(root).sort()).toStrictEqual(["env.txt", "steps.json"]);
  });

  test("records a step whose command cannot start as failed", async () => {
    const root = workspace([
      { test_id: "T-a", steps: [["kibi-no-such-command-xyz"]] },
    ]);
    const reportPath = path.join(root, "r.json");
    expect(
      await runProofSteps({
        workspaceRoot: root,
        stepsPath: "steps.json",
        env: baseEnv({ KIBI_PROOF_TEST_REPORT: reportPath }),
        write: () => {},
      }),
    ).toBe(1);
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(report.tests[0].steps[0]).toStrictEqual({
      step_index: 1,
      command: ["kibi-no-such-command-xyz"],
      outcome: "failed",
      exit_code: null,
    });
  });

  async function timedStep(timeout: string | undefined, script = "sleep 0.4") {
    const root = workspace([{ test_id: "T-a", steps: [["sh", "-c", script]] }]);
    const reportPath = path.join(root, "r.json");
    const env = baseEnv({ KIBI_PROOF_TEST_REPORT: reportPath });
    if (timeout !== undefined) env.KIBI_PROOF_STEP_TIMEOUT_MS = timeout;
    const code = await runProofSteps({
      workspaceRoot: root,
      stepsPath: "steps.json",
      env,
      write: () => {},
    });
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    return { code, step: report.tests[0].steps[0], root };
  }

  test("ignores a non-positive or non-finite step timeout", async () => {
    for (const timeout of ["0", "-5", "Infinity", "abc"]) {
      const { code, step } = await timedStep(timeout, "sleep 0.05");
      expect([timeout, code, step.outcome]).toStrictEqual([
        timeout,
        0,
        "passed",
      ]);
    }
  });

  test("times out a slow step with SIGTERM", async () => {
    const { code, step } = await timedStep("50", "sleep 5");
    expect(code).toBe(1);
    expect(step.outcome).toBe("timed_out");
    expect(step.exit_code).toBe(null);
  });

  test("kills the whole process group of a timed-out step", async () => {
    const { step, root } = await timedStep(
      "100",
      "(sleep 0.6; touch orphan) & sleep 5",
    );
    expect(step.outcome).toBe("timed_out");
    await sleep(900);
    expect(existsSync(path.join(root, "orphan"))).toBe(false);
  });

  test("escalates to SIGKILL when a step ignores SIGTERM", async () => {
    const started = Date.now();
    const { step } = await timedStep("50", "trap '' TERM; sleep 4");
    expect(step.outcome).toBe("timed_out");
    expect(Date.now() - started).toBeLessThan(3_500);
  }, 10_000);

  test("signals only the child when process groups are unavailable", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: "win32" });
    restores.push(() => {
      if (descriptor) Object.defineProperty(process, "platform", descriptor);
    });
    const { step, root } = await timedStep(
      "100",
      "(sleep 0.6; touch orphan) & sleep 5",
    );
    if (descriptor) Object.defineProperty(process, "platform", descriptor);
    expect(step.outcome).toBe("timed_out");
    await sleep(900);
    expect(existsSync(path.join(root, "orphan"))).toBe(true);
  });

  for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const) {
    test(`stops the running step group on ${signal}`, async () => {
      const root = workspace([
        {
          test_id: "T-a",
          steps: [["sh", "-c", "(sleep 0.6; touch orphan) & sleep 5"]],
        },
      ]);
      const exits: unknown[] = [];
      const exit = spyOn(process, "exit").mockImplementation(((
        value?: number,
      ) => {
        exits.push(value);
      }) as typeof process.exit);
      restores.push(() => exit.mockRestore());
      const before = process.listenerCount(signal);
      const started = Date.now();
      const run = runProofSteps({
        workspaceRoot: root,
        stepsPath: "steps.json",
        env: baseEnv(),
        write: () => {},
      });
      await sleep(150);
      expect(process.listenerCount(signal)).toBe(before + 1);
      process.emit(signal, signal);
      expect(await run).toBe(1);
      expect(exits).toStrictEqual([code]);
      expect(process.listenerCount(signal)).toBe(before);
      // Background jobs of a non-interactive shell ignore SIGINT, so only
      // SIGTERM reaches the orphan; both stop the foreground sleep at once.
      expect(Date.now() - started).toBeLessThan(3_000);
      await sleep(800);
      expect(existsSync(path.join(root, "orphan"))).toBe(signal === "SIGINT");
    });
  }
});
