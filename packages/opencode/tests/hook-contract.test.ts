import { afterAll, beforeAll, describe, spyOn, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { KibiConfig } from "../src/config";
import kibiOpencodePlugin from "../src/index";
import { SENTINEL, injectPrompt } from "../src/prompt";

describe("hook contract", () => {
  let tmpBase: string;
  let homedirSpy: ReturnType<typeof spyOn>;

  const baseConfig: KibiConfig = {
    enabled: true,
    prompt: { enabled: true, hookMode: "auto" },
    sync: { enabled: false, debounceMs: 2000, ignore: [], relevant: [] },
    ux: {
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

    const output = { system: ["existing-prompt-a", "existing-prompt-b"] } as any;
    await transform({} as any, output);

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

  test("chat.params does not modify system array", async () => {
    const dir = makeProjectDir("auto");
    const hooks = await kibiOpencodePlugin({ directory: dir, worktree: dir });
    const chatParams = hooks["chat.params"];
    assert.ok(chatParams, "chat.params hook should exist");

    const output = {} as any;
    await chatParams({} as any, output);

    // chat.params must not touch any system-related data
    assert.ok(
      !("system" in output),
      "chat.params must not create a system property",
    );
  });
});
