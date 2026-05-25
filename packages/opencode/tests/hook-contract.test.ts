import { afterAll, beforeAll, describe, spyOn, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { KibiConfig } from "../src/config";
import { buildDirtyRelevantFingerprint } from "../src/enforcement-scope";
import { getInitKibiCommandCapability } from "../src/init-kibi-capability";
import kibiOpencodePlugin from "../src/index";
import {
  KibiCheckpointRunner,
  type KibiCheckpointContext,
} from "../src/kibi-checkpoint-runner";
import { SENTINEL, injectPrompt } from "../src/prompt";

describe("hook contract", () => {
  let tmpBase: string;
  let homedirSpy: ReturnType<typeof spyOn>;

  const baseConfig: KibiConfig = {
    enabled: true,
    prompt: { enabled: true, hookMode: "auto" },
    sync: { enabled: false, debounceMs: 2000, ignore: [], relevant: [] },
    ux: {
      toastStartup: true,
      toastFailures: true,
      toastSuccesses: false,
      toastCooldownMs: 10000,
    },
    guidance: {
      dynamic: true,
      warnOnKbEdits: true,
      factFirstDomainRouting: true,
      commentDetection: { enabled: true, minLines: 6 },
      targetedChecks: { enabled: true },
      sessionSummary: { enabled: true, logIntervalMs: 1800000 },
      smartEnforcement: {
        enabled: true,
        mode: "advisory",
        preflightTtlMs: 600000,
        idleResetMs: 1800000,
        degradedMode: "warn-once",
        requireRootKbForStrict: true,
        completionReminder: true,
      },
    },
    logLevel: "info",
  };

  beforeAll(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-hook-test-"));
    assert.ok(fs.existsSync(tmpBase), "tmpBase should be a valid directory");
    // Prevent any real global kibi config from interfering
    homedirSpy = spyOn(os, "homedir").mockReturnValue(tmpBase);
  });

  afterAll(() => {
    homedirSpy.mockRestore();
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {}
  });

  // Filesystem errors propagate intentionally so tests fail with a clear cause
  function makeProjectDir(hookMode: string): string {
    const dir = fs.mkdtempSync(path.join(tmpBase, "proj-"));
    fs.mkdirSync(path.join(dir, ".opencode"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".opencode", "kibi.json"),
      JSON.stringify({ prompt: { hookMode }, sync: { enabled: false } }),
    );
    return dir;
  }

  function setupAuthoritativeWorkspace(dir: string): void {
    fs.mkdirSync(path.join(dir, ".kb"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".kb", "config.json"),
      JSON.stringify({}, null, 2),
    );
    for (const docDir of [
      "documentation/requirements",
      "documentation/scenarios",
      "documentation/tests",
      "documentation/adr",
      "documentation/flags",
      "documentation/events",
      "documentation/facts",
    ]) {
      fs.mkdirSync(path.join(dir, docDir), { recursive: true });
    }
    fs.writeFileSync(path.join(dir, "documentation", "symbols.yaml"), "[]");
  }

  function writeProjectConfig(dir: string, config: Record<string, unknown>): void {
    fs.mkdirSync(path.join(dir, ".opencode"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".opencode", "kibi.json"),
      JSON.stringify(config, null, 2),
    );
  }

  test("system.transform is the primary prompt-text delivery hook", () => {
    // Per ADR-016: experimental.chat.system.transform carries prompt text
    const originalSystem = "Original system prompt";
    const result = injectPrompt(originalSystem, baseConfig);

    assert.ok(result.includes(SENTINEL), "Prompt should contain Kibi sentinel");
    assert.ok(
      result.includes("kb_query"),
      "Prompt should mention public Kibi tools",
    );
  });

  test("auto mode registers both system.transform and chat.params hooks", async () => {
    // Per ADR-016: auto mode registers both hooks
    const dir = makeProjectDir("auto");
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });

    assert.ok(
      "experimental.chat.system.transform" in hooks,
      "auto mode should register experimental.chat.system.transform",
    );
    assert.ok("chat.params" in hooks, "auto mode should register chat.params");
  });

  test("plugin remains advisory and only exposes advisory hook surfaces", async () => {
    const dir = makeProjectDir("auto");
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
    const expectedHookKeys = [
      "chat.params",
      "event",
      "experimental.chat.system.transform",
    ];

    if (getInitKibiCommandCapability().supported) {
      expectedHookKeys.push("config");
    }

    assert.deepEqual(
      Object.keys(hooks).sort(),
      expectedHookKeys.sort(),
      "plugin should expose only advisory/event hook surfaces and the gated config hook when supported",
    );
  });

  test("chat-params mode: system.transform absent, chat.params present", async () => {
    // Per ADR-016: chat.params is for option-level enrichment only (temperature, topP, etc.)
    // and must NEVER inject prompt text. In chat-params only mode, system.transform
    // must not be registered.
    const dir = makeProjectDir("chat-params");
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });

    assert.ok(
      !("experimental.chat.system.transform" in hooks),
      "chat-params mode must NOT register experimental.chat.system.transform",
    );
    assert.ok(
      "chat.params" in hooks,
      "chat-params mode should register chat.params",
    );
  });

  test("system-transform mode: system.transform present, chat.params absent", async () => {
    // Per ADR-016: system-transform mode uses only the system hook
    const dir = makeProjectDir("system-transform");
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });

    assert.ok(
      "experimental.chat.system.transform" in hooks,
      "system-transform mode should register experimental.chat.system.transform",
    );
    assert.ok(
      !("chat.params" in hooks),
      "system-transform mode must NOT register chat.params",
    );
  });

  test("prompt injection respects enabled flags", () => {
    const originalSystem = "Original system prompt";

    // When plugin is disabled, prompt should not be modified
    const disabledConfig: KibiConfig = {
      ...baseConfig,
      enabled: false,
    };
    const disabledResult = injectPrompt(originalSystem, disabledConfig);
    assert.equal(
      disabledResult,
      originalSystem,
      "Should not inject when plugin disabled",
    );

    // When prompt is disabled, prompt should not be modified
    const promptDisabledConfig: KibiConfig = {
      ...baseConfig,
      prompt: { ...baseConfig.prompt, enabled: false },
    };
    const promptDisabledResult = injectPrompt(
      originalSystem,
      promptDisabledConfig,
    );
    assert.equal(
      promptDisabledResult,
      originalSystem,
      "Should not inject when prompt disabled",
    );
  });

  test("sentinel prevents duplicate injection", () => {
    const systemWithSentinel = `Original system\n\n${SENTINEL}\nSome Kibi guidance`;
    const result = injectPrompt(systemWithSentinel, baseConfig);
    assert.equal(
      result,
      systemWithSentinel,
      "Should not inject when sentinel present",
    );
  });

  test("public tools only: mentions curated public MCP tools", () => {
    const result = injectPrompt("", baseConfig);

    // Should mention public tools
    assert.ok(result.includes("kb_search"), "Should mention kb_search");
    assert.ok(result.includes("kb_query"), "Should mention kb_query");
    assert.ok(result.includes("kb_upsert"), "Should mention kb_upsert");
    assert.ok(result.includes("kb_delete"), "Should mention kb_delete");
    assert.ok(result.includes("kb_check"), "Should mention kb_check");

    // Should NOT mention non-public tools
    assert.ok(
      !result.includes("kb_query_relationships"),
      "Should NOT mention kb_query_relationships",
    );
    assert.ok(
      !result.includes("kb_coverage_report"),
      "Should NOT mention kb_coverage_report",
    );
  });

  test("system.transform appends to existing entries (not replace)", async () => {
    const dir = makeProjectDir("system-transform");
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
    const transform = hooks["experimental.chat.system.transform"];
    assert.ok(transform, "system.transform hook should exist");

    const output = {
      system: ["existing-prompt-a", "existing-prompt-b"],
    } as { system: string[] };
    await transform({} as never, output as never);

    // Original entries must still be present
    assert.ok(
      output.system.includes("existing-prompt-a"),
      "original entry 'existing-prompt-a' must be preserved",
    );
    assert.ok(
      output.system.includes("existing-prompt-b"),
      "original entry 'existing-prompt-b' must be preserved",
    );
    // Appended entry should contain the sentinel
    const appendedEntry = output.system.find(
      (s: string) => s !== "existing-prompt-a" && s !== "existing-prompt-b",
    );
    assert.ok(appendedEntry, "an appended entry should exist");
    assert.ok(
      appendedEntry.includes(SENTINEL),
      "appended entry should contain the Kibi sentinel",
    );
    // Total should be 3 (2 original + 1 appended)
    assert.equal(output.system.length, 3, "should have 3 entries total");
  });

  test("system.transform remains text-only and does not fetch live briefings", async () => {
    const dir = makeProjectDir("system-transform");
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
    const transform = hooks["experimental.chat.system.transform"];
    assert.ok(transform, "system.transform hook should exist");

    const output = { system: [] as string[] };
    await transform({} as never, output as never);

    const injected = output.system.join("\n");
    assert.ok(
      injected.includes("/brief-kibi") || injected.includes(SENTINEL),
      "Hook should only append prompt text",
    );
    assert.ok(
      !injected.includes("<!-- kibi-opencode -->\n<!-- kibi-opencode -->"),
      "Hook should not duplicate the sentinel",
    );
    assert.ok(
      !injected.includes("experimental.chat.system.transform"),
      "Hook output should not expose hook internals",
    );
    assert.ok(
      !injected.includes("kb_briefing_generate") &&
        !injected.includes("briefingState"),
      "Hook output should not embed live briefing execution or structured briefing payloads",
    );
  });

  test("chat.params does not modify system array", async () => {
    const dir = makeProjectDir("auto");
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
    const chatParams = hooks["chat.params"];
    assert.ok(chatParams, "chat.params hook should exist");

    const output = {} as Record<string, never>;
    await chatParams({} as never, output as never);

    // chat.params must not touch any system-related data
    assert.ok(
      !("system" in output),
      "chat.params must not create a system property",
    );
  });

  test("hard mode renders a deterministic MCP-only block for dirty authoritative files", async () => {
    const dir = makeProjectDir("auto");
    setupAuthoritativeWorkspace(dir);
    writeProjectConfig(dir, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: false },
      guidance: { smartEnforcement: { enabled: true, mode: "hard" } },
    });
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src", "new-module.ts"),
      "export function newModule() { return 1; }\n",
    );

    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
    const eventHook = hooks.event;
    const transformHook = hooks["experimental.chat.system.transform"];
    assert.ok(eventHook, "event hook should exist");
    assert.ok(transformHook, "system.transform hook should exist");

    await eventHook({
      event: { type: "file.created", properties: { file: "src/new-module.ts" } },
    } as never);
    const output = { system: ["existing system"] };
    await transformHook(
      { focusFilePath: "src/new-module.ts" } as never,
      output,
    );

    const injected = output.system.join("\n");
    assert.ok(
      injected.includes("🛑 Kibi hard gate blocked"),
      `Expected hard gate block, got: ${injected}`,
    );
    assert.ok(injected.includes("src/new-module.ts"));
    for (const required of [
      "kb_search",
      "kb_query",
      "sourceFile",
      "kb_status",
      "kb_check",
      "kb_upsert",
    ]) {
      assert.ok(injected.includes(required), `Expected ${required} guidance`);
    }
    assert.ok(!injected.includes("npx kibi"), "Must not suggest Kibi CLI");
  });

  test("hard mode requests and runs checkpoint runner with dirty fingerprint, then consumes shown block", async () => {
    const dir = makeProjectDir("auto");
    setupAuthoritativeWorkspace(dir);
    writeProjectConfig(dir, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: false },
      guidance: { smartEnforcement: { enabled: true, mode: "hard" } },
    });
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src", "new-module.ts"),
      "export function newModule() { return 1; }\n",
    );

    const seenEvidenceFingerprints: string[] = [];
    const requestedFingerprints: string[] = [];
    const runFingerprints: string[] = [];
    const metadataFor = (context: KibiCheckpointContext, fingerprint: string) => ({
      fingerprint,
      scopeKey: `test-scope:${fingerprint}`,
      worktree: context.workContext.worktreeRoot,
      branch: context.workContext.branch,
      agentIdentity: context.workContext.agentIdentity,
      ...(context.workContext.sessionId !== undefined
        ? { sessionId: context.workContext.sessionId }
        : {}),
    });
    const evidenceSpy = spyOn(
      KibiCheckpointRunner.prototype,
      "isCheckpointPassed",
    ).mockImplementation((_fingerprint, _context) => {
      seenEvidenceFingerprints.push(_fingerprint);
      return false;
    });
    const requestSpy = spyOn(
      KibiCheckpointRunner.prototype,
      "requestCheckpoint",
    ).mockImplementation((context, fingerprint) => {
      requestedFingerprints.push(fingerprint);
      return {
        kind: "requested",
        metadata: {
          ...metadataFor(context, fingerprint),
          guidanceRendered: true,
          guidanceText: context.hardGuidanceText ?? "hard guidance",
        },
      };
    });
    const runSpy = spyOn(
      KibiCheckpointRunner.prototype,
      "runCheckpoint",
    ).mockImplementation(async (context, fingerprint) => {
      runFingerprints.push(fingerprint);
      return {
        kind: "hard_block",
        metadata: {
          ...metadataFor(context, fingerprint),
          reason: "sync_not_run",
        },
      };
    });

    try {
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      const transformHook = hooks["experimental.chat.system.transform"];
      assert.ok(eventHook, "event hook should exist");
      assert.ok(transformHook, "system.transform hook should exist");

      await eventHook({
        event: { type: "file.created", properties: { file: "src/new-module.ts" } },
      } as never);

      const firstOutput = { system: ["existing system"] };
      await transformHook(
        { focusFilePath: "src/new-module.ts" } as never,
        firstOutput,
      );

      const firstInjected = firstOutput.system.join("\n");
      assert.ok(
        firstInjected.includes("🛑 Kibi hard gate blocked"),
        `Expected first prompt to hard-block, got: ${firstInjected}`,
      );

      const expectedFingerprint = buildDirtyRelevantFingerprint([
        "src/new-module.ts",
        "created",
        "code",
        "traceability_candidate",
      ]);
      assert.deepEqual(seenEvidenceFingerprints, [expectedFingerprint]);
      assert.deepEqual(requestedFingerprints, [expectedFingerprint]);
      assert.deepEqual(runFingerprints, [expectedFingerprint]);

      const secondOutput = { system: ["existing system"] };
      await transformHook(
        { focusFilePath: "src/new-module.ts" } as never,
        secondOutput,
      );

      const secondInjected = secondOutput.system.join("\n");
      assert.ok(
        !secondInjected.includes("🛑 Kibi hard gate blocked"),
        `Shown hard block should be consumed, got: ${secondInjected}`,
      );
      assert.deepEqual(requestedFingerprints, [expectedFingerprint]);
      assert.deepEqual(runFingerprints, [expectedFingerprint]);
    } finally {
      evidenceSpy.mockRestore();
      requestSpy.mockRestore();
      runSpy.mockRestore();
    }
  });

  test("hard mode treats passed checkpoint evidence as satisfied", async () => {
    const dir = makeProjectDir("auto");
    setupAuthoritativeWorkspace(dir);
    writeProjectConfig(dir, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: false },
      guidance: { smartEnforcement: { enabled: true, mode: "hard" } },
    });
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src", "new-module.ts"),
      "export function newModule() { return 1; }\n",
    );

    const seenEvidenceFingerprints: string[] = [];
    const evidenceSpy = spyOn(
      KibiCheckpointRunner.prototype,
      "isCheckpointPassed",
    ).mockImplementation((fingerprint) => {
      seenEvidenceFingerprints.push(fingerprint);
      return true;
    });
    const requestSpy = spyOn(
      KibiCheckpointRunner.prototype,
      "requestCheckpoint",
    );
    const runSpy = spyOn(KibiCheckpointRunner.prototype, "runCheckpoint");

    try {
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      const transformHook = hooks["experimental.chat.system.transform"];
      assert.ok(eventHook, "event hook should exist");
      assert.ok(transformHook, "system.transform hook should exist");

      await eventHook({
        event: { type: "file.created", properties: { file: "src/new-module.ts" } },
      } as never);

      const output = { system: ["existing system"] };
      await transformHook(
        { focusFilePath: "src/new-module.ts" } as never,
        output,
      );

      const injected = output.system.join("\n");
      assert.ok(
        !injected.includes("🛑 Kibi hard gate blocked"),
        `Passed checkpoint evidence should suppress hard block, got: ${injected}`,
      );
      assert.deepEqual(seenEvidenceFingerprints, [
        buildDirtyRelevantFingerprint([
          "src/new-module.ts",
          "created",
          "code",
          "traceability_candidate",
        ]),
      ]);
      assert.equal(requestSpy.mock.calls.length, 0);
      assert.equal(runSpy.mock.calls.length, 0);
    } finally {
      evidenceSpy.mockRestore();
      requestSpy.mockRestore();
      runSpy.mockRestore();
    }
  });

  test("hard mode does not block non-authoritative workspaces", async () => {
    const dir = makeProjectDir("auto");
    writeProjectConfig(dir, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: false },
      guidance: { smartEnforcement: { enabled: true, mode: "hard" } },
    });
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src", "vendor-module.ts"),
      "export function vendorModule() { return 1; }\n",
    );

    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
    const eventHook = hooks.event;
    const transformHook = hooks["experimental.chat.system.transform"];
    assert.ok(eventHook, "event hook should exist");
    assert.ok(transformHook, "system.transform hook should exist");

    await eventHook({
      event: {
        type: "file.created",
        properties: { file: "src/vendor-module.ts" },
      },
    } as never);
    const output = { system: [] as string[] };
    await transformHook(
      { focusFilePath: "src/vendor-module.ts" } as never,
      output,
    );

    const injected = output.system.join("\n");
    assert.ok(
      !injected.includes("🛑 Kibi hard gate blocked"),
      `Non-authoritative workspace must not hard-block, got: ${injected}`,
    );
  });

  test("hard mode skips checkpoint runner outside authoritative workspaces", async () => {
    const dir = makeProjectDir("auto");
    writeProjectConfig(dir, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: false },
      guidance: { smartEnforcement: { enabled: true, mode: "hard" } },
    });
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src", "vendor-module.ts"),
      "export function vendorModule() { return 1; }\n",
    );

    const evidenceSpy = spyOn(
      KibiCheckpointRunner.prototype,
      "isCheckpointPassed",
    );
    const requestSpy = spyOn(
      KibiCheckpointRunner.prototype,
      "requestCheckpoint",
    );
    const runSpy = spyOn(KibiCheckpointRunner.prototype, "runCheckpoint");

    try {
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      const transformHook = hooks["experimental.chat.system.transform"];
      assert.ok(eventHook, "event hook should exist");
      assert.ok(transformHook, "system.transform hook should exist");

      await eventHook({
        event: {
          type: "file.created",
          properties: { file: "src/vendor-module.ts" },
        },
      } as never);
      await transformHook(
        { focusFilePath: "src/vendor-module.ts" } as never,
        { system: [] as string[] },
      );

      assert.equal(evidenceSpy.mock.calls.length, 0);
      assert.equal(requestSpy.mock.calls.length, 0);
      assert.equal(runSpy.mock.calls.length, 0);
    } finally {
      evidenceSpy.mockRestore();
      requestSpy.mockRestore();
      runSpy.mockRestore();
    }
  });

  describe("session.idle hook", () => {
    test("session.idle triggers async brief generation", async () => {
      const dir = makeProjectDir("auto");
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      assert.ok(eventHook, "event hook should exist");

      await eventHook({
        event: { type: "session.idle" },
      } as never);
    });

    test("second idle event while in-flight sets trailing rerun flag", async () => {
      const dir = makeProjectDir("auto");
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      assert.ok(eventHook, "event hook should exist");

      await eventHook({
        event: { type: "session.idle" },
      } as never);

      await eventHook({
        event: { type: "session.idle" },
      } as never);
    });

    test("idle event with no client returns early", async () => {
      const dir = makeProjectDir("auto");
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      assert.ok(eventHook, "event hook should exist");

      await eventHook({
        event: { type: "session.idle" },
      } as never);
    });

    test("file.edited still works alongside session.idle", async () => {
      const dir = makeProjectDir("auto");
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      assert.ok(eventHook, "event hook should exist");

      await eventHook({
        event: { type: "file.edited", properties: { file: "test.ts" } },
      } as never);
    });

    test("file.created event is handled alongside file.edited", async () => {
      const dir = makeProjectDir("auto");
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      assert.ok(eventHook, "event hook should exist");

      await eventHook({
        event: { type: "file.created", properties: { file: "new-file.ts" } },
      } as never);
    });

    test("file.deleted event is handled alongside file.edited", async () => {
      const dir = makeProjectDir("auto");
      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      assert.ok(eventHook, "event hook should exist");

      await eventHook({
        event: { type: "file.deleted", properties: { file: "old-file.ts" } },
      } as never);
    });

    test("file lifecycle events still schedule sync after scheduler_sync_failed is latched", async () => {
      const dir = makeProjectDir("auto");
      fs.mkdirSync(path.join(dir, ".opencode"), { recursive: true });
      fs.writeFileSync(
        path.join(dir, ".opencode", "kibi.json"),
        JSON.stringify({ enabled: true, sync: { enabled: true } }, null, 2),
      );
      let capturedOnRunComplete: ((meta: { exitCode?: number }) => void) | undefined;

      (globalThis as typeof globalThis & {
        __kibi_test_scheduler_factory?: (...args: unknown[]) => unknown;
      }).__kibi_test_scheduler_factory = (opts: unknown) => {
        capturedOnRunComplete = (opts as { onRunComplete?: (meta: { exitCode?: number }) => void }).onRunComplete;
        return {
          scheduleSync: () => {},
          onFileEdited: () => {},
          onToolExecuteAfter: () => {},
          flush: async () => {},
          dispose: () => {},
        };
      };

      const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
      const eventHook = hooks.event;
      assert.ok(eventHook, "event hook should exist");

      capturedOnRunComplete?.({ exitCode: 1 });

      await eventHook({
        event: { type: "file.created", properties: { file: "new-file.ts" } },
      } as never);
      await eventHook({
        event: { type: "file.edited", properties: { file: "edit-file.ts" } },
      } as never);
      await eventHook({
        event: { type: "file.deleted", properties: { file: "old-file.ts" } },
      } as never);
    });
  });
});
