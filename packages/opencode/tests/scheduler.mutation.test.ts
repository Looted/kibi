import { afterEach, describe, expect, test } from "bun:test";
import { DEFAULTS, type KibiConfig } from "../src/config";
import * as logger from "../src/logger";
import {
  type SyncRunMetadata,
  createSyncScheduler,
  syncFailureResult,
} from "../src/scheduler";

afterEach(() => {
  logger.resetClient();
  logger._setConsoleError(null);
});

function config(
  debounceMs: number,
  hookMode: KibiConfig["prompt"]["hookMode"] = "auto",
): KibiConfig {
  return {
    ...DEFAULTS,
    prompt: { ...DEFAULTS.prompt, hookMode },
    sync: { ...DEFAULTS.sync, enabled: true, debounceMs },
  };
}

function captureLogs() {
  const bodies: Array<Record<string, unknown>> = [];
  logger.setClient({
    app: {
      log: async ({ body }: { body: Record<string, unknown> }) => {
        bodies.push(body);
      },
    },
  } as never);
  logger._setConsoleError(() => {});
  return bodies;
}

describe("onToolExecuteAfter", () => {
  test.each([
    ["compat mode with a negative window", -1, "compat", false, 1],
    ["compat mode with a zero window", 0, "compat", false, 0],
    ["compat mode with a positive window", 5, "compat", false, 0],
    ["an explicit hint with a negative window", -1, "auto", true, 0],
    ["auto mode with a negative window", -1, "auto", false, 0],
  ] as const)("%s", async (_name, debounceMs, hookMode, hint, runs) => {
    const reasons: string[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(debounceMs, hookMode),
      runSync: async () => ({ exitCode: 0 }),
      onRunComplete: (meta) => reasons.push(meta.reason),
      setTimeoutFn: () => 1 as unknown as ReturnType<typeof setTimeout>,
      clearTimeoutFn: () => {},
      enableToolExecuteAfterHint: hint,
    });
    scheduler.onToolExecuteAfter("tool.custom");
    await scheduler.flush();
    expect(reasons).toEqual(runs ? ["tool.custom"] : []);
    scheduler.dispose();
  });
});

describe("flush and trailing runs", () => {
  test("an idle scheduler flushes at once", async () => {
    let runs = 0;
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => {
        runs += 1;
        return { exitCode: 0 };
      },
    });
    await scheduler.flush();
    expect(runs).toBe(0);
  });

  test("a trailing run keeps the file and check rules of its trigger", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const checks: string[][] = [];
    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => {
        await gate;
        return { exitCode: 0 };
      },
      runCheck: async (_worktree, rules) => {
        checks.push(rules);
        return { exitCode: 0 };
      },
      onRunComplete: (meta) => completions.push(meta),
      setTimeoutFn: () => 1 as unknown as ReturnType<typeof setTimeout>,
      clearTimeoutFn: () => {},
    });
    scheduler.scheduleSync("first");
    const first = scheduler.flush();
    scheduler.scheduleSync("second", "src/a.ts", ["rule-a"]);
    const second = scheduler.flush();
    release();
    await first;
    await second;
    expect(completions.map((meta) => meta.reason)).toEqual([
      "first",
      "second.trailing",
    ]);
    expect(completions[1]?.filePath).toBe("src/a.ts");
    expect(checks).toEqual([["rule-a"]]);
  });
});

describe("syncFailureResult", () => {
  test("keeps the exit code, outputs, message and signal", () => {
    expect(
      syncFailureResult(
        { code: 3, signal: "SIGTERM", message: "failed" },
        "out",
        "err",
      ),
    ).toEqual({
      exitCode: 3,
      syncCommand: "kibi sync",
      syncStdout: "out",
      syncStderr: "err",
      syncErrorMessage: "failed (signal: SIGTERM)",
    });
  });

  test("without a numeric code the exit code is 1; empty parts are left out", () => {
    expect(syncFailureResult({ message: "" }, "", "")).toEqual({
      exitCode: 1,
      syncCommand: "kibi sync",
    });
    expect(
      syncFailureResult({ message: "", signal: "SIGKILL" }, "", ""),
    ).toEqual({
      exitCode: 1,
      syncCommand: "kibi sync",
      syncErrorMessage: " (signal: SIGKILL)",
    });
  });

  test("long output is truncated", () => {
    const result = syncFailureResult({ message: "m" }, "x".repeat(4001), "");
    expect(result.syncStdout).toBe(`${"x".repeat(4000)}\n...[truncated]`);
  });
});

describe("the default sync runner", () => {
  test("a command that cannot start is a failed sync", async () => {
    captureLogs();
    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: "/no\0such",
      config: config(0),
      onRunComplete: (meta) => completions.push(meta),
    });
    scheduler.scheduleSync("manual");
    await scheduler.flush();
    expect(completions).toHaveLength(1);
    expect(completions[0]?.exitCode).toBe(1);
    expect(completions[0]?.syncCommand).toBe("kibi sync");
    expect(String(completions[0]?.syncErrorMessage)).toContain("cwd");
  });
});

describe("advisory quality diagnostics", () => {
  test("malformed diagnostics and blank streams log nothing", async () => {
    const bodies = captureLogs();
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({
        exitCode: 0,
        stdout: "  ",
        stderr: JSON.stringify({
          qualityDiagnostics: [
            null,
            { id: "a", severity: "review", blocking: false },
            { id: "b", severity: "review", blocking: "no", message: "m" },
          ],
        }),
      }),
    });
    scheduler.scheduleSync("manual", undefined, ["rule"]);
    await scheduler.flush();
    expect(
      bodies.filter((body) =>
        String(body.message).startsWith("check.advisory_quality"),
      ),
    ).toEqual([]);
  });

  test("non-blocking diagnostics are counted by severity", async () => {
    const bodies = captureLogs();
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({
        exitCode: 0,
        stdout: "not json",
        stderr: JSON.stringify({
          qualityDiagnostics: [
            { id: "a", severity: "review", blocking: false, message: "A" },
            { id: "b", severity: "info", blocking: true, message: "B" },
            { id: "c", severity: "review", blocking: false, message: "C" },
            { id: "d", severity: "hint", blocking: false, message: "D" },
          ],
        }),
      }),
    });
    scheduler.scheduleSync("manual", undefined, ["rule"]);
    await scheduler.flush();
    expect(
      bodies
        .filter((body) =>
          String(body.message).startsWith("check.advisory_quality"),
        )
        .map((body) => body.message),
    ).toEqual([
      'check.advisory_quality {"rules":["rule"],"count":3,"review":2,"hint":1,"firstId":"a","firstMessage":"A"}',
    ]);
  });
});
