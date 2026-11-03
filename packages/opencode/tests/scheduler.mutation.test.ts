import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
    ["an explicit hint in compat mode", -1, "compat", true, 0],
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

type Handle = ReturnType<typeof setTimeout>;

function manualTimers() {
  const scheduled: Array<{ fn: () => void; ms: number; handle: Handle }> = [];
  const cleared: unknown[] = [];
  let next = 1;
  return {
    scheduled,
    cleared,
    setTimeoutFn: (fn: () => void, ms: number) => {
      const handle = next as unknown as Handle;
      next += 1;
      scheduled.push({ fn, ms, handle });
      return handle;
    },
    clearTimeoutFn: (handle: Handle) => {
      cleared.push(handle);
    },
  };
}

const KB_FILE = path.join(process.cwd(), ".kb/requirements/a.md");

describe("scheduleSync", () => {
  test("a disabled scheduler schedules nothing", async () => {
    const timers = manualTimers();
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: { ...config(0), sync: { ...DEFAULTS.sync, enabled: false } },
      runSync: async () => ({ exitCode: 0 }),
      ...timers,
    });
    scheduler.scheduleSync("manual");
    await scheduler.flush();
    expect(timers.scheduled).toEqual([]);
  });

  test.each([["file.edited"], ["file.created"], ["file.deleted"]])(
    "%s needs a relevant file",
    (reason) => {
      const timers = manualTimers();
      const scheduler = createSyncScheduler({
        worktree: process.cwd(),
        config: config(7),
        runSync: async () => ({ exitCode: 0 }),
        ...timers,
      });
      scheduler.scheduleSync(reason);
      scheduler.scheduleSync(reason, path.join(process.cwd(), "src/a.ts"));
      expect(timers.scheduled).toEqual([]);
      scheduler.scheduleSync(reason, KB_FILE);
      expect(timers.scheduled.map((entry) => entry.ms)).toEqual([7]);
    },
  );

  test("other reasons need no file", () => {
    const timers = manualTimers();
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(7),
      runSync: async () => ({ exitCode: 0 }),
      ...timers,
    });
    scheduler.scheduleSync("manual");
    expect(timers.scheduled).toHaveLength(1);
  });

  test("a new trigger restarts the debounce timer and the timer runs it", async () => {
    const timers = manualTimers();
    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(7),
      runSync: async () => ({ exitCode: 0 }),
      onRunComplete: (meta) => completions.push(meta),
      ...timers,
    });
    scheduler.onFileEdited(KB_FILE);
    expect(timers.cleared).toEqual([]);
    scheduler.onFileEdited(KB_FILE);
    expect(timers.cleared).toEqual([timers.scheduled[0]?.handle]);
    timers.scheduled[1]?.fn();
    await scheduler.flush();
    expect(timers.cleared).toHaveLength(1);
    expect(completions.map((meta) => [meta.reason, meta.filePath])).toEqual([
      ["file.edited", KB_FILE],
    ]);
  });

  test("tool calls use their default reason", async () => {
    const reasons: string[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(-1, "compat"),
      runSync: async () => ({ exitCode: 0 }),
      onRunComplete: (meta) => reasons.push(meta.reason),
      ...manualTimers(),
    });
    scheduler.onToolExecuteAfter();
    await scheduler.flush();
    expect(reasons).toEqual(["tool.execute.after"]);
  });
});

describe("flush and dispose", () => {
  test("flush clears a pending timer and leaves no timer alone", async () => {
    const timers = manualTimers();
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(7),
      runSync: async () => ({ exitCode: 0 }),
      ...timers,
    });
    await scheduler.flush();
    expect(timers.cleared).toEqual([]);
    scheduler.scheduleSync("manual");
    await scheduler.flush();
    expect(timers.cleared).toEqual([timers.scheduled[0]?.handle]);
  });

  test("dispose clears only a live timer and releases flush waiters", async () => {
    const timers = manualTimers();
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(7),
      runSync: () => new Promise(() => {}),
      ...timers,
    });
    scheduler.dispose();
    expect(timers.cleared).toEqual([]);
    scheduler.scheduleSync("manual");
    const waiting = scheduler.flush();
    scheduler.scheduleSync("manual");
    scheduler.dispose();
    expect(timers.cleared).toEqual([
      timers.scheduled[0]?.handle,
      timers.scheduled[1]?.handle,
    ]);
    expect(
      await Promise.race([
        waiting.then(() => "released"),
        new Promise((resolve) => setTimeout(() => resolve("pending"), 50)),
      ]),
    ).toBe("released");
  });

  test("flush waits for the trailing run as well", async () => {
    const gates: Array<() => void> = [];
    const completions: string[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: () =>
        new Promise((resolve) => {
          gates.push(() => resolve({ exitCode: 0 }));
        }),
      onRunComplete: (meta) => completions.push(meta.reason),
      ...manualTimers(),
    });
    scheduler.scheduleSync("first");
    let done = false;
    const waiting = scheduler.flush().then(() => {
      done = true;
    });
    scheduler.scheduleSync("second");
    void scheduler.flush();
    gates[0]?.();
    await new Promise((resolve) => setImmediate(resolve));
    expect(completions).toEqual(["first"]);
    expect(done).toBe(false);
    gates[1]?.();
    await waiting;
    expect(completions).toEqual(["first", "second.trailing"]);
  });
});

describe("run logs and metadata", () => {
  function nowSequence(...values: number[]) {
    return () => values.shift() ?? 0;
  }

  test("a plain run logs start and success with exact metadata", async () => {
    const bodies = captureLogs();
    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => {
        throw new Error("no checks expected");
      },
      now: nowSequence(100, 150),
      onRunComplete: (meta) => completions.push(meta),
      ...manualTimers(),
    });
    scheduler.scheduleSync("manual", undefined, []);
    await scheduler.flush();
    const meta = {
      reason: "manual",
      worktree: process.cwd(),
      debounceWindowMs: 0,
      durationMs: 50,
      exitCode: 0,
    };
    expect(completions).toStrictEqual([meta]);
    expect(bodies.map((body) => [body.level, body.message])).toEqual([
      [
        "info",
        `sync.started ${JSON.stringify({ reason: "manual", worktree: process.cwd(), debounceWindowMs: 0 })}`,
      ],
      ["info", `sync.succeeded ${JSON.stringify(meta)}`],
    ]);
  });

  test("a clock that goes back gives a zero duration", async () => {
    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => ({ exitCode: 0 }),
      now: nowSequence(150, 100),
      onRunComplete: (meta) => completions.push(meta),
      ...manualTimers(),
    });
    scheduler.scheduleSync("manual");
    await scheduler.flush();
    expect(completions[0]?.durationMs).toBe(0);
  });

  test("check runs log start, failure and success", async () => {
    const bodies = captureLogs();
    let checkExit = 2;
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: checkExit }),
      ...manualTimers(),
    });
    scheduler.scheduleSync("manual", undefined, ["r1"]);
    await scheduler.flush();
    checkExit = 0;
    scheduler.scheduleSync("manual", undefined, ["r1"]);
    await scheduler.flush();
    expect(
      bodies
        .filter((body) => String(body.message).startsWith("check."))
        .map((body) => [body.level, body.message]),
    ).toEqual([
      ["info", 'check.started {"rules":["r1"]}'],
      ["error", 'check.failed {"rules":["r1"],"exitCode":2}'],
      ["info", 'check.started {"rules":["r1"]}'],
      ["info", 'check.succeeded {"rules":["r1"]}'],
    ]);
  });

  test("a failed sync keeps every reported detail", async () => {
    const consoleLines: unknown[] = [];
    const bodies = captureLogs();
    logger._setConsoleError((...args: unknown[]) => consoleLines.push(args));
    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => ({
        exitCode: 4,
        syncCommand: "kibi sync",
        syncStdout: "out",
        syncStderr: "err",
        syncErrorMessage: "boom",
      }),
      now: () => 0,
      onRunComplete: (meta) => completions.push(meta),
      ...manualTimers(),
    });
    scheduler.scheduleSync("smart-enforcement.edit", KB_FILE, ["r1"]);
    await scheduler.flush();
    const meta = {
      reason: "smart-enforcement.edit",
      worktree: process.cwd(),
      debounceWindowMs: 0,
      durationMs: 0,
      exitCode: 4,
      filePath: KB_FILE,
      syncStdout: "out",
      syncStderr: "err",
      syncErrorMessage: "boom",
      syncCommand: "kibi sync",
    };
    expect(completions).toStrictEqual([meta]);
    expect(bodies.at(-1)).toMatchObject({
      level: "error",
      message: `sync.failed ${JSON.stringify(meta)}`,
    });
    expect(consoleLines).toEqual([]);

    scheduler.scheduleSync("manual");
    await scheduler.flush();
    expect(consoleLines).toHaveLength(1);
  });

  test("check details reach the completion metadata", async () => {
    const completions: SyncRunMetadata[] = [];
    captureLogs();
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: 5 }),
      now: () => 0,
      onRunComplete: (meta) => completions.push(meta),
      ...manualTimers(),
    });
    scheduler.scheduleSync("manual", undefined, ["r1"]);
    await scheduler.flush();
    expect(completions).toStrictEqual([
      {
        reason: "manual",
        worktree: process.cwd(),
        debounceWindowMs: 0,
        durationMs: 0,
        exitCode: 0,
        checkExitCode: 5,
        checkRules: ["r1"],
      },
    ]);
  });
});

describe("output truncation", () => {
  test("output at the limit is kept whole; empty output is left out", () => {
    const exact = "x".repeat(4000);
    expect(syncFailureResult({ message: "m" }, exact, "")).toStrictEqual({
      exitCode: 1,
      syncCommand: "kibi sync",
      syncStdout: exact,
      syncErrorMessage: "m",
    });
    expect(syncFailureResult({ message: "m" }, "", "e")).toStrictEqual({
      exitCode: 1,
      syncCommand: "kibi sync",
      syncStderr: "e",
      syncErrorMessage: "m",
    });
  });
});

describe("advisory quality diagnostic parsing", () => {
  async function advisoryLogs(
    stdout: string | undefined,
    stderr?: string,
  ): Promise<{ messages: unknown[]; exitCodes: number[] }> {
    const bodies = captureLogs();
    const exitCodes: number[] = [];
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: config(0),
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: 0, stdout, stderr }),
      onRunComplete: (meta) => exitCodes.push(meta.exitCode),
      ...manualTimers(),
    });
    scheduler.scheduleSync("manual", undefined, ["rule"]);
    await scheduler.flush();
    return {
      messages: bodies
        .filter((body) =>
          String(body.message).startsWith("check.advisory_quality"),
        )
        .map((body) => body.message),
      exitCodes,
    };
  }

  const valid = { id: "a", severity: "review", blocking: false, message: "A" };
  const logged =
    'check.advisory_quality {"rules":["rule"],"count":1,"review":1,"firstId":"a","firstMessage":"A"}';

  test("an empty stdout list falls through to stderr", async () => {
    expect(
      await advisoryLogs(
        JSON.stringify({ qualityDiagnostics: [] }),
        JSON.stringify({ qualityDiagnostics: [valid] }),
      ),
    ).toEqual({ messages: [logged], exitCodes: [0] });
  });

  test("structured content diagnostics are read first", async () => {
    expect(
      await advisoryLogs(
        JSON.stringify({
          structuredContent: { qualityDiagnostics: [valid] },
          qualityDiagnostics: [{ ...valid, id: "b" }],
        }),
      ),
    ).toEqual({ messages: [logged], exitCodes: [0] });
  });

  test.each([
    ["null"],
    ["[]"],
    ["5"],
    ['{"qualityDiagnostics":"x"}'],
    ['{"structuredContent":{}}'],
    ['{"structuredContent":{"qualityDiagnostics":{"id":"a"}}}'],
    ["{}"],
  ])("%s holds no diagnostics", async (stdout) => {
    expect(await advisoryLogs(stdout)).toEqual({
      messages: [],
      exitCodes: [0],
    });
  });

  test.each([
    [{ ...valid, id: 1 }],
    [{ ...valid, severity: 1 }],
    [{ ...valid, blocking: "no" }],
    [{ ...valid, blocking: 0 }],
    [{ ...valid, message: 1 }],
    [null],
    ["text"],
  ])("a malformed diagnostic is skipped: %p", async (candidate) => {
    expect(
      await advisoryLogs(JSON.stringify({ qualityDiagnostics: [candidate] })),
    ).toEqual({ messages: [], exitCodes: [0] });
  });
});

describe("the default check and sync commands", () => {
  const originalPath = process.env.PATH;
  let bin = "";

  afterEach(() => {
    process.env.PATH = originalPath;
    if (bin) fs.rmSync(bin, { recursive: true, force: true });
    bin = "";
  });

  function fakeKibi(script: string): string {
    bin = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-fake-bin-"));
    fs.writeFileSync(path.join(bin, "kibi"), `#!/bin/sh\n${script}\n`, {
      mode: 0o755,
    });
    process.env.PATH = `${bin}${path.delimiter}${originalPath}`;
    return bin;
  }

  async function runWithDefaults(rules: string[] | undefined) {
    captureLogs();
    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: bin,
      config: config(0),
      now: () => 0,
      onRunComplete: (meta) => completions.push(meta),
      ...manualTimers(),
    });
    scheduler.scheduleSync("manual", undefined, rules);
    await scheduler.flush();
    return completions[0];
  }

  test("a successful sync and check run in the worktree", async () => {
    const dir = fakeKibi(
      [
        'echo "$*" >> "$(dirname "$0")/calls"',
        'pwd >> "$(dirname "$0")/calls"',
        'if [ "$1" = check ]; then',
        `  echo '${JSON.stringify({ qualityDiagnostics: [{ id: "q", severity: "review", blocking: false, message: "Q" }] })}'`,
        "fi",
      ].join("\n"),
    );
    const bodies = captureLogs();
    const completions: SyncRunMetadata[] = [];
    const scheduler = createSyncScheduler({
      worktree: dir,
      config: config(0),
      now: () => 0,
      onRunComplete: (meta) => completions.push(meta),
      ...manualTimers(),
    });
    scheduler.scheduleSync("manual", undefined, ["r1", "r2"]);
    await scheduler.flush();
    const real = fs.realpathSync(dir);
    expect(fs.readFileSync(path.join(dir, "calls"), "utf8")).toBe(
      `sync\n${real}\ncheck --rules r1,r2 --format json\n${real}\n`,
    );
    expect(completions).toStrictEqual([
      {
        reason: "manual",
        worktree: dir,
        debounceWindowMs: 0,
        durationMs: 0,
        exitCode: 0,
        checkExitCode: 0,
        checkRules: ["r1", "r2"],
        syncCommand: "kibi sync",
      },
    ]);
    expect(
      bodies.some((body) =>
        String(body.message).startsWith("check.advisory_quality"),
      ),
    ).toBe(true);
  });

  test("diagnostics on stderr of the default check are read", async () => {
    fakeKibi(
      [
        'if [ "$1" = check ]; then',
        `  echo '${JSON.stringify({ qualityDiagnostics: [{ id: "q", severity: "review", blocking: false, message: "Q" }] })}' >&2`,
        "fi",
      ].join("\n"),
    );
    const bodies = captureLogs();
    const scheduler = createSyncScheduler({
      worktree: bin,
      config: config(0),
      ...manualTimers(),
    });
    scheduler.scheduleSync("manual", undefined, ["r1"]);
    await scheduler.flush();
    expect(
      bodies.some((body) =>
        String(body.message).startsWith("check.advisory_quality"),
      ),
    ).toBe(true);
  });

  test("a failing default check keeps its exit code", async () => {
    fakeKibi('if [ "$1" = check ]; then exit 3; fi');
    expect((await runWithDefaults(["r1"]))?.checkExitCode).toBe(3);
  });

  test("a default check killed by a signal is a failure", async () => {
    fakeKibi('if [ "$1" = check ]; then kill -9 $PPID; fi');
    expect((await runWithDefaults(["r1"]))?.checkExitCode).toBe(1);
  });
});
