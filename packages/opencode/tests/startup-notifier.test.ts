import { describe, mock, test } from "bun:test";
import { strict as assert } from "node:assert";
import {
  type StartupNotifierClient,
  notifyStartup,
} from "../src/startup-notifier";

describe("notifyStartup", () => {
  test("uses toast capability when available", async () => {
    const toastCalls: unknown[] = [];
    const logCalls: unknown[] = [];
    const toast = async (payload: unknown) => {
      toastCalls.push(payload);
    };
    const log = async (payload: unknown) => {
      logCalls.push(payload);
    };
    const client = {
      tui: {
        showToast: toast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as unknown as StartupNotifierClient, {
      versions: { opencode: "1.2.3" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(toastCalls.length, 1);
    assert.equal(logCalls.length, 2);
    assert.deepEqual(toastCalls[0], {
      body: {
        variant: "success",
        title: "Kibi OpenCode",
        message: "kibi-opencode started (opencode v1.2.3)",
        duration: 4000,
      },
    });
    assert.deepEqual(logCalls[0], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        versions: { opencode: "1.2.3" },
        unknownVersions: ["mcp", "cli", "core"],
      },
    });
    assert.deepEqual(logCalls[1], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "startup toast delivered",
        transport: "sdk",
      },
    });
  });

  test("falls back to structured app log without console noise", async () => {
    const logCalls: unknown[] = [];
    const log = async (payload: unknown) => {
      logCalls.push(payload);
    };
    const consoleError = mock(() => {});
    const client = {
      app: {
        log,
      },
    };
    const consoleLog = mock(() => {});
    const consoleWarn = mock(() => {});
    const originalError = console.error;
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.error = consoleError;
    console.log = consoleLog;
    console.warn = consoleWarn;

    try {
      notifyStartup(client as unknown as StartupNotifierClient, {});
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(logCalls.length, 2);
      assert.equal(consoleLog.mock.calls.length, 0);
      assert.equal(consoleWarn.mock.calls.length, 0);
      assert.equal(consoleError.mock.calls.length, 0);
      assert.deepEqual(logCalls[0], {
        body: {
          service: "kibi-opencode",
          level: "info",
          message: "kibi-opencode started",
        },
      });
      assert.deepEqual(logCalls[1], {
        body: {
          service: "kibi-opencode",
          level: "info",
          message: "startup toast unavailable",
          reason: "missing-capability",
        },
      });
    } finally {
      console.error = originalError;
      console.log = originalLog;
      console.warn = originalWarn;
    }
  });

  test("suppresses toast but still logs structured startup when requested", async () => {
    const toastCalls: unknown[] = [];
    const logCalls: unknown[] = [];
    const toast = async (payload: unknown) => {
      toastCalls.push(payload);
    };
    const log = async (payload: unknown) => {
      logCalls.push(payload);
    };
    const client = {
      tui: {
        showToast: toast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as unknown as StartupNotifierClient, {
      versions: { opencode: "1.2.3" },
      suppressToast: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(toastCalls.length, 0);
    assert.equal(logCalls.length, 1);
    assert.deepEqual(logCalls[0], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        versions: { opencode: "1.2.3" },
        unknownVersions: ["mcp", "cli", "core"],
      },
    });
  });

  test("logs toast failures when toast rejects", async () => {
    const toast = async () => {
      throw new Error("boom");
    };
    const logCalls: unknown[] = [];
    const log = async (payload: unknown) => {
      logCalls.push(payload);
    };
    const originalError = console.error;
    const consoleError = mock(() => {});
    console.error = consoleError;
    const client = {
      tui: {
        showToast: toast,
      },
      app: {
        log,
      },
    };

    try {
      notifyStartup(client as unknown as StartupNotifierClient, {
        directory: "/tmp/worktree",
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(logCalls.length, 2);
      assert.deepEqual(logCalls[0], {
        body: {
          service: "kibi-opencode",
          level: "info",
          message: "kibi-opencode started",
          directory: "/tmp/worktree",
        },
      });
      assert.deepEqual(logCalls[1], {
        body: {
          service: "kibi-opencode",
          level: "warn",
          message: "startup toast delivery failed",
          transport: "sdk",
          reason: "rejected",
          error: "boom",
          directory: "/tmp/worktree",
        },
      });
    } finally {
      console.error = originalError;
    }
  });

  test("logs delivered result when toast succeeds", async () => {
    const toastCalls: unknown[] = [];
    const logCalls: unknown[] = [];
    const toast = async (payload: unknown) => {
      toastCalls.push(payload);
      return {
        status: "delivered" as const,
        transport: "sdk" as const,
      };
    };
    const log = async (payload: unknown) => {
      logCalls.push(payload);
    };
    const client = {
      tui: {
        showToast: toast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as unknown as StartupNotifierClient, {
      versions: { opencode: "1.2.3" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(toastCalls.length, 1);
    assert.equal(logCalls.length, 2);
    assert.deepEqual(toastCalls[0], {
      body: {
        variant: "success",
        title: "Kibi OpenCode",
        message: "kibi-opencode started (opencode v1.2.3)",
        duration: 4000,
      },
    });
    assert.deepEqual(logCalls[0], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        versions: { opencode: "1.2.3" },
        unknownVersions: ["mcp", "cli", "core"],
      },
    });
    assert.deepEqual(logCalls[1], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "startup toast delivered",
        transport: "sdk",
      },
    });
  });

  test("shows all four versions in toast when all present", async () => {
    const toastCalls: unknown[] = [];
    const logCalls: unknown[] = [];
    const toast = async (payload: unknown) => { toastCalls.push(payload); };
    const log = async (payload: unknown) => { logCalls.push(payload); };
    const client = { tui: { showToast: toast }, app: { log } };
    notifyStartup(client as unknown as StartupNotifierClient, {
      versions: { opencode: "1.0.0", mcp: "2.0.0", cli: "3.0.0", core: "4.0.0" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(toastCalls.length, 1);
    assert.deepEqual(toastCalls[0], {
      body: {
        variant: "success",
        title: "Kibi OpenCode",
        message: "kibi-opencode started (opencode v1.0.0, mcp v2.0.0, cli v3.0.0, core v4.0.0)",
        duration: 4000,
      },
    });
    assert.deepEqual(logCalls[0], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        versions: { opencode: "1.0.0", mcp: "2.0.0", cli: "3.0.0", core: "4.0.0" },
        unknownVersions: [],
      },
    });
  });

  test("shows partial versions in toast (only opencode and mcp)", async () => {
    const toastCalls: unknown[] = [];
    const logCalls: unknown[] = [];
    const toast = async (payload: unknown) => { toastCalls.push(payload); };
    const log = async (payload: unknown) => { logCalls.push(payload); };
    const client = { tui: { showToast: toast }, app: { log } };
    notifyStartup(client as unknown as StartupNotifierClient, {
      versions: { opencode: "1.0.0", mcp: "2.0.0" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(toastCalls.length, 1);
    assert.deepEqual(toastCalls[0], {
      body: {
        variant: "success",
        title: "Kibi OpenCode",
        message: "kibi-opencode started (opencode v1.0.0, mcp v2.0.0)",
        duration: 4000,
      },
    });
    assert.deepEqual(logCalls[0], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        versions: { opencode: "1.0.0", mcp: "2.0.0" },
        unknownVersions: ["cli", "core"],
      },
    });
  });
});
