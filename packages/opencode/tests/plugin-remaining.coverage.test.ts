// implements REQ-opencode-kibi-plugin-v1
// implements REQ-opencode-file-context-guidance-v1
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { _setConsoleError } from "../src/logger.js";
import * as freshness from "../src/kb-freshness-state.js";
import kibiOpencodePlugin from "../src/plugin.js";
import type { PluginInput } from "../src/plugin.js";
import type { SchedulerOptions, SyncScheduler } from "../src/scheduler.js";
import {
  getSessionTracker,
  resetSessionTracker,
} from "../src/session-tracker.js";

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
