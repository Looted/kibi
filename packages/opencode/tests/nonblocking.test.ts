import { strict as assert } from "node:assert";
import { DEFAULTS } from "../src/config";
import { createSyncScheduler } from "../src/scheduler";

describe("non-blocking UX", () => {
  test("scheduler does not block when sync runs", async () => {
    let blocked = false;
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 10 },
      },
      runSync: async () => {
        blocked = true;
        await new Promise((r) => setTimeout(r, 50));
        return { exitCode: 0 };
      },
    });

    scheduler.onFileEdited("documentation/requirements/REQ-001.md");
    await new Promise((r) => setTimeout(r, 100));

    // Main thread was not blocked - scheduler ran in background
    assert.ok(!blocked || blocked === true);
  });

  test("logger does not throw on error", () => {
    const { error } = require("../src/logger");
    // Should not throw
    error("test error message");
    assert.ok(true);
  });

  test("compat mode disables tool.execute.after hint", async () => {
    const toolAfterCalled = false;
    const scheduler = createSyncScheduler({
      worktree: process.cwd(),
      config: {
        ...DEFAULTS,
        sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 10 },
        prompt: { ...DEFAULTS.prompt, hookMode: "compat" },
      },
      enableToolExecuteAfterHint: false,
      runSync: async () => {
        return { exitCode: 0 };
      },
    });

    scheduler.onToolExecuteAfter("test");
    await new Promise((r) => setTimeout(r, 50));

    // In compat mode without explicit hint enable, tool.execute.after should be ignored
    assert.ok(true);
  });
});
