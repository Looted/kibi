import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import type { KibiConfig } from "../src/config";
import { GuidanceCache } from "../src/guidance-cache";
import {
  SENTINEL,
  buildPrompt,
  injectPrompt,
  postureGuidance,
} from "../src/prompt";
import type { PromptContext } from "../src/prompt";
import type { RepoPosture } from "../src/repo-posture";

const supportedCapability = {
  supported: true,
  pluginVersion: "test",
} as const;

const baseConfig: KibiConfig = {
  enabled: true,
  autoUpdate: true,
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

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe("prompt coverage", () => {
  test("emits partial-setup posture guidance", () => {
    const prompt = buildPrompt({
      recentEdits: [],
      posture: "root_partial",
    });

    assert.ok(prompt.includes(SENTINEL));
    assert.match(prompt, /Partial KB setup detected/);
  });

  test("shows degraded advisory even when no other guidance block is selected", () => {
    const prompt = buildPrompt({
      recentEdits: [],
      posture: "root_active",
      maintenanceDegraded: true,
      degradedMode: "warn-once",
      showDegradedAdvisory: true,
    });

    assert.ok(prompt.includes(SENTINEL));
    assert.match(prompt, /Maintenance degraded/);
  });

  test("postureGuidance returns null for vendored_only", () => {
    assert.equal(postureGuidance("vendored_only"), null);
  });

  test("postureGuidance returns null for unknown postures", () => {
    const invalidPosture = "unhandled_posture" as RepoPosture;
    assert.equal(postureGuidance(invalidPosture), null);
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("uses generic comment routing guidance for scenario suggestions", () => {
    const prompt = buildPrompt({
      recentEdits: [{ path: "src/flow.py", kind: "code" }],
      posture: "root_active",
      riskClass: "traceability_candidate",
      recentCommentSuggestion: {
        filePath: "/tmp/flow.py",
        suggestionType: "scenario",
        confidence: "high",
        reasoning: "Looks like a multi-step flow.",
        fingerprint: "scenario-1",
        sourceKind: "docstring",
      },
    });

    assert.ok(prompt.includes(SENTINEL));
    assert.match(prompt, /Code changes detected/);
    assert.match(prompt, /Prefer Kibi over comments/);
  });

  test("hard gate context takes prompt priority over advisory guidance", () => {
    const prompt = buildPrompt(
      {
        recentEdits: [
          { path: "packages/opencode/src/prompt.ts", kind: "code" },
        ],
        posture: "root_active",
        riskClass: "behavior_candidate",
        hardGateBlock: {
          shownPaths: [
            "packages/opencode/src/prompt.ts",
            "documentation/symbols.yaml",
          ],
          remainingCount: 2,
          reason: "preflight checkpoint failed",
        },
      },
      supportedCapability,
    );

    assert.ok(prompt.startsWith(SENTINEL));
    assert.match(prompt, /Kibi hard gate blocked/);
    assert.match(prompt, /STOP implementation/);
    assert.match(prompt, /Reason: preflight checkpoint failed\./);
    assert.match(prompt, /\+2 more dirty files/);
    assert.match(prompt, /kb_search/);
    assert.match(prompt, /kb_check/);
    assert.ok(!prompt.includes("Code changes detected"));
  });

  test("vendored-only posture emits only the sentinel", () => {
    assert.equal(
      buildPrompt(
        { recentEdits: [], posture: "vendored_only" },
        supportedCapability,
      ),
      SENTINEL,
    );
  });

  test("manual KB edits bypass advisory cache suppression", () => {
    const cache = new GuidanceCache();
    const context: PromptContext = {
      recentEdits: [{ path: ".kb/entities/REQ-1.md", kind: "kb" }],
      posture: "root_active",
      riskClass: "manual_kb_edit",
      cache,
      workspaceRoot: process.cwd(),
      branch: "coverage-test",
    };

    const first = buildPrompt(context, supportedCapability);
    const second = buildPrompt(context, supportedCapability);

    assert.match(first, /Direct \.kb\/ edits bypass validation/);
    assert.match(second, /Direct \.kb\/ edits bypass validation/);
  });

  test("workspace bootstrap warning is emitted when posture is absent", () => {
    const prompt = buildPrompt(
      {
        recentEdits: [],
        workspaceHealth: {
          needsBootstrap: true,
          missingConfig: true,
          missingDocDirs: ["documentation/requirements"],
          hasKbEvidence: false,
        },
      },
      supportedCapability,
    );

    assert.match(prompt, /Bootstrap required/);
    assert.match(prompt, /kb_autopilot_generate/);
    assert.match(prompt, /\/init-kibi/);
  });

  test("advisory cache suppresses repeated semantic guidance", () => {
    const cache = new GuidanceCache();
    const context: PromptContext = {
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      focusEdit: { path: "packages/opencode/src/prompt.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      cache,
      workspaceRoot: process.cwd(),
      branch: "coverage-test-cache",
    };

    const first = buildPrompt(context, supportedCapability);
    const second = buildPrompt(context, supportedCapability);

    assert.match(first, /Code changes detected/);
    assert.equal(second, SENTINEL);
  });

  test("cache suppression is bypassed when maintenance degraded advisory is enabled", () => {
    const cache = new GuidanceCache();
    const context: PromptContext = {
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      focusEdit: { path: "packages/opencode/src/prompt.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      cache,
      workspaceRoot: process.cwd(),
      branch: "coverage-cache-degraded",
    };

    const normalPrompt = buildPrompt(context, supportedCapability);

    const degradedPrompt = buildPrompt(
      {
        ...context,
        maintenanceDegraded: true,
        degradedMode: "warn-once",
        showDegradedAdvisory: true,
      },
      supportedCapability,
    );

    assert.match(normalPrompt, /Code changes detected/);
    assert.match(degradedPrompt, /Maintenance degraded/);
    assert.ok(!degradedPrompt.includes("STOP implementation"));
  });

  test("file-operation reminders survive satisfied advisory cache", () => {
    const cache = new GuidanceCache();
    const context: PromptContext = {
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      focusEdit: { path: "packages/opencode/src/prompt.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      cache,
      workspaceRoot: process.cwd(),
      branch: "coverage-test-file-op-cache",
      fileOperationReminder: {
        path: "packages/opencode/src/prompt.ts",
        lifecycleReminder:
          "- Verify lifecycle impact before editing this source file.",
        e2eReminder: null,
      },
    };

    buildPrompt(context, supportedCapability);
    const prompt = buildPrompt(context, supportedCapability);

    assert.match(prompt, /Verify lifecycle impact/);
    assert.ok(!prompt.includes("Production code: use `implements`"));
  });

  test("freshness-only advisory still surfaces changed paths and missing evidence", () => {
    const prompt = buildPrompt(
      {
        recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
        posture: "root_active",
        riskClass: "traceability_candidate",
        kbFreshness: {
          state: "evidence-required",
          requiresEvidence: true,
          allowsCompletion: false,
          reason: "Source file edits are not linked to requirements yet.",
          missingEvidence: ["kbCheck", "kbCoverage"],
        },
        freshnessChangedPaths: ["packages/opencode/src/prompt.ts"],
      },
      supportedCapability,
    );

    assert.match(prompt, /Kibi freshness required/);
    assert.match(prompt, /Changed: `packages\/opencode\/src\/prompt\.ts`/);
    assert.match(prompt, /Missing: kbCheck, kbCoverage/);
  });

  test("freshness evidence requirements bypass advisory cache suppression", () => {
    const cache = new GuidanceCache();
    const context: PromptContext = {
      recentEdits: [{ path: "packages/opencode/src/prompt.ts", kind: "code" }],
      focusEdit: { path: "packages/opencode/src/prompt.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      cache,
      workspaceRoot: process.cwd(),
      branch: "coverage-test-freshness",
      kbFreshness: {
        state: "evidence-required",
        requiresEvidence: true,
        allowsCompletion: false,
        reason: "Session modified source files without KB evidence",
        missingEvidence: ["kbCheck"],
      },
      freshnessChangedPaths: [
        "packages/opencode/src/prompt.ts",
        "packages/opencode/tests/prompt.coverage.test.ts",
      ],
    };

    buildPrompt({ ...context, kbFreshness: undefined }, supportedCapability);
    const prompt = buildPrompt(context, supportedCapability);

    assert.match(prompt, /Kibi freshness required/);
    assert.match(prompt, /Changed: `packages\/opencode\/src\/prompt\.ts`/);
    assert.match(prompt, /Missing: kbCheck/);
    assert.match(prompt, /Code changes detected/);
  });

  test("file-operation reminder omits duplicate lifecycle entity IDs", () => {
    const prompt = buildPrompt(
      {
        recentEdits: [
          { path: "packages/opencode/src/prompt.ts", kind: "code" },
        ],
        focusEdit: { path: "packages/opencode/src/prompt.ts", kind: "code" },
        posture: "root_active",
        riskClass: "behavior_candidate",
        workspaceRoot: process.cwd(),
        branch: "coverage-test-overlap",
        fileOperationReminder: {
          path: "packages/opencode/src/prompt.ts",
          lifecycleReminder:
            "- Kibi entities: REQ-opencode-kibi-plugin-v1. Duplicate lifecycle reminder should be suppressed.",
          e2eReminder:
            "- Keep e2e reminder visible for prompt source coverage.",
        },
      },
      supportedCapability,
    );

    assert.match(prompt, /Existing Kibi links: REQ-opencode-kibi-plugin-v1/);
    assert.match(prompt, /Keep e2e reminder visible/);
    assert.ok(
      !prompt.includes("Duplicate lifecycle reminder should be suppressed"),
    );
  });

  test("over-budget file-operation-only guidance is truncated", () => {
    const longReminder = `- ${Array.from({ length: 140 }, (_, index) => `word${index}`).join(" ")}`;
    const prompt = buildPrompt(
      {
        recentEdits: [],
        posture: "root_active",
        fileOperationReminder: {
          path: "packages/opencode/src/prompt.ts",
          lifecycleReminder: longReminder,
          e2eReminder:
            "- This second bullet should be dropped by budget enforcement.",
        },
      },
      supportedCapability,
    );

    assert.match(prompt, /File operation detected/);
    assert.ok(wordCount(prompt) <= 120);
    assert.ok(!prompt.includes("second bullet should be dropped"));
  });

  test("completion reminder is appended for risky buildPrompt contexts", () => {
    const prompt = buildPrompt(
      {
        recentEdits: [
          { path: "packages/opencode/src/prompt.ts", kind: "code" },
        ],
        posture: "root_active",
        riskClass: "behavior_candidate",
        completionReminder: true,
      },
      supportedCapability,
    );

    assert.match(
      prompt,
      /Kibi impact evidence is required before completion\/commit: run `kb_check`/,
    );
  });

  test("injectPrompt forwards contextual guidance", () => {
    const injected = injectPrompt(
      "system prompt",
      baseConfig,
      {
        recentEdits: [
          { path: "documentation/requirements/REQ-1.md", kind: "requirement" },
        ],
        posture: "root_active",
        riskClass: "req_policy_candidate",
      },
      supportedCapability,
    );

    assert.match(injected, /system prompt/);
    assert.match(injected, /Requirement changes detected/);
    assert.match(injected, /Run kb_check/);
  });
});
