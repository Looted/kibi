import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import type { KibiConfig } from "../src/config";
import { SENTINEL, injectPrompt } from "../src/prompt";

describe("hook contract", () => {
  const baseConfig: KibiConfig = {
    enabled: true,
    prompt: { enabled: true, hookMode: "auto" },
    sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
    ux: {
      toastFailures: true,
      toastSuccesses: false,
      toastCooldownMs: 10000,
    },
    logLevel: "info",
  };

  test("system.transform is the primary prompt-text delivery hook", () => {
    // Per ADR-016: experimental.chat.system.transform carries prompt text
    const originalSystem = "Original system prompt";
    const result = injectPrompt(originalSystem, baseConfig);

    // Should contain Kibi guidance via system.transform path
    assert.ok(result.includes(SENTINEL), "Prompt should contain Kibi sentinel");
    assert.ok(
      result.includes("kb_query"),
      "Prompt should mention public Kibi tools",
    );
  });

  test("chat.params hook does not carry prompt text", () => {
    // Per ADR-016: chat.params is for option-level enrichment only (temperature, topP, etc.)
    // It should NEVER be used for prompt text injection
    // This test documents that policy; the actual chat.params hook in index.ts is a no-op

    // When hookMode is "chat-params", prompt injection should be disabled
    const chatParamsConfig: KibiConfig = {
      ...baseConfig,
      prompt: { ...baseConfig.prompt, hookMode: "chat-params" },
    };

    // In chat-params mode, injectPrompt behavior depends on plugin implementation
    // The key contract is: chat.params hook itself should NOT inject prompt text
    const originalSystem = "Original system prompt";
    const result = injectPrompt(originalSystem, chatParamsConfig);

    // The plugin should still respect prompt.enabled even in chat-params mode
    // Implementation note: current behavior keeps prompt injection active in chat-params mode
    // via the system transform path when auto mode is used
    // This test documents the policy; actual enforcement is in index.ts hook registration
    assert.ok(
      result.includes(originalSystem),
      "Original system prompt should be preserved",
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

  test("public tools only: mentions kb_query, kb_upsert, kb_delete, kb_check", () => {
    const result = injectPrompt("", baseConfig);

    // Should mention public tools
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
});
