import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";

// implements REQ-opencode-kibi-plugin-v1

describe("logging policy", () => {
  let logCalls: Array<{ service: string; level: string; message: string }>;
  let errorCalls: string[];
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const logger = require("../src/logger") as {
    setClient: (client: any) => void;
    resetClient: () => void;
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };

  beforeEach(() => {
    logCalls = [];
    errorCalls = [];
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    // Spy on console methods to ensure they are NOT called (info/warn)
    // or called exactly once (error)
    (console as any).log = (...args: unknown[]) => {
      logCalls.push({
        service: "console.log",
        level: "unexpected",
        message: args.map(String).join(" "),
      });
    };
    (console as any).warn = (...args: unknown[]) => {
      logCalls.push({
        service: "console.warn",
        level: "unexpected",
        message: args.map(String).join(" "),
      });
    };
    (console as any).error = (...args: unknown[]) => {
      errorCalls.push(args.map(String).join(" "));
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    logger.resetClient();
  });

  describe("info and warn use client.app.log()", () => {
    test("info sends structured log via client.app.log()", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];

      logger.setClient({
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      logger.info("test info message");

      // Wait for async log calls
      await new Promise((r) => setTimeout(r, 10));

      assert.equal(
        appLogCalls.length,
        1,
        "should call client.app.log exactly once for info",
      );
      const body = appLogCalls[0].body as Record<string, unknown>;
      assert.equal(body.service, "kibi-opencode");
      assert.equal(body.level, "info");
      assert.equal(body.message, "test info message");
    });

    test("info does NOT call console.log", async () => {
      logger.setClient({
        app: {
          log: async () => {},
        },
      });

      logger.info("should not use console.log");

      await new Promise((r) => setTimeout(r, 10));

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      assert.equal(consoleLogCalls.length, 0, "info must not call console.log");
    });

    test("warn sends structured log via client.app.log()", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];

      logger.setClient({
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      logger.warn("test warn message");

      await new Promise((r) => setTimeout(r, 10));

      assert.equal(
        appLogCalls.length,
        1,
        "should call client.app.log exactly once for warn",
      );
      const body = appLogCalls[0].body as Record<string, unknown>;
      assert.equal(body.service, "kibi-opencode");
      assert.equal(body.level, "warn");
      assert.equal(body.message, "test warn message");
    });

    test("warn does NOT call console.warn", async () => {
      logger.setClient({
        app: {
          log: async () => {},
        },
      });

      logger.warn("should not use console.warn");

      await new Promise((r) => setTimeout(r, 10));

      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        "warn must not call console.warn",
      );
    });
  });

  describe("error uses console.error with prefix", () => {
    test("error emits exactly one prefixed console.error", () => {
      logger.error("test error message");

      assert.equal(
        errorCalls.length,
        1,
        "should call console.error exactly once",
      );
      assert.ok(
        errorCalls[0].includes("[kibi-opencode]"),
        "error output must contain [kibi-opencode] prefix",
      );
      assert.ok(
        errorCalls[0].includes("test error message"),
        "error output must contain the message",
      );
    });

    test("error does NOT call console.log or console.warn", () => {
      logger.error("should not use console.log or console.warn");

      assert.equal(
        logCalls.length,
        0,
        "error must not call console.log or console.warn",
      );
    });
  });

  describe("backward compatibility without client", () => {
    test("info falls back gracefully when no client set", () => {
      // No client set - should still work without throwing
      assert.doesNotThrow(() => logger.info("fallback info"));
    });

    test("warn falls back gracefully when no client set", () => {
      assert.doesNotThrow(() => logger.warn("fallback warn"));
    });
  });
});
