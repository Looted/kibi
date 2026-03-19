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
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Code changes detected"),
      "Should include code edit guidance",
    );
  });

  test("contextual guidance for requirement edits includes sentinel", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [
        { path: "documentation/requirements/REQ-001.md", kind: "requirement" },
      ],
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Requirement changes detected"),
      "Should include requirement guidance",
    );
  });

  test("contextual guidance for .kb edits includes sentinel and warning", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [],
      hasRecentKbEdit: true,
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(result.includes("WARNING"), "Should include .kb edit warning");
  });

  test("injectPrompt with contextual guidance skips when sentinel already present", () => {
    const existing = `existing\n\n${SENTINEL}\nsome old guidance`;
    const result = injectPrompt(existing, baseConfig, {
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
    });
    assert.equal(
      result,
      existing,
      "Should not inject again when sentinel present",
    );
  });

  test("contextual guidance for bootstrap required includes sentinel", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [],
      workspaceHealth: {
        needsBootstrap: true,
        missingConfig: true,
        missingDocDirs: [],
        hasKbEvidence: false,
      },
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Bootstrap required"),
      "Should include bootstrap guidance",
    );
    assert.ok(
      result.includes("/init-kibi") || result.includes("kibi init"),
      "Should include bootstrap commands",
    );
  });

  test("contextual guidance for KB doc edits (scenario) includes sentinel", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [
        { path: "documentation/scenarios/SCEN-001.md", kind: "scenario" },
      ],
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Kibi documentation changes detected"),
      "Should include KB doc guidance",
    );
    assert.ok(
      result.includes("Maintain traceability"),
      "Should mention traceability",
    );
  });

  test("contextual guidance for KB doc edits (test) includes sentinel", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "documentation/tests/TEST-001.md", kind: "test" }],
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Kibi documentation changes detected"),
      "Should include KB doc guidance",
    );
  });

  test("contextual guidance for KB doc edits (ADR) includes sentinel", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "documentation/adr/ADR-001.md", kind: "adr" }],
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Kibi documentation changes detected"),
      "Should include KB doc guidance",
    );
  });

  test("contextual guidance for KB doc edits (fact) includes sentinel", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "documentation/facts/FACT-001.md", kind: "fact" }],
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Kibi documentation changes detected"),
      "Should include KB doc guidance",
    );
  });

  test("contextual guidance for KB doc edits WITHOUT requirement edits", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [
        { path: "documentation/scenarios/SCEN-001.md", kind: "scenario" },
        { path: "documentation/tests/TEST-001.md", kind: "test" },
      ],
    });
    assert.ok(
      result.includes("Kibi documentation changes detected"),
      "Should include KB doc guidance when no requirement edits",
    );
    assert.ok(
      !result.includes("Requirement changes detected"),
      "Should NOT include requirement guidance",
    );
  });

  test("contextual guidance for KB doc edits WITH requirement edits uses requirement guidance", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [
        { path: "documentation/requirements/REQ-001.md", kind: "requirement" },
        { path: "documentation/scenarios/SCEN-001.md", kind: "scenario" },
      ],
    });
    assert.ok(
      result.includes("Requirement changes detected"),
      "Should include requirement guidance when requirement edits exist",
    );
    assert.ok(
      !result.includes("Kibi documentation changes detected"),
      "Should NOT include KB doc guidance when requirement edits exist",
    );
  });

  test("contextual guidance with no specific edits includes general workflow", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [],
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Kibi-first workflow"),
      "Should include general workflow guidance",
    );
    assert.ok(result.includes("Discover"), "Should include Discover step");
    assert.ok(
      result.includes("Document intent"),
      "Should include Document intent step",
    );
    assert.ok(
      result.includes("Link during work"),
      "Should include Link during work step",
    );
    assert.ok(result.includes("Validate"), "Should include Validate step");
  });

  test("injectPrompt skips when plugin disabled", () => {
    const result = injectPrompt("hello", {
      ...baseConfig,
      enabled: false,
    });
    assert.equal(result, "hello", "Should not inject when plugin disabled");
  });

  test("injectPrompt skips when both prompt and plugin enabled", () => {
    const result = injectPrompt("hello", {
      ...baseConfig,
      enabled: true,
      prompt: { enabled: true, hookMode: "auto" },
    });
    assert.ok(result.includes(SENTINEL), "Should inject when both enabled");
  });

  test("buildPrompt with undefined context returns base guidance", () => {
    const p = buildPrompt(undefined);
    assert.ok(p.includes(SENTINEL));
    assert.ok(p.includes("Kibi-first workflow"));
    assert.ok(p.includes("Public Kibi tools only"));
  });

  test("buildPrompt with empty context returns general workflow guidance", () => {
    const p = buildPrompt({ recentEdits: [] });
    assert.ok(p.includes(SENTINEL));
    assert.ok(p.includes("Kibi-first workflow"));
    assert.ok(p.includes("Discover"));
  });

  test("contextual guidance combines multiple conditions", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [
        { path: "src/foo.ts", kind: "code" },
        { path: "documentation/scenarios/SCEN-001.md", kind: "scenario" },
      ],
      hasRecentKbEdit: true,
      workspaceHealth: {
        needsBootstrap: true,
        missingConfig: true,
        missingDocDirs: [],
        hasKbEvidence: false,
      },
    });
    assert.ok(result.includes(SENTINEL), "Must include sentinel");
    assert.ok(result.includes("WARNING"), "Should include .kb edit warning");
    assert.ok(
      result.includes("Bootstrap required"),
      "Should include bootstrap guidance",
    );
    assert.ok(
      result.includes("Code changes detected"),
      "Should include code guidance",
    );
    assert.ok(
      result.includes("Kibi documentation changes detected"),
      "Should include KB doc guidance (no requirement edits)",
    );
  });

  test("contextual guidance for multiple KB doc edits", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [
        { path: "documentation/scenarios/SCEN-001.md", kind: "scenario" },
        { path: "documentation/tests/TEST-001.md", kind: "test" },
        { path: "documentation/adr/ADR-001.md", kind: "adr" },
        { path: "documentation/facts/FACT-001.md", kind: "fact" },
      ],
    });
    assert.ok(
      result.includes("Kibi documentation changes detected"),
      "Should include KB doc guidance",
    );
  });
});
