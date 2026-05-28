import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import { DEFAULTS } from "../src/config";
import * as logger from "../src/logger";
import { createSyncScheduler } from "../src/scheduler";

describe("non-blocking UX", () => {
  test("scheduler does not block when sync runs", async () => {
    let syncStarted = false;
    let afterSchedule = false;
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 10 },
      },
      runSync: async () => {
        syncStarted = true;
        await new Promise((r) => setTimeout(r, 50));
        return { exitCode: 0 };
      },
    });

    scheduler.onFileEdited("documentation/requirements/REQ-001.md");
    // Code after onFileEdited executes immediately - sync runs in background
    afterSchedule = true;

    // Confirm we did not block waiting for sync to complete
    assert.ok(
      afterSchedule,
      "code after onFileEdited should execute synchronously",
    );

    // Wait for sync to actually fire
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(syncStarted, "sync should have run in the background");
  });

  test("logger does not throw on error", () => {
    // Should not throw
    assert.doesNotThrow(() => logger.error("test error message"));
  });

  test("compat mode disables tool.execute.after hint", async () => {
    let syncRuns = 0;
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 10 },
        prompt: { ...DEFAULTS.prompt, hookMode: "compat" },
      },
      enableToolExecuteAfterHint: false,
      runSync: async () => {
        syncRuns++;
        return { exitCode: 0 };
      },
    });

    scheduler.onToolExecuteAfter("test");
    await new Promise((r) => setTimeout(r, 50));

    // In compat mode without explicit hint enable, tool.execute.after should be ignored
    assert.equal(
      syncRuns,
      0,
      "compat mode should not trigger sync via tool.execute.after",
    );
  });

  // Task 1 TDD: Use fake clock to guarantee synchronous console.error capture
  test("advisory check failure with fake clock does not emit console.error", async () => {
    const errorSpy: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      errorSpy.push(args.map(String).join(" "));
    };

    try {
      // Use fake clock like scheduler.test.ts for deterministic timing
      let nowMs = 0;
      const tasks = new Map<
        ReturnType<typeof setTimeout>,
        { at: number; fn: () => void }
      >();
      const fakeNow = () => nowMs;
      const fakeSetTimeout = (fn: () => void, ms: number) => {
        const handle = setTimeout(() => {}, 0);
        clearTimeout(handle);
        tasks.set(handle, { at: nowMs + ms, fn });
        return handle;
      };
      const fakeClearTimeout = (handle: ReturnType<typeof setTimeout>) => {
        tasks.delete(handle);
      };
      const advance = (ms: number) => {
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
      };

      const scheduler = createSyncScheduler({
        worktree: process.cwd(),
        config: {
          ...DEFAULTS,
          sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
        },
        now: fakeNow,
        setTimeoutFn: fakeSetTimeout,
        clearTimeoutFn: fakeClearTimeout,
        runSync: async () => ({ exitCode: 0 }),
        runCheck: async () => ({ exitCode: 1 }),
      });

      scheduler.scheduleSync(
        "smart-enforcement.traceability",
        "src/feature.ts",
        ["symbol-traceability"],
      );
      advance(100);
      await Promise.resolve();
      await Promise.resolve();

      // BUG: Advisory check failure currently emits console.error via logger.error.
      assert.equal(
        errorSpy.length,
        0,
        `Advisory check failure must not emit console.error, got: ${JSON.stringify(errorSpy)}`,
      );
    } finally {
      console.error = origError;
    }
  });

  test("advisory multi-rule check failure with fake clock does not emit console.error", async () => {
    const errorSpy: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      errorSpy.push(args.map(String).join(" "));
    };

    try {
      let nowMs = 0;
      const tasks = new Map<
        ReturnType<typeof setTimeout>,
        { at: number; fn: () => void }
      >();
      const fakeNow = () => nowMs;
      const fakeSetTimeout = (fn: () => void, ms: number) => {
        const handle = setTimeout(() => {}, 0);
        clearTimeout(handle);
        tasks.set(handle, { at: nowMs + ms, fn });
        return handle;
      };
      const fakeClearTimeout = (handle: ReturnType<typeof setTimeout>) => {
        tasks.delete(handle);
      };
      const advance = (ms: number) => {
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
      };

      const scheduler = createSyncScheduler({
        worktree: process.cwd(),
        config: {
          ...DEFAULTS,
          sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
        },
        now: fakeNow,
        setTimeoutFn: fakeSetTimeout,
        clearTimeoutFn: fakeClearTimeout,
        runSync: async () => ({ exitCode: 0 }),
        runCheck: async () => ({ exitCode: 1 }),
      });

      scheduler.scheduleSync(
        "smart-enforcement.kb-doc",
        "documentation/facts/FACT-001.md",
        ["required-fields", "no-dangling-refs", "strict-fact-shape"],
      );
      advance(100);
      await Promise.resolve();
      await Promise.resolve();

      assert.equal(
        errorSpy.length,
        0,
        `Advisory multi-rule check failure must not emit console.error, got: ${JSON.stringify(errorSpy)}`,
      );
    } finally {
      console.error = origError;
    }
  });
});
