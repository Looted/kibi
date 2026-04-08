/// <reference path="../../../types/bun-test.d.ts" />
import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Hooks, Plugin, PluginInput } from "../src/index";
import { getGuidanceCache, resetGuidanceCache } from "../src/guidance-cache";
import * as logger from "../src/logger";
import { getSessionTracker, resetSessionTracker } from "../src/session-tracker";
import type {
  SchedulerOptions,
  SyncRunMetadata,
  SyncScheduler,
} from "../src/scheduler";

declare global {
  var __kibi_test_scheduler_factory:
    | ((opts: SchedulerOptions) => SyncScheduler)
    | undefined;
}

const coveragePluginModulePath = "../src/index.ts?coverage-index";
const { default: kibiOpencodePlugin } = (await import(
  coveragePluginModulePath
)) as { default: Plugin };

const DEFAULT_PATHS = {
  requirements: "documentation/requirements/**/*.md",
  scenarios: "documentation/scenarios/**/*.md",
  tests: "documentation/tests/**/*.md",
  adr: "documentation/adr/**/*.md",
  flags: "documentation/flags/**/*.md",
  events: "documentation/events/**/*.md",
  facts: "documentation/facts/**/*.md",
  symbols: "documentation/symbols.yaml",
};

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Coverage Bot",
  GIT_AUTHOR_EMAIL: "coverage@example.com",
  GIT_COMMITTER_NAME: "Coverage Bot",
  GIT_COMMITTER_EMAIL: "coverage@example.com",
};

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function setupRootActiveWorkspace(root: string): void {
  writeJson(path.join(root, ".kb", "config.json"), {
    paths: DEFAULT_PATHS,
  });

  for (const dir of [
    "documentation/requirements",
    "documentation/scenarios",
    "documentation/tests",
    "documentation/adr",
    "documentation/flags",
    "documentation/events",
    "documentation/facts",
  ]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }

  fs.writeFileSync(path.join(root, "documentation", "symbols.yaml"), "[]\n");
}

function createMockClient(
  logs: Array<Record<string, unknown>>,
): NonNullable<PluginInput["client"]> {
  return {
    app: {
      log: async (payload: Record<string, unknown>) => {
        logs.push(payload);
      },
    },
  };
}

async function createHooks(
  root: string,
  logs: Array<Record<string, unknown>>,
  projectConfig: Record<string, unknown>,
): Promise<Hooks> {
  writeJson(path.join(root, ".opencode", "kibi.json"), projectConfig);

  return kibiOpencodePlugin({
    directory: root,
    worktree: root,
    client: createMockClient(logs),
  });
}

async function fireEdit(hooks: Hooks, file: string): Promise<void> {
  assert.ok(hooks.event);
  await hooks.event?.({
    event: {
      type: "file.edited",
      properties: { file },
    },
  });
}

async function runSystemTransform(
  hooks: Hooks,
  output: { system: string[] },
): Promise<void> {
  assert.ok(hooks["experimental.chat.system.transform"]);
  await hooks["experimental.chat.system.transform"]?.({}, output);
}

function getBody(payload: Record<string, unknown>): Record<string, unknown> {
  return (payload.body ?? {}) as Record<string, unknown>;
}

function getEventLogs(
  logs: Array<Record<string, unknown>>,
  event: string,
): Array<Record<string, unknown>> {
  return logs.filter((payload) => getBody(payload).event === event);
}

function initGitRepo(root: string): void {
  execSync("git init -b main", {
    cwd: root,
    env: GIT_ENV,
    stdio: "ignore",
  });
  execSync("git add .", {
    cwd: root,
    env: GIT_ENV,
    stdio: "ignore",
  });
  execSync('git commit -m "initial"', {
    cwd: root,
    env: GIT_ENV,
    stdio: "ignore",
  });
}

describe("index coverage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-index-coverage-"));
    resetGuidanceCache();
    resetSessionTracker();
    logger.resetClient();
    globalThis.__kibi_test_scheduler_factory = undefined;
  });

  afterEach(() => {
    globalThis.__kibi_test_scheduler_factory = undefined;
    logger.resetClient();
    resetSessionTracker();
    resetGuidanceCache();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns empty hooks when the plugin is disabled", async () => {
    const hooks = await createHooks(tmpDir, [], { enabled: false });

    assert.deepEqual(hooks, {});
  });

  test("logs and resets expired session summaries during setup", async () => {
    const logs: Array<Record<string, unknown>> = [];

    setupRootActiveWorkspace(tmpDir);
    getSessionTracker().recordWarning(
      "missing-traceability",
      "src/example.ts",
      "Traceability missing",
    );

    await new Promise((resolve) => setTimeout(resolve, 1));

    await createHooks(tmpDir, logs, {
      enabled: true,
      guidance: {
        sessionSummary: {
          enabled: true,
          logIntervalMs: 0,
        },
      },
    });

    const summary = getSessionTracker().generateSummary();
    assert.equal(summary.totalWarnings, 0);
    assert.ok(
      logs.some(
        (payload) =>
          String(getBody(payload).message ?? "") ===
          "session.summary: 1 total warnings",
      ),
    );
  });

  test("lints relative requirement files and logs degraded requirement guidance", async () => {
    const logs: Array<Record<string, unknown>> = [];
    const reqPath = path.join(
      tmpDir,
      "documentation",
      "requirements",
      "REQ-001.md",
    );

    fs.mkdirSync(path.dirname(reqPath), { recursive: true });
    fs.writeFileSync(
      reqPath,
      `---
id: REQ-001
title: Requirement
---
Given a signed-in user
When they submit the request
Then the system accepts it
We assert that the response should return success.
`,
    );

    const hooks = await createHooks(tmpDir, logs, {
      enabled: true,
      sync: { enabled: false },
      guidance: {
        sessionSummary: { enabled: false },
        smartEnforcement: {
          completionReminder: false,
          degradedMode: "warn-once",
        },
      },
    });

    await fireEdit(hooks, "documentation/requirements/REQ-001.md");

    const summary = getSessionTracker().generateSummary();
    assert.equal(summary.warningsByCategory["embedded-scenario-in-req"], 1);
    assert.equal(summary.warningsByCategory["embedded-test-in-req"], 1);

    const degraded = getEventLogs(logs, "smart_enforcement_degraded");
    assert.ok(degraded.length >= 1);
    assert.ok(
      degraded.some(
        (payload) => getBody(payload).risk_class === "req_policy_candidate",
      ),
    );
  });

  test("ignores missing relative requirement files without throwing", async () => {
    const hooks = await createHooks(tmpDir, [], {
      enabled: true,
      sync: { enabled: false },
      guidance: {
        sessionSummary: { enabled: false },
      },
    });

    await fireEdit(hooks, "documentation/requirements/REQ-MISSING.md");

    const summary = getSessionTracker().generateSummary();
    assert.equal(summary.warningsByCategory["embedded-scenario-in-req"], 0);
    assert.equal(summary.warningsByCategory["embedded-test-in-req"], 0);
  });

  test("latches scheduler_unavailable when scheduler creation throws", async () => {
    const logs: Array<Record<string, unknown>> = [];

    setupRootActiveWorkspace(tmpDir);
    globalThis.__kibi_test_scheduler_factory = () => {
      throw new Error("scheduler unavailable");
    };

    await createHooks(tmpDir, logs, {
      enabled: true,
      sync: { enabled: true, debounceMs: 5 },
      guidance: {
        sessionSummary: { enabled: false },
      },
    });

    const degraded = getEventLogs(logs, "smart_enforcement_degraded");
    assert.ok(
      degraded.some(
        (payload) => getBody(payload).overlay_cause === "scheduler_unavailable",
      ),
    );
  });

  test("latches scheduler sync and check failure causes from onRunComplete", async () => {
    const logs: Array<Record<string, unknown>> = [];
    let onRunComplete: ((meta: SyncRunMetadata) => void) | undefined;

    setupRootActiveWorkspace(tmpDir);
    globalThis.__kibi_test_scheduler_factory = (opts) => {
      onRunComplete = opts.onRunComplete;
      return {
        scheduleSync: () => {},
        onFileEdited: () => {},
        onToolExecuteAfter: () => {},
        dispose: () => {},
      };
    };

    await createHooks(tmpDir, logs, {
      enabled: true,
      sync: { enabled: true, debounceMs: 5 },
      guidance: {
        sessionSummary: { enabled: false },
      },
    });

    assert.ok(onRunComplete);
    onRunComplete?.({
      reason: "manual",
      worktree: tmpDir,
      debounceWindowMs: 5,
      durationMs: 0,
      exitCode: 1,
      checkExitCode: 1,
      checkRules: ["required-fields"],
    });

    const degraded = getEventLogs(logs, "smart_enforcement_degraded");
    assert.ok(
      degraded.some(
        (payload) => getBody(payload).overlay_cause === "scheduler_sync_failed",
      ),
    );
  });

  test("routes targeted checks for traceability candidates and fact docs", async () => {
    const scheduleCalls: Array<{
      reason: string;
      filePath?: string;
      checkRules?: string[];
    }> = [];

    setupRootActiveWorkspace(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src", "traceability.ts"),
      "export function traceable() { return 1; }\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "documentation", "facts", "FACT-001.md"),
      "---\nid: FACT-001\ntitle: Fact\n---\nContent\n",
    );

    globalThis.__kibi_test_scheduler_factory = () => ({
      scheduleSync: (reason, filePath, checkRules) => {
        scheduleCalls.push({ reason, filePath, checkRules });
      },
      onFileEdited: () => {},
      onToolExecuteAfter: () => {},
      dispose: () => {},
    });

    const hooks = await createHooks(tmpDir, [], {
      enabled: true,
      sync: { enabled: true, debounceMs: 5 },
      guidance: {
        commentDetection: { enabled: false },
        sessionSummary: { enabled: false },
        targetedChecks: { enabled: true },
        smartEnforcement: { completionReminder: false },
      },
    });

    await fireEdit(hooks, "src/traceability.ts");
    await fireEdit(hooks, "documentation/facts/FACT-001.md");

    assert.ok(
      scheduleCalls.some(
        (call) =>
          call.reason === "smart-enforcement.traceability" &&
          JSON.stringify(call.checkRules) ===
            JSON.stringify(["symbol-traceability"]),
      ),
    );
    assert.ok(
      scheduleCalls.some(
        (call) =>
          call.reason === "smart-enforcement.kb-doc" &&
          JSON.stringify(call.checkRules) ===
            JSON.stringify([
              "required-fields",
              "no-dangling-refs",
              "strict-fact-shape",
            ]),
      ),
    );
  });

  test("routes must-priority and standard requirement targeted checks", async () => {
    const scheduleCalls: Array<{
      reason: string;
      filePath?: string;
      checkRules?: string[];
    }> = [];

    setupRootActiveWorkspace(tmpDir);
    fs.writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-MUST.md"),
      "---\nid: REQ-MUST\npriority: must\n---\nA clean must requirement.\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-SHOULD.md"),
      "---\nid: REQ-SHOULD\npriority: should\n---\nA clean should requirement.\n",
    );

    globalThis.__kibi_test_scheduler_factory = () => ({
      scheduleSync: (reason, filePath, checkRules) => {
        scheduleCalls.push({ reason, filePath, checkRules });
      },
      onFileEdited: () => {},
      onToolExecuteAfter: () => {},
      dispose: () => {},
    });

    const hooks = await createHooks(tmpDir, [], {
      enabled: true,
      sync: { enabled: true, debounceMs: 5 },
      guidance: {
        sessionSummary: { enabled: false },
        targetedChecks: { enabled: true },
        smartEnforcement: {
          mode: "strict",
          requireRootKbForStrict: true,
          completionReminder: false,
        },
      },
    });

    await fireEdit(hooks, "documentation/requirements/REQ-MUST.md");
    await fireEdit(hooks, "documentation/requirements/REQ-SHOULD.md");

    assert.ok(
      scheduleCalls.some(
        (call) =>
          call.reason === "file.edited" &&
          call.filePath === "documentation/requirements/REQ-MUST.md" &&
          JSON.stringify(call.checkRules) ===
            JSON.stringify([
              "required-fields",
              "no-dangling-refs",
              "must-priority-coverage",
            ]),
      ),
    );
    assert.ok(
      scheduleCalls.some(
        (call) =>
          call.reason === "file.edited" &&
          call.filePath === "documentation/requirements/REQ-SHOULD.md" &&
          JSON.stringify(call.checkRules) ===
            JSON.stringify(["required-fields", "no-dangling-refs"]),
      ),
    );
  });

  test("warns on manual .kb edits", async () => {
    setupRootActiveWorkspace(tmpDir);

    const hooks = await createHooks(tmpDir, [], {
      enabled: true,
      sync: { enabled: true, debounceMs: 5 },
      guidance: {
        sessionSummary: { enabled: false },
        warnOnKbEdits: true,
      },
    });

    await fireEdit(hooks, ".kb/config.json");

    const summary = getSessionTracker().generateSummary();
    assert.equal(summary.warningsByCategory["kb-edit"], 1);
  });

  test("records durable comment warnings once and clears them for safe-doc edits", async () => {
    const logs: Array<Record<string, unknown>> = [];

    setupRootActiveWorkspace(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src", "commented.ts"),
      `// User email must be unique across the system.
// Each user can have at most five active sessions.
// Sessions expire after 30 minutes of inactivity.
export function registerUser() { return true; }
`,
    );
    fs.writeFileSync(path.join(tmpDir, "README.md"), "Safe docs only\n");

    const hooks = await createHooks(tmpDir, logs, {
      enabled: true,
      sync: { enabled: false },
      guidance: {
        commentDetection: { enabled: true, minLines: 3 },
        sessionSummary: { enabled: false },
      },
    });

    await fireEdit(hooks, "src/commented.ts");
    await fireEdit(hooks, "src/commented.ts");

    const summaryAfterCode = getSessionTracker().generateSummary();
    assert.equal(
      summaryAfterCode.warningsByCategory["long-comment-missed-fact"],
      1,
    );

    await fireEdit(hooks, "README.md");
    const output = { system: [] as string[] };
    await runSystemTransform(hooks, output);

    assert.equal(output.system.length, 1);
    assert.ok(!output.system[0]?.includes("Durable knowledge detected"));
  });

  test("uses cache hits for repeated behavior edits and appends transform guidance once", async () => {
    const logs: Array<Record<string, unknown>> = [];

    setupRootActiveWorkspace(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src", "behavior.ts"),
      "// implements REQ-123\nexport function behavior() { return 1; }\n",
    );

    const hooks = await createHooks(tmpDir, logs, {
      enabled: true,
      sync: { enabled: true, debounceMs: 5 },
      prompt: { enabled: true, hookMode: "auto" },
      guidance: {
        commentDetection: { enabled: true, minLines: 3 },
        sessionSummary: { enabled: false },
        smartEnforcement: { completionReminder: true },
      },
    });

    await fireEdit(hooks, "src/behavior.ts");

    const output = { system: ["base system prompt"] };
    await runSystemTransform(hooks, output);

    assert.equal(output.system.length, 2);
    assert.ok(
      output.system[1]?.includes("Run `kb_check` before completing this task."),
    );
    assert.ok(getEventLogs(logs, "smart_enforcement_guidance").length >= 1);
    assert.ok(
      getEventLogs(logs, "smart_enforcement_completion_reminder").length >= 1,
    );

    const beforeSecondTransform = output.system.length;
    await runSystemTransform(hooks, output);
    assert.equal(output.system.length, beforeSecondTransform);

    logs.length = 0;
    await fireEdit(hooks, "src/behavior.ts");

    const cacheHitLogs = getEventLogs(logs, "smart_enforcement_cache");
    assert.ok(
      cacheHitLogs.some((payload) => getBody(payload).cache_hit === true),
    );
  });

  test("shows degraded advisory only once in warn-once mode", async () => {
    setupRootActiveWorkspace(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src", "degraded.ts"),
      "// implements REQ-456\nexport function degraded() { return 1; }\n",
    );

    const hooks = await createHooks(tmpDir, [], {
      enabled: true,
      sync: { enabled: false },
      prompt: { enabled: true, hookMode: "auto" },
      guidance: {
        sessionSummary: { enabled: false },
        smartEnforcement: {
          degradedMode: "warn-once",
          completionReminder: false,
        },
      },
    });

    await fireEdit(hooks, "src/degraded.ts");

    const firstOutput = { system: [] as string[] };
    await runSystemTransform(hooks, firstOutput);
    assert.ok(firstOutput.system[0]?.includes("Maintenance degraded"));

    const secondOutput = { system: [] as string[] };
    await runSystemTransform(hooks, secondOutput);
    assert.ok(!secondOutput.system[0]?.includes("Maintenance degraded"));
  });

  test("caps recent edits at five entries and logs auto chat.params activation", async () => {
    const logs: Array<Record<string, unknown>> = [];

    setupRootActiveWorkspace(tmpDir);
    for (let index = 0; index < 6; index += 1) {
      fs.writeFileSync(
        path.join(tmpDir, `README-${index}.md`),
        `Document ${index}\n`,
      );
    }

    const hooks = await createHooks(tmpDir, logs, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      guidance: {
        sessionSummary: { enabled: false },
      },
    });

    for (let index = 0; index < 6; index += 1) {
      await fireEdit(hooks, `README-${index}.md`);
    }

    const output = { system: [] as string[] };
    await runSystemTransform(hooks, output);

    const guidanceLogs = getEventLogs(logs, "smart_enforcement_guidance");
    const latestGuidanceLog = guidanceLogs[guidanceLogs.length - 1] ?? {};
    assert.equal(getBody(latestGuidanceLog).recent_edits, 5);

    assert.ok(hooks["chat.params"]);
    await hooks["chat.params"]?.({}, {});

    assert.ok(
      logs.some(
        (payload) =>
          String(getBody(payload).message ?? "") ===
          "kibi-opencode: chat.params hook active (prompt injection via system.transform)",
      ),
    );
  });

  test("invalidates guidance cache when branch and config fingerprints change", async () => {
    setupRootActiveWorkspace(tmpDir);
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src", "cache.ts"),
      "// implements REQ-789\nexport function cacheable() { return 1; }\n",
    );

    const initialHooks = await createHooks(tmpDir, [], {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      guidance: {
        sessionSummary: { enabled: false },
        smartEnforcement: { completionReminder: false },
      },
    });

    await fireEdit(initialHooks, "src/cache.ts");
    await runSystemTransform(initialHooks, { system: [] });

    const cache = getGuidanceCache();
    const unknownKey = {
      workspaceRoot: tmpDir,
      branch: "unknown",
      posture: "root_active" as const,
      riskClass: "behavior_candidate" as const,
      fileBucket: "code",
    };
    assert.equal(cache.isSatisfied(unknownKey), true);

    initGitRepo(tmpDir);
    await createHooks(tmpDir, [], {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      guidance: {
        sessionSummary: { enabled: false },
        smartEnforcement: { completionReminder: false },
      },
    });

    assert.equal(cache.isSatisfied(unknownKey), false);

    const mainKey = { ...unknownKey, branch: "main" };
    cache.recordSatisfied(mainKey, "guidance");

    writeJson(path.join(tmpDir, ".kb", "config.json"), {
      maintenance: { enabled: false },
      paths: DEFAULT_PATHS,
      note: "fingerprint-changed",
    });

    await createHooks(tmpDir, [], {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      guidance: {
        sessionSummary: { enabled: false },
        smartEnforcement: { completionReminder: false },
      },
    });

    assert.equal(cache.isSatisfied(mainKey), false);
  });
});
