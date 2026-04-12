// @ts-nocheck
import { describe, expect, mock, test } from "bun:test";
import { notifyStartup } from "../src/startup-notifier";

describe("notifyStartup", () => {
  test("uses runtime toast capability when available", async () => {
    const toast = mock((payload: unknown) => payload);
    const client = {
      tui: {
        toast,
      },
      app: {
        log: mock(async () => {}),
      },
    };

    notifyStartup(client as never, { version: "1.2.3" });

    expect(toast).toHaveBeenCalledTimes(1);
    expect(client.app.log).not.toHaveBeenCalled();
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
      notifyStartup(client as never, { version: "1.2.3" });

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
});
