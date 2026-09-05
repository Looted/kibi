// implements REQ-skillopt-codex-optimization
import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import { Readable } from "node:stream";
import { bridgeMain, finishBridgeCli } from "../bridge-cli";
import { EvaluationInfrastructureError } from "../evaluation-infrastructure";
import {
  bridgeErrorCode,
  bridgeFailure,
  parseBridgeOptions,
} from "../runtime/bridge-cli-options";
import { CodexAuthError } from "../runtime/codex-auth";
import { FixtureIntegrityError } from "../runtime/codex-cell-types";
import { ProcessControlError } from "../runtime/process";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

afterAll(() => {
  process.exitCode = 0;
});

const PIPE_REQUEST = {
  schemaVersion: "1.0.0" as const,
  artifactType: "skillopt-bridge-request" as const,
  runId: "00000000-0000-4000-8000-000000000623",
  batchId: "bridge-default-pipe",
  skill: "kibi-usage" as const,
  phase: "train" as const,
  candidateBody: "Use the Kibi MCP workflow.\n",
  taskIds: ["kibi-usage-safe-mutation-direction-development-1"],
  publicClaim: {
    taskId: "kibi-usage-safe-mutation-direction-development-1",
    text: "Use the Kibi MCP workflow.",
    publicManifestHash: "a".repeat(64),
    workspaceHash: "b".repeat(64),
  },
  sourceLockHash: "c".repeat(64),
};

function captureStderr(): string[] {
  const chunks: string[] = [];
  const write = spyOn(process.stderr, "write").mockImplementation(((
    chunk: unknown,
  ) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write);
  spies.push(write);
  return chunks;
}

describe("bridge CLI remaining default pipe and settlement branches", () => {
  test("reads stdin and writes stdout through the default pipe", async () => {
    const previousStdin = process.stdin;
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: Readable.from([JSON.stringify(PIPE_REQUEST)]),
    });
    restores.push(() => {
      Object.defineProperty(process, "stdin", {
        configurable: true,
        value: previousStdin,
      });
    });
    const stdout: string[] = [];
    const write = spyOn(process.stdout, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stdout.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
    spies.push(write);

    const exitCode = await bridgeMain(["--pipe", "--fake"]);
    expect(exitCode).toBe(0);
    expect(stdout.join("")).toContain("skillopt-bridge-result");
  });

  test("finishBridgeCli records success and classified failures", async () => {
    const stderr = captureStderr();

    await finishBridgeCli(Promise.resolve(0));
    expect(process.exitCode).toBe(0);

    await finishBridgeCli(
      Promise.reject(
        new EvaluationInfrastructureError({
          stage: "held-out",
          taskId: "task-1",
          variant: "skillopt",
          status: "infrastructure-failure",
          criticalFailures: ["missing_mcp"],
          receiptPath: null,
        }),
      ),
    );
    expect(process.exitCode).toBe(1);
    expect(stderr.join("")).toContain("KIBI_SKILLOPT_INFRASTRUCTURE:");

    const caused = new Error("outer");
    caused.cause = new Error("inner-cause");
    await finishBridgeCli(Promise.reject(caused));
    expect(process.exitCode).toBe(1);
    expect(stderr.join("")).toContain("inner-cause");

    await finishBridgeCli(Promise.reject("plain-string"));
    expect(process.exitCode).toBe(1);
    expect(stderr.join("")).toContain("plain-string");
    process.exitCode = 0;
  });

  test("parseBridgeOptions rejects non-positive numbers and bridgeErrorCode classifies failures", () => {
    expect(() =>
      parseBridgeOptions(["--pipe", "--fake", "--price-amount", "nope"]),
    ).toThrow("invalid_price-amount");
    expect(() =>
      parseBridgeOptions(["--pipe", "--fake", "--timeout-ms", "0"]),
    ).toThrow("invalid_timeout-ms");
    expect(() =>
      parseBridgeOptions(["--pipe", "--fake", "--timeout-ms", "1.5"]),
    ).toThrow("invalid_timeout-ms");

    try {
      parseBridgeOptions(["--unknown-flag"]);
    } catch (error) {
      expect(bridgeErrorCode(error)).toBe("BRIDGE_INPUT_INVALID");
    }

    expect(
      bridgeErrorCode(
        new EvaluationInfrastructureError({
          stage: "runtime",
          taskId: "t",
          variant: "baseline",
          status: "runtime-staging-failure",
          criticalFailures: ["stage"],
          receiptPath: null,
        }),
      ),
    ).toBe("BRIDGE_CELL_INFRASTRUCTURE_FAILED");
    expect(bridgeErrorCode(bridgeFailure(new CodexAuthError("login")))).toBe(
      "BRIDGE_AUTHENTICATION_FAILED",
    );
    expect(bridgeErrorCode(bridgeFailure(new FixtureIntegrityError()))).toBe(
      "BRIDGE_FIXTURE_INTEGRITY_FAILED",
    );
    expect(
      bridgeErrorCode(
        bridgeFailure(
          new ProcessControlError("timeout", {
            argv: ["codex"],
            stdout: "",
            stderr: "",
            exitCode: -1,
            signal: null,
          }),
        ),
      ),
    ).toBe("BRIDGE_TIMEOUT_FAILED");
    expect(bridgeErrorCode(new Error("other"))).toBe("BRIDGE_EXECUTION_FAILED");
    expect(bridgeErrorCode(bridgeFailure("not-an-error"))).toBe(
      "BRIDGE_EXECUTION_FAILED",
    );
  });
});
