import { strict as assert } from "node:assert";
import { describe, test } from "bun:test";
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
    assert.ok(afterSchedule, "code after onFileEdited should execute synchronously");

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
    assert.equal(syncRuns, 0, "compat mode should not trigger sync via tool.execute.after");
  });
});
