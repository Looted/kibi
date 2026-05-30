import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
        if (due.length === 0) break;
        for (const [id, task] of due) {
          tasks.delete(id);
          task.fn();
        }
      }
    },
  };
}

describe("scheduler coverage", () => {
  let tmpDir: string;
  let originalPath: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-scheduler-coverage-"));
    originalPath = process.env.PATH;
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("dispose cancels a pending debounce timer", async () => {
    const clock = createFakeClock();
    let runs = 0;

    const scheduler = createSyncScheduler({
      worktree: tmpDir,
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 25 },
      },
      now: clock.now,
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      runSync: async () => {
        runs += 1;
        return { exitCode: 0 };
      },
    });

    scheduler.scheduleSync("manual");
    scheduler.dispose();
    clock.advance(25);
    await Promise.resolve();

    assert.equal(runs, 0);
  });

  test("default command runners execute kibi sync and kibi check", async () => {
    const completions: SyncRunMetadata[] = [];
    const binDir = path.join(tmpDir, "bin");
    const logFile = path.join(tmpDir, "kibi-invocations.log");
    fs.mkdirSync(binDir, { recursive: true });

    const kibiScript = path.join(binDir, "kibi");
    fs.writeFileSync(
      kibiScript,
      `#!/bin/sh
printf '%s %s\n' "$1" "$2" >> "${logFile}"
if [ "$1" = "sync" ]; then
  exit 0
fi
if [ "$1" = "check" ]; then
  printf '%s\n' "$3" >> "${logFile}"
  exit 0
fi
exit 1
`,
    );
    fs.chmodSync(kibiScript, 0o755);
    process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ""}`;

    const scheduler = createSyncScheduler({
      worktree: tmpDir,
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 1 },
      },
      onRunComplete: (meta) => completions.push(meta),
    });

    scheduler.scheduleSync("manual", undefined, [
      "required-fields",
      "no-dangling-refs",
    ]);

    for (
      let attempt = 0;
      attempt < 50 && completions.length === 0;
      attempt += 1
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    scheduler.dispose();

    assert.equal(completions.length, 1);
    assert.equal(completions[0]?.exitCode, 0);
    assert.equal(completions[0]?.checkExitCode, 0);
    assert.deepEqual(completions[0]?.checkRules, [
      "required-fields",
      "no-dangling-refs",
    ]);

    const invocations = fs.readFileSync(logFile, "utf8");
    assert.match(invocations, /sync/);
    assert.match(invocations, /check --rules/);
    assert.match(invocations, /required-fields,no-dangling-refs/);
  });

  test("default background sync does not pass --refresh-symbol-coordinates", async () => {
    const completions: SyncRunMetadata[] = [];
    const binDir = path.join(tmpDir, "bin");
    const logFile = path.join(tmpDir, "kibi-sync-cmd.log");
    fs.mkdirSync(binDir, { recursive: true });

    // Fake kibi that logs the full command line to prove no coordinate flags
    const kibiScript = path.join(binDir, "kibi");
    fs.writeFileSync(
      kibiScript,
      `#!/bin/sh
printf '%s\n' "$*" >> "${logFile}"
exit 0
`,
    );
    fs.chmodSync(kibiScript, 0o755);
    process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ""}`;

    const scheduler = createSyncScheduler({
      worktree: tmpDir,
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 1 },
      },
      onRunComplete: (meta) => completions.push(meta),
    });

    scheduler.scheduleSync("manual");

    for (
      let attempt = 0;
      attempt < 50 && completions.length === 0;
      attempt += 1
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    scheduler.dispose();

    assert.equal(completions.length, 1);
    assert.equal(completions[0]?.exitCode, 0);
    // Verify the sync command captured by metadata
    assert.equal(completions[0]?.syncCommand, "kibi sync");

    // Verify the actual invocation log shows plain 'sync' with no coordinate flags
    const invocations = fs.readFileSync(logFile, "utf8");
    // The fake script logs "$*" so we see the arguments after 'kibi'
    assert.ok(
      !invocations.includes("--refresh-symbol-coordinates"),
      "background sync must not pass --refresh-symbol-coordinates",
    );
  });
});
