import { afterEach, describe, mock, test } from "bun:test";
import { strict as assert } from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULTS } from "../src/config";
import {
  type KibiCheckpointContext,
  KibiCheckpointRunner,
} from "../src/kibi-checkpoint-runner";
import * as logger from "../src/logger";
import { type SyncRunMetadata, createSyncScheduler } from "../src/scheduler";

type TimeoutToken = ReturnType<typeof setTimeout>;

function createFakeClock() {
  let nowMs = 0;
  let nextId = 1;
  const tasks = new Map<number, { at: number; fn: () => void }>();

  return {
    now: () => nowMs,
    setTimeoutFn: (fn: () => void, ms: number): TimeoutToken => {
      const id = nextId++;
      tasks.set(id, { at: nowMs + ms, fn });
      return id as unknown as TimeoutToken;
    },
    clearTimeoutFn: (handle: TimeoutToken) => {
      tasks.delete(handle as unknown as number);
    },
    advance: (ms: number) => {
      nowMs += ms;
      while (true) {
        const due = [...tasks.entries()]
          .filter(([, task]) => task.at <= nowMs)
          .sort((a, b) => a[1].at - b[1].at);
        if (!due.length) break;
        for (const [id, task] of due) {
          tasks.delete(id);
          task.fn();
        }
      }
    },
  };
}

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function isLogBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function structuredLogBodies(
  calls: readonly (readonly [Record<string, unknown>])[],
): Record<string, unknown>[] {
  return calls.flatMap(([payload]) => {
    const body = payload.body;
    return isLogBody(body) ? [body] : [];
  });
}

afterEach(() => {
  logger.resetClient();
  logger._setConsoleError(null);
  mock.restore();
});

describe("sync scheduler", () => {
  test("scheduler instances for parallel worktrees flush only their own pending sync", async () => {
    const clock = createFakeClock();
    const tmpDir = fs.mkdtempSync(
      path.join(process.cwd(), "test-scheduler-scope-"),
    );
    const worktreeA = path.join(tmpDir, "worktree-a");
    const worktreeB = path.join(tmpDir, "worktree-b");
    fs.mkdirSync(path.join(worktreeA, "documentation", "requirements"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(worktreeB, "documentation", "requirements"), {
      recursive: true,
    });
    const runs: string[] = [];

    try {
      const makeScheduler = (worktree: string) =>
        createSyncScheduler({
          worktree,
          config: {
            ...DEFAULTS,
            sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
          },
          now: clock.now,
          setTimeoutFn: clock.setTimeoutFn,
          clearTimeoutFn: clock.clearTimeoutFn,
          runSync: async (runWorktree) => {
            runs.push(runWorktree);
            return { exitCode: 0 };
          },
        });

      const schedulerA = makeScheduler(worktreeA);
      const schedulerB = makeScheduler(worktreeB);

      schedulerA.scheduleSync(
        "file.edited",
        ".kb/requirements/REQ-A.md",
      );
      schedulerB.scheduleSync(
        "file.edited",
        ".kb/requirements/REQ-B.md",
      );

      await schedulerA.flush();
      assert.deepEqual(runs, [path.resolve(worktreeA)]);

      await schedulerB.flush();
      assert.deepEqual(runs, [
        path.resolve(worktreeA),
        path.resolve(worktreeB),
      ]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("three rapid relevant edits in one debounce window launch one sync", async () => {
    const clock = createFakeClock();
    let runs = 0;

    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      runSync: async () => {
        runs += 1;
        return { exitCode: 0 };
      },
    });

    scheduler.onFileEdited(".kb/requirements/REQ-001.md");
    clock.advance(20);
    scheduler.onFileEdited(".kb/requirements/REQ-001.md");
    clock.advance(20);
    scheduler.onFileEdited(".kb/requirements/REQ-001.md");

    clock.advance(99);
    assert.equal(runs, 0);

    clock.advance(1);
    await flushAsync();
    assert.equal(runs, 1);
  });

  test("one relevant edit during active sync triggers exactly one trailing rerun", async () => {
    const clock = createFakeClock();
    const runs: number[] = [];
    const completions: SyncRunMetadata[] = [];

    let firstResolver: () => void = () => {};
    const firstDone = new Promise<void>((resolve) => {
      firstResolver = () => resolve();
    });
    let secondStartedResolver: () => void = () => {};
    const secondStarted = new Promise<void>((resolve) => {
      secondStartedResolver = () => resolve();
    });

    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      onRunComplete: (meta) => completions.push(meta),
      runSync: async () => {
        runs.push(clock.now());
        if (runs.length === 1) {
          await firstDone;
        } else if (runs.length === 2) {
          secondStartedResolver();
        }
        return { exitCode: 0 };
      },
    });

    scheduler.onFileEdited(".kb/requirements/REQ-002.md");
    clock.advance(100);
    await flushAsync();
    assert.equal(runs.length, 1);

    scheduler.onFileEdited(".kb/requirements/REQ-003.md");
    clock.advance(100);
    await flushAsync();
    assert.equal(runs.length, 1);

    firstResolver();
    await secondStarted;
    assert.equal(runs.length, 2);

    await flushAsync();
    assert.equal(completions.length, 2);
    assert.ok(completions[1]?.reason.includes("trailing"));
  });

  test("tool.execute.after does not duplicate sync when file.edited already covered debounce window", async () => {
    const clock = createFakeClock();
    let runs = 0;

    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        prompt: { ...DEFAULTS.prompt, hookMode: "compat" },
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      runSync: async () => {
        runs += 1;
        return { exitCode: 0 };
      },
    });

    scheduler.onFileEdited(".kb/requirements/REQ-004.md");
    scheduler.onToolExecuteAfter();

    clock.advance(100);
    await flushAsync();
    assert.equal(runs, 1);
  });
});

test("file.created reason treated same as file.edited for sync scheduling", async () => {
  const clock = createFakeClock();
  let runs = 0;

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    runSync: async () => {
      runs += 1;
      return { exitCode: 0 };
    },
  });

  scheduler.scheduleSync(
    "file.created",
    ".kb/requirements/REQ-001.md",
  );

  clock.advance(99);
  assert.equal(runs, 0);

  clock.advance(1);
  await flushAsync();
  assert.equal(runs, 1);
});

test("file.deleted reason treated same as file.edited for sync scheduling", async () => {
  const clock = createFakeClock();
  let runs = 0;

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    runSync: async () => {
      runs += 1;
      return { exitCode: 0 };
    },
  });

  scheduler.scheduleSync(
    "file.deleted",
    ".kb/requirements/REQ-001.md",
  );

  clock.advance(99);
  assert.equal(runs, 0);

  clock.advance(1);
  await flushAsync();
  assert.equal(runs, 1);
});
test("onRunComplete exposes sync failure via exitCode", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => {
      return { exitCode: 1 };
    },
  });

  scheduler.onFileEdited(".kb/requirements/REQ-005.md");
  clock.advance(100);
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 1);
  assert.equal(completions[0]?.syncCommand, undefined);
  assert.equal(completions[0]?.syncStdout, undefined);
  assert.equal(completions[0]?.syncStderr, undefined);
  assert.equal(completions[0]?.syncErrorMessage, undefined);
});

test("SyncRunMetadata exposes sync failure diagnostics keys", () => {
  const meta: SyncRunMetadata = {
    reason: "manual",
    worktree: "/tmp/worktree",
    debounceWindowMs: 100,
    durationMs: 0,
    exitCode: 0,
    syncCommand: undefined,
    syncStdout: undefined,
    syncStderr: undefined,
    syncErrorMessage: undefined,
  };

  assert.deepEqual(
    Object.keys(meta).sort(),
    [
      "debounceWindowMs",
      "durationMs",
      "exitCode",
      "reason",
      "syncCommand",
      "syncErrorMessage",
      "syncStderr",
      "syncStdout",
      "worktree",
    ].sort(),
  );
});

test("onRunComplete exposes check failure via checkExitCode", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => {
      return { exitCode: 0 };
    },
    runCheck: async () => {
      return { exitCode: 1 };
    },
  });

  scheduler.scheduleSync(
    "file.edited",
    ".kb/requirements/REQ-006.md",
    ["required-fields"],
  );
  clock.advance(100);
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 0);
  assert.equal(completions[0]?.checkExitCode, 1);
});

test("scheduler logs advisory quality diagnostics from successful structured check output", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];
  const log = mock(async (_payload: Record<string, unknown>) => {});
  const consoleError = mock(() => {});
  logger.setClient({ app: { log } });
  logger._setConsoleError(consoleError);

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({ exitCode: 0 }),
    runCheck: async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        structuredContent: {
          violations: [],
          count: 0,
          diagnostics: [],
          qualityDiagnostics: [
            {
              id: "symbol_semantic_review_needed",
              severity: "review",
              blocking: false,
              category: "symbol",
              files: ["packages/opencode/src/scheduler.ts"],
              message: "Review linked requirement semantics",
              suggestion: "Run semantic review",
            },
          ],
        },
      }),
    }),
  });

  scheduler.scheduleSync("smart-enforcement.traceability", "src/feature.ts", [
    "symbol-traceability",
  ]);
  clock.advance(100);
  await scheduler.flush();
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 0);
  assert.equal(completions[0]?.checkExitCode, 0);
  assert.equal(consoleError.mock.calls.length, 0);

  const advisoryLogs = structuredLogBodies(log.mock.calls).filter((body) =>
    String(body.message).startsWith("check.advisory_quality"),
  );
  assert.equal(advisoryLogs.length, 1);
  assert.deepEqual(advisoryLogs[0], {
    service: "kibi-opencode",
    level: "warn",
    message:
      'check.advisory_quality {"rules":["symbol-traceability"],"count":1,"review":1,"firstId":"symbol_semantic_review_needed","firstMessage":"Review linked requirement semantics"}',
  });
});

test("scheduler logs advisory quality diagnostics from stderr when stdout is empty", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];
  const log = mock(async (_payload: Record<string, unknown>) => {});
  const consoleError = mock(() => {});
  logger.setClient({ app: { log } });
  logger._setConsoleError(consoleError);

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({ exitCode: 0 }),
    runCheck: async () => ({
      exitCode: 0,
      stderr: JSON.stringify({
        structuredContent: {
          violations: [],
          count: 0,
          diagnostics: [],
          qualityDiagnostics: [
            {
              id: "symbol_semantic_review_needed",
              severity: "review",
              blocking: false,
              category: "symbol",
              files: ["packages/opencode/src/scheduler.ts"],
              message: "Review linked requirement semantics",
              suggestion: "Run semantic review",
            },
          ],
        },
      }),
    }),
  });

  scheduler.scheduleSync("smart-enforcement.traceability", "src/feature.ts", [
    "symbol-traceability",
  ]);
  clock.advance(100);
  await scheduler.flush();
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 0);
  assert.equal(completions[0]?.checkExitCode, 0);
  assert.equal(consoleError.mock.calls.length, 0);

  const advisoryLogs = structuredLogBodies(log.mock.calls).filter((body) =>
    String(body.message).startsWith("check.advisory_quality"),
  );
  assert.equal(advisoryLogs.length, 1);
  assert.deepEqual(advisoryLogs[0], {
    service: "kibi-opencode",
    level: "warn",
    message:
      'check.advisory_quality {"rules":["symbol-traceability"],"count":1,"review":1,"firstId":"symbol_semantic_review_needed","firstMessage":"Review linked requirement semantics"}',
  });
});

test("scheduler prefers stdout structured diagnostics when both streams are present", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];
  const log = mock(async (_payload: Record<string, unknown>) => {});
  const consoleError = mock(() => {});
  logger.setClient({ app: { log } });
  logger._setConsoleError(consoleError);

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({ exitCode: 0 }),
    runCheck: async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        structuredContent: {
          violations: [],
          count: 0,
          diagnostics: [],
          qualityDiagnostics: [
            {
              id: "stdout_quality_diagnostic",
              severity: "review",
              blocking: false,
              category: "symbol",
              files: ["packages/opencode/src/scheduler.ts"],
              message: "Prefer stdout diagnostics",
              suggestion: "Keep stdout first",
            },
          ],
        },
      }),
      stderr: JSON.stringify({
        structuredContent: {
          violations: [],
          count: 0,
          diagnostics: [],
          qualityDiagnostics: [
            {
              id: "stderr_quality_diagnostic",
              severity: "review",
              blocking: false,
              category: "symbol",
              files: ["packages/opencode/src/scheduler.ts"],
              message: "Should not win precedence",
              suggestion: "Keep stderr second",
            },
          ],
        },
      }),
    }),
  });

  scheduler.scheduleSync("smart-enforcement.traceability", "src/feature.ts", [
    "symbol-traceability",
  ]);
  clock.advance(100);
  await scheduler.flush();
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 0);
  assert.equal(completions[0]?.checkExitCode, 0);
  assert.equal(consoleError.mock.calls.length, 0);

  const advisoryLogs = structuredLogBodies(log.mock.calls).filter((body) =>
    String(body.message).startsWith("check.advisory_quality"),
  );
  assert.equal(advisoryLogs.length, 1);
  assert.deepEqual(advisoryLogs[0], {
    service: "kibi-opencode",
    level: "warn",
    message:
      'check.advisory_quality {"rules":["symbol-traceability"],"count":1,"review":1,"firstId":"stdout_quality_diagnostic","firstMessage":"Prefer stdout diagnostics"}',
  });
});

test("scheduler keeps hard check failures on existing failure path", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];
  const log = mock(async (_payload: Record<string, unknown>) => {});
  const consoleError = mock(() => {});
  logger.setClient({ app: { log } });
  logger._setConsoleError(consoleError);

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({ exitCode: 0 }),
    runCheck: async () => ({
      exitCode: 1,
      stdout: JSON.stringify({
        structuredContent: {
          violations: [
            {
              rule: "required-fields",
              entityId: "REQ-001",
              description: "missing title",
            },
          ],
          count: 1,
          diagnostics: [],
        },
      }),
    }),
  });

  scheduler.scheduleSync("smart-enforcement.kb-doc", "documentation/req.md", [
    "required-fields",
  ]);
  clock.advance(100);
  await scheduler.flush();
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 0);
  assert.equal(completions[0]?.checkExitCode, 1);
  assert.equal(consoleError.mock.calls.length, 0);

  const messages = structuredLogBodies(log.mock.calls).map((body) =>
    String(body.message),
  );
  assert.ok(messages.some((message) => message.startsWith("check.failed")));
  assert.equal(
    messages.some((message) => message.startsWith("check.advisory_quality")),
    false,
  );
});

test("scheduler does not crash on malformed structured check output", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({ exitCode: 0 }),
    runCheck: async () => ({ exitCode: 0, stdout: "not json" }),
  });

  scheduler.scheduleSync("smart-enforcement.traceability", "src/feature.ts", [
    "symbol-traceability",
  ]);
  clock.advance(100);
  await scheduler.flush();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 0);
  assert.equal(completions[0]?.checkExitCode, 0);
});

test("scheduler does not crash when structured check output is absent", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({ exitCode: 0 }),
    runCheck: async () => ({ exitCode: 0 }),
  });

  scheduler.scheduleSync("smart-enforcement.traceability", "src/feature.ts", [
    "symbol-traceability",
  ]);
  clock.advance(100);
  await scheduler.flush();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 0);
  assert.equal(completions[0]?.checkExitCode, 0);
});

// Task 1 TDD: check.failed advisory noise regression tests
test("check.failed for symbol-traceability produces zero raw console.error", async () => {
  const clock = createFakeClock();
  const errorSpy: string[] = [];
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    errorSpy.push(args.map(String).join(" "));
  };

  try {
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: 1 }),
    });

    scheduler.scheduleSync("smart-enforcement.traceability", "src/feature.ts", [
      "symbol-traceability",
    ]);
    clock.advance(100);
    await flushAsync();

    // BUG: check.failed currently calls logger.error which unconditionally
    // calls console.error. Advisory check failures should be structured-only.
    assert.equal(
      errorSpy.length,
      0,
      `Advisory check.failed for symbol-traceability must not call console.error, got: ${JSON.stringify(errorSpy)}`,
    );
  } finally {
    console.error = origError;
  }
});

test("check.failed for multi-rule payload produces zero raw console.error", async () => {
  const clock = createFakeClock();
  const errorSpy: string[] = [];
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    errorSpy.push(args.map(String).join(" "));
  };

  try {
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: 1 }),
    });

    scheduler.scheduleSync(
      "smart-enforcement.kb-doc",
      ".kb/facts/FACT-001.md",
      ["required-fields", "no-dangling-refs", "strict-fact-shape"],
    );
    clock.advance(100);
    await flushAsync();

    // Same bug for multi-rule payloads
    assert.equal(
      errorSpy.length,
      0,
      `Advisory check.failed for multi-rule must not call console.error, got: ${JSON.stringify(errorSpy)}`,
    );
  } finally {
    console.error = origError;
  }
});

test("smart-enforcement sync.failed produces zero raw console.error", async () => {
  const clock = createFakeClock();
  const errorSpy: string[] = [];
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    errorSpy.push(args.map(String).join(" "));
  };

  try {
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      runSync: async () => ({ exitCode: 1 }),
    });

    scheduler.scheduleSync("smart-enforcement.traceability", "src/feature.ts");
    clock.advance(100);
    await flushAsync();

    assert.equal(
      errorSpy.length,
      0,
      `Advisory smart-enforcement sync.failed must not call console.error, got: ${JSON.stringify(errorSpy)}`,
    );
  } finally {
    console.error = origError;
  }
});

test("smart-enforcement trailing sync.failed produces zero raw console.error", async () => {
  const clock = createFakeClock();
  const errorSpy: string[] = [];
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    errorSpy.push(args.map(String).join(" "));
  };

  let firstResolver: () => void = () => {};
  const firstDone = new Promise<void>((resolve) => {
    firstResolver = () => resolve();
  });
  let secondStartedResolver: () => void = () => {};
  const secondStarted = new Promise<void>((resolve) => {
    secondStartedResolver = () => resolve();
  });
  let runs = 0;

  try {
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      runSync: async () => {
        runs += 1;
        if (runs === 1) {
          await firstDone;
        } else {
          secondStartedResolver();
        }
        return { exitCode: 1 };
      },
    });

    scheduler.scheduleSync(
      "smart-enforcement.kb-doc",
      ".kb/facts/FACT-001.md",
    );
    clock.advance(100);
    await flushAsync();

    scheduler.scheduleSync(
      "smart-enforcement.kb-doc",
      ".kb/facts/FACT-002.md",
    );
    clock.advance(100);
    await flushAsync();

    firstResolver();
    await secondStarted;
    await flushAsync();

    assert.equal(
      errorSpy.length,
      0,
      `Advisory smart-enforcement trailing sync.failed must not call console.error, got: ${JSON.stringify(errorSpy)}`,
    );
  } finally {
    console.error = origError;
  }
});

test("operational sync.failed still produces console.error (control)", async () => {
  const clock = createFakeClock();
  const errorSpy: string[] = [];
  const completions: SyncRunMetadata[] = [];
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    errorSpy.push(args.map(String).join(" "));
  };

  try {
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      onRunComplete: (meta) => completions.push(meta),
      runSync: async () => ({ exitCode: 1 }),
    });

    scheduler.onFileEdited(".kb/requirements/REQ-001.md");
    clock.advance(100);
    await flushAsync();

    // Operational sync failure SHOULD still emit console.error
    assert.ok(
      errorSpy.length >= 1,
      `Operational sync.failed must still call console.error, got: ${JSON.stringify(errorSpy)}`,
    );
    assert.equal(
      errorSpy.filter((entry) => entry.includes("sync.failed")).length,
      1,
    );
    assert.equal(completions.length, 1);
    assert.equal(completions[0]?.exitCode, 1);
  } finally {
    console.error = origError;
  }
});

test("runKibiSync captures stdout/stderr on non-zero exit", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({
      exitCode: 1,
      syncStdout: "error: sync failed",
      syncStderr: "fatal: missing config",
    }),
  });

  scheduler.onFileEdited(".kb/requirements/REQ-006.md");
  clock.advance(100);
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 1);
  assert.equal(completions[0]?.syncStdout, "error: sync failed");
  assert.equal(completions[0]?.syncStderr, "fatal: missing config");
});

test("runKibiSync throw-path captures error message in syncErrorMessage", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => {
      throw new Error("kibi binary not found");
    },
  });

  scheduler.onFileEdited(".kb/requirements/REQ-007.md");
  clock.advance(100);
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 1);
  assert.equal(completions[0]?.syncErrorMessage, "kibi binary not found");
  assert.equal(completions[0]?.syncStdout, undefined);
  assert.equal(completions[0]?.syncStderr, undefined);
});

test("runKibiSync truncates stdout/stderr exceeding 4000 chars", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];
  const longOutput = "x".repeat(5000);

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({
      exitCode: 1,
      syncStdout: longOutput,
      syncStderr: longOutput,
    }),
  });

  scheduler.onFileEdited(".kb/requirements/REQ-008.md");
  clock.advance(100);
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(
    completions[0]?.syncStdout?.length,
    4000 + "\n...[truncated]".length,
  );
  assert.ok(completions[0]?.syncStdout?.endsWith("\n...[truncated]"));
  assert.equal(
    completions[0]?.syncStderr?.length,
    4000 + "\n...[truncated]".length,
  );
  assert.ok(completions[0]?.syncStderr?.endsWith("\n...[truncated]"));
});

test("runKibiSync normalizes empty stdout/stderr to undefined", async () => {
  const clock = createFakeClock();
  const completions: SyncRunMetadata[] = [];

  const scheduler = createSyncScheduler({
    worktree: process.cwd(),
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
    },
    now: clock.now,
    setTimeoutFn: clock.setTimeoutFn,
    clearTimeoutFn: clock.clearTimeoutFn,
    onRunComplete: (meta) => completions.push(meta),
    runSync: async () => ({
      exitCode: 0,
      syncStdout: undefined,
      syncStderr: undefined,
    }),
  });

  scheduler.onFileEdited(".kb/requirements/REQ-009.md");
  clock.advance(100);
  await flushAsync();

  assert.equal(completions.length, 1);
  assert.equal(completions[0]?.exitCode, 0);
  assert.equal(completions[0]?.syncStdout, undefined);
  assert.equal(completions[0]?.syncStderr, undefined);
  assert.equal(completions[0]?.syncErrorMessage, undefined);
});

function createCheckpointContext(
  overrides: Partial<KibiCheckpointContext> = {},
): KibiCheckpointContext {
  return {
    workContext: {
      worktreeRoot: process.cwd(),
      kibiAuthorityRoot: process.cwd(),
      branch: "main",
      repoRelativePath: "packages/opencode/src/existing.ts",
      posture: "root_active",
      isAuthoritative: true,
      isLinkedWorktree: false,
      sessionId: "session-a",
      agentIdentity: "agent-a",
    },
    filePath: "packages/opencode/src/existing.ts",
    checkRules: ["symbol-traceability"],
    config: {
      ...DEFAULTS,
      sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 0 },
    },
    ...overrides,
  };
}

describe("KibiCheckpointRunner", () => {
  test("runCheckpoint records evidence after hard guidance and successful sync/check", async () => {
    const completions: SyncRunMetadata[] = [];
    const runner = new KibiCheckpointRunner({
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: 0 }),
      onRunComplete: (meta) => completions.push(meta),
    });
    const context = createCheckpointContext();

    assert.equal(runner.isCheckpointPassed("fingerprint-1", context), false);
    const request = runner.requestCheckpoint(context, "fingerprint-1");
    assert.equal(request.kind, "requested");

    const result = await runner.runCheckpoint(context, "fingerprint-1");

    assert.equal(result.kind, "passed");
    assert.equal(completions.length, 1);
    assert.equal(result.metadata.sync?.exitCode, 0);
    assert.equal(result.metadata.sync?.checkExitCode, 0);
    assert.deepEqual(result.metadata.sync?.checkRules, ["symbol-traceability"]);
    assert.equal(runner.isCheckpointPassed("fingerprint-1", context), true);
  });

  test("runCheckpoint hard-blocks when targeted check fails", async () => {
    const runner = new KibiCheckpointRunner({
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: 1 }),
    });
    const context = createCheckpointContext();

    runner.requestCheckpoint(context, "fingerprint-check-fail");
    const result = await runner.runCheckpoint(
      context,
      "fingerprint-check-fail",
    );

    assert.equal(result.kind, "hard_block");
    assert.equal(result.metadata.reason, "check_failed");
    assert.equal(result.metadata.sync?.exitCode, 0);
    assert.equal(result.metadata.sync?.checkExitCode, 1);
    assert.equal(
      runner.isCheckpointPassed("fingerprint-check-fail", context),
      false,
    );
  });

  test("runCheckpoint hard-blocks when sync fails", async () => {
    let checkRuns = 0;
    const runner = new KibiCheckpointRunner({
      runSync: async () => ({ exitCode: 1 }),
      runCheck: async () => {
        checkRuns += 1;
        return { exitCode: 0 };
      },
    });
    const context = createCheckpointContext();

    runner.requestCheckpoint(context, "fingerprint-sync-fail");
    const result = await runner.runCheckpoint(context, "fingerprint-sync-fail");

    assert.equal(result.kind, "hard_block");
    assert.equal(result.metadata.reason, "sync_failed");
    assert.equal(result.metadata.sync?.exitCode, 1);
    assert.equal(result.metadata.sync?.checkExitCode, undefined);
    assert.equal(checkRuns, 0);
  });

  test("runCheckpoint hard-blocks with timeout metadata after 30 seconds", async () => {
    let timeoutMs: number | undefined;
    let timeoutCallback: (() => void) | undefined;
    const runner = new KibiCheckpointRunner({
      runSync: async () => new Promise(() => {}),
      runCheck: async () => ({ exitCode: 0 }),
      setTimeoutFn: (fn, ms) => {
        timeoutCallback = fn;
        timeoutMs = ms;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeoutFn: () => {},
    });
    const context = createCheckpointContext();

    runner.requestCheckpoint(context, "fingerprint-timeout");
    const pending = runner.runCheckpoint(context, "fingerprint-timeout");
    await flushAsync();
    assert.equal(timeoutMs, 30_000);
    timeoutCallback?.();

    const result = await pending;

    assert.equal(result.kind, "hard_block");
    assert.equal(result.metadata.reason, "timeout");
    assert.equal(result.metadata.timeoutMs, 30_000);
    assert.equal(
      runner.isCheckpointPassed("fingerprint-timeout", context),
      false,
    );
  });

  test("runCheckpoint hard-blocks maintenance-degraded authoritative roots", async () => {
    let syncRuns = 0;
    const runner = new KibiCheckpointRunner({
      runSync: async () => {
        syncRuns += 1;
        return { exitCode: 0 };
      },
      runCheck: async () => ({ exitCode: 0 }),
    });
    const context = createCheckpointContext({ maintenanceDegraded: true });

    runner.requestCheckpoint(context, "fingerprint-degraded");
    const result = await runner.runCheckpoint(context, "fingerprint-degraded");

    assert.equal(result.kind, "hard_block");
    assert.equal(result.metadata.reason, "maintenance_degraded");
    assert.match(result.metadata.restoreInstructions ?? "", /restore/i);
    assert.equal(syncRuns, 0);
  });

  test("runCheckpoint skips non-authoritative roots", async () => {
    let syncRuns = 0;
    const runner = new KibiCheckpointRunner({
      runSync: async () => {
        syncRuns += 1;
        return { exitCode: 0 };
      },
      runCheck: async () => ({ exitCode: 0 }),
    });
    const context = createCheckpointContext({
      workContext: {
        worktreeRoot: path.join(process.cwd(), "vendor", "kibi"),
        kibiAuthorityRoot: process.cwd(),
        branch: "main",
        repoRelativePath: "vendor/kibi/packages/opencode/src/existing.ts",
        posture: "vendored_only",
        isAuthoritative: false,
        isLinkedWorktree: false,
        sessionId: "session-a",
        agentIdentity: "agent-a",
      },
    });

    const result = await runner.runCheckpoint(
      context,
      "fingerprint-non-authoritative",
    );

    assert.equal(result.kind, "skip");
    assert.equal(result.metadata.reason, "non_authoritative");
    assert.equal(syncRuns, 0);
  });

  test("isCheckpointPassed stays false before checkpoint and true after passed checkpoint", async () => {
    const runner = new KibiCheckpointRunner({
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: 0 }),
    });
    const context = createCheckpointContext();

    assert.equal(
      runner.isCheckpointPassed("fingerprint-before-after", context),
      false,
    );
    runner.requestCheckpoint(context, "fingerprint-before-after");
    await runner.runCheckpoint(context, "fingerprint-before-after");

    assert.equal(
      runner.isCheckpointPassed("fingerprint-before-after", context),
      true,
    );
  });

  test("passing one fingerprint does not pass another fingerprint", async () => {
    const runner = new KibiCheckpointRunner({
      runSync: async () => ({ exitCode: 0 }),
      runCheck: async () => ({ exitCode: 0 }),
    });
    const context = createCheckpointContext();

    runner.requestCheckpoint(context, "fingerprint-1");
    await runner.runCheckpoint(context, "fingerprint-1");

    assert.equal(runner.isCheckpointPassed("fingerprint-1", context), true);
    assert.equal(runner.isCheckpointPassed("fingerprint-2", context), false);
  });

  test("runCheckpoint does not pass when hard guidance was not requested for the fingerprint", async () => {
    let syncRuns = 0;
    const runner = new KibiCheckpointRunner({
      runSync: async () => {
        syncRuns += 1;
        return { exitCode: 0 };
      },
      runCheck: async () => ({ exitCode: 0 }),
    });
    const context = createCheckpointContext();

    const result = await runner.runCheckpoint(
      context,
      "fingerprint-without-guidance",
    );

    assert.equal(result.kind, "hard_block");
    assert.equal(result.metadata.reason, "checkpoint_not_requested");
    assert.equal(syncRuns, 0);
  });
});
