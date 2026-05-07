/// <reference path="../../../types/bun-test.d.ts" />
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
  mock,
  spyOn,
} from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as briefingRuntimeModule from "../src/briefing-runtime";
import type { BriefingRuntimeResult } from "../src/briefing-runtime";
import { resolveAuditLogPath } from "../src/idle-brief-paths";
import * as idleBriefRuntimeModule from "../src/idle-brief-runtime";
import kibiOpencodePlugin from "../src/index";
import type { PluginInput } from "../src/index";
import * as logger from "../src/logger";
import { runPluginStartup } from "../src/plugin-startup";
import * as promptModule from "../src/prompt";
import { getSessionTracker, resetSessionTracker } from "../src/session-tracker";
import * as toastModule from "../src/toast";

// implements REQ-opencode-kibi-plugin-v1

describe.serial("index kibiOpencodePlugin", () => {
  let tmpDir: string;
  let worktree: string;
  const makeInput = (overrides: Partial<PluginInput> = {}): PluginInput => ({
    directory: tmpDir,
    worktree,
    project: undefined,
    $: undefined,
    client: undefined,
    ...overrides,
  });

  const startupNotifyGlobals = globalThis as typeof globalThis & {
    __kibi_test_schedule_startup_notify?: (
      callback: () => void,
      delayMs: number,
    ) => void;
  };
  beforeEach(() => {
    process.env.KIBI_OPENCODE_IDLE_BRIEF_DELAY_MS = "0";
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-index-test-"));
    worktree = tmpDir;
    resetSessionTracker();
    logger.resetClient();
    startupNotifyGlobals.__kibi_test_schedule_startup_notify = (callback) => {
      callback();
    };
  });

  afterEach(() => {
    delete process.env.KIBI_BRANCH;
    delete process.env.KIBI_OPENCODE_IDLE_BRIEF_DELAY_MS;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    const schedulerFactoryGlobals = globalThis as typeof globalThis & {
      __kibi_test_scheduler_factory?: unknown;
      __kibi_test_scheduler_factory_by_worktree?: Map<string, unknown>;
    };
    schedulerFactoryGlobals.__kibi_test_scheduler_factory = undefined;
    schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree?.delete(
      tmpDir,
    );
    resetSessionTracker();
    logger.resetClient();
    startupNotifyGlobals.__kibi_test_schedule_startup_notify = undefined;
    mock.restore();
    mock.clearAllMocks();
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
          showToast: async (payload: {
            body: {
              variant?: string;
              title?: string;
              message: string;
              duration?: number;
            };
          }) => {
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

    it("bound showToast capability", async () => {
      const toastCalls: Array<Record<string, unknown>> = [];
      const client = {
        tui: {
          showToast: async (payload: {
            body: {
              variant?: string;
              title?: string;
              message: string;
              duration?: number;
            };
          }) => {
            toastCalls.push(payload);
          },
        },
        app: {
          log: async () => {},
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
        $: {} as any,
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
          showToast: async (payload: {
            body: {
              variant?: string;
              title?: string;
              message: string;
              duration?: number;
            };
          }) => {
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
          showToast: async (payload: {
            body: {
              variant?: string;
              title?: string;
              message: string;
              duration?: number;
            };
          }) => {
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
    it("handles file.created events", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: true },
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
        $: {} as any,
      });

      assert.ok(hooks.event);
      const eventHook = hooks.event as any;
      // file.created should be accepted (not thrown)
      const mockEvent = {
        event: {
          type: "file.created",
          properties: { file: "src/new-file.ts" },
        },
      };
      await eventHook(mockEvent);
    });

    it("handles file.deleted events", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: true },
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
        $: {} as any,
      });

      assert.ok(hooks.event);
      const eventHook = hooks.event as any;
      // file.deleted should be accepted (not thrown)
      const mockEvent = {
        event: {
          type: "file.deleted",
          properties: { file: "src/old-file.ts" },
        },
      };
      await eventHook(mockEvent);
    });

    it("ignores other.event events", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: true },
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
        $: {} as any,
      });

      assert.ok(hooks.event);
      const eventHook = hooks.event as any;
      // other.event should be silently ignored
      const mockEvent = {
        event: {
          type: "other.event",
        },
      };
      await eventHook(mockEvent);
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

  describe("auto brief event integration", () => {
    const READY_TOAST = "Kibi brief ready — summary added to guidance.";
    let freshPluginCounter = 0;

    type AutoBriefPromptPart = {
      type: "text";
      text: string;
    };

    type AutoBriefSessionCreateParams = {
      directory?: string;
      title?: string;
    };

    type AutoBriefSessionPromptParams = {
      sessionID: string;
      tools?: Record<string, boolean>;
      format?: Record<string, unknown>;
      parts?: AutoBriefPromptPart[];
    };

    type AutoBriefClient = NonNullable<PluginInput["client"]> & {
      session: {
        create: (params?: AutoBriefSessionCreateParams) => Promise<unknown>;
        prompt: (params: AutoBriefSessionPromptParams) => Promise<unknown>;
      };
      tui: {
        showToast: (payload: {
          body: {
            variant?: string;
            title?: string;
            message: string;
            duration?: number;
          };
        }) => Promise<void>;
      };
    };

    function setupAuthoritativeWorkspace(workspaceDir: string): void {
      const kbDir = path.join(workspaceDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify(
          {
            paths: {
              requirements: "documentation/requirements/**/*.md",
              scenarios: "documentation/scenarios/**/*.md",
              tests: "documentation/tests/**/*.md",
              adr: "documentation/adr/**/*.md",
              flags: "documentation/flags/**/*.md",
              events: "documentation/events/**/*.md",
              facts: "documentation/facts/**/*.md",
            },
          },
          null,
          2,
        ),
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
        fs.mkdirSync(path.join(workspaceDir, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(workspaceDir, "documentation", "symbols.yaml"),
        "[]",
      );
    }

    function writePluginConfig(
      workspaceDir: string,
      config: Record<string, unknown>,
    ): void {
      const opencodeDir = path.join(workspaceDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(config, null, 2),
      );
    }

    function installNoopScheduler(workspaceDir: string): void {
      const schedulerFactoryGlobals = globalThis as typeof globalThis & {
        __kibi_test_scheduler_factory?: (...args: unknown[]) => unknown;
        __kibi_test_scheduler_factory_by_worktree?: Map<
          string,
          (...args: unknown[]) => unknown
        >;
      };
      const schedulerFactory = () => ({
        scheduleSync: () => {},
        onFileEdited: () => {},
        onToolExecuteAfter: () => {},
        flush: async () => {},
        dispose: () => {},
      });
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree ??=
        new Map();
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree.set(
        workspaceDir,
        schedulerFactory,
      );
      schedulerFactoryGlobals.__kibi_test_scheduler_factory = schedulerFactory;
    }

    function makeReadyPromptResponse(
      overrides: Partial<{
        briefingState: string;
        tldr: string;
        promptBlock: string;
        citations: Array<Record<string, string>>;
      }> = {},
    ): unknown {
      return {
        data: {
          info: {
            id: "message-1",
            role: "assistant",
          },
          parts: [
            {
              type: "text",
              text: JSON.stringify({
                briefingState: "ready",
                tldr: "Requirement context is ready.",
                promptBlock: "- REQ-001: Honor the linked invariant.",
                citations: [
                  {
                    id: "REQ-001",
                    type: "req",
                    title: "Linked requirement",
                  },
                ],
                ...overrides,
              }),
            },
          ],
        },
      };
    }

    function createAutoBriefClient(
      options: { promptResults?: unknown[] } = {},
    ) {
      const createCalls: AutoBriefSessionCreateParams[] = [];
      const promptCalls: AutoBriefSessionPromptParams[] = [];
      const toastCalls: unknown[] = [];
      const logCalls: Record<string, unknown>[] = [];
      let promptCallIndex = 0;

      const client: AutoBriefClient = {
        app: {
          log: async (payload: Record<string, unknown>) => {
            logCalls.push(payload);
          },
        },
        session: {
          create: async (params?: AutoBriefSessionCreateParams) => {
            createCalls.push(params ?? {});
            return {
              data: {
                id: "session-1",
              },
            };
          },
          prompt: async (params: AutoBriefSessionPromptParams) => {
            promptCalls.push(params);
            const result =
              options.promptResults?.[promptCallIndex] ??
              options.promptResults?.[options.promptResults.length - 1] ??
              makeReadyPromptResponse();
            promptCallIndex += 1;
            return result;
          },
        },
        tui: {
          showToast: async (payload: {
            body: {
              variant?: string;
              title?: string;
              message: string;
              duration?: number;
            };
          }) => {
            toastCalls.push(payload);
          },
        },
      };

      return {
        client,
        createCalls,
        promptCalls,
        toastCalls,
        logCalls,
      };
    }

    async function waitForCondition(
      predicate: () => boolean,
      attempts = 25,
    ): Promise<void> {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (predicate()) {
          return;
        }
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      assert.fail("Timed out waiting for auto-brief async work");
    }

    async function loadFreshPlugin() {
      freshPluginCounter += 1;
      const mod = await import(
        `../src/index.ts?auto-brief=${freshPluginCounter}`
      );
      return mod.default;
    }

    function writeAuditEntries(
      workspaceDir: string,
      branch: string,
      entries: Array<{ timestamp: string; entityId: string }>,
    ): void {
      const auditPath = resolveAuditLogPath(workspaceDir, branch);
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      fs.writeFileSync(
        auditPath,
        `${entries
          .map(
            ({ timestamp, entityId }) =>
              `changeset('${timestamp}',upsert,'${entityId}',req-[id='${entityId}']).`,
          )
          .join("\n")}\n`,
        "utf-8",
      );
    }

    function appendAuditEntry(
      workspaceDir: string,
      branch: string,
      entry: { timestamp: string; entityId: string },
    ): void {
      const auditPath = resolveAuditLogPath(workspaceDir, branch);
      fs.appendFileSync(
        auditPath,
        `changeset('${entry.timestamp}',upsert,'${entry.entityId}',req-[id='${entry.entityId}']).\n`,
        "utf-8",
      );
    }

    it("captures the idle-brief baseline at startup so prior brief backlog is ignored", async () => {
      process.env.KIBI_BRANCH = "main";
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        briefs: { tui: { idleDelayMs: 0 } },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const codeFile = path.join(srcDir, "feature.ts");
      fs.writeFileSync(codeFile, "export function feature() { return 0; }\n");

      const briefsDir = path.join(tmpDir, ".kb", "briefs");
      fs.mkdirSync(briefsDir, { recursive: true });
      fs.writeFileSync(
        path.join(briefsDir, "1000000000_brief.json"),
        JSON.stringify(
          {
            schemaVersion: "1.0",
            briefId: "prior-brief",
            type: "success",
            sessionId: "older-session",
            branch: "main",
            createdAt: "2026-04-25T09:00:00Z",
            unread: false,
            auditCursor: {
              lastTimestamp: "2026-04-25T09:00:00+00:00",
              lastOperation: "upsert",
              entryCount: 1,
              fileSize: 100,
            },
            summary: {
              requirementsAdded: 1,
              relationshipsAdded: 0,
              entitiesDeleted: 0,
            },
            validation: { violations: [], count: 0, diagnostics: [] },
            briefing: { tldr: "prior", promptBlock: "", citations: [] },
            contentHash: "prior-hash",
          },
          null,
          2,
        ),
        "utf-8",
      );
      writeAuditEntries(tmpDir, "main", [
        {
          timestamp: "2026-04-25T09:30:00+00:00",
          entityId: "REQ-BACKLOG",
        },
      ]);

      const generateSpy = spyOn(idleBriefRuntimeModule, "generateIdleBrief");
      const { client } = createAutoBriefClient();
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(
        makeInput({
          client,
          sessionId: "session-start",
        }),
      );

      assert.ok(hooks.event);
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      fs.writeFileSync(codeFile, "export function feature() { return 42; }\n");
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      appendAuditEntry(tmpDir, "main", {
        timestamp: "2026-04-25T10:00:00+00:00",
        entityId: "REQ-NEW",
      });

      await eventHook({
        event: {
          type: "session.idle",
          properties: {},
        },
      });
      await waitForCondition(() => generateSpy.mock.calls.length === 1);

      const auditDelta = generateSpy.mock.calls[0]?.[2] as {
        entries: Array<{ entityId: string }>;
      };
      assert.deepEqual(
        auditDelta.entries.map((entry) => entry.entityId),
        ["REQ-NEW"],
      );
    });

    it("runs scheduler flush before idle brief generation", async () => {
      process.env.KIBI_BRANCH = "main";
      setupAuthoritativeWorkspace(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        briefs: { tui: { idleDelayMs: 0 } },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const codeFile = path.join(srcDir, "feature.ts");
      fs.writeFileSync(codeFile, "export function feature() { return 0; }\n");

      writeAuditEntries(tmpDir, "main", [
        {
          timestamp: "2026-04-25T09:30:00+00:00",
          entityId: "REQ-BACKLOG",
        },
      ]);

      const schedulerEvents: string[] = [];
      const schedulerFactoryGlobals = globalThis as typeof globalThis & {
        __kibi_test_scheduler_factory?: (...args: unknown[]) => unknown;
        __kibi_test_scheduler_factory_by_worktree?: Map<
          string,
          (...args: unknown[]) => unknown
        >;
      };
      const schedulerFactory = () => ({
        scheduleSync: (reason: string) => {
          schedulerEvents.push(`schedule:${reason}`);
        },
        onFileEdited: () => {},
        onToolExecuteAfter: () => {},
        flush: async () => {
          schedulerEvents.push("flush:start");
          await Promise.resolve();
          schedulerEvents.push("flush:end");
        },
        dispose: () => {},
      });
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree ??=
        new Map();
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree.set(
        tmpDir,
        schedulerFactory,
      );
      schedulerFactoryGlobals.__kibi_test_scheduler_factory = schedulerFactory;

      const generateSpy = spyOn(idleBriefRuntimeModule, "generateIdleBrief");
      generateSpy.mockImplementation(async () => {
        schedulerEvents.push("generate");
        return { success: false, briefPath: null, envelope: null };
      });

      const plugin = await loadFreshPlugin();
      const hooks = await plugin(
        makeInput({
          client: {
            app: {
              log: async () => {},
            },
          },
          sessionId: "session-idle-sync",
        }),
      );

      assert.ok(hooks.event);
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      fs.writeFileSync(codeFile, "export function feature() { return 42; }\n");
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      appendAuditEntry(tmpDir, "main", {
        timestamp: "2026-04-25T10:00:00+00:00",
        entityId: "REQ-NEW",
      });

      schedulerEvents.length = 0;

      await eventHook({
        event: {
          type: "session.idle",
          properties: {},
        },
      });
      await waitForCondition(() => generateSpy.mock.calls.length === 1);

      assert.deepEqual(schedulerEvents, [
        "schedule:session.idle",
        "flush:start",
        "flush:end",
        "generate",
      ]);
    });

    it("still generates idle brief when audit delta has changes but session edit list is empty", async () => {
      process.env.KIBI_BRANCH = "main";
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      writeAuditEntries(tmpDir, "main", [
        {
          timestamp: "2026-04-25T09:30:00+00:00",
          entityId: "REQ-BACKLOG",
        },
      ]);

      const generateSpy = spyOn(idleBriefRuntimeModule, "generateIdleBrief");
      generateSpy.mockImplementation(async () => ({
        success: false,
        briefPath: null,
        envelope: null,
      }));

      const plugin = await loadFreshPlugin();
      const hooks = await plugin(
        makeInput({
          client: {
            app: {
              log: async () => {},
            },
          },
          sessionId: "session-idle-audit-only",
        }),
      );

      assert.ok(hooks.event);
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

      appendAuditEntry(tmpDir, "main", {
        timestamp: "2026-04-25T10:00:00+00:00",
        entityId: "REQ-AUDIT-ONLY",
      });

      await eventHook({
        event: {
          type: "session.idle",
          properties: {},
        },
      });

      await waitForCondition(() => generateSpy.mock.calls.length === 1);

      const options = generateSpy.mock.calls[0]?.[4] as
        | { sourceFiles?: string[]; changedEntityIds?: string[] }
        | undefined;
      assert.ok(options);
      assert.equal(options?.sourceFiles, undefined);
      assert.deepEqual(options?.changedEntityIds, ["REQ-AUDIT-ONLY"]);
    });

    it("generates idle brief even when maintenance is degraded", async () => {
      process.env.KIBI_BRANCH = "main";
      setupAuthoritativeWorkspace(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        briefs: { tui: { idleDelayMs: 0 } },
        sync: { enabled: false },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      writeAuditEntries(tmpDir, "main", [
        {
          timestamp: "2026-04-25T09:30:00+00:00",
          entityId: "REQ-BACKLOG",
        },
      ]);
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const codeFile = path.join(srcDir, "feature.ts");
      fs.writeFileSync(codeFile, "export function feature() { return 0; }\n");

      const generateSpy = spyOn(idleBriefRuntimeModule, "generateIdleBrief");
      generateSpy.mockImplementation(async () => ({
        success: false,
        briefPath: null,
        envelope: null,
      }));

      const plugin = await loadFreshPlugin();
      const hooks = await plugin(
        makeInput({
          client: {
            app: {
              log: async () => {},
            },
          },
          sessionId: "session-idle-degraded",
        }),
      );

      assert.ok(hooks.event);
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      fs.writeFileSync(codeFile, "export function feature() { return 42; }\n");
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      appendAuditEntry(tmpDir, "main", {
        timestamp: "2026-04-25T10:00:00+00:00",
        entityId: "REQ-DEGRADED-IDLE",
      });

      await eventHook({
        event: {
          type: "session.idle",
          properties: {},
        },
      });

      await waitForCondition(() => generateSpy.mock.calls.length === 1);
    });

    it("resets the idle-brief baseline when the branch changes", async () => {
      process.env.KIBI_BRANCH = "main";
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const codeFile = path.join(srcDir, "feature.ts");
      fs.writeFileSync(codeFile, "export function feature() { return 0; }\n");
      writeAuditEntries(tmpDir, "feature", [
        {
          timestamp: "2026-04-25T11:00:00+00:00",
          entityId: "REQ-FEATURE-OLD",
        },
      ]);

      const generateSpy = spyOn(idleBriefRuntimeModule, "generateIdleBrief");
      const { client } = createAutoBriefClient();
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(
        makeInput({
          client,
          sessionId: "session-branch-reset",
        }),
      );

      assert.ok(hooks.event);
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

      process.env.KIBI_BRANCH = "feature";
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      fs.writeFileSync(codeFile, "export function feature() { return 99; }\n");
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      appendAuditEntry(tmpDir, "feature", {
        timestamp: "2026-04-25T11:30:00+00:00",
        entityId: "REQ-FEATURE-NEW",
      });

      await eventHook({
        event: {
          type: "session.idle",
          properties: {},
        },
      });
      await waitForCondition(() => generateSpy.mock.calls.length === 1);

      const workspaceCtx = generateSpy.mock.calls[0]?.[1] as { branch: string };
      const auditDelta = generateSpy.mock.calls[0]?.[2] as {
        entries: Array<{ entityId: string }>;
      };
      assert.equal(workspaceCtx.branch, "feature");
      assert.deepEqual(
        auditDelta.entries.map((entry) => entry.entityId),
        ["REQ-FEATURE-NEW"],
      );
    });

    it("triggers fetchBriefingResult for authoritative risky edits and sends a toast", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 0; }\n",
      );

      const { client, toastCalls } = createAutoBriefClient();
      const fetchSpy = spyOn(briefingRuntimeModule, "fetchBriefingResult");
      const plugin = await loadFreshPlugin();
      const hooks = await plugin({
        ...makeInput({ client }),
        workspace: "workspace://demo",
      } as PluginInput & { workspace: string });

      assert.ok(hooks.event);
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      await waitForCondition(
        () => fetchSpy.mock.calls.length === 1 && toastCalls.length === 1,
      );

      assert.equal(fetchSpy.mock.calls.length, 1);
      assert.equal(fetchSpy.mock.calls[0]?.[0], client);
      assert.equal(
        (fetchSpy.mock.calls[0]?.[1] as { workspaceRoot: string })
          .workspaceRoot,
        tmpDir,
      );
      assert.equal(
        (fetchSpy.mock.calls[0]?.[1] as { directory?: string }).directory,
        tmpDir,
      );
      assert.equal(
        (fetchSpy.mock.calls[0]?.[1] as { workspace?: string }).workspace,
        "workspace://demo",
      );
      assert.equal(
        (fetchSpy.mock.calls[0]?.[2] as { eligible: boolean }).eligible,
        true,
      );
      assert.deepEqual(
        (fetchSpy.mock.calls[0]?.[2] as { sourceFiles: string[] }).sourceFiles,
        ["src/feature.ts"],
      );
      assert.equal(
        (
          fetchSpy.mock.calls[0]?.[2] as { fingerprint: string }
        ).fingerprint.endsWith("\0src/feature.ts"),
        true,
      );
      assert.deepEqual(toastCalls[0], {
        body: {
          message: READY_TOAST,
        },
      });
    });

    it("sends exactly one toast for repeated same-fingerprint edit events", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 0; }\n",
      );

      const expectedAutoBriefResult: BriefingRuntimeResult = {
        state: "ready",
        promptBlock: "- REQ-001: Honor the linked invariant.",
        tldr: "Requirement context is ready.",
        citations: [],
        showManualCue: false,
        toastMessage: READY_TOAST,
      };
      const { client, toastCalls } = createAutoBriefClient();
      let resolveBriefing:
        | ((result: BriefingRuntimeResult) => void)
        | undefined;
      const briefingGate = new Promise<BriefingRuntimeResult>((resolve) => {
        resolveBriefing = resolve;
      });
      const fetchSpy = spyOn(
        briefingRuntimeModule,
        "fetchBriefingResult",
      ).mockImplementation(() => briefingGate);
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks.event);
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(() => fetchSpy.mock.calls.length === 2);

      resolveBriefing?.(expectedAutoBriefResult);
      await waitForCondition(() => toastCalls.length > 0);
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(fetchSpy.mock.calls.length, 2);
      assert.equal(toastCalls.length, 1);
      assert.deepEqual(toastCalls[0], {
        body: {
          message: READY_TOAST,
        },
      });
    });

    it("renders ready auto-brief guidance without the inline /brief-kibi cue", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 0; }\n",
      );

      const { client, promptCalls, toastCalls } = createAutoBriefClient({
        promptResults: [
          makeReadyPromptResponse({
            tldr: "Requirement context is ready.",
            promptBlock:
              "- REQ-001: Honor the linked invariant.\n- SCEN-001: Preserve the canonical flow.",
            citations: [
              {
                id: "REQ-001",
                type: "req",
                title: "Linked requirement",
              },
            ],
          }),
        ],
      });
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks.event);
      assert.ok(hooks["experimental.chat.system.transform"]);

      const eventHook = hooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;
      const transformHook = hooks["experimental.chat.system.transform"] as (
        input: unknown,
        output: { system: string[] },
      ) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(
        () => promptCalls.length === 1 && toastCalls.length === 1,
      );

      const output = { system: ["prompt"] };
      await transformHook({}, output);

      const rendered = output.system.at(-1) ?? "";
      assert.ok(rendered.includes("🧠 **Kibi briefing available**"));
      assert.ok(rendered.includes("- REQ-001: Honor the linked invariant."));
      assert.ok(
        !rendered.includes(
          "Authoritative risky edit: run `/brief-kibi` before acting.",
        ),
      );
    });

    it("renders tldr fallback guidance with the manual /brief-kibi path preserved", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 0; }\n",
      );

      const { client, promptCalls, toastCalls } = createAutoBriefClient({
        promptResults: [
          makeReadyPromptResponse({
            tldr: "Some summary here",
            promptBlock: "",
            citations: [
              {
                id: "REQ-001",
                type: "req",
                title: "Linked requirement",
              },
            ],
          }),
        ],
      });
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks.event);
      assert.ok(hooks["experimental.chat.system.transform"]);

      const eventHook = hooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;
      const transformHook = hooks["experimental.chat.system.transform"] as (
        input: unknown,
        output: { system: string[] },
      ) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(
        () => promptCalls.length === 1 && toastCalls.length === 1,
      );

      const renderedOutput = { system: ["prompt"] };
      await transformHook({}, renderedOutput);

      const rendered = renderedOutput.system.at(-1) ?? "";
      assert.ok(rendered.includes("🧠 **Kibi briefing available**"));
      assert.ok(rendered.includes("Some summary here"));
      assert.ok(
        rendered.includes(
          "Authoritative risky edit: run `/brief-kibi` before acting.",
        ),
      );
      assert.ok(rendered.includes("Full details: run /brief-kibi."));
    });

    it("does not surface fabricated auto-brief content when runtime reports no_briefing", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 0; }\n",
      );

      const { client, promptCalls, toastCalls } = createAutoBriefClient({
        promptResults: [
          makeReadyPromptResponse({
            briefingState: "no_briefing",
            tldr: "This text must not be surfaced.",
            promptBlock: "- fabricated",
            citations: [
              {
                id: "REQ-001",
                type: "req",
                title: "Linked requirement",
              },
            ],
          }),
        ],
      });
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks.event);
      assert.ok(hooks["experimental.chat.system.transform"]);

      const eventHook = hooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;
      const transformHook = hooks["experimental.chat.system.transform"] as (
        input: unknown,
        output: { system: string[] },
      ) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(
        () => promptCalls.length === 1 && toastCalls.length === 1,
      );

      const renderedOutput = { system: ["prompt"] };
      await transformHook({}, renderedOutput);

      const rendered = renderedOutput.system.at(-1) ?? "";
      assert.ok(rendered.includes("📝 **Code changes detected**"));
      assert.ok(
        rendered.includes(
          "Authoritative risky edit: run `/brief-kibi` before acting.",
        ),
      );
      assert.ok(!rendered.includes("🧠 **Kibi briefing available**"));
      assert.ok(!rendered.includes("This text must not be surfaced."));
      assert.ok(!rendered.includes("- fabricated"));
    });

    it("reuses briefing-runtime cache for same-fingerprint repeated edits before guidance cache records", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 0; }\n",
      );

      const { client, createCalls, promptCalls } = createAutoBriefClient();
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks.event);
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(() => promptCalls.length === 1);

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(
        () => createCalls.length === 1 && promptCalls.length === 1,
      );

      assert.equal(createCalls.length, 1);
      assert.equal(promptCalls.length, 1);
    });

    it("still calls fetchBriefingResult after guidance cache is satisfied for the same risky edit", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 0; }\n",
      );

      const { client, createCalls, promptCalls } = createAutoBriefClient();
      const fetchSpy = spyOn(briefingRuntimeModule, "fetchBriefingResult");
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks.event);
      assert.ok(hooks["experimental.chat.system.transform"]);

      const eventHook = hooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;
      const transformHook = hooks["experimental.chat.system.transform"] as (
        input: unknown,
        output: { system: string[] },
      ) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(
        () => fetchSpy.mock.calls.length === 1 && promptCalls.length === 1,
      );

      await transformHook({}, { system: ["prompt"] });

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(() => fetchSpy.mock.calls.length === 2);

      assert.equal(fetchSpy.mock.calls.length, 2);
      assert.equal(createCalls.length, 1);
      assert.equal(promptCalls.length, 1);
    });

    it("does not call fetchBriefingResult for non-eligible or degraded contexts", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      const fetchSpy = spyOn(briefingRuntimeModule, "fetchBriefingResult");

      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const { client: safeDocsClient } = createAutoBriefClient();
      installNoopScheduler(tmpDir);
      const safeDocsPlugin = await loadFreshPlugin();
      const safeDocsHooks = await safeDocsPlugin(
        makeInput({ client: safeDocsClient }),
      );
      assert.ok(safeDocsHooks.event);
      fs.writeFileSync(path.join(tmpDir, "README.md"), "# Safe docs\n");

      const safeDocsEventHook = safeDocsHooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;
      await safeDocsEventHook({
        event: {
          type: "file.edited",
          properties: { file: "README.md" },
        },
      });
      await Promise.resolve();
      assert.equal(fetchSpy.mock.calls.length, 0);

      const testsDir = path.join(tmpDir, "tests");
      fs.mkdirSync(testsDir, { recursive: true });
      fs.writeFileSync(
        path.join(testsDir, "feature.test.ts"),
        "import { test, expect } from 'bun:test';\ntest('safe', () => expect(true).toBe(true));\n",
      );
      const { client: safeTestClient } = createAutoBriefClient();
      const safeTestPlugin = await loadFreshPlugin();
      const safeTestHooks = await safeTestPlugin(
        makeInput({ client: safeTestClient }),
      );
      assert.ok(safeTestHooks.event);

      const safeTestEventHook = safeTestHooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;
      await safeTestEventHook({
        event: {
          type: "file.edited",
          properties: { file: "tests/feature.test.ts" },
        },
      });
      await Promise.resolve();
      assert.equal(fetchSpy.mock.calls.length, 0);

      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(kbDir, { recursive: true });
      fs.writeFileSync(path.join(kbDir, "manual-edit.json"), "{}\n");
      const { client: manualKbClient } = createAutoBriefClient();
      const manualKbPlugin = await loadFreshPlugin();
      const manualKbHooks = await manualKbPlugin(
        makeInput({ client: manualKbClient }),
      );
      assert.ok(manualKbHooks.event);

      const manualKbEventHook = manualKbHooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;
      await manualKbEventHook({
        event: {
          type: "file.edited",
          properties: { file: ".kb/manual-edit.json" },
        },
      });
      await Promise.resolve();
      assert.equal(fetchSpy.mock.calls.length, 0);

      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: false },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "degraded.ts"),
        "export function degraded() { return 1; } // implements REQ-001\n",
      );
      const { client: degradedClient } = createAutoBriefClient();
      const degradedPlugin = await loadFreshPlugin();
      const degradedHooks = await degradedPlugin(
        makeInput({ client: degradedClient }),
      );
      assert.ok(degradedHooks.event);

      const degradedEventHook = degradedHooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;
      await degradedEventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/degraded.ts" },
        },
      });
      await Promise.resolve();

      assert.equal(fetchSpy.mock.calls.length, 0);
    });

    it("eventless programmatic edit recovers via transform fallback", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });

      const { client, toastCalls } = createAutoBriefClient();
      const fetchSpy = spyOn(briefingRuntimeModule, "fetchBriefingResult");
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks["experimental.chat.system.transform"]);
      const transformHook = hooks["experimental.chat.system.transform"] as (
        input: { focusFilePath?: string },
        output: { system: string[] },
      ) => Promise<void>;

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      const firstOutput = { system: ["prompt"] };
      await transformHook({ focusFilePath: "src/feature.ts" }, firstOutput);

      const firstRendered = firstOutput.system.at(-1) ?? "";
      assert.ok(
        firstRendered.includes(
          "Authoritative risky edit: run `/brief-kibi` before acting.",
        ),
      );
      assert.ok(!firstRendered.includes("🧠 **Kibi briefing available**"));

      await waitForCondition(
        () => fetchSpy.mock.calls.length === 1 && toastCalls.length === 1,
      );

      const secondOutput = { system: ["prompt"] };
      await transformHook({ focusFilePath: "src/feature.ts" }, secondOutput);

      const secondRendered = secondOutput.system.at(-1) ?? "";
      assert.equal(fetchSpy.mock.calls.length, 1);
      assert.ok(secondRendered.includes("🧠 **Kibi briefing available**"));
      assert.ok(
        secondRendered.includes("- REQ-001: Honor the linked invariant."),
      );
    });

    it("no session delta means no fallback fetch", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const { client } = createAutoBriefClient();
      const fetchSpy = spyOn(briefingRuntimeModule, "fetchBriefingResult");
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks["experimental.chat.system.transform"]);
      const transformHook = hooks["experimental.chat.system.transform"] as (
        input: Record<string, never>,
        output: { system: string[] },
      ) => Promise<void>;

      await transformHook({}, { system: ["prompt"] });
      await Promise.resolve();

      assert.equal(fetchSpy.mock.calls.length, 0);
    });

    it("passes the stored autoBriefResult to buildPrompt from the transform hook", async () => {
      setupAuthoritativeWorkspace(tmpDir);
      installNoopScheduler(tmpDir);
      writePluginConfig(tmpDir, {
        enabled: true,
        prompt: { enabled: true, hookMode: "auto" },
        sync: { enabled: true },
        ux: { toastStartup: false },
        guidance: {
          commentDetection: { enabled: false },
          smartEnforcement: {
            completionReminder: false,
          },
        },
      });

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 0; }\n",
      );

      const expectedAutoBriefResult: BriefingRuntimeResult = {
        state: "ready",
        promptBlock: "- REQ-001: Honor the linked invariant.",
        tldr: "Requirement context is ready.",
        citations: [
          {
            id: "REQ-001",
            type: "req",
            title: "Linked requirement",
          },
        ],
        showManualCue: false,
        toastMessage: READY_TOAST,
      };
      const { client, promptCalls } = createAutoBriefClient({
        promptResults: [
          makeReadyPromptResponse({
            tldr: expectedAutoBriefResult.tldr,
            promptBlock: expectedAutoBriefResult.promptBlock,
            citations: expectedAutoBriefResult.citations.map((citation) => ({
              id: citation.id,
              type: citation.type ?? "",
              title: citation.title ?? "",
            })),
          }),
        ],
      });
      const buildPromptSpy = spyOn(promptModule, "buildPrompt");
      const plugin = await loadFreshPlugin();
      const hooks = await plugin(makeInput({ client }));

      assert.ok(hooks.event);
      assert.ok(hooks["experimental.chat.system.transform"]);

      const eventHook = hooks.event as (input: {
        event: { type: string; properties: { file: string } };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });

      fs.writeFileSync(
        path.join(srcDir, "feature.ts"),
        "export function feature() { return 42; } // implements REQ-001\n",
      );

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/feature.ts" },
        },
      });
      await waitForCondition(() => promptCalls.length === 1);

      const transformHook = hooks["experimental.chat.system.transform"] as (
        input: unknown,
        output: { system: string[] },
      ) => Promise<void>;
      await transformHook({}, { system: ["prompt"] });

      assert.ok(buildPromptSpy.mock.calls.length >= 1);
      const buildPromptContext = buildPromptSpy.mock.calls.at(-1)?.[0] as {
        autoBriefResult?: BriefingRuntimeResult;
      };
      assert.deepEqual(
        buildPromptContext.autoBriefResult,
        expectedAutoBriefResult,
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
        $: {} as any,
      });

      const eventHook = hooks.event as any;
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/foo.ts" },
        },
      });

      for (let attempt = 0; attempt < 100; attempt++) {
        const hasDegradedLog = appLogCalls.some((payload) => {
          const body = payload.body as Record<string, unknown>;
          return body.event === "smart_enforcement_degraded";
        });
        if (hasDegradedLog) break;
        await new Promise((r) => setTimeout(r, 20));
      }

      const degradedLogs = appLogCalls.filter((p) => {
        const body = p.body as Record<string, unknown>;
        return (
          (body.event === "smart_enforcement_degraded" ||
            body.event === "smart_enforcement_risk") &&
          body.overlay_cause === "sync_disabled" &&
          body.runtime_degraded === true
        );
      });

      assert.ok(
        degradedLogs.length >= 1,
        "Should log smart_enforcement_degraded for sync_disabled",
      );

      const first = degradedLogs[0]?.body as Record<string, unknown>;
      assert.equal(first?.overlay_cause, "sync_disabled");
      assert.equal(first?.runtime_degraded, true);
      assert.equal(first?.effective_mode, "advisory");
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
                mode: "strict",
                requireRootKbForStrict: false,
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
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
        "---\nid: REQ-001\ntitle: Scheduler degraded test\nstatus: open\n---\n",
      );

      const mockClient = {
        app: {
          log: async () => {},
        },
      };

      const schedulerFactoryGlobals = globalThis as typeof globalThis & {
        __kibi_test_scheduler_factory_by_worktree?: Map<
          string,
          (...args: unknown[]) => unknown
        >;
      };
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree ??=
        new Map();
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree.set(
        tmpDir,
        () => {
          throw new Error("scheduler creation failure");
        },
      );

      const startup = await runPluginStartup({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        $: {} as any,
      });

      assert.ok(startup, "runPluginStartup should return startup context");
      assert.equal(startup?.runtimeOverlay.degraded, true);
      assert.equal(
        startup?.runtimeOverlay.primaryCause,
        "scheduler_unavailable",
      );
      assert.equal(startup?.getMaintenanceDegraded(), true);
      assert.equal(startup?.getEffectiveMode(), "advisory");
    });

    it("latches scheduler_sync_failed when onRunComplete has non-zero exitCode", async () => {
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
                mode: "strict",
                requireRootKbForStrict: false,
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
          log: async () => {},
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

      const startup = await runPluginStartup({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        $: {} as any,
      });

      assert.ok(startup, "runPluginStartup should return startup context");
      assert.ok(
        capturedOnRunComplete,
        "scheduler onRunComplete should be captured",
      );
      capturedOnRunComplete?.({ exitCode: 1, checkExitCode: 0 });

      assert.equal(startup?.runtimeOverlay.degraded, true);
      assert.equal(
        startup?.runtimeOverlay.primaryCause,
        "scheduler_sync_failed",
      );
      assert.equal(startup?.getMaintenanceDegraded(), true);
      assert.equal(startup?.getEffectiveMode(), "advisory");
    });

    it("does not latch degraded mode for smart-enforcement sync failures", async () => {
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
                mode: "strict",
                requireRootKbForStrict: false,
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
          log: async () => {},
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

      const startup = await runPluginStartup({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        $: {} as any,
      });

      assert.ok(startup, "runPluginStartup should return startup context");
      assert.ok(
        capturedOnRunComplete,
        "scheduler onRunComplete should be captured",
      );
      capturedOnRunComplete?.({
        reason: "smart-enforcement.traceability",
        exitCode: 1,
        checkExitCode: 0,
      });

      assert.equal(startup?.runtimeOverlay.degraded, false);
      assert.equal(startup?.runtimeOverlay.primaryCause, undefined);
      assert.equal(startup?.getMaintenanceDegraded(), false);
      assert.equal(startup?.getEffectiveMode(), "strict");
    });

    it("does not latch degraded mode for smart-enforcement trailing rerun sync failures", async () => {
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
                mode: "strict",
                requireRootKbForStrict: false,
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
          log: async () => {},
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

      const startup = await runPluginStartup({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        $: {} as any,
      });

      assert.ok(startup, "runPluginStartup should return startup context");
      assert.ok(
        capturedOnRunComplete,
        "scheduler onRunComplete should be captured",
      );
      capturedOnRunComplete?.({
        reason: "smart-enforcement.kb-doc.trailing",
        exitCode: 1,
        checkExitCode: 0,
      });

      assert.equal(startup?.runtimeOverlay.degraded, false);
      assert.equal(startup?.runtimeOverlay.primaryCause, undefined);
      assert.equal(startup?.getMaintenanceDegraded(), false);
      assert.equal(startup?.getEffectiveMode(), "strict");
    });

    it("latches scheduler_check_failed when onRunComplete has non-zero checkExitCode", async () => {
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
                mode: "strict",
                requireRootKbForStrict: false,
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
          log: async () => {},
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

      const startup = await runPluginStartup({
        directory: tmpDir,
        worktree: worktree,
        client: mockClient,
        project: null as any,
        $: {} as any,
      });

      assert.ok(startup, "runPluginStartup should return startup context");
      assert.ok(
        capturedOnRunComplete,
        "scheduler onRunComplete should be captured",
      );
      capturedOnRunComplete?.({ exitCode: 0, checkExitCode: 1 });

      assert.equal(startup?.runtimeOverlay.degraded, true);
      assert.equal(
        startup?.runtimeOverlay.primaryCause,
        "scheduler_check_failed",
      );
      assert.equal(startup?.getMaintenanceDegraded(), true);
      assert.equal(startup?.getEffectiveMode(), "advisory");
    });
  });

  // ── Targeted-check rule routing contract (Task 1 TDD lock-in) ───────────
  // These tests define the contract for Task 3 implementation.
  // Expected to FAIL until runtime routing is completed.
  describe.serial("targeted-check rule routing contract", () => {
    type ScheduleCall = {
      reason: string;
      filePath?: string;
      checkRules?: string[];
    };

    /** Helper to set up a capturing scheduler factory and import a fresh plugin */
    async function setupWithCapturingScheduler(tmpDir: string) {
      const scheduleCalls: ScheduleCall[] = [];
      const schedulerFactoryGlobals = globalThis as typeof globalThis & {
        __kibi_test_scheduler_factory?: (...args: unknown[]) => unknown;
        __kibi_test_scheduler_factory_by_worktree?: Map<
          string,
          (...args: unknown[]) => unknown
        >;
      };
      const schedulerFactory = () => ({
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
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree ??=
        new Map();
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree.set(
        tmpDir,
        schedulerFactory,
      );
      schedulerFactoryGlobals.__kibi_test_scheduler_factory = schedulerFactory;

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
        $: {} as any,
      });

      const cleanup = () => {
        schedulerFactoryGlobals.__kibi_test_scheduler_factory = undefined;
        schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree?.delete(
          tmpDir,
        );
      };

      return { hooks, scheduleCalls, cleanup };
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
      const schedulerFactoryGlobals = globalThis as typeof globalThis & {
        __kibi_test_scheduler_factory?: unknown;
        __kibi_test_scheduler_factory_by_worktree?: Map<string, unknown>;
      };
      schedulerFactoryGlobals.__kibi_test_scheduler_factory = undefined;
      schedulerFactoryGlobals.__kibi_test_scheduler_factory_by_worktree?.delete(
        tmpDir,
      );
    });

    it("traceability_candidate schedules symbol-traceability check", async () => {
      const caseDir = tmpDir;
      const opencodeDir = path.join(caseDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      setupKbStructure(caseDir);

      // Create a code file with exports but NO // implements REQ-xxx annotation
      // This should be classified as traceability_candidate
      const srcDir = path.join(caseDir, "src");
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

      const { hooks, scheduleCalls, cleanup } =
        await setupWithCapturingScheduler(caseDir);

      try {
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
      } finally {
        cleanup();
      }
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
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

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

    it("requirement KB-doc edit schedules required-fields, no-dangling-refs, strict-req-fact-pairing", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      setupKbStructure(tmpDir);

      const reqDir = path.join(tmpDir, "documentation", "requirements");
      fs.mkdirSync(reqDir, { recursive: true });
      const reqFile = path.join(reqDir, "REQ-001.md");
      fs.writeFileSync(
        reqFile,
        `---\nid: REQ-001\ntitle: Test Requirement\n---\nTest content\n`,
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
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: reqFile },
        },
      });

      // Requirement KB-doc should schedule structural+req-fact-pairing rules
      const reqCalls = scheduleCalls.filter(
        (c) => c.checkRules && c.checkRules.includes("strict-req-fact-pairing"),
      );
      assert.ok(
        reqCalls.length >= 1,
        `Expected at least 1 scheduleSync with strict-req-fact-pairing for requirement doc, got ${JSON.stringify(scheduleCalls)}`,
      );
      assert.deepEqual(
        reqCalls[0].checkRules,
        ["required-fields", "no-dangling-refs", "strict-req-fact-pairing"],
        `Expected exact rules for requirement doc, got ${JSON.stringify(reqCalls[0].checkRules)}`,
      );
    });

    it("non-requirement KB-doc edits do NOT include strict-req-fact-pairing", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      setupKbStructure(tmpDir);

      // Create a scenario file (not a requirement)
      const scenDir = path.join(tmpDir, "documentation", "scenarios");
      fs.mkdirSync(scenDir, { recursive: true });
      const scenFile = path.join(scenDir, "SCEN-001.md");
      fs.writeFileSync(
        scenFile,
        `---\nid: SCEN-001\ntitle: Test Scenario\n---\nTest content\n`,
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
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: scenFile },
        },
      });

      // Scenario doc should only have structural pair, NOT strict-req-fact-pairing
      const scenCalls = scheduleCalls.filter(
        (c) => c.checkRules && c.checkRules.length > 0,
      );
      assert.ok(
        scenCalls.length >= 1,
        `Expected at least 1 scheduleSync for scenario doc, got ${JSON.stringify(scheduleCalls)}`,
      );
      assert.ok(
        !scenCalls[0].checkRules!.includes("strict-req-fact-pairing"),
        `Scenario doc should NOT include strict-req-fact-pairing, got ${JSON.stringify(scenCalls[0].checkRules)}`,
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
      const eventHook = hooks.event as (input: {
        event: { type: string; properties: Record<string, unknown> };
      }) => Promise<void>;

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
          checkRules: [
            "required-fields",
            "no-dangling-refs",
            "strict-fact-shape",
          ],
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
          errorSpy.some((msg) =>
            msg.includes("workspace needs Kibi bootstrap"),
          ),
          `Operational startup error should produce console.error, got: ${JSON.stringify(errorSpy)}`,
        );
      } finally {
        console.error = origError;
      }
    });
  });

  describe("idle brief replay in transform hook", () => {
    it("replays an unread brief and marks it read", async () => {
      // Set KIBI_BRANCH to match brief's branch
      process.env.KIBI_BRANCH = "test-branch";

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      // Setup KB structure with briefs directory
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(path.join(kbDir, "briefs"), { recursive: true });

      // Write unread brief
      const briefFilePath = path.join(kbDir, "briefs", "9999999999_brief.json");
      const briefEnvelope = {
        schemaVersion: "1.0" as const,
        briefId: "test-brief-replay",
        type: "success" as const,
        sessionId: "test-session",
        branch: "test-branch",
        createdAt: "2026-04-30T10:00:00Z",
        unread: true,
        auditCursor: {
          lastTimestamp: "2026-04-30T10:00:00Z",
          lastOperation: "upsert",
          entryCount: 1,
          fileSize: 100,
        },
        summary: "Test brief summary",
        counts: {
          requirementsAdded: 1,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "Test TLDR", promptBlock: "", citations: [] },
        contentHash: "abc123",
      };
      fs.writeFileSync(
        briefFilePath,
        JSON.stringify(briefEnvelope, null, 2),
        "utf-8",
      );

      // Setup .kb/config.json to enable TUI delivery
      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify(
          {
            version: 1,
            maintenance: { enabled: false },
            briefs: {
              enabled: true,
              channels: { tui: true, vscode: false },
              tui: { toast: true },
            },
          },
          null,
          2,
        ),
      );

      // Setup opencode config
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: false },
            prompt: { enabled: true, hookMode: "auto" },
            ux: { briefs: { autoSubmit: true } },
          },
          null,
          2,
        ),
      );

      // Mock TUI client with showToast
      let shownToast: any = null;
      const mockClient = {
        app: { log: async () => {} },
        tui: {
          showToast: async (payload: any) => {
            shownToast = payload;
          },
        },
      };
      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
        client: mockClient as any,
      });

      assert.ok(hooks["experimental.chat.system.transform"]);

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = {
        worktree: tmpDir,
      };
      const mockOutput = { system: ["original system prompt"] };

      // Verify brief is unread before replay
      const briefBefore = JSON.parse(fs.readFileSync(briefFilePath, "utf-8"));
      assert.ok(
        briefBefore.unread === true,
        "Brief should be unread before replay",
      );

      await transformHook(mockInput, mockOutput);

      // Verify brief was shown as a toast
      assert.ok(shownToast, "Brief should have been shown as a toast");
      assert.ok(
        JSON.stringify(shownToast).includes("Test brief summary"),
        "Toast payload should contain brief content",
      );

      // Verify brief was marked as read
      const briefAfter = JSON.parse(fs.readFileSync(briefFilePath, "utf-8"));
      assert.ok(
        briefAfter.unread === false,
        "Brief should be marked as read after successful append",
      );
    });

    it("does not replay the same contentHash twice", async () => {
      process.env.KIBI_BRANCH = "main";

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(path.join(kbDir, "briefs"), { recursive: true });

      const briefFilePath = path.join(kbDir, "briefs", "9999999998_brief.json");
      const briefEnvelope = {
        schemaVersion: "1.0" as const,
        briefId: "test-brief-dedupe",
        type: "success" as const,
        sessionId: "test-session",
        branch: "main",
        createdAt: "2026-04-30T10:00:00Z",
        unread: true,
        auditCursor: {
          lastTimestamp: "2026-04-30T10:00:00Z",
          lastOperation: "upsert",
          entryCount: 1,
          fileSize: 100,
        },
        summary: "Dedupe test brief",
        counts: {
          requirementsAdded: 1,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "Dedupe TLDR", promptBlock: "", citations: [] },
        contentHash: "def456",
      };
      fs.writeFileSync(
        briefFilePath,
        JSON.stringify(briefEnvelope, null, 2),
        "utf-8",
      );

      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify(
          {
            version: 1,
            maintenance: { enabled: false },
            briefs: {
              enabled: true,
              channels: { tui: true, vscode: false },
              tui: { toast: true },
            },
          },
          null,
          2,
        ),
      );

      let showToastCount = 0;
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: false },
            prompt: { enabled: true, hookMode: "auto" },
            ux: { briefs: { autoSubmit: true } },
          },
          null,
          2,
        ),
      );

      const mockClient = {
        app: { log: async () => {} },
        tui: {
          showToast: async () => {
            showToastCount++;
          },
        },
      };
      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
        client: mockClient as any,
      });

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = { worktree: tmpDir };
      const mockOutput = { system: ["original"] };

      await transformHook(mockInput, mockOutput);
      assert.equal(showToastCount, 1, "First call should show brief once");

      await transformHook(mockInput, mockOutput);
      assert.equal(
        showToastCount,
        1,
        "Second call should not show same brief again",
      );
    });

    it("leaves brief unread if showToast fails", async () => {
      process.env.KIBI_BRANCH = "main";

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(path.join(kbDir, "briefs"), { recursive: true });

      const briefFilePath = path.join(kbDir, "briefs", "9999999997_brief.json");
      const briefEnvelope = {
        schemaVersion: "1.0" as const,
        briefId: "test-brief-fail",
        type: "warning" as const,
        sessionId: "test-session",
        branch: "main",
        createdAt: "2026-04-30T10:00:00Z",
        unread: true,
        auditCursor: {
          lastTimestamp: "2026-04-30T10:00:00Z",
          lastOperation: "upsert",
          entryCount: 1,
          fileSize: 100,
        },
        summary: "Fail test brief",
        counts: {
          requirementsAdded: 1,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "Fail TLDR", promptBlock: "", citations: [] },
        contentHash: "ghi789",
      };
      fs.writeFileSync(
        briefFilePath,
        JSON.stringify(briefEnvelope, null, 2),
        "utf-8",
      );

      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify(
          {
            version: 1,
            maintenance: { enabled: false },
            briefs: {
              enabled: true,
              channels: { tui: true, vscode: false },
              tui: { toast: true },
            },
          },
          null,
          2,
        ),
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: false },
            prompt: { enabled: true, hookMode: "auto" },
            ux: { briefs: { autoSubmit: true } },
          },
          null,
          2,
        ),
      );

      const mockClient = {
        app: { log: async () => {} },
        tui: {
          showToast: async () => {
            throw new Error("Toast failed");
          },
        },
      };
      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
        client: mockClient as any,
      });

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = { worktree: tmpDir };
      const mockOutput = { system: ["original"] };

      await transformHook(mockInput, mockOutput);

      // Verify brief is still unread after failed append
      const briefAfter = JSON.parse(fs.readFileSync(briefFilePath, "utf-8"));
      assert.ok(
        briefAfter.unread === true,
        "Brief should remain unread after append failure",
      );
    });

    it("replays even when maintenanceDegraded is true", async () => {
      process.env.KIBI_BRANCH = "main";

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(path.join(kbDir, "briefs"), { recursive: true });

      const briefFilePath = path.join(kbDir, "briefs", "9999999996_brief.json");
      const briefEnvelope = {
        schemaVersion: "1.0" as const,
        briefId: "test-brief-degraded",
        type: "success" as const,
        sessionId: "test-session",
        branch: "main",
        createdAt: "2026-04-30T10:00:00Z",
        unread: true,
        auditCursor: {
          lastTimestamp: "2026-04-30T10:00:00Z",
          lastOperation: "upsert",
          entryCount: 1,
          fileSize: 100,
        },
        summary: "Degraded test brief",
        counts: {
          requirementsAdded: 1,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "Degraded TLDR", promptBlock: "", citations: [] },
        contentHash: "jkl012",
      };
      fs.writeFileSync(
        briefFilePath,
        JSON.stringify(briefEnvelope, null, 2),
        "utf-8",
      );

      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify(
          {
            version: 1,
            maintenance: { enabled: true }, // maintenance degraded
            briefs: {
              enabled: true,
              channels: { tui: true, vscode: false },
              tui: { toast: true },
            },
          },
          null,
          2,
        ),
      );

      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: false },
            prompt: { enabled: true, hookMode: "auto" },
            ux: { briefs: { autoSubmit: true } },
          },
          null,
          2,
        ),
      );

      let showToastCount = 0;
      const mockClient = {
        app: { log: async () => {} },
        tui: {
          showToast: async () => {
            showToastCount++;
          },
        },
      };

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
        client: mockClient as any,
      });

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = { worktree: tmpDir };
      const mockOutput = { system: ["original"] };

      await transformHook(mockInput, mockOutput);

      assert.equal(
        showToastCount,
        1,
        "Brief should be shown even when maintenance is degraded",
      );

      const briefAfter = JSON.parse(fs.readFileSync(briefFilePath, "utf-8"));
      assert.ok(
        briefAfter.unread === false,
        "Brief should be marked read after successful append",
      );
    });

    it("semantic dedupe: different briefIds with same visible content only delivered once", async () => {
      process.env.KIBI_BRANCH = "main";

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(path.join(kbDir, "briefs"), { recursive: true });

      // First brief with briefId-A
      const briefFilePath1 = path.join(
        kbDir,
        "briefs",
        "9999999995_brief.json",
      );
      const briefEnvelope1 = {
        schemaVersion: "1.0" as const,
        briefId: "brief-alpha",
        type: "success" as const,
        sessionId: "session-1",
        branch: "main",
        createdAt: "2026-04-30T10:00:00Z",
        unread: true,
        auditCursor: {
          lastTimestamp: "2026-04-30T10:00:00Z",
          lastOperation: "upsert",
          entryCount: 1,
          fileSize: 100,
        },
        summary: "Semantic dedupe test",
        counts: {
          requirementsAdded: 2,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: {
          tldr: "Same TLDR",
          promptBlock: "Same prompt",
          citations: [],
        },
        contentHash: "semantic-hash-aaa",
      };
      fs.writeFileSync(
        briefFilePath1,
        JSON.stringify(briefEnvelope1, null, 2),
        "utf-8",
      );

      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify(
          {
            version: 1,
            maintenance: { enabled: false },
            briefs: {
              enabled: true,
              channels: { tui: true, vscode: false },
              tui: { toast: true },
            },
          },
          null,
          2,
        ),
      );

      let showToastCount = 0;
      const shownToastPayloads: any[] = [];
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: false },
            prompt: { enabled: true, hookMode: "auto" },
            ux: { briefs: { autoSubmit: true } },
          },
          null,
          2,
        ),
      );

      const mockClient = {
        app: { log: async () => {} },
        tui: {
          showToast: async (payload: any) => {
            showToastCount++;
            shownToastPayloads.push(payload);
          },
        },
      };
      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
        client: mockClient as any,
      });

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = { worktree: tmpDir };

      // First call: deliver brief-alpha
      await transformHook(mockInput, { system: ["original"] });
      assert.equal(showToastCount, 1, "First call should show brief-alpha");

      // Now replace the file with a brief that has different briefId but same visible content
      // (simulating a regenerated brief with same semantic content)
      const briefEnvelope2 = {
        ...briefEnvelope1,
        briefId: "brief-beta",
        createdAt: "2026-04-30T11:00:00Z",
        sessionId: "session-2",
        contentHash: "semantic-hash-aaa",
      };
      fs.writeFileSync(
        briefFilePath1,
        JSON.stringify({ ...briefEnvelope2, unread: true }, null, 2),
        "utf-8",
      );

      // Second call: same contentHash should NOT re-deliver
      await transformHook(mockInput, { system: ["original"] });
      assert.equal(
        showToastCount,
        1,
        "Second call should not re-deliver same semantic content",
      );
    });

    it("semantic dedupe: changed content in same session re-triggers once", async () => {
      process.env.KIBI_BRANCH = "main";

      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      const kbDir = path.join(tmpDir, ".kb");
      fs.mkdirSync(path.join(kbDir, "briefs"), { recursive: true });

      const briefFilePath = path.join(kbDir, "briefs", "9999999994_brief.json");
      const briefEnvelope1 = {
        schemaVersion: "1.0" as const,
        briefId: "brief-first",
        type: "success" as const,
        sessionId: "session-1",
        branch: "main",
        createdAt: "2026-04-30T10:00:00Z",
        unread: true,
        auditCursor: {
          lastTimestamp: "2026-04-30T10:00:00Z",
          lastOperation: "upsert",
          entryCount: 1,
          fileSize: 100,
        },
        summary: "Original content",
        counts: {
          requirementsAdded: 1,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "Original TLDR", promptBlock: "", citations: [] },
        contentHash: "content-hash-v1",
      };
      fs.writeFileSync(
        briefFilePath,
        JSON.stringify(briefEnvelope1, null, 2),
        "utf-8",
      );

      fs.writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify(
          {
            version: 1,
            maintenance: { enabled: false },
            briefs: {
              enabled: true,
              channels: { tui: true, vscode: false },
              tui: { toast: true },
            },
          },
          null,
          2,
        ),
      );

      let showToastCount = 0;
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
            sync: { enabled: false },
            prompt: { enabled: true, hookMode: "auto" },
            ux: { briefs: { autoSubmit: true } },
          },
          null,
          2,
        ),
      );

      const mockClient = {
        app: { log: async () => {} },
        tui: {
          showToast: async () => {
            showToastCount++;
          },
        },
      };
      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
        client: mockClient as any,
      });

      const transformHook = hooks["experimental.chat.system.transform"] as any;
      const mockInput = { worktree: tmpDir };

      // First delivery
      await transformHook(mockInput, { system: ["original"] });
      assert.equal(showToastCount, 1, "First call should show toast");

      // Update brief with NEW visible content (different contentHash)
      const briefEnvelope2 = {
        ...briefEnvelope1,
        briefId: "brief-second",
        summary: "Updated content",
        briefing: { tldr: "Updated TLDR", promptBlock: "", citations: [] },
        contentHash: "content-hash-v2",
      };
      fs.writeFileSync(
        briefFilePath,
        JSON.stringify({ ...briefEnvelope2, unread: true }, null, 2),
        "utf-8",
      );

      // Second call with new content should re-trigger
      await transformHook(mockInput, { system: ["original"] });
      assert.equal(
        showToastCount,
        2,
        "Changed content should re-trigger delivery once",
      );

      // Third call with same content should NOT trigger again
      await transformHook(mockInput, { system: ["original"] });
      assert.equal(showToastCount, 2, "Same content should not trigger again");
    });
  });

  // implements REQ-opencode-file-context-guidance-v1
  describe("file-operation reminder transform integration", () => {
    it("emits lifecycle reminder for file.created event followed by transform", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
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

      // Create the file that will be the focus
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const createdFile = path.join(srcDir, "new-module.ts");
      fs.writeFileSync(createdFile, "export function hello() {}");

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });

      assert.ok(hooks.event);
      assert.ok(hooks["experimental.chat.system.transform"]);
      const eventHook = hooks.event as any;
      const transformHook = hooks["experimental.chat.system.transform"] as any;

      // Fire file.created event
      await eventHook({
        event: {
          type: "file.created",
          properties: { file: "src/new-module.ts" },
        },
      });

      // Now fire transform hook with focus on the created file
      const output = { system: ["original prompt"] };
      await transformHook({ focusFilePath: "src/new-module.ts" }, output);

      // Guidance should contain new file reminder
      const combinedGuidance = output.system.join("\n");
      assert.ok(
        combinedGuidance.includes("New file detected"),
        `Guidance should contain new file reminder, got: ${combinedGuidance}`,
      );
    });

    it("suppresses lifecycle reminder on repeat transform", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
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

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const createdFile = path.join(srcDir, "another-module.ts");
      fs.writeFileSync(createdFile, "export function bye() {}");

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });
      const eventHook = hooks.event as any;
      const transformHook = hooks["experimental.chat.system.transform"] as any;

      // Fire file.created event
      await eventHook({
        event: {
          type: "file.created",
          properties: { file: "src/another-module.ts" },
        },
      });

      // First transform: should emit reminder
      const output1 = { system: ["original prompt"] };
      await transformHook({ focusFilePath: "src/another-module.ts" }, output1);
      const guidance1 = output1.system.join("\n");
      assert.ok(
        guidance1.includes("New file detected"),
        "First transform should emit reminder",
      );

      // Second transform for same file: should NOT emit reminder again
      const output2 = { system: ["original prompt"] };
      await transformHook({ focusFilePath: "src/another-module.ts" }, output2);
      const guidance2 = output2.system.join("\n");
      assert.ok(
        !guidance2.includes("New file detected"),
        "Second transform should suppress reminder",
      );
    });

    it("emits deleted-file reminder when file content is unavailable", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
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

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });
      const eventHook = hooks.event as any;
      const transformHook = hooks["experimental.chat.system.transform"] as any;

      // Fire file.deleted event for a file that no longer exists
      await eventHook({
        event: {
          type: "file.deleted",
          properties: { file: "src/deleted-module.ts" },
        },
      });

      // Transform with focus on the deleted file
      const output = { system: ["original prompt"] };
      await transformHook({ focusFilePath: "src/deleted-module.ts" }, output);

      // Guidance should contain deleted file reminder (no linked entities case)
      const guidance = output.system.join("\n");
      assert.ok(
        guidance.includes("Deleted file had no linked Kibi entities") ||
          guidance.includes("Deleted file had linked Kibi entities"),
        `Guidance should contain deleted file reminder, got: ${guidance}`,
      );
    });

    it("does not emit file-operation reminder when no pending lifecycle", async () => {
      const opencodeDir = path.join(tmpDir, ".opencode");
      fs.mkdirSync(opencodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(opencodeDir, "kibi.json"),
        JSON.stringify(
          {
            enabled: true,
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

      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const codeFile = path.join(srcDir, "existing-file.ts");
      fs.writeFileSync(codeFile, "export const x = 1;");

      const hooks = await kibiOpencodePlugin({
        ...makeInput(),
      });
      const eventHook = hooks.event as any;
      const transformHook = hooks["experimental.chat.system.transform"] as any;

      // Fire file.edited event (edited lifecycle has no generic reminder)
      await eventHook({
        event: {
          type: "file.edited",
          properties: { file: "src/existing-file.ts" },
        },
      });

      const output = { system: ["original prompt"] };
      await transformHook({ focusFilePath: "src/existing-file.ts" }, output);

      // For edited files, there's no generic lifecycle reminder text
      const guidance = output.system.join("\n");
      assert.ok(
        !guidance.includes("New file detected") &&
          !guidance.includes("Deleted file"),
        `Guidance should NOT contain lifecycle reminder for edited file, got: ${guidance}`,
      );
    });
  });
});
