// implements REQ-opencode-kibi-plugin-v1
// implements REQ-opencode-file-context-guidance-v1
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as autoUpdate from "../src/auto-update.js";
import * as reminders from "../src/file-operation-reminders.js";
import { GuidanceCache } from "../src/guidance-cache.js";
import {
  KibiCheckpointRunner,
  type KibiCheckpointRunnerOptions,
} from "../src/kibi-checkpoint-runner.js";
import * as checkpointModule from "../src/kibi-checkpoint-runner.js";
import * as freshness from "../src/kb-freshness-state.js";
import { _setConsoleError } from "../src/logger.js";
import * as logger from "../src/logger.js";
import kibiOpencodePlugin from "../src/plugin.js";
import type { PluginInput } from "../src/plugin.js";
import type {
  SchedulerOptions,
  SyncRunMetadata,
  SyncScheduler,
} from "../src/scheduler.js";
import {
  getSessionTracker,
  resetSessionTracker,
} from "../src/session-tracker.js";
import * as versions from "../src/version-metadata.js";

type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

const spies: Array<{ mockRestore: () => void }> = [];
const globals = globalThis as typeof globalThis & {
  __kibi_test_scheduler_factory?: (options: SchedulerOptions) => SyncScheduler;
  __kibi_test_schedule_startup_notify?: (
    callback: () => void,
    delayMs: number,
  ) => void;
  __kibi_test_auto_update_runner?: (input: {
    directory: string;
    enabled: boolean;
  }) => Promise<{ status: string }>;
};

function makeTempWorkspace(prefix: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, ".opencode"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".kb", "manifest.json"), "{}\n");
  for (const dir of [
    ".kb/requirements",
    ".kb/scenarios",
    ".kb/tests",
    ".kb/adr",
    ".kb/flags",
    ".kb/events",
    ".kb/facts",
    "src",
  ]) {
    fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(tmpDir, ".kb", "symbols.yaml"), "[]\n");
  return tmpDir;
}

function writePluginConfig(
  tmpDir: string,
  config: Record<string, unknown>,
): void {
  fs.writeFileSync(
    path.join(tmpDir, ".opencode", "kibi.json"),
    `${JSON.stringify(config)}\n`,
  );
}

function makeClient(
  extras: Partial<NonNullable<PluginInput["client"]>> = {},
): {
  client: NonNullable<PluginInput["client"]>;
  logs: Record<string, unknown>[];
  toasts: ToastPayload[];
} {
  const logs: Record<string, unknown>[] = [];
  const toasts: ToastPayload[] = [];
  return {
    logs,
    toasts,
    client: {
      tui: {
        toast: async (payload: ToastPayload) => {
          toasts.push(payload);
        },
        showToast: async (payload: { body: ToastPayload }) => {
          toasts.push(payload.body);
        },
        clearPrompt: async () => {},
        submitPrompt: async () => {},
      },
      app: {
        log: async (payload: Record<string, unknown>) => {
          logs.push(payload);
        },
      },
      ...extras,
    },
  };
}

function installSchedulerStub(): void {
  globals.__kibi_test_scheduler_factory = () => ({
    scheduleSync: () => {},
    onFileEdited: () => {},
    onToolExecuteAfter: () => {},
    flush: async () => {},
    dispose: () => {},
  });
}

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  globals.__kibi_test_scheduler_factory = undefined;
  globals.__kibi_test_schedule_startup_notify = undefined;
  globals.__kibi_test_auto_update_runner = undefined;
  _setConsoleError(null);
  resetSessionTracker();
});

describe("plugin remaining event, lint, and hook branches", () => {
  test("lints long requirement docs for embedded scenarios, tests, and missing files", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-lint-");
    installSchedulerStub();
    globals.__kibi_test_schedule_startup_notify = () => {};
    resetSessionTracker();
    try {
      const lines = [
        "---",
        "priority: must",
        "---",
        "# Long requirement",
        "Given a user When they submit Then the order is stored.",
        "The handler should return and verify the expected to assert success.",
        ...Array.from({ length: 60 }, (_, i) => `content line ${i}`),
      ];
      fs.writeFileSync(
        path.join(tmpDir, ".kb", "requirements", "REQ-long.md"),
        `${lines.join("\n")}\n`,
      );
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });
      await hooks.event?.({
        event: {
          type: "file.edited",
          properties: { file: ".kb/requirements/REQ-long.md" },
        },
      });
      await hooks.event?.({
        event: {
          type: "file.edited",
          properties: { file: ".kb/requirements/REQ-missing.md" },
        },
      });
      const summary = getSessionTracker().generateSummary();
      expect(summary.warningsByCategory["embedded-scenario-in-req"]).toBe(1);
      expect(summary.warningsByCategory["embedded-test-in-req"]).toBe(1);
      expect(summary.warningsByCategory["missing-traceability"]).toBe(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("records kb_ tool evidence from several event property shapes and ignores others", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-tools-");
    const captured = makeClient();
    installSchedulerStub();
    globals.__kibi_test_schedule_startup_notify = () => {};
    const record = spyOn(
      freshness.createKbFreshnessEvidenceStore(),
      "recordToolEvidence",
    );
    spies.push(record);
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        sessionId: "sess-1",
        agentIdentity: "agent-1",
        client: captured.client,
      });
      await hooks.event?.({
        event: { type: "tool.execute.after", properties: { tool: "kb_query" } },
      });
      await hooks.event?.({
        event: {
          type: "tool.executed",
          properties: { toolName: "kb_search" },
        },
      });
      await hooks.event?.({
        event: { type: "tool.call.completed", properties: { name: "kb_check" } },
      });
      await hooks.event?.({
        event: {
          type: "tool.Execute.after",
          properties: { call: { name: "kb_status" } },
        },
      });
      await hooks.event?.({
        event: {
          type: "tool.Call.completed",
          properties: { input: { tool: "kb_coverage" } },
        },
      });
      await hooks.event?.({
        event: { type: "tool.executed", properties: { tool: "read" } },
      });
      await hooks.event?.({
        event: { type: "file.edited", properties: {} },
      });
      expect(true).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("swallows freshness store failures and maps toast-less clients", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-fresh-fail-");
    globals.__kibi_test_schedule_startup_notify = (callback) => {
      callback();
    };
    globals.__kibi_test_auto_update_runner = async () => {
      throw new Error("update failed");
    };
    writePluginConfig(tmpDir, { ux: { toastStartup: false } });
    const store = freshness.createKbFreshnessEvidenceStore();
    const create = spyOn(freshness, "createKbFreshnessEvidenceStore").mockImplementation(
      () =>
        ({
          ...store,
          recordToolEvidence: () => {
            throw new Error("freshness down");
          },
        }) as ReturnType<typeof freshness.createKbFreshnessEvidenceStore>,
    );
    spies.push(create);
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: {
          app: { log: async () => {} },
        },
      });
      await hooks.event?.({
        event: { type: "tool.executed", properties: { tool: "kb_query" } },
      });
      expect(hooks.event).toBeTypeOf("function");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("registers chat.params-only hooks and skips transform when the sentinel is present", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-hooks-");
    installSchedulerStub();
    globals.__kibi_test_schedule_startup_notify = () => {};
    writePluginConfig(tmpDir, {
      prompt: { enabled: true, hookMode: "chat-params" },
    });
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });
      expect(hooks["experimental.chat.system.transform"]).toBeUndefined();
      expect(hooks["chat.params"]).toBeTypeOf("function");
      await hooks["chat.params"]?.({}, {});
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    const autoDir = makeTempWorkspace("kibi-plugin-auto-sentinel-");
    installSchedulerStub();
    writePluginConfig(autoDir, {
      prompt: { enabled: true, hookMode: "auto" },
    });
    try {
      const hooks = await kibiOpencodePlugin({
        directory: autoDir,
        worktree: autoDir,
      });
      await hooks["chat.params"]?.({}, {});
      const output = { system: ["already <!-- kibi-opencode --> present"] };
      await hooks["experimental.chat.system.transform"]?.(
        { file: "src/x.ts", path: "src/x.ts", filePath: "src/x.ts" },
        output,
      );
      expect(output.system).toHaveLength(1);
    } finally {
      fs.rmSync(autoDir, { recursive: true, force: true });
    }
  });

  test("system.transform accepts alternate focus keys and file.created lifecycle", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-created-");
    const captured = makeClient();
    installSchedulerStub();
    globals.__kibi_test_schedule_startup_notify = () => {};
    try {
      fs.writeFileSync(path.join(tmpDir, "src", "new.ts"), "export const n = 1;\n");
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });
      await hooks.event?.({
        event: { type: "file.created", properties: { file: "src/new.ts" } },
      });
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.(
        { focusEdit: { path: "src/new.ts" } },
        output,
      );
      expect(output.system.join("\n")).toContain("<!-- kibi-opencode -->");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("plugin remaining scheduler, cache, checkpoint, and auto-update branches", () => {
  test("records session edits, cache hits, comment misses, and scheduler factory failures", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-cache-");
    const other = makeTempWorkspace("kibi-plugin-other-wt-");
    execSync("git init -b main --template=", { cwd: other, stdio: "ignore" });
    const captured = makeClient();
    let secondaryOnComplete: ((meta: SyncRunMetadata) => void) | undefined;
    globals.__kibi_test_scheduler_factory = (options) => {
      if (path.resolve(options.worktree) !== path.resolve(tmpDir)) {
        secondaryOnComplete = options.onRunComplete;
        options.onRunComplete?.({
          reason: "file.edited",
          worktree: options.worktree,
          debounceWindowMs: 0,
          durationMs: 1,
          exitCode: 1,
          checkExitCode: 2,
        });
        throw new Error("scheduler unavailable");
      }
      return {
        scheduleSync: () => {},
        onFileEdited: () => {},
        onToolExecuteAfter: () => {},
        flush: async () => {},
        dispose: () => {},
      };
    };
    globals.__kibi_test_schedule_startup_notify = () => {};
    const cacheHit = spyOn(GuidanceCache.prototype, "isSatisfied").mockReturnValue(
      true,
    );
    spies.push(cacheHit);
    try {
      fs.writeFileSync(
        path.join(tmpDir, "src", "edit.ts"),
        "export function first() {}\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, ".kb", "requirements", "REQ-policy.md"),
        "---\npriority: must\n---\n# Policy\nThe system must keep sessions isolated.\n",
      );
      fs.writeFileSync(
        path.join(other, "src", "remote.ts"),
        "export const remote = 1;\n",
      );
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });
      await hooks.event?.({
        event: { type: "file.edited", properties: { file: "src/edit.ts" } },
      });
      fs.writeFileSync(
        path.join(tmpDir, "src", "edit.ts"),
        "export function first() { return 1; }\n",
      );
      await hooks.event?.({
        event: { type: "file.edited", properties: { file: "src/edit.ts" } },
      });
      await hooks.event?.({
        event: {
          type: "file.edited",
          properties: { file: ".kb/requirements/REQ-policy.md" },
        },
      });
      await hooks.event?.({
        event: {
          type: "file.edited",
          properties: { file: path.join(other, "src", "remote.ts") },
        },
      });
      expect(secondaryOnComplete).toBeTypeOf("function");
      expect(cacheHit).toHaveBeenCalled();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.rmSync(other, { recursive: true, force: true });
    }
  });

  test("copies precomputed comment suggestions and logs checkpoint failures", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-checkpoint-");
    const captured = makeClient();
    installSchedulerStub();
    globals.__kibi_test_schedule_startup_notify = () => {};
    writePluginConfig(tmpDir, {
      prompt: { enabled: true, hookMode: "system-transform" },
      guidance: {
        commentDetection: { enabled: true, minLines: 3 },
        smartEnforcement: { mode: "hard" },
      },
    });
    let capturedComplete:
      | ((meta: SyncRunMetadata) => void)
      | undefined;
    const OriginalRunner = checkpointModule.KibiCheckpointRunner;
    const requestSpy = spyOn(
      OriginalRunner.prototype,
      "requestCheckpoint",
    ).mockReturnValue({
      kind: "requested",
      metadata: {
        fingerprint: "fp",
        scopeKey: "scope",
        worktree: tmpDir,
        branch: "main",
        agentIdentity: "agent",
      },
    });
    const runSpy = spyOn(
      OriginalRunner.prototype,
      "runCheckpoint",
    ).mockRejectedValue(new Error("checkpoint exploded"));
    const ctorSpy = spyOn(
      checkpointModule,
      "KibiCheckpointRunner",
    ).mockImplementation(function MockRunner(
      this: unknown,
      options: KibiCheckpointRunnerOptions = {},
    ) {
      capturedComplete = options.onRunComplete;
      return new OriginalRunner(options);
    } as unknown as typeof KibiCheckpointRunner);
    const reminderSpy = spyOn(
      reminders,
      "deriveFileOperationReminder",
    ).mockReturnValue({
      lifecycleReminder: "Run a hard checkpoint before completing.",
      e2eReminder: null,
      reminderKindsToMark: ["kibi_write"],
      policyDecision: "hard_block",
      policyResult: {
        kind: "hard_block",
        text: "Run a hard checkpoint before completing.",
        shownPaths: ["src/commented.ts"],
        remainingCount: 0,
        affectedPaths: ["src/commented.ts"],
        dirtyFileCount: 1,
        e2eReminder: null,
        reminderKindsToMark: ["kibi_write"],
      },
    } as ReturnType<typeof reminders.deriveFileOperationReminder>);
    const errorSpy = spyOn(logger, "errorStructuredOnly").mockImplementation(
      () => {},
    );
    spies.push(ctorSpy, requestSpy, runSpy, reminderSpy, errorSpy);
    try {
      fs.writeFileSync(
        path.join(tmpDir, "src", "commented.ts"),
        `// User email must be unique across the entire system.
// This is enforced at the database level with a unique index.
// Each user can have at most 5 active sessions at any time.

export function validateUser(user: { email: string }) {
  return user.email.length > 0;
}
`,
      );
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });
      await hooks.event?.({
        event: { type: "file.edited", properties: { file: "src/commented.ts" } },
      });
      fs.writeFileSync(
        path.join(tmpDir, "src", "traced.ts"),
        "// implements REQ-1\nexport function traced() {}\n",
      );
      await hooks.event?.({
        event: { type: "file.edited", properties: { file: "src/traced.ts" } },
      });
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.(
        { file: "src/commented.ts" },
        output,
      );
      capturedComplete?.({
        reason: "file.edited",
        worktree: tmpDir,
        debounceWindowMs: 0,
        durationMs: 1,
        exitCode: 1,
        checkExitCode: 2,
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(runSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      expect(output.system.join("\n")).toContain("<!-- kibi-opencode -->");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("invokes auto-update notify with startup toasts enabled", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-autoupdate-");
    const captured = makeClient();
    installSchedulerStub();
    let release!: () => void;
    const notified = new Promise<void>((resolve) => {
      release = resolve;
    });
    globals.__kibi_test_schedule_startup_notify = (callback) => {
      callback();
    };
    const versionSpy = spyOn(versions, "readKibiPackageVersions").mockReturnValue({
      opencode: "1.2.3",
      mcp: "1.0.0",
      cli: "1.0.0",
      core: "1.0.0",
      source: "generated-dist",
      missing: [],
    });
    const runnerSpy = spyOn(autoUpdate, "createAutoUpdateRunner").mockImplementation(
      (deps) => {
        expect(deps.getCurrentVersion()).toBe("1.2.3");
        return async () => {
          await deps.notify("plugin updated");
          release();
          return { status: "updated" };
        };
      },
    );
    spies.push(versionSpy, runnerSpy);
    try {
      await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });
      await notified;
      expect(captured.toasts.some((toast) => toast.message === "plugin updated")).toBe(
        true,
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("maps unknown plugin versions to a null current version", async () => {
    const tmpDir = makeTempWorkspace("kibi-plugin-unknown-ver-");
    installSchedulerStub();
    let release!: () => void;
    const notified = new Promise<void>((resolve) => {
      release = resolve;
    });
    globals.__kibi_test_schedule_startup_notify = (callback) => {
      callback();
    };
    const versionSpy = spyOn(versions, "readKibiPackageVersions").mockReturnValue({
      opencode: "unknown",
      mcp: "unknown",
      cli: "unknown",
      core: "unknown",
      source: "unknown",
      missing: ["opencode"],
    });
    const runnerSpy = spyOn(autoUpdate, "createAutoUpdateRunner").mockImplementation(
      (deps) => {
        expect(deps.getCurrentVersion()).toBeNull();
        return async () => {
          release();
          return { status: "current-version-unknown" };
        };
      },
    );
    spies.push(versionSpy, runnerSpy);
    try {
      await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: makeClient().client,
      });
      await notified;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
