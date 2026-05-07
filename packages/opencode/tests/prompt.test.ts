/// <reference types="bun-types" />
import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BriefingRuntimeResult } from "../src/briefing-runtime";
import type { KibiConfig } from "../src/config";
import { GuidanceCache } from "../src/guidance-cache";
import type { CacheKey } from "../src/guidance-cache";
import type { InitKibiCommandCapability } from "../src/init-kibi-capability";
import {
  type PromptContext,
  SENTINEL,
  buildAutoBriefingGuidance,
  buildPrompt,
  injectPrompt,
} from "../src/prompt";

const baseConfig: KibiConfig = {
  enabled: true,
  prompt: { enabled: true, hookMode: "auto" },
  sync: { enabled: true, debounceMs: 2000, ignore: [], relevant: [] },
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

const supportedInitKibiCapability: InitKibiCommandCapability = {
  supported: true,
  pluginVersion: "test-supported",
};

const unsupportedInitKibiCapability: InitKibiCommandCapability = {
  supported: false,
  reason: "native command injection unsupported in this host",
};

function buildPromptWithCapability(
  capability: InitKibiCommandCapability,
  context?: PromptContext,
): string {
  return buildPrompt(context, capability);
}

function injectPromptWithCapability(
  current: string,
  config: KibiConfig,
  context: PromptContext | undefined,
  capability: InitKibiCommandCapability,
): string {
  return injectPrompt(current, config, context, capability);
}

function makeAutoBriefResult(
  overrides: Partial<BriefingRuntimeResult> = {},
): BriefingRuntimeResult {
  const state = overrides.state ?? "ready";
  const promptBlock = overrides.promptBlock ?? "- REQ-001: Auto summary";

  return {
    state,
    promptBlock,
    tldr: overrides.tldr ?? "Auto summary",
    citations: overrides.citations ?? [],
    showManualCue:
      overrides.showManualCue ??
      !(state === "ready" && promptBlock.trim() !== ""),
    toastMessage: "Kibi brief ready — summary added to guidance.",
    ...overrides,
  };
}

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

  test("guidance mentions curated public Kibi tools", () => {
    const result = injectPrompt("", baseConfig);

    // Should mention public tools
    assert.ok(result.includes("kb_search"), "Should mention kb_search");
    assert.ok(result.includes("kb_query"), "Should mention kb_query");
    assert.ok(result.includes("kb_status"), "Should mention kb_status");
    assert.ok(result.includes("kb_upsert"), "Should mention kb_upsert");
    assert.ok(result.includes("kb_delete"), "Should mention kb_delete");
    assert.ok(result.includes("kb_check"), "Should mention kb_check");
    assert.ok(
      result.includes("kb_autopilot_generate"),
      "Should mention kb_autopilot_generate",
    );

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
      result.includes("implements") && result.includes("ownership"),
      "Should teach implements for requirement ownership",
    );
    assert.ok(
      result.includes("executable_for"),
      "Should mention executable_for for test code",
    );
  });

  test("guidance includes repo dogfood rebuild note", () => {
    const result = injectPrompt("", baseConfig);

    assert.ok(
      result.includes("bun run build"),
      "Should mention rebuild command for dogfood setup",
    );
    assert.ok(result.includes("kibi-mcp"), "Should mention local MCP artifact");
    assert.ok(
      result.includes("kibi-opencode"),
      "Should mention local plugin artifact",
    );
  });

  test("guidance canonicalizes /init-kibi when native injection is supported", () => {
    const result = buildPromptWithCapability(supportedInitKibiCapability);

    assert.ok(
      result.includes("/init-kibi"),
      "Should mention /init-kibi command",
    );
    assert.ok(
      result.includes("canonical short alias"),
      "Should describe /init-kibi as the canonical short alias",
    );
    assert.ok(
      result.includes("/kibi:init-kibi:mcp"),
      "Should retain the namespaced MCP fallback reference",
    );
    assert.ok(
      result.indexOf("/init-kibi") < result.indexOf("/kibi:init-kibi:mcp"),
      "Should prefer /init-kibi ahead of the namespaced fallback",
    );
    assert.ok(
      result.includes("kb_autopilot_generate"),
      "Should mention kb_autopilot_generate for bootstrap",
    );
  });

  test("guidance does not claim /init-kibi exists unconditionally", () => {
    const result = buildPromptWithCapability(supportedInitKibiCapability);

    assert.ok(
      result.includes("Kibi OpenCode plugin is active"),
      "Should condition /init-kibi on plugin activation",
    );
    assert.ok(
      !result.includes("Bootstrap existing repos: use `/init-kibi`"),
      "Should not use unconditional /init-kibi wording",
    );
  });

  test("guidance mentions /kibi:init-kibi:mcp as fallback when native injection is unsupported", () => {
    const result = buildPromptWithCapability(unsupportedInitKibiCapability);

    assert.ok(
      result.includes("/kibi:init-kibi:mcp"),
      "Should mention the namespaced MCP fallback",
    );
    assert.ok(
      result.includes("fail closed"),
      "Should explain the unsupported-host fail-closed behavior",
    );
    assert.ok(
      result.includes("does not support native `/init-kibi` injection"),
      "Should explain why /init-kibi is unavailable",
    );
    assert.ok(
      !result.includes("`/init-kibi` is the canonical short alias"),
      "Should not claim the native alias is canonical when unsupported",
    );
  });

  test("guidance must NOT contain forbidden kibi CLI commands", () => {
    const result = injectPrompt("", baseConfig);

    // Forbidden CLI commands - agents should use MCP tools only
    const forbiddenCommands = [
      "kibi sync",
      "kibi init",
      "kibi doctor",
      "kibi query",
      "kibi upsert",
      "kibi check",
      "kibi branch",
      "kibi gc",
    ];

    for (const cmd of forbiddenCommands) {
      assert.ok(
        !result.includes(cmd),
        `Prompt should NOT contain forbidden CLI command "${cmd}" - agents must use MCP tools only`,
      );
    }
  });

  test("bootstrap guidance must NOT contain kibi init or kibi doctor", () => {
    const result = injectPromptWithCapability("hello", baseConfig, {
      recentEdits: [],
      workspaceHealth: {
        needsBootstrap: true,
        missingConfig: true,
        missingDocDirs: [],
        hasKbEvidence: false,
      },
    }, supportedInitKibiCapability);

    assert.ok(
      result.includes("Bootstrap required"),
      "Should include bootstrap guidance",
    );
    assert.ok(
      result.includes("/init-kibi"),
      "Should include /init-kibi command",
    );
    assert.ok(
      result.includes("kb_autopilot_generate"),
      "Should include kb_autopilot_generate in bootstrap guidance",
    );
    assert.ok(
      !result.includes("kibi init"),
      "Should NOT contain 'kibi init' CLI command",
    );
    assert.ok(
      !result.includes("kibi doctor"),
      "Should NOT contain 'kibi doctor' CLI command",
    );
    assert.ok(
      result.includes("kb_search") ||
        result.includes("kb_query") ||
        result.includes("kb_upsert") ||
        result.includes("kb_check") ||
        result.includes("kb_delete"),
      "Should reference MCP tools",
    );
  });

  test("KB doc edit guidance must NOT contain 'kibi check' CLI", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [
        { path: "documentation/scenarios/SCEN-001.md", kind: "scenario" },
      ],
    });

    assert.ok(
      result.includes("Kibi documentation changes detected"),
      "Should include KB doc guidance",
    );
    assert.ok(
      !result.includes("kibi check"),
      "Should NOT contain 'kibi check' CLI command - use kb_check MCP tool",
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
    // Single-block policy: only WARNING block, no general workflow
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
    const result = injectPromptWithCapability("hello", baseConfig, {
      recentEdits: [],
      workspaceHealth: {
        needsBootstrap: true,
        missingConfig: true,
        missingDocDirs: [],
        hasKbEvidence: false,
      },
    }, supportedInitKibiCapability);
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    assert.ok(
      result.includes("Bootstrap required"),
      "Should include bootstrap guidance",
    );
    assert.ok(
      result.includes("/init-kibi"),
      "Should include bootstrap command",
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

  test("contextual guidance with no specific edits returns sentinel only", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [],
    });
    assert.ok(
      result.includes(SENTINEL),
      "Contextual guidance must include sentinel",
    );
    // Single-block policy: no risk class = no guidance block, just sentinel
    assert.ok(
      result.trim().endsWith(SENTINEL),
      "Result should end with sentinel",
    );
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

  test("buildPrompt with empty context returns sentinel only (single-block policy)", () => {
    const p = buildPrompt({ recentEdits: [] });
    assert.ok(p.includes(SENTINEL));
    // Single-block policy: no risk class = no guidance block, just sentinel
    assert.equal(p.trim(), SENTINEL);
  });

  test("vendored_only posture suppresses operational guidance", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "vendored_only",
      riskClass: "behavior_candidate",
    });
    assert.equal(p.trim(), SENTINEL);
  });

  test("safe_docs_only risk injects no discovery guidance", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "README.md", kind: "unknown" }],
      posture: "root_active",
      riskClass: "safe_docs_only",
    });
    assert.equal(p.trim(), SENTINEL);
  });

  test("safe_test_only risk injects no discovery guidance", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.test.ts", kind: "test" }],
      posture: "root_active",
      riskClass: "safe_test_only",
    });
    assert.equal(p.trim(), SENTINEL);
  });

  test("smart-enforcement guidance respects the token budget", () => {
    const p = buildPrompt({
      recentEdits: [
        { path: "documentation/requirements/REQ-001.md", kind: "requirement" },
      ],
      posture: "root_active",
      riskClass: "req_policy_candidate",
    });
    const words = p.split(/\s+/).filter(Boolean).length;
    const bullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));
    assert.ok(words <= 120, `Expected <= 120 words, got ${words}`);
    assert.ok(
      bullets.length <= 5,
      `Expected <= 5 bullets, got ${bullets.length}`,
    );
  });

  test("contextual guidance selects single highest-priority block", () => {
    // Single-block policy: only the highest priority block is returned
    // Priority: manual_kb_edit > posture > risk_class > safe/none
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [
        { path: "src/foo.ts", kind: "code" },
        { path: "documentation/scenarios/SCEN-001.md", kind: "scenario" },
      ],
      hasRecentKbEdit: true, // Highest priority
      workspaceHealth: {
        needsBootstrap: true,
        missingConfig: true,
        missingDocDirs: [],
        hasKbEvidence: false,
      },
    });
    assert.ok(result.includes(SENTINEL), "Must include sentinel");
    // Single-block: only manual_kb_edit warning should appear (highest priority)
    assert.ok(
      result.includes("WARNING"),
      "Should include .kb edit warning (highest priority)",
    );
    // These should NOT appear because single-block only returns highest priority
    assert.ok(
      !result.includes("Bootstrap required"),
      "Should NOT include bootstrap when .kb edit warning takes priority",
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

  test("specific FACT routing guidance when recentCommentSuggestion is FACT", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "src/models.py", kind: "code" }],
      recentCommentSuggestion: {
        filePath: "src/models.py",
        suggestionType: "fact",
        confidence: "high",
        reasoning: "Contains domain invariants",
        fingerprint: "abc123",
        sourceKind: "docstring",
      },
    });
    assert.ok(result.includes(SENTINEL), "Must include sentinel");
    assert.ok(
      result.includes("Durable knowledge detected: FACT"),
      "Should include FACT-specific guidance",
    );
    assert.ok(result.includes("domain fact"), "Should mention domain fact");
    assert.ok(
      result.includes("documentation/facts/FACT-xxx.md"),
      "Should suggest creating FACT entity",
    );
  });

  test("FACT guidance mentions strict fact lane for domain invariants", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "src/models.py", kind: "code" }],
      recentCommentSuggestion: {
        filePath: "src/models.py",
        suggestionType: "fact",
        confidence: "high",
        reasoning: "Contains domain invariants",
        fingerprint: "abc123",
        sourceKind: "docstring",
      },
    });
    assert.ok(
      result.includes("strict fact lane") ||
        result.includes("strict domain fact"),
      "FACT guidance should mention strict fact lane or strict domain fact",
    );
  });

  test("FACT guidance mentions observation/meta for bug and workaround notes", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "src/models.py", kind: "code" }],
      recentCommentSuggestion: {
        filePath: "src/models.py",
        suggestionType: "fact",
        confidence: "high",
        reasoning: "Contains domain invariants",
        fingerprint: "abc123",
        sourceKind: "docstring",
      },
    });
    assert.ok(
      result.includes("observation") || result.includes("meta"),
      "FACT guidance should mention observation or meta for bug/workaround notes",
    );
  });

  test("specific ADR routing guidance when recentCommentSuggestion is ADR", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "src/database.py", kind: "code" }],
      recentCommentSuggestion: {
        filePath: "src/database.py",
        suggestionType: "adr",
        confidence: "high",
        reasoning: "Contains technical decision rationale",
        fingerprint: "def456",
        sourceKind: "block-comment",
      },
    });
    assert.ok(result.includes(SENTINEL), "Must include sentinel");
    assert.ok(
      result.includes("Durable knowledge detected: ADR"),
      "Should include ADR-specific guidance",
    );
    assert.ok(
      result.includes("technical decision"),
      "Should mention technical decisions",
    );
    assert.ok(
      result.includes("documentation/adr/ADR-xxx.md"),
      "Should suggest creating ADR entity",
    );
  });

  test("specific REQ routing guidance when recentCommentSuggestion is REQ", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "src/api.py", kind: "code" }],
      recentCommentSuggestion: {
        filePath: "src/api.py",
        suggestionType: "req",
        confidence: "medium",
        reasoning: "Contains behavior intent",
        fingerprint: "ghi789",
        sourceKind: "docstring",
      },
    });
    assert.ok(result.includes(SENTINEL), "Must include sentinel");
    assert.ok(
      result.includes("Durable knowledge detected: REQ"),
      "Should include REQ-specific guidance",
    );
    assert.ok(
      result.includes("behavior intent"),
      "Should mention behavior intent",
    );
    assert.ok(
      result.includes("documentation/requirements/REQ-xxx.md"),
      "Should suggest creating REQ entity",
    );
  });

  test("generic code guidance when no recentCommentSuggestion", () => {
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "src/utils.py", kind: "code" }],
    });
    assert.ok(result.includes(SENTINEL), "Must include sentinel");
    assert.ok(
      result.includes("Code changes detected"),
      "Should include generic code guidance",
    );
    assert.ok(
      result.includes("FACT") && result.includes("ADR"),
      "Should mention KB entity types",
    );
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("omits bootstrap guidance when relocated sync paths are healthy", () => {
    // Relocated-path workspaces (e.g. kibi-docs/* custom sync paths) that are
    // correctly configured should not trigger bootstrap nagging.
    const result = injectPrompt("hello", baseConfig, {
      recentEdits: [{ path: "kibi-docs/src/main.ts", kind: "code" }],
      workspaceHealth: {
        needsBootstrap: false,
        missingConfig: false,
        missingDocDirs: [],
        hasKbEvidence: true,
      },
    });

    assert.ok(result.includes(SENTINEL), "Must include sentinel");
    assert.ok(
      !result.includes("Bootstrap required"),
      "Should NOT include bootstrap guidance when needsBootstrap is false",
    );
    assert.ok(
      !result.includes("/init-kibi"),
      "Should NOT mention /init-kibi when relocated paths are healthy",
    );
    assert.ok(
      !result.includes("kibi init"),
      "Should NOT contain 'kibi init' CLI command",
    );
    assert.ok(
      !result.includes("kibi doctor"),
      "Should NOT contain 'kibi doctor' CLI command",
    );
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("includes bootstrap guidance when relocated config points at a missing target", () => {
    // When relocated-path config exists but target is missing, needsBootstrap
    // is true and the prompt should nudge toward /init-kibi (MCP only).
    const result = injectPromptWithCapability("hello", baseConfig, {
      recentEdits: [],
      workspaceHealth: {
        needsBootstrap: true,
        missingConfig: true,
        missingDocDirs: [],
        hasKbEvidence: false,
      },
    }, supportedInitKibiCapability);

    assert.ok(result.includes(SENTINEL), "Must include sentinel");
    assert.ok(
      result.includes("/init-kibi"),
      "Should include /init-kibi bootstrap command",
    );
    assert.ok(
      result.includes("kb_autopilot_generate"),
      "Should include kb_autopilot_generate in bootstrap guidance",
    );
    assert.ok(
      !result.includes("kibi init"),
      "Should NOT contain 'kibi init' CLI command",
    );
    assert.ok(
      !result.includes("kibi doctor"),
      "Should NOT contain 'kibi doctor' CLI command",
    );
  });
});

// implements REQ-opencode-smart-enforcement-v1
describe("completion reminder policy", () => {
  const REMINDER_TEXT = "Run `kb_check` before completing this task.";
  const BRIEF_KIBI_CUE =
    "Authoritative risky edit: run `/brief-kibi` before acting.";

  test("reminder appears for behavior_candidate when completionReminder=true", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: true,
    });
    assert.ok(
      p.includes(REMINDER_TEXT),
      "Should include reminder for behavior_candidate",
    );
  });

  test("brief-kibi cue appears for authoritative behavior_candidate guidance", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
    });
    assert.ok(
      p.includes(BRIEF_KIBI_CUE),
      "Should include /brief-kibi cue for authoritative risky code edits",
    );
  });

  test("reminder appears for traceability_candidate when completionReminder=true", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "traceability_candidate",
      completionReminder: true,
    });
    assert.ok(
      p.includes(REMINDER_TEXT),
      "Should include reminder for traceability_candidate",
    );
  });

  test("brief-kibi cue appears for authoritative traceability_candidate guidance", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "hybrid_root_plus_vendored",
      riskClass: "traceability_candidate",
    });
    assert.ok(
      p.includes(BRIEF_KIBI_CUE),
      "Should include /brief-kibi cue for authoritative traceability edits",
    );
  });

  test("reminder appears for req_policy_candidate when completionReminder=true", () => {
    const p = buildPrompt({
      recentEdits: [
        { path: "documentation/requirements/REQ-001.md", kind: "requirement" },
      ],
      posture: "root_active",
      riskClass: "req_policy_candidate",
      completionReminder: true,
    });
    assert.ok(
      p.includes(REMINDER_TEXT),
      "Should include reminder for req_policy_candidate",
    );
  });

  test("reminder does NOT appear for safe_docs_only", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "README.md", kind: "unknown" }],
      posture: "root_active",
      riskClass: "safe_docs_only",
      completionReminder: true,
    });
    assert.ok(
      !p.includes(REMINDER_TEXT),
      "Should NOT include reminder for safe_docs_only",
    );
  });

  test("reminder does NOT appear for safe_test_only", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.test.ts", kind: "test" }],
      posture: "root_active",
      riskClass: "safe_test_only",
      completionReminder: true,
    });
    assert.ok(
      !p.includes(REMINDER_TEXT),
      "Should NOT include reminder for safe_test_only",
    );
  });

  test("reminder does NOT appear for vendored_only posture", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "vendored_only",
      riskClass: "behavior_candidate",
      completionReminder: true,
    });
    assert.ok(
      !p.includes(REMINDER_TEXT),
      "Should NOT include reminder for vendored_only",
    );
  });

  test("brief-kibi cue does NOT appear for non-authoritative posture", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_partial",
      riskClass: "behavior_candidate",
    });
    assert.ok(
      !p.includes(BRIEF_KIBI_CUE),
      "Should NOT include /brief-kibi cue for non-authoritative posture",
    );
  });

  test("reminder does NOT appear for root_uninitialized posture", () => {
    const p = buildPrompt({
      recentEdits: [],
      posture: "root_uninitialized",
      riskClass: "behavior_candidate",
      completionReminder: true,
    });
    assert.ok(
      !p.includes(REMINDER_TEXT),
      "Should NOT include reminder for root_uninitialized",
    );
  });

  test("reminder does NOT appear when completionReminder=false", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: false,
    });
    assert.ok(
      !p.includes(REMINDER_TEXT),
      "Should NOT include reminder when false",
    );
  });

  test("reminder does NOT appear when completionReminder is undefined", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
    });
    assert.ok(
      !p.includes(REMINDER_TEXT),
      "Should NOT include reminder when undefined",
    );
  });

  test("reminder does NOT appear on cache-hit", () => {
    const cache = new GuidanceCache(600000);
    const key: CacheKey = {
      workspaceRoot: "/ws",
      branch: "main",
      posture: "root_active",
      riskClass: "behavior_candidate",
      fileBucket: "code",
    };
    cache.recordSatisfied(key, "guidance");
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: true,
      cache,
      workspaceRoot: "/ws",
      branch: "main",
    });
    assert.ok(
      !p.includes(REMINDER_TEXT),
      "Should NOT include reminder on cache-hit",
    );
  });

  test("block with reminder stays within budget (<=120 words, <=5 bullets)", () => {
    const p = buildPrompt({
      recentEdits: [
        { path: "documentation/requirements/REQ-001.md", kind: "requirement" },
      ],
      posture: "root_active",
      riskClass: "req_policy_candidate",
      completionReminder: true,
    });
    const words = p.split(/\s+/).filter(Boolean).length;
    const bullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));
    assert.ok(words <= 120, `Expected <= 120 words, got ${words}`);
    assert.ok(
      bullets.length <= 5,
      `Expected <= 5 bullets, got ${bullets.length}`,
    );
  });
  test("maintenanceDegraded suppresses completion reminder for behavior_candidate", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: true,
      maintenanceDegraded: true,
    });
    assert.ok(
      !p.includes(REMINDER_TEXT),
      "Should NOT include reminder when maintenanceDegraded",
    );
  });

  test("maintenanceDegraded suppresses brief-kibi cue for authoritative risky guidance", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      maintenanceDegraded: true,
    });
    assert.ok(
      !p.includes(BRIEF_KIBI_CUE),
      "Should NOT include /brief-kibi cue when maintenanceDegraded",
    );
  });

  test("degradedMode=warn-once adds degraded advisory block", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      maintenanceDegraded: true,
      degradedMode: "warn-once",
      showDegradedAdvisory: true,
    });
    assert.ok(
      p.includes("maintenance degraded") || p.includes("degraded"),
      "Should include degraded advisory for warn-once",
    );
  });

  test("degradedMode=structured-only adds no degraded prompt copy", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      maintenanceDegraded: true,
      degradedMode: "structured-only",
      showDegradedAdvisory: true,
    });
    assert.ok(
      !p.includes("maintenance degraded"),
      "Should NOT include degraded prompt copy for structured-only",
    );
  });

  test("degraded advisory can appear even when cache-hit would otherwise suppress guidance", () => {
    const cache = new GuidanceCache(600000);
    const key: CacheKey = {
      workspaceRoot: "/ws",
      branch: "main",
      posture: "root_active",
      riskClass: "behavior_candidate",
      fileBucket: "code",
    };
    cache.recordSatisfied(key, "guidance");
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      maintenanceDegraded: true,
      degradedMode: "warn-once",
      showDegradedAdvisory: true,
      cache,
      workspaceRoot: "/ws",
      branch: "main",
    });
    assert.ok(
      p.includes("degraded") || p.includes("advisory"),
      "Degraded advisory should bypass cache-hit suppression",
    );
  });

  test("degraded advisory block stays within budget", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      maintenanceDegraded: true,
      degradedMode: "warn-once",
      showDegradedAdvisory: true,
    });
    const words = p.split(/\s+/).filter(Boolean).length;
    const bullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));
    assert.ok(words <= 120, `Expected <= 120 words, got ${words}`);
    assert.ok(
      bullets.length <= 5,
      `Expected <= 5 bullets, got ${bullets.length}`,
    );
  });
});

describe("auto-brief prompt rendering", () => {
  const BRIEF_KIBI_CUE =
    "Authoritative risky edit: run `/brief-kibi` before acting.";
  const REMINDER_TEXT = "Run `kb_check` before completing this task.";
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-auto-brief-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  function writeSymbolsYamlForPrompt(): void {
    const docDir = path.join(tmpDir, "documentation");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(
      path.join(docDir, "symbols.yaml"),
      [
        "symbols:",
        "  - id: SYM-buildPrompt",
        "    sourceFile: packages/opencode/src/prompt.ts",
        "    links:",
        "      - REQ-opencode-kibi-briefing-v2",
      ].join("\n"),
    );
  }

  function buildRiskyPrompt(overrides: Partial<PromptContext> = {}): string {
    const context: PromptContext = {
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
    };

    return buildPrompt({ ...context, ...overrides });
  }

  test("renders ready-state auto-brief block and suppresses the risky cue", () => {
    const p = buildRiskyPrompt({
      autoBriefResult: makeAutoBriefResult({
        state: "ready",
        promptBlock:
          "- REQ-001: Session timeout\n- REQ-002: Session invalidation",
      }),
    });

    assert.ok(
      p.includes("🧠 **Kibi briefing available**"),
      "Should render the auto-brief header",
    );
    assert.ok(
      p.includes("- REQ-001: Session timeout"),
      "Should render first imported briefing bullet",
    );
    assert.ok(
      p.includes("- REQ-002: Session invalidation"),
      "Should render second imported briefing bullet",
    );
    assert.ok(
      !p.includes(BRIEF_KIBI_CUE),
      "Should suppress /brief-kibi cue when a ready-state prompt block exists",
    );
    assert.ok(
      !p.includes("Code changes detected"),
      "Should replace the normal risky guidance body",
    );
  });

  test("ready-state auto-brief honors showManualCue when deciding whether to suppress /brief-kibi", () => {
    const briefKibiCue =
      "Authoritative risky edit: run `/brief-kibi` before acting.";
    const p = buildRiskyPrompt({
      autoBriefResult: makeAutoBriefResult({
        state: "ready",
        promptBlock: "- REQ-001: Session timeout",
        showManualCue: true,
      }),
    });

    assert.ok(
      p.includes("🧠 **Kibi briefing available**"),
      "Should still render the auto-brief header",
    );
    assert.ok(
      p.includes(briefKibiCue),
      "Should preserve /brief-kibi cue when showManualCue requests it",
    );
  });

  test("ready-state auto-brief suppresses source-linked micro-brief insertion", () => {
    writeSymbolsYamlForPrompt();

    const p = buildRiskyPrompt({
      workspaceRoot: tmpDir,
      focusEdit: { path: "packages/opencode/src/prompt.ts", kind: "code" },
      autoBriefResult: makeAutoBriefResult({
        state: "ready",
        promptBlock: "- REQ-001: Session timeout",
      }),
    });

    assert.ok(
      !p.includes("- Existing Kibi links:"),
      "Should suppress source-linked micro-brief when rendering ready-state auto-brief content",
    );
  });

  test("tldr fallback keeps the manual cue and suppresses source-linked micro-brief insertion", () => {
    writeSymbolsYamlForPrompt();

    const p = buildRiskyPrompt({
      workspaceRoot: tmpDir,
      autoBriefResult: makeAutoBriefResult({
        state: "tldr_fallback",
        promptBlock:
          "- What changed: Session rules summary\n- Why it matters: This update changes how current project knowledge should be interpreted.",
        toastMessage:
          "Kibi brief summary added — use /brief-kibi for full details.",
      }),
    });

    assert.ok(
      p.includes("🧠 **Kibi briefing available**"),
      "Should render the fallback auto-brief header",
    );
    assert.ok(
      p.includes("- What changed: Session rules summary"),
      "Should render the TLDR fallback content",
    );
    assert.ok(
      p.includes(BRIEF_KIBI_CUE),
      "Should keep the outer /brief-kibi cue for TLDR fallback",
    );
    assert.ok(
      !p.includes("- Existing Kibi links:"),
      "Should suppress source-linked micro-brief when fallback content is present",
    );
  });

  test("no_briefing auto-brief result preserves the existing risky guidance path", () => {
    const baseline = buildRiskyPrompt();
    const withNoBriefing = buildRiskyPrompt({
      autoBriefResult: makeAutoBriefResult({
        state: "no_briefing",
        promptBlock: "",
        tldr: "",
        toastMessage:
          "Kibi brief unavailable — keeping /brief-kibi manual path.",
      }),
    });

    assert.equal(
      withNoBriefing,
      baseline,
      "no_briefing should behave identically to the pre-existing risky guidance path",
    );
  });

  test("auto-brief guidance does not surface idle-brief markers", () => {
    const result = buildAutoBriefingGuidance(
      {
        schemaVersion: "1.0",
        briefId: "brief-123",
        type: "success",
        promptBlock: "- generated while idle",
      } as unknown as Parameters<typeof buildAutoBriefingGuidance>[0],
      false,
    );

    assert.equal(result, null);
  });

  test("ready-state auto-brief still respects the 5-bullet prompt budget without a reminder", () => {
    const p = buildRiskyPrompt({
      autoBriefResult: makeAutoBriefResult({
        state: "ready",
        promptBlock: [
          "- REQ-001: One",
          "- REQ-002: Two",
          "- REQ-003: Three",
          "- REQ-004: Four",
          "- REQ-005: Five",
          "- REQ-006: Six",
        ].join("\n"),
      }),
    });

    const importedBullets = p
      .split("\n")
      .filter((line) => line.startsWith("- REQ-"));

    assert.equal(
      importedBullets.length,
      5,
      "Ready-state imported briefing content should cap at 5 bullets without a reminder",
    );
    assert.ok(!p.includes("- REQ-006: Six"), "Sixth bullet should be trimmed");
  });

  test("completion reminder trims ready-state imported briefing bullets to four", () => {
    const p = buildRiskyPrompt({
      completionReminder: true,
      autoBriefResult: makeAutoBriefResult({
        state: "ready",
        promptBlock: [
          "- REQ-001: One",
          "- REQ-002: Two",
          "- REQ-003: Three",
          "- REQ-004: Four",
          "- REQ-005: Five",
          "- REQ-006: Six",
        ].join("\n"),
      }),
    });

    const importedBullets = p
      .split("\n")
      .filter((line) => line.startsWith("- REQ-"));
    const allBullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));

    assert.equal(
      importedBullets.length,
      4,
      "Ready-state imported briefing content should cap at 4 bullets when reminder is enabled",
    );
    assert.ok(
      p.includes(REMINDER_TEXT),
      "Should still append the completion reminder",
    );
    assert.equal(
      allBullets.length,
      5,
      "Imported bullets plus reminder should stay within the 5-bullet cap",
    );
    assert.ok(
      !p.includes("- REQ-005: Five"),
      "Fifth imported bullet should be trimmed",
    );
  });

  test("ready-state auto-brief stays inside a single contextual block", () => {
    const p = buildRiskyPrompt({
      completionReminder: true,
      autoBriefResult: makeAutoBriefResult({
        state: "ready",
        promptBlock:
          "- REQ-001: Session timeout\n- REQ-002: Session invalidation",
      }),
    });

    const blocks = p
      .split(SENTINEL)
      .filter((segment) => segment.trim().length > 0);
    assert.equal(
      blocks.length,
      1,
      "Auto-brief rendering must stay within one contextual block",
    );
  });
});

// ── Source-linked micro-brief contract (Task 1 TDD lock-in) ───────────
// These tests define the contract for Task 2 implementation.
// Expected to FAIL until runtime source-linked guidance is implemented.
describe("source-linked micro-brief contract", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-source-linked-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  /** Helper to write a symbols.yaml with the given entries */
  function writeSymbolsYaml(
    entries: Array<{
      id: string;
      sourceFile: string;
      links: string[];
      relationships?: Array<{ type: string; target: string }>;
    }>,
  ) {
    const docDir = path.join(tmpDir, "documentation");
    fs.mkdirSync(docDir, { recursive: true });
    const yamlContent = entries
      .map((e) => {
        let entry = `  - id: ${e.id}\n    sourceFile: ${e.sourceFile}\n    links:\n`;
        for (const link of e.links) {
          entry += `      - ${link}\n`;
        }
        if (e.relationships) {
          entry += "    relationships:\n";
          for (const rel of e.relationships) {
            entry += `      - type: ${rel.type}\n        target: ${rel.target}\n`;
          }
        }
        return entry;
      })
      .join("\n");
    fs.writeFileSync(path.join(docDir, "symbols.yaml"), yamlContent);
  }

  test("includes source-linked brief for code edit with concrete symbols.yaml mapping", () => {
    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: [
          "REQ-opencode-smart-enforcement-v1",
          "REQ-opencode-kibi-plugin-v1",
          "REQ-opencode-agent-mcp-only",
        ],
        relationships: [
          { type: "implements", target: "REQ-opencode-smart-enforcement-v1" },
          { type: "implements", target: "REQ-opencode-kibi-plugin-v1" },
          { type: "implements", target: "REQ-opencode-agent-mcp-only" },
        ],
      },
    ]);

    const p = buildPrompt({
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: tmpDir,
    });

    // Should include source-linked brief with at most 3 REQ IDs
    assert.ok(
      p.includes("- Existing Kibi links:"),
      "Should include source-linked brief bullet for mapped file",
    );
    assert.ok(
      p.includes("REQ-opencode-smart-enforcement-v1"),
      "Should include first requirement ID",
    );
    assert.ok(
      p.includes("REQ-opencode-kibi-plugin-v1"),
      "Should include second requirement ID",
    );
    assert.ok(
      p.includes("REQ-opencode-agent-mcp-only"),
      "Should include third requirement ID",
    );

    // The brief line should contain at most 3 REQ IDs
    const briefLine = p
      .split("\n")
      .find((l) => l.includes("- Existing Kibi links:"));
    assert.ok(briefLine, "Should find the brief line");
    const briefReqIds = briefLine.match(/REQ-[A-Za-z0-9_-]+/g);
    assert.ok(
      briefReqIds && briefReqIds.length <= 3,
      `Source-linked brief should have at most 3 IDs, got ${briefReqIds?.length ?? 0}`,
    );
  });

  test("omits source-linked brief for code edit without symbols.yaml mapping", () => {
    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: ["REQ-opencode-smart-enforcement-v1"],
      },
    ]);

    const p = buildPrompt({
      recentEdits: [
        { path: "packages/opencode/src/some-other-file.ts", kind: "code" },
      ],
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: tmpDir,
    });

    // Should NOT include any source-linked brief or fallback text
    assert.ok(
      !p.includes("- Existing Kibi links:"),
      "Should NOT include source-linked brief for unmapped file",
    );
    assert.ok(
      !p.includes("No Kibi links found"),
      "Should NOT include fallback text when no hits",
    );
    assert.ok(
      !p.includes("no source links"),
      "Should NOT include any no-hit filler text",
    );
  });

  test("source-linked brief caps at 3 requirement IDs even when more exist", () => {
    writeSymbolsYaml([
      {
        id: "SYM-classifyRisk",
        sourceFile: "packages/opencode/src/risk-classifier.ts",
        links: [
          "REQ-first",
          "REQ-second",
          "REQ-third",
          "REQ-fourth",
          "REQ-fifth",
        ],
        relationships: [
          { type: "implements", target: "REQ-first" },
          { type: "implements", target: "REQ-second" },
          { type: "implements", target: "REQ-third" },
          { type: "implements", target: "REQ-fourth" },
          { type: "implements", target: "REQ-fifth" },
        ],
      },
    ]);

    const p = buildPrompt({
      recentEdits: [
        { path: "packages/opencode/src/risk-classifier.ts", kind: "code" },
      ],
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: tmpDir,
    });

    assert.ok(
      p.includes("- Existing Kibi links:"),
      "Should include source-linked brief",
    );
    const briefLine = p
      .split("\n")
      .find((l) => l.includes("- Existing Kibi links:"));
    assert.ok(briefLine, "Should find the brief line");
    const briefReqIds = briefLine.match(/REQ-[A-Za-z0-9_-]+/g);
    assert.equal(
      briefReqIds?.length ?? 0,
      3,
      `Source-linked brief should cap at exactly 3 IDs, got ${briefReqIds?.length ?? 0}`,
    );
  });

  test("source-linked brief respects prompt budget (<=120 words, <=5 bullets)", () => {
    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: [
          "REQ-opencode-smart-enforcement-v1",
          "REQ-opencode-kibi-plugin-v1",
          "REQ-opencode-agent-mcp-only",
        ],
      },
    ]);

    const p = buildPrompt({
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: tmpDir,
    });

    const words = p.split(/\s+/).filter(Boolean).length;
    const bullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));
    assert.ok(words <= 120, `Expected <= 120 words, got ${words}`);
    assert.ok(
      bullets.length <= 5,
      `Expected <= 5 bullets, got ${bullets.length}`,
    );
  });

  test("source-linked brief does not appear for non-code risk classes", () => {
    writeSymbolsYaml([
      {
        id: "SYM-someReq",
        sourceFile: "documentation/requirements/REQ-001.md",
        links: ["REQ-some-other"],
      },
    ]);

    const p = buildPrompt({
      recentEdits: [
        { path: "documentation/requirements/REQ-001.md", kind: "requirement" },
      ],
      posture: "root_active",
      riskClass: "req_policy_candidate",
      workspaceRoot: tmpDir,
    });

    assert.ok(
      !p.includes("- Existing Kibi links:"),
      "Source-linked brief should NOT appear for requirement edits",
    );
  });

  test("source-linked brief prefers explicit focusEdit over the most recent edit", () => {
    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: [
          "REQ-opencode-smart-enforcement-v1",
          "REQ-opencode-kibi-plugin-v1",
        ],
        relationships: [
          { type: "implements", target: "REQ-opencode-smart-enforcement-v1" },
          { type: "implements", target: "REQ-opencode-kibi-plugin-v1" },
        ],
      },
      {
        id: "SYM-classifyRisk",
        sourceFile: "packages/opencode/src/risk-classifier.ts",
        links: ["REQ-first", "REQ-second"],
        relationships: [
          { type: "implements", target: "REQ-first" },
          { type: "implements", target: "REQ-second" },
        ],
      },
    ]);

    const p = buildPrompt({
      recentEdits: [
        { path: "packages/opencode/src/risk-classifier.ts", kind: "code" },
        { path: "packages/opencode/src/prompt.ts", kind: "code" },
      ],
      focusEdit: { path: "packages/opencode/src/prompt.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: tmpDir,
    });

    assert.ok(
      p.includes("REQ-opencode-smart-enforcement-v1"),
      "Should use the explicit focusEdit for source-linked hints",
    );
    assert.ok(
      !p.includes("REQ-first") && !p.includes("REQ-second"),
      "Should ignore non-focused/reverted file links",
    );
  });

  test("cache key derivation prefers focusEdit kind when present", () => {
    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: ["REQ-opencode-smart-enforcement-v1"],
      },
    ]);

    const cache = new GuidanceCache(600000);
    const key: CacheKey = {
      workspaceRoot: tmpDir,
      branch: "main",
      posture: "root_active",
      riskClass: "behavior_candidate",
      fileBucket: "code",
    };
    cache.recordSatisfied(key, "guidance");

    const p = buildPrompt({
      recentEdits: [
        { path: "documentation/requirements/REQ-001.md", kind: "requirement" },
      ],
      focusEdit: { path: "packages/opencode/src/prompt.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      cache,
      workspaceRoot: tmpDir,
      branch: "main",
    });

    assert.ok(
      !p.includes("- Existing Kibi links:"),
      "Cache hit should use focusEdit-derived key and suppress guidance",
    );
    assert.equal(p.trim(), SENTINEL, "Cache hit should return sentinel only");
  });

  test("completion reminder still works alongside source-linked brief", () => {
    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: ["REQ-opencode-smart-enforcement-v1"],
        relationships: [
          { type: "implements", target: "REQ-opencode-smart-enforcement-v1" },
        ],
      },
    ]);

    const REMINDER_TEXT = "Run `kb_check` before completing this task.";
    const p = buildPrompt({
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: true,
      workspaceRoot: tmpDir,
    });

    assert.ok(
      p.includes("- Existing Kibi links:"),
      "Should include source-linked brief",
    );
    assert.ok(
      p.includes(REMINDER_TEXT),
      "Should still include completion reminder alongside source-linked brief",
    );
  });

  test("brief-kibi cue coexists with source-linked brief and reminder in one block", () => {
    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: ["REQ-opencode-smart-enforcement-v1"],
        relationships: [
          { type: "implements", target: "REQ-opencode-smart-enforcement-v1" },
        ],
      },
    ]);

    const REMINDER_TEXT = "Run `kb_check` before completing this task.";
    const BRIEF_KIBI_CUE =
      "Authoritative risky edit: run `/brief-kibi` before acting.";
    const p = buildPrompt({
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: true,
      workspaceRoot: tmpDir,
    });

    assert.ok(p.includes(BRIEF_KIBI_CUE), "Should include /brief-kibi cue");
    assert.ok(
      p.includes("- Existing Kibi links:"),
      "Should include source-linked brief",
    );
    assert.ok(p.includes(REMINDER_TEXT), "Should include completion reminder");

    const blocks = p.split(SENTINEL).filter((s) => s.trim().length > 0);
    assert.equal(blocks.length, 1, "Should keep a single contextual block");

    const words = p.split(/\s+/).filter(Boolean).length;
    const bullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-")).length;
    assert.ok(words <= 120, `Expected <= 120 words, got ${words}`);
    assert.ok(bullets <= 5, `Expected <= 5 bullets, got ${bullets}`);
  });

  test("traceability guidance with source-linked brief and reminder stays within 5 bullets", () => {
    const reminderText = "Run `kb_check` before completing this task.";
    const briefKibiCue =
      "Authoritative risky edit: run `/brief-kibi` before acting.";

    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: ["REQ-opencode-smart-enforcement-v1"],
        relationships: [
          { type: "implements", target: "REQ-opencode-smart-enforcement-v1" },
        ],
      },
    ]);

    const p = buildPrompt({
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "traceability_candidate",
      completionReminder: true,
      workspaceRoot: tmpDir,
    });

    const bullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));

    assert.ok(
      p.includes("- Existing Kibi links:"),
      "Should include source-linked brief",
    );
    assert.ok(p.includes(briefKibiCue), "Should include /brief-kibi cue");
    assert.ok(p.includes(reminderText), "Should include completion reminder");
    assert.equal(
      bullets.length,
      5,
      "Traceability guidance plus reminder should stay within the 5-bullet cap",
    );
  });

  test("cache behavior remains intact with source-linked brief", () => {
    writeSymbolsYaml([
      {
        id: "SYM-buildPrompt",
        sourceFile: "packages/opencode/src/prompt.ts",
        links: ["REQ-opencode-smart-enforcement-v1"],
      },
    ]);

    const cache = new GuidanceCache(600000);
    const key: CacheKey = {
      workspaceRoot: tmpDir,
      branch: "main",
      posture: "root_active",
      riskClass: "behavior_candidate",
      fileBucket: "code",
    };
    cache.recordSatisfied(key, "guidance");

    const p = buildPrompt({
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      cache,
      workspaceRoot: tmpDir,
      branch: "main",
    });

    // Cache hit should suppress guidance (existing behavior preserved)
    assert.ok(
      !p.includes("- Existing Kibi links:"),
      "Cache hit should suppress source-linked brief",
    );
    assert.equal(p.trim(), SENTINEL, "Cache hit should return sentinel only");
  });
});

// implements REQ-opencode-file-context-guidance-v1
describe("file-operation reminder integration", () => {
  const LIFECYCLE_NEW_FILE =
    "- New file detected. Add or update the necessary Kibi entities and traceability before completing this task.";
  const LIFECYCLE_DELETED_NO_IDS =
    "- Deleted file had no linked Kibi entities. Update Kibi if this removal changes documented behavior or traceability.";
  const E2E_REMINDER =
    "- E2e coverage signal detected for this file. Verify related e2e tests remain accurate.";

  test("lifecycle reminder folds into existing semantic block", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      fileOperationReminder: {
        path: "src/foo.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: null,
      },
    });
    assert.ok(p.includes(SENTINEL), "Must include sentinel");
    assert.ok(
      p.includes("Code changes detected"),
      "Should include semantic block header",
    );
    assert.ok(
      p.includes("New file detected"),
      "Should include lifecycle reminder",
    );

    // Single-block policy
    const blocks = p.split(SENTINEL).filter((s) => s.trim().length > 0);
    assert.equal(blocks.length, 1, "Should stay within one contextual block");
  });

  test("lifecycle and e2e reminders fold into existing semantic block", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      fileOperationReminder: {
        path: "src/foo.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: E2E_REMINDER,
      },
    });
    assert.ok(
      p.includes("New file detected"),
      "Should include lifecycle reminder",
    );
    assert.ok(p.includes("E2e coverage signal"), "Should include e2e reminder");
  });

  test("file-operation-only block when no semantic block exists", () => {
    const p = buildPrompt({
      recentEdits: [],
      posture: "root_active",
      fileOperationReminder: {
        path: "src/deleted.ts",
        lifecycleReminder: LIFECYCLE_DELETED_NO_IDS,
        e2eReminder: null,
      },
    });
    assert.ok(p.includes(SENTINEL), "Must include sentinel");
    assert.ok(
      p.includes("File operation detected"),
      "Should include file-operation header",
    );
    assert.ok(
      p.includes("Deleted file had no linked Kibi entities"),
      "Should include lifecycle reminder",
    );
    assert.ok(
      !p.includes("Code changes detected"),
      "Should NOT include code guidance",
    );
  });

  test("file-operation-only block with both reminders", () => {
    const p = buildPrompt({
      recentEdits: [],
      posture: "root_active",
      fileOperationReminder: {
        path: "src/foo.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: E2E_REMINDER,
      },
    });
    assert.ok(
      p.includes("File operation detected"),
      "Should include file-operation header",
    );
    assert.ok(
      p.includes("New file detected"),
      "Should include lifecycle reminder",
    );
    assert.ok(p.includes("E2e coverage signal"), "Should include e2e reminder");
  });

  test("completion reminder preserved alongside file-operation reminders", () => {
    const REMINDER_TEXT = "Run `kb_check` before completing this task.";
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: true,
      fileOperationReminder: {
        path: "src/foo.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: null,
      },
    });
    assert.ok(p.includes(REMINDER_TEXT), "Should include completion reminder");
    assert.ok(
      p.includes("New file detected"),
      "Should include lifecycle reminder",
    );
  });

  test("file-operation reminders bypass cache suppression", () => {
    const cache = new GuidanceCache(600000);
    const key: CacheKey = {
      workspaceRoot: "/ws",
      branch: "main",
      posture: "root_active",
      riskClass: "behavior_candidate",
      fileBucket: "code",
    };
    cache.recordSatisfied(key, "guidance");

    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      cache,
      workspaceRoot: "/ws",
      branch: "main",
      fileOperationReminder: {
        path: "src/foo.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: null,
      },
    });

    assert.ok(
      p.includes("New file detected"),
      "File-operation reminder should bypass cache suppression",
    );
    assert.ok(
      !p.includes("Code changes detected"),
      "Cache should still suppress semantic guidance",
    );
  });

  test("file-operation-only block bypasses cache suppression with no risk class", () => {
    const p = buildPrompt({
      recentEdits: [],
      posture: "root_active",
      fileOperationReminder: {
        path: "src/new.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: null,
      },
    });
    assert.ok(
      p.includes("File operation detected"),
      "File-operation-only block should appear without risk class",
    );
  });

  test("null lifecycleReminder and e2eReminder produces no file-operation block", () => {
    const p = buildPrompt({
      recentEdits: [],
      posture: "root_active",
      fileOperationReminder: {
        path: "src/foo.ts",
        lifecycleReminder: null,
        e2eReminder: null,
      },
    });
    assert.equal(
      p.trim(),
      SENTINEL,
      "Should produce sentinel only when both reminders are null",
    );
  });

  test("file-operation-only block stays within budget", () => {
    const p = buildPrompt({
      recentEdits: [],
      posture: "root_active",
      fileOperationReminder: {
        path: "src/new.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: E2E_REMINDER,
      },
    });
    const words = p.split(/\s+/).filter(Boolean).length;
    const bullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));
    assert.ok(words <= 120, `Expected <= 120 words, got ${words}`);
    assert.ok(
      bullets.length <= 5,
      `Expected <= 5 bullets, got ${bullets.length}`,
    );
  });

  test("semantic block with file-operation reminders stays within budget", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: true,
      fileOperationReminder: {
        path: "src/foo.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: E2E_REMINDER,
      },
    });
    const words = p.split(/\s+/).filter(Boolean).length;
    const bullets = p
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));
    assert.ok(words <= 120, `Expected <= 120 words, got ${words}`);
    assert.ok(
      bullets.length <= 5,
      `Expected <= 5 bullets, got ${bullets.length}`,
    );
  });

  test("file-operation reminders do NOT appear for vendored_only posture", () => {
    const p = buildPrompt({
      recentEdits: [{ path: "src/foo.ts", kind: "code" }],
      posture: "vendored_only",
      fileOperationReminder: {
        path: "src/foo.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: null,
      },
    });
    assert.equal(
      p.trim(),
      SENTINEL,
      "vendored_only should suppress all guidance including file-operation reminders",
    );
  });

  test("lifecycle reminder deduplicates when source-linked brief shows same IDs", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-fo-dedup-"));
    try {
      const docDir = path.join(tmpDir, "documentation");
      fs.mkdirSync(docDir, { recursive: true });
      fs.writeFileSync(
        path.join(docDir, "symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-buildPrompt",
          "    sourceFile: packages/opencode/src/prompt.ts",
          "    links:",
          "      - REQ-opencode-smart-enforcement-v1",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-opencode-smart-enforcement-v1",
        ].join("\n"),
      );

      const deletedWithIds =
        "- Deleted file had linked Kibi entities: REQ-opencode-smart-enforcement-v1. Update Kibi to keep traceability accurate.";

      const p = buildPrompt({
        recentEdits: [
          { path: "packages/opencode/src/prompt.ts", kind: "code" },
        ],
        posture: "root_active",
        riskClass: "behavior_candidate",
        workspaceRoot: tmpDir,
        fileOperationReminder: {
          path: "packages/opencode/src/prompt.ts",
          lifecycleReminder: deletedWithIds,
          e2eReminder: null,
        },
      });

      // Source-linked brief should be present
      assert.ok(
        p.includes("- Existing Kibi links:"),
        "Should include source-linked brief",
      );
      assert.ok(
        p.includes("REQ-opencode-smart-enforcement-v1"),
        "Should reference the requirement ID",
      );
      // Lifecycle reminder should be deduplicated (NOT appear since IDs overlap)
      assert.ok(
        !p.includes("Deleted file had linked Kibi entities"),
        "Should NOT duplicate lifecycle reminder when IDs overlap with source-linked brief",
      );
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test("lifecycle reminder without overlapping IDs is NOT deduplicated", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-fo-nodedup-"));
    try {
      const docDir = path.join(tmpDir, "documentation");
      fs.mkdirSync(docDir, { recursive: true });
      fs.writeFileSync(
        path.join(docDir, "symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-buildPrompt",
          "    sourceFile: packages/opencode/src/prompt.ts",
          "    links:",
          "      - REQ-opencode-smart-enforcement-v1",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-opencode-smart-enforcement-v1",
        ].join("\n"),
      );

      // Lifecycle reminder references a different ID than the source-linked brief
      const deletedWithDifferentIds =
        "- Deleted file had linked Kibi entities: REQ-other-requirement. Update Kibi to keep traceability accurate.";

      const p = buildPrompt({
        recentEdits: [
          { path: "packages/opencode/src/prompt.ts", kind: "code" },
        ],
        posture: "root_active",
        riskClass: "behavior_candidate",
        workspaceRoot: tmpDir,
        fileOperationReminder: {
          path: "packages/opencode/src/prompt.ts",
          lifecycleReminder: deletedWithDifferentIds,
          e2eReminder: null,
        },
      });

      // Both should appear since IDs don't overlap
      assert.ok(
        p.includes("- Existing Kibi links:"),
        "Should include source-linked brief",
      );
      assert.ok(
        p.includes(
          "Deleted file had linked Kibi entities: REQ-other-requirement",
        ),
        "Should include lifecycle reminder with non-overlapping IDs",
      );
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test("file-operation reminders do not trigger /brief-kibi cue without semantic risk", () => {
    const BRIEF_KIBI_CUE =
      "Authoritative risky edit: run `/brief-kibi` before acting.";
    const p = buildPrompt({
      recentEdits: [],
      posture: "root_active",
      fileOperationReminder: {
        path: "src/new.ts",
        lifecycleReminder: LIFECYCLE_NEW_FILE,
        e2eReminder: null,
      },
    });
    assert.ok(
      !p.includes(BRIEF_KIBI_CUE),
      "File-operation reminders should NOT trigger /brief-kibi cue without semantic risk",
    );
  });
});
