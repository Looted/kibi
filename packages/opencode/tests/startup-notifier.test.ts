import { describe, expect, mock, test } from "bun:test";
import {
  type StartupNotifierClient,
  notifyStartup,
} from "../src/startup-notifier";

describe("notifyStartup", () => {
  test("uses server-plugin showToast capability when available", async () => {
    const showToast = mock((payload: unknown) => payload);
    const log = mock(async () => {});
    const client = {
      tui: {
        showToast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as StartupNotifierClient, { version: "1.2.3" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(client.app.log).toHaveBeenCalledTimes(2);
    expect(showToast.mock.calls[0]?.[0]).toEqual({
      body: {
        variant: "success",
        title: "Kibi OpenCode",
        message: "kibi-opencode started",
        duration: 4000,
      },
    });
    expect(log.mock.calls[0]?.[0]).toEqual({
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        version: "1.2.3",
      },
    });
    expect(log.mock.calls[1]?.[0]).toEqual({
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "startup toast result",
        result: "[object Object]",
      },
    });
  });

  test("falls back to legacy runtime toast capability when available", async () => {
    const toast = mock((payload: unknown) => payload);
    const log = mock(async () => {});
    const client = {
      tui: {
        toast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as StartupNotifierClient, { version: "1.2.3" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(toast).toHaveBeenCalledTimes(1);
    expect(client.app.log).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0]?.[0]).toEqual({
      variant: "success",
      title: "Kibi OpenCode",
      message: "kibi-opencode started",
      duration: 4000,
    });
    expect(log.mock.calls[0]?.[0]).toEqual({
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        version: "1.2.3",
      },
    });
  });

  test("falls back to structured app log without console noise", async () => {
    const log = mock(async () => {});
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
      notifyStartup(client as StartupNotifierClient, { version: "1.2.3" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(log).toHaveBeenCalledTimes(1);
      expect(consoleLog).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(log.mock.calls[0]?.[0]).toEqual({
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
    const showToast = mock((payload: unknown) => payload);
    const log = mock(async () => {});
    const client = {
      tui: {
        showToast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as StartupNotifierClient, {
      version: "1.2.3",
      suppressToast: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showToast).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toEqual({
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        version: "1.2.3",
      },
    });
  });

  test("logs toast failures when showToast rejects", async () => {
    const showToast = mock(async () => {
      throw new Error("boom");
    });
    const log = mock(async () => {});
    const consoleError = mock(() => {});
    const originalError = console.error;
    console.error = consoleError;
    const client = {
      tui: {
        showToast,
      },
      app: {
        log,
      },
    };

    try {
      notifyStartup(client as StartupNotifierClient, { directory: "/tmp/worktree" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(showToast).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledTimes(2);
      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError.mock.calls[0]).toEqual([
        "[kibi-opencode] startup toast failed:",
        expect.any(Error),
      ]);
      expect(log.mock.calls[0]?.[0]).toEqual({
        body: {
          service: "kibi-opencode",
          level: "info",
          message: "kibi-opencode started",
          directory: "/tmp/worktree",
        },
      });
      expect(log.mock.calls[1]?.[0]).toEqual({
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

  test("logs boolean toast result when showToast resolves to true", async () => {
    const showToast = mock(async () => true);
    const log = mock(async () => {});
    const client = {
      tui: {
        showToast,
      },
      app: {
        log,
      },
    };

    notifyStartup(client as StartupNotifierClient, { version: "1.2.3" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0]?.[0]).toEqual({
      body: {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
        version: "1.2.3",
      },
    });
  });
});
