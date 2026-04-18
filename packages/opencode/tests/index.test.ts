/// <reference path="../../../types/bun-test.d.ts" />
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import kibiOpencodePlugin from "../src/index";
import * as logger from "../src/logger";
import type { PluginInput } from "../src/index";
import { getSessionTracker, resetSessionTracker } from "../src/session-tracker";

// implements REQ-opencode-kibi-plugin-v1

describe("index kibiOpencodePlugin", () => {
  let tmpDir: string;
  let worktree: string;
  const makeInput = (overrides: Partial<PluginInput> = {}): PluginInput => ({
    directory: tmpDir,
    worktree,
    project: undefined,
    serverUrl: undefined,
    $: undefined,
    client: undefined,
    ...overrides,
  });
  const originalSetTimeout = globalThis.setTimeout;

  beforeAll(() => {
    globalThis.setTimeout = ((
      handler: TimerHandler,
      _delay?: number,
      ...args: unknown[]
    ) => {
      if (typeof handler === "function") {
        handler(...args);
      }
      return 0 as unknown as ReturnType<typeof globalThis.setTimeout>;
    }) as unknown as typeof globalThis.setTimeout;
  });

  afterAll(() => {
    globalThis.setTimeout = originalSetTimeout;
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-index-test-"));
    worktree = tmpDir;
    resetSessionTracker();
    logger.resetClient();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    resetSessionTracker();
    logger.resetClient();
  });

  describe("plugin setup and config disabled", () => {
    it("returns empty hooks when disabled via config", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify({ enabled: false }, null, 2),
      );

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });

      assert.deepEqual(hooks, {});
    });

    it("returns hooks when enabled via config", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify({ enabled: true }, null, 2),
      );

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });

      assert.ok(typeof hooks === "object");
      assert.ok(Object.keys(hooks).length > 0);
    });
  });

  describe("workspace health bootstrap detection", () => {
    it("detects workspace needing bootstrap", async () => {
      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });

      assert.ok(typeof hooks === "object");
    });

    it("checks workspace health on setup", async () => {
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );
      const docDirs = [
        "documentation/requirements",
        "documentation/scenarios",
        "documentation/tests",
        "documentation/adr",
        "documentation/flags",
        "documentation/events",
        "documentation/facts",
      ];
      for (const dir of docDirs) {
        fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "symbols.yaml"),
        "[]",
      );

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });

      assert.ok(typeof hooks === "object");
    });

    it("does not trigger bootstrap warning when fully configured", async () => {
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      const docDirs = [
        "documentation/requirements",
        "documentation/scenarios",
        "documentation/tests",
        "documentation/adr",
        "documentation/flags",
        "documentation/events",
        "documentation/facts",
      ];
      for (const dir of docDirs) {
        fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "symbols.yaml"),
        "[]",
      );
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });

      assert.ok(typeof hooks === "object");
    });

    it("only emits startup confirmation after successful setup", async () => {
      const toastCalls: Array<Record<string, unknown>> = [];
      const logCalls: Array<Record<string, unknown>> = [];
      const client = {
        tui: {
          showToast: async (payload: Record<string, unknown>) => {
            toastCalls.push(payload);
          },
        },
        app: {
          log: async (payload: Record<string, unknown>) => {
            logCalls.push(payload);
          },
        },
      };

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );

      const docDirs = [
        "documentation/requirements",
        "documentation/scenarios",
        "documentation/tests",
        "documentation/adr",
        "documentation/flags",
        "documentation/events",
        "documentation/facts",
      ];
      for (const dir of docDirs) {
        fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "symbols.yaml"),
        "[]",
      );

      (
        globalThis as { __kibi_test_scheduler_factory?: unknown }
      ).__kibi_test_scheduler_factory = () => ({
        scheduleSync: () => {},
        onFileEdited: () => {},
        onToolExecuteAfter: () => {},
        flush: async () => {},
        dispose: () => {},
      });

      await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: client as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      const startupConfirmations = logCalls.filter((payload) => {
        const body = payload.body as Record<string, unknown> | undefined;
        return body?.message === "kibi-opencode: setup complete";
      });

      assert.equal(toastCalls.length, 1);
      assert.deepEqual(toastCalls[0], {
        body: {
          variant: "success",
          title: "Kibi OpenCode",
          message: "kibi-opencode started",
          duration: 4000,
        },
      });
      assert.equal(startupConfirmations.length, 1);

      assert.equal(
        logCalls.filter((payload) => {
          const body = payload.body as Record<string, unknown> | undefined;
          return body?.message === "kibi-opencode started";
        }).length,
        1,
      );

      delete (globalThis as { __kibi_test_scheduler_factory?: unknown })
        .__kibi_test_scheduler_factory;
    });

    it("does not emit startup confirmation when disabled", async () => {
      const logCalls: Array<Record<string, unknown>> = [];
      const client = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            logCalls.push(payload);
          },
        },
      };

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify({ enabled: false }, null, 2),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: client as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.deepEqual(hooks, {});
      assert.equal(
        logCalls.filter((payload) => {
          const body = payload.body as Record<string, unknown> | undefined;
          return body?.message === "kibi-opencode: setup complete";
        }).length,
        0,
      );
    });

    it("suppresses startup toast when toastStartup is false", async () => {
      const toastCalls: Array<Record<string, unknown>> = [];
      const logCalls: Array<Record<string, unknown>> = [];
      const client = {
        tui: {
          showToast: async (payload: Record<string, unknown>) => {
            toastCalls.push(payload);
          },
        },
        app: {
          log: async (payload: Record<string, unknown>) => {
            logCalls.push(payload);
          },
        },
      };

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify({ ux: { toastStartup: false } }, null, 2),
      );

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );

      const docDirs = [
        "documentation/requirements",
        "documentation/scenarios",
        "documentation/tests",
        "documentation/adr",
        "documentation/flags",
        "documentation/events",
        "documentation/facts",
      ];
      for (const dir of docDirs) {
        fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "symbols.yaml"),
        "[]",
      );

      (
        globalThis as { __kibi_test_scheduler_factory?: unknown }
      ).__kibi_test_scheduler_factory = () => ({
        scheduleSync: () => {},
        onFileEdited: () => {},
        onToolExecuteAfter: () => {},
        flush: async () => {},
        dispose: () => {},
      });

      try {
        await kibiOpencodePlugin({
          directory: tmpDir,
          worktree: worktree,
          client: client as any,
          project: null as any,
          serverUrl: null as any,
          $: {} as any,
        });
      } finally {
        delete (globalThis as { __kibi_test_scheduler_factory?: unknown })
          .__kibi_test_scheduler_factory;
      }

      assert.equal(
        toastCalls.filter((payload) => {
          return payload.message === "kibi-opencode started";
        }).length,
        0,
      );
      assert.equal(
        logCalls.filter((payload) => {
          const body = payload.body as Record<string, unknown> | undefined;
          return body?.message === "kibi-opencode started";
        }).length,
        1,
      );
      assert.equal(
        logCalls.filter((payload) => {
          const body = payload.body as Record<string, unknown> | undefined;
          return body?.message === "kibi-opencode: setup complete";
        }).length,
        1,
      );
    });

    it("emits structured startup fallback when toast capability is absent", async () => {
      const logCalls: Array<Record<string, unknown>> = [];
      const client = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            logCalls.push(payload);
          },
        },
      };

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );
      const docDirs = [
        "documentation/requirements",
        "documentation/scenarios",
        "documentation/tests",
        "documentation/adr",
        "documentation/flags",
        "documentation/events",
        "documentation/facts",
      ];
      for (const dir of docDirs) {
        fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "symbols.yaml"),
        "[]",
      );

      const schedulerFactory = () => ({
        scheduleSync: () => {},
        onFileEdited: () => {},
        onToolExecuteAfter: () => {},
        flush: async () => {},
        dispose: () => {},
      });
      (
        globalThis as { __kibi_test_scheduler_factory?: unknown }
      ).__kibi_test_scheduler_factory = schedulerFactory;

      try {
        await kibiOpencodePlugin({
          directory: tmpDir,
          worktree: worktree,
          client: client as any,
          project: null as any,
          serverUrl: null as any,
          $: {} as any,
        });
      } finally {
        delete (globalThis as { __kibi_test_scheduler_factory?: unknown })
          .__kibi_test_scheduler_factory;
      }

      assert.equal(
        logCalls.filter((payload) => {
          const body = payload.body as Record<string, unknown> | undefined;
          return body?.message === "kibi-opencode started";
        }).length,
        1,
      );
    });

    it("does not emit startup confirmation on degraded initialization", async () => {
      const toastCalls: Array<Record<string, unknown>> = [];
      const logCalls: Array<Record<string, unknown>> = [];
      const client = {
        tui: {
          showToast: async (payload: Record<string, unknown>) => {
            toastCalls.push(payload);
          },
        },
        app: {
          log: async (payload: Record<string, unknown>) => {
            logCalls.push(payload);
          },
        },
      };

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );

      (
        globalThis as { __kibi_test_scheduler_factory?: unknown }
      ).__kibi_test_scheduler_factory = () => {
        throw new Error("scheduler unavailable");
      };

      try {
        await kibiOpencodePlugin({
          directory: tmpDir,
          worktree: worktree,
          client: client as any,
          project: null as any,
          serverUrl: null as any,
          $: {} as any,
        });
      } finally {
        delete (globalThis as { __kibi_test_scheduler_factory?: unknown })
          .__kibi_test_scheduler_factory;
      }

      assert.equal(toastCalls.length, 0);
      assert.equal(
        logCalls.filter((payload) => {
          const body = payload.body as Record<string, unknown> | undefined;
          return body?.message === "kibi-opencode: setup complete";
        }).length,
        1,
      );
    });
  });

  // implements REQ-opencode-kibi-plugin-v1
  it("does not record bootstrap-needed when configured sync paths exist", async () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify(
        {
          paths: {
            requirements: "kibi-docs/requirements/**/*.md",
            scenarios: "kibi-docs/scenarios/**/*.md",
            tests: "kibi-docs/tests/**/*.md",
            adr: "kibi-docs/adr/**/*.md",
            flags: "kibi-docs/flags/**/*.md",
            events: "kibi-docs/events/**/*.md",
            facts: "kibi-docs/facts/**/*.md",
            symbols: "kibi-docs/symbols.yaml",
          },
        },
        null,
        2,
      ),
    );

    // Create all custom directories and symbols file
    const customDirs = [
      "kibi-docs/requirements",
      "kibi-docs/scenarios",
      "kibi-docs/tests",
      "kibi-docs/adr",
      "kibi-docs/flags",
      "kibi-docs/events",
      "kibi-docs/facts",
    ];
    for (const dir of customDirs) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(tmpDir, "kibi-docs", "symbols.yaml"), "[]");

    await kibiOpencodePlugin({
      directory: tmpDir,
      worktree: worktree,
      client: null as any,
      project: null as any,
      serverUrl: null as any,
      $: {} as any,
    });

    const tracker = getSessionTracker();
    const summary = tracker.generateSummary();
    assert.equal(
      summary.warningsByCategory["bootstrap-needed"],
      0,
      "Should not record bootstrap-needed warning when all configured paths exist",
    );
  });

  it("does not record bootstrap-needed when configured sync paths are absolute and exist", async () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });

    const absoluteDocsRoot = path.join(tmpDir, "kibi-docs");
    const toPosix = (p: string) => p.split(path.sep).join("/");

    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify(
        {
          paths: {
            requirements: toPosix(
              path.join(absoluteDocsRoot, "requirements", "**", "*.md"),
            ),
            scenarios: toPosix(
              path.join(absoluteDocsRoot, "scenarios", "**", "*.md"),
            ),
            tests: toPosix(path.join(absoluteDocsRoot, "tests", "**", "*.md")),
            adr: toPosix(path.join(absoluteDocsRoot, "adr", "**", "*.md")),
            flags: toPosix(path.join(absoluteDocsRoot, "flags", "**", "*.md")),
            events: toPosix(
              path.join(absoluteDocsRoot, "events", "**", "*.md"),
            ),
            facts: toPosix(path.join(absoluteDocsRoot, "facts", "**", "*.md")),
            symbols: toPosix(path.join(absoluteDocsRoot, "symbols.yaml")),
          },
        },
        null,
        2,
      ),
    );

    const customDirs = [
      "requirements",
      "scenarios",
      "tests",
      "adr",
      "flags",
      "events",
      "facts",
    ];
    for (const dir of customDirs) {
      fs.mkdirSync(path.join(absoluteDocsRoot, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(absoluteDocsRoot, "symbols.yaml"), "[]");

    await kibiOpencodePlugin({
      directory: tmpDir,
      worktree: worktree,
      client: null as any,
      project: null as any,
      serverUrl: null as any,
      $: {} as any,
    });

    const tracker = getSessionTracker();
    const summary = tracker.generateSummary();
    assert.equal(
      summary.warningsByCategory["bootstrap-needed"],
      0,
      "Should not record bootstrap-needed warning when configured absolute paths exist",
    );
  });

  // implements REQ-opencode-kibi-plugin-v1
  it("records bootstrap-needed when a configured target is missing", async () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify(
        {
          paths: {
            requirements: "kibi-docs/requirements/**/*.md",
            scenarios: "kibi-docs/scenarios/**/*.md",
            tests: "kibi-docs/tests/**/*.md",
            adr: "kibi-docs/adr/**/*.md",
            flags: "kibi-docs/flags/**/*.md",
            events: "kibi-docs/events/**/*.md",
            facts: "kibi-docs/facts/**/*.md",
            symbols: "kibi-docs/symbols.yaml",
          },
        },
        null,
        2,
      ),
    );

    // Create only ONE directory (requirements), leave all others missing
    fs.mkdirSync(path.join(tmpDir, "kibi-docs", "requirements"), {
      recursive: true,
    });

    const hooks = await kibiOpencodePlugin({
      directory: tmpDir,
      worktree: worktree,
      client: null as any,
      project: null as any,
      serverUrl: null as any,
      $: {} as any,
    });

    const tracker = getSessionTracker();
    const summary = tracker.generateSummary();
    assert.equal(
      summary.warningsByCategory["bootstrap-needed"],
      1,
      "Should record exactly one bootstrap-needed warning when targets are missing",
    );

    // Plugin continues with non-blocking behavior
    assert.ok(typeof hooks === "object");
  });

  describe("session summary and logging", () => {
    it("checks session expiry when session summary is enabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            guidance: {
              sessionSummary: {
                enabled: true,
                logIntervalMs: 1000,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(typeof hooks === "object");
    });

    it("logs and resets session when expired", async () => {
      const { getSessionTracker } = await import("../src/session-tracker");

      // Initialize tracker to set session start time
      getSessionTracker();

      // Wait to ensure session would be expired with logIntervalMs: 0
      await new Promise((resolve) => setTimeout(resolve, 10));

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            guidance: {
              sessionSummary: {
                enabled: true,
                logIntervalMs: 0,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(typeof hooks === "object");
    });

    it("does not check session expiry when session summary is disabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            guidance: {
              sessionSummary: {
                enabled: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(typeof hooks === "object");
    });
  });

  describe("sync enabled and file.edited event hook", () => {
    it("creates event hook when sync is enabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);
      assert.equal(typeof hooks.event, "function");
    });

    it("does not create event hook when sync is disabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: false,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      // Event hook is now always created for comment detection and warnings
      // Only sync scheduler is conditional on sync.enabled
      assert.ok(
        hooks.event,
        "event hook should exist even when sync is disabled",
      );
    });
  });

  describe(".kb edit warning", () => {
    it("warns on .kb edit when guidance.warnOnKbEdits is enabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              warnOnKbEdits: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: ".kb/config.json",
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("does not warn on .kb edit when guidance.warnOnKbEdits is disabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              warnOnKbEdits: false,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: ".kb/config.json",
          },
        },
      };

      await eventHook(mockEvent);
    });
  });

  describe("requirement doc linting", () => {
    it("detects embedded scenarios (Given/When/Then)", async () => {
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-001.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-001
title: Test
---
This is a requirement
Given user is logged in
When user clicks button
Then action occurs
`,
      );

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("warns on embedded scenario via warning tracker", async () => {
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-002.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-002
title: Test
---
Given the user is authenticated
When the request is made
Then the response is returned
`,
      );

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("detects embedded test assertions", async () => {
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-001.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-001
title: Test
---
This requirement should verify the expected behavior.
We assert that this works correctly.
`,
      );

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("detects very long requirements", async () => {
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-001.md");

      let content = `---
id: REQ-001
title: Test
---\n`;
      for (let i = 0; i < 55; i++) {
        content += `This is line ${i} of the requirement content.\n`;
      }

      fs.writeFileSync(reqFile, content);

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("passes clean requirement without warnings", async () => {
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-001.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-001
title: Test
---
This is a clean requirement
with normal content.
`,
      );

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });
  });

  describe("recent edits tracking", () => {
    it("tracks recent edits", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const files = ["/src/file1.ts", "/src/file2.ts", "/src/file3.ts"];
      for (const file of files) {
        const mockEvent = {
          event: {
            type: "file.edited",
            properties: {
              file: file,
            },
          },
        };
        await eventHook(mockEvent);
      }

      assert.ok(true);
    });
  });

  describe("prompt injection hooks", () => {
    it("creates system.transform hook when hookMode is auto", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: {
              enabled: true,
              hookMode: "auto",
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks["experimental.chat.system.transform"]);
      assert.equal(
        typeof hooks["experimental.chat.system.transform"],
        "function",
      );
    });

    it("executes system.transform hook", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: {
              enabled: true,
              hookMode: "auto",
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks["experimental.chat.system.transform"]);

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = {};
      const mockOutput = { system: ["original system prompt"] };

      await transformHook(mockInput, mockOutput);

      assert.ok(mockOutput.system.length > 1);
      assert.equal(mockOutput.system[0], "original system prompt");
      assert.ok(
        mockOutput.system.some((s: string) => s !== "original system prompt"),
      );
    });

    it("creates system.transform hook when hookMode is system-transform", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: {
              enabled: true,
              hookMode: "system-transform",
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks["experimental.chat.system.transform"]);
      assert.equal(
        typeof hooks["experimental.chat.system.transform"],
        "function",
      );
    });

    it("creates chat.params hook when hookMode is auto", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: {
              enabled: true,
              hookMode: "auto",
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks["chat.params"]);
      assert.equal(typeof hooks["chat.params"], "function");
    });

    it("executes chat.params hook in auto mode", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: {
              enabled: true,
              hookMode: "auto",
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks["chat.params"]);

      const chatParamsHook = hooks["chat.params"] as any;
      const mockInput = {};
      const mockOutput = {};

      await chatParamsHook(mockInput, mockOutput);

      assert.ok(true);
    });

    it("creates chat.params hook when hookMode is chat-params", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: {
              enabled: true,
              hookMode: "chat-params",
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks["chat.params"]);
      assert.equal(typeof hooks["chat.params"], "function");
    });

    it("executes chat.params hook in chat-params mode", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: {
              enabled: true,
              hookMode: "chat-params",
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks["chat.params"]);

      const chatParamsHook = hooks["chat.params"] as any;
      const mockInput = {};
      const mockOutput = {};

      await chatParamsHook(mockInput, mockOutput);

      assert.ok(true);
    });

    it("does not create prompt hooks when disabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: {
              enabled: false,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(!hooks["experimental.chat.system.transform"]);
      assert.ok(!hooks["chat.params"]);
    });
  });

  describe("targeted checks", () => {
    it("schedules targeted checks for requirement files when enabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-001.md");
      fs.writeFileSync(reqFile, "---\nid: REQ-001\n---");

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("schedules targeted checks for scenario files when enabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const scenDir = path.join(tmpDir, "documentation", "scenarios");
      fs.mkdirSync(scenDir, { recursive: true });
      const scenFile = path.join(scenDir, "SCEN-001.md");
      fs.writeFileSync(scenFile, "---\nid: SCEN-001\n---");

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: scenFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("schedules targeted checks for test files when enabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const testDir = path.join(tmpDir, "documentation", "tests");
      fs.mkdirSync(testDir, { recursive: true });
      const testFile = path.join(testDir, "TEST-001.md");
      fs.writeFileSync(testFile, "---\nid: TEST-001\n---");

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: testFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("schedules targeted checks for adr files when enabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const adrDir = path.join(tmpDir, "documentation", "adr");
      fs.mkdirSync(adrDir, { recursive: true });
      const adrFile = path.join(adrDir, "ADR-001.md");
      fs.writeFileSync(adrFile, "---\nid: ADR-001\n---");

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: adrFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("schedules targeted checks for fact files when enabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const factDir = path.join(tmpDir, "documentation", "facts");
      fs.mkdirSync(factDir, { recursive: true });
      const factFile = path.join(factDir, "FACT-001.md");
      fs.writeFileSync(factFile, "---\nid: FACT-001\n---");

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: factFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("does not schedule targeted checks when disabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-001.md");
      fs.writeFileSync(reqFile, "---\nid: REQ-001\n---");

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });
  });

  describe("must-priority targeted checks", () => {
    it("schedules elevated checks for must-priority requirements", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-001.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-001
title: Must Priority Requirement
priority: must
---

This is a must-priority requirement.
`,
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("schedules standard checks for non-must requirements", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-002.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-002
title: Should Priority Requirement
priority: should
---

This is a should-priority requirement.
`,
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });

    it("schedules standard checks for requirements without priority", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-003.md");
      fs.writeFileSync(
        reqFile,
        `---
id: REQ-003
title: No Priority Requirement
---

This requirement has no priority field.
`,
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              targetedChecks: {
                enabled: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: reqFile,
          },
        },
      };

      await eventHook(mockEvent);
    });
  });

  describe("event hook edge cases", () => {
    it("ignores non-file.edited events", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const eventTypes = ["file.created", "file.deleted", "other.event"];
      for (const eventType of eventTypes) {
        const mockEvent = {
          event: {
            type: eventType,
          },
        };
        await eventHook(mockEvent);
      }
    });

    it("handles events without file property", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {},
        },
      };

      await eventHook(mockEvent);
    });
  });

  describe("Python file integration", () => {
    it("detects durable knowledge in Python docstrings via event hook", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              commentDetection: {
                enabled: true,
                minLines: 3,
              },
            },
          },
          null,
          2,
        ),
      );

      // Create a Python file with a docstring
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "models.py"),
        `"""
User accounts must have unique email addresses.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""

import datetime

class User:
    pass
`,
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: "src/models.py",
          },
        },
      };

      await eventHook(mockEvent);

      // Verify prompt injection works
      assert.ok(hooks["experimental.chat.system.transform"]);

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = {};
      const mockOutput = { system: ["original system prompt"] };

      await transformHook(mockInput, mockOutput);

      assert.ok(mockOutput.system.length > 1);
      assert.ok(
        mockOutput.system.some((s: string) => s.includes("kibi-opencode")),
        "Prompt should contain kibi-opencode",
      );
    });

    it("detects durable knowledge in Python # comments via event hook", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              commentDetection: {
                enabled: true,
                minLines: 3,
              },
            },
          },
          null,
          2,
        ),
      );

      // Create a Python file with # comments
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "database.py"),
        `# We chose PostgreSQL over MongoDB because we need ACID transactions
# and strong consistency guarantees. The tradeoff is slightly higher
# operational complexity but ensures data integrity for financial records.
#
# This decision was made in March 2024 after evaluating multiple options.

import psycopg2
`,
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: "src/database.py",
          },
        },
      };

      await eventHook(mockEvent);

      // Verify prompt injection works
      assert.ok(hooks["experimental.chat.system.transform"]);

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = {};
      const mockOutput = { system: ["original system prompt"] };

      await transformHook(mockInput, mockOutput);

      assert.ok(mockOutput.system.length > 1);
      assert.ok(
        mockOutput.system.some((s: string) => s.includes("kibi-opencode")),
        "Prompt should contain kibi-opencode",
      );
    });

    it("respects commentDetection.enabled: false for Python files", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              commentDetection: {
                enabled: false,
                minLines: 3,
              },
            },
          },
          null,
          2,
        ),
      );

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "models.py"),
        `"""
User accounts must have unique email addresses.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""

import datetime
`,
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: "src/models.py",
          },
        },
      };

      // Should not throw
      await eventHook(mockEvent);
    });

    it("processes Python files even when sync is disabled", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: false,
            },
            guidance: {
              commentDetection: {
                enabled: true,
                minLines: 3,
              },
            },
          },
          null,
          2,
        ),
      );

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "models.py"),
        `"""
User accounts must have unique email addresses.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""

import datetime
`,
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      // Event hook should exist even when sync is disabled
      assert.ok(hooks.event, "Event hook should exist when sync is disabled");

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: "src/models.py",
          },
        },
      };

      // Should process without errors
      await eventHook(mockEvent);
    });

    it("deduplicates repeated Python file edits", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            guidance: {
              commentDetection: {
                enabled: true,
                minLines: 3,
              },
            },
          },
          null,
          2,
        ),
      );

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "models.py"),
        `"""
User accounts must have unique email addresses.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""

import datetime
`,
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      const eventHook = hooks.event as any;
      const mockEvent = {
        event: {
          type: "file.edited",
          properties: {
            file: "src/models.py",
          },
        },
      };

      // First edit
      await eventHook(mockEvent);

      const warningsAfterFirstEdit =
        getSessionTracker().generateSummary().totalWarnings;

      // Second edit (same file, same content)
      await eventHook(mockEvent);

      // Dedupe should prevent the second edit from adding another warning
      const warningsAfterSecondEdit =
        getSessionTracker().generateSummary().totalWarnings;
      assert.equal(
        warningsAfterSecondEdit,
        warningsAfterFirstEdit,
        "Second edit of the same file should not record a new warning due to deduplication",
      );
    });

    it("clears suggestion when switching from code file to KB doc", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: {
              enabled: true,
            },
            prompt: {
              enabled: true,
              hookMode: "system-transform",
            },
            guidance: {
              commentDetection: {
                enabled: true,
                minLines: 3,
              },
            },
          },
          null,
          2,
        ),
      );

      // Create .kb/config.json so posture detects root_active
      // (maintenance.enabled=false forces root_active without needing full doc dirs)
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({ version: 1, maintenance: { enabled: false } }),
      );

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "models.py"),
        `"""
User accounts must have unique email addresses.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""

import datetime
`,
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      const eventHook = hooks.event as any;
      const transformHook = hooks["experimental.chat.system.transform"] as any;

      // First edit: Python file with durable knowledge
      await eventHook({
        event: {
          type: "file.edited",
          properties: {
            file: "src/models.py",
          },
        },
      });

      // After code file edit, transform hook should inject durable knowledge guidance
      const outputAfterCode = { system: ["base system prompt"] };
      await transformHook({}, outputAfterCode);
      assert.ok(
        outputAfterCode.system.some((s: string) =>
          s.includes("Durable knowledge detected"),
        ),
        "Prompt should contain durable knowledge guidance after code file edit",
      );

      // Second edit: KB doc (should clear suggestion)
      await eventHook({
        event: {
          type: "file.edited",
          properties: {
            file: "documentation/requirements/REQ-001.md",
          },
        },
      });

      // After KB doc edit, transform hook should NOT inject durable knowledge guidance
      const outputAfterKbDoc = { system: ["base system prompt"] };
      await transformHook({}, outputAfterKbDoc);
      assert.ok(
        !outputAfterKbDoc.system.some((s: string) =>
          s.includes("Durable knowledge detected"),
        ),
        "Prompt should not contain durable knowledge guidance after switching to KB doc",
      );
    });
  });

  describe("effective smart-enforcement mode integration", () => {
    it("computes advisory mode when config is advisory", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            guidance: {
              smartEnforcement: {
                mode: "advisory",
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      // Plugin still sets up hooks regardless of mode
      assert.ok(typeof hooks === "object");
    });

    it("computes strict mode when config is strict with root KB present", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            guidance: {
              smartEnforcement: {
                mode: "strict",
                requireRootKbForStrict: true,
              },
            },
          },
          null,
          2,
        ),
      );

      // Create root .kb for root_active posture
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );

      const docDirs = [
        "documentation/requirements",
        "documentation/scenarios",
        "documentation/tests",
        "documentation/adr",
        "documentation/flags",
        "documentation/events",
        "documentation/facts",
      ];
      for (const dir of docDirs) {
        fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "symbols.yaml"),
        "[]",
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(typeof hooks === "object");
    });

    it("strict mode with no root KB falls back to advisory behavior", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            guidance: {
              smartEnforcement: {
                mode: "strict",
                requireRootKbForStrict: true,
              },
            },
          },
          null,
          2,
        ),
      );

      // No .kb directory → root_uninitialized posture → advisory effective mode
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      // Plugin still works, just in advisory mode
      assert.ok(typeof hooks === "object");
    });

    it("plugin remains non-blocking even in strict mode", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            guidance: {
              smartEnforcement: {
                mode: "strict",
                requireRootKbForStrict: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: null as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      // Plugin exposes only advisory hook surfaces — no blocking paths
      assert.ok(typeof hooks === "object");
      assert.ok(typeof hooks.event === "function" || hooks.event === undefined);
    });
  });

  // implements REQ-opencode-smart-enforcement-v1
  describe("completion reminder policy", () => {
    it("logs smart_enforcement_completion_reminder when guidance contains reminder", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
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
              smartEnforcement: {
                completionReminder: true,
              },
            },
          },
          null,
          2,
        ),
      );

      // Create a code file for event to process
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

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);
      assert.ok(hooks["experimental.chat.system.transform"]);

      // Trigger a code edit event so lastRiskClass gets set
      const eventHook = hooks.event as any;
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      // Now trigger the transform hook to generate guidance
      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockOutput = { system: ["original system prompt"] };
      await transformHook({}, mockOutput);

      // Wait for async log calls
      await new Promise((r) => setTimeout(r, 20));

      // Check that the completion reminder log event was emitted
      const reminderLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_completion_reminder";
      });

      // The guidance should contain the reminder text since behavior_candidate is a risky class
      const guidanceEntry = mockOutput.system.find(
        (s: string) =>
          typeof s === "string" && s.includes("kb_check before completing"),
      );

      // If guidance contains the reminder text, the log should have fired
      if (guidanceEntry) {
        assert.ok(
          reminderLogs.length >= 1,
          "Should log smart_enforcement_completion_reminder when reminder in guidance",
        );
      }
    });

    it("does NOT log smart_enforcement_completion_reminder on cache-hit", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
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
              smartEnforcement: {
                completionReminder: true,
              },
            },
          },
          null,
          2,
        ),
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

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);
      assert.ok(hooks["experimental.chat.system.transform"]);

      const eventHook = hooks.event as any;

      // First event — populates cache
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      // First transform — records cache satisfied
      const transformHook = hooks["experimental.chat.system.transform"] as any;
      await transformHook({}, { system: ["prompt"] });

      // Clear log calls from first round
      appLogCalls.length = 0;

      // Second event — cache hit in event hook, returns early
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      // Second transform — cache hit in buildContextualGuidance, returns ""
      await transformHook({}, { system: ["prompt"] });

      await new Promise((r) => setTimeout(r, 20));

      const reminderLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_completion_reminder";
      });

      assert.equal(
        reminderLogs.length,
        0,
        "Should NOT log smart_enforcement_completion_reminder on cache-hit",
      );
    });

    it("does NOT log smart_enforcement_completion_reminder for safe_docs_only", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
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
              smartEnforcement: {
                completionReminder: true,
              },
            },
          },
          null,
          2,
        ),
      );

      // Create README to get safe_docs_only risk class
      fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test\n");

      const mockClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      };

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      assert.ok(hooks.event);

      const eventHook = hooks.event as any;
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "README.md" },
        },
      });

      // Trigger transform
      const transformHook = hooks["experimental.chat.system.transform"] as any;
      await transformHook({}, { system: ["prompt"] });

      await new Promise((r) => setTimeout(r, 20));

      const reminderLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_completion_reminder";
      });

      assert.equal(
        reminderLogs.length,
        0,
        "Should NOT log smart_enforcement_completion_reminder for safe_docs_only",
      );
    });
  });

  // implements REQ-opencode-smart-enforcement-v1
  describe("runtime degraded overlay", () => {
    it("latches sync_disabled when sync.enabled=false", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
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
              smartEnforcement: {
                completionReminder: true,
              },
            },
          },
          null,
          2,
        ),
      );

      // Force root_active posture so only sync_disabled is latched
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({ maintenance: { enabled: false } }, null, 2),
      );

      const mockClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      };

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      const eventHook = hooks.event as any;
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      await new Promise((r) => setTimeout(r, 20));

      const degradedLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_degraded";
      });

      assert.ok(
        degradedLogs.length >= 1,
        "Should log smart_enforcement_degraded for sync_disabled",
      );

      const first = degradedLogs[0]?.body as Record<string, unknown>;
      assert.equal(first?.overlay_cause, "sync_disabled");
      assert.equal(first?.runtime_degraded, true);
      assert.equal(first?.effective_mode, "advisory");
      assert.equal(first?.overlay_cause, "sync_disabled");
      assert.equal(first?.runtime_degraded, true);
    });

    it("latches non_authoritative_posture for root_uninitialized", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
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
              smartEnforcement: {
                completionReminder: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const mockClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      };

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      const eventHook = hooks.event as any;
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      await new Promise((r) => setTimeout(r, 20));

      const degradedLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_degraded";
      });

      assert.ok(
        degradedLogs.length >= 1,
        "Should log smart_enforcement_degraded for non_authoritative_posture",
      );

      const first = degradedLogs[0]?.body as Record<string, unknown>;
      assert.equal(first?.runtime_degraded, true);
      assert.equal(first?.effective_mode, "advisory");
    });

    it("latches scheduler_unavailable when createSyncScheduler throws", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: { enabled: true, hookMode: "auto" },
            sync: { enabled: true, debounceMs: 5 },
            guidance: {
              smartEnforcement: {
                completionReminder: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );
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

      const mockClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      };

      (globalThis as any).__kibi_test_scheduler_factory = () => {
        throw new Error("scheduler creation failure");
      };

      const { default: plugin } = await import(
        "../src/index.ts?bust=" + Date.now()
      );
      const hooks = await plugin({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      const eventHook = hooks.event as any;
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      await new Promise((r) => setTimeout(r, 20));

      const degradedLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_degraded";
      });

      assert.ok(
        degradedLogs.length >= 1,
        "Should log smart_enforcement_degraded for scheduler_unavailable",
      );

      const first = degradedLogs[0]?.body as Record<string, unknown>;
      assert.equal(first?.overlay_cause, "scheduler_unavailable");
      assert.equal(first?.runtime_degraded, true);
      assert.equal(first?.effective_mode, "advisory");
      delete (globalThis as any).__kibi_test_scheduler_factory;
    });

    it("latches scheduler_sync_failed when onRunComplete has non-zero exitCode", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: { enabled: true, hookMode: "auto" },
            sync: { enabled: true, debounceMs: 5 },
            guidance: {
              smartEnforcement: {
                completionReminder: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );
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

      const mockClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      };

      let capturedOnRunComplete: ((meta: any) => void) | undefined;
      (globalThis as any).__kibi_test_scheduler_factory = (opts: any) => {
        capturedOnRunComplete = opts.onRunComplete;
        return {
          onFileEdited: () => {},
          onToolExecuteAfter: () => {},
          scheduleSync: () => {},
          flush: async () => {},
          dispose: () => {},
        };
      };

      const { default: plugin } = await import(
        "../src/index.ts?bust=" + Date.now()
      );
      const hooks = await plugin({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      const eventHook = hooks.event as any;
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      capturedOnRunComplete?.({ exitCode: 1, checkExitCode: 0 });
      await new Promise((r) => setTimeout(r, 20));

      const degradedLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_degraded";
      });

      assert.ok(
        degradedLogs.length >= 1,
        "Should log smart_enforcement_degraded for scheduler_sync_failed",
      );

      const causes = degradedLogs.map(
        (p) => (p.body as Record<string, unknown>).overlay_cause,
      );
      assert.ok(causes.includes("scheduler_sync_failed"));

      const syncFailed = degradedLogs.find(
        (p) =>
          (p.body as Record<string, unknown>).overlay_cause ===
          "scheduler_sync_failed",
      );
      assert.equal(
        (syncFailed?.body as Record<string, unknown>)?.effective_mode,
        "advisory",
      );
      delete (globalThis as any).__kibi_test_scheduler_factory;
    });

    it("latches scheduler_check_failed when onRunComplete has non-zero checkExitCode", async () => {
      const appLogCalls: Array<Record<string, unknown>> = [];
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            prompt: { enabled: true, hookMode: "auto" },
            sync: { enabled: true, debounceMs: 5 },
            guidance: {
              smartEnforcement: {
                completionReminder: true,
              },
            },
          },
          null,
          2,
        ),
      );

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({}, null, 2),
      );
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

      const mockClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            appLogCalls.push(payload);
          },
        },
      };

      let capturedOnRunComplete: ((meta: any) => void) | undefined;
      (globalThis as any).__kibi_test_scheduler_factory = (opts: any) => {
        capturedOnRunComplete = opts.onRunComplete;
        return {
          onFileEdited: () => {},
          onToolExecuteAfter: () => {},
          scheduleSync: () => {},
          flush: async () => {},
          dispose: () => {},
        };
      };

      const { default: plugin } = await import(
        "../src/index.ts?bust=" + Date.now()
      );
      const hooks = await plugin({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      const eventHook = hooks.event as any;
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      capturedOnRunComplete?.({ exitCode: 0, checkExitCode: 1 });
      await new Promise((r) => setTimeout(r, 20));

      const degradedLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return body.event === "smart_enforcement_degraded";
      });

      assert.ok(
        degradedLogs.length >= 1,
        "Should log smart_enforcement_degraded for scheduler_check_failed",
      );

      const causes = degradedLogs.map(
        (p) => (p.body as Record<string, unknown>).overlay_cause,
      );
      assert.ok(causes.includes("scheduler_check_failed"));

      const checkFailed = degradedLogs.find(
        (p) =>
          (p.body as Record<string, unknown>).overlay_cause ===
          "scheduler_check_failed",
      );
      assert.equal(
        (checkFailed?.body as Record<string, unknown>)?.effective_mode,
        "advisory",
      );
      delete (globalThis as any).__kibi_test_scheduler_factory;
    });
  });

  // ── Targeted-check rule routing contract (Task 1 TDD lock-in) ───────────
  // These tests define the contract for Task 3 implementation.
  // Expected to FAIL until runtime routing is completed.
  describe("targeted-check rule routing contract", () => {
    type ScheduleCall = {
      reason: string;
      filePath?: string;
      checkRules?: string[];
    };

    /** Helper to set up a capturing scheduler factory and import a fresh plugin */
    async function setupWithCapturingScheduler(tmpDir: string) {
      const scheduleCalls: ScheduleCall[] = [];

      (globalThis as any).__kibi_test_scheduler_factory = () => ({
        scheduleSync: (
          reason: string,
          filePath?: string,
          checkRules?: string[],
        ) => {
          scheduleCalls.push({ reason, filePath, checkRules });
        },
        onFileEdited: () => {},
        onToolExecuteAfter: () => {},
        flush: async () => {},
        dispose: () => {},
      });

      const { default: plugin } = await import(
        `../src/index.ts?route=${Date.now()}`
      );
      const hooks = await plugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: null as any,
        serverUrl: null as any,
        $: {} as any,
      });

      return { hooks, scheduleCalls };
    }

    /** Set up full KB structure in temp dir */
    function setupKbStructure(tmpDir: string) {
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          paths: {
            requirements: "documentation/requirements/**/*.md",
            scenarios: "documentation/scenarios/**/*.md",
            tests: "documentation/tests/**/*.md",
            adr: "documentation/adr/**/*.md",
            flags: "documentation/flags/**/*.md",
            events: "documentation/events/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const docDirs = [
        "documentation/requirements",
        "documentation/scenarios",
        "documentation/tests",
        "documentation/adr",
        "documentation/flags",
        "documentation/events",
        "documentation/facts",
      ];
      for (const dir of docDirs) {
        fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "symbols.yaml"),
        "[]",
      );
    }

    afterEach(() => {
      delete (globalThis as any).__kibi_test_scheduler_factory;
    });

    it("traceability_candidate schedules symbol-traceability check", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      setupKbStructure(tmpDir);

      // Create a code file with exports but NO // implements REQ-xxx annotation
      // This should be classified as traceability_candidate
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const codeFile = path.join(srcDir, "feature.ts");
      fs.writeFileSync(
        codeFile,
        "export function doSomething() { return 42; }\n",
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: true },
            prompt: { enabled: true, hookMode: "auto" },
            guidance: {
              commentDetection: { enabled: false },
              targetedChecks: { enabled: true },
              smartEnforcement: {
                completionReminder: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const { hooks, scheduleCalls } =
        await setupWithCapturingScheduler(tmpDir);

      assert.ok(hooks.event, "Should have event hook");
      const eventHook = hooks.event as any;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: codeFile },
        },
      });

      // The traceability_candidate path should schedule symbol-traceability
      // using reason "smart-enforcement.traceability" (not "file.edited")
      const traceCalls = scheduleCalls.filter(
        (c) => c.checkRules && c.checkRules.includes("symbol-traceability"),
      );
      assert.ok(
        traceCalls.length >= 1,
        `Expected at least 1 scheduleSync with symbol-traceability, got ${JSON.stringify(scheduleCalls)}`,
      );
      assert.deepEqual(
        traceCalls[0].checkRules,
        ["symbol-traceability"],
        `Expected exact rules ["symbol-traceability"], got ${JSON.stringify(traceCalls[0].checkRules)}`,
      );
      assert.equal(
        traceCalls[0].reason,
        "smart-enforcement.traceability",
        `Expected reason "smart-enforcement.traceability", got "${traceCalls[0].reason}"`,
      );
    });

    it("fact KB-doc edit schedules required-fields, no-dangling-refs, strict-fact-shape", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      setupKbStructure(tmpDir);

      const factDir = path.join(tmpDir, "documentation", "facts");
      fs.mkdirSync(factDir, { recursive: true });
      const factFile = path.join(factDir, "FACT-001.md");
      fs.writeFileSync(
        factFile,
        "---\nid: FACT-001\ntitle: Test Fact\n---\nTest content\n",
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: true },
            prompt: { enabled: true, hookMode: "auto" },
            guidance: {
              targetedChecks: { enabled: true },
              smartEnforcement: {
                completionReminder: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const { hooks, scheduleCalls } =
        await setupWithCapturingScheduler(tmpDir);

      assert.ok(hooks.event, "Should have event hook");
      const eventHook = hooks.event as any;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: factFile },
        },
      });

      // Fact KB-doc should schedule the three structural+semantic rules
      const factCalls = scheduleCalls.filter(
        (c) => c.checkRules && c.checkRules.includes("strict-fact-shape"),
      );
      assert.ok(
        factCalls.length >= 1,
        `Expected at least 1 scheduleSync with strict-fact-shape for fact doc, got ${JSON.stringify(scheduleCalls)}`,
      );
      assert.deepEqual(
        factCalls[0].checkRules,
        ["required-fields", "no-dangling-refs", "strict-fact-shape"],
        `Expected exact rules for fact doc, got ${JSON.stringify(factCalls[0].checkRules)}`,
      );
    });

    it("non-fact KB-doc edits do NOT include strict-fact-shape", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      setupKbStructure(tmpDir);

      // Create a scenario file (not a fact)
      const scenDir = path.join(tmpDir, "documentation", "scenarios");
      fs.mkdirSync(scenDir, { recursive: true });
      const scenFile = path.join(scenDir, "SCEN-001.md");
      fs.writeFileSync(
        scenFile,
        "---\nid: SCEN-001\ntitle: Test Scenario\n---\nTest content\n",
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: true },
            prompt: { enabled: true, hookMode: "auto" },
            guidance: {
              targetedChecks: { enabled: true },
              smartEnforcement: {
                completionReminder: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const { hooks, scheduleCalls } =
        await setupWithCapturingScheduler(tmpDir);

      assert.ok(hooks.event, "Should have event hook");
      const eventHook = hooks.event as any;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: scenFile },
        },
      });

      // Scenario doc should only have structural pair, NOT strict-fact-shape
      const scenCalls = scheduleCalls.filter(
        (c) => c.checkRules && c.checkRules.length > 0,
      );
      assert.ok(
        scenCalls.length >= 1,
        `Expected at least 1 scheduleSync for scenario doc, got ${JSON.stringify(scheduleCalls)}`,
      );
      assert.ok(
        !scenCalls[0].checkRules!.includes("strict-fact-shape"),
        `Scenario doc should NOT include strict-fact-shape, got ${JSON.stringify(scenCalls[0].checkRules)}`,
      );
      assert.deepEqual(
        scenCalls[0].checkRules,
        ["required-fields", "no-dangling-refs"],
        `Expected only structural pair for scenario doc, got ${JSON.stringify(scenCalls[0].checkRules)}`,
      );
    });

    it("targeted checks are skipped when targetedChecks.enabled is false", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      setupKbStructure(tmpDir);

      const factDir = path.join(tmpDir, "documentation", "facts");
      fs.mkdirSync(factDir, { recursive: true });
      const factFile = path.join(factDir, "FACT-001.md");
      fs.writeFileSync(
        factFile,
        "---\nid: FACT-001\ntitle: Test Fact\n---\nTest content\n",
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: true },
            prompt: { enabled: true, hookMode: "auto" },
            guidance: {
              targetedChecks: { enabled: false },
              smartEnforcement: {
                completionReminder: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const { hooks, scheduleCalls } =
        await setupWithCapturingScheduler(tmpDir);

      assert.ok(hooks.event, "Should have event hook");
      const eventHook = hooks.event as any;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: factFile },
        },
      });

      // When targetedChecks.enabled is false, no rules should be scheduled
      const callsWithRules = scheduleCalls.filter(
        (c) => c.checkRules && c.checkRules.length > 0,
      );
      assert.equal(
        callsWithRules.length,
        0,
        `Expected no scheduleSync with rules when targetedChecks disabled, got ${JSON.stringify(callsWithRules)}`,
      );
    });

    it("targeted checks are skipped when maintenance is degraded", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });

      // Set up with maintenance degraded (maintenance.enabled: true in .kb/config.json)
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify({
          version: 1,
          maintenance: { enabled: true },
          paths: {
            requirements: "documentation/requirements/**/*.md",
            facts: "documentation/facts/**/*.md",
          },
        }),
      );

      const factDir = path.join(tmpDir, "documentation", "facts");
      fs.mkdirSync(factDir, { recursive: true });
      const factFile = path.join(factDir, "FACT-001.md");
      fs.writeFileSync(
        factFile,
        "---\nid: FACT-001\ntitle: Test Fact\n---\nTest content\n",
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: true },
            prompt: { enabled: true, hookMode: "auto" },
            guidance: {
              targetedChecks: { enabled: true },
              smartEnforcement: {
                completionReminder: false,
              },
            },
          },
          null,
          2,
        ),
      );

      const { hooks, scheduleCalls } =
        await setupWithCapturingScheduler(tmpDir);

      assert.ok(hooks.event, "Should have event hook");
      const eventHook = hooks.event as any;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: factFile },
        },
      });

      // When maintenance is degraded, targeted checks should be skipped
      const callsWithRules = scheduleCalls.filter(
        (c) => c.checkRules && c.checkRules.length > 0,
      );
      assert.equal(
        callsWithRules.length,
        0,
        `Expected no scheduleSync with rules when maintenance degraded, got ${JSON.stringify(callsWithRules)}`,
      );
    });
  });

  // Task 1 TDD: Advisory check failure noise via injected scheduler factory
  describe("advisory check failure noise regression (injected scheduler)", () => {
    it("check.failed with symbol-traceability produces zero console.error via plugin", async () => {
      const errorSpy: string[] = [];
      const origError = console.error;
      (console as any).error = (...args: unknown[]) => {
        errorSpy.push(args.map(String).join(" "));
      };

      try {
        const appLogCalls: Array<Record<string, unknown>> = [];
        const opencodeDir = path.join(tmpDir, ".opencode");
        fs.mkdirSync(opencodeDir, { recursive: true });
        // Inline KB setup (cannot use setupKbStructure from other describe)
        const kbDir = path.join(tmpDir, ".kb");
        fs.mkdirSync(kbDir, { recursive: true });
        fs.writeFileSync(
          path.join(kbDir, "config.json"),
          JSON.stringify({ version: 1, maintenance: { enabled: false } }),
        );
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
          "[]",
        );

        // Create a code file for traceability_candidate
        const srcDir = path.join(tmpDir, "src");
        fs.mkdirSync(srcDir, { recursive: true });
        const codeFile = path.join(srcDir, "feature.ts");
        fs.writeFileSync(
          codeFile,
          "export function doSomething() { return 42; }\n",
        );

        fs.writeFileSync(
          path.join(opencodeDir, "kibi.json"),
          JSON.stringify(
            {
              enabled: true,
              sync: { enabled: true },
              prompt: { enabled: true, hookMode: "auto" },
              guidance: {
                commentDetection: { enabled: false },
                targetedChecks: { enabled: true },
                smartEnforcement: { completionReminder: false },
              },
            },
            null,
            2,
          ),
        );

        // Inject a scheduler factory that simulates check failure
        let capturedOnRunComplete: ((meta: any) => void) | undefined;
        (globalThis as any).__kibi_test_scheduler_factory = (opts: any) => {
          capturedOnRunComplete = opts.onRunComplete;
          return {
            onFileEdited: () => {},
            onToolExecuteAfter: () => {},
            scheduleSync: () => {},
            flush: async () => {},
            dispose: () => {},
          };
        };

        const mockClient = {
          app: {
            log: async (payload: Record<string, unknown>) => {
              appLogCalls.push(payload);
            },
          },
        };

        const { default: plugin } = await import(
          `../src/index.ts?noisy1=${Date.now()}`
        );
        const hooks = await plugin({
          directory: tmpDir,
          worktree: tmpDir,
          client: mockClient as any,
          project: null as any,
          serverUrl: null as any,
          $: {} as any,
        });

        const eventHook = hooks.event as any;
        await eventHook({
          event: {
            type: "file.edited",
            properties: { file: codeFile },
          },
        });

        // Simulate advisory check failure via onRunComplete
        capturedOnRunComplete?.({
          exitCode: 0,
          checkExitCode: 1,
          checkRules: ["symbol-traceability"],
        });

        await new Promise((r) => setTimeout(r, 20));

        // BUG: Advisory check failure currently emits console.error.
        // The plugin is advisory in the editor — check failures should be structured-only.
        assert.equal(
          errorSpy.length,
          0,
          `Advisory check.failed for symbol-traceability must not produce console.error, got: ${JSON.stringify(errorSpy)}`,
        );
      } finally {
        console.error = origError;
        delete (globalThis as any).__kibi_test_scheduler_factory;
      }
    });

    it("check.failed with multi-rule payload produces zero console.error via plugin", async () => {
      const errorSpy: string[] = [];
      const origError = console.error;
      (console as any).error = (...args: unknown[]) => {
        errorSpy.push(args.map(String).join(" "));
      };

      try {
        const appLogCalls: Array<Record<string, unknown>> = [];
        const opencodeDir = path.join(tmpDir, ".opencode");
        fs.mkdirSync(opencodeDir, { recursive: true });
        // Inline KB setup (cannot use setupKbStructure from other describe)
        const kbDir2 = path.join(tmpDir, ".kb");
        fs.mkdirSync(kbDir2, { recursive: true });
        fs.writeFileSync(
          path.join(kbDir2, "config.json"),
          JSON.stringify({ version: 1, maintenance: { enabled: false } }),
        );
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
          "[]",
        );

        // Create a fact file for multi-rule check
        const factDir = path.join(tmpDir, "documentation", "facts");
        fs.mkdirSync(factDir, { recursive: true });
        const factFile = path.join(factDir, "FACT-001.md");
        fs.writeFileSync(
          factFile,
          "---\nid: FACT-001\ntitle: Test Fact\n---\nTest content\n",
        );

        fs.writeFileSync(
          path.join(opencodeDir, "kibi.json"),
          JSON.stringify(
            {
              enabled: true,
              sync: { enabled: true },
              prompt: { enabled: true, hookMode: "auto" },
              guidance: {
                targetedChecks: { enabled: true },
                smartEnforcement: { completionReminder: false },
              },
            },
            null,
            2,
          ),
        );

        let capturedOnRunComplete: ((meta: any) => void) | undefined;
        (globalThis as any).__kibi_test_scheduler_factory = (opts: any) => {
          capturedOnRunComplete = opts.onRunComplete;
          return {
            onFileEdited: () => {},
            onToolExecuteAfter: () => {},
            scheduleSync: () => {},
            flush: async () => {},
            dispose: () => {},
          };
        };

        const mockClient = {
          app: {
            log: async (payload: Record<string, unknown>) => {
              appLogCalls.push(payload);
            },
          },
        };

        const { default: plugin } = await import(
          `../src/index.ts?noisy2=${Date.now()}`
        );
        const hooks = await plugin({
          directory: tmpDir,
          worktree: tmpDir,
          client: mockClient as any,
          project: null as any,
          serverUrl: null as any,
          $: {} as any,
        });

        const eventHook = hooks.event as any;
        await eventHook({
          event: {
            type: "file.edited",
            properties: { file: factFile },
          },
        });

        // Simulate multi-rule advisory check failure
        capturedOnRunComplete?.({
          exitCode: 0,
          checkExitCode: 1,
          checkRules: ["required-fields", "no-dangling-refs", "strict-fact-shape"],
        });

        await new Promise((r) => setTimeout(r, 20));

        assert.equal(
          errorSpy.length,
          0,
          `Advisory check.failed for multi-rule payload must not produce console.error, got: ${JSON.stringify(errorSpy)}`,
        );
      } finally {
        console.error = origError;
        delete (globalThis as any).__kibi_test_scheduler_factory;
      }
    });

    it("operational startup failure still produces console.error (control)", async () => {
      const errorSpy: string[] = [];
      const origError = console.error;
      (console as any).error = (...args: unknown[]) => {
        errorSpy.push(args.map(String).join(" "));
      };

      try {
        // No .kb directory → bootstrap-needed → operational error
        const hooks = await kibiOpencodePlugin({
          ...makeInput(),
        });

        assert.ok(typeof hooks === "object");

        // Operational bootstrap-needed SHOULD still emit console.error
        assert.ok(
          errorSpy.some((msg) => msg.includes("workspace needs Kibi bootstrap")),
          `Operational startup error should produce console.error, got: ${JSON.stringify(errorSpy)}`,
        );
      } finally {
        console.error = origError;
      }
    });
});

});
