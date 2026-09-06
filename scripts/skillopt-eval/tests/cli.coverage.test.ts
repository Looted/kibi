// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { type CliDependencies, main } from "../cli";
import {
  type CapabilityCanaryReceipt,
  OPTIMIZER_MODEL,
  TARGET_MODEL,
} from "../runtime/permissions";

const previousExit = process.exitCode;

afterEach(() => {
  process.exitCode = previousExit;
});

function captureStdio() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writeOut = process.stdout.write.bind(process.stdout);
  const writeErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  return {
    stdout,
    stderr,
    restore() {
      process.stdout.write = writeOut;
      process.stderr.write = writeErr;
    },
  };
}

function dependencies(
  overrides: Partial<CliDependencies> = {},
): CliDependencies {
  return {
    runPreflight: async ({ runId }) => ({
      verdict: "pass",
      runId,
      targetModel: TARGET_MODEL,
      optimizerModel: OPTIMIZER_MODEL,
      skilloptCommit: "b860a5cf88ce75e2bd02ca981ac21fb28cffba83",
      codexVersion: "codex 1.0.0",
      authMode: "file",
      bwrap: true,
      sourceClean: true,
      configValid: true,
      paidModelCalls: 0,
    }),
    runCapabilityCanary: async ({ runId }) =>
      ({
        verdict: "pass",
        runId,
        targetModel: TARGET_MODEL,
        optimizerModel: OPTIMIZER_MODEL,
        authMode: "file",
        paidModelCalls: 2,
        modelRuns: [],
        events: [],
      }) satisfies CapabilityCanaryReceipt,
    runRealOptimization: async () => {
      throw new Error("workflow command should not reach real optimization");
    },
    evaluateHeldOut: async () => ({
      eligibility: "HELD_OUT_MATRIX_INELIGIBLE",
      cellCount: 0,
    }),
    cellRunner: async () => {
      throw new Error("cell runner unused");
    },
    createCodexRuntimeLease: async ({ artifactRoot }) => ({
      root: `${artifactRoot}/.runtime/unused`,
      codexExecutable: `${artifactRoot}/.runtime/unused/codex`,
      bwrapExecutable: `${artifactRoot}/.runtime/unused/bwrap`,
      cleanup: async () => {},
    }),
    ...overrides,
  };
}

describe("cli.ts remaining command and error paths", () => {
  test("prints help for empty argv and the help command", async () => {
    const io = captureStdio();
    try {
      expect(await main([])).toBe(0);
      expect(await main(["help"])).toBe(0);
      expect(io.stdout.join("")).toContain("Usage: cli.ts");
    } finally {
      io.restore();
    }
  });

  test("writes preflight and smoke receipts and maps fail verdicts to 1", async () => {
    const io = captureStdio();
    try {
      expect(
        await main(
          ["preflight", "--run-id", "00000000-0000-4000-8000-000000000401"],
          dependencies(),
        ),
      ).toBe(0);
      expect(
        await main(
          [
            "smoke",
            "--allow-paid",
            "--run-id",
            "00000000-0000-4000-8000-000000000402",
          ],
          dependencies(),
        ),
      ).toBe(0);
      expect(
        await main(
          ["preflight", "--run-id", "00000000-0000-4000-8000-000000000403"],
          dependencies({
            runPreflight: async ({ runId }) =>
              ({
                verdict: "fail",
                runId,
                targetModel: TARGET_MODEL,
                optimizerModel: OPTIMIZER_MODEL,
                skilloptCommit: "b860a5cf88ce75e2bd02ca981ac21fb28cffba83",
                codexVersion: "codex 1.0.0",
                authMode: "file",
                bwrap: true,
                sourceClean: false,
                configValid: true,
                paidModelCalls: 0,
              }) as never,
          }),
        ),
      ).toBe(1);
      expect(
        await main(
          [
            "smoke",
            "--allow-paid",
            "--run-id",
            "00000000-0000-4000-8000-000000000404",
          ],
          dependencies({
            runCapabilityCanary: async ({ runId }) =>
              ({
                verdict: "fail",
                runId,
                targetModel: TARGET_MODEL,
                optimizerModel: OPTIMIZER_MODEL,
                authMode: "file",
                paidModelCalls: 0,
                modelRuns: [],
                events: [],
              }) as never,
          }),
        ),
      ).toBe(1);
      expect(io.stdout.join("")).toContain("skilloptCommit");
    } finally {
      io.restore();
    }
  });

  test("rejects smoke with the wrong paid acknowledgement count", async () => {
    const io = captureStdio();
    try {
      expect(
        await main(
          [
            "smoke",
            "--allow-paid",
            "--allow-paid",
            "--run-id",
            "00000000-0000-4000-8000-000000000405",
          ],
          dependencies(),
        ),
      ).toBe(2);
      expect(io.stderr.join("")).toContain("exactly one --allow-paid");
    } finally {
      io.restore();
    }
  });

  test("emits a prototype receipt and rejects unknown commands", async () => {
    const io = captureStdio();
    try {
      expect(
        await main(["prototype", "--run-id", "cli-prototype-coverage"]),
      ).toBe(0);
      expect(io.stdout.join("")).toContain('"id":"cli-prototype-coverage"');
      expect(await main(["not-a-command"])).toBe(2);
      expect(io.stderr.join("")).toContain("Unknown command: not-a-command");
    } finally {
      io.restore();
    }
  });

  test("rethrows unexpected errors from injected dependencies", async () => {
    const io = captureStdio();
    try {
      await expect(
        main(
          ["preflight", "--run-id", "00000000-0000-4000-8000-000000000406"],
          dependencies({
            runPreflight: async () => {
              throw new TypeError("preflight_unavailable");
            },
          }),
        ),
      ).rejects.toThrow("preflight_unavailable");
    } finally {
      io.restore();
    }
  });
});
