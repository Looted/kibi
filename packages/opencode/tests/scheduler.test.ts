import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { DEFAULTS } from "../src/config";
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

describe("sync scheduler", () => {
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

    scheduler.onFileEdited("documentation/requirements/REQ-001.md");
    clock.advance(20);
    scheduler.onFileEdited("documentation/requirements/REQ-001.md");
    clock.advance(20);
    scheduler.onFileEdited("documentation/requirements/REQ-001.md");

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

    scheduler.onFileEdited("documentation/requirements/REQ-002.md");
    clock.advance(100);
    await flushAsync();
    assert.equal(runs.length, 1);

    scheduler.onFileEdited("documentation/requirements/REQ-003.md");
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

    scheduler.onFileEdited("documentation/requirements/REQ-004.md");
    scheduler.onToolExecuteAfter();

    clock.advance(100);
    await flushAsync();
    assert.equal(runs, 1);
  });
});
