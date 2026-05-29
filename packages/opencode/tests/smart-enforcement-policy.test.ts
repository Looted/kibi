import { describe, expect, test } from "bun:test";
import { buildPrompt } from "../src/prompt";

describe("smart enforcement policy", () => {
  test("authoritative risky edits use generic Kibi guidance without briefing cues", () => {
    const prompt = buildPrompt({
      recentEdits: [{ path: "src/app.ts", kind: "code" }],
      focusEdit: { path: "src/app.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: process.cwd(),
      branch: "main",
    });

    expect(prompt).toContain("Code changes detected");
    expect(prompt).not.toContain("/brief-kibi");
    expect(prompt).not.toContain("kb_briefing_generate");
    expect(prompt).not.toContain("Kibi briefing available");
  });
});
