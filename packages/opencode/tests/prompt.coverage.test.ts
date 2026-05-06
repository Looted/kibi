import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import { SENTINEL, buildPrompt, postureGuidance } from "../src/prompt";
import type { RepoPosture } from "../src/repo-posture";

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
});
