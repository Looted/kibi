/// <reference types="bun-types" />
import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import type { KibiConfig } from "../src/config";
import { SENTINEL, buildPrompt, injectPrompt } from "../src/prompt";

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

describe("prompt", () => {
  test("buildPrompt preserves generic Kibi guidance and sentinel", () => {
    const prompt = buildPrompt();
    assert.ok(prompt.includes(SENTINEL));
    assert.ok(prompt.includes("kb_search"));
    assert.ok(prompt.includes("kb_query"));
    assert.ok(prompt.includes("kb_upsert"));
    assert.ok(prompt.includes("kb_check"));
    assert.ok(prompt.includes("/init-kibi"));
    assert.ok(prompt.includes("MCP tools are visible"));
    assert.ok(prompt.includes("trusted local Kibi CLI"));
    assert.ok(prompt.includes("--input"));
    assert.ok(prompt.includes("neither interface is available"));
    assert.ok(prompt.includes("Do not read or edit `.kb/` files directly"));
    assert.ok(prompt.includes("Query before mutate"));
    assert.ok(prompt.includes("sequentially"));
    assert.ok(prompt.includes("`kb_check` before completion"));
  });

  test("injectPrompt adds guidance once and respects disabled config", () => {
    assert.ok(injectPrompt("hello", baseConfig).includes(SENTINEL));
    assert.equal(
      injectPrompt(`hello\n${SENTINEL}`, baseConfig),
      `hello\n${SENTINEL}`,
    );
    assert.equal(
      injectPrompt("hello", {
        ...baseConfig,
        prompt: { enabled: false, hookMode: "auto" },
      }),
      "hello",
    );
  });

  test("prompt guidance contains no brief pipeline surfaces", () => {
    const prompt = buildPrompt({
      recentEdits: [{ path: "src/app.ts", kind: "code" }],
      focusEdit: { path: "src/app.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: process.cwd(),
      branch: "main",
      completionReminder: true,
    });

    assert.ok(!prompt.includes("/brief-kibi"));
    assert.ok(!prompt.includes("kb_briefing_generate"));
    assert.ok(!prompt.includes("Kibi briefing available"));
    assert.ok(!prompt.includes("autoBriefResult"));
  });
});
