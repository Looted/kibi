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
  const logger = require("../src/logger") as typeof import("../src/logger");

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

  // implements REQ-opencode-smart-enforcement-v1
  describe("completion reminder silence policy", () => {
    test("completion reminder produces zero console.log/warn output", async () => {
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-reminder-silence-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: { enabled: true, hookMode: "auto" },
            sync: { enabled: false },
            guidance: {
              smartEnforcement: { completionReminder: true },
            },
          },
          null,
          2,
        ),
      );

      // Create code file
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "foo.ts"),
        "export function hello() { return 42; }\n",
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
          properties: { file: "src/foo.ts" },
        },
      });

      // Also trigger the transform hook which emits the reminder log
      if (hooks["experimental.chat.system.transform"]) {
        await hooks["experimental.chat.system.transform"](
          {},
          { system: ["prompt"] },
        );
      }

      const consoleLogCalls = logCalls.filter(
        (c) => c.service === "console.log",
      );
      const consoleWarnCalls = logCalls.filter(
        (c) => c.service === "console.warn",
      );

      assert.equal(
        consoleLogCalls.length,
        0,
        "completion reminder must not call console.log",
      );
      assert.equal(
        consoleWarnCalls.length,
        0,
        "completion reminder must not call console.warn",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });

    test("completion reminder routes through structured info channel", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-reminder-channel-"),
      );
      // Ensure KB is initialized so posture is root_active and risky guidance can include reminder
      // Ensure KB is initialized so posture is root_active and risky guidance can include reminder
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );
      // Create default KB directories so targets resolve and posture becomes root_active
      [
        "documentation/requirements",
        "documentation/scenarios",
        "documentation/tests",
        "documentation/adr",
        "documentation/flags",
        "documentation/events",
        "documentation/facts",
      ].forEach((dir) =>
        fs.mkdirSync(path.join(tmpDir, dir), { recursive: true }),
      );
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "symbols.yaml"),
        "\n",
      );

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "foo.ts"),
        "export function hello() { return 42; }\n",
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
          properties: { file: "src/foo.ts" },
        },
      });

      // Trigger the transform hook which conditionally emits the reminder log
      if (hooks["experimental.chat.system.transform"]) {
        await hooks["experimental.chat.system.transform"](
          {},
          { system: ["prompt"] },
        );
      }

      await new Promise((r) => setTimeout(r, 20));

      // Check if any info log contains the completion reminder event
      const reminderLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_completion_reminder";
      });

      // Reminder should be emitted via structured info log for risky code edits
      assert.ok(
        reminderLogs.length >= 1,
        "completion reminder should emit structured log for risky code edit",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });

    test("no completion reminder log for safe_docs_only edit", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-reminder-safe-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: { enabled: true, hookMode: "auto" },
            sync: { enabled: false },
            guidance: {
              smartEnforcement: { completionReminder: true },
            },
          },
          null,
          2,
        ),
      );

      fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test\n");

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
          properties: { file: "README.md" },
        },
      });

      if (hooks["experimental.chat.system.transform"]) {
        await hooks["experimental.chat.system.transform"](
          {},
          { system: ["prompt"] },
        );
      }

      await new Promise((r) => setTimeout(r, 20));

      const reminderLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_completion_reminder";
      });

      assert.equal(
        reminderLogs.length,
        0,
        "Should NOT emit completion reminder log for safe_docs_only",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });
  });
  // implements REQ-opencode-kibi-plugin-v1
  describe("failure-routing contract: advisory vs operational", () => {
    test("errorStructuredOnly with client: does NOT call console.error", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];

      logger.setClient({
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      logger.errorStructuredOnly("scheduler.check.failed", {
        event: "scheduler_check_failed",
        exitCode: 1,
      });

      await new Promise((r) => setTimeout(r, 10));

      // Advisory: MUST NOT call console.error when client is bound
      assert.equal(
        errorCalls.length,
        0,
        "errorStructuredOnly must not call console.error when client is bound",
      );

      // Must route through client.app.log
      assert.equal(appLogCalls.length, 1);
      const body = appLogCalls[0].body as Record<string, unknown>;
      assert.equal(body.level, "error");
      assert.equal(body.message, "scheduler.check.failed");
      assert.equal(body.event, "scheduler_check_failed");
    });

    test("errorStructuredOnly without client: is completely silent (no console.error)", () => {
      logger.resetClient();
      logger.errorStructuredOnly("advisory-no-client");

      // Advisory: MUST NOT call console.error even without client
      assert.equal(errorCalls.length, 0, "errorStructuredOnly must not call console.error without client");
    });

    test("error (operational) with client: calls both console.error and client.app.log", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];

      logger.setClient({
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      logger.error("bootstrap-needed", { event: "workspace_bootstrap_needed" });

      await new Promise((r) => setTimeout(r, 10));

      // Operational: MUST call console.error
      assert.equal(errorCalls.length, 1, "operational error must call console.error");
      assert.ok(errorCalls[0].includes("bootstrap-needed"));

      // AND structured log
      assert.equal(appLogCalls.length, 1);
      const body = appLogCalls[0].body as Record<string, unknown>;
      assert.equal(body.level, "error");
      assert.equal(body.event, "workspace_bootstrap_needed");
    });
  });

  // Task 1 TDD: Advisory check failure console.error noise regression
  describe("advisory check failure console.error noise", () => {
    test("scheduler check.failed for symbol-traceability produces zero console.error output", async () => {
      // Fake clock for deterministic console.error capture
      let nowMs = 0;
      let nextId = 1;
      const tasks = new Map<number, { at: number; fn: () => void }>();
      const fakeNow = () => nowMs;
      const fakeSetTimeout = (fn: () => void, ms: number) => {
        const id = nextId++;
        tasks.set(id, { at: nowMs + ms, fn });
        return id as unknown as ReturnType<typeof setTimeout>;
      };
      const fakeClearTimeout = (handle: ReturnType<typeof setTimeout>) => {
        tasks.delete(handle as unknown as number);
      };
      const advance = (ms: number) => {
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
      };

      // No client set — errorStructuredOnly is intentionally silent (no console.error fallback)
      const scheduler = require("../src/scheduler") as {
        createSyncScheduler: (opts: any) => any;
      };
      const { DEFAULTS } = require("../src/config");

      const sched = scheduler.createSyncScheduler({
        worktree: process.cwd(),
        config: {
          ...DEFAULTS,
          sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
        },
        now: fakeNow,
        setTimeoutFn: fakeSetTimeout,
        clearTimeoutFn: fakeClearTimeout,
        runSync: async () => ({ exitCode: 0 }),
        runCheck: async () => ({ exitCode: 1 }),
      });

      sched.scheduleSync(
        "smart-enforcement.traceability",
        "src/feature.ts",
        ["symbol-traceability"],
      );
      advance(100);
      await Promise.resolve();
      await Promise.resolve();

      // Advisory failures use errorStructuredOnly which is completely silent when no client is bound.
      assert.equal(
        errorCalls.length,
        0,
        "advisory check.failed for symbol-traceability must not call console.error",
      );
    });

    test("scheduler check.failed for multi-rule payload produces zero console.error output", async () => {
      let nowMs = 0;
      let nextId = 1;
      const tasks = new Map<number, { at: number; fn: () => void }>();
      const fakeNow = () => nowMs;
      const fakeSetTimeout = (fn: () => void, ms: number) => {
        const id = nextId++;
        tasks.set(id, { at: nowMs + ms, fn });
        return id as unknown as ReturnType<typeof setTimeout>;
      };
      const fakeClearTimeout = (handle: ReturnType<typeof setTimeout>) => {
        tasks.delete(handle as unknown as number);
      };
      const advance = (ms: number) => {
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
      };

      const scheduler = require("../src/scheduler") as {
        createSyncScheduler: (opts: any) => any;
      };
      const { DEFAULTS } = require("../src/config");

      const sched = scheduler.createSyncScheduler({
        worktree: process.cwd(),
        config: {
          ...DEFAULTS,
          sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
        },
        now: fakeNow,
        setTimeoutFn: fakeSetTimeout,
        clearTimeoutFn: fakeClearTimeout,
        runSync: async () => ({ exitCode: 0 }),
        runCheck: async () => ({ exitCode: 1 }),
      });

      sched.scheduleSync(
        "smart-enforcement.kb-doc",
        "documentation/facts/FACT-001.md",
        ["required-fields", "no-dangling-refs", "strict-fact-shape"],
      );
      advance(100);
      await Promise.resolve();
      await Promise.resolve();

      // BUG: Same issue for multi-rule advisory check failure
      assert.equal(
        errorCalls.length,
        0,
        "advisory check.failed for multi-rule payload must not call console.error",
      );
    });

    test("operational sync.failed still produces console.error (control)", async () => {
      let nowMs = 0;
      let nextId = 1;
      const tasks = new Map<number, { at: number; fn: () => void }>();
      const fakeNow = () => nowMs;
      const fakeSetTimeout = (fn: () => void, ms: number) => {
        const id = nextId++;
        tasks.set(id, { at: nowMs + ms, fn });
        return id as unknown as ReturnType<typeof setTimeout>;
      };
      const fakeClearTimeout = (handle: ReturnType<typeof setTimeout>) => {
        tasks.delete(handle as unknown as number);
      };
      const advance = (ms: number) => {
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
      };

      const scheduler = require("../src/scheduler") as {
        createSyncScheduler: (opts: any) => any;
      };
      const { DEFAULTS } = require("../src/config");

      const sched = scheduler.createSyncScheduler({
        worktree: process.cwd(),
        config: {
          ...DEFAULTS,
          sync: { ...DEFAULTS.sync, enabled: true, debounceMs: 100 },
        },
        now: fakeNow,
        setTimeoutFn: fakeSetTimeout,
        clearTimeoutFn: fakeClearTimeout,
        runSync: async () => ({ exitCode: 1 }),
      });

      sched.onFileEdited("documentation/requirements/REQ-001.md");
      advance(100);
      await Promise.resolve();
      await Promise.resolve();

      // Operational sync failure SHOULD still emit console.error
      assert.ok(
        errorCalls.length >= 1,
        "operational sync.failed must still produce console.error",
      );
    });

  });
  // implements REQ-opencode-file-context-guidance-v1
  describe("file-operation reminder logging policy", () => {
    test("file-operation reminder produces structured log on emission", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-fileop-log-emit-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: { enabled: true, hookMode: "auto" },
            sync: { enabled: false },
            guidance: { smartEnforcement: { enabled: true } },
          },
          null,
          2,
        ),
      );

      // Create .kb/config.json so posture detects root_active
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({ version: 1, maintenance: { enabled: false } }),
      );

      // Create code file
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "new-thing.ts"),
        "export const y = 2;",
      );

      logger.setClient({
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      const hooks = await plugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: {
          app: {
            log: async (payload: Record<string, unknown>) => {
              appLogCalls.push(payload);
            },
          },
        },
      });

      assert.ok(hooks.event, "event hook should exist");
      await hooks.event({
        event: {
          type: "file.created",
          properties: { file: "src/new-thing.ts" },
        },
      });

      // Trigger transform hook with focus on the created file
      if (hooks["experimental.chat.system.transform"]) {
        await hooks["experimental.chat.system.transform"](
          { focusFilePath: "src/new-thing.ts" },
          { system: ["prompt"] },
        );
      }

      await new Promise((r) => setTimeout(r, 20));

      const reminderLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_file_operation_reminder";
      });

      assert.ok(
        reminderLogs.length >= 1,
        "Should emit file-operation reminder structured log",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });

    test("file-operation reminder does NOT emit log when reminder text is absent", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-fileop-no-log-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: { enabled: true, hookMode: "auto" },
            sync: { enabled: false },
            guidance: { smartEnforcement: { enabled: true } },
          },
          null,
          2,
        ),
      );

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "existing.ts"),
        "export const z = 3;",
      );

      logger.setClient({
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      const hooks = await plugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: {
          app: {
            log: async (payload: Record<string, unknown>) => {
              appLogCalls.push(payload);
            },
          },
        },
      });

      // Fire file.edited event (edited lifecycle has no generic lifecycle reminder)
      await hooks.event({
        event: {
          type: "file.edited",
          properties: { file: "src/existing.ts" },
        },
      });

      if (hooks["experimental.chat.system.transform"]) {
        await hooks["experimental.chat.system.transform"](
          { focusFilePath: "src/existing.ts" },
          { system: ["prompt"] },
        );
      }

      await new Promise((r) => setTimeout(r, 20));

      const reminderLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_file_operation_reminder";
      });

      assert.equal(
        reminderLogs.length,
        0,
        "Should NOT emit file-operation reminder log for edited file (no reminder text)",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });

    test("file-operation reminder is suppressed on repeat prompt", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const plugin = require("../src/index").default;
      const { resetSessionTracker } = require("../src/session-tracker");
      const fs = require("node:fs");
      const os = require("node:os");
      const path = require("node:path");

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-fileop-suppress-"),
      );
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: { enabled: true, hookMode: "auto" },
            sync: { enabled: false },
            guidance: { smartEnforcement: { enabled: true } },
          },
          null,
          2,
        ),
      );

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "repeat.ts"),
        "export const w = 4;",
      );

      // Create .kb/config.json so posture detects root_active
      const kbDir2 = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir2, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir2, "config.json"),
        JSON.stringify({ version: 1, maintenance: { enabled: false } }),
      );

      logger.setClient({

        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      });

      const hooks = await plugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: {
          app: {
            log: async (payload: Record<string, unknown>) => {
              appLogCalls.push(payload);
            },
          },
        },
      });

      // Fire file.created event
      await hooks.event({
        event: {
          type: "file.created",
          properties: { file: "src/repeat.ts" },
        },
      });

      // First transform: should emit log
      if (hooks["experimental.chat.system.transform"]) {
        await hooks["experimental.chat.system.transform"](
          { focusFilePath: "src/repeat.ts" },
          { system: ["prompt"] },
        );
      }

      await new Promise((r) => setTimeout(r, 20));
      const firstCount = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_file_operation_reminder";
      }).length;

      assert.ok(firstCount >= 1, "First transform should emit reminder log");

      // Second transform: should NOT emit log (suppressed)
      if (hooks["experimental.chat.system.transform"]) {
        await hooks["experimental.chat.system.transform"](
          { focusFilePath: "src/repeat.ts" },
          { system: ["prompt"] },
        );
      }

      await new Promise((r) => setTimeout(r, 20));
      const secondCount = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_file_operation_reminder";
      }).length;

      assert.equal(
        secondCount,
        firstCount,
        "Second transform should NOT emit additional reminder log (suppressed)",
      );

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      resetSessionTracker();
    });
});

});
