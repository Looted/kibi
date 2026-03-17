import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import { SENTINEL, buildPrompt, injectPrompt } from "../src/prompt";

describe("prompt", () => {
  test("buildPrompt returns guidance with sentinel", () => {
    const p = buildPrompt();
    assert.ok(p.includes(SENTINEL));
  });

  test("injectPrompt adds guidance when not present", () => {
    const result = injectPrompt("hello", {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });
    assert.ok(result.includes(SENTINEL));
  });

  test("injectPrompt skips when sentinel present", () => {
    const withSentinel = `hello\n\n${SENTINEL}`;
    const result = injectPrompt(withSentinel, {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });
    assert.equal(result, withSentinel);
  });

  test("injectPrompt skips when prompt disabled", () => {
    const result = injectPrompt("hello", {
      enabled: true,
      prompt: { enabled: false, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });
    assert.equal(result, "hello");
  });

  test("guidance mentions only public Kibi tools", () => {
    const result = injectPrompt("", {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });

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

  test("guidance includes traceability instruction", () => {
    const result = injectPrompt("", {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });

    assert.ok(
      result.includes("// implements REQ-xxx"),
      "Should mention traceability comment pattern",
    );
  });

  test("guidance mentions /init-kibi bootstrap command", () => {
    const result = injectPrompt("", {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });

    assert.ok(
      result.includes("/init-kibi"),
      "Should mention /init-kibi command",
    );
    assert.ok(
      result.includes("bootstrap") || result.includes("retroactive"),
      "Should mention bootstrap or retroactive",
    );
  });

  test("guidance prefers Kibi over inline comments", () => {
    const result = injectPrompt("", {
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
      sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
      ux: {
        toastFailures: true,
        toastSuccesses: false,
        toastCooldownMs: 10000,
      },
      logLevel: "info",
    });

    assert.ok(
      result.includes(
        "Prefer storing durable knowledge in Kibi over code comments",
      ),
      "Should guide agents to prefer Kibi over comments",
    );
  });
});
