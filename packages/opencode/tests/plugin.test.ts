import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AutoUpdateResult } from "../src/auto-update.js";
import { _setConsoleError } from "../src/logger.js";
import kibiOpencodePlugin from "../src/plugin.js";
import type { PluginInput } from "../src/plugin.js";
import type { SchedulerOptions, SyncScheduler } from "../src/scheduler.js";
import {
  getSessionTracker,
  resetSessionTracker,
} from "../src/session-tracker.js";

declare global {
  var __kibi_test_scheduler_factory:
    | ((options: SchedulerOptions) => SyncScheduler)
    | undefined;
  var __kibi_test_schedule_startup_notify:
    | ((callback: () => void, delayMs: number) => void)
    | undefined;
  var __kibi_test_auto_update_runner:
    | ((input: {
        directory: string;
        enabled: boolean;
      }) => Promise<AutoUpdateResult>)
    | undefined;
}

type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

type CapturedClient = {
  client: NonNullable<PluginInput["client"]>;
  logs: Record<string, unknown>[];
  toasts: ToastPayload[];
};

type ScheduledSync = {
  reason: string;
  filePath?: string;
  checkRules?: string[];
};

const globals = globalThis as typeof globalThis & {
  __kibi_test_scheduler_factory?: (options: SchedulerOptions) => SyncScheduler;
  __kibi_test_schedule_startup_notify?: (
    callback: () => void,
    delayMs: number,
  ) => void;
  __kibi_test_auto_update_runner?: (input: {
    directory: string;
    enabled: boolean;
  }) => Promise<AutoUpdateResult>;
};

function makeTempWorkspace(prefix: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, ".opencode"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".kb", "config.json"), "{}\n");
  for (const dir of [
    "documentation/requirements",
    "documentation/scenarios",
    "documentation/tests",
    "documentation/adr",
    "documentation/flags",
    "documentation/events",
    "documentation/facts",
    "src",
  ]) {
    fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(tmpDir, "documentation", "symbols.yaml"), "[]\n");
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

function makeClient(): CapturedClient {
  const logs: Record<string, unknown>[] = [];
  const toasts: ToastPayload[] = [];
  return {
    logs,
    toasts,
    client: {
      tui: {
        toast: async (payload) => {
          toasts.push(payload);
        },
      },
      app: {
        log: async (payload) => {
          logs.push(payload);
        },
      },
    },
  };
}

function installSchedulerStub(scheduled: ScheduledSync[]): void {
  globals.__kibi_test_scheduler_factory = () => ({
    scheduleSync: (reason, filePath, checkRules) => {
      scheduled.push({
        reason,
        ...(filePath !== undefined ? { filePath } : {}),
        ...(checkRules !== undefined ? { checkRules } : {}),
      });
    },
    onFileEdited: () => {},
    onToolExecuteAfter: () => {},
    flush: async () => {},
    dispose: () => {},
  });
}

function bodyMessage(payload: Record<string, unknown>): string {
  const body = payload.body;
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeAll(() => {
  globals.__kibi_test_schedule_startup_notify = (callback) => {
    callback();
  };
});

afterAll(() => {
  globals.__kibi_test_scheduler_factory = undefined;
  globals.__kibi_test_schedule_startup_notify = undefined;
  globals.__kibi_test_auto_update_runner = undefined;
  _setConsoleError(null);
});

describe("kibiOpencodePlugin core hooks", () => {
  test("config hook is absent when project config disables the plugin", async () => {
    const tmpDir = makeTempWorkspace("kibi-opencode-disabled-");
    try {
      writePluginConfig(tmpDir, { enabled: false });

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });

      expect(hooks).toEqual({});
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("session idle, task stop, and session start events do not call briefing tools", async () => {
    const tmpDir = makeTempWorkspace("kibi-opencode-session-events-");
    const captured = makeClient();
    const scheduled: ScheduledSync[] = [];
    installSchedulerStub(scheduled);
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });

      await hooks.event?.({ event: { type: "session.idle", properties: {} } });
      await hooks.event?.({ event: { type: "task.stop", properties: {} } });
      await hooks.event?.({ event: { type: "session.start", properties: {} } });

      const renderedLogs = captured.logs.map(bodyMessage).join("\n");
      expect(renderedLogs).not.toContain("kb_briefing_generate");
      expect(fs.existsSync(path.join(tmpDir, ".kb", "briefs"))).toBe(false);
      expect(scheduled).toEqual([]);
    } finally {
      globals.__kibi_test_scheduler_factory = undefined;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("startup auto-update runs by default and respects config disablement", async () => {
    const enabledDir = makeTempWorkspace("kibi-opencode-auto-update-enabled-");
    const disabledDir = makeTempWorkspace(
      "kibi-opencode-auto-update-disabled-",
    );
    const captured = makeClient();
    const scheduled: ScheduledSync[] = [];
    const autoUpdateInputs: Array<{ directory: string; enabled: boolean }> = [];
    installSchedulerStub(scheduled);
    globals.__kibi_test_auto_update_runner = async (input) => {
      autoUpdateInputs.push(input);
      return { status: input.enabled ? "up-to-date" : "disabled" };
    };

    try {
      writePluginConfig(disabledDir, { autoUpdate: false });

      await kibiOpencodePlugin({
        directory: enabledDir,
        worktree: enabledDir,
        client: captured.client,
      });
      await flushPromises();

      await kibiOpencodePlugin({
        directory: disabledDir,
        worktree: disabledDir,
        client: captured.client,
      });
      await flushPromises();

      expect(autoUpdateInputs).toEqual([
        { directory: enabledDir, enabled: true },
        { directory: disabledDir, enabled: false },
      ]);
    } finally {
      globals.__kibi_test_auto_update_runner = undefined;
      globals.__kibi_test_scheduler_factory = undefined;
      fs.rmSync(enabledDir, { recursive: true, force: true });
      fs.rmSync(disabledDir, { recursive: true, force: true });
    }
  });

  test("startup auto-update still runs when workspace maintenance is degraded", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-opencode-auto-update-degraded-"),
    );
    const captured = makeClient();
    const autoUpdateInputs: Array<{ directory: string; enabled: boolean }> = [];
    globals.__kibi_test_auto_update_runner = async (input) => {
      autoUpdateInputs.push(input);
      return { status: "up-to-date" };
    };

    try {
      await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: captured.client,
      });
      await flushPromises();

      expect(autoUpdateInputs).toEqual([{ directory: tmpDir, enabled: true }]);
    } finally {
      globals.__kibi_test_auto_update_runner = undefined;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("system transform injects Kibi guidance for initialized and uninitialized workspaces", async () => {
    const activeDir = makeTempWorkspace("kibi-opencode-transform-active-");
    const uninitializedDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-opencode-transform-uninit-"),
    );
    fs.mkdirSync(path.join(uninitializedDir, ".opencode"), { recursive: true });
    writePluginConfig(uninitializedDir, { prompt: { enabled: true } });
    try {
      const activeHooks = await kibiOpencodePlugin({
        directory: activeDir,
        worktree: activeDir,
      });
      const activeOutput = { system: [] as string[] };
      await activeHooks["experimental.chat.system.transform"]?.(
        { focusFilePath: "documentation/requirements/REQ-001.md" },
        activeOutput,
      );

      const uninitializedHooks = await kibiOpencodePlugin({
        directory: uninitializedDir,
        worktree: uninitializedDir,
      });
      const uninitializedOutput = { system: [] as string[] };
      await uninitializedHooks["experimental.chat.system.transform"]?.(
        { focusFilePath: "src/app.ts" },
        uninitializedOutput,
      );

      const activeRendered = activeOutput.system.join("\n");
      const uninitializedRendered = uninitializedOutput.system.join("\n");
      expect(activeRendered).toContain("<!-- kibi-opencode -->");
      expect(activeRendered).toContain("Requirement changes detected");
      expect(uninitializedRendered).toContain("<!-- kibi-opencode -->");
      expect(uninitializedRendered).toContain(
        "does not appear to have Kibi initialized",
      );
      expect(uninitializedRendered).toContain("--input <file|->");
      expect(uninitializedRendered).toContain("Kibi capability selection");
    } finally {
      fs.rmSync(activeDir, { recursive: true, force: true });
      fs.rmSync(uninitializedDir, { recursive: true, force: true });
    }
  });

  test("file created, edited, and deleted lifecycle events update handling state", async () => {
    const tmpDir = makeTempWorkspace("kibi-opencode-file-events-");
    const scheduled: ScheduledSync[] = [];
    installSchedulerStub(scheduled);
    try {
      fs.writeFileSync(
        path.join(tmpDir, "src", "created.ts"),
        "export function created() {}\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "src", "changed.ts"),
        "export function changed() {}\n",
      );
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });

      await hooks.event?.({
        event: { type: "file.created", properties: { file: "src/created.ts" } },
      });
      await hooks.event?.({
        event: { type: "file.edited", properties: { file: "src/changed.ts" } },
      });
      await hooks.event?.({
        event: { type: "file.deleted", properties: { file: "src/deleted.ts" } },
      });
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.(
        { focusFilePath: "src/deleted.ts" },
        output,
      );

      expect(scheduled.map((entry) => entry.reason)).toContain(
        "smart-enforcement.traceability",
      );
      expect(scheduled.map((entry) => entry.filePath)).toContain(
        "src/created.ts",
      );
      expect(scheduled.map((entry) => entry.filePath)).toContain(
        "src/changed.ts",
      );
      expect(output.system.join("\n")).toContain("<!-- kibi-opencode -->");
    } finally {
      globals.__kibi_test_scheduler_factory = undefined;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("kibiOpencodePlugin requirement lint integration", () => {
  test("requirement documents with scenarios, assertions, and long content record lint warnings", async () => {
    resetSessionTracker();
    const tmpDir = makeTempWorkspace("kibi-opencode-req-lint-");
    const scheduled: ScheduledSync[] = [];
    installSchedulerStub(scheduled);
    try {
      const contentLines = Array.from(
        { length: 55 },
        (_, index) => `Requirement detail line ${index + 1}`,
      );
      fs.writeFileSync(
        path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
        [
          "# Requirement",
          "Given a user has an account",
          "When they request access",
          "Then the system grants access",
          "The implementation should return success.",
          ...contentLines,
        ].join("\n"),
      );

      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
      });
      await hooks.event?.({
        event: {
          type: "file.edited",
          properties: { file: "documentation/requirements/REQ-001.md" },
        },
      });

      const summary = getSessionTracker().generateSummary();
      expect(summary.warningsByCategory["embedded-scenario-in-req"]).toBe(1);
      expect(summary.warningsByCategory["embedded-test-in-req"]).toBe(1);
      expect(summary.warningsByCategory["missing-traceability"]).toBe(1);
      expect(scheduled.some((entry) => entry.reason === "file.edited")).toBe(
        true,
      );
    } finally {
      globals.__kibi_test_scheduler_factory = undefined;
      fs.rmSync(tmpDir, { recursive: true, force: true });
      resetSessionTracker();
    }
  });
});

describe("kibiOpencodePlugin error and toast paths", () => {
  test("uninitialized workspaces log an operational bootstrap error", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-opencode-error-"),
    );
    const capturedErrors: string[] = [];
    _setConsoleError((...args) => {
      capturedErrors.push(args.map(String).join(" "));
    });
    try {
      await kibiOpencodePlugin({ directory: tmpDir, worktree: tmpDir });

      expect(capturedErrors.join("\n")).toContain("[kibi-opencode]");
      expect(capturedErrors.join("\n")).toContain(
        "workspace needs Kibi bootstrap",
      );
    } finally {
      _setConsoleError(null);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("startup toast displays when enabled and stays muted when suppressed", async () => {
    const toastDir = makeTempWorkspace("kibi-opencode-toast-on-");
    const mutedDir = makeTempWorkspace("kibi-opencode-toast-off-");
    const toastClient = makeClient();
    const mutedClient = makeClient();
    try {
      await kibiOpencodePlugin({
        directory: toastDir,
        worktree: toastDir,
        client: toastClient.client,
      });
      writePluginConfig(mutedDir, { ux: { toastStartup: false } });
      await kibiOpencodePlugin({
        directory: mutedDir,
        worktree: mutedDir,
        client: mutedClient.client,
      });
      await flushPromises();

      expect(
        toastClient.toasts.map((toast) => toast.message).join("\n"),
      ).toContain("kibi-opencode started");
      expect(mutedClient.toasts).toEqual([]);
      expect(toastClient.logs.map(bodyMessage).join("\n")).toContain(
        "startup toast delivered",
      );
    } finally {
      fs.rmSync(toastDir, { recursive: true, force: true });
      fs.rmSync(mutedDir, { recursive: true, force: true });
    }
  });
});
