import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import type { KibiConfig } from "../src/config";
import { SENTINEL, buildPrompt, injectPrompt } from "../src/prompt";

const baseConfig: KibiConfig = {
  enabled: true,
  prompt: { enabled: true, hookMode: "auto" },
  sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
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

describe("prompt", () => {
  test("buildPrompt returns guidance with sentinel", () => {
    const p = buildPrompt();
    assert.ok(p.includes(SENTINEL));
  });

  test("injectPrompt adds guidance when not present", () => {
    const result = injectPrompt("hello", baseConfig);
    assert.ok(result.includes(SENTINEL));
  });

  test("injectPrompt skips when sentinel present", () => {
    const withSentinel = `hello\n\n${SENTINEL}`;
    const result = injectPrompt(withSentinel, baseConfig);
    assert.equal(result, withSentinel);
  });

  test("injectPrompt skips when prompt disabled", () => {
    const result = injectPrompt("hello", {
      ...baseConfig,
      prompt: { enabled: false, hookMode: "auto" },
    });
    assert.equal(result, "hello");
  });

  test("guidance mentions only public Kibi tools", () => {
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

  test("guidance includes traceability instruction", () => {
    const result = injectPrompt("", baseConfig);

    assert.ok(
      result.includes("// implements REQ-xxx"),
      "Should mention traceability comment pattern",
    );
  });

  test("guidance mentions /init-kibi bootstrap command", () => {
    const result = injectPrompt("", baseConfig);

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
    const result = injectPrompt("", baseConfig);

    assert.ok(
      result.includes(
        "Prefer storing durable knowledge in Kibi over code comments",
      ),
      "Should guide agents to prefer Kibi over comments",
    );
  });

  test("contextual guidance for code edits includes sentinel", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
    });
    assert.ok(result.includes(SENTINEL), "Contextual guidance must include sentinel");
    assert.ok(result.includes("Code changes detected"), "Should include code edit guidance");
  });

  test("contextual guidance for requirement edits includes sentinel", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "documentation/requirements/REQ-001.md", kind: "requirement" }],
    });
    assert.ok(result.includes(SENTINEL), "Contextual guidance must include sentinel");
    assert.ok(result.includes("Requirement changes detected"), "Should include requirement guidance");
  });

  test("contextual guidance for .kb edits includes sentinel and warning", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [],
      hasRecentKbEdit: true,
    });
    assert.ok(result.includes(SENTINEL), "Contextual guidance must include sentinel");
    assert.ok(result.includes("WARNING"), "Should include .kb edit warning");
  });

  test("injectPrompt with contextual guidance skips when sentinel already present", () => {
    const existing = `existing\n\n${SENTINEL}\nsome old guidance`;
    const result = injectPrompt(existing, baseConfig, {
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
    });
    assert.equal(result, existing, "Should not inject again when sentinel present");
  });
});
