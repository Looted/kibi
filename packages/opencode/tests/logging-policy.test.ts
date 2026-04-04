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
    info: (msg: string, metadata?: Record<string, unknown>) => void;
    warn: (msg: string, metadata?: Record<string, unknown>) => void;
    error: (msg: string, metadata?: Record<string, unknown>) => void;
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

    test("info includes structured metadata fields", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];

      logger.setClient({
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      logger.info("smart-enforcement.posture", {
        event: "smart_enforcement_posture",
        posture: "root_active",
        cache_hit: false,
      });

      await new Promise((r) => setTimeout(r, 10));

      const body = appLogCalls[0].body as Record<string, unknown>;
      assert.equal(body.event, "smart_enforcement_posture");
      assert.equal(body.posture, "root_active");
      assert.equal(body.cache_hit, false);
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

    test("error includes structured metadata for client logs", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];

      logger.setClient({
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      logger.error("test error message", {
        event: "smart_enforcement_degraded",
        posture: "vendored_only",
      });

      await new Promise((r) => setTimeout(r, 10));

      const body = appLogCalls[0].body as Record<string, unknown>;
      assert.equal(body.level, "error");
      assert.equal(body.event, "smart_enforcement_degraded");
      assert.equal(body.posture, "vendored_only");
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

  // implements REQ-opencode-kibi-plugin-v1
  describe("scheduler silence policy", () => {
    test("scheduler sync produces zero console.log/warn output", async () => {
      const scheduler = require("../src/scheduler") as {
        createSyncScheduler: (opts: any) => any;
      };
      const { DEFAULTS } = require("../src/config");

      logger.setClient({
        app: {
          log: async () => {},
        },
      });

      const sched = scheduler.createSyncScheduler({
        worktree: process.cwd(),
        config: {
          ...DEFAULTS,
          sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 5 },
        },
        runSync: async () => ({ exitCode: 0 }),
      });

      sched.onFileEdited("documentation/requirements/REQ-001.md");
      await new Promise((r) => setTimeout(r, 50));

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );

      assert.equal(
        consoleLogCalls.length,
        0,
        "scheduler must not call console.log",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        "scheduler must not call console.warn",
      );
    });

    test("scheduler check failure produces zero console.log/warn output", async () => {
      const scheduler = require("../src/scheduler") as {
        createSyncScheduler: (opts: any) => any;
      };
      const { DEFAULTS } = require("../src/config");

      logger.setClient({
        app: {
          log: async () => {},
        },
      });

      const sched = scheduler.createSyncScheduler({
        worktree: process.cwd(),
        config: {
          ...DEFAULTS,
          sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 5 },
        },
        runSync: async () => ({ exitCode: 0 }),
        runCheck: async () => ({ exitCode: 1 }),
      });

      sched.scheduleSync(
        "file.edited",
        "documentation/requirements/REQ-001.md",
        ["required-fields"],
      );
      await new Promise((r) => setTimeout(r, 50));

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );

      assert.equal(
        consoleLogCalls.length,
        0,
        "scheduler check failure must not call console.log",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        "scheduler check failure must not call console.warn",
      );
    });
  });

  // implements REQ-opencode-kibi-plugin-v1
  describe("session-summary silence policy", () => {
    test("logSummary produces zero console.log/warn output", () => {
      const { SessionTracker } = require("../src/session-tracker") as {
        SessionTracker: new () => any;
      };

      logger.setClient({
        app: {
          log: async () => {},
        },
      });

      const tracker = new SessionTracker();
      tracker.recordWarning("kb-edit", "/file1.ts", "W1");
      tracker.recordWarning("kb-edit", "/file2.ts", "W2");
      tracker.recordWarning("kb-edit", "/file3.ts", "W3");
      tracker.logSummary();

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );

      assert.equal(
        consoleLogCalls.length,
        0,
        "logSummary must not call console.log",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        "logSummary must not call console.warn",
      );
    });

    test("recordWarning produces zero console.log/warn output", () => {
      const { SessionTracker } = require("../src/session-tracker") as {
        SessionTracker: new () => any;
      };

      logger.setClient({
        app: {
          log: async () => {},
        },
      });

      const tracker = new SessionTracker();
      tracker.recordWarning("missing-traceability", "/file.ts", "Test");
      tracker.recordWarning("bootstrap-needed", "/file.ts", "Bootstrap");
      tracker.recordWarning("kb-edit", "/file.ts", "KB edit");

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );

      assert.equal(
        consoleLogCalls.length,
        0,
        "recordWarning must not call console.log",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        "recordWarning must not call console.warn",
      );
    });

    test("empty logSummary produces zero console.log/warn output", () => {
      const { SessionTracker } = require("../src/session-tracker") as {
        SessionTracker: new () => any;
      };

      logger.setClient({
        app: {
          log: async () => {},
        },
      });

      const tracker = new SessionTracker();
      tracker.logSummary();

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );

      assert.equal(
        consoleLogCalls.length,
        0,
        "empty logSummary must not call console.log",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        "empty logSummary must not call console.warn",
      );
    });
  });

  // implements REQ-opencode-kibi-plugin-v1
  describe(".kb edit and comment-hint silence policy", () => {
    test(".kb edit detection produces zero console.log/warn output", async () => {
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-kb-edit-silence-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify({ enabled: true, sync: { enabled: false } }, null, 2),
      );

      logger.setClient({ app: { log: async () => {} } });

      const hooks = await plugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: { app: { log: async () => {} } },
      });

      assert.ok(hooks.event, "event hook should exist");
      await hooks.event({
        event: {
          type: "file.edited",
          properties: { file: ".kb/config.json" },
        },
      });

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );

      assert.equal(
        consoleLogCalls.length,
        0,
        ".kb edit must not call console.log",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        ".kb edit must not call console.warn",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });

    test("comment-analysis hint produces zero console.log/warn output", async () => {
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-comment-hint-silence-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: false },
            guidance: { commentDetection: { enabled: true, minLines: 3 } },
          },
          null,
          2,
        ),
      );

      // Create Python file with durable-knowledge docstring
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "models.py"),
        [
          `"""`,
          `User accounts must have unique email addresses.`,
          `Each user can have at most 5 active sessions.`,
          `Sessions expire after 30 minutes of inactivity.`,
          `"""`,
          ``,
          `class User:`,
          `    pass`,
          ``,
        ].join("\n"),
      );

      logger.setClient({ app: { log: async () => {} } });

      const hooks = await plugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: { app: { log: async () => {} } },
      });

      assert.ok(hooks.event, "event hook should exist");
      await hooks.event({
        event: {
          type: "file.edited",
          properties: { file: "src/models.py" },
        },
      });

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );

      assert.equal(
        consoleLogCalls.length,
        0,
        "comment hint must not call console.log",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        "comment hint must not call console.warn",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });

    test(".kb edit routes through structured warn channel", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-kb-edit-channel-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify({ enabled: true, sync: { enabled: false } }, null, 2),
      );

      const mockClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      };

      const hooks = await plugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: mockClient,
      });

      assert.ok(hooks.event, "event hook should exist");
      await hooks.event({
        event: {
          type: "file.edited",
          properties: { file: ".kb/config.json" },
        },
      });

      await new Promise((r) => setTimeout(r, 10));

      const warnLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return (
          body.level === "warn" &&
          typeof body.message === "string" &&
          body.message.includes(".kb edit detected")
        );
      });

      assert.ok(
        warnLogs.length >= 1,
        ".kb edit detection must emit structured warn log",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });

    test("comment-analysis hint routes through structured warn channel", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-comment-hint-channel-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: false },
            guidance: { commentDetection: { enabled: true, minLines: 3 } },
          },
          null,
          2,
        ),
      );

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "models.py"),
        [
          `"""`,
          `User accounts must have unique email addresses.`,
          `Each user can have at most 5 active sessions.`,
          `Sessions expire after 30 minutes of inactivity.`,
          `"""`,
          ``,
          `class User:`,
          `    pass`,
          ``,
        ].join("\n"),
      );

      const mockClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      };

      const hooks = await plugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: mockClient,
      });

      assert.ok(hooks.event, "event hook should exist");
      await hooks.event({
        event: {
          type: "file.edited",
          properties: { file: "src/models.py" },
        },
      });

      await new Promise((r) => setTimeout(r, 10));

      const warnLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return (
          body.level === "warn" &&
          typeof body.message === "string" &&
          body.message.includes("detected durable")
        );
      });

      assert.ok(
        warnLogs.length >= 1,
        "comment-analysis hint must emit structured warn log",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });
  });
});
