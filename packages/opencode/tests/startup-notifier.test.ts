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
        toast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as unknown as StartupNotifierClient, {
      version: "1.2.3",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(toastCalls.length, 1);
    assert.equal(logCalls.length, 2);
    assert.deepEqual(toastCalls[0], {
      variant: "success",
      title: "Kibi OpenCode",
      message: "kibi-opencode started",
      duration: 4000,
    });
    assert.deepEqual(logCalls[0], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        version: "1.2.3",
      },
    });
    assert.deepEqual(logCalls[1], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "startup toast result",
        result: "undefined",
      },
    });
  });

  test("falls back to structured app log without console noise", async () => {
    const logCalls: unknown[] = [];
    const log = async (payload: unknown) => {
      logCalls.push(payload);
    };
    const client = {
      app: {
        log,
      },
    };
    const consoleLog = mock(() => {});
    const consoleWarn = mock(() => {});
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = consoleLog;
    console.warn = consoleWarn;

    try {
      notifyStartup(client as unknown as StartupNotifierClient, {
        version: "1.2.3",
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(logCalls.length, 2);
      assert.equal(consoleLog.mock.calls.length, 0);
      assert.equal(consoleWarn.mock.calls.length, 0);
      assert.deepEqual(logCalls[0], {
        body: {
          service: "kibi-opencode",
          level: "info",
          message: "kibi-opencode started",
          version: "1.2.3",
        },
      });
      assert.deepEqual(logCalls[1], {
        body: {
          service: "kibi-opencode",
          level: "info",
          message: "startup toast result",
          result: "undefined",
        },
      });
      assert.equal(consoleLog.mock.calls.length, 0);
      assert.equal(consoleWarn.mock.calls.length, 0);
      assert.deepEqual(logCalls[0], {
        body: {
          service: "kibi-opencode",
          level: "info",
          message: "kibi-opencode started",
          version: "1.2.3",
        },
      });
    } finally {
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
        toast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as unknown as StartupNotifierClient, {
      version: "1.2.3",
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
        version: "1.2.3",
      },
    });
  });

  test("logs toast failures when toast rejects", async () => {
    const toast = async () => {
      throw new Error("boom");
    };
    const logCalls: unknown[] = [];
    const consoleErrorCalls: unknown[][] = [];
    const log = async (payload: unknown) => {
      logCalls.push(payload);
    };
    const consoleError = (...args: unknown[]) => {
      consoleErrorCalls.push(args);
    };
    const originalError = console.error;
    console.error = consoleError;
    const client = {
      tui: {
        toast,
      },
      app: {
        log,
      },
    };

    try {
      notifyStartup(client as StartupNotifierClient, {
        directory: "/tmp/worktree",
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(logCalls.length, 2);
      assert.equal(consoleErrorCalls.length, 1);
      assert.equal(
        consoleErrorCalls[0]?.[0],
        "[kibi-opencode] startup toast failed:",
      );
      assert.ok(consoleErrorCalls[0]?.[1] instanceof Error);
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
          message: "startup toast failed",
          error: "Error: boom",
          directory: "/tmp/worktree",
        },
      });
    } finally {
      console.error = originalError;
    }
  });

  test("logs boolean toast result when toast resolves to true", async () => {
    const toastCalls: unknown[] = [];
    const logCalls: unknown[] = [];
    const toast = async (payload: unknown) => {
      toastCalls.push(payload);
      return true;
    };
    const log = async (payload: unknown) => {
      logCalls.push(payload);
    };
    const client = {
      tui: {
        toast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as unknown as StartupNotifierClient, {
      version: "1.2.3",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(toastCalls.length, 1);
    assert.equal(logCalls.length, 2);
    assert.deepEqual(logCalls[0], {
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        version: "1.2.3",
      },
    });
  });
});
